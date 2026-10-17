# Leash: a spending leash for AI agents

Let your AI agent shop, with rules it can't break.

**Live demo:** [your Render address]
**Demo video:** [your YouTube link]

## The problem

AI agents are starting to buy things for us, but few people trust them with money. An agent can overspend, pick the wrong thing, or be tricked. Leash puts plain-code guardrails between the AI and the payment.

## How it works

1. You tell the agent what to buy, in plain English.
2. **The AI (Google Gemini)** turns the request into a product search and a budget. It never decides whether to spend.
3. **Channel3** returns real products with real prices from real stores.
4. **The rules checker** (ordinary Python, no AI) decides:
   - **Allow:** within your rules, so a PayPal order is created.
   - **Ask:** above your approval threshold, so you approve or decline first.
   - **Block:** a banned category, a banned word in the item name, or over the daily limit.
5. **PayPal (Sandbox)** creates the order and captures the payment after the buyer approves.
6. Every decision is saved to a **ledger** (AG Grid) with a plain-language reason.

Because the rules are plain code, the AI cannot talk its way past them. The item name is checked against a blocked-word list as well as the AI's category label, so mislabelled items (like earbuds called "gifts") are still caught.

## Tools used

- **PayPal Developer Platform (Sandbox):** Orders API to create and capture payments.
- **Google Gemini:** understands requests and produces the search and budget.
- **Channel3:** real product catalog, prices and photos.
- **AG Grid:** the decision ledger.
- **Render:** hosting.
- Flask (Python) backend; React, Tailwind CSS and Motion front end.

## Try it

1. Open the live demo (the first load may take a minute on the free plan).
2. Tap an example or type a request, such as "Get me a notebook under $15".
3. To pay, log in at the PayPal sandbox checkout as a buyer:
   - Email: [judge sandbox email]
   - Password: [judge sandbox password]
4. Try the example that buys earbuds as a "gift" to see Leash catch it, and the headphones example to see a block.
5. Use **Reset demo** to clear the shared ledger and budget.

## Run it yourself

Requires Python 3.

```
git clone [your repo link]
cd leash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file with:

```
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
GEMINI_API_KEY=...
CHANNEL3_API_KEY=...
```

Then run `python app.py` and open http://localhost:5000. The built website is already in the `static` folder. To edit the front end, work in `frontend/` (`npm install`, then `npm run dev`).

## Honest limitations

- Payments use the **PayPal Sandbox**, so no real money moves and nothing is actually purchased.
- The ledger is a simple file, shared by all visitors and cleared on restart. There is no login.
- Product matching depends on Channel3's catalog, so results vary.

## License

MIT
