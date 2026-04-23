"""
Payment processing routes.

Handles payment integrations for MercadoPago, Stripe, PayPal, and Cash.

Endpoints:
    POST /payments/mercadopago/create-preference - Create MP checkout
    GET /payments/mercadopago/status/{id} - Get payment status
    POST /payments/mercadopago/verify/{id} - Verify payment
    POST /webhook/mercadopago - MP webhook handler

    POST /payments/stripe/checkout - Create Stripe checkout
    GET /payments/stripe/status/{id} - Get Stripe status

    POST /payments/paypal/create-order - Create PayPal order
    POST /payments/paypal/capture-order/{id} - Capture PayPal payment
    POST /payments/cash/create-order - Create cash reservation

    POST /test/email - Test email sending
"""

from urllib import request

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from config import db
from config.settings import settings
from services.email_service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Payments"])

# Initialize services
email_service = EmailService(settings.RESEND_API_KEY, settings.SENDER_EMAIL)

# Initialize payment SDKs lazily
_mp_sdk = None
# _stripe_checkout = None
_paypal_client = None


def get_mercadopago_sdk():
    """Get MercadoPago SDK instance (lazy initialization)."""
    global _mp_sdk
    if _mp_sdk is None and settings.MERCADOPAGO_ACCESS_TOKEN:
        import mercadopago

        _mp_sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
    return _mp_sdk


# def get_stripe_checkout():
#     """Get Stripe checkout instance (lazy initialization)."""
#     global _stripe_checkout
#     global _urlWebhookStripe
#     _urlWebhookStripe = settings.NGROK_BACKEND_URL if settings.ENVIRONMENT == "development" else request.origin_url
#     if _stripe_checkout is None and settings.STRIPE_API_KEY:
#         import stripe
#         stripe.api_key = settings.STRIPE_API_KEY
#         _stripe_checkout = stripe
#     return _stripe_checkout


def get_paypal_client():
    """Get PayPal client instance (lazy initialization)."""
    global _paypal_client
    if _paypal_client is None and settings.PAYPAL_CLIENT_ID and settings.PAYPAL_SECRET:
        from paypalcheckoutsdk.core import SandboxEnvironment, PayPalHttpClient

        environment = SandboxEnvironment(
            client_id=settings.PAYPAL_CLIENT_ID, client_secret=settings.PAYPAL_SECRET
        )
        _paypal_client = PayPalHttpClient(environment)
    return _paypal_client


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================


class CheckoutRequest(BaseModel):
    """Generic checkout request."""

    raffle_id: str
    ticket_numbers: List[int]
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None
    origin_url: str


class CashOrderRequest(BaseModel):
    """Cash payment reservation request."""

    raffle_id: str
    ticket_numbers: List[int]
    buyer_name: str
    buyer_email: EmailStr
    buyer_phone: Optional[str] = None


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


async def validate_tickets_available(raffle_id: str, ticket_numbers: List[int]) -> dict:
    """
    Validate that requested tickets are available.

    Returns:
        Raffle document if valid

    Raises:
        HTTPException if validation fails
    """
    raffle = await db.raffles.find_one({"id": raffle_id}, {"_id": 0})

    if not raffle:
        raise HTTPException(status_code=404, detail="Rifa no encontrada")

    if raffle["status"] != "active":
        raise HTTPException(status_code=400, detail="Esta rifa ya no está activa")

    available_numbers = [
        t["number"] for t in raffle["tickets"] if t["status"] == "available"
    ]

    for num in ticket_numbers:
        if num not in available_numbers:
            raise HTTPException(
                status_code=400, detail=f"El boleto #{num} no está disponible"
            )

    return raffle


def format_ticket_list(numbers: List[int]) -> str:
    """Format ticket numbers as string."""
    return ", ".join([f"#{n}" for n in sorted(numbers)])


# =============================================================================
# MERCADOPAGO ENDPOINTS
# =============================================================================


