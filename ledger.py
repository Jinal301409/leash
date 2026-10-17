import json
import os
import threading
import uuid
from datetime import datetime

FILE = "ledger.json"
lock = threading.Lock()

START_STATUS = {
    "ALLOW": "APPROVED_BY_RULES",
    "ASK": "WAITING_FOR_YOU",
    "BLOCK": "BLOCKED",
}


def _load():
    if not os.path.exists(FILE):
        return []
    with open(FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def _save(entries):
    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)


def get_all():
    return list(reversed(_load()))


def get(entry_id):
    for entry in _load():
        if entry["id"] == entry_id:
            return entry
    return None


def find_by_order(order_id):
    for entry in _load():
        if entry["order_id"] == order_id:
            return entry
    return None


def add(request_text, purchase, decision):
    entry = {
        "id": uuid.uuid4().hex[:8],
        "created": datetime.now().isoformat(timespec="seconds"),
        "request": request_text,
        "item": purchase["item"],
        "price": purchase["price"],
        "category": purchase["category"],
        "note": purchase.get("note", ""),
        "decision": decision["decision"],
        "reason": decision["reason"],
        "status": START_STATUS[decision["decision"]],
        "order_id": None,
        "approve_link": None,
    }
    with lock:
        entries = _load()
        entries.append(entry)
        _save(entries)
    return entry


def update(entry_id, **changes):
    with lock:
        entries = _load()
        for entry in entries:
            if entry["id"] == entry_id:
                entry.update(changes)
        _save(entries)


def spent_today():
    today = datetime.now().date().isoformat()
    total = 0.0
    for entry in _load():
        if entry["created"].startswith(today) and entry["status"] in ("PAID", "AWAITING_PAYMENT"):
            total += entry["price"]
    return total