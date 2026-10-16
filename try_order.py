import time
from rules import check_purchase
from paypal_client import create_order, capture_order, get_order_status

purchase = {"item": "Notebook", "price": 12.00, "category": "stationery"}

decision = check_purchase(purchase, spent_today=0)
print("Leash decision:", decision["decision"], "-", decision["reason"])

if decision["decision"] != "ALLOW":
    print("Not allowed, so no PayPal order was created.")
    raise SystemExit

order = create_order(purchase)
print("Order created:", order["order_id"], "| status:", order["status"])
print("Approve it here (open in a private window):")
print(order["approve_link"])

print("Waiting for you to approve the order in the browser...")
approved = False
for attempt in range(60):
    status = get_order_status(order["order_id"])
    print("PayPal says the order is:", status)
    if status == "APPROVED":
        approved = True
        break
    time.sleep(3)

if not approved:
    print("The order was never approved, so I stopped.")
    raise SystemExit

status_code, result = capture_order(order["order_id"])
print("Capture HTTP status:", status_code)
print("Payment status:", result.get("status"))