# Opus Codec Tutorial - Interactive Demo

An interactive web application demonstrating the Opus audio codec with real-time visualizations, audio processing, and educational content.

## Features

### 🎨 Enhanced Visual Animations

#### OpusCodec Component
- **Step-by-step encoding process visualization** with interactive animations
- **Real-time compression workflow** showing audio input → frame splitting → encoding → output
- **Quality vs bitrate tradeoff controls** with live feedback
- **Interactive step navigation** with detailed explanations

#### AudioBasics Component
- **Real-time waveform visualization** comparing original vs compressed audio
- **Frequency spectrum analysis** showing how compression affects different frequencies
- **Interactive compression level controls** with live file size calculations
- **Before/after compression comparison** with animated transitions

### 🎵 Interactive Audio Demos

#### Real Audio Processing Demo
- **Microphone input support** with real-time audio visualization
- **File upload functionality** for audio samples (WAV, MP3, etc.)
- **Client-side audio compression simulation** with configurable parameters
- **Download compressed audio** as WAV files

#### Opus Configuration Playground
- **Bitrate control** (8-128 kbps) with real-time quality feedback
- **Complexity settings** (0-10) affecting encoding speed vs quality
- **Frame size selection** (2.5ms to 60ms) for different use cases
- **Channel configuration** (Mono/Stereo)
- **Quality metrics display** including SNR and compression ratio

### 📊 Real-time Analytics
- **Signal-to-Noise Ratio (SNR)** calculations
- **Compression ratio** measurements
- **File size comparisons** between original and compressed audio
- **Quality indicators** with color-coded feedback

## Technology Stack

- **React 19** with TypeScript
- **Framer Motion** for smooth animations
- **P5.js** for audio visualizations
- **Web Audio API** for real-time audio processing
- **Tailwind CSS** for modern styling
- **Vite** for fast development

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:5173`

## Usage

### Interactive Demo
1. Click "Start Recording" to use your microphone
2. Or upload an audio file using the "Upload Audio" button
3. Adjust Opus configuration parameters in the sidebar
4. View real-time quality metrics and compression effects
5. Download the processed audio file

### Educational Content
- Navigate through the step-by-step Opus encoding process
- Explore audio compression concepts with interactive visualizations
- Learn about quality vs bitrate tradeoffs
- Understand frequency domain analysis

## Browser Compatibility

- **Chrome/Edge**: Full support for all features
- **Firefox**: Full support for all features
- **Safari**: Full support for all features
- **Mobile browsers**: Limited microphone support

## Development

### Project Structure
```
src/
├── components/
│   ├── AudioBasics.tsx      # Audio compression basics with visualizations
│   ├── OpusCodec.tsx        # Step-by-step encoding process
│   ├── InteractiveDemo.tsx  # Real audio processing demo
│   └── ...
├── hooks/                   # Custom React hooks
├── utils/                   # Utility functions
└── types/                   # TypeScript type definitions
```

### Key Components

#### AudioBasics.tsx
- Real-time waveform visualization using P5.js
- Frequency spectrum analysis
- Interactive compression controls
- File size calculations

#### OpusCodec.tsx
- Step-by-step encoding animation
- Interactive quality vs bitrate controls
- Detailed process explanations
- Visual feedback on compression effects

#### InteractiveDemo.tsx
- Web Audio API integration
- Microphone input handling
- File upload/download functionality
- Opus configuration playground
- Quality metrics calculation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Opus codec specification and documentation
- Web Audio API documentation
- P5.js library for creative coding
- Framer Motion for animations
