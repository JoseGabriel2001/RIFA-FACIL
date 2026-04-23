"""
Authentication routes.

Handles user registration, login, and Google OAuth authentication.

Endpoints:
    POST /auth/register - Create new account
    POST /auth/login - Login with email/password
    POST /auth/google/session - Google OAuth callback
    GET /auth/me - Get current user profile
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging

from config import db
from config.settings import settings
from dependencies import hash_password, verify_password, create_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class UserCreate(BaseModel):
    """Registration request data."""
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    """Login request data."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User data returned in responses."""
    id: str
    email: str
    name: str
    plan: str
    is_super_admin: bool = False
    created_at: str


class AuthResponse(BaseModel):
    """Response containing token and user data."""
    token: str
    user: UserResponse


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    """
    Register a new user account.
    
    Creates a new user with the provided email, password, and name.
    Returns a JWT token for immediate login.
    
    New users start on the 'free' plan with 2 raffle limit.
    
    Args:
        user_data: Registration data (email, password, name)
        
    Returns:
        JWT token and user data
        
    Raises:
        HTTPException 400: If email is already registered
    """
    # Check for existing user
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="El correo electrónico ya está registrado"
        )
    
    # Create user document
    user_id = str(uuid.uuid4())
    is_super_admin = user_data.email in settings.SUPER_ADMIN_EMAILS
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": hash_password(user_data.password),
        "plan": "free",
        "is_super_admin": is_super_admin,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate token
    token = create_token(user_id)
    
    # Return user data (without password)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "plan": "free",
            "is_super_admin": is_super_admin,
            "created_at": user_doc["created_at"]
        }
    }


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """
    Login with email and password.
    
    Validates credentials and returns a JWT token.
    
    Args:
        credentials: Login data (email, password)
        
    Returns:
        JWT token and user data
        
    Raises:
        HTTPException 401: If credentials are invalid
    """
    # Find user
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail="Credenciales inválidas"
        )
    
    # Check if user registered via Google (no password)
    if not user.get("hashed_password"):
        raise HTTPException(
            status_code=401, 
            detail="Esta cuenta usa inicio de sesión con Google"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401, 
            detail="Credenciales inválidas"
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Generate token
    token = create_token(user["id"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user.get("plan", "free"),
            "is_super_admin": user.get("is_super_admin", False),
            "created_at": user.get("created_at", "")
        }
    }


@router.post("/google/session", response_model=AuthResponse)
async def google_auth_session(request: Request, response: Response):
    """
    Exchange Google OAuth session for JWT token.
    
    This endpoint is called by the frontend after Google OAuth redirect.
    It validates the session with Emergent Auth and creates/updates the user.
    
    Flow:
    1. Frontend redirects to Google OAuth
    2. Google redirects back with session_id
    3. Frontend calls this endpoint with session_id
    4. We validate with Emergent Auth
    5. Create/update user and return JWT
    
    Args:
        request: Contains session_id in JSON body
        response: Used to set session cookie
        
    Returns:
        JWT token and user data
        
    Raises:
        HTTPException 400: If session_id missing
        HTTPException 401: If session is invalid
    """
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(
            status_code=400, 
            detail="session_id es requerido"
        )
    
    # Validate session with Emergent Auth
    try:
        async with httpx.AsyncClient() as http_client:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(
                    status_code=401, 
                    detail="Sesión inválida o expirada"
                )
            
            auth_data = auth_response.json()
            
    except httpx.RequestError as e:
        logger.error(f"Error contacting auth service: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error de autenticación"
        )
    
    # Extract user data from auth response
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    if not email or not session_token:
        raise HTTPException(
            status_code=400, 
            detail="Datos de sesión incompletos"
        )
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        # Update existing user
        user_id = existing_user["id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "name": name or existing_user.get("name"),
                "picture": picture,
                "last_login": datetime.now(timezone.utc).isoformat()
            }}
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    else:
        # Create new user
        user_id = str(uuid.uuid4())
        is_super_admin = email in settings.SUPER_ADMIN_EMAILS
        
        user = {
            "id": user_id,
            "email": email,
            "name": name or email.split("@")[0],
            "picture": picture,
            "plan": "free",
            "is_super_admin": is_super_admin,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    
    # Store session for future reference
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set httpOnly cookie for session
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    # Generate our own JWT token
    token = create_token(user_id)
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user.get("plan", "free"),
            "is_super_admin": user.get("is_super_admin", False),
            "created_at": user.get("created_at", "")
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """
    Get current user profile.
    
    Returns the authenticated user's profile data.
    
    Args:
        user: Current user (injected by dependency)
        
    Returns:
        User profile data
    """
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "plan": user.get("plan", "free"),
        "is_super_admin": user.get("is_super_admin", False),
        "created_at": user.get("created_at", "")
    }
