import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
import asyncpg

async def test_db():
    print("Testing MongoDB...")
    try:
        mongo_url = os.getenv("MONGODB_URL")
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
        await client.server_info()
        print("MongoDB connection: SUCCESS")
    except Exception as e:
        print(f"MongoDB connection: FAILED ({e})")

    print("\nTesting PostgreSQL...")
    try:
        pg_url = os.getenv("DATABASE_URL")
        # asyncpg URL uses postgresql:// instead of postgresql+asyncpg://
        pg_url = pg_url.replace("postgresql+asyncpg://", "postgresql://")
        conn = await asyncpg.connect(pg_url, timeout=2.0)
        print("PostgreSQL connection: SUCCESS")
        await conn.close()
    except Exception as e:
        print(f"PostgreSQL connection: FAILED ({e})")

if __name__ == "__main__":
    asyncio.run(test_db())
