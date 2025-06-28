# Opus Codec Tutorial: From Theory to Real-time VoIP

A comprehensive tutorial project that teaches the Opus audio codec through hands-on implementation of a Voice-over-IP (VoIP) system.

## 🎯 Learning Objectives

By the end of this tutorial, you will understand:
- **Audio compression fundamentals** and why Opus is revolutionary
- **Opus codec architecture** and its key parameters
- **Real-time audio processing** and network streaming
- **Quality optimization** techniques for VoIP applications
- **Practical implementation** of a complete audio communication system

## 📚 Tutorial Structure

### **Phase 1: Foundation (Beginner)**
- [Lesson 1: Introduction to Audio Codecs](./lessons/01_audio_codecs_intro.md)
- [Lesson 2: Opus Codec Fundamentals](./lessons/02_opus_fundamentals.md)
- [Lesson 3: Basic Opus Tools](./lessons/03_basic_opus_tools.md)

### **Phase 2: Implementation (Intermediate)**
- [Lesson 4: Audio Capture & Processing](./lessons/04_audio_capture.md)
- [Lesson 5: Real-time Opus Encoding](./lessons/05_realtime_opus.md)
- [Lesson 6: Network Audio Streaming](./lessons/06_network_streaming.md)

### **Phase 3: Advanced Topics (Advanced)**
- [Lesson 7: Quality Analysis & Metrics](./lessons/07_quality_analysis.md)
- [Lesson 8: Optimization & Best Practices](./lessons/08_optimization.md)

## 🚀 Quick Start

### Prerequisites
```bash
# Install Python dependencies
pip install -r requirements.txt

# Ensure Opus tools are available
# (included in libopus/ directory)
```

### Basic Usage
```bash
# 1. Test basic Opus encoding
python opus_test.py

# 2. Capture microphone audio
python microphone.py

# 3. Start the server
python server.py

# 4. Connect with client
python client.py
```

## 🛠️ Project Components

### Core Files
- `microphone.py` - Basic audio capture
- `microphone_opus.py` - Audio capture with Opus encoding
- `server.py` - Network server for audio streaming
- `client.py` - Network client for audio reception
- `play_audio.py` - Audio playback utility
- `opus_test.py` - Basic Opus encoding test

### Opus Tools (libopus/)
- `opusenc.exe` - Audio to Opus encoder
- `opusdec.exe` - Opus to audio decoder
- `opusinfo.exe` - Opus file information tool

### Sample Files
- `sample.wav` - Test audio file
- `sample.opus` - Encoded test file
- `test.opus` - Generated Opus file

## 📖 Learning Path

### For Beginners
Start with Phase 1 lessons to understand audio compression concepts and basic Opus usage.

### For Intermediate Developers
Skip to Phase 2 for hands-on implementation of real-time audio processing and networking.

### For Advanced Users
Focus on Phase 3 for optimization techniques and quality analysis.

## 🎓 Educational Features

- **Progressive Learning**: Each lesson builds upon previous concepts
- **Hands-on Exercises**: Practical coding exercises with real audio
- **Quality Analysis**: Tools to measure and compare audio quality
- **Real-world Application**: Complete VoIP system implementation
- **Performance Optimization**: Techniques for low-latency audio streaming

## 🔧 Technical Specifications

- **Audio Format**: 16-bit PCM, 44.1kHz, Mono
- **Codec**: Opus (variable bitrate, 6-256 kbps)
- **Network**: TCP/UDP sockets
- **Latency Target**: <50ms end-to-end
- **Quality**: Near-transparent at 64+ kbps

## 📝 Contributing

This tutorial is designed for educational purposes. Contributions to improve explanations, add exercises, or enhance the implementation are welcome!

## 📄 License

This project is open source and available under the MIT License.

---

**Ready to dive into the world of audio codecs? Start with [Lesson 1](./lessons/01_audio_codecs_intro.md)!**
