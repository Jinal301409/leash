import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

response = requests.post(
    "https://api.trychannel3.com/v1/search",
    headers={
        "x-api-key": os.getenv("CHANNEL3_API_KEY"),
        "Content-Type": "application/json",
    },
    json={"query": "lined notebook", "limit": 3},
    timeout=30,
)

print("Status:", response.status_code)
data = response.json()

if isinstance(data, dict):
    print("Top-level keys:", list(data.keys()))
    products = data.get("products", [])
else:
    print("Reply type:", type(data))
    products = []

print("Number of products:", len(products))

for product in products:
    print("\n---", product.get("title"))
    print("Product fields:", list(product.keys()))
    offers = product.get("offers")
    print("Offers:", json.dumps(offers, indent=2)[:1500])