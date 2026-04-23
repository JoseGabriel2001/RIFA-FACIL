"""
Email notification service for RifaFacil.

This module handles all email notifications sent by the application
using the Resend API. It provides templated HTML emails with consistent
branding across all notification types.

Architecture Decision:
    We use Resend instead of raw SMTP because:
    1. Better deliverability (dedicated infrastructure)
    2. Simpler API (no SMTP configuration)
    3. Built-in analytics and bounce handling
    4. Free tier sufficient for MVP

Note on Testing Mode:
    Resend in test mode can only send to verified email addresses.
    For production, a custom domain must be verified in Resend dashboard.
"""

import asyncio
import logging
from typing import Optional
import resend

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service class for sending email notifications.

    This class encapsulates all email functionality and provides
    pre-built templates for common notification types.
    """

    def __init__(self, api_key: str, sender_email: str):
        """
        Initialize the email service.

        Args:
            api_key: Resend API key
            sender_email: Email address to send from
        """
        self.api_key = api_key
        self.sender_email = sender_email
        self.enabled = bool(api_key)

        if self.enabled:
            resend.api_key = api_key
            logger.info(f"Email service initialized with sender: {sender_email}")
        else:
            logger.warning("Email service disabled - no API key configured")

    async def send_email(
        self, to_email: str, subject: str, html_content: str
    ) -> Optional[dict]:
        """
        Send an email using Resend API.

        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: Full HTML content of the email

        Returns:
            Resend API response dict if successful, None otherwise
        """
        if not self.enabled:
            logger.warning(f"Email skipped (service disabled): {subject} -> {to_email}")
            return None

        try:
            params = {
                "from": self.sender_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }

            # Resend's send is synchronous, run in thread pool
            result = await asyncio.to_thread(resend.Emails.send, params)

            logger.info(f"Email sent successfully: {subject} -> {to_email}")
            return result

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return None

    def create_base_template(
        self,
        title: str,
        content: str,
        button_text: Optional[str] = None,
        button_url: Optional[str] = None,
    ) -> str:
        """
        Create a branded HTML email template.

        This template provides consistent styling across all emails:
        - Orange/white color scheme matching the app
        - Responsive design for mobile
        - Clear call-to-action buttons

        Args:
            title: Main heading in the email
            content: HTML content for the body
            button_text: Optional CTA button text
            button_url: Optional CTA button URL

        Returns:
            Complete HTML email string
        """
        # Build optional button HTML
        button_html = ""
        if button_text and button_url:
            button_html = f"""
            <div style="text-align: center; margin-top: 25px;">
                <a href="{button_url}" 
                   style="display: inline-block; 
                          background: linear-gradient(135deg, #f97316, #fb923c); 
                          color: white; 
                          padding: 14px 30px; 
                          border-radius: 8px; 
                          text-decoration: none; 
                          font-weight: 600; 
                          font-size: 16px;">
                    {button_text}
                </a>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; 
                     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                     Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" 
                   style="background-color: #f1f5f9; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" 
                               style="max-width: 600px; width: 100%;">
                            <!-- Header with gradient background -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #f97316, #fb923c); 
                                           padding: 30px; 
                                           text-align: center; 
                                           border-radius: 12px 12px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 28px; 
                                               font-weight: 700;">
                                        RifaFacil
                                    </h1>
                                </td>
                            </tr>
                            <!-- Main content area -->
                            <tr>
                                <td style="background: white; 
                                           padding: 40px 30px; 
                                           border-radius: 0 0 12px 12px; 
                                           box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                                    <h2 style="color: #1e293b; margin: 0 0 20px 0; 
                                               font-size: 24px; font-weight: 600;">
                                        {title}
                                    </h2>
                                    <div style="color: #475569; font-size: 16px; 
                                                line-height: 1.6;">
                                        {content}
                                    </div>
                                    {button_html}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 25px; text-align: center;">
                                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                                        Este email fue enviado por RifaFacil<br>
                                        © 2025 RifaFacil. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    def create_base_template(
        self,
        title: str,
        content: str,
        button_text: Optional[str] = None,
        button_url: Optional[str] = None,
    ) -> str:
        """
        Create a branded HTML email template.

        This template provides consistent styling across all emails:
        - Orange/white color scheme matching the app
        - Responsive design for mobile
        - Clear call-to-action buttons

        Args:
            title: Main heading in the email
            content: HTML content for the body
            button_text: Optional CTA button text
            button_url: Optional CTA button URL

        Returns:
            Complete HTML email string
        """
        # Build optional button HTML
        button_html = ""
        if button_text and button_url:
            button_html = f"""
            <div style="text-align: center; margin-top: 25px;">
                <a href="{button_url}" 
                   style="display: inline-block; 
                          background: linear-gradient(135deg, #f97316, #fb923c); 
                          color: white; 
                          padding: 14px 30px; 
                          border-radius: 8px; 
                          text-decoration: none; 
                          font-weight: 600; 
                          font-size: 16px;">
                    {button_text}
                </a>
            </div>
            """

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; 
                     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                     Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" 
                   style="background-color: #f1f5f9; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" 
                               style="max-width: 600px; width: 100%;">
                            <!-- Header with gradient background -->
                            <tr>
                                <td style="background: linear-gradient(135deg, #f97316, #fb923c); 
                                           padding: 30px; 
                                           text-align: center; 
                                           border-radius: 12px 12px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 28px; 
                                               font-weight: 700;">
                                        RifaFacil
                                    </h1>
                                </td>
                            </tr>
                            <!-- Main content area -->
                            <tr>
                                <td style="background: white; 
                                           padding: 40px 30px; 
                                           border-radius: 0 0 12px 12px; 
                                           box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                                    <h2 style="color: #1e293b; margin: 0 0 20px 0; 
                                               font-size: 24px; font-weight: 600;">
                                        {title}
                                    </h2>
                                    <div style="color: #475569; font-size: 16px; 
                                                line-height: 1.6;">
                                        {content}
                                    </div>
                                    {button_html}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 25px; text-align: center;">
                                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                                        Este email fue enviado por RifaFacil<br>
                                        © 2025 RifaFacil. Todos los derechos reservados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    # =========================================================================
    # PRE-BUILT EMAIL TEMPLATES
    # =========================================================================

    async def send_winner_notification(
        self,
        to_email: str,
        winner_name: str,
        raffle_title: str,
        prize: str,
        winning_number: int,
    ) -> Optional[dict]:
        """
        Send a winner notification email.

        This is the most exciting email we send! The winner announcement
        uses celebratory styling and clearly displays the winning number.

        Args:
            to_email: Winner's email address
            winner_name: Winner's display name
            raffle_title: Name of the raffle
            prize: Description of the prize
            winning_number: The winning ticket number

        Returns:
            Resend API response or None
        """
        content = f"""
            <p>¡Enhorabuena <strong>{winner_name}</strong>!</p>
            <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); 
                        padding: 25px; 
                        border-radius: 10px; 
                        margin: 20px 0; 
                        text-align: center;">
                <p style="font-size: 18px; margin: 0 0 10px 0;">Tu boleto</p>
                <p style="font-size: 48px; font-weight: 700; color: #f97316; margin: 0;">
                    #{winning_number}
                </p>
                <p style="font-size: 18px; margin: 10px 0 0 0;">
                    ha sido seleccionado como <strong>GANADOR</strong>
                </p>
            </div>
            <p><strong>Rifa:</strong> {raffle_title}</p>
            <p><strong>Premio:</strong> {prize}</p>
            <p style="margin-top: 20px;">
                El organizador se pondrá en contacto contigo pronto para 
                coordinar la entrega de tu premio.
            </p>
        """

        html = self.create_base_template("¡Eres el ganador!", content)
        return await self.send_email(
            to_email, f"🎉 ¡Felicidades! Has ganado en {raffle_title}", html
        )

    async def send_purchase_confirmation(
        self,
        to_email: str,
        buyer_name: str,
        raffle_title: str,
        ticket_numbers: list[int],
        total_amount: float,
        draw_date: str,
        payment_method: str = "tarjeta",
    ) -> Optional[dict]:
        """
        Send a purchase confirmation email.

        Sent immediately after successful payment to confirm the
        ticket purchase and provide receipt information.

        Args:
            to_email: Buyer's email address
            buyer_name: Buyer's display name
            raffle_title: Name of the raffle
            ticket_numbers: List of purchased ticket numbers
            total_amount: Total paid in MXN
            draw_date: Date of the raffle draw
            payment_method: How they paid (for receipt)

        Returns:
            Resend API response or None
        """
        ticket_list = ", ".join([f"#{n}" for n in sorted(ticket_numbers)])

        content = f"""
            <p>Hola <strong>{buyer_name}</strong>,</p>
            <p>¡Gracias por tu compra! Aquí están los detalles:</p>
            <div style="background: #f1f5f9; padding: 20px; 
                        border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Rifa:</strong> {raffle_title}</p>
                <p style="margin: 0 0 10px 0;"><strong>Tus boletos:</strong> {ticket_list}</p>
                <p style="margin: 0 0 10px 0;"><strong>Total pagado:</strong> ${total_amount:.2f} MXN</p>
                <p style="margin: 0;"><strong>Fecha del sorteo:</strong> {draw_date}</p>
            </div>
            <p>Te notificaremos por email si resultas ganador. ¡Buena suerte! 🍀</p>
        """

        html = self.create_base_template("¡Compra confirmada!", content)
        return await self.send_email(
            to_email, f"🎫 Confirmación de compra - {raffle_title}", html
        )

    async def send_cash_payment_approved(
        self,
        to_email: str,
        buyer_name: str,
        raffle_title: str,
        ticket_numbers: list[int],
        prize: str,
        draw_date: str,
    ) -> Optional[dict]:
        """
        Send notification that a cash payment was approved.

        Sent when the raffle admin manually approves a cash payment order.
        This confirms their tickets are now officially purchased.

        Args:
            to_email: Buyer's email address
            buyer_name: Buyer's display name
            raffle_title: Name of the raffle
            ticket_numbers: List of ticket numbers
            prize: Description of the prize
            draw_date: Date of the raffle draw

        Returns:
            Resend API response or None
        """
        ticket_list = ", ".join([f"#{n}" for n in sorted(ticket_numbers)])

        content = f"""
            <p>Hola <strong>{buyer_name}</strong>,</p>
            <p>¡Excelentes noticias! Tu pago en efectivo ha sido 
               <strong>verificado y aprobado</strong>.</p>
            <div style="background: #dcfce7; padding: 20px; border-radius: 10px; 
                        margin: 20px 0; border-left: 4px solid #22c55e;">
                <p style="margin: 0 0 10px 0; color: #166534;">
                    <strong>✅ Pago confirmado</strong>
                </p>
                <p style="margin: 0 0 10px 0;"><strong>Rifa:</strong> {raffle_title}</p>
                <p style="margin: 0 0 10px 0;"><strong>Tus boletos:</strong> {ticket_list}</p>
                <p style="margin: 0 0 10px 0;"><strong>Premio:</strong> {prize}</p>
                <p style="margin: 0;"><strong>Fecha del sorteo:</strong> {draw_date}</p>
            </div>
            <p>Te notificaremos por email si resultas ganador. ¡Buena suerte! 🍀</p>
        """

        html = self.create_base_template("¡Tu pago ha sido aprobado!", content)
        return await self.send_email(
            to_email, f"✅ ¡Pago confirmado! - {raffle_title}", html
        )

    async def send_cash_order_created(
        self,
        to_email: str,
        buyer_name: str,
        raffle_title: str,
        ticket_numbers: list[int],
        total_amount: float,
        expires_at: str,
    ) -> Optional[dict]:
        """
        Send notification that a cash order was created.

        Informs the buyer that their tickets are reserved and provides
        instructions for completing the cash payment.

        Args:
            to_email: Buyer's email address
            buyer_name: Buyer's display name
            raffle_title: Name of the raffle
            ticket_numbers: Reserved ticket numbers
            total_amount: Amount to pay
            expires_at: When the reservation expires

        Returns:
            Resend API response or None
        """
        ticket_list = ", ".join([f"#{n}" for n in sorted(ticket_numbers)])

        content = f"""
            <p>Hola <strong>{buyer_name}</strong>,</p>
            <p>Hemos reservado los siguientes boletos para ti:</p>
            <div style="background: #fef3c7; padding: 20px; border-radius: 10px; 
                        margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0 0 10px 0;"><strong>Rifa:</strong> {raffle_title}</p>
                <p style="margin: 0 0 10px 0;"><strong>Boletos reservados:</strong> {ticket_list}</p>
                <p style="margin: 0 0 10px 0;"><strong>Total a pagar:</strong> ${total_amount:.2f} MXN</p>
            </div>
            <p style="color: #b45309;">
                <strong>⚠️ Importante:</strong> Tu reserva expira en 48 horas. 
                Contacta al organizador para coordinar el pago en efectivo antes de esa fecha.
            </p>
        """

        html = self.create_base_template("Boletos reservados", content)
        return await self.send_email(
            to_email, f"⏰ Boletos reservados - {raffle_title}", html
        )

    async def send_test_email(
        self,
        to_email: str
    ) -> Optional[dict]:
        """
        Send a simple test email to verify the email service is working.
        """

        content = f"""
            <p>Hola <strong>{to_email}</strong>,</p>
            <p>Este es un email de prueba para verificar que el servicio de 
               correo electrónico está funcionando correctamente.</p>
        """

        html = self.create_base_template("¡Email de prueba!", content)
        return await self.send_email(
            to_email, "📧 Prueba de servicio de correo electrónico", html
        )
