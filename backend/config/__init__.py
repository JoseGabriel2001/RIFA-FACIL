"""
Database configuration and connection management.

This module provides MongoDB connection setup and database access
for all parts of the application.

Usage:
    from config.database import db, client
    
    # Access collections
    users = await db.users.find_one({"id": user_id})
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# Create client and database instances
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Export for use in other modules
__all__ = ['db', 'client', 'ROOT_DIR']
