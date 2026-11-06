import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api-m.sandbox.paypal.com"


def get_access_token():
    """
    Retrieves an OAuth2 access token from PayPal Sandbox using client credentials.
    Never logs or exposes client secrets.
    """
    client_id = os.getenv("PAYPAL_CLIENT_ID")
    client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment.")

    try:
        response = requests.post(
            f"{BASE_URL}/v1/oauth2/token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.Timeout:
        raise RuntimeError("PayPal authentication timed out. Please check network connectivity.")
    except requests.RequestException as e:
        status = getattr(e.response, "status_code", "Unknown")
        raise RuntimeError(f"PayPal authentication failed with status code {status}.")


def create_order(
    purchase,
    return_url="http://localhost:5000/return",
    cancel_url="http://localhost:5000/cancel",
):
    """
    Creates an Orders v2 order with intent CAPTURE.
    Sets experience_context to disable shipping collection since Leash is an agentic leash demo.
    """
    token = get_access_token()
    clean_item = purchase["item"][:120].strip()
    price_val = f"{float(purchase['price']):.2f}"

    body = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "description": clean_item,
                "amount": {
                    "currency_code": "USD",
                    "value": price_val,
                },
            }
        ],
        "payment_source": {
            "paypal": {
                "experience_context": {
                    "return_url": return_url,
                    "cancel_url": cancel_url,
                    "user_action": "PAY_NOW",
                    "shipping_preference": "NO_SHIPPING",
                }
            }
        },
    }

    try:
        response = requests.post(
            f"{BASE_URL}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()

        approve_link = None
        for link in data.get("links", []):
            if link["rel"] in ("approve", "payer-action"):
                approve_link = link["href"]
                break

        return {
            "order_id": data["id"],
            "status": data["status"],
            "approve_link": approve_link,
        }
    except requests.Timeout:
        raise RuntimeError("PayPal order creation timed out.")
    except requests.RequestException as e:
        status = getattr(e.response, "status_code", "Unknown")
        raise RuntimeError(f"PayPal order creation failed (status {status}).")


def capture_order(order_id):
    """
    Captures authorized funds for an order.
    Returns (status_code, response_json).
    Logs only sanitized identifiers, never full authorization headers.
    """
    if not order_id or not isinstance(order_id, str):
        return 400, {"error": "Invalid order ID"}

    token = get_access_token()
    try:
        response = requests.post(
            f"{BASE_URL}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=25,
        )
        return response.status_code, response.json()
    except requests.Timeout:
        return 504, {"error": "PayPal capture request timed out."}
    except requests.RequestException as e:
        status = getattr(e.response, "status_code", 500)
        try:
            err_json = e.response.json()
        except Exception:
            err_json = {"error": "PayPal capture failed"}
        return status, err_json


def verify_capture_amount(capture_result: dict, expected_price: float, expected_currency: str = "USD") -> bool:
    """
    Security check: Inspects the raw PayPal capture payload to confirm that the captured
    currency and amount match the ledger entry, preventing amount-tampering attacks.
    """
    try:
        # Navigate PayPal Orders v2 capture structure:
        # purchase_units[0].payments.captures[0].amount
        purchase_units = capture_result.get("purchase_units", [])
        if not purchase_units:
            return False

        payments = purchase_units[0].get("payments", {})
        captures = payments.get("captures", [])
        if not captures:
            return False

        capture_amount_obj = captures[0].get("amount", {})
        currency = capture_amount_obj.get("currency_code", "")
        amount_val = float(capture_amount_obj.get("value", 0.0))

        if currency.upper() != expected_currency.upper():
            return False

        # Verify within half-a-cent tolerance for floating point safety
        return abs(amount_val - expected_price) < 0.01
    except Exception:
        return False
