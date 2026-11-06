import { understandRequest } from "./aiAgent.js";
import { findProducts } from "./catalog.js";

export interface ProposedPurchase {
  item: string;
  price: number;
  category: string;
  note: string;
  store: string;
  buy_url: string;
  image: string;
  error?: string;
}

export async function proposePurchase(
  userRequest: string
): Promise<ProposedPurchase | { error: string }> {
  const intent = await understandRequest(userRequest);
  if (intent.error) {
    return { error: intent.error };
  }

  try {
    const options = await findProducts(intent.search_query, intent.max_price);

    if (!options || options.length === 0) {
      return { error: "No matching products found within that budget." };
    }

    let best = options[0];
    if (intent.max_price !== null) {
      // Pick best matching under the budget, highest price option (as in original Python code)
      best = options.reduce((prev, curr) => (curr.price > prev.price ? curr : prev), options[0]);
    }

    return {
      item: best.item.slice(0, 100),
      price: best.price,
      category: intent.category,
      note: `${intent.note} Found at ${best.store}.`,
      store: best.store,
      buy_url: best.buy_url,
      image: best.image,
    };
  } catch (err: any) {
    return { error: "Could not reach the product catalog. Please try again." };
  }
}
