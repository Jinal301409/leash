import json
import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
    select,
)
from sqlalchemy.orm import declarative_base, relationship, scoped_session, sessionmaker

# --- 1. Database Connection Configuration ---
RAW_DB_URL = os.getenv("DATABASE_URL", "sqlite:///leash.db")
if RAW_DB_URL.startswith("postgres://"):
    DATABASE_URL = RAW_DB_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = RAW_DB_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Session = scoped_session(session_factory)

Base = declarative_base()


# --- 2. Database Models ---

class Visitor(Base):
    __tablename__ = "visitors"

    id = Column(String(36), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    entries = relationship("LedgerEntry", back_populates="visitor", cascade="all, delete-orphan")
    settings = relationship("VisitorSettings", back_populates="visitor", uselist=False, cascade="all, delete-orphan")


class VisitorSettings(Base):
    __tablename__ = "visitor_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    visitor_id = Column(String(36), ForeignKey("visitors.id"), unique=True, nullable=False)
    daily_limit = Column(Float, default=50.00, nullable=False)
    ask_above = Column(Float, default=25.00, nullable=False)
    blocked_categories = Column(Text, default="electronics,gambling", nullable=False)
    blocked_keywords = Column(
        Text,
        default="headphone,earbud,laptop,phone,tablet,camera,console,speaker,charger,smartwatch,television,casino,lottery,poker,betting",
        nullable=False,
    )

    visitor = relationship("Visitor", back_populates="settings")

    def to_dict(self):
        cats = [c.strip() for c in self.blocked_categories.split(",") if c.strip()]
        kws = [k.strip() for k in self.blocked_keywords.split(",") if k.strip()]
        return {
            "daily_limit": float(self.daily_limit),
            "ask_above": float(self.ask_above),
            "blocked_categories": cats,
            "blocked_keywords": kws,
        }


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(String(16), primary_key=True)
    visitor_id = Column(String(36), ForeignKey("visitors.id"), nullable=False, index=True)
    created = Column(String(32), nullable=False)
    request = Column(Text, nullable=False)
    item = Column(String(255), nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(64), nullable=False)
    note = Column(Text, default="")
    store = Column(String(128), default="")
    image = Column(Text, default="")
    buy_url = Column(Text, default="")
    decision = Column(String(16), nullable=False)
    reason = Column(Text, nullable=False)
    trace = Column(Text, default="[]")  # JSON string of rule evaluation trace
    status = Column(String(32), nullable=False)
    order_id = Column(String(64), nullable=True, index=True)
    approve_link = Column(Text, nullable=True)

    visitor = relationship("Visitor", back_populates="entries")

    def to_dict(self):
        try:
            parsed_trace = json.loads(self.trace) if self.trace else []
        except Exception:
            parsed_trace = []

        return {
            "id": self.id,
            "created": self.created,
            "request": self.request,
            "item": self.item,
            "price": self.price,
            "category": self.category,
            "note": self.note or "",
            "store": self.store or "",
            "image": self.image or "",
            "buy_url": self.buy_url or "",
            "decision": self.decision,
            "reason": self.reason,
            "trace": parsed_trace,
            "status": self.status,
            "order_id": self.order_id,
            "approve_link": self.approve_link,
        }


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    visitor_id = Column(String(36), nullable=False, index=True)
    action = Column(String(32), nullable=False)
    entry_id = Column(String(16), nullable=True)
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


START_STATUS = {
    "ALLOW": "APPROVED_BY_RULES",
    "ASK": "WAITING_FOR_YOU",
    "BLOCK": "BLOCKED",
}


# --- 3. Database Functions ---

def init_db():
    Base.metadata.create_all(bind=engine)


def ensure_visitor(visitor_id: str) -> Visitor:
    session = Session()
    try:
        visitor = session.get(Visitor, visitor_id)
        if not visitor:
            visitor = Visitor(id=visitor_id)
            settings = VisitorSettings(visitor_id=visitor_id)
            session.add(visitor)
            session.add(settings)
            session.commit()
        else:
            visitor.last_seen = datetime.now(timezone.utc)
            session.commit()
        return visitor
    finally:
        Session.remove()


def get_visitor_settings(visitor_id: str) -> dict:
    ensure_visitor(visitor_id)
    session = Session()
    try:
        stmt = select(VisitorSettings).where(VisitorSettings.visitor_id == visitor_id)
        settings = session.scalars(stmt).first()
        if not settings:
            settings = VisitorSettings(visitor_id=visitor_id)
            session.add(settings)
            session.commit()
        return settings.to_dict()
    finally:
        Session.remove()


def update_visitor_settings(visitor_id: str, new_rules: dict) -> dict:
    ensure_visitor(visitor_id)
    session = Session()
    try:
        stmt = select(VisitorSettings).where(VisitorSettings.visitor_id == visitor_id)
        settings = session.scalars(stmt).first()
        if not settings:
            settings = VisitorSettings(visitor_id=visitor_id)
            session.add(settings)

        if "daily_limit" in new_rules:
            settings.daily_limit = float(new_rules["daily_limit"])
        if "ask_above" in new_rules:
            settings.ask_above = float(new_rules["ask_above"])
        if "blocked_categories" in new_rules:
            cats = [c.strip().lower() for c in new_rules["blocked_categories"] if c.strip()]
            settings.blocked_categories = ",".join(cats)
        if "blocked_keywords" in new_rules:
            kws = [k.strip().lower() for k in new_rules["blocked_keywords"] if k.strip()]
            settings.blocked_keywords = ",".join(kws)

        audit = AuditEvent(
            visitor_id=visitor_id,
            action="UPDATE_SETTINGS",
            detail=f"Rules updated: limit={settings.daily_limit}, ask={settings.ask_above}",
        )
        session.add(audit)
        session.commit()
        return settings.to_dict()
    finally:
        Session.remove()


def get_all(visitor_id: str = None):
    session = Session()
    try:
        stmt = select(LedgerEntry)
        if visitor_id:
            stmt = stmt.where(LedgerEntry.visitor_id == visitor_id)
        stmt = stmt.order_by(LedgerEntry.created.desc())
        results = session.scalars(stmt).all()
        return [entry.to_dict() for entry in results]
    finally:
        Session.remove()


def get(entry_id: str):
    session = Session()
    try:
        entry = session.get(LedgerEntry, entry_id)
        return entry.to_dict() if entry else None
    finally:
        Session.remove()


def find_by_order(order_id: str):
    if not order_id:
        return None
    session = Session()
    try:
        stmt = select(LedgerEntry).where(LedgerEntry.order_id == order_id)
        entry = session.scalars(stmt).first()
        return entry.to_dict() if entry else None
    finally:
        Session.remove()


def add(request_text: str, purchase: dict, decision: dict, visitor_id: str):
    ensure_visitor(visitor_id)
    session = Session()
    try:
        trace_json = json.dumps(decision.get("trace", []))
        entry = LedgerEntry(
            id=uuid.uuid4().hex[:8],
            visitor_id=visitor_id,
            created=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
            request=request_text,
            item=purchase["item"],
            price=float(purchase["price"]),
            category=purchase["category"],
            note=purchase.get("note", ""),
            store=purchase.get("store", ""),
            image=purchase.get("image", ""),
            buy_url=purchase.get("buy_url", ""),
            decision=decision["decision"],
            reason=decision["reason"],
            trace=trace_json,
            status=START_STATUS.get(decision["decision"], "WAITING_FOR_YOU"),
            order_id=None,
            approve_link=None,
        )
        session.add(entry)

        audit = AuditEvent(
            visitor_id=visitor_id,
            action="REQUEST",
            entry_id=entry.id,
            detail=f"Item: {entry.item}, Decision: {entry.decision}",
        )
        session.add(audit)
        session.commit()
        return entry.to_dict()
    finally:
        Session.remove()


def update(entry_id: str, **changes):
    session = Session()
    try:
        entry = session.get(LedgerEntry, entry_id)
        if entry:
            for key, value in changes.items():
                if hasattr(entry, key):
                    setattr(entry, key, value)

            if "status" in changes:
                audit = AuditEvent(
                    visitor_id=entry.visitor_id,
                    action=f"STATUS_{changes['status']}",
                    entry_id=entry.id,
                    detail=f"Status updated to {changes['status']}",
                )
                session.add(audit)

            session.commit()
            return entry.to_dict()
        return None
    finally:
        Session.remove()


def spent_today(visitor_id: str = None) -> float:
    if not visitor_id:
        return 0.0

    today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    session = Session()
    try:
        stmt = (
            select(LedgerEntry)
            .where(LedgerEntry.visitor_id == visitor_id)
            .where(LedgerEntry.created.startswith(today_prefix))
            .where(LedgerEntry.status.in_(("PAID", "AWAITING_PAYMENT")))
        )
        results = session.scalars(stmt).all()
        return sum(entry.price for entry in results)
    finally:
        Session.remove()


def reset(visitor_id: str):
    if not visitor_id:
        return

    session = Session()
    try:
        stmt = select(LedgerEntry).where(LedgerEntry.visitor_id == visitor_id)
        entries = session.scalars(stmt).all()
        for entry in entries:
            session.delete(entry)

        audit = AuditEvent(
            visitor_id=visitor_id,
            action="RESET",
            detail="Visitor reset their demo ledger",
        )
        session.add(audit)
        session.commit()
    finally:
        Session.remove()
