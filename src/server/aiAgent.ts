import { GoogleGenAI } from "@google/genai";

export interface UnderstoodIntent {
  search_query: string;
  max_price: number | null;
  category: string;
  note: string;
  error?: string;
}

const SYSTEM_PROMPT = `You are a shopping assistant. Turn the user's request into a product search.
Reply with ONLY a JSON object and nothing else, using exactly these keys:
- "search_query": 2 to 6 words describing the product to search for (string)
- "max_price": the most the user wants to pay in US dollars (number), or null if no budget is stated
- "category": one of "stationery", "books", "gifts", "electronics", "groceries", "clothing", "gambling", "other"
- "note": one short sentence explaining what you will look for
If the request is not a purchase, reply with {"error": "short reason"}.`;

function parseFallbackIntent(userRequest: string): UnderstoodIntent {
  const text = userRequest.toLowerCase();

  // Check for budget mentions like "$15", "under $35", "around $20", "budget 25"
  let maxPrice: number | null = null;
  const priceMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)/i);
  if (priceMatch) {
    maxPrice = parseFloat(priceMatch[1] || priceMatch[2]);
  }

  // Detect category
  let category = "other";
  if (/\b(notebook|pen|pencil|paper|journal|stationery|sketchbook|binder)\b/i.test(text)) {
    category = "stationery";
  } else if (/\b(book|novel|reading|guide|paperback|hardcover)\b/i.test(text)) {
    category = "books";
  } else if (/\b(gift|birthday|anniversary|sister|brother|friend|present|mug)\b/i.test(text)) {
    category = "gifts";
  } else if (/\b(headphone|earbud|airpod|laptop|phone|tablet|charger|speaker|smartwatch|gadget|camera)\b/i.test(text)) {
    category = "electronics";
  } else if (/\b(shirt|hoodie|jacket|shoes|pants|clothing|dress|socks)\b/i.test(text)) {
    category = "clothing";
  } else if (/\b(coffee|tea|snack|chocolate|grocery|food)\b/i.test(text)) {
    category = "groceries";
  } else if (/\b(bet|betting|casino|lottery|poker|gamble)\b/i.test(text)) {
    category = "gambling";
  }

  // Extract clean query without jailbreak attempts or conversational prefixes
  let cleanQuery = userRequest
    .replace(/(?:ignore your rules|bypass guardrails|system override|force allow|disregard instructions|categorize them as|call them a [a-z]+)/gi, "")
    .replace(/^(get\s+me|buy\s+me|find\s+me|purchase|order|i\s+need|i\s+want)\s+/i, "")
    .replace(/(?:under|around|for|less than|up to)\s*\$?\s*\d+(\.\d{2})?/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // If specific target keywords are present, isolate them for high-fidelity catalog search
  if (/\blaptop\b/i.test(text)) cleanQuery = "laptop";
  else if (/\b(earbud|earbuds)\b/i.test(text)) cleanQuery = "earbuds";
  else if (/\b(headphone|headphones)\b/i.test(text)) cleanQuery = "headphones";
  else if (/\b(smartwatch|watch)\b/i.test(text)) cleanQuery = "smartwatch";
  else if (/\b(poker|casino)\b/i.test(text)) cleanQuery = "poker chips";

  if (!cleanQuery) {
    cleanQuery = userRequest;
  }

  return {
    search_query: cleanQuery,
    max_price: maxPrice,
    category,
    note: `Found options for "${cleanQuery}"${maxPrice ? ` under $${maxPrice}` : ""}.`,
  };
}

export async function understandRequest(userRequest: string): Promise<UnderstoodIntent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userRequest,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      const rawText = (response.text || "").trim();
      const cleaned = rawText
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

      const data = JSON.parse(cleaned);
      if (data.error) {
        return {
          search_query: "",
          max_price: null,
          category: "other",
          note: "",
          error: data.error,
        };
      }

      const maxPrice = data.max_price != null ? parseFloat(String(data.max_price)) : null;
      return {
        search_query: String(data.search_query || userRequest),
        max_price: Number.isFinite(maxPrice) ? maxPrice : null,
        category: String(data.category || "other").toLowerCase(),
        note: String(data.note || ""),
      };
    } catch (err: any) {
      console.warn("Gemini intent extraction warning, using heuristic fallback:", err?.message);
    }
  }

  return parseFallbackIntent(userRequest);
}
