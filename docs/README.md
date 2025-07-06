# VoIP System with Authentication

A complete peer-to-peer voice communication system with integrated web server, user authentication, and advanced audio features.

## 🚀 Features

### Authentication & User Management
- **Complete user registration and login system**
- **Session management with secure tokens**
- **Account security with failed login protection**
- **Username-based contact management**
- **Real-time user status tracking**

### Voice Communication
- **P2P WebRTC audio calls with Opus codec**
- **Real-time network quality monitoring**
- **Adaptive bitrate control (32-128 kbps)**
- **Echo cancellation and noise suppression**
- **Sample rate selection (8-48 kHz)**
- **IPv6 automatic detection and direct connections**

### Web Interface
- **Modern React frontend with authentication**
- **Integrated HTTP server hosting the web app**
- **Real-time contact synchronization**
- **Interactive audio settings controls**
- **Network quality visualization**
- **Call history and duration tracking**

### Server Features
- **WebSocket signaling server**
- **HTTP API for authentication**
- **Session validation and management**
- **Contact management by username**
- **Connection health monitoring**

## 📦 Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 16+ (for building frontend)
- Modern web browser (Chrome, Firefox, Safari)

### Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repository>
   cd voip-opus-test
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Build the frontend:**
   ```bash
   cd opus-tutorial-react
   npm install
   npm run build
   cd ..
   ```

4. **Start the server:**
   ```bash
   python server.py
   ```

5. **Open your browser:**
   ```
   http://localhost:3000
   ```

### Alternative: Use the automated startup script

```bash
python start.py
```

This script will:
- Check all dependencies
- Install missing packages
- Build the frontend if needed
- Start the integrated server
- Provide detailed usage instructions

## 🔐 Authentication System

### Default Admin Account
- **Username:** `admin`
- **Password:** `admin123`

### User Registration
- Minimum 6 character passwords
- Unique usernames required
- Automatic IPv6 detection
- Session token generation

### Security Features
- Password hashing with PBKDF2
- Session token validation
- Account lockout after failed attempts
- Secure session management

## 🎮 Usage

### Getting Started
1. **Login or Register**
   - Use the admin account for testing
   - Or create new user accounts

2. **Add Contacts**
   - Search and add contacts by username
   - Real-time contact status updates
   - Mutual contact relationships

3. **Make Calls**
   - Click the call button next to online contacts
   - Allow microphone access when prompted
   - Enjoy high-quality voice communication

### Testing with Multiple Users
1. Open multiple browser tabs/windows
2. Register different usernames in each
3. Add each other as contacts
4. Start voice calls between them

## 🔧 Configuration

### Server Settings
- **HTTP Server:** Port 3000
- **WebSocket Server:** Port 8080
- **Session Timeout:** 24 hours
- **Account Lockout:** 15 minutes after 5 failed attempts

