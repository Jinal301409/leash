import os

import requests
from dotenv import load_dotenv

load_dotenv()

SEARCH_URL = "https://api.trychannel3.com/v1/search"


def find_products(query, max_price=None):
    response = requests.post(
        SEARCH_URL,
        headers={
            "x-api-key": os.getenv("CHANNEL3_API_KEY"),
            "Content-Type": "application/json",
        },
        json={"query": query, "limit": 20},
        timeout=30,
    )
    response.raise_for_status()
    products = response.json().get("products", [])

    options = []
    for product in products:
        image = ""
        for picture in product.get("images") or []:
            if picture.get("is_main_image"):
                image = picture.get("url", "")
                break
        if not image and product.get("images"):
            image = product["images"][0].get("url", "")
        for offer in product.get("offers", []):
            price = offer.get("price") or {}
            amount = price.get("price", price.get("amount"))

            if amount is None or price.get("currency") != "USD":
                continue
            if offer.get("availability") not in (None, "InStock"):
                continue
            if max_price is not None and amount > max_price:
                continue

            options.append({
                "item": product.get("title", "Unknown item"),
                "price": float(amount),
                "store": offer.get("domain", ""),
                "buy_url": offer.get("url", ""),
                "image": image,
            })
    return options