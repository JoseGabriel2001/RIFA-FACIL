import requests
import sys
import json
from datetime import datetime, timedelta
import time

class RaffleAPITester:
    def __init__(self, base_url="https://spin-raffle.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_raffle_id = None
        self.created_raffle_share_code = None
        self.uploaded_image_url = None

    def log_test(self, name, success, response_data=None, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if response_data and isinstance(response_data, dict):
                print(f"   Response: {json.dumps(response_data, indent=2)}")
        else:
            print(f"❌ {name} - FAILED")
            if error:
                print(f"   Error: {error}")
            if response_data:
                print(f"   Response: {response_data}")
        print("-" * 50)
        return success

    def run_api_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Set default headers
        request_headers = {'Content-Type': 'application/json'}
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            request_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers)

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = response.text

            return self.log_test(
                f"{name} ({method} {endpoint})", 
                success, 
                response_data if success else None,
                f"Status {response.status_code}, Expected {expected_status}: {response_data}" if not success else None
            ), response_data

        except Exception as e:
            return self.log_test(f"{name} ({method} {endpoint})", False, None, str(e)), None

    def test_health_check(self):
        """Test API health"""
        return self.run_api_test("Health Check", "GET", "", 200)

    def test_register_new_user(self):
        """Test user registration"""
        test_email = f"test_user_{int(time.time())}@example.com"
        data = {
            "email": test_email,
            "password": "TestPass123!",
            "name": "Test User"
        }
        success, response = self.run_api_test("Register New User", "POST", "auth/register", 200, data)
        
        if success and response and 'token' in response:
            self.token = response['token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
        
        return success, response

    def test_login_existing_user(self):
        """Test login with existing credentials"""
        data = {
            "email": "test@example.com",
            "password": "test123"
        }
        success, response = self.run_api_test("Login Existing User", "POST", "auth/login", 200, data)
        
        if success and response and 'token' in response:
            self.token = response['token']
            if 'user' in response:
                self.user_id = response['user'].get('id')
        
        return success, response

    def test_get_user_profile(self):
        """Test get current user profile"""
        if not self.token:
            return self.log_test("Get User Profile", False, None, "No token available")
        
        return self.run_api_test("Get User Profile", "GET", "auth/me", 200)

    def test_create_raffle(self):
        """Test raffle creation"""
        if not self.token:
            return self.log_test("Create Raffle", False, None, "No token available")
        
        # Future date for draw
        draw_date = (datetime.now() + timedelta(days=30)).isoformat()
        
        data = {
            "title": "Test Raffle",
            "description": "A test raffle for automated testing",
            "prize": "Test Prize - iPhone 15",
            "prize_image": "https://example.com/iphone.jpg",
            "ticket_price": 100.0,
            "total_tickets": 50,
            "draw_date": draw_date,
            "excluded_numbers": [13, 666]
        }
        
        success, response = self.run_api_test("Create Raffle", "POST", "raffles", 200, data)
        
        if success and response:
            self.created_raffle_id = response.get('id')
            self.created_raffle_share_code = response.get('share_code')
        
        return success

    def test_create_raffle_with_spins(self):
        """Test raffle creation with spins_before_winner field"""
        if not self.token:
            return self.log_test("Create Raffle with Spins", False, None, "No token available")
        
        # Future date for draw
        draw_date = (datetime.now() + timedelta(days=30)).isoformat()
        
        data = {
            "title": "Spinning Wheel Test Raffle",
            "description": "Test raffle with spinning wheel configuration",
            "prize": "Test Prize - Spinning Wheel",
            "ticket_price": 50.0,
            "total_tickets": 25,
            "draw_date": draw_date,
            "excluded_numbers": [13],
            "spins_before_winner": 5
        }
        
        success, response = self.run_api_test("Create Raffle with Spins", "POST", "raffles", 200, data)
        
        if success and response:
            # Verify spins field was saved by getting the raffle back
            if self.created_raffle_id:  # We already have a raffle, use new ID
                temp_raffle_id = response.get('id')
                if temp_raffle_id:
                    verify_success, verify_response = self.run_api_test("Verify Spins Field", "GET", f"raffles/{temp_raffle_id}", 200)
                    if verify_success and verify_response:
                        spins = verify_response.get('spins_before_winner')
                        if spins == 5:
                            print(f"   ✅ Spins field verified: {spins}")
                        else:
                            print(f"   ❌ Expected 5 spins, got: {spins}")
                            return False
        
        return success

    def test_get_my_raffles(self):
        """Test get user's raffles"""
        if not self.token:
            return self.log_test("Get My Raffles", False, None, "No token available")
        
        return self.run_api_test("Get My Raffles", "GET", "raffles", 200)

    def test_get_raffle_by_id(self):
        """Test get specific raffle"""
        if not self.token or not self.created_raffle_id:
            return self.log_test("Get Raffle by ID", False, None, "No token or raffle ID available")
        
        return self.run_api_test("Get Raffle by ID", "GET", f"raffles/{self.created_raffle_id}", 200)

    def test_update_raffle(self):
        """Test raffle update"""
        if not self.token or not self.created_raffle_id:
            return self.log_test("Update Raffle", False, None, "No token or raffle ID available")
        
        data = {
            "title": "Updated Test Raffle",
            "description": "Updated description for testing"
        }
        
        return self.run_api_test("Update Raffle", "PUT", f"raffles/{self.created_raffle_id}", 200, data)

    def test_get_public_raffle_existing(self):
        """Test get public raffle with existing share code"""
        success, response = self.run_api_test("Get Public Raffle (Existing)", "GET", "public/raffle/P5Q3EPBI", 200)
        return success

    def test_get_public_raffle_created(self):
        """Test get public raffle with newly created share code"""
        if not self.created_raffle_share_code:
            return self.log_test("Get Public Raffle (Created)", False, None, "No share code available")
        
        return self.run_api_test("Get Public Raffle (Created)", "GET", f"public/raffle/{self.created_raffle_share_code}", 200)

    def test_get_nonexistent_public_raffle(self):
        """Test get non-existent public raffle"""
        return self.run_api_test("Get Non-existent Public Raffle", "GET", "public/raffle/INVALID123", 404)

    def test_get_user_stats(self):
        """Test get user statistics"""
        if not self.token:
            return self.log_test("Get User Stats", False, None, "No token available")
        
        return self.run_api_test("Get User Stats", "GET", "stats", 200)

    def test_get_my_tickets(self):
        """Test get user's tickets"""
        if not self.token:
            return self.log_test("Get My Tickets", False, None, "No token available")
        
        return self.run_api_test("Get My Tickets", "GET", "my-tickets", 200)

    def test_stripe_checkout_creation(self):
        """Test Stripe checkout creation (should work with test data)"""
        if not self.created_raffle_id:
            return self.log_test("Stripe Checkout Creation", False, None, "No raffle ID available")
        
        data = {
            "raffle_id": self.created_raffle_id,
            "ticket_numbers": [1, 2, 3],
            "buyer_name": "Test Buyer",
            "buyer_email": "testbuyer@example.com",
            "buyer_phone": "5551234567",
            "origin_url": "https://spin-raffle.preview.emergentagent.com"
        }
        
        return self.run_api_test("Stripe Checkout Creation", "POST", "payments/stripe/checkout", 200, data)

    def test_paypal_create_order_no_config(self):
        """Test PayPal order creation (should fail due to no config)"""
        if not self.created_raffle_id:
            return self.log_test("PayPal Create Order (No Config)", False, None, "No raffle ID available")
        
        data = {
            "raffle_id": self.created_raffle_id,
            "ticket_numbers": [4, 5],
            "buyer_name": "Test Buyer",
            "buyer_email": "testbuyer@example.com",
            "buyer_phone": "5551234567",
            "origin_url": "https://spin-raffle.preview.emergentagent.com"
        }
        
        return self.run_api_test("PayPal Create Order (No Config)", "POST", "payments/paypal/create-order", 503, data)

    def test_upgrade_plan(self):
        """Test plan upgrade"""
        if not self.token:
            return self.log_test("Upgrade Plan", False, None, "No token available")
        
        return self.run_api_test("Upgrade Plan", "POST", "upgrade-plan", 200)

    def test_set_manual_winner(self):
        """Test manual winner selection"""
        if not self.token or not self.created_raffle_id:
            return self.log_test("Set Manual Winner", False, None, "No token or raffle ID available")
        
        data = {
            "winning_number": 1
        }
        
        return self.run_api_test("Set Manual Winner", "POST", f"raffles/{self.created_raffle_id}/set-winner", 200, data)

    def test_image_upload(self):
        """Test image upload functionality"""
        import io
        
        # Create a simple test image (1x1 PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc```\x00\x00\x00\x04\x00\x01\xdd\x8d\xb4\x1c\x00\x00\x00\x00IEND\xaeB`\x82'
        
        url = f"{self.base_url}/upload-image"
        
        try:
            files = {'file': ('test.png', test_image_data, 'image/png')}
            headers = {}
            if self.token:
                headers['Authorization'] = f'Bearer {self.token}'
            
            response = requests.post(url, files=files, headers=headers)
            success = response.status_code == 200
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            if success:
                # Store the uploaded image URL for cleanup later
                self.uploaded_image_url = response_data.get('image_url')
                
            return self.log_test(
                "Image Upload", 
                success, 
                response_data if success else None,
                f"Status {response.status_code}, Expected 200: {response_data}" if not success else None
            ), response_data
        except Exception as e:
            return self.log_test("Image Upload", False, None, str(e)), None

    def test_get_uploaded_image(self):
        """Test retrieving uploaded image"""
        if not hasattr(self, 'uploaded_image_url') or not self.uploaded_image_url:
            return self.log_test("Get Uploaded Image", False, None, "No uploaded image URL available")
        
        # The image URL is relative, so construct the full URL
        image_url = f"{self.base_url.replace('/api', '')}{self.uploaded_image_url}"
        
        try:
            response = requests.get(image_url)
            success = response.status_code == 200
            
            # Check if it's actually image content
            content_type = response.headers.get('content-type', '')
            is_image = content_type.startswith('image/')
            
            return self.log_test(
                "Get Uploaded Image", 
                success and is_image, 
                {"content_type": content_type, "size": len(response.content)} if success else None,
                f"Status {response.status_code} or invalid content type {content_type}" if not (success and is_image) else None
            ), response.content if success else None
        except Exception as e:
            return self.log_test("Get Uploaded Image", False, None, str(e)), None

    def test_create_raffle_with_image(self):
        """Test creating raffle with uploaded image"""
        if not self.token:
            return self.log_test("Create Raffle with Image", False, None, "No token available")
        
        if not hasattr(self, 'uploaded_image_url') or not self.uploaded_image_url:
            return self.log_test("Create Raffle with Image", False, None, "No uploaded image URL available")
        
        # Future date for draw
        draw_date = (datetime.now() + timedelta(days=30)).isoformat()
        
        # Construct full image URL
        full_image_url = f"https://spin-raffle.preview.emergentagent.com{self.uploaded_image_url}"
        
        data = {
            "title": "Raffle with Image Test",
            "description": "Testing raffle creation with uploaded image",
            "prize": "Test Prize with Image",
            "prize_image": full_image_url,
            "ticket_price": 75.0,
            "total_tickets": 30,
            "draw_date": draw_date,
            "excluded_numbers": [7],
            "spins_before_winner": 3
        }
        
        success, response = self.run_api_test("Create Raffle with Image", "POST", "raffles", 200, data)
        
        if success and response:
            # Verify image URL was saved correctly
            raffle_id = response.get('id')
            if raffle_id:
                verify_success, verify_response = self.run_api_test("Verify Image URL", "GET", f"raffles/{raffle_id}", 200)
                if verify_success and verify_response:
                    saved_image = verify_response.get('prize_image')
                    if saved_image == full_image_url:
                        print(f"   ✅ Image URL verified: {saved_image}")
                    else:
                        print(f"   ❌ Expected {full_image_url}, got: {saved_image}")
                        return False
        
        return success

    def test_create_cash_order(self):
        """Test cash payment order creation"""
        if not self.created_raffle_id:
            return self.log_test("Create Cash Order", False, None, "No raffle ID available")
        
        data = {
            "raffle_id": self.created_raffle_id,
            "ticket_numbers": [5, 6, 7],
            "buyer_name": "María González",
            "buyer_email": "maria@example.com",
            "buyer_phone": "5551234567"
        }
        
        success, response = self.run_api_test("Create Cash Order", "POST", "payments/cash/create-order", 200, data)
        
        if success and response:
            self.cash_order_id = response.get('order_id')
            print(f"   💰 Cash Order ID: {self.cash_order_id}")
        
        return success

    def test_get_cash_orders(self):
        """Test getting cash orders for a raffle"""
        if not self.token or not self.created_raffle_id:
            return self.log_test("Get Cash Orders", False, None, "No token or raffle ID available")
        
        return self.run_api_test("Get Cash Orders", "GET", f"raffles/{self.created_raffle_id}/cash-orders", 200)

    def test_validate_cash_order_approve(self):
        """Test approving a cash order"""
        if not self.token or not self.created_raffle_id or not hasattr(self, 'cash_order_id'):
            return self.log_test("Validate Cash Order (Approve)", False, None, "Missing requirements")
        
        data = {
            "order_id": self.cash_order_id,
            "action": "approve"
        }
        
        return self.run_api_test("Validate Cash Order (Approve)", "POST", f"raffles/{self.created_raffle_id}/validate-order", 200, data)

    def test_create_another_cash_order(self):
        """Test creating another cash order for rejection test"""
        if not self.created_raffle_id:
            return self.log_test("Create Another Cash Order", False, None, "No raffle ID available")
        
        data = {
            "raffle_id": self.created_raffle_id,
            "ticket_numbers": [8, 9],
            "buyer_name": "Juan Pérez", 
            "buyer_email": "juan@example.com",
            "buyer_phone": "5559876543"
        }
        
        success, response = self.run_api_test("Create Another Cash Order", "POST", "payments/cash/create-order", 200, data)
        
        if success and response:
            self.cash_order_id_reject = response.get('order_id')
            print(f"   💰 Cash Order ID (for rejection): {self.cash_order_id_reject}")
        
        return success

    def test_validate_cash_order_reject(self):
        """Test rejecting a cash order"""
        if not self.token or not self.created_raffle_id or not hasattr(self, 'cash_order_id_reject'):
            return self.log_test("Validate Cash Order (Reject)", False, None, "Missing requirements")
        
        data = {
            "order_id": self.cash_order_id_reject,
            "action": "reject"
        }
        
        return self.run_api_test("Validate Cash Order (Reject)", "POST", f"raffles/{self.created_raffle_id}/validate-order", 200, data)

    def test_assign_tickets_directly(self):
        """Test direct ticket assignment by admin"""
        if not self.token or not self.created_raffle_id:
            return self.log_test("Assign Tickets Directly", False, None, "No token or raffle ID available")
        
        data = {
            "ticket_numbers": [10, 11],
            "buyer_name": "Pedro Admin Assign",
            "buyer_email": "pedro@example.com",
            "buyer_phone": "5552468135"
        }
        
        return self.run_api_test("Assign Tickets Directly", "POST", f"raffles/{self.created_raffle_id}/assign-tickets", 200, data)

    def test_delete_raffle(self):
        """Test raffle deletion (run last)"""
        if not self.token or not self.created_raffle_id:
            return self.log_test("Delete Raffle", False, None, "No token or raffle ID available")
        
        return self.run_api_test("Delete Raffle", "DELETE", f"raffles/{self.created_raffle_id}", 200)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting RifaFacil API Tests")
        print("=" * 60)
        
        # Basic API tests
        self.test_health_check()
        
        # Try login with existing user first, fallback to registration
        login_success, _ = self.test_login_existing_user()
        if not login_success:
            print("⚠️  Login failed, trying registration...")
            self.test_register_new_user()
        
        # Authenticated tests
        self.test_get_user_profile()
        self.test_create_raffle()
        self.test_create_raffle_with_spins()
        self.test_get_my_raffles()
        self.test_get_raffle_by_id()
        self.test_update_raffle()
        
        # Public tests
        self.test_get_public_raffle_existing()
        self.test_get_public_raffle_created()
        self.test_get_nonexistent_public_raffle()
        
        # Stats and user data
        self.test_get_user_stats()
        self.test_get_my_tickets()
        
        # Image upload tests
        self.test_image_upload()
        self.test_get_uploaded_image()
        self.test_create_raffle_with_image()
        
        # Payment tests
        self.test_stripe_checkout_creation()
        self.test_paypal_create_order_no_config()
        
        # Cash payment system tests
        self.test_create_cash_order()
        self.test_get_cash_orders()
        self.test_validate_cash_order_approve()
        self.test_create_another_cash_order()
        self.test_validate_cash_order_reject()
        self.test_assign_tickets_directly()
        
        # Plan management
        self.test_upgrade_plan()
        
        # Winner selection
        self.test_set_manual_winner()
        
        # Cleanup (run last)
        # Note: Not deleting to preserve for frontend testing
        # self.test_delete_raffle()
        
        # Final summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.created_raffle_id:
            print(f"\n📝 Created Test Raffle ID: {self.created_raffle_id}")
        if self.created_raffle_share_code:
            print(f"🔗 Share Code: {self.created_raffle_share_code}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RaffleAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())