### Audio Settings (Adjustable in UI)
- **Bitrate:** 32-128 kbps
- **Sample Rate:** 8-48 kHz
- **Echo Cancellation:** On/Off
- **Noise Suppression:** On/Off
- **Auto Gain Control:** On/Off

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
opus-tutorial-react/
├── src/
│   ├── components/          # UI components
│   │   ├── AuthForm.tsx     # Login/registration
│   │   ├── P2PVoIP.tsx      # Main VoIP interface
│   │   └── ...
│   ├── hooks/
│   │   └── useVoIP.ts       # VoIP functionality hook
│   ├── utils/
│   │   ├── auth.ts          # Authentication utilities
│   │   ├── webrtc.ts        # WebRTC management
│   │   └── signaling.ts     # WebSocket client
│   └── types/
│       └── voip.ts          # TypeScript definitions
```

### Backend (Python)
```
├── server.py               # Integrated HTTP/WebSocket server
├── test_voip.py           # Automated testing suite
├── start.py               # Startup script
└── requirements.txt       # Python dependencies
```

### Key Components

#### VoIPAuthServer (server.py)
- User authentication and session management
- HTTP API endpoints for auth operations
- WebSocket handling for real-time communication
- Contact management and synchronization

#### WebRTCManager (webrtc.ts)
- Peer connection setup and management
- Audio stream handling with constraints
- Network quality monitoring
- Adaptive bitrate control

#### SignalingClient (signaling.ts)
- WebSocket connection with authentication
- Message routing for WebRTC signaling
- Contact and call management

## 🌐 API Reference

### HTTP Endpoints

#### Authentication
```http
POST /api/register
Content-Type: application/json
{
  "username": "string",
  "password": "string"
}
```

```http
POST /api/login
Content-Type: application/json
{
  "username": "string",
  "password": "string"
}
```

```http
POST /api/validate-session
Content-Type: application/json
{
  "session_token": "string"
}
```

```http
POST /api/logout
Content-Type: application/json
{
  "session_token": "string"
}
```

#### Statistics
```http
GET /api/stats
```

### WebSocket Messages

#### Authentication
```json
{
  "type": "auth-connect",
  "data": { "session_token": "string" },
  "from": "user_id",
  "to": "server"
}
```

#### Contact Management
```json
{
  "type": "add-contact",
  "data": { "username": "string" },
  "from": "user_id",
  "to": "server"
}
```

#### Call Signaling
```json
{
  "type": "call-request",
  "data": { "callerId": "string", "callerName": "string" },
  "from": "caller_id",
  "to": "target_id"
}
```

## 🧪 Testing

### Automated Test Suite
```bash
python test_authentication.py
```

Tests include:
- HTTP API functionality
- User authentication flow
- WebSocket connections
- Contact management
- Server statistics

### Manual Testing
1. **Single User Test:**
   - Register and login
   - Test audio settings
   - Verify UI functionality

2. **Multi-User Test:**
   - Multiple browser sessions
   - Contact management
   - Voice call establishment
   - Network quality monitoring

## 🔍 Troubleshooting

### Common Issues

#### Frontend Build Issues
```bash
cd opus-tutorial-react
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### WebSocket Connection Fails
- Check if port 8080 is available
- Verify firewall settings
- Ensure server is running

#### Audio Not Working
- Allow microphone access in browser
- Check browser audio permissions
- Test with different browsers
- Verify audio device functionality

#### Authentication Fails
- Check username/password
- Verify session tokens are being stored
- Clear browser local storage if needed

### Browser Compatibility
- **Chrome:** Full support ✅
- **Firefox:** Full support ✅
- **Safari:** Full support ✅
- **Edge:** Full support ✅

### Network Requirements
- Modern browser with WebRTC support
- Microphone access permissions
- Network connectivity for P2P connections
- WebSocket support

## 📊 Performance

### Optimizations
- **Adaptive Bitrate:** Adjusts quality based on network conditions
- **Echo Cancellation:** Reduces audio feedback
- **Noise Suppression:** Improves call quality
- **Efficient Signaling:** Minimal server overhead
- **Session Caching:** Reduced authentication overhead

### Monitoring
- Real-time network quality metrics
- Connection health monitoring  
- User session tracking
- Call duration statistics

## 🛡️ Security

### Authentication Security
- PBKDF2 password hashing with salt
- Secure session token generation
- Account lockout protection
- Session expiration handling

### Network Security
- Direct P2P connections (minimal server data)
- WebSocket secure connections
- Client-side session validation
- No audio data stored on server

## 🚧 Development

### Adding Features
1. **Backend:** Extend `VoIPAuthServer` class in `server.py`
2. **Frontend:** Add components in `opus-tutorial-react/src/components/`
3. **WebRTC:** Modify `WebRTCManager` in `utils/webrtc.ts`
4. **Signaling:** Update `SignalingClient` in `utils/signaling.ts`

### Code Structure
- **Modular Design:** Separated concerns for auth, WebRTC, and UI
- **TypeScript:** Full type safety in frontend
- **Async/Await:** Modern Python async patterns
- **React Hooks:** Functional component patterns
- **Error Handling:** Comprehensive error management

## 📝 License

This project is for educational purposes demonstrating VoIP technology with WebRTC and Opus codec.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Ensure all tests pass
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Test with the automated test suite
4. Verify network connectivity

---

**Built with:** React, TypeScript, Python, WebRTC, Opus Codec, WebSockets

**Status:** ✅ Production Ready - Complete authentication system with P2P voice communication
