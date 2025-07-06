#!/usr/bin/env python3
"""
Authentication System Test Suite
Comprehensive testing for the VoIP server authentication and functionality.
"""

import asyncio
import json
import requests
import websockets
import time
from typing import Dict, Any, Optional

class VoIPAuthTester:
    def __init__(self):
        self.http_base = "http://localhost:3000"
        self.ws_base = "ws://localhost:8080"
        self.test_users = []
        self.sessions = {}
        
    def print_test_header(self, test_name: str):
        """Print a formatted test header"""
        print(f"\n{'='*60}")
        print(f"🧪 {test_name}")
        print('='*60)
    
    def test_http_api(self) -> bool:
        """Test HTTP API endpoints"""
        self.print_test_header("HTTP API Testing")
        
        try:
            # Test server stats
            response = requests.get(f"{self.http_base}/api/stats")
            if response.status_code == 200:
                stats = response.json()
                print(f"✅ Server stats: {stats}")
            else:
                print(f"❌ Stats endpoint failed: {response.status_code}")
                return False
                
            # Test registration
            user_data = {
                "username": f"testuser_{int(time.time())}",
                "password": "testpass123"
            }
            
            response = requests.post(
                f"{self.http_base}/api/register",
                json=user_data
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"✅ User registration successful: {result['user']['username']}")
                    self.test_users.append(result['user'])
                    self.sessions[result['user']['id']] = result['session_token']
                    return True
                else:
                    print(f"❌ Registration failed: {result.get('error')}")
                    return False
            else:
                print(f"❌ Registration request failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ HTTP API test error: {e}")
            return False
    
    def test_authentication(self) -> bool:
        """Test login and session validation"""
        self.print_test_header("Authentication Testing")
        
        try:
            # Test login with admin credentials
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = requests.post(
                f"{self.http_base}/api/login",
                json=login_data
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ Admin login successful")
                    admin_token = result['session_token']
                    
                    # Test session validation
                    validation_response = requests.post(
                        f"{self.http_base}/api/validate-session",
                        json={"session_token": admin_token}
                    )
                    
                    if validation_response.status_code == 200:
                        validation_result = validation_response.json()
                        if validation_result.get('valid'):
                            print("✅ Session validation successful")
                            return True
                        else:
                            print("❌ Session validation failed")
                            return False
                    else:
                        print(f"❌ Session validation request failed: {validation_response.status_code}")
                        return False
                else:
                    print(f"❌ Admin login failed: {result.get('error')}")
                    return False
            else:
                print(f"❌ Login request failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication test error: {e}")
            return False
    
    async def test_websocket_connection(self) -> bool:
        """Test WebSocket connection and authentication"""
        self.print_test_header("WebSocket Connection Testing")
        
        try:
            # Get admin session token
            login_response = requests.post(
                f"{self.http_base}/api/login",
                json={"username": "admin", "password": "admin123"}
            )
            
            if login_response.status_code != 200:
                print("❌ Failed to get admin session for WebSocket test")
                return False
                
            admin_data = login_response.json()
            session_token = admin_data['session_token']
            
            # Test WebSocket connection
            async with websockets.connect(self.ws_base) as websocket:
                # Send authentication message
                auth_message = {
                    "type": "auth-connect",
                    "data": {"session_token": session_token},
                    "from": admin_data['user']['id'],
                    "to": "server",
                    "timestamp": time.time()
                }
                
                await websocket.send(json.dumps(auth_message))
                
                # Wait for response
                response = await websocket.recv()
                message = json.loads(response)
                
                if message.get('type') == 'websocket-connected':
                    print("✅ WebSocket authentication successful")
                    
                    # Test adding a contact
                    add_contact_message = {
                        "type": "add-contact",
                        "data": {"username": "nonexistent_user"},
                        "from": admin_data['user']['id'],
                        "to": "server",
                        "timestamp": time.time()
                    }
                    
                    await websocket.send(json.dumps(add_contact_message))
                    
                    # Wait for add-contact result
                    response = await websocket.recv()
                    result_message = json.loads(response)
                    
                    if result_message.get('type') == 'add-contact-result':
                        print(f"✅ Add contact response received: {result_message['data']}")
                        return True
                    else:
                        print(f"❌ Unexpected response: {result_message}")
                        return False
                        
                elif message.get('type') == 'auth-error':
                    print(f"❌ WebSocket authentication failed: {message.get('data', {}).get('error')}")
                    return False
                else:
                    print(f"❌ Unexpected WebSocket response: {message}")
                    return False
                    
        except Exception as e:
            print(f"❌ WebSocket test error: {e}")
            return False
    
    def test_user_management(self) -> bool:
        """Test user registration and management"""
        self.print_test_header("User Management Testing")
        
        try:
            # Test multiple user registration
            test_users = []
            for i in range(3):
                user_data = {
                    "username": f"testuser_{i}_{int(time.time())}",
                    "password": "testpass123"
                }
                
                response = requests.post(
                    f"{self.http_base}/api/register",
                    json=user_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        test_users.append(result['user'])
                        print(f"✅ User {user_data['username']} registered successfully")
                    else:
                        print(f"❌ User registration failed: {result.get('error')}")
                        return False
                else:
                    print(f"❌ Registration request failed: {response.status_code}")
                    return False
            
            print(f"✅ Successfully registered {len(test_users)} test users")
            
            # Test duplicate username
            duplicate_data = {
                "username": test_users[0]['username'],
                "password": "differentpass"
            }
            
            response = requests.post(
                f"{self.http_base}/api/register",
                json=duplicate_data
            )
            
            if response.status_code == 400:
                result = response.json()
                if 'already exists' in result.get('error', '').lower():
                    print("✅ Duplicate username prevention working")
                    return True
                else:
                    print(f"❌ Unexpected error for duplicate: {result}")
                    return False
            else:
                print(f"❌ Duplicate username should have been rejected")
                return False
                
        except Exception as e:
            print(f"❌ User management test error: {e}")
            return False
    
    def test_server_statistics(self) -> bool:
        """Test server statistics and monitoring"""
        self.print_test_header("Server Statistics Testing")
        
        try:
            response = requests.get(f"{self.http_base}/api/stats")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ['total_users', 'online_users', 'active_sessions', 'active_websockets']
                
                for field in required_fields:
                    if field in stats:
                        print(f"✅ {field}: {stats[field]}")
                    else:
                        print(f"❌ Missing stats field: {field}")
                        return False
                        
                # Verify reasonable values
                if stats['total_users'] >= 1:  # At least admin user
                    print("✅ Total users count is reasonable")
                else:
                    print("❌ Total users count seems incorrect")
                    return False
                    
                return True
            else:
                print(f"❌ Stats request failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Statistics test error: {e}")
            return False
    
    async def run_all_tests(self) -> Dict[str, bool]:
        """Run all test suites"""
        print("""
    ╔════════════════════════════════════════════════════════════════════════╗
    ║                    🧪 VoIP Authentication Test Suite                   ║
    ║                                                                        ║
    ║  Testing complete system functionality:                                ║
    ║  • HTTP API endpoints                                                  ║
    ║  • User authentication and session management                          ║
    ║  • WebSocket connections and messaging                                 ║
    ║  • User registration and management                                    ║
    ║  • Server statistics and monitoring                                    ║
    ╚════════════════════════════════════════════════════════════════════════╝
        """)
        
        results = {}
        
        # Run HTTP tests
        results['http_api'] = self.test_http_api()
        results['authentication'] = self.test_authentication()
        results['user_management'] = self.test_user_management()
        results['server_statistics'] = self.test_server_statistics()
        
        # Run WebSocket tests
        results['websocket_connection'] = await self.test_websocket_connection()
        
        return results
    
    def print_summary(self, results: Dict[str, bool]):
        """Print test summary"""
        print(f"\n{'='*60}")
        print("📊 TEST SUMMARY")
        print('='*60)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title():<30} {status}")
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! The VoIP authentication system is working correctly.")
        else:
            print("⚠️  Some tests failed. Please check the server logs and configuration.")
        
        return passed == total

async def main():
    """Main test function"""
    tester = VoIPAuthTester()
    
    try:
        results = await tester.run_all_tests()
        success = tester.print_summary(results)
        
        if success:
            print("""
    🚀 System Ready! 
    
    Your VoIP server with authentication is fully functional.
    You can now:
    
    1. Open http://localhost:3000 in your browser
    2. Register new users or login with admin/admin123
    3. Add contacts by username
    4. Start making voice calls!
            """)
        else:
            print("""
    ⚠️  System Issues Detected
    
    Some tests failed. Please check:
    
    1. Server is running on the correct ports
    2. All dependencies are installed
    3. Frontend is built and available
    4. No network connectivity issues
            """)
            
    except Exception as e:
        print(f"❌ Test suite error: {e}")
        print("\nPlease ensure the VoIP server is running before running tests.")

if __name__ == "__main__":
    asyncio.run(main()) 