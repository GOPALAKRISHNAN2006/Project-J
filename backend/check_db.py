
import asyncio
from sqlalchemy import select
from app.core.database import engine, AsyncSessionLocal
# Import all models to ensure relationships are resolved
from app.models.user import User
from app.models.chat import ChatSession
from app.models.automation import Automation
from app.models.task import Task
from app.models.memory import Memory
from app.models.calendar import CalendarEvent
from app.models.voice import VoiceClone, VoiceInteraction
from app.models.plugin import UserPlugin

async def check_users():
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(User))
            users = result.scalars().all()
            print(f"Total users: {len(users)}")
            for user in users:
                print(f"User: {user.email}")
                print(f"  Active: {user.is_active}")
                print(f"  AI Provider: {user.ai_provider}")
                print(f"  Gemini API Key: {user.gemini_api_key}")
                print(f"  Default Model: {user.default_model}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_users())
