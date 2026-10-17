import requests

from ai_agent import understand_request
from catalog import find_products


def propose_purchase(user_request):
    intent = understand_request(user_request)
    if "error" in intent:
        return intent

    try:
        options = find_products(intent["search_query"], intent["max_price"])
    except requests.RequestException:
        return {"error": "Could not reach the product catalog. Please try again."}

    if not options:
        return {"error": "No matching products found within that budget."}

    if intent["max_price"] is not None:
        best = max(options, key=lambda option: option["price"])
    else:
        best = options[0]
    return {
        "item": best["item"][:100],
        "price": best["price"],
        "category": intent["category"],
        "note": f"{intent['note']} Found at {best['store']}.",
        "store": best["store"],
        "buy_url": best["buy_url"],
        "image": best["image"],
    }