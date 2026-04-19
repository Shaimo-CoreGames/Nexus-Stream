import asyncio
import httpx
import time

API_URL = "http://127.0.0.1:8000/track"
API_KEY = "nexus_secret_123" # Must match what's in your DB!
TOTAL_REQUESTS = 20
CONCURRENCY_LIMIT = 2

semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

async def send_event(client, i):
    async with semaphore:
        payload = {"type": "click", "element": f"button_{i}"}
        headers = {"X-API-KEY": API_KEY}
        try:
            # We add a 20-second timeout because the network is slow
            response = await client.post(API_URL, json=payload, headers=headers, timeout=20.0)
            await asyncio.sleep(0.1) # Breathe
            return response.status_code
        except Exception as e:
            return str(e)
        

async def main():
    # Increase limits for the client itself
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    async with httpx.AsyncClient(limits=limits, timeout=30.0) as client:
        print(f"Starting test for {TOTAL_REQUESTS} requests...")
        start_time = time.perf_counter()
        
        tasks = [send_event(client, i) for i in range(TOTAL_REQUESTS)]
        results = await asyncio.gather(*tasks)
        
        duration = time.perf_counter() - start_time
        successes = [r for r in results if r == 200]
        
        print(f"\n--- Final Results ---")
        print(f"Successful: {len(successes)} / {TOTAL_REQUESTS}")
        print(f"Time Taken: {duration:.2f}s")

if __name__ == "__main__":
    asyncio.run(main())