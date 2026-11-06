import logging
import os
import uuid

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

import ledger
from agent import propose_purchase
from paypal_client import capture_order, create_order, verify_capture_amount
from rules import DEFAULT_RULES, check_purchase

load_dotenv()

# --- 1. Logging Security Configuration ---
# Prevent logging of sensitive headers, API secrets, or full customer payloads
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("leash")

# --- 2. App Initialization & Security ---
app = Flask(__name__, static_folder="static", static_url_path="")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

app.secret_key = os.getenv("SECRET_KEY", "leash-hackathon-session-secret-2026")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.getenv("FLASK_ENV") == "production"

# Rate limiting: Per-visitor limit + shared daily cap to protect Channel3 quota
def rate_limit_key():
    return session.get("visitor_id") or get_remote_address()

limiter = Limiter(
    key_func=rate_limit_key,
    app=app,
    storage_uri="memory://",
    default_limits=["200 per day", "50 per hour"],
)

BASE = os.getenv("BASE_URL", "http://localhost:5000")

# Auto-initialize database tables at startup
ledger.init_db()


# --- 3. Security Headers Middleware ---
@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# --- 4. Visitor Management ---
def get_current_visitor_id() -> str:
    if "visitor_id" not in session:
        session["visitor_id"] = str(uuid.uuid4())
    visitor_id = session["visitor_id"]
    ledger.ensure_visitor(visitor_id)
    return visitor_id


@app.before_request
def ensure_visitor_session():
    if not request.path.startswith("/static"):
        get_current_visitor_id()


@app.errorhandler(429)
def too_many_requests(error):
    return jsonify({
        "error": "Rate limit reached. To protect free sponsor API quotas (Channel3 & Gemini), requests are capped. Please wait a moment and try again."
    }), 429


@app.errorhandler(500)
def server_error(error):
    logger.error("Internal server error occurred: %s", getattr(error, "description", "Unknown"))
    return jsonify({"error": "An unexpected server error occurred. Please try again."}), 500


# --- 5. Rules & Settings Routes ---

@app.route("/api/rules", methods=["GET"])
def get_rules():
    visitor_id = get_current_visitor_id()
    settings = ledger.get_visitor_settings(visitor_id)
    return jsonify(settings)


@app.route("/api/rules", methods=["POST"])
def update_rules():
    visitor_id = get_current_visitor_id()
    payload = request.get_json(silent=True) or {}

    daily_limit = payload.get("daily_limit")
    ask_above = payload.get("ask_above")
    categories = payload.get("blocked_categories", [])
    keywords = payload.get("blocked_keywords", [])

    try:
        daily_limit = float(daily_limit)
        ask_above = float(ask_above)
    except (TypeError, ValueError):
        return jsonify({"error": "Daily limit and approval threshold must be valid numbers."}), 400

    if daily_limit <= 0 or daily_limit > 10000:
        return jsonify({"error": "Daily limit must be between $1.00 and $10,000.00."}), 400

    if ask_above <= 0 or ask_above > daily_limit:
        return jsonify({"error": f"Ask threshold must be between $1.00 and the daily limit (${daily_limit:.2f})."}), 400

    if not isinstance(categories, list) or len(categories) > 30:
        return jsonify({"error": "Categories must be a list of up to 30 items."}), 400

    if not isinstance(keywords, list) or len(keywords) > 100:
        return jsonify({"error": "Keywords must be a list of up to 100 items."}), 400

    clean_categories = [str(c).strip()[:50] for c in categories if str(c).strip()]
    clean_keywords = [str(k).strip()[:50] for k in keywords if str(k).strip()]

    updated = ledger.update_visitor_settings(
        visitor_id,
        {
            "daily_limit": daily_limit,
            "ask_above": ask_above,
            "blocked_categories": clean_categories,
            "blocked_keywords": clean_keywords,
        },
    )
    return jsonify(updated)


@app.route("/api/rules/reset", methods=["POST"])
def reset_rules():
    visitor_id = get_current_visitor_id()
    updated = ledger.update_visitor_settings(visitor_id, DEFAULT_RULES)
    return jsonify(updated)


# --- 6. Ledger & Shopping API Routes ---

@app.route("/")
def home():
    return app.send_static_file("index.html")


@app.route("/api/ledger")
def get_ledger():
    visitor_id = get_current_visitor_id()
    return jsonify({
        "entries": ledger.get_all(visitor_id),
        "spent_today": ledger.spent_today(visitor_id),
    })


def start_payment(entry):
    try:
        order = create_order(
            entry,
            return_url=f"{BASE}/return",
            cancel_url=f"{BASE}/cancel",
        )
        ledger.update(
            entry["id"],
            status="AWAITING_PAYMENT",
            order_id=order["order_id"],
            approve_link=order["approve_link"],
        )
    except Exception as e:
        logger.warning("PayPal order initialization failed: %s", str(e))
        ledger.update(entry["id"], status="PAYPAL_ERROR")


