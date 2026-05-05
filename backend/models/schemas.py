"""
Pydantic models for RifaFacil API.

This module contains all request/response models used by the API endpoints.
Using Pydantic provides automatic validation, serialization, and OpenAPI
documentation generation.

Design Decisions:
- EmailStr is used instead of str for email fields to get automatic validation
- Optional fields use default values to make the API more forgiving
- Field descriptions are included for OpenAPI documentation
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class UserPlan(str, Enum):
    """
    Subscription plan levels.
    
    FREE: Limited to 2 active raffles, basic features
    PREMIUM: Unlimited raffles, priority support, advanced analytics
    """
    FREE = "free"
    PREMIUM = "premium"


class RaffleStatus(str, Enum):
    """
    Lifecycle status of a raffle.
    
    ACTIVE: Open for ticket purchases
    COMPLETED: Winner has been selected
    CANCELLED: Raffle was cancelled before completion
    """
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TicketStatus(str, Enum):
    """
    Status of an individual ticket.
    
    AVAILABLE: Can be purchased
    RESERVED: Held for cash payment (expires in 48h)
    SOLD: Purchase confirmed
    """
    AVAILABLE = "available"
    RESERVED = "reserved"
    SOLD = "sold"


class PaymentMethod(str, Enum):
    """
    Supported payment processors.
    
    MERCADOPAGO: Primary option for Mexico (cards, OXXO, SPEI)
    STRIPE: International card payments
    PAYPAL: PayPal checkout
    CASH: In-person payment with ticket reservation
    """
    MERCADOPAGO = "mercadopago"
    STRIPE = "stripe"
    PAYPAL = "paypal"
    CASH = "cash"


class CashOrderStatus(str, Enum):
    """
    Status of a cash payment order.
    
    PENDING: Awaiting admin approval
    APPROVED: Payment confirmed, tickets sold
    REJECTED: Payment rejected, tickets released
    EXPIRED: 48-hour window passed, tickets released
    """
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


# =============================================================================
# USER MODELS
# =============================================================================

class UserCreate(BaseModel):
    """
    Request model for user registration.
    
    Password requirements are enforced at the frontend level to allow
    for localized error messages.
    """
    email: EmailStr = Field(..., description="User's email address (must be unique)")
    password: str = Field(..., min_length=6, description="Password (min 6 characters)")
    name: str = Field(..., min_length=1, description="Display name")


class UserLogin(BaseModel):
    """Request model for email/password login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """
    User data returned in API responses.
    
    Note: Password hash is never included in responses.
    """
    id: str
    email: str
    name: str
    plan: str = Field(default="free")
    is_super_admin: bool = Field(default=False)
    created_at: str
    mp_connected: bool = Field(default=False, description="MercadoPago account connected status")  # NUEVO
    mp_user_id: Optional[int] = Field(None, description="MercadoPago user ID")  # NUEVO


# =============================================================================
# RAFFLE MODELS
# =============================================================================

class RaffleCreate(BaseModel):
    """
    Request model for creating a new raffle.
    
    The spins_before_winner field controls the "suspense factor" - more spins
    means more excitement during the live draw. Default is 3 which provides
    good balance between suspense and patience.
    """
    title: str = Field(..., min_length=1, max_length=200, description="Raffle title")
    description: str = Field(default="", max_length=2000, description="Detailed description")
    prize: str = Field(..., min_length=1, max_length=500, description="Prize description")
    prize_image: Optional[str] = Field(None, description="URL to prize image")
    ticket_price: float = Field(..., gt=0, description="Price per ticket in MXN")
    total_tickets: int = Field(..., ge=1, le=1000, description="Number of tickets (1-1000)")
    draw_date: str = Field(..., description="ISO date string for draw")
    excluded_numbers: Optional[List[int]] = Field(
        default=[],
        description="Ticket numbers to exclude (e.g., unlucky numbers)"
    )
    spins_before_winner: Optional[int] = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of wheel spins before revealing winner"
    )


