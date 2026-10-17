import os

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

import ledger
from agent import propose_purchase
from paypal_client import capture_order, create_order
from rules import RULES, check_purchase

load_dotenv()

app = Flask(__name__, static_folder="static", static_url_path="")
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)
limiter = Limiter(get_remote_address, app=app, storage_uri="memory://")
BASE = os.getenv("BASE_URL", "http://localhost:5000")


@app.errorhandler(429)
def too_many_requests(error):
    return jsonify({"error": "Too many requests. Please wait a minute and try again."}), 429


@app.route("/")
def home():
    return app.send_static_file("index.html")


@app.route("/api/rules")
def get_rules():
    return jsonify(RULES)


@app.route("/api/ledger")
def get_ledger():
    return jsonify({"entries": ledger.get_all(), "spent_today": ledger.spent_today()})


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
    except requests.RequestException:
        ledger.update(entry["id"], status="PAYPAL_ERROR")


@app.route("/api/request", methods=["POST"])
@limiter.limit("8 per minute;80 per day")
def handle_request():
    text = (request.get_json(silent=True) or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "Please type a request."}), 400

    purchase = propose_purchase(text)
    if "error" in purchase:
        return jsonify({"error": purchase["error"]}), 502

    decision = check_purchase(purchase, spent_today=ledger.spent_today())
    entry = ledger.add(text, purchase, decision)

    if decision["decision"] == "ALLOW":
        start_payment(entry)

    return jsonify(ledger.get(entry["id"]))


@app.route("/api/approve/<entry_id>", methods=["POST"])
def approve(entry_id):
    entry = ledger.get(entry_id)
    if entry is None or entry["status"] != "WAITING_FOR_YOU":
        return jsonify({"error": "Nothing to approve."}), 400

    recheck = check_purchase(entry, spent_today=ledger.spent_today())
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
    order_id = request.args.get("token")
    entry = ledger.find_by_order(order_id) if order_id else None

    if entry and entry["status"] == "AWAITING_PAYMENT":
        status_code, result = capture_order(order_id)
        if status_code in (200, 201) and result.get("status") == "COMPLETED":
            ledger.update(entry["id"], status="PAID")
        else:
            ledger.update(entry["id"], status="PAYMENT_FAILED")
    return redirect("/")


@app.route("/cancel")
def paypal_cancel():
    order_id = request.args.get("token")
    entry = ledger.find_by_order(order_id) if order_id else None
    if entry and entry["status"] == "AWAITING_PAYMENT":
        ledger.update(entry["id"], status="CANCELLED")
    return redirect("/")

@app.route("/api/reset", methods=["POST"])
def reset_demo():
    ledger.reset()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True, port=5000)