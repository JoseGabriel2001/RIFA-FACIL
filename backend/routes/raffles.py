"""
Raffle management routes.

Handles CRUD operations for raffles, ticket management, and winner selection.

Endpoints:
    POST /raffles - Create new raffle
    GET /raffles - List user's raffles
    GET /raffles/{id} - Get raffle by ID
    PUT /raffles/{id} - Update raffle
    DELETE /raffles/{id} - Delete raffle
    POST /raffles/{id}/preselect-winner - Secret winner preselection
    POST /raffles/{id}/spin - Perform wheel spin
    POST /raffles/{id}/set-winner - Set winning number
    POST /raffles/{id}/reset-spins - Reset spin counter
    POST /raffles/{id}/assign-tickets - Manually assign tickets
    GET /raffles/{id}/cash-orders - Get pending cash orders
    POST /raffles/{id}/validate-order - Approve/reject cash order
    GET /public/raffle/{share_code} - Public raffle view
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import random
import string
import logging

from config import db
from config.settings import settings
from dependencies import get_current_user
from services.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Raffles"])

# Initialize email service
email_service = EmailService(settings.RESEND_API_KEY, settings.SENDER_EMAIL)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================


class RaffleCreate(BaseModel):
    """Data for creating a new raffle."""

    title: str
    description: str
    prize: str
    prize_image: Optional[str] = None
    ticket_price: float
    total_tickets: int
    draw_date: str
    excluded_numbers: Optional[List[int]] = []
    spins_before_winner: Optional[int] = 3


class RaffleUpdate(BaseModel):
    """Data for updating a raffle."""

    title: Optional[str] = None
    description: Optional[str] = None
    prize: Optional[str] = None
    prize_image: Optional[str] = None
    spins_before_winner: Optional[int] = None
    ticket_price: Optional[float] = None
    draw_date: Optional[str] = None
    status: Optional[str] = None


class SetWinnerRequest(BaseModel):
    """Request to set the winning ticket."""

    winning_number: int


class PreselctWinnerRequest(BaseModel):
    """Request to secretly preselect a winner."""

    winning_number: int


class AssignTicketsRequest(BaseModel):
    """Request to manually assign tickets."""

    ticket_numbers: List[int]
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None


class ValidateOrderRequest(BaseModel):
    """Request to approve or reject a cash order."""

    order_id: str
    action: str  # 'approve' or 'reject'


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def generate_share_code() -> str:
    """Generate an 8-character alphanumeric share code."""
    safe_chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(safe_chars, k=8))


def create_tickets(total: int, excluded: List[int]) -> List[dict]:
    """
    Create ticket objects for a raffle.

    Args:
        total: Total number of tickets
        excluded: Ticket numbers to exclude

    Returns:
        List of ticket dictionaries
    """
    tickets = []
    for i in range(1, total + 1):
        if i not in excluded:
            tickets.append(
                {
                    "number": i,
                    "status": "available",
                    "buyer_name": None,
                    "buyer_email": None,
                    "buyer_phone": None,
                    "purchased_at": None,
                }
            )
    return tickets


# =============================================================================
# RAFFLE CRUD ENDPOINTS
# =============================================================================


@router.post("/raffles", response_model=dict)
async def create_raffle(
    raffle_data: RaffleCreate, user: dict = Depends(get_current_user)
):
    """
    Create a new raffle.

    Free plan users are limited to 2 active raffles.
    Super admins have no limits.

    Args:
        raffle_data: Raffle configuration
        user: Current authenticated user

    Returns:
        Created raffle ID and share code

    Raises:
        HTTPException 403: If free plan limit reached
    """
    # Check plan limits (unless super admin)
    is_super_admin = user.get("is_super_admin", False)

    if not is_super_admin:
        active_count = await db.raffles.count_documents(
            {"owner_id": user["id"], "status": {"$ne": "completed"}}
        )

        if user.get("plan", "free") == "free" and active_count >= 2:
            raise HTTPException(
                status_code=403,
                detail="Plan gratuito limitado a 2 rifas activas. Actualiza a Premium.",
            )
    mp_connections = db.mp_oauth_credentials.find({"user_id": user["id"]}, {"_id": 0})
    connections = await mp_connections.to_list(length=100)
    visible = "public" if len(connections) > 0 else "private"

    # Create raffle document
    raffle_id = str(uuid.uuid4())
    share_code = generate_share_code()

    raffle_doc = {
        "id": raffle_id,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "title": raffle_data.title,
        "description": raffle_data.description,
        "prize": raffle_data.prize,
        "prize_image": raffle_data.prize_image,
        "ticket_price": raffle_data.ticket_price,
        "total_tickets": raffle_data.total_tickets,
        "excluded_numbers": raffle_data.excluded_numbers or [],
        "tickets": create_tickets(
            raffle_data.total_tickets, raffle_data.excluded_numbers or []
        ),
        "visible": visible,
        "draw_date": raffle_data.draw_date,
        "status": "active",
        "share_code": share_code,
        "winning_number": None,
        "winner_id": None,
        "preselected_winner": None,
        "spins_before_winner": raffle_data.spins_before_winner or 3,
        "current_spin_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.raffles.insert_one(raffle_doc)

    logger.info(f"Raffle created: {raffle_id} by user {user['id']}")

    return {
        "id": raffle_id,
        "share_code": share_code,
        "message": "Rifa creada exitosamente",
    }


@router.get("/check_mp_connection", response_model=dict)
async def check_mp_connection(user: dict = Depends(get_current_user)):
   """ Check MercadoPago connection status.
   """
   mp_connections = db.mp_oauth_credentials.find({"user_id": user["id"]}, {"_id": 0})

   connections = await mp_connections.to_list(length=100)

   if len(connections) == 0:
       return {"connected": False, "message": "No hay conexión con MercadoPago", "conections": connections}
   else:
       return {"connected": True, "message": "Conexión con MercadoPago establecida", "conections": connections}


@router.get("/raffles", response_model=List[dict])
async def list_raffles(user: dict = Depends(get_current_user)):
    """
    List all raffles owned by the current user.

    Returns raffles sorted by creation date (newest first).
    Excludes the full ticket array for performance.
    """
    cursor = db.raffles.find(
        {"owner_id": user["id"]}, {"_id": 0, "preselected_winner": 0}
    ).sort("created_at", -1)

    raffles = await cursor.to_list(length=100)

    # Add ticket statistics
    for raffle in raffles:
        tickets = raffle.get("tickets", [])
        raffle["sold_count"] = len([t for t in tickets if t["status"] == "sold"])
        raffle["reserved_count"] = len(
            [t for t in tickets if t["status"] == "reserved"]
        )
        raffle["available_count"] = len(
            [t for t in tickets if t["status"] == "available"]
        )

    return raffles


@router.get("/raffles/{raffle_id}", response_model=dict)
async def get_raffle(raffle_id: str, user: dict = Depends(get_current_user)):
    """
    Get detailed raffle information.

    Only the raffle owner can view full details including preselected winner.
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    # Only owner can see full details
    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    return raffle