class RaffleUpdate(BaseModel):
    """
    Request model for updating raffle details.
    
    All fields are optional - only provided fields will be updated.
    Some fields cannot be changed after tickets are sold (enforced in endpoint).
    """
    title: Optional[str] = None
    description: Optional[str] = None
    prize: Optional[str] = None
    prize_image: Optional[str] = None
    spins_before_winner: Optional[int] = Field(None, ge=1, le=10)
    ticket_price: Optional[float] = Field(None, gt=0)
    draw_date: Optional[str] = None
    status: Optional[str] = None


# =============================================================================
# TICKET & WINNER MODELS
# =============================================================================

class SetWinnerRequest(BaseModel):
    """
    Request to manually set the winning ticket number.
    
    This is used after the wheel animation completes to officially
    record the winner in the database.
    """
    winning_number: int = Field(..., gt=0, description="The winning ticket number")


class PreselctWinnerRequest(BaseModel):
    """
    Request to secretly preselect a winner.
    
    IMPORTANT: This is a controversial feature that allows raffle organizers
    to predetermine the winner. It's implemented because:
    1. Some raffles are promotional and the winner is predetermined
    2. The organizer takes full responsibility for fair practices
    
    The preselected number is NEVER exposed in public API responses.
    """
    winning_number: int = Field(..., gt=0, description="Ticket number to preselect as winner")


class AssignTicketsRequest(BaseModel):
    """
    Request to manually assign tickets to a buyer.
    
    Used when payment is received outside the platform (e.g., bank transfer,
    in-person cash) and the admin needs to mark tickets as sold.
    """
    ticket_numbers: List[int] = Field(..., min_length=1, description="Ticket numbers to assign")
    buyer_name: str = Field(..., min_length=1, description="Buyer's name")
    buyer_email: EmailStr = Field(..., description="Buyer's email for notifications")
    buyer_phone: Optional[str] = Field(None, description="Buyer's phone (optional)")


# =============================================================================
# PAYMENT MODELS
# =============================================================================

class TicketPurchase(BaseModel):
    """Generic ticket purchase request."""
    raffle_id: str
    ticket_numbers: List[int] = Field(..., min_length=1)
    payment_method: str
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None


class CheckoutRequest(BaseModel):
    """
    Request for creating a payment checkout session.
    
    The origin_url is critical - it's used to construct success/failure
    redirect URLs and webhook endpoints.
    """
    raffle_id: str = Field(..., description="Target raffle ID")
    ticket_numbers: List[int] = Field(..., min_length=1, description="Tickets to purchase")
    buyer_name: str = Field(..., min_length=1, description="Buyer's full name")
    buyer_email: EmailStr = Field(..., description="Buyer's email")
    buyer_phone: Optional[str] = Field(None, description="Buyer's phone")
    origin_url: str = Field(..., description="Frontend URL for redirects")
    payment_method_type: Optional[str] = Field(
        "all", 
        description="Payment method type: all, card, transfer, wallet, cash"
    )  # ← LÍNEAS AGREGADAS


class MercadoPagoCheckoutRequest(BaseModel):
    """
    Request specifically for MercadoPago preference creation.
    
    Identical to CheckoutRequest but kept separate for potential
    MercadoPago-specific fields in the future (e.g., installments).
    """
    raffle_id: str
    ticket_numbers: List[int] = Field(..., min_length=1)
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None
    origin_url: str
    payment_method_type: Optional[str] = Field(
        "all", 
        description="Payment method type: all, card, transfer, wallet, cash"
    )


class CashOrderRequest(BaseModel):
    """
    Request for creating a cash payment order.
    
    Cash orders reserve tickets for 48 hours while the buyer arranges
    payment. If not approved within that window, tickets are automatically
    released back to the pool.
    """
    raffle_id: str
    ticket_numbers: List[int] = Field(..., min_length=1)
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None


class ValidateOrderRequest(BaseModel):
    """
    Request to approve or reject a cash payment order.
    
    Only the raffle owner can validate orders for their raffles.
    """
    order_id: str = Field(..., description="Cash order ID to validate")
    action: str = Field(
        ...,
        pattern="^(approve|reject)$",
        description="Action: 'approve' or 'reject'"
    )


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class MessageResponse(BaseModel):
    """Simple response with just a message."""
    message: str


class RaffleCreateResponse(BaseModel):
    """Response after creating a raffle."""
    id: str = Field(..., description="New raffle's UUID")
    share_code: str = Field(..., description="8-character sharing code")
    message: str


