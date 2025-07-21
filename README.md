![Project Logo](logo.png)
# VoIP System with Opus Codec

A complete peer-to-peer voice communication system with user authentication, WebRTC, and the Opus audio codec.

## 🚀 Quick Start

```bash
# Run the quick start guide
python scripts/quick_start.py

# Or start manually
cd app/backend
python server.py
```

## 📁 Project Structure

```
voip-opus-test/
├── 🎯 app/                      # Main VoIP Application
│   ├── backend/                # Python backend server
│   │   ├── server.py          # Main server (HTTP + WebSocket)
│   │   ├── requirements.txt   # Python dependencies
│   │   └── client.py          # Simple client
│   └── frontend/              # React frontend for VoIP app
│       ├── src/               # React source code
│       ├── package.json       # Frontend dependencies
│       └── vite.config.ts     # Build configuration
│
├── 📚 intro/                   # Introduction/Tutorial Frontend
│   ├── src/                   # React tutorial components
│   ├── package.json           # Tutorial dependencies
│   └── ...                    # Complete tutorial interface
│
├── 📚 docs/                    # Documentation
│   ├── README.md              # Complete setup guide
│   ├── PROJECT_OVERVIEW.md    # Project overview
│   └── task.md                # Original project plan
│
├── 🧪 tests/                   # Test files
│   ├── test_voip.py          # VoIP functionality tests
│   └── test_authentication.py # Auth system tests
│
├── 🎵 audio_samples/           # Audio files
│   ├── sample.wav            # Test audio file
│   ├── sample.opus           # Compressed test file
│   └── test.opus             # Additional test file
│
├── 🛠️ tools/                    # Audio tools
│   ├── microphone.py         # Basic mic test
│   ├── microphone_opus.py    # Opus mic test
│   ├── play_audio.py         # Audio playback
│   └── opus_test.py          # Opus codec test
│
├── 📜 scripts/                 # Utility scripts
│   ├── start.py              # Automated startup
│   ├── demo.py               # Demo scripts
│   └── quick_start.py        # Quick start guide
│
└── 📦 libopus/                # Opus codec tools
    ├── opusenc.exe           # Opus encoder
    ├── opusdec.exe           # Opus decoder
    └── opusinfo.exe          # Opus info tool
```

## 🎯 What This Project Is

This is a **production-ready VoIP system** that demonstrates:
- **Peer-to-peer voice calls** using WebRTC
- **Opus audio codec** for high-quality compression
- **User authentication** with session management
- **Modern web interface** built with React
- **Real-time communication** via WebSocket signaling

## 🔐 Default Login

- **Username**: `admin`
- **Password**: `admin123`

## 🌐 Access

### Main VoIP App
- **Web Interface**: http://localhost:3001 (app frontend)
- **Backend API**: http://localhost:3000
- **WebSocket**: ws://localhost:4000

### Introduction/Tutorial
- **Tutorial Interface**: http://localhost:3000 (intro frontend)

## 📖 Documentation

- [Complete Setup Guide](docs/README.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Original Task Plan](docs/task.md)

## 🛠️ Development

### Main App Development
```bash
# Backend
cd app/backend
pip install -r requirements.txt
python server.py

# Frontend (in another terminal)
cd app/frontend
npm install
npm run dev
```

### Introduction/Tutorial Development
```bash
cd intro
npm install
npm run dev
```

### Run Tests
```bash
python tests/test_authentication.py
python tests/test_voip.py
```

## 🎮 Usage

1. **Start the backend server** (runs on port 3000)
2. **Access the main VoIP app** at http://localhost:3001
3. **Access the tutorial** at http://localhost:3000
4. **Login with admin/admin123** to start making calls

---

**Note**: This project has two separate frontends:
- **`app/frontend/`** - The main VoIP application interface
- **`intro/`** - The introduction/tutorial interface with educational content