@router.post("/payments/mercadopago/create-preference", response_model=dict)
async def create_mercadopago_preference(request: CheckoutRequest):
    """
    Create a MercadoPago checkout preference with marketplace split payment.

    This creates a payment link that uses the raffle creator's MercadoPago account
    and automatically deducts the platform's commission fee.

    The money goes directly to the raffle creator, minus the marketplace fee.
    """

    url_backend = (
        settings.NGROK_BACKEND_URL
        if settings.ENVIRONMENT == "development"
        else settings.BACKEND_URL
    )
    url_frontend = (
        settings.NGROK_FRONTEND_URL
        if settings.ENVIRONMENT == "development"
        else settings.FRONTEND_URL
    )

    raffle = await validate_tickets_available(request.raffle_id, request.ticket_numbers)

    # Get raffle creator's user info

    raffle_owner = await db.users.find_one({"id": raffle["owner_id"]}, {"_id": 0})

    if not raffle_owner:
        raise HTTPException(status_code=404, detail="Creador de la rifa no encontrado")

    # Check if raffle creator has connected MercadoPago account
    if not raffle_owner.get("mp_connected"):
        raise HTTPException(
            status_code=400,
            detail="El creador de esta rifa no ha conectado su cuenta de MercadoPago. Los pagos en línea no están disponibles para esta rifa.",
        )

    # Get OAuth credentials for the raffle creator
    mp_credentials = await db.mp_oauth_credentials.find_one(
        {"user_id": raffle["owner_id"]}, {"_id": 0}
    )

    if not mp_credentials:
        raise HTTPException(
            status_code=400,
            detail="Credenciales de MercadoPago no encontradas para el creador de la rifa",
        )

    # Check if token needs refresh
    from services.mercadopago_oauth_service import oauth_service
    from datetime import datetime as dt

    expires_at = dt.fromisoformat(mp_credentials["expires_at"].replace("Z", "+00:00"))

    if oauth_service.is_token_expired(expires_at):
        logger.info(f"Token expired for user {raffle['owner_id']}, refreshing...")
        try:
            token_response = await oauth_service.refresh_access_token(
                mp_credentials["refresh_token"]
            )

            # Update stored credentials
            new_expires_at = oauth_service.calculate_token_expiry(
                token_response.get("expires_in", 21600)
            )

            await db.mp_oauth_credentials.update_one(
                {"user_id": raffle["owner_id"]},
                {
                    "$set": {
                        "access_token": token_response["access_token"],
                        "expires_at": new_expires_at.isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
            )

            mp_credentials["access_token"] = token_response["access_token"]
            logger.info(f"Token refreshed successfully for user {raffle['owner_id']}")

        except Exception as e:
            logger.error(f"Failed to refresh token: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="No se pudo renovar el token de MercadoPago. Por favor, reconecta tu cuenta.",
            )

    # Create SDK instance with vendor's access token
    import mercadopago

    vendor_sdk = mercadopago.SDK(mp_credentials["access_token"])

    # Calculate total and marketplace fee
    total_amount = float(raffle["ticket_price"]) * len(request.ticket_numbers)
    marketplace_fee = total_amount * (settings.MARKETPLACE_FEE_PERCENTAGE / 100)

    # Create transaction record
    transaction_id = str(uuid.uuid4())
    transaction_doc = {
        "id": transaction_id,
        "raffle_id": request.raffle_id,
        "ticket_numbers": request.ticket_numbers,
        "buyer_name": request.buyer_name,
        "buyer_email": request.buyer_email,
        "buyer_phone": request.buyer_phone,
        "amount": total_amount,
        "marketplace_fee": marketplace_fee,
        "vendor_amount": total_amount - marketplace_fee,
        "currency": "MXN",
        "payment_method": "mercadopago",
        "payment_status": "pending",
        "vendor_user_id": raffle["owner_id"],
        "vendor_mp_user_id": mp_credentials["mp_user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(transaction_doc)

    # Build preference with split payment configuration
    ticket_list = format_ticket_list(request.ticket_numbers)

    # Build preference data with split payments
    preference_data = {
        "items": [
            {
                "id": transaction_id,
                "title": f"Boletos para {raffle['title']}",
                "description": f"Boletos: {ticket_list}",
                "currency_id": "MXN",
                "quantity": 1,
                "unit_price": total_amount,
            }
        ],
        "payer": {
            "name": (
                request.buyer_name.split()[0] if request.buyer_name else "Comprador"
            ),
            "surname": (
                request.buyer_name.split()[-1]
                if len(request.buyer_name.split()) > 1
                else ""
            ),
            "email": request.buyer_email,
        },
        "back_urls": {
            "success": f"{url_frontend}/payment/success?method=mercadopago&transaction_id={transaction_id}",
            "failure": f"{url_frontend}/raffle/{raffle['share_code']}?payment=failed",
            "pending": f"{url_frontend}/raffle/{raffle['share_code']}?payment=pending",
        },
        "auto_return": "approved",
        "external_reference": transaction_id,
        "notification_url": f"{url_backend}/api/webhook/mercadopago",
        "statement_descriptor": "RIFAFACIL",
        "marketplace_fee": marketplace_fee,
    }

    try:
        response = vendor_sdk.preference().create(preference_data)
        preference = response["response"]

        # Update transaction with preference ID
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"mercadopago_preference_id": preference.get("id")}},
        )

        logger.info(
            f"Marketplace preference created: {preference.get('id')} "
            f"for vendor {raffle['owner_id']}, fee: ${marketplace_fee:.2f}"
        )

        return {
            "preference_id": preference.get("id"),
            "init_point": preference.get("init_point"),
            "sandbox_init_point": preference.get("sandbox_init_point"),
            "transaction_id": transaction_id,
            "marketplace_fee": marketplace_fee,
            "vendor_amount": total_amount - marketplace_fee,
        }

    except Exception as e:
        logger.error(f"MercadoPago marketplace preference error: {e}")
        await db.payment_transactions.delete_one({"id": transaction_id})
        raise HTTPException(
            status_code=500, detail=f"Error creando preferencia de pago: {str(e)}"
        )


@router.get("/payments/mercadopago/status/{transaction_id}", response_model=dict)
async def get_mercadopago_status(transaction_id: str):
    """Get the status of a MercadoPago payment."""
    transaction = await db.payment_transactions.find_one(
        {"id": transaction_id}, {"_id": 0}
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")

    return {
        "transaction_id": transaction_id,
        "status": transaction.get("payment_status"),
        "amount": transaction.get("amount"),
        "payment_method": transaction.get("payment_method"),
        "mercadopago_payment_id": transaction.get("mercadopago_payment_id"),
    }


@router.post("/payments/mercadopago/verify/{transaction_id}", response_model=dict)
async def verify_mercadopago_payment(transaction_id: str):
    """
    Verify a MercadoPago payment after redirect.

    Called by the frontend after the user returns from MercadoPago.
    Searches for approved payments matching the transaction.
    """
    transaction = await db.payment_transactions.find_one(
        {"id": transaction_id}, {"_id": 0}
    )

    if not transaction:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")

    # Already paid
    if transaction.get("payment_status") == "paid":
        return {
            "status": "paid",
            "message": "Pago completado",
            "transaction_id": transaction_id,
        }

    mp_sdk = get_mercadopago_sdk()

    if mp_sdk:
        try:
            # Search for payments with this external reference
            search_result = mp_sdk.payment().search(
                {"external_reference": transaction_id}
            )
            payments = search_result.get("response", {}).get("results", [])

            for payment in payments:
                if payment.get("status") == "approved":
                    await _process_successful_payment(transaction, payment.get("id"))

                    return {
                        "status": "paid",
                        "message": "Pago verificado y confirmado",
                        "transaction_id": transaction_id,
                    }

        except Exception as e:
            logger.error(f"Error verifying MercadoPago payment: {e}")

    return {
        "status": transaction.get("payment_status", "pending"),
        "message": "Pago pendiente de confirmación",
        "transaction_id": transaction_id,
    }


@router.post("/webhook/mercadopago")
async def mercadopago_webhook(request: Request):
    """
    Handle MercadoPago webhook notifications.

    MercadoPago calls this endpoint when payment status changes.
    We process approved payments by marking tickets as sold.
    """
    try:
        body = await request.json()
        logger.info(f"MercadoPago webhook received: {body}")

        if body.get("type") == "payment":
            payment_id = body.get("data", {}).get("id")

            if payment_id:
                mp_sdk = get_mercadopago_sdk()
                if mp_sdk:
                    payment_response = mp_sdk.payment().get(payment_id)
                    payment = payment_response.get("response", {})

                    external_reference = payment.get("external_reference")

                    if external_reference and payment.get("status") == "approved":
                        transaction = await db.payment_transactions.find_one(
                            {"id": external_reference}, {"_id": 0}
                        )

                        if transaction and transaction.get("payment_status") != "paid":
                            await _process_successful_payment(transaction, payment_id)

        return {"status": "received"}

    except Exception as e:
        logger.error(f"MercadoPago webhook error: {e}")
        return {"status": "error"}


@router.get("/test/email")
async def test_email(request: Request):
    """Test email sending."""
    try:
        await email_service.send_test_email(to_email="valiente90@outlook.com")
        return {"status": "success", "message": "Test email sent"}
    except Exception as e:
        logger.error(f"Test email error: {e}")
        return {"status": "error", "message": f"Failed to send test email: {str(e)}"}


async def _process_successful_payment(transaction: dict, payment_id: str):
    """
    Process a successful payment - update transaction and tickets.

    Args:
        transaction: Transaction document
        payment_id: External payment ID
    """
    # Update transaction
    await db.payment_transactions.update_one(
        {"id": transaction["id"]},
        {
            "$set": {
                "payment_status": "paid",
                "mercadopago_payment_id": payment_id,
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )

    # Update tickets
    raffle = await db.raffles.find_one({"id": transaction["raffle_id"]}, {"_id": 0})

    if raffle:
        for ticket in raffle["tickets"]:
            if ticket["number"] in transaction["ticket_numbers"]:
                ticket["status"] = "sold"
                ticket["buyer_name"] = transaction["buyer_name"]
                ticket["buyer_email"] = transaction["buyer_email"]
                ticket["purchased_at"] = datetime.now(timezone.utc).isoformat()

        await db.raffles.update_one(
            {"id": transaction["raffle_id"]}, {"$set": {"tickets": raffle["tickets"]}}
        )

        # Send confirmation email
        await email_service.send_purchase_confirmation(
            to_email=transaction["buyer_email"],
            buyer_name=transaction["buyer_name"],
            raffle_title=raffle["title"],
            ticket_numbers=transaction["ticket_numbers"],
            total_amount=transaction["amount"],
            draw_date=raffle["draw_date"],
            payment_method="MercadoPago",
        )

    logger.info(f"Payment {payment_id} processed successfully")


# =============================================================================
# STRIPE ENDPOINTS
# =============================================================================

# @router.post("/payments/stripe/checkout", response_model=dict)
# async def create_stripe_checkout(request: CheckoutRequest):
#     """Create a Stripe checkout session."""

#     stripe_checkout = get_stripe_checkout()

#     if not stripe_checkout:
#         raise HTTPException(
#             status_code=503,
#             detail="Stripe no configurado"
#         )

#     raffle = await validate_tickets_available(request.raffle_id, request.ticket_numbers)
#     total_amount = int(raffle['ticket_price'] * 100) * len(request.ticket_numbers)

#     try:

#         session = stripe_checkout.checkout.Session.create(
#                 line_items=[{
#                     'price_data': {
#                         'currency': 'mxn',
#                         'unit_amount': total_amount,
#                         'product_data': {
#                             'name': f'Boletos para {raffle["title"]}',
#                             'description': format_ticket_list(request.ticket_numbers)
#                         }
#                     },
#                     'quantity': 1
#                 }],
#                 mode='payment',
#                 success_url=f"{_urlWebhookStripe}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
#                 cancel_url=f"{_urlWebhookStripe}/payment/cancelled?session_id={{CHECKOUT_SESSION_ID}}",
#                 customer_email=request.buyer_email,
#                 metadata={
#                     'raffle_id': request.raffle_id,
#                     'ticket_numbers': ','.join(map(str, request.ticket_numbers)),
#                     'buyer_name': request.buyer_name,
#                     'buyer_email': request.buyer_email
#                 }
#         )
#         return {
#             "session_id": session.id,
#             "checkout_url": session.url
#         }

#     except Exception as e:
#         logger.error(f"Stripe checkout error details: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Error creando sesión de pago: {str(e)}"
#         )


# @router.get("/payments/stripe/status/{session_id}", response_model=dict)
# async def get_stripe_status(session_id: str):
#     """Get Stripe payment status."""
#     stripe_checkout = get_stripe_checkout()

#     if not stripe_checkout:
#         raise HTTPException(status_code=503, detail="Stripe no configurado")

#     try:
#         status = stripe_checkout.get_checkout_session_status(session_id)
#         return {
#             "status": status.status,
#             "payment_status": status.payment_status
#         }
#     except Exception as e:
#         logger.error(f"Stripe status error: {e}")
#         raise HTTPException(status_code=500, detail="Error obteniendo estado de pago")


# @router.post("/webhook/stripe")
# async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
#     """Handle Stripe webhook notifications."""
#     stripe_checkout = get_stripe_checkout()

#     if not stripe_checkout:
#         logger.error("Stripe webhook received but Stripe is not configured")
#         return {"status": "error"}
#     try:
#         event = stripe_checkout.Webhook.construct_event(
#             payload=await request.body(),
#             sig_header=stripe_signature,
#             secret=settings.STRIPE_WEBHOOK_SECRET
#         )

#         payload = await request.body()

#         if event['type'] == 'checkout.session.completed':
#             session = event['data']['object']

#             payment_intent = session.get('payment_intent')
#             email = session.get("customer_details", {}).get("email")

#             print(f"Stripe webhook received: checkout.session.completed for session {session.id}, payment_intent: {payment_intent}, email: {email}")
#         else:
#             print(f"Stripe webhook received: {event['type']} for session {session.id}")
#     except Exception as e:
#         logger.error(f"Stripe webhook error: {e}")
#         return {"status": "error"}

# =============================================================================
# PAYPAL ENDPOINTS
# =============================================================================


@router.post("/payments/paypal/create-order", response_model=dict)
async def create_paypal_order(request: CheckoutRequest):
    """Create a PayPal order."""
    paypal_client = get_paypal_client()

    if not paypal_client:
        raise HTTPException(status_code=503, detail="PayPal no configurado")

    raffle = await validate_tickets_available(request.raffle_id, request.ticket_numbers)
    total_amount = str(raffle["ticket_price"] * len(request.ticket_numbers))

    try:
        from paypalcheckoutsdk.orders import OrdersCreateRequest

        paypal_request = OrdersCreateRequest()
        paypal_request.prefer("return=representation")
        paypal_request.request_body(
            {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "amount": {"currency_code": "MXN", "value": total_amount},
                        "description": f"Boletos para {raffle['title']}",
                    }
                ],
                "application_context": {
                    "return_url": f"{request.origin_url}/payment/success?method=paypal",
                    "cancel_url": f"{request.origin_url}/raffle/{raffle['share_code']}?payment=cancelled",
                },
            }
        )

        response = paypal_client.execute(paypal_request)

        # Store order info
        await db.paypal_orders.insert_one(
            {
                "order_id": response.result.id,
                "raffle_id": request.raffle_id,
                "ticket_numbers": request.ticket_numbers,
                "buyer_name": request.buyer_name,
                "buyer_email": request.buyer_email,
                "amount": float(total_amount),
                "status": "created",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        return {"order_id": response.result.id, "status": response.result.status}

    except Exception as e:
        logger.error(f"PayPal create order error: {e}")
        raise HTTPException(status_code=500, detail="Error creando orden de PayPal")


@router.post("/payments/paypal/capture-order/{order_id}", response_model=dict)
async def capture_paypal_order(order_id: str):
    """Capture a PayPal payment."""
    paypal_client = get_paypal_client()

    if not paypal_client:
        raise HTTPException(status_code=503, detail="PayPal no configurado")

    try:
        from paypalcheckoutsdk.orders import OrdersCaptureRequest

        capture_request = OrdersCaptureRequest(order_id)
        response = paypal_client.execute(capture_request)

        if response.result.status == "COMPLETED":
            # Get order info and update tickets
            order = await db.paypal_orders.find_one({"order_id": order_id}, {"_id": 0})

            if order:
                raffle = await db.raffles.find_one(
                    {"id": order["raffle_id"]}, {"_id": 0}
                )

                if raffle:
                    for ticket in raffle["tickets"]:
                        if ticket["number"] in order["ticket_numbers"]:
                            ticket["status"] = "sold"
                            ticket["buyer_name"] = order["buyer_name"]
                            ticket["buyer_email"] = order["buyer_email"]
                            ticket["purchased_at"] = datetime.now(
                                timezone.utc
                            ).isoformat()

                    await db.raffles.update_one(
                        {"id": order["raffle_id"]},
                        {"$set": {"tickets": raffle["tickets"]}},
                    )

                    await db.paypal_orders.update_one(
                        {"order_id": order_id}, {"$set": {"status": "completed"}}
                    )

                    # Send confirmation
                    await email_service.send_purchase_confirmation(
                        to_email=order["buyer_email"],
                        buyer_name=order["buyer_name"],
                        raffle_title=raffle["title"],
                        ticket_numbers=order["ticket_numbers"],
                        total_amount=order["amount"],
                        draw_date=raffle["draw_date"],
                        payment_method="PayPal",
                    )

            return {"status": "paid"}

        return {"status": "pending"}

    except Exception as e:
        logger.error(f"PayPal capture error: {e}")
        raise HTTPException(status_code=500, detail="Error procesando pago")


# =============================================================================
# CASH PAYMENT ENDPOINTS
# =============================================================================


@router.post("/payments/cash/create-order", response_model=dict)
async def create_cash_order(request: CashOrderRequest):
    """
    Create a cash payment order (reservation).

    Reserves tickets for 48 hours while buyer arranges cash payment.
    If not approved within 48h, tickets are automatically released.
    """
    raffle = await validate_tickets_available(request.raffle_id, request.ticket_numbers)

    # Calculate total and expiry
    total_amount = raffle["ticket_price"] * len(request.ticket_numbers)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    # Create order
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "raffle_id": request.raffle_id,
        "ticket_numbers": request.ticket_numbers,
        "buyer_name": request.buyer_name,
        "buyer_email": request.buyer_email,
        "buyer_phone": request.buyer_phone,
        "amount": total_amount,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    await db.cash_orders.insert_one(order_doc)

    # Mark tickets as reserved
    for ticket in raffle["tickets"]:
        if ticket["number"] in request.ticket_numbers:
            ticket["status"] = "reserved"
            ticket["reserved_by"] = request.buyer_name
            ticket["order_id"] = order_id

    await db.raffles.update_one(
        {"id": request.raffle_id}, {"$set": {"tickets": raffle["tickets"]}}
    )

    # Send reservation email
    await email_service.send_cash_order_created(
        to_email=request.buyer_email,
        buyer_name=request.buyer_name,
        raffle_title=raffle["title"],
        ticket_numbers=request.ticket_numbers,
        total_amount=total_amount,
        expires_at=expires_at.isoformat(),
    )

    logger.info(f"Cash order created: {order_id}")

    return {
        "order_id": order_id,
        "status": "pending",
        "expires_at": expires_at.isoformat(),
        "message": "Boletos reservados por 48 horas. Contacta al organizador para completar el pago.",
    }
