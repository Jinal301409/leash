"""
Unit tests for Leash deterministic spending rules and trace verification.
Tests ALLOW, ASK, and BLOCK decisions under various constraints,
verifying that AI prompt injections or category mislabelings are caught deterministically.
"""

import pytest
import rules


@pytest.fixture
def default_rules():
    return {
        "daily_limit": 50.0,
        "ask_above": 25.0,
        "blocked_categories": ["electronics", "gambling"],
        "blocked_keywords": [
            "laptop",
            "earbuds",
            "headphones",
            "iphone",
            "macbook",
            "casino",
            "betting",
            "lottery",
            "crypto",
        ],
    }


def test_allow_within_budget(default_rules):
    """Items under ask_above with safe category and keyword should be ALLOWed."""
    purchase = {
        "item": "Moleskine Classic Ruled Hardcover Notebook",
        "price": 14.50,
        "category": "stationery",
    }
    spent_today = 0.0

    eval_result = rules.check_purchase(purchase, spent_today, default_rules)

    assert eval_result["decision"] == "ALLOW"
    assert "Within rules" in eval_result["reason"]
    assert len(eval_result["trace"]) == 5
    assert all(step["status"] == "passed" for step in eval_result["trace"])


def test_ask_above_threshold(default_rules):
    """Items priced between ask_above ($25) and daily_limit ($50) should require approval (ASK)."""
    purchase = {
        "item": "Japanese Ceramic Fountain Pen Set",
        "price": 34.00,
        "category": "stationery",
    }
    spent_today = 0.0

    eval_result = rules.check_purchase(purchase, spent_today, default_rules)

    assert eval_result["decision"] == "ASK"
    assert "above your $25.00 approval threshold" in eval_result["reason"]
    # Check trace step for approval_threshold failed while daily_limit passed
    threshold_step = next(s for s in eval_result["trace"] if s["check"] == "approval_threshold")
    assert threshold_step["status"] == "failed"


def test_block_blocked_category(default_rules):
    """Items with blocked categories (e.g. electronics) must be BLOCKED immediately."""
    purchase = {
        "item": "USB-C Fast Charging Cable",
        "price": 12.00,
        "category": "electronics",
    }
    spent_today = 0.0

    eval_result = rules.check_purchase(purchase, spent_today, default_rules)

    assert eval_result["decision"] == "BLOCK"
    assert "electronics is a blocked category" in eval_result["reason"]
    category_step = next(s for s in eval_result["trace"] if s["check"] == "blocked_category")
    assert category_step["status"] == "failed"


def test_block_keyword_evasion_attempt(default_rules):
    """
    Test evasion: An AI agent classifies 'Wireless Bluetooth Earbuds' under 'gifts',
    attempting to bypass category checks. The blocked keyword check must catch and BLOCK it.
    """
    purchase = {
        "item": "Sleek Wireless Noise-Cancelling Earbuds",
        "price": 22.00,
        "category": "gifts",  # AI categorized as 'gifts'
    }
    spent_today = 0.0

    eval_result = rules.check_purchase(purchase, spent_today, default_rules)

    assert eval_result["decision"] == "BLOCK"
    assert "Contains blocked keyword" in eval_result["reason"]
    assert "earbuds" in eval_result["reason"].lower()
    keyword_step = next(s for s in eval_result["trace"] if s["check"] == "blocked_keyword")
    assert keyword_step["status"] == "failed"


def test_block_exceeding_daily_budget(default_rules):
    """Transactions that push total daily spend past the limit must be BLOCKED."""
    purchase = {
        "item": "Artisan Leather Travel Journal",
        "price": 20.00,
        "category": "stationery",
    }
    spent_today = 35.00  # 35 + 20 = $55 > $50 limit

    eval_result = rules.check_purchase(purchase, spent_today, default_rules)

    assert eval_result["decision"] == "BLOCK"
    assert "Would exceed daily limit" in eval_result["reason"]
    limit_step = next(s for s in eval_result["trace"] if s["check"] == "daily_limit")
    assert limit_step["status"] == "failed"


def test_block_invalid_price(default_rules):
    """Negative, zero, or non-numeric prices must be cleanly BLOCKED."""
    purchase = {
        "item": "Free Sample Pen",
        "price": -5.00,
        "category": "stationery",
    }
    spent_today = 0.0

    eval_result = rules.check_purchase(purchase, spent_today, default_rules)

    assert eval_result["decision"] == "BLOCK"
    assert "Invalid price" in eval_result["reason"]
    price_step = next(s for s in eval_result["trace"] if s["check"] == "price_validity")
    assert price_step["status"] == "failed"
