"""
Test suite for RifaFacil multiple spins feature.
Tests the spin wheel functionality with configurable spins before winner reveal.

Key features tested:
- POST /api/raffles/{id}/spin - multiple spins before winner reveal
  - Spins 1 to (N-1): is_final_spin=false, show_winner=false, display_number returned
  - Spin N (final): is_final_spin=true, show_winner=true, winning_number returned
- POST /api/raffles/{id}/reset-spins - reset spin counter
- Preselected winner is returned on final spin
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://spin-raffle.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

JWT_SECRET = "rifafacil-super-secret-key-2024"
TEST_PASSWORD = "TestPass123!"

def generate_test_suffix():
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))


class TestSpinWheelBasicFunctionality:
    """Test the basic spin wheel functionality with multiple spins before winner"""
    
    @pytest.fixture(scope="class")
    def test_setup(self):
        """Create user, raffle, and assign tickets for spin testing"""
        suffix = generate_test_suffix()
        email = f"spin_test_{suffix}@example.com"
        
        # Register new user
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": f"Spin Tester {suffix}"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json()['token']
        
        # Create raffle with 3 spins before winner (default)
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Spin Test Raffle {suffix}",
                "description": "Testing multiple spins functionality",
                "prize": "Test Prize",
                "ticket_price": 10.00,
                "total_tickets": 15,
                "draw_date": "2026-06-01",
                "excluded_numbers": [],
                "spins_before_winner": 3  # Requires 3 spins to reveal winner
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert raffle_response.status_code == 200, f"Raffle creation failed: {raffle_response.text}"
        raffle_data = raffle_response.json()
        raffle_id = raffle_data['id']
        
        # Assign tickets to simulate sales
        assign_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [1, 5, 10, 15],
                "buyer_name": "Test Buyer",
                "buyer_email": "testbuyer@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert assign_response.status_code == 200, f"Ticket assignment failed: {assign_response.text}"
        
        return {
            "token": token,
            "raffle_id": raffle_id,
            "email": email
        }
    
    def test_01_spin_endpoint_exists(self, test_setup):
        """Verify spin endpoint exists and requires authentication"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        # Without auth - should fail
        response = requests.post(f"{API_URL}/raffles/{raffle_id}/spin")
        assert response.status_code == 401, "Spin should require authentication"
        print("✅ Spin endpoint requires authentication")
    
    def test_02_first_spin_not_final(self, test_setup):
        """First spin (1 of 3) should NOT reveal winner"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Spin failed: {response.text}"
        data = response.json()
        
        # Verify response structure for non-final spin
        assert data['spin_number'] == 1, f"Expected spin_number=1, got {data.get('spin_number')}"
        assert data['spins_required'] == 3, f"Expected spins_required=3, got {data.get('spins_required')}"
        assert data['is_final_spin'] == False, f"First spin should NOT be final, got is_final_spin={data.get('is_final_spin')}"
        assert data['show_winner'] == False, f"First spin should NOT show winner, got show_winner={data.get('show_winner')}"
        assert 'display_number' in data, "Non-final spin should return display_number"
        assert 'winning_number' not in data, "Non-final spin should NOT return winning_number"
        
        print(f"✅ Spin 1/3 - is_final_spin: {data['is_final_spin']}, show_winner: {data['show_winner']}, display_number: {data['display_number']}")
    
    def test_03_second_spin_not_final(self, test_setup):
        """Second spin (2 of 3) should NOT reveal winner"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Spin failed: {response.text}"
        data = response.json()
        
        assert data['spin_number'] == 2, f"Expected spin_number=2, got {data.get('spin_number')}"
        assert data['is_final_spin'] == False, f"Second spin should NOT be final"
        assert data['show_winner'] == False, f"Second spin should NOT show winner"
        assert 'display_number' in data
        assert 'winning_number' not in data
        
        print(f"✅ Spin 2/3 - is_final_spin: {data['is_final_spin']}, show_winner: {data['show_winner']}, display_number: {data['display_number']}")
    
    def test_04_third_spin_is_final_with_winner(self, test_setup):
        """Third spin (3 of 3) SHOULD reveal winner"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Final spin failed: {response.text}"
        data = response.json()
        
        assert data['spin_number'] == 3, f"Expected spin_number=3, got {data.get('spin_number')}"
        assert data['is_final_spin'] == True, f"Third spin SHOULD be final, got is_final_spin={data.get('is_final_spin')}"
        assert data['show_winner'] == True, f"Third spin SHOULD show winner, got show_winner={data.get('show_winner')}"
        assert 'winning_number' in data, "Final spin should return winning_number"
        assert data['winning_number'] is not None, "winning_number should not be None"
        
        print(f"✅ Spin 3/3 (FINAL) - is_final_spin: {data['is_final_spin']}, show_winner: {data['show_winner']}, winning_number: {data['winning_number']}")


class TestResetSpinsFeature:
    """Test the reset spins functionality"""
    
    @pytest.fixture(scope="class")
    def test_setup(self):
        """Create user, raffle, and do some spins to test reset"""
        suffix = generate_test_suffix()
        email = f"reset_spin_{suffix}@example.com"
        
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": f"Reset Spin Tester {suffix}"
        })
        token = reg_response.json()['token']
        
        # Create raffle with 3 spins required
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Reset Spin Test {suffix}",
                "description": "Testing reset spins",
                "prize": "Reset Test Prize",
                "ticket_price": 5.00,
                "total_tickets": 10,
                "draw_date": "2026-06-15",
                "spins_before_winner": 3
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_id = raffle_response.json()['id']
        
        # Assign tickets
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [2, 4, 6, 8],
                "buyer_name": "Reset Buyer",
                "buyer_email": "resetbuyer@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        return {"token": token, "raffle_id": raffle_id}
    
    def test_01_do_spins_then_reset(self, test_setup):
        """Do 2 spins, then reset and verify counter is 0"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        # Do 2 spins
        for i in range(2):
            response = requests.post(
                f"{API_URL}/raffles/{raffle_id}/spin",
                json={},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data['spin_number'] == i + 1
        
        print("✅ Completed 2 spins")
        
        # Verify current_spin_count is 2
        raffle_response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert raffle_response.json()['current_spin_count'] == 2
        print("✅ Verified spin count is 2")
        
        # Reset spins
        reset_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/reset-spins",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert reset_response.status_code == 200
        print("✅ Reset spins called")
        
        # Verify spin count is 0
        raffle_response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert raffle_response.json()['current_spin_count'] == 0, \
            f"Expected current_spin_count=0 after reset, got {raffle_response.json().get('current_spin_count')}"
        print("✅ Spin count reset to 0")
    
    def test_02_spin_after_reset_starts_from_one(self, test_setup):
        """After reset, next spin should be spin #1"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['spin_number'] == 1, f"After reset, spin should be #1, got {data.get('spin_number')}"
        assert data['is_final_spin'] == False
        print(f"✅ First spin after reset is #1, is_final_spin: {data['is_final_spin']}")


class TestPreselectedWinnerOnFinalSpin:
    """Test that preselected winner is returned on the final spin"""
    
    @pytest.fixture(scope="class")
    def test_setup(self):
        """Create raffle with preselected winner"""
        suffix = generate_test_suffix()
        email = f"preselect_spin_{suffix}@example.com"
        
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": f"Preselect Spin Tester {suffix}"
        })
        token = reg_response.json()['token']
        
        # Create raffle with 2 spins required (easier to test)
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Preselect Spin Test {suffix}",
                "description": "Testing preselect on final spin",
                "prize": "Preselect Test Prize",
                "ticket_price": 10.00,
                "total_tickets": 10,
                "draw_date": "2026-07-01",
                "spins_before_winner": 2  # Only 2 spins required
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_id = raffle_response.json()['id']
        
        # Assign tickets including #7 which we'll preselect
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [3, 5, 7, 9],
                "buyer_name": "Preselect Buyer",
                "buyer_email": "preselectbuyer@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Preselect ticket #7 as winner
        preselect_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/preselect-winner",
            json={"winning_number": 7},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert preselect_response.status_code == 200
        
        return {"token": token, "raffle_id": raffle_id, "preselected_number": 7}
    
    def test_01_first_spin_doesnt_reveal_preselect(self, test_setup):
        """First spin should NOT reveal the preselected winner"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['is_final_spin'] == False
        assert data['show_winner'] == False
        assert 'winning_number' not in data
        print(f"✅ Spin 1/2 - is_final_spin: {data['is_final_spin']}, display_number: {data['display_number']}")
    
    def test_02_final_spin_returns_preselected_winner(self, test_setup):
        """Final spin (2nd) should return the preselected winner #7"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        preselected = test_setup['preselected_number']
        
        response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data['is_final_spin'] == True, f"Second spin should be final"
        assert data['show_winner'] == True, f"Final spin should show winner"
        assert data['winning_number'] == preselected, \
            f"Expected winning_number={preselected}, got {data.get('winning_number')}"
        
        print(f"✅ Spin 2/2 (FINAL) - winning_number: {data['winning_number']} matches preselected: {preselected}")


class TestSpinEdgeCases:
    """Test edge cases for spin functionality"""
    
    @pytest.fixture(scope="class")
    def test_setup(self):
        """Create user and raffle"""
        suffix = generate_test_suffix()
        email = f"edge_spin_{suffix}@example.com"
        
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": f"Edge Spin Tester {suffix}"
        })
        token = reg_response.json()['token']
        
        return {"token": token, "email": email}
    
    def test_01_spin_without_sold_tickets_fails(self, test_setup):
        """Cannot spin if no tickets are sold"""
        token = test_setup['token']
        suffix = generate_test_suffix()
        
        # Create raffle without assigning tickets
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Empty Raffle {suffix}",
                "description": "No tickets sold",
                "prize": "Empty Prize",
                "ticket_price": 5.00,
                "total_tickets": 5,
                "draw_date": "2026-08-01",
                "spins_before_winner": 2
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_id = raffle_response.json()['id']
        
        # Try to spin - should fail
        spin_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert spin_response.status_code == 400, f"Spin without sold tickets should fail"
        assert "boletos vendidos" in spin_response.json().get('detail', '').lower()
        print("✅ Spin without sold tickets correctly rejected")
    
    def test_02_spin_after_winner_set_fails(self, test_setup):
        """Cannot spin after winner has been set"""
        token = test_setup['token']
        suffix = generate_test_suffix()
        
        # Create raffle with 1 spin required
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Winner Set Raffle {suffix}",
                "description": "Testing spin after winner",
                "prize": "Winner Prize",
                "ticket_price": 5.00,
                "total_tickets": 5,
                "draw_date": "2026-08-15",
                "spins_before_winner": 1  # Only 1 spin - immediate winner
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_id = raffle_response.json()['id']
        
        # Assign tickets
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [1, 2],
                "buyer_name": "Quick Buyer",
                "buyer_email": "quickbuyer@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Do final spin to get winner
        spin_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        winning_number = spin_response.json()['winning_number']
        
        # Set winner officially
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/set-winner",
            json={"winning_number": winning_number},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Now try to spin again - should fail
        spin_again_response = requests.post(
            f"{API_URL}/raffles/{raffle_id}/spin",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should fail because either raffle is completed or winner already selected
        assert spin_again_response.status_code == 400
        print("✅ Spin after winner set correctly rejected")


class TestSpinCountPersistence:
    """Test that spin count persists across API calls"""
    
    @pytest.fixture(scope="class")
    def test_setup(self):
        """Create user and raffle"""
        suffix = generate_test_suffix()
        email = f"persist_spin_{suffix}@example.com"
        
        reg_response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "name": f"Persist Spin Tester {suffix}"
        })
        token = reg_response.json()['token']
        
        raffle_response = requests.post(
            f"{API_URL}/raffles",
            json={
                "title": f"Persist Spin Test {suffix}",
                "description": "Testing spin count persistence",
                "prize": "Persist Prize",
                "ticket_price": 10.00,
                "total_tickets": 10,
                "draw_date": "2026-09-01",
                "spins_before_winner": 5  # More spins to test
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        raffle_id = raffle_response.json()['id']
        
        # Assign tickets
        requests.post(
            f"{API_URL}/raffles/{raffle_id}/assign-tickets",
            json={
                "ticket_numbers": [1, 3, 5, 7, 9],
                "buyer_name": "Persist Buyer",
                "buyer_email": "persistbuyer@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        return {"token": token, "raffle_id": raffle_id}
    
    def test_spin_count_increments_correctly(self, test_setup):
        """Verify spin count increments with each spin call"""
        raffle_id = test_setup['raffle_id']
        token = test_setup['token']
        
        # Initial state should be 0
        raffle_response = requests.get(
            f"{API_URL}/raffles/{raffle_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert raffle_response.json()['current_spin_count'] == 0
        print("✅ Initial spin count is 0")
        
        # Do 3 spins and verify count increments
        for expected_count in [1, 2, 3]:
            spin_response = requests.post(
                f"{API_URL}/raffles/{raffle_id}/spin",
                json={},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert spin_response.status_code == 200
            spin_data = spin_response.json()
            assert spin_data['spin_number'] == expected_count
            
            # Verify raffle data has updated count
            raffle_response = requests.get(
                f"{API_URL}/raffles/{raffle_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert raffle_response.json()['current_spin_count'] == expected_count, \
                f"Expected current_spin_count={expected_count}, got {raffle_response.json().get('current_spin_count')}"
            print(f"✅ After spin {expected_count}, current_spin_count = {expected_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