class SpinResponse(BaseModel):
    """
    Response from the wheel spin endpoint.
    
    The spin system creates suspense by requiring multiple spins before
    revealing the winner. Each spin returns different information:
    - Non-final spins: display_number (random, not the winner)
    - Final spin: winning_number (the actual winner)
    """
    spin_number: int = Field(..., description="Current spin count")
    spins_required: int = Field(..., description="Total spins needed")
    is_final_spin: bool = Field(..., description="True if this reveals the winner")
    show_winner: bool = Field(..., description="True if winning_number is valid")
    winning_number: Optional[int] = Field(None, description="Winner (only on final spin)")
    display_number: Optional[int] = Field(None, description="Number to show (non-final spins)")
    message: str = Field(..., description="User-facing message")


class PaymentStatusResponse(BaseModel):
    """Response for payment status queries."""
    status: str
    message: str
    transaction_id: Optional[str] = None


class MercadoPagoPreferenceResponse(BaseModel):
    """Response after creating a MercadoPago checkout preference."""
    preference_id: str = Field(..., description="MercadoPago preference ID")
    init_point: str = Field(..., description="Production checkout URL")
    sandbox_init_point: str = Field(..., description="Sandbox checkout URL")
    transaction_id: str = Field(..., description="Internal transaction ID")


class CashOrderResponse(BaseModel):
    """Response after creating a cash payment order."""
    order_id: str
    status: str
    expires_at: str
    message: str

# MERCADOPAGO OAUTH MODELS

class MercadoPagoOAuthInitResponse(BaseModel):
    """Response when initiating OAuth flow."""
    authorization_url: str = Field(..., description="URL to redirect user for authorization")
    state: str = Field(..., description="State parameter for security validation")


class MercadoPagoOAuthStatusResponse(BaseModel):
    """Response for OAuth connection status."""
    connected: bool = Field(..., description="Whether user has connected their MP account")
    mp_user_id: Optional[int] = Field(None, description="MercadoPago user ID if connected")
    connected_at: Optional[str] = Field(None, description="ISO timestamp of connection")


# =============================================================================
# CARD PAYMENT (CHECKOUT API) MODELS
# =============================================================================

class CardPaymentRequest(BaseModel):
    """Request for processing card payment via Checkout API."""
    raffle_id: str = Field(..., description="Target raffle ID")
    ticket_numbers: List[int] = Field(..., min_length=1, description="Tickets to purchase")
    buyer_name: str = Field(..., min_length=1, description="Buyer's full name")
    buyer_email: EmailStr = Field(..., description="Buyer's email")
    buyer_phone: Optional[str] = Field(None, description="Buyer's phone")
    token: str = Field(..., description="Card token from MercadoPago Brick")
    payment_method_id: str = Field(..., description="Payment method ID (e.g., visa, master)")
    issuer_id: Optional[str] = Field(None, description="Issuer ID")
    installments: int = Field(1, ge=1, le=12, description="Number of installments")
    identification_type: Optional[str] = Field(None, description="ID type (e.g., RFC, CURP) - Optional")
    identification_number: Optional[str] = Field(None, description="ID number - Optional")


class CashPaymentRequest(BaseModel):
    """Request for generating cash payment ticket."""
    raffle_id: str = Field(..., description="Target raffle ID")
    ticket_numbers: List[int] = Field(..., min_length=1, description="Tickets to purchase")
    buyer_name: str = Field(..., min_length=1, description="Buyer's full name")
    buyer_email: EmailStr = Field(..., description="Buyer's email")
    buyer_phone: Optional[str] = Field(None, description="Buyer's phone")


class CashPaymentResponse(BaseModel):
    """Response after creating cash payment."""
    transaction_id: str = Field(..., description="Transaction ID")
    payment_id: str = Field(..., description="MercadoPago payment ID")
    ticket_url: Optional[str] = Field(None, description="URL to download ticket PDF")
    barcode: Optional[str] = Field(None, description="Barcode for payment")
    external_resource_url: Optional[str] = Field(None, description="External payment URL")
    expiration_date: str = Field(..., description="Payment expiration date")
    amount: float = Field(..., description="Total amount")
    message: str = Field(..., description="Instructions message")