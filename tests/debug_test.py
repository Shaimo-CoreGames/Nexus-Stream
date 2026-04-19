import httpx

url = "http://127.0.0.1:8000/track"
headers = {"X-API-KEY": "nexus_secret_123"}
# Match this EXACTLY to your FastAPI Pydantic Model
data = {
    "event_type": "click",
    "payload": {"element": "debug_button"}
}

with httpx.Client() as client:
    r = client.post(url, json=data, headers=headers)
    print(f"Status Code: {r.status_code}")
    print(f"Response Body: {r.text}")