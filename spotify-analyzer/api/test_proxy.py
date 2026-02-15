import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("LASTFM_API_KEY")
print(f"API Key present: {bool(API_KEY)}")

try:
    # Simulate what the frontend does via the proxy logic 
    # (but testing direct Last.fm connection first)
    url = "http://ws.audioscrobbler.com/2.0/"
    params = {
        "method": "user.getInfo",
        "user": "test",
        "api_key": API_KEY,
        "format": "json"
    }
    print(f"Testing direct Last.fm connection...")
    response = requests.get(url, params=params)
    print(f"Direct Response Status: {response.status_code}")
    if response.status_code == 200:
        print("Direct connection successful!")
    else:
        print(f"Direct connection failed: {response.text}")

except Exception as e:
    print(f"Error: {e}")
