export interface Rules {
  daily_limit: number;
  ask_above: number;
  blocked_categories: string[];
  blocked_keywords: string[];
}

export const DEFAULT_RULES: Rules = {
  daily_limit: 50.0,
  ask_above: 25.0,
  blocked_categories: ["electronics", "gambling"],
  blocked_keywords: [
    "headphone",
    "earbud",
    "laptop",
    "phone",
    "tablet",
    "camera",
    "console",
    "speaker",
    "charger",
    "smartwatch",
    "television",
    "casino",
    "lottery",
    "poker",
    "betting",
  ],
};

export const RULES = DEFAULT_RULES;

export interface PurchaseIntent {
  item: string;
  price: number;
  category: string;
}

export interface RuleTraceItem {
  check: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface RuleDecision {
  decision: "ALLOW" | "ASK" | "BLOCK";
  reason: string;
  trace: RuleTraceItem[];
}

export function checkPurchase(
  purchase: PurchaseIntent,
  spentToday: number = 0.0,
  customRules?: Rules
): RuleDecision {
  const active = customRules || DEFAULT_RULES;
  const price = purchase.price;
  const category = (purchase.category || "").toLowerCase();
  const item = (purchase.item || "").toLowerCase();

  const trace: RuleTraceItem[] = [];

  // 1. Price validity
  if (price <= 0) {
    trace.push({
      check: "price_validity",
      label: "Price Validity",
      passed: false,
      detail: `Price $${price.toFixed(2)} is not positive and valid.`,
    });
    return {
      decision: "BLOCK",
      reason: "The price is not valid.",
      trace,
    };
  }
  trace.push({
    check: "price_validity",
    label: "Price Validity",
    passed: true,
    detail: `Price $${price.toFixed(2)} is valid.`,
  });

  // 2. Blocked Categories
  const isCategoryBlocked = active.blocked_categories.some(
    (c) => c.toLowerCase() === category
  );
  if (isCategoryBlocked) {
    trace.push({
      check: "blocked_category",
      label: "Category Filter",
      passed: false,
      detail: `Category '${category}' is on your blocked list.`,
    });
    return {
      decision: "BLOCK",
      reason: `The category '${category}' is not allowed.`,
      trace,
    };
  }
  trace.push({
    check: "blocked_category",
    label: "Category Filter",
    passed: true,
    detail: `Category '${category}' is permitted.`,
  });

  // 3. Blocked Keywords
  let matchedKeyword: string | null = null;
  for (const word of active.blocked_keywords) {
    const cleanWord = word.trim().toLowerCase();
    if (cleanWord && item.includes(cleanWord)) {
      matchedKeyword = cleanWord;
      break;
    }
  }

  if (matchedKeyword) {
    trace.push({
      check: "blocked_keyword",
      label: "Keyword Guardrail",
      passed: false,
      detail: `Item contains prohibited keyword '${matchedKeyword}'.`,
    });
    return {
      decision: "BLOCK",
      reason: `The item name contains '${matchedKeyword}', which is on the blocked list.`,
      trace,
    };
  }
  trace.push({
    check: "blocked_keyword",
    label: "Keyword Guardrail",
    passed: true,
    detail: "No blocked keywords found in item title.",
  });

  // 4. Daily Limit
  const newTotal = spentToday + price;
  if (newTotal > active.daily_limit) {
    trace.push({
      check: "daily_limit",
      label: "Daily Budget Cap",
      passed: false,
      detail: `Spending $${price.toFixed(2)} brings today's total to $${newTotal.toFixed(2)}, exceeding $${active.daily_limit.toFixed(2)}.`,
    });
    return {
      decision: "BLOCK",
      reason: `This would bring today's spending to $${newTotal.toFixed(2)}, over the $${active.daily_limit.toFixed(2)} daily limit.`,
      trace,
    };
  }
  trace.push({
    check: "daily_limit",
    label: "Daily Budget Cap",
    passed: true,
    detail: `Projected today's spend $${newTotal.toFixed(2)} is within $${active.daily_limit.toFixed(2)} daily limit.`,
  });

  // 5. Ask-Above Approval Threshold
  if (price > active.ask_above) {
    trace.push({
      check: "approval_threshold",
      label: "Approval Threshold",
      passed: false,
      detail: `Price $${price.toFixed(2)} exceeds $${active.ask_above.toFixed(2)} threshold; requires buyer approval.`,
    });
    return {
      decision: "ASK",
      reason: `$${price.toFixed(2)} is above $${active.ask_above.toFixed(2)}, so I need your approval.`,
      trace,
    };
  }
  trace.push({
    check: "approval_threshold",
    label: "Approval Threshold",
    passed: true,
    detail: `Price $${price.toFixed(2)} is within auto-allow threshold ($${active.ask_above.toFixed(2)}).`,
  });

  return {
    decision: "ALLOW",
    reason: "Within all your rules.",
    trace,
  };
}
