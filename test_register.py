
import asyncio
import httpx

async def test_register():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/auth/register",
                json={
                    "email": "test@example.com",
                    "name": "Test User",
                    "password": "password123"
                }
            )
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_register())
