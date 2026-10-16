import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://api-m.sandbox.paypal.com"


def get_access_token():
    response = requests.post(
        f"{BASE_URL}/v1/oauth2/token",
        auth=(os.getenv("PAYPAL_CLIENT_ID"), os.getenv("PAYPAL_CLIENT_SECRET")),
        data={"grant_type": "client_credentials"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def create_order(purchase):
    token = get_access_token()
    body = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "description": purchase["item"],
                "amount": {
                    "currency_code": "USD",
                    "value": f"{purchase['price']:.2f}",
                },
            }
        ],
        "payment_source": {
            "paypal": {
                "experience_context": {
                    "return_url": "https://example.com/return",
                    "cancel_url": "https://example.com/cancel",
                    "user_action": "PAY_NOW",
                    "shipping_preference": "NO_SHIPPING",
                }
            }
        },
    }
    response = requests.post(
        f"{BASE_URL}/v2/checkout/orders",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    approve_link = None
    for link in data.get("links", []):
        if link["rel"] in ("approve", "payer-action"):
            approve_link = link["href"]

    return {
        "order_id": data["id"],
        "status": data["status"],
        "approve_link": approve_link,
    }


def capture_order(order_id):
    token = get_access_token()
    response = requests.post(
        f"{BASE_URL}/v2/checkout/orders/{order_id}/capture",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    return response.status_code, response.json()

def get_order_status(order_id):
    token = get_access_token()
    response = requests.get(
        f"{BASE_URL}/v2/checkout/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["status"]