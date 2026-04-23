"""
Test suite for RifaFacil preselect winner feature and related admin functionality.
This tests the secret preselection feature where admin can preselect a winner 
that will be guaranteed when spinning the wheel.

Key features tested:
- User registration and authentication
- Raffle creation by admin
- Direct ticket assignment by admin
- Preselect winner endpoint
- Set winner endpoint
- /api/auth/me returns is_super_admin and premium plan
"""
import pytest
import requests
import os
import time
import random
import string

# Use the public URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://spin-raffle.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

JWT_SECRET = "rifafacil-super-secret-key-2024"

# Generate unique test credentials
TEST_SUFFIX = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
TEST_USER_EMAIL = f"test_admin_{TEST_SUFFIX}@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = f"Test Admin {TEST_SUFFIX}"


class TestAuthAndUserProfile:
    """Test authentication and user profile endpoints"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a test user and return credentials"""
        response = requests.post(f"{API_URL}/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        return data
    
    def test_1_register_new_user(self, registered_user):
        """Test user registration"""
        assert registered_user['user']['email'] == TEST_USER_EMAIL
        assert registered_user['user']['name'] == TEST_USER_NAME
        assert registered_user['user']['plan'] == 'free'
        assert registered_user['user'].get('is_super_admin', False) == False
        print(f"✅ User registered: {TEST_USER_EMAIL}")
    
    def test_2_login_user(self, registered_user):
        """Test user login"""
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data['user']['email'] == TEST_USER_EMAIL
        print("✅ User login successful")
    
    def test_3_get_user_profile(self, registered_user):
        """Test /api/auth/me endpoint"""
        token = registered_user['token']
        response = requests.get(f"{API_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['email'] == TEST_USER_EMAIL
        assert 'plan' in data
        assert 'is_super_admin' in data
        print(f"✅ Profile retrieved - Plan: {data['plan']}, Super Admin: {data['is_super_admin']}")
    
    def test_4_make_super_admin(self, registered_user):
        """Test making user a super admin"""
        response = requests.post(
            f"{API_URL}/admin/make-super-admin",
            params={
                "email": TEST_USER_EMAIL,
                "secret_key": JWT_SECRET
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "super administrador" in data['message'].lower()
        print(f"✅ User {TEST_USER_EMAIL} is now super admin")
    
    def test_5_verify_super_admin_status(self, registered_user):
        """Verify user has super admin status and premium plan after make-super-admin"""
        token = registered_user['token']
        response = requests.get(f"{API_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data['is_super_admin'] == True, f"Expected is_super_admin=True, got {data.get('is_super_admin')}"
        assert data['plan'] == 'premium', f"Expected plan='premium', got {data.get('plan')}"
        print(f"✅ Super admin verified - Plan: {data['plan']}, is_super_admin: {data['is_super_admin']}")


class TestRaffleCreationAndManagement:
    """Test raffle creation, ticket assignment, and winner selection"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for existing or new user"""
        # Try to login first
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()['token']
        
        # If login fails, register
        response = requests.post(f"{API_URL}/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        })
        assert response.status_code == 200
        
        # Make super admin
        requests.post(
            f"{API_URL}/admin/make-super-admin",
            params={"email": TEST_USER_EMAIL, "secret_key": JWT_SECRET}
        )
        
        return response.json()['token']
    
    @pytest.fixture(scope="class")
    def created_raffle(self, auth_token):
        """Create a test raffle"""
        raffle_data = {
            "title": f"Test Raffle {TEST_SUFFIX}",
            "description": "Raffle for testing preselect winner feature",
            "prize": "Test Prize - $100 Gift Card",
            "ticket_price": 10.00,
            "total_tickets": 20,
            "draw_date": "2026-02-15",
            "excluded_numbers": [],
            "spins_before_winner": 3
        }
        response = requests.post(
            f"{API_URL}/raffles",
            json=raffle_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Raffle creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "share_code" in data
        print(f"✅ Raffle created: {data['id']}")
        return data
    
    def test_1_create_raffle(self, created_raffle):
        """Verify raffle was created successfully"""
        assert created_raffle['id'] is not None
        assert created_raffle['share_code'] is not None
        print(f"✅ Raffle ID: {created_raffle['id']}, Share Code: {created_raffle['share_code']}")
    
    def test_2_get_raffle_details(self, auth_token, created_raffle):
        """Get raffle details and verify structure"""
        raffle_id = created_raffle['id']
        response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['id'] == raffle_id
        assert 'tickets' in data
        assert len(data['tickets']) == 20
        assert data['preselected_winner'] is None
        print(f"✅ Raffle has {len(data['tickets'])} tickets, preselected_winner: {data.get('preselected_winner')}")
    
    def test_3_assign_tickets_by_admin(self, auth_token, created_raffle):
        """Admin assigns tickets directly (simulating sales)"""
        raffle_id = created_raffle['id']
        # Assign tickets 5, 10, 15 to a test buyer
        assign_data = {
            "ticket_numbers": [5, 10, 15],
            "buyer_name": "Test Buyer",
            "buyer_email": "testbuyer@example.com",
            "buyer_phone": "+1234567890"
        }
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json=assign_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Assign tickets failed: {response.text}"
        data = response.json()
        assert 'assigned_tickets' in data
        assert set(data['assigned_tickets']) == {5, 10, 15}
        print(f"✅ Tickets assigned: {data['assigned_tickets']}")
    
    def test_4_verify_tickets_sold(self, auth_token, created_raffle):
        """Verify tickets are now marked as sold"""
        raffle_id = created_raffle['id']
        response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        sold_tickets = [t for t in data['tickets'] if t['status'] == 'sold']
        sold_numbers = [t['number'] for t in sold_tickets]
        
        assert len(sold_tickets) == 3
        assert 5 in sold_numbers
        assert 10 in sold_numbers
        assert 15 in sold_numbers
        print(f"✅ Sold tickets verified: {sold_numbers}")


class TestPreselectWinnerFeature:
    """Test the secret preselect winner functionality"""
    
    @pytest.fixture(scope="class")
    def test_setup(self):
        """Setup: create user, make super admin, create raffle, assign tickets"""
        # Register/login
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            # Register new user
            suffix = ''.join(random.choices(string.ascii_lowercase, k=4))
            email = f"preselect_test_{suffix}@example.com"
            response = requests.post(f"{API_URL}/auth/register", json={
                "email": email,
                "password": TEST_USER_PASSWORD,
                "name": f"Preselect Tester {suffix}"
            })
            assert response.status_code == 200
            # Make super admin
            requests.post(f"{API_URL}/admin/make-super-admin", 
                params={"email": email, "secret_key": JWT_SECRET})
        
        token = response.json()['token']
        
        # Create raffle
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Preselect Test Raffle {TEST_SUFFIX}",
                "description": "Testing preselect winner",
                "prize": "Preselect Test Prize",
                "ticket_price": 5.00,
                "total_tickets": 10,
                "draw_date": "2026-03-01",
                "spins_before_winner": 2
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert raffle_response.status_code == 200
        raffle_id = raffle_response.json()['id']
        
        # Assign some tickets
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [3, 5, 7],
                "buyer_name": "Preselect Buyer",
                "buyer_email": "preselectbuyer@test.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        return {"token": token, "raffle_id": raffle_id}
    
    def test_1_preselect_winner_endpoint_exists(self, test_setup):
        """Test that preselect-winner endpoint exists and accepts POST"""
        token = test_setup['token']
        raffle_id = test_setup['raffle_id']
        
        # Preselect number 5 as winner
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/preselect-winner",
            json={"winning_number": 5},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Preselect failed: {response.text}"
        data = response.json()
        assert data['preselected_winner'] == 5
        print(f"✅ Preselect winner endpoint works - preselected_winner: {data['preselected_winner']}")
    
    def test_2_verify_preselection_stored(self, test_setup):
        """Verify preselected winner is stored in raffle data"""
        token = test_setup['token']
        raffle_id = test_setup['raffle_id']
        
        response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['preselected_winner'] == 5
        print(f"✅ Preselected winner stored in raffle: {data['preselected_winner']}")
    
    def test_3_preselect_invalid_number_fails(self, test_setup):
        """Test that preselecting an excluded/invalid number fails"""
        token = test_setup['token']
        raffle_id = test_setup['raffle_id']
        
        # Try to preselect number 100 (doesn't exist)
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/preselect-winner",
            json={"winning_number": 100},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400
        print("✅ Invalid number correctly rejected")
    
    def test_4_clear_preselection(self, test_setup):
        """Test clearing the preselected winner"""
        token = test_setup['token']
        raffle_id = test_setup['raffle_id']
        
        response = requests.delete(
            f"{API_URL}/raffles/{raffle_id}/preselect-winner",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        # Verify cleared
        raffle_response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert raffle_response.json()['preselected_winner'] is None
        print("✅ Preselection cleared successfully")
    
    def test_5_preselect_and_set_winner(self, test_setup):
        """Test that set-winner works after preselection"""
        token = test_setup['token']
        raffle_id = test_setup['raffle_id']
        
        # Preselect number 7
        preselect_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/preselect-winner",
            json={"winning_number": 7},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert preselect_response.status_code == 200
        
        # Now set winner to 7 (simulating wheel landing)
        set_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/set-winner",
            json={"winning_number": 7},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert set_response.status_code == 200
        data = set_response.json()
        assert data['winning_number'] == 7
        print(f"✅ Winner set to preselected number: {data['winning_number']}")
    
    def test_6_verify_raffle_completed(self, test_setup):
        """Verify raffle status after winner set"""
        token = test_setup['token']
        raffle_id = test_setup['raffle_id']
        
        response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'completed'
        assert data['winning_number'] == 7
        # Preselection should be cleared after setting winner
        assert data['preselected_winner'] is None
        print(f"✅ Raffle completed - winning_number: {data['winning_number']}, status: {data['status']}")


class TestPublicRaffleEndpoint:
    """Test public raffle endpoint doesn't expose preselected_winner"""
    
    @pytest.fixture(scope="class")
    def public_raffle_setup(self):
        """Create a raffle with preselected winner for public test"""
        suffix = ''.join(random.choices(string.ascii_lowercase, k=4))
        email = f"public_test_{suffix}@example.com"
        
        # Register
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": TEST_USER_PASSWORD,
            "name": f"Public Tester {suffix}"
        })
        token = reg_response.json()['token']
        
        # Create raffle
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Public Test Raffle {suffix}",
                "description": "Testing public visibility",
                "prize": "Public Test Prize",
                "ticket_price": 10.00,
                "total_tickets": 10,
                "draw_date": "2026-03-15"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_data = raffle_response.json()
        raffle_id = raffle_data['id']
        share_code = raffle_data['share_code']
        
        # Assign some tickets
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [1, 2, 3],
                "buyer_name": "Public Buyer",
                "buyer_email": "publicbuyer@test.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Preselect winner
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/preselect-winner",
            json={"winning_number": 2},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        return {"token": token, "raffle_id": raffle_id, "share_code": share_code}
    
    def test_public_raffle_does_not_expose_preselection(self, public_raffle_setup):
        """Verify public raffle endpoint doesn't show preselected_winner"""
        share_code = public_raffle_setup['share_code']
        
        response = requests.get(f"{API_URL}/public/raffle/{share_code}")
        assert response.status_code == 200
        data = response.json()
        
        # The preselected_winner field should NOT be in public response
        assert 'preselected_winner' not in data, "preselected_winner should not be exposed publicly!"
        
        # But other fields should exist
        assert 'title' in data
        assert 'tickets' in data
        assert 'share_code' in data
        print("✅ Public raffle does NOT expose preselected_winner")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
