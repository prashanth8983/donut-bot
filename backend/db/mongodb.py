from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from core.logger import get_logger
from config import settings

logger = get_logger("mongodb_client")

class MongoDBClient:
    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db = None

    async def connect(self):
        try:
            self.client = AsyncIOMotorClient(settings.mongodb_uri)
            await self.client.admin.command('ping')
            self.db = self.client[settings.mongodb_db_name]
            logger.info("Successfully connected to MongoDB.")
        except ConnectionFailure as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred during MongoDB connection: {e}")
            raise

    async def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

mongodb_client = MongoDBClient()
