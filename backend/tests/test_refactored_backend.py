"""
Comprehensive Backend Tests for RifaFacil Refactored API

Tests all major endpoints after the modular refactoring:
- Auth routes (auth.py)
- Raffle routes (raffles.py)
- Payment routes (payments.py)
- Utility routes (utils.py)
"""

import pytest
import requests
import os
import uuid
import time

# Get backend URL from environment - MUST use public URL for external testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

print(f"Testing against: {BASE_URL}")


class TestHealthCheck:
    """Test API health and availability after refactoring"""
    
    def test_api_health_check(self):
        """GET /api/ should return health status"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data or "status" in data
        print(f"✅ Health check: {data}")


class TestAuthEndpoints:
    """Tests for /api/auth/* endpoints (auth.py module)"""
    
    @pytest.fixture
    def unique_email(self):
        """Generate unique email for each test"""
        return f"TEST_auth_{uuid.uuid4().hex[:8]}@test.com"
    
    def test_register_new_user(self, unique_email):
        """POST /api/auth/register - create new account"""
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test Auth User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == "Test Auth User"
        assert data["user"]["plan"] == "free"
        assert "id" in data["user"]
        print(f"✅ Registered user: {data['user']['email']}")
    
    def test_register_duplicate_email(self, unique_email):
        """POST /api/auth/register - duplicate email should fail"""
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "First User"
        }
        # Register first time
        requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Try to register again
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✅ Duplicate registration blocked: {data['detail']}")
    
    def test_login_valid_credentials(self, unique_email):
        """POST /api/auth/login - login with valid credentials"""
        # First register
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Login Test User"
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Now login
        login_payload = {
            "email": unique_email,
            "password": "TestPass123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        print(f"✅ Login successful for: {unique_email}")
    
    def test_login_invalid_password(self, unique_email):
        """POST /api/auth/login - wrong password returns 401"""
        # First register
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Test User"
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        # Login with wrong password
        login_payload = {
            "email": unique_email,
            "password": "WrongPassword!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        
        assert response.status_code == 401
        print("✅ Invalid password correctly rejected")
    
    def test_login_nonexistent_email(self):
        """POST /api/auth/login - non-existent email returns 401"""
        login_payload = {
            "email": f"nonexistent_{uuid.uuid4().hex[:8]}@test.com",
            "password": "AnyPassword!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
        
        assert response.status_code == 401
        print("✅ Non-existent email correctly rejected")
    
    def test_get_me_with_token(self, unique_email):
        """GET /api/auth/me - returns user info with valid token"""
        # Register and get token
        payload = {
            "email": unique_email,
            "password": "TestPass123!",
            "name": "Me Test User"
        }
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        token = register_response.json()["token"]
        
        # Get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_email
        print(f"✅ GET /me returned: {data['email']}")
    
    def test_get_me_without_token(self):
        """GET /api/auth/me - returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code in [401, 403]
        print("✅ Unauthorized access correctly rejected")


class TestRaffleEndpoints:
    """Tests for /api/raffles/* endpoints (raffles.py module)"""
    
    @pytest.fixture
    def auth_token(self):
        """Create user and return auth token"""
        email = f"TEST_raffle_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": email,
            "password": "TestPass123!",
            "name": "Raffle Test User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_raffle_authenticated(self, auth_headers):
        """POST /api/raffles - create raffle with auth"""
        raffle_data = {
            "title": "TEST Raffle",
            "description": "Test description",
            "prize": "Test Prize",
            "ticket_price": 50.0,
            "total_tickets": 100,
            "draw_date": "2026-12-31",
            "spins_before_winner": 3
        }
        response = requests.post(
            f"{BASE_URL}/api/raffles",
            json=raffle_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "share_code" in data
        assert len(data["share_code"]) == 8
        print(f"✅ Created raffle with share_code: {data['share_code']}")
        return data
    
    def test_create_raffle_unauthenticated(self):
        """POST /api/raffles - create raffle without auth fails"""
        raffle_data = {
            "title": "Unauthorized Raffle",
            "description": "Should fail",
            "prize": "Nothing",
            "ticket_price": 10.0,
            "total_tickets": 10,
            "draw_date": "2026-12-31"
        }
        response = requests.post(f"{BASE_URL}/api/raffles", json=raffle_data)
        
        assert response.status_code in [401, 403]
        print("✅ Unauthenticated raffle creation blocked")
    
    def test_list_raffles(self, auth_headers):
        """GET /api/raffles - list user's raffles"""
        # First create a raffle
        raffle_data = {
            "title": "TEST List Raffle",
            "description": "Test",
            "prize": "Prize",
            "ticket_price": 25.0,
            "total_tickets": 50,
            "draw_date": "2026-12-31"
        }
        requests.post(f"{BASE_URL}/api/raffles", json=raffle_data, headers=auth_headers)
        
        # Now list
        response = requests.get(f"{BASE_URL}/api/raffles", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✅ Listed {len(data)} raffles")
    
    def test_get_raffle_by_id(self, auth_headers):
        """GET /api/raffles/{id} - get raffle details"""
        # Create raffle first
        raffle_data = {
            "title": "TEST Get Raffle",
            "description": "Test",
            "prize": "Prize",
            "ticket_price": 30.0,
            "total_tickets": 20,
            "draw_date": "2026-12-31"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json=raffle_data,
            headers=auth_headers
        )
        raffle_id = create_response.json()["id"]
        
        # Get raffle
        response = requests.get(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == raffle_id
        assert data["title"] == "TEST Get Raffle"
        assert "tickets" in data
        print(f"✅ Got raffle: {data['title']}")
    
    def test_update_raffle(self, auth_headers):
        """PUT /api/raffles/{id} - update raffle"""
        # Create first
        raffle_data = {
            "title": "TEST Original Title",
            "description": "Original",
            "prize": "Original Prize",
            "ticket_price": 40.0,
            "total_tickets": 30,
            "draw_date": "2026-12-31"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json=raffle_data,
            headers=auth_headers
        )
        raffle_id = create_response.json()["id"]
        
        # Update
        update_data = {"title": "TEST Updated Title"}
        response = requests.put(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            headers=auth_headers
        )
        assert get_response.json()["title"] == "TEST Updated Title"
        print("✅ Raffle updated successfully")
    
    def test_delete_raffle(self, auth_headers):
        """DELETE /api/raffles/{id} - delete raffle"""
        # Create first
        raffle_data = {
            "title": "TEST To Delete",
            "description": "Will be deleted",
            "prize": "Prize",
            "ticket_price": 10.0,
            "total_tickets": 10,
            "draw_date": "2026-12-31"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json=raffle_data,
            headers=auth_headers
        )
        raffle_id = create_response.json()["id"]
        
        # Delete
        response = requests.delete(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print("✅ Raffle deleted successfully")


class TestPublicEndpoints:
    """Tests for public endpoints (no auth required)"""
    
    @pytest.fixture
    def created_raffle(self):
        """Create a raffle and return share_code"""
        email = f"TEST_public_{uuid.uuid4().hex[:8]}@test.com"
        # Register
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "password": "TestPass123!",
                "name": "Public Test User"
            }
        )
        token = reg_response.json()["token"]
        
        # Create raffle
        raffle_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json={
                "title": "TEST Public Raffle",
                "description": "Public test",
                "prize": "Test Prize",
                "ticket_price": 15.0,
                "total_tickets": 50,
                "draw_date": "2026-12-31"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        return raffle_response.json()["share_code"]
    
    def test_get_public_raffle(self, created_raffle):
        """GET /api/public/raffle/{share_code} - public access"""
        response = requests.get(f"{BASE_URL}/api/public/raffle/{created_raffle}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["share_code"] == created_raffle
        assert "tickets" in data
        assert "preselected_winner" not in data  # Should never be exposed
        print(f"✅ Public raffle accessed: {data['title']}")
    
    def test_get_public_raffle_invalid_code(self):
        """GET /api/public/raffle/{invalid} - returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/raffle/INVALID123")
        
        assert response.status_code == 404
        print("✅ Invalid share code returns 404")


class TestPaymentEndpoints:
    """Tests for /api/payments/* endpoints (payments.py module)"""
    
    def test_mercadopago_not_configured(self):
        """POST /api/payments/mercadopago/create-preference - returns 503 when not configured"""
        payload = {
            "raffle_id": "test-raffle-id",
            "ticket_numbers": [1, 2, 3],
            "buyer_name": "Test Buyer",
            "buyer_email": "buyer@test.com",
            "origin_url": "https://example.com"
        }
        response = requests.post(
            f"{BASE_URL}/api/payments/mercadopago/create-preference",
            json=payload
        )
        
        # Should return 503 (service unavailable) when not configured
        # or 404 if raffle doesn't exist
        assert response.status_code in [503, 404, 520]
        print(f"✅ MercadoPago endpoint responded: {response.status_code}")
    
    def test_cash_order_creation(self):
        """Test cash payment flow"""
        # First we need a valid raffle
        email = f"TEST_cash_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "TestPass123!", "name": "Cash Test"}
        )
        token = reg_response.json()["token"]
        
        # Create raffle
        raffle_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json={
                "title": "TEST Cash Raffle",
                "description": "Cash test",
                "prize": "Prize",
                "ticket_price": 20.0,
                "total_tickets": 10,
                "draw_date": "2026-12-31"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_id = raffle_response.json()["id"]
        
        # Create cash order
        cash_payload = {
            "raffle_id": raffle_id,
            "ticket_numbers": [1, 2],
            "buyer_name": "Cash Buyer",
            "buyer_email": "cashbuyer@test.com",
            "buyer_phone": "555-1234"
        }
        response = requests.post(
            f"{BASE_URL}/api/payments/cash/create-order",
            json=cash_payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert data["status"] == "pending"
        print(f"✅ Cash order created: {data['order_id']}")


class TestUtilityEndpoints:
    """Tests for utility endpoints (utils.py module)"""
    
    @pytest.fixture
    def auth_headers(self):
        """Create user and return headers with token"""
        email = f"TEST_util_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "TestPass123!", "name": "Util Test"}
        )
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_upload_image_requires_auth(self):
        """POST /api/upload-image - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/upload-image")
        assert response.status_code in [401, 403, 422]
        print("✅ Upload requires authentication")
    
    def test_get_my_tickets(self, auth_headers):
        """GET /api/my-tickets - returns user's tickets"""
        response = requests.get(f"{BASE_URL}/api/my-tickets", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ My tickets returned: {len(data)} raffles")
    
    def test_get_stats(self, auth_headers):
        """GET /api/stats - returns user statistics"""
        response = requests.get(f"{BASE_URL}/api/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "total_raffles" in data
        assert "active_raffles" in data
        assert "total_tickets_sold" in data
        print(f"✅ Stats returned: {data}")


class TestTicketManagement:
    """Tests for ticket management endpoints"""
    
    @pytest.fixture
    def raffle_with_token(self):
        """Create user, raffle, and return both"""
        email = f"TEST_ticket_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "TestPass123!", "name": "Ticket Test"}
        )
        token = reg_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        raffle_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json={
                "title": "TEST Ticket Raffle",
                "description": "Ticket test",
                "prize": "Prize",
                "ticket_price": 25.0,
                "total_tickets": 20,
                "draw_date": "2026-12-31"
            },
            headers=headers
        )
        
        return {
            "raffle_id": raffle_response.json()["id"],
            "headers": headers
        }
    
    def test_assign_tickets(self, raffle_with_token):
        """POST /api/raffles/{id}/assign-tickets - manual assignment"""
        raffle_id = raffle_with_token["raffle_id"]
        headers = raffle_with_token["headers"]
        
        assign_payload = {
            "ticket_numbers": [1, 2, 3],
            "buyer_name": "Manual Buyer",
            "buyer_email": "manual@test.com",
            "buyer_phone": "555-1234"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/raffles/{raffle_id}/assign-tickets",
            json=assign_payload,
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Verify assignment
        raffle_response = requests.get(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            headers=headers
        )
        tickets = raffle_response.json()["tickets"]
        assigned = [t for t in tickets if t["status"] == "sold" and t["number"] in [1, 2, 3]]
        assert len(assigned) == 3
        print("✅ Tickets assigned manually")


class TestSpinAndWinner:
    """Tests for wheel spin and winner selection"""
    
    @pytest.fixture
    def raffle_with_sold_tickets(self):
        """Create raffle with sold tickets for spin testing"""
        email = f"TEST_spin_{uuid.uuid4().hex[:8]}@test.com"
        reg_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "TestPass123!", "name": "Spin Test"}
        )
        token = reg_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create raffle
        raffle_response = requests.post(
            f"{BASE_URL}/api/raffles",
            json={
                "title": "TEST Spin Raffle",
                "description": "Spin test",
                "prize": "Prize",
                "ticket_price": 10.0,
                "total_tickets": 10,
                "draw_date": "2026-12-31",
                "spins_before_winner": 2
            },
            headers=headers
        )
        raffle_id = raffle_response.json()["id"]
        
        # Assign some tickets
        requests.post(
            f"{BASE_URL}/api/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [1, 2, 3],
                "buyer_name": "Spin Buyer",
                "buyer_email": "spinbuyer@test.com"
            },
            headers=headers
        )
        
        return {"raffle_id": raffle_id, "headers": headers}
    
    def test_spin_wheel(self, raffle_with_sold_tickets):
        """POST /api/raffles/{id}/spin - perform wheel spin"""
        raffle_id = raffle_with_sold_tickets["raffle_id"]
        headers = raffle_with_sold_tickets["headers"]
        
        # First spin
        response = requests.post(
            f"{BASE_URL}/api/raffles/{raffle_id}/spin",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "spin_number" in data
        assert "spins_required" in data
        assert "is_final_spin" in data
        print(f"✅ Spin {data['spin_number']} of {data['spins_required']}")
    
    def test_preselect_winner(self, raffle_with_sold_tickets):
        """POST /api/raffles/{id}/preselect-winner - secret winner preselection"""
        raffle_id = raffle_with_sold_tickets["raffle_id"]
        headers = raffle_with_sold_tickets["headers"]
        
        # Preselect ticket #2 as winner
        response = requests.post(
            f"{BASE_URL}/api/raffles/{raffle_id}/preselect-winner",
            json={"winning_number": 2},
            headers=headers
        )
        
        assert response.status_code == 200
        print("✅ Winner preselected")
    
    def test_reset_spins(self, raffle_with_sold_tickets):
        """POST /api/raffles/{id}/reset-spins - reset spin counter"""
        raffle_id = raffle_with_sold_tickets["raffle_id"]
        headers = raffle_with_sold_tickets["headers"]
        
        # Do a spin first
        requests.post(f"{BASE_URL}/api/raffles/{raffle_id}/spin", headers=headers)
        
        # Reset
        response = requests.post(
            f"{BASE_URL}/api/raffles/{raffle_id}/reset-spins",
            headers=headers
        )
        
        assert response.status_code == 200
        
        # Verify reset
        raffle_response = requests.get(
            f"{BASE_URL}/api/raffles/{raffle_id}",
            headers=headers
        )
        assert raffle_response.json()["current_spin_count"] == 0
        print("✅ Spins reset")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
