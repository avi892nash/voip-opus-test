#!/usr/bin/env python3
"""
VoIP System Complete Demo
Shows all features of the P2P VoIP implementation
"""

import asyncio
import os
import sys
import time
import webbrowser
from pathlib import Path

def print_header():
    """Print demo header"""
    print("""
    ╔════════════════════════════════════════════════════════════════════════╗
    ║                          🎙️ VoIP System Demo                           ║
    ║                                                                        ║
    ║             Phase 3: Complete P2P VoIP with WebRTC & Opus             ║
    ║                                                                        ║
    ║  Features:                                                             ║
    ║  • 🌐 WebRTC P2P Audio Streaming                                       ║
    ║  • 📡 IPv6 Direct Connection                                           ║
    ║  • 👥 Contact Management                                               ║
    ║  • 📞 Call Handling (Incoming/Outgoing)                               ║
    ║  • 📊 Network Quality Monitoring                                       ║
    ║  • 🎛️ Adaptive Bitrate & Audio Controls                               ║
    ║  • 🔊 Echo Cancellation & Noise Suppression                           ║
    ║  • 🏭 WebSocket Signaling Server                                       ║
    ╚════════════════════════════════════════════════════════════════════════╝
    """)

def print_requirements():
    """Print system requirements"""
    print("""
    📋 System Requirements:
    ┌─────────────────────────────────────────────────────────────────────┐
    │ Python 3.7+     - For signaling server                             │
    │ Node.js 16+     - For React development                             │
    │ Modern Browser  - Chrome, Firefox, Safari, Edge                     │
    │ Microphone      - For audio input                                   │
    │ IPv6 Support    - For direct P2P connections                        │
    └─────────────────────────────────────────────────────────────────────┘
    """)

def check_environment():
    """Check if environment is set up correctly"""
    print("🔍 Checking environment...")
    
    issues = []
    
    # Check Python version
    if sys.version_info < (3, 7):
        issues.append("Python 3.7+ required")
    else:
        print("✅ Python version OK")
    
    # Check if React app exists
    react_dir = Path("opus-tutorial-react")
    if not react_dir.exists():
        issues.append("React app directory not found")
    else:
        print("✅ React app directory found")
        
        # Check if dependencies are installed
        node_modules = react_dir / "node_modules"
        if not node_modules.exists():
            issues.append("React dependencies not installed (run: cd opus-tutorial-react && npm install)")
        else:
            print("✅ React dependencies installed")
    
    # Check Python dependencies
    try:
        import websockets
        print("✅ Python websockets library available")
    except ImportError:
        issues.append("Python websockets library missing (run: pip install websockets)")
    
    return issues

def print_architecture():
    """Print system architecture"""
    print("""
    🏗️ System Architecture:
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │  ┌─────────────┐    WebSocket     ┌─────────────────┐               │
    │  │   Browser   │ ◄─────────────► │ Signaling Server │               │
    │  │   (User A)  │     Messages     │   (Python)      │               │
    │  └─────────────┘                 └─────────────────┘               │
    │         │                                                           │
    │         │                                                           │
    │         │ WebRTC P2P Audio Stream                                   │
    │         │ (Direct IPv6 Connection)                                  │
    │         │                                                           │
    │         ▼                                                           │
    │  ┌─────────────┐                                                    │
    │  │   Browser   │                                                    │
    │  │   (User B)  │                                                    │
    │  └─────────────┘                                                    │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
    """)

def print_features():
    """Print detailed features"""
    print("""
    🎯 Detailed Features:
    
    📡 WebRTC Integration:
    • Peer-to-peer audio streaming using WebRTC
    • STUN servers for NAT traversal
    • ICE candidates for connection establishment
    • Real-time audio transmission with Opus codec
    
    🌐 IPv6 Support:
    • Direct IPv6 address connection
    • Automatic IPv6 detection
    • Contact management by IPv6 address
    • Server-assisted contact sharing
    
    📞 Call Management:
    • Outgoing call initiation
    • Incoming call notifications
    • Call accept/reject functionality
    • Call status tracking and duration
    
    📊 Network Quality:
    • Real-time latency monitoring
    • Packet loss detection
    • Jitter measurement
    • Quality indicators (Excellent/Good/Fair/Poor)
    
    🎛️ Audio Controls:
    • Echo cancellation
    • Noise suppression
    • Automatic gain control
    • Adaptive bitrate (32-128 kbps)
    • Sample rate selection (8-48 kHz)
    
    🏭 Signaling Server:
    • WebSocket-based real-time communication
    • User authentication and management
    • Contact synchronization
    • Call coordination and setup
    • Connection health monitoring
    """)

def print_usage_guide():
    """Print usage guide"""
    print("""
    📖 Usage Guide:
    
    1️⃣ Start the System:
       python demo.py                  # This script
       python server.py                # Or direct server start
       
    2️⃣ Start React App:
       cd opus-tutorial-react
       npm run dev
       
    3️⃣ Open Browser:
       Navigate to http://localhost:5173
       
    4️⃣ Login:
       • Enter your username
       • Your IPv6 will be auto-detected
       • Click "Connect to VoIP Network"
       
    5️⃣ Add Contacts:
       • Click "+ Add" in Contacts panel
       • Enter contact name and IPv6
       • Contacts sync automatically
       
    6️⃣ Make Calls:
       • Click phone icon (📞) next to online contacts
       • Answer/decline incoming calls
       • View real-time quality metrics
       
    7️⃣ Adjust Settings:
       • Click ⚙️ Settings for audio controls
       • Adjust bitrate, sample rate
       • Enable/disable echo cancellation
    """)

