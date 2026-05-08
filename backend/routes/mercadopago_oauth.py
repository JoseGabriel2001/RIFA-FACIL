"""
MercadoPago OAuth Routes.

Handles OAuth 2.0 authorization flow for marketplace integration.
Vendors can connect their MercadoPago accounts to receive payments directly
while the platform automatically collects commission fees.

Endpoints:
    POST /api/mercadopago/oauth/connect - Initiate OAuth flow
    GET /api/mercadopago/oauth/callback - Handle OAuth callback
    GET /api/mercadopago/oauth/status - Get connection status
    DELETE /api/mercadopago/oauth/disconnect - Disconnect account
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timedelta, timezone
import uuid
import logging
from config.settings import settings

from config import db
from dependencies import get_current_user
from services.mercadopago_oauth_service import oauth_service
from models.schemas import (
    MercadoPagoOAuthInitResponse,
    MercadoPagoOAuthStatusResponse,
    MessageResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mercadopago/oauth", tags=["MercadoPago OAuth"])


@router.post("/connect", response_model=MercadoPagoOAuthInitResponse)
async def initiate_oauth_flow(current_user: dict = Depends(get_current_user)):
    """
    Initiate OAuth authorization flow.

    Generates an authorization URL with PKCE and redirects the user to MercadoPago
    to authorize access to their account.

    Returns:
        Authorization URL and state parameter
    """
    try:
        # Generate unique state for CSRF protection
        state = str(uuid.uuid4())

        # Generate PKCE pair and get authorization URL
        auth_url, code_verifier = oauth_service.get_authorization_url(state)

        # Store state and code_verifier temporarily with user ID for validation in callback
        await db.oauth_states.insert_one(
            {
                "state": state,
                "user_id": current_user["id"],
                "code_verifier": code_verifier,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (
                    datetime.now(timezone.utc) + timedelta(minutes=10)
                ).isoformat(),
            }
        )

        logger.info(f"User {current_user['id']} initiated OAuth flow with PKCE")

        return MercadoPagoOAuthInitResponse(authorization_url=auth_url, state=state)

    except Exception as e:
        logger.error(f"Failed to initiate OAuth flow: {str(e)}")
        raise HTTPException(
            status_code=500, detail="No se pudo iniciar el proceso de autorización"
        )


@router.get("/callback")
async def oauth_callback(
    code: str = Query(..., description="Authorization code from MercadoPago"),
    state: str = Query(..., description="State parameter for validation"),
    request: Request = None,
):
    """
    Handle OAuth callback from MercadoPago.

    Receives the authorization code, validates the state, exchanges the code
    for access tokens using PKCE, and stores the credentials for the user.

    Args:
        code: Authorization code to exchange for tokens
        state: State parameter for CSRF validation

    Returns:
        Redirect to frontend with success/error status
    """

    try:
        # Validate state and get associated user with code_verifier
        state_doc = await db.oauth_states.find_one({"state": state}, {"_id": 0})

        if not state_doc:
            logger.error(f"Invalid state parameter: {state}")
            return RedirectResponse(
                url=f"{request.headers.get('origin', settings.FRONTEND_URL)}/oauth-error?error=invalid_state"
            )

        user_id = state_doc["user_id"]
        code_verifier = state_doc.get("code_verifier")

        if not code_verifier:
            logger.error(f"Missing code_verifier for state: {state}")
            return RedirectResponse(
                url=f"{request.headers.get('origin', settings.FRONTEND_URL)}/oauth-error?error=missing_verifier"
            )

        # Exchange code for tokens with PKCE
        token_response = await oauth_service.exchange_code_for_token(
            code, code_verifier
        )

        logger.debug(f"OAuth token response keys: {list(token_response.keys())}")
        logger.debug(f"Full token response: {token_response}")

        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")
        public_key = token_response.get("public_key")
        mp_user_id = token_response.get("user_id")
        expires_in = token_response.get("expires_in", 21600)  # Default 6 hours

        logger.warning(f"Public key from OAuth response: {public_key}")

        # If public_key not in token response, fetch it via the API
        if not public_key and access_token:
            logger.info("Fetching public_key from MercadoPago API...")
            public_key = await oauth_service.get_public_key(access_token)
            if public_key:
                logger.info(f"Successfully obtained public_key: {public_key[:20]}...")
            else:
                logger.warning("Could not obtain public_key from any source")

        if not access_token or not refresh_token:
            raise ValueError("Missing required tokens in response")

        # Calculate expiration datetime
        expires_at = oauth_service.calculate_token_expiry(expires_in)

        # Store or update OAuth credentials
        oauth_credentials = {
            "user_id": user_id,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "public_key": public_key,
            "mp_user_id": mp_user_id,
            "expires_at": expires_at.isoformat(),
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Upsert credentials
        await db.mp_oauth_credentials.update_one(
            {"user_id": user_id}, {"$set": oauth_credentials}, upsert=True
        )

        # Update user document
        await db.users.update_one(
            {"id": user_id}, {"$set": {"mp_connected": True, "mp_user_id": mp_user_id}}
        )

        # Clean up state
        await db.oauth_states.delete_one({"state": state})

        logger.info(f"OAuth successful for user {user_id}, MP user {mp_user_id}")

        # Redirect to frontend success page
        frontend_url = request.headers.get("origin", settings.FRONTEND_URL)
        return RedirectResponse(url=f"{frontend_url}/oauth-success")

    except ValueError as e:
        logger.error(f"OAuth callback validation error: {str(e)}")
        return RedirectResponse(
            url=f"{request.headers.get('origin', settings.FRONTEND_URL)}/oauth-error?error=validation_failed"
        )
    except Exception as e:
        logger.error(f"OAuth callback error: {str(e)}")
        return RedirectResponse(
            url=f"{request.headers.get('origin', settings.FRONTEND_URL)}/oauth-error?error=unexpected_error"
        )


@router.get("/status", response_model=MercadoPagoOAuthStatusResponse)
async def get_oauth_status(current_user: dict = Depends(get_current_user)):
    """
    Get user's MercadoPago OAuth connection status.

    Returns:
        Connection status and details
    """
    try:
        credentials = await db.mp_oauth_credentials.find_one(
            {"user_id": current_user["id"]},
            {"_id": 0, "access_token": 0, "refresh_token": 0},
        )

        if credentials:
            return MercadoPagoOAuthStatusResponse(
                connected=True,
                mp_user_id=credentials.get("mp_user_id"),
                connected_at=credentials.get("connected_at"),
            )
        else:
            return MercadoPagoOAuthStatusResponse(
                connected=False, mp_user_id=None, connected_at=None
            )

    except Exception as e:
        logger.error(f"Failed to get OAuth status: {str(e)}")
        raise HTTPException(
            status_code=500, detail="No se pudo obtener el estado de conexión"
        )


@router.delete("/disconnect", response_model=MessageResponse)
async def disconnect_oauth(current_user: dict = Depends(get_current_user)):
    """
    Disconnect user's MercadoPago account.

    Removes stored OAuth credentials and updates user status.
    Note: This does not revoke the token on MercadoPago's side.
    """
    try:
        # Delete OAuth credentials
        result = await db.mp_oauth_credentials.delete_one(
            {"user_id": current_user["id"]}
        )

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404, detail="No hay cuenta de MercadoPago conectada"
            )

        # Update user document
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"mp_connected": False, "mp_user_id": None}},
        )

        logger.info(f"User {current_user['id']} disconnected MercadoPago account")

        return MessageResponse(
            message="Cuenta de MercadoPago desconectada exitosamente"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to disconnect OAuth: {str(e)}")
        raise HTTPException(status_code=500, detail="No se pudo desconectar la cuenta")
