import os
import json
import time
from google import genai
from google.genai import types, errors
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-3.8-flash"

SYSTEM_PROMPT = """You are a shopping assistant. Turn the user's request into a product search.
Reply with ONLY a JSON object and nothing else, using exactly these keys:
- "search_query": 2 to 6 words describing the product to search for (string)
- "max_price": the most the user wants to pay in US dollars (number), or null if no budget is stated
- "category": one of "stationery", "books", "gifts", "electronics", "groceries", "clothing", "gambling", "other"
- "note": one short sentence explaining what you will look for
If the request is not a purchase, reply with {"error": "short reason"}."""


def ask_model(user_request):
    for attempt in range(5):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=user_request,
                config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
            )
            return (response.text or "").strip()
        except errors.ServerError:
            wait = 2 ** attempt
            print(f"The AI is busy. Retrying in {wait} seconds...")
            time.sleep(wait)
    return None


def understand_request(user_request):
    text = ask_model(user_request)
    if text is None:
        return {"error": "The AI is too busy right now. Please try again in a moment."}

    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"error": "The AI reply could not be understood."}

    if "error" in data:
        return data

    try:
        max_price = data.get("max_price")
        return {
            "search_query": str(data["search_query"]),
            "max_price": float(max_price) if max_price is not None else None,
            "category": str(data["category"]).lower(),
            "note": str(data.get("note", "")),
        }
    except (KeyError, ValueError, TypeError):
        return {"error": "The AI reply was missing something."}