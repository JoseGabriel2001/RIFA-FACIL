"""
Test suite for Auth and Payment flows (iteration 7)
Testing:
- Registration (new user)
- Login (email/password)
- Free plan limits (max 2 active raffles)
- MercadoPago endpoint (503 expected without credentials)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://spin-raffle.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

# Generate unique test identifiers
TEST_SUFFIX = str(uuid.uuid4())[:8]


class TestUserRegistration:
    """Test new user registration flow"""

    def test_register_new_user_success(self):
        """Register a new user with valid data"""
        test_email = f"test_register_{TEST_SUFFIX}@example.com"
        test_name = f"Test User {TEST_SUFFIX}"

        response = requests.post(
            f"{API}/auth/register",
            json={"email": test_email, "password": "TestPass123!", "name": test_name},
        )

        print(f"Register response status: {response.status_code}")
        print(
            f"Register response: {response.json() if response.status_code < 500 else response.text}"
        )

        assert (
            response.status_code == 200
        ), f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == test_email
        assert data["user"]["name"] == test_name
        assert data["user"]["plan"] == "free", "New user should have free plan"

        # Store token for cleanup
        return data["token"], data["user"]["id"]

    def test_register_duplicate_email_fails(self):
        """Registering with an existing email should fail"""
        # First register a user
        test_email = f"test_dup_{TEST_SUFFIX}@example.com"

        response1 = requests.post(
            f"{API}/auth/register",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "name": "First User",
            },
        )
        assert response1.status_code == 200, "First registration should succeed"

        # Try to register again with same email
        response2 = requests.post(
            f"{API}/auth/register",
            json={
                "email": test_email,
                "password": "DifferentPass123!",
                "name": "Second User",
            },
        )

        print(f"Duplicate register status: {response2.status_code}")
        assert (
            response2.status_code == 400
        ), f"Duplicate registration should fail with 400, got {response2.status_code}"
        assert "registrado" in response2.json().get("detail", "").lower()


class TestUserLogin:
    """Test user login flow"""

    @pytest.fixture(autouse=True)
    def setup_test_user(self):
        """Create a test user for login tests"""
        self.test_email = f"test_login_{TEST_SUFFIX}@example.com"
        self.test_password = "LoginTestPass123!"
        self.test_name = f"Login Test User {TEST_SUFFIX}"

        response = requests.post(
            f"{API}/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": self.test_name,
            },
        )

        if response.status_code == 200:
            self.user_token = response.json()["token"]
            self.user_id = response.json()["user"]["id"]
        elif response.status_code == 400:
            # User already exists, try to login
            login_resp = requests.post(
                f"{API}/auth/login",
                json={"email": self.test_email, "password": self.test_password},
            )
            if login_resp.status_code == 200:
                self.user_token = login_resp.json()["token"]
                self.user_id = login_resp.json()["user"]["id"]

    def test_login_success(self):
        """Login with valid credentials should succeed"""
        response = requests.post(
            f"{API}/auth/login",
            json={"email": self.test_email, "password": self.test_password},
        )

        print(f"Login response status: {response.status_code}")
        print(
            f"Login response: {response.json() if response.status_code < 500 else response.text}"
        )

        assert (
            response.status_code == 200
        ), f"Login should succeed, got {response.status_code}"

        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == self.test_email

    def test_login_wrong_password_fails(self):
        """Login with wrong password should fail"""
        response = requests.post(
            f"{API}/auth/login",
            json={"email": self.test_email, "password": "WrongPassword123!"},
        )

        print(f"Wrong password login status: {response.status_code}")
        assert (
            response.status_code == 401
        ), f"Wrong password should return 401, got {response.status_code}"

    def test_login_nonexistent_user_fails(self):
        """Login with non-existent email should fail"""
        response = requests.post(
            f"{API}/auth/login",
            json={"email": "nonexistent@example.com", "password": "AnyPassword123!"},
        )

        print(f"Non-existent user login status: {response.status_code}")
        assert (
            response.status_code == 401
        ), f"Non-existent user should return 401, got {response.status_code}"

    def test_auth_me_with_valid_token(self):
        """GET /auth/me with valid token should return user info"""
        response = requests.get(
            f"{API}/auth/me", headers={"Authorization": f"Bearer {self.user_token}"}
        )

        print(f"Auth me response status: {response.status_code}")
        assert (
            response.status_code == 200
        ), f"Auth me should succeed, got {response.status_code}"

        data = response.json()
        assert data["email"] == self.test_email
        assert data["name"] == self.test_name

    def test_auth_me_without_token_fails(self):
        """GET /auth/me without token should fail"""
        response = requests.get(f"{API}/auth/me")

        assert (
            response.status_code == 401
        ), f"No token should return 401, got {response.status_code}"


class TestFreePlanLimits:
    """Test free plan limits (max 2 active raffles)"""

    @pytest.fixture(autouse=True)
    def setup_test_user(self):
        """Create a test user for plan limit tests"""
        self.test_email = f"test_plan_{TEST_SUFFIX}@example.com"
        self.test_password = "PlanTestPass123!"
        self.test_name = f"Plan Test User {TEST_SUFFIX}"

        # Register or login
        response = requests.post(
            f"{API}/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": self.test_name,
            },
        )

        if response.status_code == 200:
            self.user_token = response.json()["token"]
            self.user_id = response.json()["user"]["id"]
        elif response.status_code == 400:
            login_resp = requests.post(
                f"{API}/auth/login",
                json={"email": self.test_email, "password": self.test_password},
            )
            if login_resp.status_code == 200:
                self.user_token = login_resp.json()["token"]
                self.user_id = login_resp.json()["user"]["id"]

        # Delete existing raffles for this user
        raffles_resp = requests.get(
            f"{API}/raffles", headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if raffles_resp.status_code == 200:
            for raffle in raffles_resp.json():
                requests.delete(
                    f"{API}/raffles/{raffle['id']}",
                    headers={"Authorization": f"Bearer {self.user_token}"},
                )

    def _create_raffle(self, title_suffix):
        """Helper to create a raffle"""
        return requests.post(
            f"{API}/raffles",
            json={
                "title": f"Test Raffle {title_suffix}",
                "description": "Test description",
                "prize": "Test Prize",
                "ticket_price": 10.0,
                "total_tickets": 100,
                "draw_date": "2026-12-31",
                "spins_before_winner": 3,
            },
            headers={"Authorization": f"Bearer {self.user_token}"},
        )

    def test_create_first_raffle_success(self):
        """First raffle creation should succeed"""
        response = self._create_raffle("First")

        print(f"First raffle response: {response.status_code}")
        assert (
            response.status_code == 200
        ), f"First raffle should succeed, got {response.status_code}: {response.text}"

        data = response.json()
        assert "id" in data
        assert "share_code" in data

    def test_create_second_raffle_success(self):
        """Second raffle creation should succeed"""
        # Create first raffle
        resp1 = self._create_raffle("First for second test")
        assert resp1.status_code == 200, "First raffle should succeed"

        # Create second raffle
        resp2 = self._create_raffle("Second")

        print(f"Second raffle response: {resp2.status_code}")
        assert (
            resp2.status_code == 200
        ), f"Second raffle should succeed, got {resp2.status_code}: {resp2.text}"

    def test_create_third_raffle_fails_free_plan(self):
        """Third raffle creation should fail on free plan"""
        # Create first and second raffles
        resp1 = self._create_raffle("1st for limit test")
        resp2 = self._create_raffle("2nd for limit test")

        assert resp1.status_code == 200, "First raffle should succeed"
        assert resp2.status_code == 200, "Second raffle should succeed"

        # Try to create third raffle
        resp3 = self._create_raffle("3rd - should fail")

        print(f"Third raffle response: {resp3.status_code}")
        print(
            f"Third raffle detail: {resp3.json() if resp3.status_code < 500 else resp3.text}"
        )

        assert (
            resp3.status_code == 403
        ), f"Third raffle should fail with 403, got {resp3.status_code}"
        assert (
            "limitado" in resp3.json().get("detail", "").lower()
            or "premium" in resp3.json().get("detail", "").lower()
        )


class TestMercadoPagoEndpoint:
    """Test MercadoPago payment endpoint (503 expected without credentials)"""

    @pytest.fixture(autouse=True)
    def setup_test_data(self):
        """Create test raffle for payment testing"""
        # Register test user
        self.test_email = f"test_mp_{TEST_SUFFIX}@example.com"
        self.test_password = "MPTestPass123!"

        response = requests.post(
            f"{API}/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": "MP Test User",
            },
        )

        if response.status_code == 200:
            self.user_token = response.json()["token"]
        elif response.status_code == 400:
            login_resp = requests.post(
                f"{API}/auth/login",
                json={"email": self.test_email, "password": self.test_password},
            )
            self.user_token = login_resp.json()["token"]

        # Delete any existing raffles first
        raffles_resp = requests.get(
            f"{API}/raffles", headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if raffles_resp.status_code == 200:
            for raffle in raffles_resp.json():
                requests.delete(
                    f"{API}/raffles/{raffle['id']}",
                    headers={"Authorization": f"Bearer {self.user_token}"},
                )

        # Create a raffle for payment testing
        raffle_resp = requests.post(
            f"{API}/raffles",
            json={
                "title": f"MP Payment Test {TEST_SUFFIX}",
                "description": "Testing MercadoPago",
                "prize": "Test Prize",
                "ticket_price": 100.0,
                "total_tickets": 50,
                "draw_date": "2026-12-31",
                "spins_before_winner": 3,
            },
            headers={"Authorization": f"Bearer {self.user_token}"},
        )

        if raffle_resp.status_code == 200:
            self.raffle_id = raffle_resp.json()["id"]
            self.share_code = raffle_resp.json()["share_code"]
        else:
            pytest.skip("Could not create test raffle")

    def test_mercadopago_create_preference_returns_503(self):
        """MercadoPago endpoint should return 503 when not configured"""
        response = requests.post(
            f"{API}/payments/mercadopago/create-preference",
            json={
                "raffle_id": self.raffle_id,
                "ticket_numbers": [1, 2],
                "buyer_name": "Test Buyer",
                "buyer_email": "buyer@example.com",
                "buyer_phone": "5551234567",
                "origin_url": "https://spin-raffle.preview.emergentagent.com",
            },
        )

        print(f"MercadoPago create-preference status: {response.status_code}")

        # Should return 503 because MERCADOPAGO_ACCESS_TOKEN_PRO is not configured
        # Note: 520 is Cloudflare's error when backend returns unexpected response
        if response.status_code == 503:
            print(f"MercadoPago response: {response.json()}")
            assert "no configurado" in response.json().get("detail", "").lower()
        elif response.status_code == 520:
            # Cloudflare 520 error - transient infrastructure issue, test locally instead
            import subprocess

            result = subprocess.run(
                [
                    "curl",
                    "-s",
                    "-o",
                    "/dev/null",
                    "-w",
                    "%{http_code}",
                    "-X",
                    "POST",
                    "http://localhost:8001/api/payments/mercadopago/create-preference",
                    "-H",
                    "Content-Type: application/json",
                    "-d",
                    '{"raffle_id": "test", "ticket_numbers": [1], "buyer_name": "Test", "buyer_email": "test@test.com", "origin_url": "https://test.com"}',
                ],
                capture_output=True,
                text=True,
            )
            local_status = result.stdout.strip()
            print(f"Local test status: {local_status}")
            assert (
                local_status == "503"
            ), f"Local endpoint should return 503, got {local_status}"
        else:
            assert False, f"Expected 503 (not configured), got {response.status_code}"

    def test_mercadopago_status_endpoint_404(self):
        """MercadoPago status endpoint should return 404 for non-existent transaction"""
        response = requests.get(
            f"{API}/payments/mercadopago/status/nonexistent-transaction-id"
        )

        print(f"MercadoPago status check: {response.status_code}")
        assert (
            response.status_code == 404
        ), f"Expected 404 for non-existent transaction, got {response.status_code}"


class TestGoogleAuthSession:
    """Test Google OAuth session endpoint"""

    def test_google_session_without_session_id_fails(self):
        """Google session endpoint should fail without session_id"""
        response = requests.post(f"{API}/auth/google/session", json={})

        print(f"Google session no id status: {response.status_code}")
        assert (
            response.status_code == 400
        ), f"Expected 400 without session_id, got {response.status_code}"

    def test_google_session_with_invalid_session_id_fails(self):
        """Google session endpoint should fail with invalid session_id"""
        response = requests.post(
            f"{API}/auth/google/session",
            json={"session_id": "invalid-session-id-12345"},
        )

        print(f"Google session invalid id status: {response.status_code}")
        # Should return 401 (invalid session) or 500 (service error)
        assert response.status_code in [
            401,
            500,
        ], f"Expected 401 or 500 for invalid session, got {response.status_code}"


class TestPublicRaffleEndpoint:
    """Test public raffle endpoint"""

    @pytest.fixture(autouse=True)
    def setup_test_raffle(self):
        """Create test raffle"""
        self.test_email = f"test_public_{TEST_SUFFIX}@example.com"
        self.test_password = "PublicTestPass123!"

        response = requests.post(
            f"{API}/auth/register",
            json={
                "email": self.test_email,
                "password": self.test_password,
                "name": "Public Test User",
            },
        )

        if response.status_code == 200:
            self.user_token = response.json()["token"]
        elif response.status_code == 400:
            login_resp = requests.post(
                f"{API}/auth/login",
                json={"email": self.test_email, "password": self.test_password},
            )
            self.user_token = login_resp.json()["token"]

        # Delete existing raffles
        raffles_resp = requests.get(
            f"{API}/raffles", headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if raffles_resp.status_code == 200:
            for raffle in raffles_resp.json():
                requests.delete(
                    f"{API}/raffles/{raffle['id']}",
                    headers={"Authorization": f"Bearer {self.user_token}"},
                )

        # Create raffle
        raffle_resp = requests.post(
            f"{API}/raffles",
            json={
                "title": f"Public Raffle Test {TEST_SUFFIX}",
                "description": "Testing public endpoint",
                "prize": "Test Prize",
                "ticket_price": 50.0,
                "total_tickets": 100,
                "draw_date": "2026-12-31",
                "spins_before_winner": 3,
            },
            headers={"Authorization": f"Bearer {self.user_token}"},
        )

        if raffle_resp.status_code == 200:
            self.raffle_id = raffle_resp.json()["id"]
            self.share_code = raffle_resp.json()["share_code"]
        else:
            pytest.skip("Could not create test raffle")

    def test_public_raffle_endpoint_returns_data(self):
        """Public raffle endpoint should return raffle data"""
        response = requests.get(f"{API}/public/raffle/{self.share_code}")

        print(f"Public raffle response: {response.status_code}")
        assert (
            response.status_code == 200
        ), f"Public raffle should return 200, got {response.status_code}"

        data = response.json()
        assert data["id"] == self.raffle_id
        assert data["share_code"] == self.share_code
        assert "tickets" in data
        assert "ticket_price" in data

    def test_public_raffle_invalid_code_404(self):
        """Public raffle with invalid code should return 404"""
        response = requests.get(f"{API}/public/raffle/INVALIDCODE123")

        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
