#!/usr/bin/env python3
"""
VoIP System Test Script
Tests the basic functionality of the VoIP system
"""

import asyncio
import websockets
import json
import time
from datetime import datetime

class VoIPTester:
    def __init__(self, server_url="ws://localhost:8080"):
        self.server_url = server_url
        self.websocket = None
        self.user_id = None
        
    async def connect(self, username="TestUser"):
        """Connect to the VoIP server"""
        try:
            self.websocket = await websockets.connect(self.server_url)
            print(f"✅ Connected to server: {self.server_url}")
            
            # Send login message
            login_msg = {
                "type": "login",
                "data": {
                    "name": username,
                    "ipv6": "::1"
                },
                "from": "test-client",
                "to": "server",
                "timestamp": datetime.now().isoformat()
            }
            
            await self.websocket.send(json.dumps(login_msg))
            print(f"📤 Sent login request for: {username}")
            
            # Wait for login response
            response = await self.websocket.recv()
            data = json.loads(response)
            
            if data.get("type") == "login-success":
                self.user_id = data["data"]["user"]["id"]
                print(f"✅ Login successful! User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Login failed: {data}")
                return False
                
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    async def test_contact_management(self):
        """Test adding contacts"""
        print("\n🧪 Testing contact management...")
        
        # Add a test contact
        contact_msg = {
            "type": "add-contact",
            "data": {
                "name": "Test Contact",
                "ipv6": "2001:db8::1"
            },
            "from": self.user_id,
            "to": "server",
            "timestamp": datetime.now().isoformat()
        }
        
        await self.websocket.send(json.dumps(contact_msg))
        print("📤 Sent add contact request")
        
        # Wait for contacts update
        try:
            response = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "contacts-update":
                contacts = data.get("data", [])
                print(f"✅ Contacts updated: {len(contacts)} contacts")
                for contact in contacts:
                    print(f"   - {contact['name']} ({contact['ipv6']})")
                return True
            else:
                print(f"❌ Unexpected response: {data}")
                return False
                
        except asyncio.TimeoutError:
            print("❌ Timeout waiting for contacts update")
            return False
    
    async def test_call_flow(self):
        """Test call request flow"""
        print("\n🧪 Testing call flow...")
        
        # This would normally be sent to another user
        # For testing, we'll just verify the message format
        call_msg = {
            "type": "call-request",
            "data": {
                "callerId": self.user_id,
                "callerName": "TestUser"
            },
            "from": self.user_id,
            "to": "fake-user-id",
            "timestamp": datetime.now().isoformat()
        }
        
        await self.websocket.send(json.dumps(call_msg))
        print("📤 Sent call request")
        
        # Since we're calling a fake user, we should get a call-failed response
        try:
            response = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "call-failed":
                print("✅ Call failed as expected (fake user)")
                return True
            else:
                print(f"❌ Unexpected response: {data}")
                return False
                
        except asyncio.TimeoutError:
            print("❌ Timeout waiting for call response")
            return False
    
    async def disconnect(self):
        """Disconnect from server"""
        if self.websocket:
            await self.websocket.close()
            print("✅ Disconnected from server")

async def run_tests():
    """Run all VoIP tests"""
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║                    🧪 VoIP System Tests                      ║
    ║                                                              ║
    ║  Testing basic functionality of the VoIP system             ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    tester = VoIPTester()
    
    try:
        # Test 1: Connection
        print("🧪 Test 1: Server Connection")
        success = await tester.connect("TestUser")
        if not success:
            print("❌ Connection test failed!")
            return
        
        # Test 2: Contact Management
        success = await tester.test_contact_management()
        if not success:
            print("❌ Contact management test failed!")
            return
        
        # Test 3: Call Flow
        success = await tester.test_call_flow()
        if not success:
            print("❌ Call flow test failed!")
            return
        
        print("""
        ✅ All tests passed!
        
        🎉 Your VoIP system is working correctly!
        
        Next steps:
        1. Start the React app: cd opus-tutorial-react && npm run dev
        2. Open http://localhost:5173 in your browser
        3. Test with multiple browser tabs/windows
        """)
        
    except Exception as e:
        print(f"❌ Test error: {e}")
    
    finally:
        await tester.disconnect()

async def check_server():
    """Check if server is running"""
    try:
        websocket = await websockets.connect("ws://localhost:8080")
        await websocket.close()
        return True
    except Exception:
        return False

async def main():
    """Main test function"""
    print("🔍 Checking if VoIP server is running...")
    
    if not await check_server():
        print("""
        ❌ VoIP server is not running!
        
        Please start the server first:
        python server.py
        
        Or use the startup script:
        python start.py
        """)
        return
    
    print("✅ Server is running!")
    await run_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n👋 Tests interrupted by user")
    except Exception as e:
        print(f"❌ Test error: {e}") 