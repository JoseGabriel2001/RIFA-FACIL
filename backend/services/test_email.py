from email_service import EmailService

email_service = EmailService("re_Y3H65SAm_7GQNcCg9oosx9RSUMmaHmet8", "onboarding@resend.dev")

async def test_send_email():
    try: 
        await email_service.send_cash_order_created(to_email="delossantos.jose.1fm@gmail.com", buyer_name="Test User", raffle_title="Test Raffle", ticket_numbers=[1, 2, 3], total_amount=100.0, expires_at="2023-10-10T10:00:00Z")
        print("Email sent successfully")
    except Exception as e:
        print(f"Error sending email: {str(e)}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_send_email())