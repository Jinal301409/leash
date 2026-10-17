from agent import propose_purchase
from rules import check_purchase

requests_to_try = [
    "Get me a notebook under $15",
    "Buy me noise cancelling headphones",
    "A birthday gift for my sister, around $35",
]

for text in requests_to_try:
    print("\nUser asked:", text)
    purchase = propose_purchase(text)

    if "error" in purchase:
        print("AI problem:", purchase["error"])
        continue

    print(f"AI proposed: {purchase['item']} | ${purchase['price']:.2f} | {purchase['category']}")
    decision = check_purchase(purchase, spent_today=0)
    print("Leash decision:", decision["decision"], "-", decision["reason"])