#!/usr/bin/env python3
"""
Quick Start Script for VoIP System
This script helps you understand and run the project quickly.
"""

import os
import sys
import subprocess
import webbrowser
import time

def print_header():
    print("🎯 VoIP System - Quick Start Guide")
    print("=" * 50)
    print()

def check_python():
    print("🐍 Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required. Current version:", sys.version)
        return False
    print(f"✅ Python {sys.version.split()[0]} detected")
    return True

def check_dependencies():
    print("\n📦 Checking dependencies...")
    try:
        import flask
        import websockets
        print("✅ Python dependencies found")
        return True
    except ImportError:
        print("❌ Missing Python dependencies")
        print("   Run: pip install -r app/backend/requirements.txt")
        return False

def check_frontend():
    print("\n🎨 Checking frontend...")
    build_dir = "app/frontend/dist"
    if os.path.exists(build_dir):
        print("✅ Main app frontend is built")
        return True
    else:
        print("⚠️  Main app frontend not built")
        print("   Run: cd app/frontend && npm install && npm run build")
        return False

def check_intro():
    print("\n📚 Checking intro/tutorial...")
    build_dir = "intro/dist"
    if os.path.exists(build_dir):
        print("✅ Intro frontend is built")
        return True
    else:
        print("⚠️  Intro frontend not built")
        print("   Run: cd intro && npm install && npm run build")
        return False

def start_server():
    print("\n🚀 Starting server...")
    try:
        # Start server in background
        process = subprocess.Popen([sys.executable, "app/backend/server.py"], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # Wait a moment for server to start
        time.sleep(3)
        
        # Check if server is running
        if process.poll() is None:
            print("✅ Server started successfully!")
            print("🌐 Opening browsers...")
            webbrowser.open("http://localhost:3000")  # Intro/tutorial
            webbrowser.open("http://localhost:3001")  # Main app
            print("\n📋 Login Credentials:")
            print("   Username: admin")
            print("   Password: admin123")
            print("\n🌐 Available URLs:")
            print("   • Main VoIP App: http://localhost:3001")
            print("   • Tutorial/Intro: http://localhost:3000")
            print("\n🛑 To stop server: Ctrl+C")
            
            try:
                process.wait()
            except KeyboardInterrupt:
                print("\n🛑 Stopping server...")
                process.terminate()
                process.wait()
        else:
            stdout, stderr = process.communicate()
            print("❌ Server failed to start:")
            print(stderr.decode())
            
    except Exception as e:
        print(f"❌ Error starting server: {e}")

def show_menu():
    print("\n🎮 What would you like to do?")
    print("1. 🚀 Start the VoIP system")
    print("2. 📚 Read project overview")
    print("3. 🧪 Run tests")
    print("4. 🔧 Install dependencies")
    print("5. 🎨 Build main app frontend")
    print("6. 📖 Build intro frontend")
    print("7. ❌ Exit")
    
    choice = input("\nEnter your choice (1-7): ").strip()
    
    if choice == "1":
        if check_python() and check_dependencies():
            start_server()
    elif choice == "2":
        print("\n📖 Opening PROJECT_OVERVIEW.md...")
        if os.path.exists("docs/PROJECT_OVERVIEW.md"):
            with open("docs/PROJECT_OVERVIEW.md", "r") as f:
                print(f.read())
        else:
            print("❌ PROJECT_OVERVIEW.md not found")
    elif choice == "3":
        print("\n🧪 Running tests...")
        subprocess.run([sys.executable, "tests/test_authentication.py"])
        subprocess.run([sys.executable, "tests/test_voip.py"])
    elif choice == "4":
        print("\n🔧 Installing Python dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "app/backend/requirements.txt"])
    elif choice == "5":
        print("\n🎨 Building main app frontend...")
        os.chdir("app/frontend")
        subprocess.run(["npm", "install"])
        subprocess.run(["npm", "run", "build"])
        os.chdir("../..")
        print("✅ Main app frontend built successfully!")
    elif choice == "6":
        print("\n📖 Building intro frontend...")
        os.chdir("intro")
        subprocess.run(["npm", "install"])
        subprocess.run(["npm", "run", "build"])
        os.chdir("..")
        print("✅ Intro frontend built successfully!")
    elif choice == "7":
        print("👋 Goodbye!")
        sys.exit(0)
    else:
        print("❌ Invalid choice. Please try again.")

def main():
    print_header()
    
    print("🎯 This is a complete VoIP system with:")
    print("   • User authentication")
    print("   • P2P voice calls")
    print("   • Opus audio codec")
    print("   • Modern web interface")
    print("   • Real-time communication")
    print("   • Separate tutorial/intro interface")
    print()
    
    show_menu()

if __name__ == "__main__":
    main() 