"""
Authentication dependencies and helpers.

This module provides reusable authentication logic including:
- Password hashing and verification
- JWT token creation and validation
- FastAPI dependency for getting current user

Usage:
    from dependencies.auth import get_current_user, create_token
    
    @router.get("/protected")
    async def protected_route(user: dict = Depends(get_current_user)):
        return {"user_id": user["id"]}
"""

import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from fastapi import Header, HTTPException
from config import db
from config.settings import settings


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    return bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        password: Plain text password to verify
        hashed: Previously hashed password
        
    Returns:
        True if password matches
    """
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            hashed.encode('utf-8')
        )
    except Exception:
        return False


def create_token(user_id: str) -> str:
    """
    Create a JWT token for a user.
    
    Args:
        user_id: User's unique identifier
        
    Returns:
        Encoded JWT token string
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(authorization: str = Header(None)) -> dict:
    """
    FastAPI dependency to get the current authenticated user.
    
    Extracts and validates the JWT token from the Authorization header,
    then fetches the user from the database.
    
    Args:
        authorization: Authorization header value (injected by FastAPI)
        
    Returns:
        User document from database (without _id)
        
    Raises:
        HTTPException: If token is missing, invalid, expired, or user not found
        
    Usage:
        @router.get("/me")
        async def get_me(user: dict = Depends(get_current_user)):
            return user
    """
    # Check header format
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=401, 
            detail="Token no proporcionado"
        )
    
    # Extract token
    token = authorization.split(' ')[1]
    
    try:
        # Decode and validate token
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Fetch user from database
        user = await db.users.find_one(
            {"id": payload['user_id']}, 
            {"_id": 0}
        )
        
        if not user:
            raise HTTPException(
                status_code=401, 
                detail="Usuario no encontrado"
            )
        
        return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, 
            detail="Token expirado"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401, 
            detail="Token inválido"
        )


async def get_optional_user(authorization: str = Header(None)) -> dict | None:
    """
    FastAPI dependency to optionally get the current user.
    
    Unlike get_current_user, this returns None instead of raising
    an exception if no valid token is provided. Useful for endpoints
    that work both authenticated and unauthenticated.
    
    Args:
        authorization: Authorization header value
        
    Returns:
        User document or None
    """
    if not authorization or not authorization.startswith('Bearer '):
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
