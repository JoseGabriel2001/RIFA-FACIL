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
import logging
import httpx

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
            status_code=400, detail="El correo electrónico ya está registrado"
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
        "created_at": datetime.now(timezone.utc).isoformat(),
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
            "created_at": user_doc["created_at"],
        },
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
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Check if user registered via Google (no password)
    if not user.get("hashed_password"):
        raise HTTPException(
            status_code=401, detail="Esta cuenta usa inicio de sesión con Google"
        )

    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}},
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
            "created_at": user.get("created_at", ""),
        },
    }


@router.post("/google/token", response_model=AuthResponse)
async def google_auth_token(request: Request, response: Response):
    """
    Exchange Google OAuth access token for JWT token.

    This endpoint is called by the frontend after Google OAuth authentication.
    It validates the access token with Google and creates/updates the user.

    Flow:
    1. Frontend authenticates with Google using @react-oauth/google
    2. Frontend sends access_token to this endpoint
    3. We validate token with Google's API
    4. Extract user data from token
    5. Create/update user in database
    6. Return JWT token for app authentication

    Args:
        request: Contains access_token in JSON body
        response: Used to set session cookie

    Returns:
        JWT token and user data

    Raises:
        HTTPException 400: If access_token missing or invalid
        HTTPException 401: If token validation fails
    """
    body = await request.json()
    access_token = body.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="access_token es requerido")

    # Validate token with Google's OAuth 2.0 tokeninfo endpoint
    try:
        async with httpx.AsyncClient() as http_client:
            token_response = await http_client.get(
                f"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={access_token}"
            )

            if token_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Token inválido o expirado")

            token_data = token_response.json()

    except Exception as e:
        logger.error(f"Error validating Google token: {e}")
        raise HTTPException(status_code=401, detail="Error al validar token de Google")

    # Extract user info from token data
    email = token_data.get("email")

    if not email:
        raise HTTPException(
            status_code=400, detail="No se pudo obtener email del token"
        )

    # For additional user info, fetch from Google's userinfo endpoint
    try:
        async with httpx.AsyncClient() as http_client:
            userinfo_response = await http_client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if userinfo_response.status_code == 200:
                user_info = userinfo_response.json()
                name = user_info.get("name", email.split("@")[0])
                picture = user_info.get("picture")
            else:
                name = email.split("@")[0]
                picture = None

    except Exception as e:
        logger.warning(f"Could not fetch userinfo: {e}")
        name = email.split("@")[0]
        picture = None

    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})

    if existing_user:
        # Update existing user
        user_id = existing_user["id"]
        await db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "name": name or existing_user.get("name"),
                    "picture": picture,
                    "last_login": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        user = await db.users.find_one({"email": email}, {"_id": 0})
    else:
        # Create new user
        user_id = str(uuid.uuid4())
        is_super_admin = email in settings.SUPER_ADMIN_EMAILS

        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "plan": "free",
            "is_super_admin": is_super_admin,
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user)

    # Generate JWT token for app authentication
    token = create_token(user_id)

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": user.get("plan", "free"),
            "is_super_admin": user.get("is_super_admin", False),
            "created_at": user.get("created_at", ""),
        },
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
        "created_at": user.get("created_at", ""),
    }
