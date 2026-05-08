"""
Application settings and configuration.

Centralizes all configuration values loaded from environment variables.
Using a Settings class makes testing easier (can mock settings).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")


class Settings:
    """
    Application settings loaded from environment variables.

    All settings have sensible defaults for development.
    In production, ensure all required variables are set.
    """

    # JWT Configuration
    JWT_SECRET: str = os.environ.get("JWT_SECRET", "rifafacil-secret-key-2024")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Stripe Configuration
    STRIPE_API_KEY: str = os.environ.get("STRIPE_API_KEY", "sk_test_emergent")

    # Resend (Email) Configuration
    RESEND_API_KEY: str = os.environ.get("RESEND_API_KEY", "")
    SENDER_EMAIL: str = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

    # PayPal Configuration      
    PAYPAL_CLIENT_ID: str = os.environ.get("PAYPAL_CLIENT_ID", "")
    PAYPAL_SECRET: str = os.environ.get("PAYPAL_SECRET", "")

    # MercadoPago Configuration
    MERCADOPAGO_ACCESS_TOKEN_PRO: str = os.environ.get(
        "MERCADOPAGO_ACCESS_TOKEN_PRO", ""
    )

    # File Upload Configuration
    UPLOADS_DIR: Path = ROOT_DIR / "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

    # Super Admin emails (bypasses plan restrictions)
    SUPER_ADMIN_EMAILS: set = {"mtortb@gmail.com"}

    NGROK_BACKEND_URL: str = os.environ.get(
        "NGROK_BACKEND_URL", ""
    )
    NGROK_FRONTEND_URL: str = os.environ.get(
        "NGROK_FRONTEND_URL", ""
    )

    BACKEND_URL: str = os.environ.get("BACKEND_URL", "")
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "")

    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", "development")

    # MercadoPago Marketplace OAuth Configuration
    MERCADOPAGO_CLIENT_ID: str = os.environ.get("MERCADOPAGO_CLIENT_ID", "")
    MERCADOPAGO_CLIENT_SECRET: str = os.environ.get("MERCADOPAGO_CLIENT_SECRET", "")
    MARKETPLACE_FEE_PERCENTAGE: float = float(
        os.environ.get("MARKETPLACE_FEE_PERCENTAGE", "10.0")
    )
    # MercadoPago Platform Account for receiving split payment commissions
    MERCADOPAGO_PLATFORM_ACCOUNT_ID: str = os.environ.get(
        "MERCADOPAGO_PLATFORM_ACCOUNT_ID", ""
    )


# Global settings instance
settings = Settings()

# Ensure uploads directory exists
settings.UPLOADS_DIR.mkdir(exist_ok=True)
