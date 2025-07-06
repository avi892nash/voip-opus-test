#!/usr/bin/env python3
"""
VoIP Opus Test Startup Script with Authentication
A comprehensive startup script for the P2P VoIP system with integrated web server and authentication.
"""

import os
import sys
import time
import asyncio
import subprocess
import platform
from pathlib import Path
from typing import List, Tuple, Optional

def print_header():
    """Print the application header"""
    print("""
    ╔════════════════════════════════════════════════════════════════════════╗
    ║                    🚀 VoIP System with Authentication                   ║
    ║                      Complete P2P Voice Communication                   ║
    ║                                                                        ║
    ║  Features:                                                             ║
    ║  • Integrated web server hosting React frontend                        ║
    ║  • Complete user authentication system                                 ║
    ║  • Session management with JWT-like tokens                             ║
    ║  • Contact management by username                                      ║
    ║  • P2P WebRTC calling with Opus codec                                 ║
    ║  • Network quality monitoring                                          ║
    ║  • Adaptive bitrate control                                            ║
    ║  • Audio enhancement controls                                          ║
    ╚════════════════════════════════════════════════════════════════════════╝
    """)

def check_python_version() -> bool:
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {version.major}.{version.minor}.{version.micro}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_node_version() -> bool:
    """Check if Node.js is available for development mode"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} detected")
            return True
    except FileNotFoundError:
        pass
    
    print("⚠️  Node.js not found (needed only for development)")
    return False

def check_dependencies() -> Tuple[List[str], List[str]]:
    """Check for required and optional Python dependencies"""
    required_packages = [
        ('websockets', 'websockets>=12.0'),
        ('asyncio', 'asyncio (built-in)'),
    ]
    
    optional_packages = [
        ('pyaudio', 'PyAudio (for direct audio scripts)'),
        ('wave', 'wave (built-in)'),
        ('threading', 'threading (built-in)'),
    ]
    
    missing_required = []
    missing_optional = []
    
    for package, description in required_packages:
        try:
            __import__(package)
            print(f"✅ {description}")
        except ImportError:
            print(f"❌ {description}")
            missing_required.append(package)
    
    for package, description in optional_packages:
        try:
            __import__(package)
            print(f"✅ {description}")
        except ImportError:
            print(f"⚠️  {description}")
            missing_optional.append(package)
    
    return missing_required, missing_optional

def check_frontend_build() -> bool:
    """Check if the React frontend is built"""
    frontend_build = Path("opus-tutorial-react/dist")
    if frontend_build.exists() and frontend_build.is_dir():
        index_file = frontend_build / "index.html"
        if index_file.exists():
            print("✅ React frontend build found")
            return True
    
    print("⚠️  React frontend not built")
    return False

def build_frontend() -> bool:
    """Build the React frontend"""
    print("🔨 Building React frontend...")
    
    try:
        # Check if node_modules exists
        node_modules = Path("opus-tutorial-react/node_modules")
        if not node_modules.exists():
            print("📦 Installing npm dependencies...")
            result = subprocess.run(
                ['npm', 'install'],
                cwd='opus-tutorial-react',
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                print(f"❌ npm install failed: {result.stderr}")
                return False
            print("✅ npm dependencies installed")
        
        # Build the project
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd='opus-tutorial-react',
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ React frontend built successfully")
            return True
        else:
            print(f"❌ Build failed: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ npm not found. Please install Node.js")
        return False
    except Exception as e:
        print(f"❌ Build error: {e}")
        return False

def install_dependencies(packages: List[str]) -> bool:
    """Install missing Python packages"""
    if not packages:
        return True
    
    print(f"\n📦 Installing missing packages: {', '.join(packages)}")
    
    try:
        cmd = [sys.executable, '-m', 'pip', 'install'] + packages
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ All packages installed successfully")
            return True
        else:
            print(f"❌ Installation failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Installation error: {e}")
        return False

def get_network_info() -> Tuple[str, str]:
    """Get network information"""
    try:
        # Get local IP addresses
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        return hostname, local_ip
    except:
        return "localhost", "127.0.0.1"

def start_server():
    """Start the integrated VoIP server"""
    hostname, local_ip = get_network_info()
    
    print(f"""
    🚀 Starting VoIP Server with Authentication...
    
    📍 Network Information:
       Hostname: {hostname}
       Local IP: {local_ip}
       
    🌐 Server URLs:
       Web App:      http://localhost:3000
       WebSocket:    ws://localhost:8080
       
    🔐 Default Admin Account:
       Username: admin
       Password: admin123
       
    💡 Usage Instructions:
       1. Open http://localhost:3000 in your browser
       2. Create new accounts or use the admin account
       3. Add contacts by username (not IP address)
       4. Make voice calls between authenticated users
       
    📱 Testing with Multiple Users:
       • Open multiple browser tabs/windows
       • Register different usernames in each
       • Add each other as contacts
       • Start voice calls between them
       
    ⚠️  Important Notes:
       • Allow microphone access when prompted
       • Use modern browsers (Chrome, Firefox, Safari)
       • Ensure network connectivity for P2P calls
       • Both users need to be online for calls
    
    Press Ctrl+C to stop the server...
    """)
    
    try:
        # Import and run the server
        from server import main
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except ImportError as e:
        print(f"❌ Server import error: {e}")
        print("   Make sure server.py is in the current directory")
    except Exception as e:
        print(f"❌ Server error: {e}")

def main():
    """Main startup function"""
    print_header()
    
    # Check system requirements
    print("🔍 Checking system requirements...")
    
    if not check_python_version():
        return 1
    
    has_node = check_node_version()
    missing_required, missing_optional = check_dependencies()
    
    # Install missing required dependencies
    if missing_required:
        print(f"\n❌ Missing required dependencies: {', '.join(missing_required)}")
        if not install_dependencies(missing_required):
            return 1
        print("✅ All required dependencies installed")
    
    # Check and build frontend
    has_frontend = check_frontend_build()
    
    if not has_frontend:
        if has_node:
            print("\n🔨 Frontend build missing. Building now...")
            if not build_frontend():
                print("\n⚠️  Frontend build failed. You can still run the server,")
                print("   but you'll need to build the frontend manually:")
                print("   cd opus-tutorial-react && npm install && npm run build")
        else:
            print("\n⚠️  Frontend build missing and Node.js not found.")
            print("   Install Node.js and run: cd opus-tutorial-react && npm install && npm run build")
    
    print("\n" + "="*80)
    print("🎉 All checks completed! Ready to start the server.")
    print("="*80)
    
    # Start the server
    start_server()
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1) 