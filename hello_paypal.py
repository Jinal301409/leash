import os
import requests
from dotenv import load_dotenv

load_dotenv()
client_id = os.getenv("PAYPAL_CLIENT_ID")
secret = os.getenv("PAYPAL_CLIENT_SECRET")

response = requests.post(
    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    auth=(client_id, secret),
    data={"grant_type": "client_credentials"},
)

print("Status:", response.status_code)
if response.status_code == 200:
    print("Success! Token starts with:", response.json()["access_token"][:10])
else:
    print("Something went wrong:", response.text)