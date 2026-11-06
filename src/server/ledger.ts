import crypto from "crypto";
import { DEFAULT_RULES, Rules, RuleTraceItem } from "./rules.js";

export interface LedgerEntry {
  id: string;
  visitor_id: string;
  created: string;
  request: string;
  item: string;
  price: number;
  category: string;
  note: string;
  store: string;
  image: string;
  buy_url: string;
  decision: "ALLOW" | "ASK" | "BLOCK";
  reason: string;
  trace: RuleTraceItem[];
  status: string;
  order_id: string | null;
  approve_link: string | null;
}

const START_STATUS: Record<string, string> = {
  ALLOW: "APPROVED_BY_RULES",
  ASK: "WAITING_FOR_YOU",
  BLOCK: "BLOCKED",
};

let entries: LedgerEntry[] = [];
const visitorSettingsStore = new Map<string, Rules>();

export function getVisitorSettings(visitorId: string): Rules {
  if (!visitorSettingsStore.has(visitorId)) {
    visitorSettingsStore.set(visitorId, { ...DEFAULT_RULES });
  }
  return { ...visitorSettingsStore.get(visitorId)! };
}

export function updateVisitorSettings(visitorId: string, updated: Partial<Rules>): Rules {
  const current = getVisitorSettings(visitorId);
  const next: Rules = {
    daily_limit: updated.daily_limit !== undefined ? Number(updated.daily_limit) : current.daily_limit,
    ask_above: updated.ask_above !== undefined ? Number(updated.ask_above) : current.ask_above,
    blocked_categories: updated.blocked_categories
      ? updated.blocked_categories.map((c) => String(c).trim().toLowerCase())
      : current.blocked_categories,
    blocked_keywords: updated.blocked_keywords
      ? updated.blocked_keywords.map((k) => String(k).trim().toLowerCase())
      : current.blocked_keywords,
  };
  visitorSettingsStore.set(visitorId, next);
  return next;
}

export function reset(visitorId?: string): void {
  if (visitorId) {
    entries = entries.filter((e) => e.visitor_id !== visitorId);
  } else {
    entries = [];
  }
}

export function getAll(visitorId?: string): LedgerEntry[] {
  const filtered = visitorId ? entries.filter((e) => e.visitor_id === visitorId) : entries;
  return [...filtered].reverse();
}

export function get(id: string): LedgerEntry | undefined {
  return entries.find((e) => e.id === id);
}

export function findByOrder(orderId: string): LedgerEntry | undefined {
  return entries.find((e) => e.order_id === orderId);
}

export function add(
  requestText: string,
  purchase: {
    item: string;
    price: number;
    category: string;
    note?: string;
    store?: string;
    image?: string;
    buy_url?: string;
  },
  decision: { decision: "ALLOW" | "ASK" | "BLOCK"; reason: string; trace?: RuleTraceItem[] },
  visitorId: string = "default"
): LedgerEntry {
  const entry: LedgerEntry = {
    id: crypto.randomBytes(4).toString("hex"),
    visitor_id: visitorId,
    created: new Date().toISOString().slice(0, 19),
    request: requestText,
    item: purchase.item,
    price: purchase.price,
    category: purchase.category,
    note: purchase.note || "",
    store: purchase.store || "",
    image: purchase.image || "",
    buy_url: purchase.buy_url || "",
    decision: decision.decision,
    reason: decision.reason,
    trace: decision.trace || [],
    status: START_STATUS[decision.decision] || "WAITING_FOR_YOU",
    order_id: null,
    approve_link: null,
  };
  entries.push(entry);
  return entry;
}

export function update(
  entryId: string,
  changes: Partial<LedgerEntry>
): LedgerEntry | undefined {
  const entry = entries.find((e) => e.id === entryId);
  if (entry) {
    Object.assign(entry, changes);
  }
  return entry;
}

export function spentToday(visitorId?: string): number {
  const today = new Date().toISOString().slice(0, 10);
  let total = 0.0;
  for (const entry of entries) {
    if (visitorId && entry.visitor_id !== visitorId) continue;
    if (
      entry.created.startsWith(today) &&
      (entry.status === "PAID" || entry.status === "AWAITING_PAYMENT")
    ) {
      total += entry.price;
    }
  }
  return total;
}