def print_testing_guide():
    """Print testing guide"""
    print("""
    🧪 Testing Guide:
    
    Single Machine Testing:
    • Open multiple browser tabs/windows
    • Login with different usernames in each
    • Add each other as contacts using displayed IPv6
    • Test calling between tabs
    
    Multi-Machine Testing:
    • Ensure all machines are on same network
    • Start server on one machine
    • Update WebSocket URL in React app for other machines
    • Each machine connects to the same server
    • Test calls between different machines
    
    Network Quality Testing:
    • Use network throttling in browser dev tools
    • Test with different bandwidth limitations
    • Observe adaptive bitrate behavior
    • Check quality indicators
    
    Audio Testing:
    • Test with different microphones
    • Try various audio settings
    • Test echo cancellation
    • Test noise suppression
    """)

async def run_demo():
    """Run the complete demo"""
    print_header()
    print_requirements()
    
    # Check environment
    issues = check_environment()
    if issues:
        print("\n❌ Environment Issues:")
        for issue in issues:
            print(f"   • {issue}")
        print("\nPlease fix these issues and run the demo again.")
        return
    
    print("\n✅ Environment check passed!")
    
    print_architecture()
    print_features()
    print_usage_guide()
    print_testing_guide()
    
    print("""
    🚀 Ready to start the demo!
    
    Choose an option:
    1️⃣ Start the signaling server
    2️⃣ Run system tests
    3️⃣ Show troubleshooting guide
    4️⃣ Exit
    """)
    
    while True:
        try:
            choice = input("Enter your choice (1-4): ").strip()
            
            if choice == '1':
                print("\n🚀 Starting signaling server...")
                await start_server()
                break
            elif choice == '2':
                print("\n🧪 Running system tests...")
                await run_tests()
                break
            elif choice == '3':
                print_troubleshooting()
                break
            elif choice == '4':
                print("\n👋 Goodbye!")
                break
            else:
                print("Invalid choice. Please enter 1, 2, 3, or 4.")
        except KeyboardInterrupt:
            print("\n\n👋 Demo interrupted!")
            break

async def start_server():
    """Start the VoIP server"""
    try:
        from server import VoIPServer
        import websockets
        
        server = VoIPServer()
        
        print("""
        ✅ Starting VoIP Signaling Server...
        
        📡 Server URL: ws://localhost:8080
        
        Next steps:
        1. Keep this terminal open
        2. Open a new terminal
        3. Run: cd opus-tutorial-react && npm run dev
        4. Open http://localhost:5173 in your browser
        5. Start testing!
        
        Press Ctrl+C to stop the server.
        """)
        
        # Start server
        start_server = websockets.serve(
            server.handle_client,
            "0.0.0.0",
            8080,
            ping_interval=20,
            ping_timeout=10,
            max_size=10**6
        )
        
        await start_server
        await asyncio.Future()  # Run forever
        
    except Exception as e:
        print(f"❌ Server error: {e}")

async def run_tests():
    """Run system tests"""
    try:
        # Import and run the test script
        import test_voip
        await test_voip.main()
    except ImportError:
        print("❌ Test script not found. Please ensure test_voip.py is in the current directory.")
    except Exception as e:
        print(f"❌ Test error: {e}")

def print_troubleshooting():
    """Print troubleshooting guide"""
    print("""
    🔧 Troubleshooting Guide:
    
    Common Issues:
    
    ❌ "Can't connect to server"
    ✅ Solutions:
       • Ensure Python server is running
       • Check if port 8080 is available
       • Verify firewall settings
       • Try restarting the server
    
    ❌ "No audio during calls"
    ✅ Solutions:
       • Grant microphone permissions in browser
       • Check if microphone is working
       • Test with different browsers
       • Check audio settings in VoIP app
    
    ❌ "Poor call quality"
    ✅ Solutions:
       • Check network quality indicators
       • Adjust bitrate in settings
       • Enable echo cancellation
       • Ensure stable internet connection
    
    ❌ "Contact shows as offline"
    ✅ Solutions:
       • Verify IPv6 address is correct
       • Check if contact is connected to server
       • Refresh contacts list
       • Check server logs
    
    ❌ "WebRTC connection fails"
    ✅ Solutions:
       • Check browser WebRTC support
       • Test with different browsers
       • Verify STUN server connectivity
       • Check network configuration
    
    Browser Compatibility:
    • Chrome/Chromium: ✅ Full support
    • Firefox: ✅ Full support  
    • Safari: ⚠️ Partial support (varies by version)
    • Edge: ✅ Full support
    
    Network Requirements:
    • IPv6 support recommended
    • WebRTC support required
    • Microphone access required
    • Stable internet connection recommended
    """)

if __name__ == "__main__":
    try:
        asyncio.run(run_demo())
    except KeyboardInterrupt:
        print("\n\n👋 Demo terminated by user")
    except Exception as e:
        print(f"❌ Demo error: {e}")
        sys.exit(1) 