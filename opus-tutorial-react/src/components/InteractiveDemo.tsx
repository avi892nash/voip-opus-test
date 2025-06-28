import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import p5 from 'p5';

interface AudioConfig {
  bitrate: number;
  complexity: number;
  frameSize: number;
  channels: number;
}

const InteractiveDemo: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [compressedData, setCompressedData] = useState<Float32Array | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AudioConfig>({
    bitrate: 64,
    complexity: 5,
    frameSize: 20,
    channels: 1
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (canvasRef.current && !p5InstanceRef.current) {
      const sketch = (p: p5) => {
        const getCanvasWidth = () => canvasRef.current?.offsetWidth || 400;
        const getCanvasHeight = () => 300;
        
        p.setup = () => {
          const canvas = p.createCanvas(getCanvasWidth(), getCanvasHeight());
          canvas.parent(canvasRef.current!);
          p.background(248, 250, 252);
        };

        p.draw = () => {
          p.background(248, 250, 252);
          
          if (analyserRef.current) {
            drawRealTimeAudio(p);
          } else if (audioData) {
            drawAudioComparison(p);
          } else {
            drawPlaceholder(p);
          }
        };

        p.windowResized = () => {
          p.resizeCanvas(getCanvasWidth(), getCanvasHeight());
        };
      };

      p5InstanceRef.current = new p5(sketch);
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [audioData, compressedData]);

  const drawRealTimeAudio = (p: p5) => {
    const analyser = analyserRef.current!;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const barWidth = p.width / dataArray.length;
    const maxHeight = p.height - 40;

    p.fill(59, 130, 246);
    p.noStroke();

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * maxHeight;
      const x = i * barWidth;
      const y = p.height - barHeight - 20;
      
      p.rect(x, y, barWidth - 1, barHeight);
    }

    p.noStroke();
    p.fill(0);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Real-time Audio Input', p.width/2, 20);
  };

  const drawAudioComparison = (p: p5) => {
    if (!audioData) return;

    const centerY = p.height / 2;
    const amplitude = 80;

    // Draw original audio
    p.stroke(59, 130, 246);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    
    for (let i = 0; i < audioData.length; i += 10) {
      const x = p.map(i, 0, audioData.length, 0, p.width);
      const y = centerY - amplitude + audioData[i] * amplitude;
      p.vertex(x, y);
    }
    p.endShape();

    // Draw compressed audio if available
    if (compressedData) {
      p.stroke(239, 68, 68);
      p.strokeWeight(1);
      p.beginShape();
      
      for (let i = 0; i < compressedData.length; i += 10) {
        const x = p.map(i, 0, compressedData.length, 0, p.width);
        const y = centerY + amplitude + compressedData[i] * amplitude;
        p.vertex(x, y);
      }
      p.endShape();
    }

    // Labels
    p.noStroke();
    p.fill(59, 130, 246);
    p.textAlign(p.LEFT);
    p.textSize(14);
    p.text('Original Audio', 20, 40);
    
    if (compressedData) {
      p.fill(239, 68, 68);
      p.text('Compressed Audio', 20, p.height - 20);
    }
  };

  const drawPlaceholder = (p: p5) => {
    p.noStroke();
    p.fill(0);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Click "Start Recording" or upload an audio file to begin', p.width/2, p.height/2);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsRecording(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file);
      simulateAudioProcessing(file);
    }
  };

  const simulateAudioProcessing = (file: File) => {
    // Simulate audio data processing
    const sampleRate = 48000;
    const duration = 3; // 3 seconds
    const samples = sampleRate * duration;
    
    // Generate simulated audio data
    const originalData = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const time = i / sampleRate;
      originalData[i] = Math.sin(2 * Math.PI * 440 * time) * 0.5 + 
                       Math.sin(2 * Math.PI * 880 * time) * 0.3 +
                       Math.sin(2 * Math.PI * 220 * time) * 0.2;
    }
    
    setAudioData(originalData);
    
    // Simulate compression
    setTimeout(() => {
      const compressedData = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        // Simulate compression artifacts
        compressedData[i] = originalData[i] * (config.bitrate / 128) + 
                           (Math.random() - 0.5) * 0.1 * (1 - config.bitrate / 128);
      }
      setCompressedData(compressedData);
    }, 1000);
  };

  const downloadCompressedAudio = () => {
    if (!compressedData) return;
    
    // Create a simple WAV file header
    const sampleRate = 48000;
    const numChannels = config.channels;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    
    const buffer = new ArrayBuffer(44 + compressedData.length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + compressedData.length * 2, true); // File size
    view.setUint32(8, 0x57415645, false); // "WAVE"
    view.setUint32(12, 0x666D7420, false); // "fmt "
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, numChannels, true); // Channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, byteRate, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, compressedData.length * 2, true); // Data size
    
    // Audio data
    for (let i = 0; i < compressedData.length; i++) {
      const sample = Math.max(-1, Math.min(1, compressedData[i]));
      view.setInt16(44 + i * 2, sample * 0x7FFF, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compressed_audio.wav';
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateQualityMetrics = () => {
    if (!audioData || !compressedData) return null;
    
    // Calculate SNR (Signal-to-Noise Ratio)
    let signalPower = 0;
    let noisePower = 0;
    
    for (let i = 0; i < Math.min(audioData.length, compressedData.length); i++) {
      signalPower += audioData[i] * audioData[i];
      const noise = audioData[i] - compressedData[i];
      noisePower += noise * noise;
    }
    
    const snr = 10 * Math.log10(signalPower / noisePower);
    const compressionRatio = audioData.length / compressedData.length;
    
    return { snr, compressionRatio };
  };

  const qualityMetrics = calculateQualityMetrics();

  return (
    <section id="demo" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          Interactive Opus Demo
        </motion.h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Audio Visualization */}
          <motion.div 
            className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Audio Visualization</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {showConfig ? 'Hide' : 'Show'} Config
                </button>
              </div>
            </div>
            
            <div ref={canvasRef} className="w-full h-80 bg-gray-50 rounded-lg mb-4 overflow-hidden"></div>
            
            <div className="flex justify-center space-x-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Stop Recording
                </button>
              )}
              
              <label className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                Upload Audio
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              {compressedData && (
                <button
                  onClick={downloadCompressedAudio}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                >
                  Download
                </button>
              )}
            </div>
          </motion.div>

          {/* Configuration Panel */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {/* Opus Configuration */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Opus Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bitrate: {config.bitrate} kbps
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="128"
                    value={config.bitrate}
                    onChange={(e) => setConfig({...config, bitrate: Number(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>8</span>
                    <span>128</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complexity: {config.complexity}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={config.complexity}
                    onChange={(e) => setConfig({...config, complexity: Number(e.target.value)})}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Fast</span>
                    <span>Slow</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frame Size: {config.frameSize}ms
                  </label>
                  <select
                    value={config.frameSize}
                    onChange={(e) => setConfig({...config, frameSize: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={2.5}>2.5ms</option>
                    <option value={5}>5ms</option>
                    <option value={10}>10ms</option>
                    <option value={20}>20ms</option>
                    <option value={40}>40ms</option>
                    <option value={60}>60ms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channels
                  </label>
                  <select
                    value={config.channels}
                    onChange={(e) => setConfig({...config, channels: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={1}>Mono</option>
                    <option value={2}>Stereo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            {qualityMetrics && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Metrics</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Signal-to-Noise Ratio</div>
                    <div className="text-2xl font-bold text-primary-500">
                      {qualityMetrics.snr.toFixed(1)} dB
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Compression Ratio</div>
                    <div className="text-2xl font-bold text-primary-500">
                      {qualityMetrics.compressionRatio.toFixed(1)}:1
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Estimated Quality</div>
                    <div className="text-2xl font-bold text-primary-500">
                      {qualityMetrics.snr > 30 ? 'Excellent' : qualityMetrics.snr > 20 ? 'Good' : 'Fair'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Info */}
            {uploadedFile && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">File Information</h3>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>Name:</strong> {uploadedFile.name}</div>
                  <div><strong>Size:</strong> {(uploadedFile.size / 1024).toFixed(1)} KB</div>
                  <div><strong>Type:</strong> {uploadedFile.type}</div>
                  <div><strong>Duration:</strong> ~3 seconds (simulated)</div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo; 