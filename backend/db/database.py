"""
Database connection and management for MongoDB.
Uses motor for async MongoDB operations.
"""

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import settings
from core.logger import get_logger
from exceptions import DatabaseError

logger = get_logger("database")


class Database:
    """Database connection manager for MongoDB."""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
    
    async def connect(self):
        """Connect to MongoDB database."""
        try:
            logger.info(f"Connecting to MongoDB: {settings.mongo_uri}")
            self.client = AsyncIOMotorClient(settings.mongo_uri)
            self.database = self.client[settings.database_name]
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise DatabaseError(f"Database connection failed: {e}")
    
    async def disconnect(self):
        """Disconnect from MongoDB database."""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    def get_collection(self, collection_name: str):
        """Get a MongoDB collection."""
        if self.database is None:
            raise DatabaseError("Database not connected")
        return self.database[collection_name]


# Global database instance
database = Database()


async def get_database() -> Database:
    """Dependency to get database instance."""
    return database 