import json

DEFAULT_RULES = {
    "daily_limit": 50.00,
    "ask_above": 25.00,
    "blocked_categories": ["electronics", "gambling"],
    "blocked_keywords": [
        "headphone", "earbud", "laptop", "phone", "tablet", "camera",
        "console", "speaker", "charger", "smartwatch", "television",
        "casino", "lottery", "poker", "betting",
    ],
}

# Alias for backward compatibility
RULES = DEFAULT_RULES


def check_purchase(purchase, spent_today=0.0, rules=None):
    """
    Evaluates purchase against deterministic rules and returns decision, reason, and full audit trace.
    Order of evaluation:
      1. Price validity (> 0)
      2. Blocked category check
      3. Blocked keywords in item title
      4. Daily limit check (spent_today + price <= daily_limit)
      5. Approval threshold check (price <= ask_above)
    """
    active_rules = rules or DEFAULT_RULES
    daily_limit = float(active_rules.get("daily_limit", DEFAULT_RULES["daily_limit"]))
    ask_above = float(active_rules.get("ask_above", DEFAULT_RULES["ask_above"]))
    blocked_categories = [c.lower() for c in active_rules.get("blocked_categories", DEFAULT_RULES["blocked_categories"])]
    blocked_keywords = [w.lower() for w in active_rules.get("blocked_keywords", DEFAULT_RULES["blocked_keywords"])]

    price = float(purchase.get("price", 0.0))
    category = str(purchase.get("category", "")).lower()
    item = str(purchase.get("item", "")).lower()

    trace = []

    # 1. Price validity
    if price <= 0:
        trace.append({
            "check": "price_validity",
            "label": "Price Validity",
            "passed": False,
            "detail": f"Price ${price:.2f} is not positive and valid.",
        })
        return {
            "decision": "BLOCK",
            "reason": "The price is not valid.",
            "trace": trace,
        }
    trace.append({
        "check": "price_validity",
        "label": "Price Validity",
        "passed": True,
        "detail": f"Price ${price:.2f} is valid.",
    })

    # 2. Blocked Category
    if category in blocked_categories:
        trace.append({
            "check": "blocked_category",
            "label": "Category Filter",
            "passed": False,
            "detail": f"Category '{category}' is on your blocked list.",
        })
        return {
            "decision": "BLOCK",
            "reason": f"The category '{category}' is not allowed.",
            "trace": trace,
        }
    trace.append({
        "check": "blocked_category",
        "label": "Category Filter",
        "passed": True,
        "detail": f"Category '{category}' is permitted.",
    })

    # 3. Blocked Keywords
    matched_keyword = None
    for word in blocked_keywords:
        if word and word in item:
            matched_keyword = word
            break

    if matched_keyword:
        trace.append({
            "check": "blocked_keyword",
            "label": "Keyword Guardrail",
            "passed": False,
            "detail": f"Item contains prohibited keyword '{matched_keyword}'.",
        })
        return {
            "decision": "BLOCK",
            "reason": f"The item name contains '{matched_keyword}', which is on the blocked list.",
            "trace": trace,
        }
    trace.append({
        "check": "blocked_keyword",
        "label": "Keyword Guardrail",
        "passed": True,
        "detail": "No blocked keywords found in item title.",
    })

    # 4. Daily Limit
    new_total = spent_today + price
    if new_total > daily_limit:
        trace.append({
            "check": "daily_limit",
            "label": "Daily Budget Cap",
            "passed": False,
            "detail": f"Spending ${price:.2f} brings today's total to ${new_total:.2f}, exceeding ${daily_limit:.2f}.",
        })
        return {
            "decision": "BLOCK",
            "reason": f"This would bring today's spending to ${new_total:.2f}, over the ${daily_limit:.2f} daily limit.",
            "trace": trace,
        }
    trace.append({
        "check": "daily_limit",
        "label": "Daily Budget Cap",
        "passed": True,
        "detail": f"Projected today's spend ${new_total:.2f} is within ${daily_limit:.2f} daily limit.",
    })

    # 5. Ask-Above Approval Threshold
    if price > ask_above:
        trace.append({
            "check": "approval_threshold",
            "label": "Approval Threshold",
            "passed": False,
            "detail": f"Price ${price:.2f} exceeds ${ask_above:.2f} threshold; requires buyer approval.",
        })
        return {
            "decision": "ASK",
            "reason": f"${price:.2f} is above ${ask_above:.2f}, so I need your approval.",
            "trace": trace,
        }
    trace.append({
        "check": "approval_threshold",
        "label": "Approval Threshold",
        "passed": True,
        "detail": f"Price ${price:.2f} is within auto-allow threshold (${ask_above:.2f}).",
    })

    return {
        "decision": "ALLOW",
        "reason": "Within all your rules.",
        "trace": trace,
    }