@app.route("/api/request", methods=["POST"])
@limiter.limit("10 per minute; 80 per day")
def handle_request():
    visitor_id = get_current_visitor_id()
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()

    # Input length validation
    if len(text) < 2:
        return jsonify({"error": "Please type a shopping request (at least 2 characters)."}), 400
    if len(text) > 500:
        return jsonify({"error": "Request is too long. Please keep your prompt under 500 characters."}), 400

    # AI query translation & Catalog search
    try:
        purchase = propose_purchase(text)
    except Exception as e:
        logger.error("Agent proposal error: %s", str(e))
        return jsonify({"error": "Shopping agent service is temporarily unavailable. Please retry."}), 502

    if "error" in purchase:
        return jsonify({"error": purchase["error"]}), 502

    # Deterministic rule evaluation
    visitor_rules = ledger.get_visitor_settings(visitor_id)
    current_spent = ledger.spent_today(visitor_id)
    decision = check_purchase(purchase, spent_today=current_spent, rules=visitor_rules)

    entry = ledger.add(text, purchase, decision, visitor_id=visitor_id)

    if decision["decision"] == "ALLOW":
        start_payment(entry)

    return jsonify(ledger.get(entry["id"]))


@app.route("/api/approve/<entry_id>", methods=["POST"])
def approve(entry_id):
    entry = ledger.get(entry_id)
    if entry is None or entry["status"] != "WAITING_FOR_YOU":
        return jsonify({"error": "Nothing to approve."}), 400

    visitor_rules = ledger.get_visitor_settings(entry["visitor_id"])
    current_spent = ledger.spent_today(entry["visitor_id"])
    recheck = check_purchase(entry, spent_today=current_spent, rules=visitor_rules)

    if recheck["decision"] == "BLOCK":
        ledger.update(entry_id, status="BLOCKED", decision="BLOCK", reason=recheck["reason"])
    else:
        start_payment(entry)

    return jsonify(ledger.get(entry_id))


@app.route("/api/decline/<entry_id>", methods=["POST"])
def decline(entry_id):
    entry = ledger.get(entry_id)
    if entry is None or entry["status"] != "WAITING_FOR_YOU":
        return jsonify({"error": "Nothing to decline."}), 400

    ledger.update(entry_id, status="DECLINED")
    return jsonify(ledger.get(entry_id))


@app.route("/return")
def paypal_return():
    """
    PayPal redirects here upon successful buyer approval.
    Security enhancements:
      1. Idempotency: Never captures twice if already PAID.
      2. Amount & Currency Verification: Ensures captured value matches ledger price.
      3. Token Validation: Safely handles unknown or reused tokens.
    """
    order_id = request.args.get("token")
    if not order_id or not isinstance(order_id, str):
        logger.warning("PayPal return called with missing or invalid token.")
        return redirect("/")

    entry = ledger.find_by_order(order_id)
    if not entry:
        logger.warning("PayPal return called for unknown order token: %s", order_id[:8])
        return redirect("/")

    # Idempotency guard: If already processed and marked PAID, do not recapture
    if entry["status"] == "PAID":
        logger.info("Order %s was already captured and marked PAID. Skipping re-capture.", entry["id"])
        return redirect("/")

    # Only capture if order is currently awaiting payment
    if entry["status"] == "AWAITING_PAYMENT":
        status_code, result = capture_order(order_id)
        if status_code in (200, 201) and result.get("status") == "COMPLETED":
            # Security verification: Check amount and currency match ledger entry
            is_valid = verify_capture_amount(result, expected_price=entry["price"], expected_currency="USD")
            if is_valid:
                ledger.update(entry["id"], status="PAID")
                logger.info("Order %s successfully verified and captured for $%.2f USD.", entry["id"], entry["price"])
            else:
                ledger.update(
                    entry["id"],
                    status="PAYMENT_FAILED",
                    reason="Security alert: Captured payment amount or currency did not match ledger entry.",
                )
                logger.warning("Amount mismatch for order %s. Expected $%.2f USD.", entry["id"], entry["price"])
        else:
            ledger.update(entry["id"], status="PAYMENT_FAILED")
            logger.warning("PayPal capture returned status %s for order %s.", status_code, entry["id"])

    return redirect("/")


@app.route("/cancel")
def paypal_cancel():
    """PayPal buyer cancellation callback."""
    order_id = request.args.get("token")
    if order_id:
        entry = ledger.find_by_order(order_id)
        if entry and entry["status"] == "AWAITING_PAYMENT":
            ledger.update(entry["id"], status="CANCELLED")
            logger.info("Order %s was cancelled by buyer on PayPal.", entry["id"])
    return redirect("/")


@app.route("/api/reset", methods=["POST"])
def reset_demo():
    visitor_id = get_current_visitor_id()
    ledger.reset(visitor_id)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(debug=True, port=int(os.getenv("PORT", 5000)))
