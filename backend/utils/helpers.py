"""
Utility functions for RifaFacil backend.

This module contains helper functions used across multiple endpoints.
Centralizing these functions reduces code duplication and makes
testing easier.
"""

import random
import string
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# AUTHENTICATION UTILITIES
# =============================================================================

def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt with automatic salt generation.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string safe for database storage
        
    Note:
        bcrypt automatically handles salt generation and storage
        within the hash, so no separate salt column is needed.
    """
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against its bcrypt hash.
    
    Args:
        password: Plain text password to verify
        hashed: Previously hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed.encode('utf-8')
        )
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_jwt_token(
    user_id: str,
    secret: str,
    algorithm: str = 'HS256',
    expiration_hours: int = 24
) -> str:
    """
    Create a JWT token for user authentication.
    
    Args:
        user_id: Unique identifier for the user
        secret: Secret key for signing the token
        algorithm: JWT signing algorithm (default: HS256)
        expiration_hours: Hours until token expires
        
    Returns:
        Encoded JWT token string
        
    Security Note:
        The token contains the user_id which is used to lookup the user
        on each authenticated request. The expiration ensures tokens
        don't live forever if compromised.
    """
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=expiration_hours),
        'iat': datetime.now(timezone.utc)  # Issued at
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_jwt_token(
    token: str,
    secret: str,
    algorithm: str = 'HS256'
) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string to decode
        secret: Secret key used for signing
        algorithm: JWT signing algorithm
        
    Returns:
        Decoded payload dict if valid, None if invalid/expired
    """
    try:
        return jwt.decode(token, secret, algorithms=[algorithm])
    except jwt.ExpiredSignatureError:
        logger.warning("JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid JWT token: {e}")
        return None


# =============================================================================
# STRING UTILITIES
# =============================================================================

def generate_share_code(length: int = 8) -> str:
    """
    Generate a random alphanumeric code for raffle sharing.
    
    Args:
        length: Number of characters (default: 8)
        
    Returns:
        Random uppercase alphanumeric string
        
    Design Decision:
        Using uppercase letters only makes codes easier to share verbally
        and avoids confusion between similar characters (0/O, 1/l/I).
        8 characters provides 36^8 = 2.8 trillion combinations.
    """
    # Exclude confusing characters: 0, O, I, 1
    safe_chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(safe_chars, k=length))


def format_ticket_list(ticket_numbers: list[int]) -> str:
    """
    Format a list of ticket numbers for display.
    
    Args:
        ticket_numbers: List of ticket numbers
        
    Returns:
        Formatted string like "#1, #5, #12"
        
    Example:
        >>> format_ticket_list([1, 5, 12])
        '#1, #5, #12'
    """
    sorted_numbers = sorted(ticket_numbers)
    return ', '.join([f"#{n}" for n in sorted_numbers])


# =============================================================================
# DATE/TIME UTILITIES
# =============================================================================

def get_utc_now() -> datetime:
    """
    Get current UTC datetime with timezone info.
    
    Returns:
        Timezone-aware datetime object
        
    Note:
        Always use this instead of datetime.utcnow() which returns
        a naive datetime without timezone info.
    """
    return datetime.now(timezone.utc)


def get_iso_timestamp() -> str:
    """
    Get current UTC time as ISO format string.
    
    Returns:
        ISO 8601 formatted timestamp string
        
    Example:
        '2025-12-20T15:30:45.123456+00:00'
    """
    return get_utc_now().isoformat()


def add_hours(hours: int) -> datetime:
    """
    Get a datetime that is N hours from now.
    
    Args:
        hours: Number of hours to add
        
    Returns:
        Future datetime with timezone info
    """
    return get_utc_now() + timedelta(hours=hours)


def is_expired(expiry_iso: str) -> bool:
    """
    Check if an ISO timestamp has passed.
    
    Args:
        expiry_iso: ISO format expiration timestamp
        
    Returns:
        True if the timestamp is in the past
    """
    try:
        expiry = datetime.fromisoformat(expiry_iso.replace('Z', '+00:00'))
        return get_utc_now() > expiry
    except ValueError:
        logger.error(f"Invalid ISO timestamp: {expiry_iso}")
        return True  # Treat invalid dates as expired for safety


# =============================================================================
# VALIDATION UTILITIES
# =============================================================================

def validate_ticket_numbers(
    ticket_numbers: list[int],
    max_ticket: int,
    excluded: list[int] = None
) -> tuple[bool, str]:
    """
    Validate a list of ticket numbers.
    
    Args:
        ticket_numbers: List of ticket numbers to validate
        max_ticket: Maximum valid ticket number
        excluded: List of excluded/unavailable numbers
        
    Returns:
        Tuple of (is_valid, error_message)
        
    Example:
        >>> validate_ticket_numbers([1, 5, 100], max_ticket=50)
        (False, 'Ticket #100 is not valid')
    """
    excluded = excluded or []
    
    for num in ticket_numbers:
        if num < 1:
            return False, f"Ticket #{num} is not valid (must be >= 1)"
        if num > max_ticket:
            return False, f"Ticket #{num} is not valid (max is #{max_ticket})"
        if num in excluded:
            return False, f"Ticket #{num} is excluded from this raffle"
    
    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to prevent path traversal attacks.
    
    Args:
        filename: Original filename
        
    Returns:
        Sanitized filename with only safe characters
    """
    # Keep only alphanumeric, dash, underscore, and dot
    safe_chars = set(string.ascii_letters + string.digits + '-_.')
    sanitized = ''.join(c for c in filename if c in safe_chars)
    
    # Ensure it doesn't start with a dot (hidden files)
    while sanitized.startswith('.'):
        sanitized = sanitized[1:]
    
    return sanitized or 'unnamed'


# =============================================================================
# MONGODB UTILITIES
# =============================================================================

def exclude_mongo_id(document: dict) -> dict:
    """
    Remove MongoDB's _id field from a document.
    
    Args:
        document: MongoDB document dict
        
    Returns:
        Document without _id field
        
    Why:
        MongoDB's ObjectId is not JSON serializable. We use our own
        UUID-based 'id' field, so we exclude _id from all responses.
    """
    if document and '_id' in document:
        del document['_id']
    return document


def prepare_for_response(document: dict) -> dict:
    """
    Prepare a MongoDB document for API response.
    
    This handles common transformations needed before returning data:
    - Removes _id field
    - Could be extended for date formatting, etc.
    
    Args:
        document: MongoDB document dict
        
    Returns:
        Response-ready dict
    """
    if not document:
        return {}
    
    # Create a copy to avoid modifying the original
    result = dict(document)
    
    # Remove MongoDB internal field
    result.pop('_id', None)
    
    return result