@router.put("/raffles/{raffle_id}", response_model=dict)
async def update_raffle(
    raffle_id: str, update_data: RaffleUpdate, user: dict = Depends(get_current_user)
):
    """
    Update raffle details.

    Only the owner can update. Some fields may not be editable
    after tickets are sold (enforced by frontend).
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Build update document
    update_doc = {}
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None:
            update_doc[field] = value

    if update_doc:
        await db.raffles.update_one({"id": raffle_id}, {"$set": update_doc})

    return {"message": "Rifa actualizada"}


@router.delete("/raffles/{raffle_id}", response_model=dict)
async def delete_raffle(raffle_id: str, user: dict = Depends(get_current_user)):
    """
    Delete a raffle.

    Only the owner can delete. Completed raffles with winners
    should not be deleted (enforced by frontend).
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    await db.raffles.delete_one({"id": raffle_id})

    # Also delete related cash orders
    await db.cash_orders.delete_many({"raffle_id": raffle_id})

    return {"message": "Rifa eliminada"}


# =============================================================================
# WINNER SELECTION ENDPOINTS
# =============================================================================


@router.post("/raffles/{raffle_id}/preselect-winner", response_model=dict)
async def preselect_winner(
    raffle_id: str,
    request: PreselctWinnerRequest,
    user: dict = Depends(get_current_user),
):
    """
    Secretly preselect a winning ticket number.

    This sets the ticket that the wheel will "land on" during the final spin.
    The preselection is never exposed in public API responses.

    IMPORTANT: This feature is for promotional raffles where the winner
    is predetermined. The organizer takes full responsibility.
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Validate ticket number
    ticket = next(
        (t for t in raffle["tickets"] if t["number"] == request.winning_number), None
    )

    if not ticket:
        raise HTTPException(status_code=400, detail="Número de boleto no válido")

    if ticket["status"] != "sold":
        raise HTTPException(
            status_code=400, detail="Solo puedes preseleccionar un boleto vendido"
        )

    # Save preselection
    await db.raffles.update_one(
        {"id": raffle_id}, {"$set": {"preselected_winner": request.winning_number}}
    )

    logger.info(f"Winner preselected for raffle {raffle_id}: #{request.winning_number}")

    return {"message": "Ganador preseleccionado secretamente"}


@router.post("/raffles/{raffle_id}/spin", response_model=dict)
async def spin_wheel(raffle_id: str, user: dict = Depends(get_current_user)):
    """
    Perform a wheel spin.

    The spin system creates suspense by requiring multiple spins before
    revealing the winner. Each spin increments the counter.

    Non-final spins return a random "display" number.
    The final spin returns the actual winner (preselected or random).

    Returns:
        spin_number: Current spin count
        spins_required: Total spins needed
        is_final_spin: Whether this reveals the winner
        show_winner: Whether to display the winner
        winning_number: The winner (only on final spin)
        display_number: Number to show (non-final spins)
        message: User-facing message
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    if raffle["status"] != "active":
        raise HTTPException(status_code=400, detail="La rifa no está activa")

    # Get sold tickets
    sold_tickets = [t for t in raffle["tickets"] if t["status"] == "sold"]

    if len(sold_tickets) == 0:
        raise HTTPException(
            status_code=400, detail="No hay boletos vendidos para sortear"
        )

    # Increment spin count
    current_spin = raffle.get("current_spin_count", 0) + 1
    spins_required = raffle.get("spins_before_winner", 3)
    is_final_spin = current_spin >= spins_required

    # Update spin counter
    await db.raffles.update_one(
        {"id": raffle_id}, {"$set": {"current_spin_count": current_spin}}
    )

    if is_final_spin:
        # Determine winning number
        if raffle.get("preselected_winner"):
            winning_number = raffle["preselected_winner"]
        else:
            winning_ticket = random.choice(sold_tickets)
            winning_number = winning_ticket["number"]

        # Mark winner
        for ticket in raffle["tickets"]:
            if ticket["number"] == winning_number:
                ticket["isWinner"] = True
                break

        # Update raffle as completed
        await db.raffles.update_one(
            {"id": raffle_id},
            {
                "$set": {
                    "status": "completed",
                    "winning_number": winning_number,
                    "tickets": raffle["tickets"],
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        # Send winner notification
        winner_ticket = next(
            (t for t in raffle["tickets"] if t["number"] == winning_number), None
        )

        if winner_ticket and winner_ticket.get("buyer_email"):
            await email_service.send_winner_notification(
                to_email=winner_ticket["buyer_email"],
                winner_name=winner_ticket.get("buyer_name", "Ganador"),
                raffle_title=raffle["title"],
                prize=raffle["prize"],
                winning_number=winning_number,
            )

        return {
            "spin_number": current_spin,
            "spins_required": spins_required,
            "is_final_spin": True,
            "show_winner": True,
            "winning_number": winning_number,
            "display_number": winning_number,
            "message": f"¡El ganador es el boleto #{winning_number}!",
        }
    else:
        # Non-final spin - return random display number
        display_number = random.choice(sold_tickets)["number"]

        return {
            "spin_number": current_spin,
            "spins_required": spins_required,
            "is_final_spin": False,
            "show_winner": False,
            "winning_number": None,
            "display_number": display_number,
            "message": f"¡Giro {current_spin} de {spins_required}! ¡Sigue girando!",
        }


@router.post("/raffles/{raffle_id}/reset-spins", response_model=dict)
async def reset_spins(raffle_id: str, user: dict = Depends(get_current_user)):
    """Reset the spin counter to zero."""
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    await db.raffles.update_one({"id": raffle_id}, {"$set": {"current_spin_count": 0}})

    return {"message": "Contador de giros reiniciado"}


@router.post("/raffles/{raffle_id}/set-winner", response_model=dict)
async def set_winner(
    raffle_id: str, request: SetWinnerRequest, user: dict = Depends(get_current_user)
):
    """
    Manually set the winning ticket number.

    Used as an alternative to the spin system.
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    # Validate ticket
    ticket = next(
        (t for t in raffle["tickets"] if t["number"] == request.winning_number), None
    )

    if not ticket or ticket["status"] != "sold":
        raise HTTPException(
            status_code=400, detail="Número de boleto no válido o no vendido"
        )

    # Mark winner
    for t in raffle["tickets"]:
        t["isWinner"] = t["number"] == request.winning_number

    # Update raffle
    await db.raffles.update_one(
        {"id": raffle_id},
        {
            "$set": {
                "status": "completed",
                "winning_number": request.winning_number,
                "tickets": raffle["tickets"],
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    # Send winner notification
    if ticket.get("buyer_email"):
        await email_service.send_winner_notification(
            to_email=ticket["buyer_email"],
            winner_name=ticket.get("buyer_name", "Ganador"),
            raffle_title=raffle["title"],
            prize=raffle["prize"],
            winning_number=request.winning_number,
        )

    return {"message": f"Ganador establecido: boleto #{request.winning_number}"}


# =============================================================================
# TICKET MANAGEMENT ENDPOINTS
# =============================================================================


@router.post("/raffles/{raffle_id}/assign-tickets", response_model=dict)
async def assign_tickets(
    raffle_id: str,
    request: AssignTicketsRequest,
    user: dict = Depends(get_current_user),
):
    """
    Manually assign tickets to a buyer.

    Used for offline payments or promotional giveaways.
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    if raffle["status"] != "active":
        raise HTTPException(status_code=400, detail="La rifa no está activa")

    # Validate all tickets are available
    for num in request.ticket_numbers:
        ticket = next((t for t in raffle["tickets"] if t["number"] == num), None)
        if not ticket:
            raise HTTPException(status_code=400, detail=f"Boleto #{num} no existe")
        if ticket["status"] != "available":
            raise HTTPException(
                status_code=400, detail=f"Boleto #{num} no está disponible"
            )

    # Assign tickets
    for ticket in raffle["tickets"]:
        if ticket["number"] in request.ticket_numbers:
            ticket["status"] = "sold"
            ticket["buyer_name"] = request.buyer_name
            ticket["buyer_email"] = request.buyer_email
            ticket["buyer_phone"] = request.buyer_phone
            ticket["purchased_at"] = datetime.now(timezone.utc).isoformat()
            ticket["assigned_by_admin"] = True

    await db.raffles.update_one(
        {"id": raffle_id}, {"$set": {"tickets": raffle["tickets"]}}
    )

    # Send confirmation email
    await email_service.send_purchase_confirmation(
        to_email=request.buyer_email,
        buyer_name=request.buyer_name,
        raffle_title=raffle["title"],
        ticket_numbers=request.ticket_numbers,
        total_amount=raffle["ticket_price"] * len(request.ticket_numbers),
        draw_date=raffle["draw_date"],
        payment_method="asignación manual",
    )

    return {
        "message": f"Boletos asignados: {', '.join([f'#{n}' for n in request.ticket_numbers])}"
    }


# =============================================================================
# CASH ORDER MANAGEMENT
# =============================================================================


@router.get("/raffles/{raffle_id}/cash-orders", response_model=List[dict])
async def get_cash_orders(raffle_id: str, user: dict = Depends(get_current_user)):
    """Get all cash orders for a raffle."""
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    cash_payments = []
    transactions = db.payment_transactions
    async for payment in transactions.find({"raffle_id": raffle_id}):
        if payment["payment_method"] == "cash":
            payment["_id"] = str(payment["_id"])  # Convert ObjectId to string
            cash_payments.append(payment)
    logger.info(f"Cash payments found: {cash_payments} ")

    # orders = await cursor.to_list(length=100)
    return cash_payments


@router.post("/raffles/{raffle_id}/validate-order", response_model=dict)
async def validate_order(
    raffle_id: str,
    request: ValidateOrderRequest,
    user: dict = Depends(get_current_user),
):
    """
    Approve or reject a cash payment order.

    Approved orders mark tickets as sold.
    Rejected orders release tickets back to available.
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    order = await db.payment_transactions.find_one(
        {"id": request.order_id, "raffle_id": raffle_id}, {"_id": 0}
    )

    if not order:
        raise HTTPException(status_code=404, detail="Orden no encontrada")

    # Use `payment_status` (stored in payment_transactions) to match frontend
    if order.get("payment_status") != "pending":
        raise HTTPException(status_code=400, detail="Esta orden ya fue procesada")

    if request.action == "approve":
        # Mark tickets as sold
        for ticket in raffle["tickets"]:
            if ticket["number"] in order["ticket_numbers"]:
                ticket["status"] = "sold"
                ticket["buyer_name"] = order["buyer_name"]
                ticket["buyer_email"] = order["buyer_email"]
                ticket["buyer_phone"] = order.get("buyer_phone")
                ticket["purchased_at"] = datetime.now(timezone.utc).isoformat()

        await db.raffles.update_one(
            {"id": raffle_id}, {"$set": {"tickets": raffle["tickets"]}}
        )

        await db.payment_transactions.update_one(
            {"id": request.order_id},
            {
                "$set": {
                    "payment_status": "approved",
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        # Send confirmation
        await email_service.send_cash_payment_approved(
            to_email=order["buyer_email"],
            buyer_name=order["buyer_name"],
            raffle_title=raffle["title"],
            ticket_numbers=order["ticket_numbers"],
            prize=raffle["prize"],
            draw_date=raffle["draw_date"],
        )

        return {"message": "Orden aprobada y boletos asignados"}

    else:  # reject
        # Release tickets
        for ticket in raffle["tickets"]:
            if ticket["number"] in order["ticket_numbers"]:
                ticket["status"] = "available"
                ticket["reserved_by"] = None
                ticket["order_id"] = None

        await db.raffles.update_one(
            {"id": raffle_id}, {"$set": {"tickets": raffle["tickets"]}}
        )

        await db.payment_transactions.update_one(
            {"id": request.order_id},
            {
                "$set": {
                    "payment_status": "rejected",
                    "rejected_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        return {"message": "Orden rechazada y boletos liberados"}


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================


@router.get("/public/raffle/{share_code}", response_model=dict)
async def get_public_raffle(share_code: str):
    """
    Get public raffle information by share code.

    This is the endpoint for the public raffle page.
    Does NOT expose sensitive data like preselected_winner.
    """
    raffle = await db.raffles.find_one(
        {"share_code": share_code},
        {"_id": 0, "preselected_winner": 0},  # Never expose preselected winner
    )

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    return raffle
