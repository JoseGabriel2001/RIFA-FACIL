"""
Backend routes package.

This module exports all API routers for easy import in the main application.
"""

from .auth import router as auth_router
from .raffles import router as raffles_router
from .payments import router as payments_router
from .utils import router as utils_router
from .mercadopago_oauth import router as mp_oauth_router

__all__ = [
    "auth_router",
    "raffles_router",
    "payments_router",
    "utils_router",
    "mp_oauth_router",
]
