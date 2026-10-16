import os
import json
import time
from google import genai
from google.genai import types, errors
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL = "gemini-3.8-flash"

SYSTEM_PROMPT = """You are a shopping assistant. Turn the user's request into ONE purchase proposal.
Reply with ONLY a JSON object and nothing else, using exactly these keys:
- "item": short product name (string)
- "price": a realistic price in US dollars (number)
- "category": one of "stationery", "books", "gifts", "electronics", "groceries", "clothing", "gambling", "other"
- "note": one short sentence explaining your choice
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


def propose_purchase(user_request):
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
        return {
            "item": str(data["item"]),
            "price": float(data["price"]),
            "category": str(data["category"]).lower(),
            "note": str(data.get("note", "")),
        }
    except (KeyError, ValueError, TypeError):
        return {"error": "The AI reply was missing something."}