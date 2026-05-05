"""
MercadoPago OAuth Service.

Handles OAuth 2.0 authorization flow for connecting vendor accounts
to enable marketplace split payments with automatic commission distribution.
"""

import httpx
import logging
import base64
import hashlib
import secrets
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from config.settings import settings

logger = logging.getLogger(__name__)


class MercadoPagoOAuthService:
    """
    Service for managing MercadoPago OAuth flow.

    This service handles:
    - Generating authorization URLs for vendors
    - Exchanging authorization codes for access tokens
    - Refreshing expired access tokens
    - Managing token lifecycle
    """

    def __init__(self):
        self.base_url = "https://api.mercadopago.com"
        self.auth_url = "https://auth.mercadopago.com/authorization"
        self.token_url = f"{self.base_url}/oauth/token"
        self.client_id = settings.MERCADOPAGO_CLIENT_ID
        self.client_secret = settings.MERCADOPAGO_CLIENT_SECRET
        self.redirect_uri = (
            settings.NGROK_BACKEND_URL + "/api/mercadopago/oauth/callback"
            if settings.ENVIRONMENT == "development"
            else settings.BACKEND_URL + "/api/mercadopago/oauth/callback"
        )

    def _generate_pkce_pair(self) -> Tuple[str, str]:
        """
        Generate PKCE code_verifier and code_challenge.

        Returns:
            Tuple of (code_verifier, code_challenge)
        """
        # Generate a random code_verifier (128 characters, unreserved characters only)
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(96)).decode(
            "utf-8"
        )
        code_verifier = code_verifier.rstrip("=")  # Remove padding

        # Create code_challenge from verifier using SHA256
        code_sha = hashlib.sha256(code_verifier.encode("utf-8")).digest()
        code_challenge = base64.urlsafe_b64encode(code_sha).decode("utf-8")
        code_challenge = code_challenge.rstrip("=")  # Remove padding

        return code_verifier, code_challenge

    def get_authorization_url(self, state: str) -> Tuple[str, str]:
        """
        Generate the OAuth authorization URL for vendor authorization with PKCE.

        Args:
            state: Random state string for CSRF protection

        Returns:
            Tuple of (authorization_url, code_verifier)
        """
        # Generate PKCE pair
        code_verifier, code_challenge = self._generate_pkce_pair()

        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "platform_id": "mp",
            "state": state,
            "redirect_uri": self.redirect_uri,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }

        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        auth_url = f"{self.auth_url}?{query_string}"

        logger.info(
            f"Generated OAuth authorization URL with state: {state} and PKCE challenge, url length: {auth_url}"
        )
        return auth_url, code_verifier

    async def exchange_code_for_token(self, code: str, code_verifier: str) -> Dict:
        """
        Exchange authorization code for access token and refresh token.

        Args:
            code: Authorization code received from OAuth callback
            code_verifier: PKCE code verifier for token exchange

        Returns:
            Dict containing:
                - access_token: Token for API authentication
                - refresh_token: Token for refreshing access token
                - public_key: Public key for frontend operations
                - user_id: MercadoPago user ID
                - expires_in: Token expiration time in seconds

        Raises:
            httpx.HTTPError: If token exchange fails
        """
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.redirect_uri,
            "code_verifier": code_verifier,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=payload,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    timeout=30.0,
                )

                response.raise_for_status()
                token_data = response.json()

                logger.info(
                    f"Successfully exchanged code for token. User ID: {token_data.get('user_id')}"
                )
                return token_data

        except httpx.HTTPStatusError as e:
            logger.error(
                f"OAuth token exchange failed with status {e.response.status_code}: {e.response.text}"
            )
            raise
        except httpx.HTTPError as e:
            logger.error(f"OAuth token exchange request failed: {str(e)}")
            raise

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresh an expired access token using the refresh token.

        Args:
            refresh_token: Refresh token from previous authorization

        Returns:
            Dict containing new access token and expiration info

        Raises:
            httpx.HTTPError: If token refresh fails
        """
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=payload,
                    headers={
                        "Accept": "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    timeout=30.0,
                )

                response.raise_for_status()
                token_data = response.json()

                logger.info("Successfully refreshed access token")
                return token_data

        except httpx.HTTPStatusError as e:
            logger.error(
                f"Token refresh failed with status {e.response.status_code}: {e.response.text}"
            )
            raise
        except httpx.HTTPError as e:
            logger.error(f"Token refresh request failed: {str(e)}")
            raise

    async def get_vendor_info(self, access_token: str) -> Optional[Dict]:
        """
        Get vendor information using their access token.

        Args:
            access_token: Vendor's MercadoPago access token

        Returns:
            Dict with vendor info or None if request fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/users/me",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                    timeout=30.0,
                )

                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as e:
            logger.error(f"Failed to get vendor info: {str(e)}")
            return None

    async def get_public_key(self, access_token: str) -> Optional[str]:
        """
        Get the public key for a MercadoPago vendor account.
        
        Attempts multiple methods to obtain the public key:
        1. Fetch from /users/me and look for public_key field
        2. Query /merchant_accounts for credentials
        3. Construct from user_id as fallback
        
        Args:
            access_token: Vendor's MercadoPago access token
            
        Returns:
            Public key string (format: APP_USR-xxx) or None if not found
        """
        try:
            async with httpx.AsyncClient() as client:
                # Method 1: Get from /users/me
                users_response = await client.get(
                    f"{self.base_url}/users/me",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                    },
                    timeout=30.0,
                )
                
                users_response.raise_for_status()
                user_data = users_response.json()
                
                # Check if public_key is in user data
                if "public_key" in user_data and user_data["public_key"]:
                    logger.info(f"Found public_key in /users/me response")
                    return user_data["public_key"]
                
                user_id = user_data.get("id")
                
                # Method 2: Query merchant_accounts endpoint
                try:
                    merchant_response = await client.get(
                        f"{self.base_url}/merchant_accounts/{user_id}",
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Accept": "application/json",
                        },
                        timeout=30.0,
                    )
                    
                    if merchant_response.status_code == 200:
                        merchant_data = merchant_response.json()
                        if "public_key" in merchant_data:
                            logger.info(f"Found public_key in /merchant_accounts response")
                            return merchant_data["public_key"]
                except Exception as e:
                    logger.debug(f"merchant_accounts endpoint failed: {e}")
                
                # Method 3: Construct public_key from user_id
                # MercadoPago public keys have format: APP_USR-{user_id}
                if user_id:
                    constructed_key = f"APP_USR-{user_id}"
                    logger.warning(f"Constructed public_key from user_id: {constructed_key}")
                    return constructed_key
                
                logger.error(f"Could not determine public_key from any source")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get public_key: {str(e)}")
            return None

    def calculate_token_expiry(self, expires_in: int) -> datetime:
        """
        Calculate token expiration datetime.

        Args:
            expires_in: Seconds until token expires

        Returns:
            Datetime when token will expire
        """
        return datetime.utcnow() + timedelta(seconds=expires_in)

    def is_token_expired(self, expires_at: datetime) -> bool:
        """
        Check if a token has expired or will expire soon.

        Args:
            expires_at: Token expiration datetime

        Returns:
            True if token is expired or will expire in next 5 minutes
        """
        # Add 5 minute buffer to refresh before actual expiration
        buffer = timedelta(minutes=5)
        return datetime.utcnow() >= (expires_at - buffer)


# Global service instance
oauth_service = MercadoPagoOAuthService()
