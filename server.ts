import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import { RULES, checkPurchase } from "./src/server/rules.js";
import * as ledger from "./src/server/ledger.js";
import { proposePurchase } from "./src/server/agent.js";
import { createOrder, captureOrder, verifyCaptureAmount } from "./src/server/paypalClient.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // Helper to determine base URL dynamically from request or environment
  function getBaseUrl(req: Request): string {
    if (process.env.BASE_URL) return process.env.BASE_URL;
    const host = req.get("host");
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    return `${protocol}://${host}`;
  }

  async function startPayment(entry: ledger.LedgerEntry, baseUrl: string) {
    try {
      const order = await createOrder(
        entry,
        `${baseUrl}/return`,
        `${baseUrl}/cancel`
      );
      ledger.update(entry.id, {
        status: "AWAITING_PAYMENT",
        order_id: order.order_id,
        approve_link: order.approve_link,
      });
    } catch {
      ledger.update(entry.id, { status: "PAYPAL_ERROR" });
    }
  }

  // Extract or generate anonymous visitor ID from cookie
  function getVisitorId(req: Request, res: Response): string {
    const rawCookies = req.headers.cookie || "";
    const match = rawCookies.match(/leash_visitor_id=([^;]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const newId = `vis_${Math.random().toString(36).substring(2, 12)}`;
    res.setHeader("Set-Cookie", `leash_visitor_id=${newId}; Path=/; HttpOnly; SameSite=Lax`);
    return newId;
  }

  // --- API Routes ---

  app.get("/api/rules", (req: Request, res: Response) => {
    const visitorId = getVisitorId(req, res);
    res.json(ledger.getVisitorSettings(visitorId));
  });

  app.post("/api/rules", (req: Request, res: Response) => {
    const visitorId = getVisitorId(req, res);
    const payload = req.body || {};

    const dailyLimit = Number(payload.daily_limit);
    const askAbove = Number(payload.ask_above);
    const categories = payload.blocked_categories;
    const keywords = payload.blocked_keywords;

    if (isNaN(dailyLimit) || isNaN(askAbove)) {
      return res.status(400).json({ error: "Daily limit and ask threshold must be valid numbers." });
    }
    if (dailyLimit <= 0 || dailyLimit > 10000) {
      return res.status(400).json({ error: "Daily limit must be between $1.00 and $10,000.00." });
    }
    if (askAbove <= 0 || askAbove > dailyLimit) {
      return res.status(400).json({ error: `Ask threshold must be between $1.00 and $${dailyLimit.toFixed(2)}.` });
    }
    if (!Array.isArray(categories) || categories.length > 30) {
      return res.status(400).json({ error: "Categories must be a list of up to 30 items." });
    }
    if (!Array.isArray(keywords) || keywords.length > 100) {
      return res.status(400).json({ error: "Keywords must be a list of up to 100 items." });
    }

    const updated = ledger.updateVisitorSettings(visitorId, {
      daily_limit: dailyLimit,
      ask_above: askAbove,
      blocked_categories: categories.map((c) => String(c).trim().slice(0, 50)).filter(Boolean),
      blocked_keywords: keywords.map((k) => String(k).trim().slice(0, 50)).filter(Boolean),
    });
    return res.json(updated);
  });

  app.post("/api/rules/reset", (req: Request, res: Response) => {
    const visitorId = getVisitorId(req, res);
    const resetRules = ledger.updateVisitorSettings(visitorId, DEFAULT_RULES);
    return res.json(resetRules);
  });

  app.get("/api/ledger", (req: Request, res: Response) => {
    const visitorId = getVisitorId(req, res);
    res.json({
      entries: ledger.getAll(visitorId),
      spent_today: ledger.spentToday(visitorId),
    });
  });

  app.post("/api/request", async (req: Request, res: Response) => {
    const visitorId = getVisitorId(req, res);
    const text = String(req.body?.text || "").trim();

    // Input validation
    if (text.length < 2) {
      return res.status(400).json({ error: "Please type a shopping request (at least 2 characters)." });
    }
    if (text.length > 500) {
      return res.status(400).json({ error: "Request is too long. Please keep your prompt under 500 characters." });
    }

    const purchase = await proposePurchase(text);
    if ("error" in purchase && purchase.error) {
      return res.status(502).json({ error: purchase.error });
    }

    const visitorRules = ledger.getVisitorSettings(visitorId);
    const decision = checkPurchase(purchase, ledger.spentToday(visitorId), visitorRules);
    const entry = ledger.add(text, purchase, decision, visitorId);

    if (decision.decision === "ALLOW") {
      await startPayment(entry, getBaseUrl(req));
    }

    return res.json(ledger.get(entry.id));
  });

  app.post("/api/approve/:entryId", async (req: Request, res: Response) => {
    const entryId = req.params.entryId;
    const entry = ledger.get(entryId);
    if (!entry || entry.status !== "WAITING_FOR_YOU") {
      return res.status(400).json({ error: "Nothing to approve." });
    }

    const visitorRules = ledger.getVisitorSettings(entry.visitor_id);
    const recheck = checkPurchase(entry, ledger.spentToday(entry.visitor_id), visitorRules);
    if (recheck.decision === "BLOCK") {
      ledger.update(entryId, {
        status: "BLOCKED",
        decision: "BLOCK",
        reason: recheck.reason,
      });
    } else {
      await startPayment(entry, getBaseUrl(req));
    }

    return res.json(ledger.get(entryId));
  });

  app.post("/api/decline/:entryId", (req: Request, res: Response) => {
    const entryId = req.params.entryId;
    const entry = ledger.get(entryId);
    if (!entry || entry.status !== "WAITING_FOR_YOU") {
      return res.status(400).json({ error: "Nothing to decline." });
    }

    ledger.update(entryId, { status: "DECLINED" });
    return res.json(ledger.get(entryId));
  });

  app.post("/api/reset", (req: Request, res: Response) => {
    const visitorId = getVisitorId(req, res);
    ledger.reset(visitorId);
    return res.json({ ok: true });
  });

  app.get("/return", async (req: Request, res: Response) => {
    const orderId = typeof req.query.token === "string" ? req.query.token : null;
    const entry = orderId ? ledger.findByOrder(orderId) : null;

    // Idempotency: If already marked PAID, safely redirect without re-capturing
    if (entry && entry.status === "PAID") {
      return res.redirect("/");
    }

    if (entry && entry.status === "AWAITING_PAYMENT") {
      const { statusCode, result } = await captureOrder(orderId!);
      if ((statusCode === 200 || statusCode === 201) && result?.status === "COMPLETED") {
        const isValid = verifyCaptureAmount(result, entry.price, "USD");
        if (isValid) {
          ledger.update(entry.id, { status: "PAID" });
        } else {
          ledger.update(entry.id, {
            status: "PAYMENT_FAILED",
            reason: "Security Alert: Captured payment amount or currency did not match ledger entry.",
          });
        }
      } else {
        ledger.update(entry.id, { status: "PAYMENT_FAILED" });
      }
    }

    res.redirect("/");
  });

  app.get("/cancel", (req: Request, res: Response) => {
    const orderId = typeof req.query.token === "string" ? req.query.token : null;
    const entry = orderId ? ledger.findByOrder(orderId) : null;

    if (entry && entry.status === "AWAITING_PAYMENT") {
      ledger.update(entry.id, { status: "CANCELLED" });
    }

    res.redirect("/");
  });

  // --- Static & Vite Frontend Integration ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Leash server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
