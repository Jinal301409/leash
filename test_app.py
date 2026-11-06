"""
Integration tests for Leash Flask API endpoints using pytest and Flask test client.
Tests visitor cookie isolation, settings updates, request validation, and ledger resets.
"""

import json
import pytest
import os

# Set testing environment variable
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app, COOKIE_NAME
import ledger


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_visitor_cookie_assignment(client):
    """First request without cookie should set signed HttpOnly visitor cookie."""
    res = client.get("/api/rules")
    assert res.status_code == 200
    cookies = [cookie.value for cookie in client.cookie_jar if cookie.name == COOKIE_NAME]
    assert len(cookies) == 1
    assert len(cookies[0]) >= 16


def test_update_rules_validation(client):
    """Updating rules with negative limit or invalid ranges returns 400 Bad Request."""
    res = client.put(
        "/api/rules",
        data=json.dumps({"daily_limit": -10}),
        content_type="application/json",
    )
    assert res.status_code == 400
    data = res.get_json()
    assert "daily_limit must be between" in data["error"]


def test_update_rules_success(client):
    """Updating rules with valid values persists them for the visitor."""
    res = client.put(
        "/api/rules",
        data=json.dumps({
            "daily_limit": 75.0,
            "ask_above": 30.0,
            "blocked_categories": ["electronics", "apparel"],
        }),
        content_type="application/json",
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["daily_limit"] == 75.0
    assert data["ask_above"] == 30.0
    assert "apparel" in data["blocked_categories"]


def test_request_length_validation(client):
    """Request strings under 2 characters or empty return 400."""
    res = client.post(
        "/api/request",
        data=json.dumps({"request": ""}),
        content_type="application/json",
    )
    assert res.status_code == 400
    assert "empty" in res.get_json()["error"]

    res_short = client.post(
        "/api/request",
        data=json.dumps({"request": "a"}),
        content_type="application/json",
    )
    assert res_short.status_code == 400
    assert "too short" in res_short.get_json()["error"]


def test_reset_endpoint(client):
    """POST /api/reset resets visitor's ledger and restores default limits."""
    res = client.post("/api/reset")
    assert res.status_code == 200
    assert res.get_json()["success"] is True

    # Check ledger is empty
    ledger_res = client.get("/api/ledger")
    assert ledger_res.status_code == 200
    data = ledger_res.get_json()
    assert data["entries"] == []
    assert data["spent_today"] == 0.0
