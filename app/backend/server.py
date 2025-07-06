import asyncio
import websockets
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, Any
import uuid
import hashlib
import secrets
from pathlib import Path
import mimetypes
import os

# HTTP server imports
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
import threading
from urllib.parse import urlparse, parse_qs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AuthenticatedUser:
    """Represents an authenticated user with session management"""
    def __init__(self, user_id: str, username: str, password_hash: str, websocket=None, ipv6: str = ""):
        self.id = user_id
        self.username = username
        self.password_hash = password_hash
        self.websocket = websocket
        self.ipv6 = ipv6
        self.status = "online" if websocket else "offline"
        self.contacts: Set[str] = set()
        self.last_seen = datetime.now()
        self.session_token = None
        self.session_expires = None
        self.login_attempts = 0
        self.locked_until = None

class VoIPAuthServer:
    def __init__(self):
        self.users: Dict[str, AuthenticatedUser] = {}
        self.user_websockets: Dict[websockets.WebSocketServerProtocol, str] = {}
        self.sessions: Dict[str, str] = {}  # session_token -> user_id
        self.usernames: Dict[str, str] = {}  # username -> user_id
        self.frontend_dir = Path("opus-tutorial-react/dist")
        
        # Create admin user for demonstration
        admin_id = str(uuid.uuid4())
        admin_password = self.hash_password("admin123")
        self.users[admin_id] = AuthenticatedUser(admin_id, "admin", admin_password)
        self.usernames["admin"] = admin_id
        
        logger.info("🔐 Default admin user created: username='admin', password='admin123'")
    
    def hash_password(self, password: str) -> str:
        """Hash password with salt"""
        salt = secrets.token_hex(32)
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return salt + pwdhash.hex()
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        salt = hashed[:64]
        stored_hash = hashed[64:]
        pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return pwdhash.hex() == stored_hash
    
    def create_session(self, user_id: str) -> str:
        """Create a new session token for user"""
        token = secrets.token_urlsafe(32)
        self.sessions[token] = user_id
        
        # Set session expiry
        user = self.users[user_id]
        user.session_token = token
        user.session_expires = datetime.now() + timedelta(hours=24)
        
        return token
    
    def validate_session(self, token: str) -> Optional[str]:
        """Validate session token and return user_id if valid"""
        if token not in self.sessions:
            return None
        
        user_id = self.sessions[token]
        user = self.users.get(user_id)
        
        if not user or not user.session_expires or datetime.now() > user.session_expires:
            # Session expired
            if token in self.sessions:
                del self.sessions[token]
            if user:
                user.session_token = None
                user.session_expires = None
            return None
        
        return user_id
    
    def register_user(self, username: str, password: str, ipv6: str = "") -> Dict[str, Any]:
        """Register a new user"""
        # Check if username already exists
        if username in self.usernames:
            return {"success": False, "error": "Username already exists"}
        
        # Validate password strength
        if len(password) < 6:
            return {"success": False, "error": "Password must be at least 6 characters"}
        
        # Create new user
        user_id = str(uuid.uuid4())
        password_hash = self.hash_password(password)
        
        user = AuthenticatedUser(user_id, username, password_hash, ipv6=ipv6)
        self.users[user_id] = user
        self.usernames[username] = user_id
        
        # Create session
        session_token = self.create_session(user_id)
        
        logger.info(f"👤 New user registered: {username}")
        
        return {
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "ipv6": ipv6
            },
            "session_token": session_token
        }
    
    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user login"""
        if username not in self.usernames:
            return {"success": False, "error": "Invalid username or password"}
        
        user_id = self.usernames[username]
        user = self.users[user_id]
        
        # Check if account is locked
        if user.locked_until and datetime.now() < user.locked_until:
            remaining = (user.locked_until - datetime.now()).seconds
            return {"success": False, "error": f"Account locked. Try again in {remaining} seconds"}
        
        # Verify password
        if not self.verify_password(password, user.password_hash):
            user.login_attempts += 1
            
            # Lock account after 5 failed attempts
            if user.login_attempts >= 5:
                user.locked_until = datetime.now() + timedelta(minutes=15)
                logger.warning(f"🔒 Account locked for user: {username}")
                return {"success": False, "error": "Account locked due to too many failed attempts"}
            
            return {"success": False, "error": "Invalid username or password"}
        
        # Reset login attempts on successful login
        user.login_attempts = 0
        user.locked_until = None
        user.last_seen = datetime.now()
        
        # Create session
        session_token = self.create_session(user_id)
        
        logger.info(f"✅ User authenticated: {username}")
        
        return {
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "ipv6": user.ipv6
            },
            "session_token": session_token
        }
    
    def logout_user(self, session_token: str):
        """Logout user by invalidating session"""
        if session_token in self.sessions:
            user_id = self.sessions[session_token]
            user = self.users.get(user_id)
            
            if user:
                user.session_token = None
                user.session_expires = None
                user.status = "offline"
                logger.info(f"👋 User logged out: {user.username}")
            
            del self.sessions[session_token]
    
    async def connect_websocket(self, websocket, session_token: str):
        """Connect authenticated user to WebSocket"""
        user_id = self.validate_session(session_token)
        if not user_id:
            await websocket.send(json.dumps({
                "type": "auth-error",
                "data": {"error": "Invalid or expired session"},
                "from": "server",
                "to": "client",
                "timestamp": datetime.now().isoformat()
            }))
            await websocket.close()
            return None
        
        user = self.users[user_id]
        
        # Update user connection
        if user.websocket and user.websocket in self.user_websockets:
            # Close old connection
            try:
                await user.websocket.close()
            except:
                pass
            del self.user_websockets[user.websocket]
        
        user.websocket = websocket
        user.status = "online"
        user.last_seen = datetime.now()
        self.user_websockets[websocket] = user_id
        
        # Get client's real IP if IPv6 not set
        if not user.ipv6:
            try:
                client_ip = websocket.remote_address[0]
                user.ipv6 = client_ip
            except:
                user.ipv6 = "::1"  # localhost fallback
        
        logger.info(f"🔌 WebSocket connected for user: {user.username} ({user.ipv6})")
        
        # Send connection success
        await self.send_to_user(user_id, {
            "type": "websocket-connected",
            "data": {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "ipv6": user.ipv6,
                    "isLoggedIn": True
                }
            },
            "from": "server",
            "to": user_id,
            "timestamp": datetime.now().isoformat()
        })
        
        # Send contacts list
        await self.send_contacts_update(user_id)
        
        return user_id
    
    async def unregister_websocket(self, websocket):
        """Unregister user when WebSocket disconnects"""
        if websocket in self.user_websockets:
            user_id = self.user_websockets[websocket]
            if user_id in self.users:
                user = self.users[user_id]
                user.websocket = None
                user.status = "offline"
                user.last_seen = datetime.now()
                logger.info(f"🔌 WebSocket disconnected for user: {user.username}")
                
                # Notify contacts about status change
                await self.notify_contacts_about_status_change(user_id)
            
            del self.user_websockets[websocket]
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]) -> bool:
        """Send message to specific user"""
        if user_id in self.users:
            user = self.users[user_id]
            if user.websocket:
                try:
                    await user.websocket.send(json.dumps(message))
                    return True
                except websockets.exceptions.ConnectionClosed:
                    logger.warning(f"Failed to send message to {user_id}: connection closed")
                    await self.unregister_websocket(user.websocket)
        return False
    
    async def send_contacts_update(self, user_id: str):
        """Send updated contacts list to user"""
        if user_id not in self.users:
            return
        
        user = self.users[user_id]
        contacts_data = []
        
        for contact_id in user.contacts:
            if contact_id in self.users:
                contact = self.users[contact_id]
                contacts_data.append({
                    'id': contact.id,
                    'name': contact.username,
                    'ipv6': contact.ipv6,
                    'status': contact.status,
                    'lastSeen': contact.last_seen.isoformat() if contact.status == 'offline' else None
                })
        
        await self.send_to_user(user_id, {
            'type': 'contacts-update',
            'data': contacts_data,
            'from': 'server',
            'to': user_id,
            'timestamp': datetime.now().isoformat()
        })
    
    async def notify_contacts_about_status_change(self, user_id: str):
        """Notify all contacts when user status changes"""
        if user_id not in self.users:
            return
        
        # Find all users who have this user as a contact
        for uid, user in self.users.items():
            if user_id in user.contacts:
                await self.send_contacts_update(uid)
    
    async def add_contact(self, user_id: str, contact_username: str):
        """Add a contact for a user by username"""
        if user_id not in self.users:
            return False
        
        if contact_username not in self.usernames:
            return False
        
        contact_id = self.usernames[contact_username]
        
        # Don't add self as contact
        if contact_id == user_id:
            return False
        
        # Add to user's contacts
        self.users[user_id].contacts.add(contact_id)
        
        # Also add reverse contact (mutual)
        self.users[contact_id].contacts.add(user_id)
        
        await self.send_contacts_update(user_id)
        await self.send_contacts_update(contact_id)
        
        logger.info(f"👥 Contact added: {self.users[user_id].username} ↔ {contact_username}")
        return True
    
    async def handle_websocket_message(self, websocket, message_str: str):
        """Handle incoming WebSocket message"""
        try:
            message = json.loads(message_str)
            message_type = message.get('type')
            data = message.get('data', {})
            from_user = message.get('from', '')
            to_user = message.get('to', '')
            
            if message_type == 'auth-connect':
                session_token = data.get('session_token', '')
                await self.connect_websocket(websocket, session_token)
            
            elif message_type == 'add-contact':
                if from_user:
                    contact_username = data.get('username', '')
                    success = await self.add_contact(from_user, contact_username)
                    await self.send_to_user(from_user, {
                        'type': 'add-contact-result',
                        'data': {'success': success, 'username': contact_username},
                        'from': 'server',
                        'to': from_user,
                        'timestamp': datetime.now().isoformat()
                    })
            
            elif message_type == 'call-request':
                await self.handle_call_request(from_user, to_user, data)
            
            elif message_type in ['call-response', 'offer', 'answer', 'ice-candidate', 'hang-up']:
                await self.handle_signaling_message(from_user, to_user, message)
            
            else:
                logger.warning(f"Unknown WebSocket message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
    
    async def handle_call_request(self, from_user_id: str, to_user_id: str, data: Dict[str, Any]):
        """Handle call request between users"""
        if to_user_id not in self.users or from_user_id not in self.users:
            return
        
        to_user = self.users[to_user_id]
        from_user = self.users[from_user_id]
        
        if to_user.status != "online" or not to_user.websocket:
            # Send call failed message
            await self.send_to_user(from_user_id, {
                'type': 'call-failed',
                'data': {'reason': 'User offline or unavailable'},
                'from': 'server',
                'to': from_user_id,
                'timestamp': datetime.now().isoformat()
            })
            return
        
        # Forward call request
        await self.send_to_user(to_user_id, {
            'type': 'call-request',
            'data': {
                'callerId': from_user.id,
                'callerName': from_user.username,
                'callerIPv6': from_user.ipv6
            },
            'from': from_user_id,
            'to': to_user_id,
            'timestamp': datetime.now().isoformat()
        })
        
        logger.info(f"📞 Call request from {from_user.username} to {to_user.username}")
    
    async def handle_signaling_message(self, from_user_id: str, to_user_id: str, message: Dict[str, Any]):
        """Handle WebRTC signaling messages"""
        if to_user_id not in self.users or from_user_id not in self.users:
            return
        
        to_user = self.users[to_user_id]
        
        if to_user.status != "online" or not to_user.websocket:
            return
        
        # Forward the signaling message
        await self.send_to_user(to_user_id, {
            'type': message['type'],
            'data': message['data'],
            'from': from_user_id,
            'to': to_user_id,
            'timestamp': datetime.now().isoformat()
        })
        
        logger.debug(f"📡 Signaling message ({message['type']}) from {from_user_id} to {to_user_id}")
    
    async def handle_websocket_client(self, websocket, path):
        """Handle new WebSocket client connection"""
        logger.info(f"🔌 New WebSocket connection: {websocket.remote_address}")
        
        try:
            async for message in websocket:
                await self.handle_websocket_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket client disconnected")
        except Exception as e:
            logger.error(f"Error in WebSocket client handler: {e}")
        finally:
            await self.unregister_websocket(websocket)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get server statistics"""
        online_users = sum(1 for user in self.users.values() if user.status == "online")
        total_users = len(self.users)
        active_sessions = len(self.sessions)
        
        return {
            'total_users': total_users,
            'online_users': online_users,
            'active_sessions': active_sessions,
            'active_websockets': len(self.user_websockets)
        }

class VoIPHTTPHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler for serving React app and API endpoints"""
    
    def __init__(self, *args, server_instance=None, **kwargs):
        self.server_instance = server_instance
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # API endpoints
        if path.startswith('/api/'):
            self.handle_api_request('GET', path, parsed_path.query)
            return
        
        # Serve React app
        self.serve_react_app(path)
    
    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path.startswith('/api/'):
            # Read POST data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''
            
            self.handle_api_request('POST', path, post_data)
            return
        
        self.send_error(404)
    
    def handle_api_request(self, method: str, path: str, data: str):
        """Handle API requests"""
        try:
            if path == '/api/register' and method == 'POST':
                self.handle_register(data)
            elif path == '/api/login' and method == 'POST':
                self.handle_login(data)
            elif path == '/api/logout' and method == 'POST':
                self.handle_logout(data)
            elif path == '/api/stats' and method == 'GET':
                self.handle_stats()
            elif path == '/api/validate-session' and method == 'POST':
                self.handle_validate_session(data)
            else:
                self.send_error(404)
        except Exception as e:
            logger.error(f"API error: {e}")
            self.send_json_response({'error': 'Internal server error'}, 500)
    
    def handle_register(self, data: str):
        """Handle user registration"""
        try:
            request_data = json.loads(data)
            username = request_data.get('username', '').strip()
            password = request_data.get('password', '')
            
            if not username or not password:
                self.send_json_response({'error': 'Username and password required'}, 400)
                return
            
            # Get client IP for IPv6
            client_ip = self.client_address[0]
            
            result = self.server_instance.register_user(username, password, client_ip)
            
            if result['success']:
                self.send_json_response(result, 200)
            else:
                self.send_json_response(result, 400)
                
        except json.JSONDecodeError:
            self.send_json_response({'error': 'Invalid JSON'}, 400)
        except Exception as e:
            logger.error(f"Registration error: {e}")
            self.send_json_response({'error': 'Registration failed'}, 500)
    
    def handle_login(self, data: str):
        """Handle user login"""
        try:
            request_data = json.loads(data)
            username = request_data.get('username', '').strip()
            password = request_data.get('password', '')
            
            if not username or not password:
                self.send_json_response({'error': 'Username and password required'}, 400)
                return
            
            result = self.server_instance.authenticate_user(username, password)
            
            if result['success']:
                self.send_json_response(result, 200)
            else:
                self.send_json_response(result, 401)
                
        except json.JSONDecodeError:
            self.send_json_response({'error': 'Invalid JSON'}, 400)
        except Exception as e:
            logger.error(f"Login error: {e}")
            self.send_json_response({'error': 'Login failed'}, 500)
    
    def handle_logout(self, data: str):
        """Handle user logout"""
        try:
            request_data = json.loads(data)
            session_token = request_data.get('session_token', '')
            
            if session_token:
                self.server_instance.logout_user(session_token)
            
            self.send_json_response({'success': True}, 200)
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            self.send_json_response({'error': 'Logout failed'}, 500)
    
    def handle_validate_session(self, data: str):
        """Handle session validation"""
        try:
            request_data = json.loads(data)
            session_token = request_data.get('session_token', '')
            
            user_id = self.server_instance.validate_session(session_token)
            
            if user_id:
                user = self.server_instance.users[user_id]
                self.send_json_response({
                    'valid': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'ipv6': user.ipv6
                    }
                }, 200)
            else:
                self.send_json_response({'valid': False}, 401)
                
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            self.send_json_response({'error': 'Validation failed'}, 500)
    
    def handle_stats(self):
        """Handle stats request"""
        stats = self.server_instance.get_stats()
        self.send_json_response(stats, 200)
    
    def serve_react_app(self, path: str):
        """Serve React application files"""
        frontend_dir = self.server_instance.frontend_dir
        
        if not frontend_dir.exists():
            self.send_error(404, "Frontend not built. Run: cd opus-tutorial-react && npm run build")
            return
        
        # Handle root path
        if path == '/' or path == '':
            path = '/index.html'
        
        # Security: prevent directory traversal
        if '..' in path:
            self.send_error(403)
            return
        
        file_path = frontend_dir / path.lstrip('/')
        
        # If file doesn't exist, serve index.html for SPA routing
        if not file_path.exists() or file_path.is_dir():
            file_path = frontend_dir / 'index.html'
        
        if not file_path.exists():
            self.send_error(404)
            return
        
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            # Set content type
            content_type, _ = mimetypes.guess_type(str(file_path))
            if not content_type:
                content_type = 'application/octet-stream'
            
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(content))
            
            # Add CORS headers for development
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            
            self.end_headers()
            self.wfile.write(content)
            
        except Exception as e:
            logger.error(f"Error serving file {file_path}: {e}")
            self.send_error(500)
    
    def send_json_response(self, data: Dict[str, Any], status_code: int):
        """Send JSON response"""
        response = json.dumps(data).encode('utf-8')
        
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(response))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(response)
    
    def log_message(self, format, *args):
        """Override to use our logger"""
        logger.info(f"HTTP {format % args}")

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Threaded HTTP server"""
    pass

