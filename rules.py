RULES = {
    "daily_limit": 50.00,
    "ask_above": 25.00,
    "blocked_categories": ["electronics", "gambling"],
}


def check_purchase(purchase, spent_today=0.0):
    price = purchase["price"]
    category = purchase["category"].lower()

    if price <= 0:
        return {"decision": "BLOCK", "reason": "The price is not valid."}

    if category in RULES["blocked_categories"]:
        return {
            "decision": "BLOCK",
            "reason": f"The category '{category}' is not allowed.",
        }

    new_total = spent_today + price
    if new_total > RULES["daily_limit"]:
        return {
            "decision": "BLOCK",
            "reason": f"This would bring today's spending to ${new_total:.2f}, "
                      f"over the ${RULES['daily_limit']:.2f} daily limit.",
        }

    if price > RULES["ask_above"]:
        return {
            "decision": "ASK",
            "reason": f"${price:.2f} is above ${RULES['ask_above']:.2f}, so I need your approval.",
        }

    return {"decision": "ALLOW", "reason": "Within all your rules."}