# Combined server that handles both HTTP and WebSocket on the same port
class CombinedServer:
    def __init__(self, port=3000):
        self.port = port
        self.server_instance = VoIPAuthServer()
        
    async def handle_request(self, websocket, path):
        """Handle incoming connections - determine if HTTP or WebSocket"""
        # This is a WebSocket connection
        await self.server_instance.handle_websocket_client(websocket, path)
    
    def create_http_handler(self):
        """Create HTTP handler with server instance"""
        def create_handler(*args, **kwargs):
            return VoIPHTTPHandler(*args, server_instance=self.server_instance, **kwargs)
        return create_handler
    
    async def start(self):
        """Start the combined server"""
        # Build React app if not already built
        if not self.server_instance.frontend_dir.exists():
            logger.info("🔨 Frontend not built. Building React app...")
            try:
                import subprocess
                result = subprocess.run(
                    ["npm", "run", "build"],
                    cwd="opus-tutorial-react",
                    capture_output=True,
                    text=True
                )
                if result.returncode != 0:
                    logger.error(f"Failed to build React app: {result.stderr}")
                    logger.info("Please run manually: cd opus-tutorial-react && npm run build")
                else:
                    logger.info("✅ React app built successfully")
            except Exception as e:
                logger.error(f"Error building React app: {e}")
                logger.info("Please run manually: cd opus-tutorial-react && npm run build")
        
        # Start HTTP server in a thread
        http_server = ThreadedHTTPServer(("0.0.0.0", self.port), self.create_http_handler())
        http_thread = threading.Thread(target=http_server.serve_forever, daemon=True)
        http_thread.start()
        
        logger.info(f"🌐 HTTP Server started on http://localhost:{self.port}")
        logger.info("📡 Serving React app and API endpoints")
        
        # Start WebSocket server on the same port + 1 (for now, until we can properly combine them)
        # Actually, let's use a different approach - WebSocket on same port via path
        websocket_server = websockets.serve(
            self.handle_request,
            "0.0.0.0",
            self.port + 1000,  # Temporary: use port 4000 for WebSocket
            ping_interval=20,
            ping_timeout=10,
            max_size=10**6
        )
        
        logger.info(f"🔌 WebSocket Server started on ws://localhost:{self.port + 1000}")
        
        logger.info(f"""
    ╔════════════════════════════════════════════════════════════════════════╗
    ║                    🚀 VoIP Server with Authentication                   ║
    ║                                                                        ║
    ║  🌐 Web App:      http://localhost:{self.port}                               ║
    ║  📡 WebSocket:    ws://localhost:{self.port + 1000}                                 ║
    ║  🔐 Default Admin: username=admin, password=admin123                  ║
    ║                                                                        ║
    ║  Features:                                                             ║
    ║  • Complete user authentication system                                 ║
    ║  • Session management with tokens                                      ║
    ║  • Integrated frontend hosting                                         ║
    ║  • Contact management by username                                      ║
    ║  • P2P WebRTC calling with authentication                             ║
    ╚════════════════════════════════════════════════════════════════════════╝
        """)
        
        # Run WebSocket server
        await websocket_server
        await asyncio.Future()  # Run forever

async def main():
    """Main server function"""
    try:
        server = CombinedServer(port=3000)
        await server.start()
    except KeyboardInterrupt:
        logger.info("🛑 Server shutting down...")
    except Exception as e:
        logger.error(f"Server error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
