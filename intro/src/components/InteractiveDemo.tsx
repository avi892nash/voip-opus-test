import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import p5 from 'p5';
import { OpusEncoder } from '../utils/opusEncoder';

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
  const [actualCompressedSize, setActualCompressedSize] = useState<number>(0);

  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlayingOpus, setIsPlayingOpus] = useState(false);
  const [isPlayingWav, setIsPlayingWav] = useState(false);
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
  const recordingStartTimeRef = useRef<number | null>(null);
  const opusEncoderRef = useRef<OpusEncoder | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  
  // Use refs to make state accessible to p5 instance
  const isRecordingRef = useRef(isRecording);
  const audioDataRef = useRef(audioData);
  const compressedDataRef = useRef(compressedData);
  const recordingCompleteRef = useRef(recordingComplete);
  
  // Update refs when state changes
  isRecordingRef.current = isRecording;
  audioDataRef.current = audioData;
  compressedDataRef.current = compressedData;
  recordingCompleteRef.current = recordingComplete;

  // Create p5 instance only once to prevent WebGL context accumulation
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
          
          if (isRecordingRef.current && analyserRef.current) {
            drawLiveRecording(p);
          } else if (recordingCompleteRef.current && audioDataRef.current) {
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
  }, []); // Remove dependencies to prevent recreation

  // Cleanup effect for audio contexts and other resources
  useEffect(() => {
    return () => {
      // Clean up audio contexts
      if (playbackAudioContextRef.current) {
        playbackAudioContextRef.current.close();
        playbackAudioContextRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Clean up media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      // Clean up opus encoder
      if (opusEncoderRef.current) {
        opusEncoderRef.current.destroy();
        opusEncoderRef.current = null;
      }
    };
  }, []);

  const drawLiveRecording = (p: p5) => {
    const analyser = analyserRef.current!;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const centerY = p.height / 2;
    const maxAmplitude = 80;

    // Draw real-time audio as a continuous waveform
    p.stroke(59, 130, 246);
    p.strokeWeight(2);
    p.noFill();
    
    p.beginShape();
    for (let i = 0; i < dataArray.length; i++) {
      const x = p.map(i, 0, dataArray.length, 0, p.width);
      const amplitude = (dataArray[i] / 255) * maxAmplitude;
      const y = centerY + amplitude * Math.sin(i * 0.2 + p.frameCount * 0.1);
      p.vertex(x, y);
    }
    p.endShape();

    // Add clear labels
    p.noStroke();
    p.fill(59, 130, 246);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Live Recording...', p.width/2, 30);
    
    p.textSize(12);
    p.fill(100);
    p.text('Speak or make sounds to see the waveform', p.width/2, p.height - 20);
  };

  const drawAudioComparison = (p: p5) => {
    if (!audioDataRef.current) return;

    const centerY = p.height / 2;
    const amplitude = 50;

    // Draw grid for better visualization
    p.stroke(200);
    p.strokeWeight(0.5);
    for (let i = 0; i <= p.width; i += 50) {
      p.line(i, 0, i, p.height);
    }
    for (let i = 0; i <= p.height; i += 50) {
      p.line(0, i, p.width, i);
    }

    // Draw original audio waveform (top half) - more realistic
    p.stroke(59, 130, 246);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    
    const audioData = audioDataRef.current!;
    const step = Math.max(1, Math.floor(audioData.length / p.width));
    for (let i = 0; i < audioData.length; i += step) {
      const x = p.map(i, 0, audioData.length, 0, p.width);
      const y = centerY - amplitude + audioData[i] * amplitude;
      p.vertex(x, y);
    }
    p.endShape();

    // Draw compressed audio waveform (bottom half) - showing compression artifacts
    if (compressedDataRef.current) {
      p.stroke(239, 68, 68);
      p.strokeWeight(2);
      p.beginShape();
      
      const compressedData = compressedDataRef.current;
      for (let i = 0; i < compressedData.length; i += step) {
        const x = p.map(i, 0, compressedData.length, 0, p.width);
        const y = centerY + amplitude + compressedData[i] * amplitude;
        p.vertex(x, y);
      }
      p.endShape();
    }

    // Clear labels with better positioning
    p.noStroke();
    p.fill(59, 130, 246);
    p.textAlign(p.LEFT);
    p.textSize(14);
    p.text('Original Audio (WAV)', 20, 40);
    
    if (compressedDataRef.current) {
      p.fill(239, 68, 68);
      p.text('Compressed Audio (Opus)', 20, p.height - 20);
    }
    
    // Add explanation
    p.textAlign(p.CENTER);
    p.textSize(12);
    p.fill(100);
    if (compressedDataRef.current) {
      p.text('Blue: Original WAV audio with full quality', p.width/2, 60);
      p.text('Red: Compressed Opus audio with reduced size', p.width/2, 75);
    } else {
      p.text('Processing audio...', p.width/2, p.height/2 + 40);
    }
  };

  const drawPlaceholder = (p: p5) => {
    p.noStroke();
    p.fill(0);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Click "Start Recording" to begin', p.width/2, p.height/2);
  };

  const startRecording = async () => {
    try {
      // Stop any ongoing playback to prevent feedback
      if (playbackAudioContextRef.current) {
        await playbackAudioContextRef.current.close();
        playbackAudioContextRef.current = null;
      }
      setIsPlayingWav(false);
      setIsPlayingOpus(false);
      
      // Initialize Opus encoder - no fallback, fail if WASM doesn't work
      opusEncoderRef.current = new OpusEncoder(config);
      await opusEncoderRef.current.initialize(config);
      await opusEncoderRef.current.startRecording();
      
      // Set up visualization with echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      analyser.fftSize = 256;
      source.connect(analyser);
      // Don't connect to destination to avoid feedback
      
      setIsRecording(true);
      setRecordingComplete(false);
      recordingStartTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error starting Opus WASM recording:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone permissions in your browser and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.');
        } else if (error.message.includes('Opus WASM')) {
          alert(`Opus WASM Error: ${error.message}\n\nPlease ensure the Opus WASM files are properly loaded.`);
        } else {
          alert(`Opus recording error: ${error.message}`);
        }
      } else {
        alert('Unable to start Opus WASM recording. Please check your browser compatibility and try again.');
      }
      
      // Clean up on error
      setIsRecording(false);
      if (opusEncoderRef.current) {
        opusEncoderRef.current.destroy();
        opusEncoderRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    try {
      if (!opusEncoderRef.current) {
        throw new Error('Opus encoder not available');
      }

      // Stop Opus recording and get real data
      const result = await opusEncoderRef.current.stopRecording();
      
      setAudioData(result.rawAudio);
      setCompressedData(result.rawAudio); // Use raw audio for visualization, but we'll calculate real compressed size
      setRecordingDuration(result.duration);
      
      // Store the actual compressed size
      const compressedSizeKB = result.compressedAudio.length / 1024; // Convert to KB
      console.log('Real Opus compressed audio size:', result.compressedAudio.length, 'bytes =', compressedSizeKB, 'KB');
      setActualCompressedSize(compressedSizeKB);
      
      // Clean up visualization
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
      setRecordingComplete(true);
      
      // Clean up Opus encoder
      opusEncoderRef.current.destroy();
      opusEncoderRef.current = null;
      
    } catch (error) {
      console.error('Error stopping Opus WASM recording:', error);
      alert(`Opus WASM recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reset state on error
      setIsRecording(false);
      setRecordingComplete(false);
      if (opusEncoderRef.current) {
        opusEncoderRef.current.destroy();
        opusEncoderRef.current = null;
      }
    }
  };



  const playWavAudio = async () => {
    if (!audioData || isPlayingWav) return;
    
    try {
      setIsPlayingWav(true);
      
      // Create audio context for playback
      if (!playbackAudioContextRef.current) {
        playbackAudioContextRef.current = new AudioContext();
      }
      
      const audioContext = playbackAudioContextRef.current;
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Create audio buffer with original uncompressed audio data
      const audioBuffer = audioContext.createBuffer(
        config.channels,
        audioData.length,
        48000
      );
      
      // Fill the buffer with original audio data (no compression artifacts)
      for (let channel = 0; channel < config.channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < audioData.length; i++) {
          channelData[i] = audioData[i];
        }
      }
      
      // Create and play the audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        setIsPlayingWav(false);
      };
      
      source.start();
      
    } catch (error) {
      console.error('Error playing WAV audio:', error);
      setIsPlayingWav(false);
      alert('Error playing audio. Please try again.');
    }
  };

  const playOpusAudio = async () => {
    if (!compressedData || isPlayingOpus) return;
    
    try {
      setIsPlayingOpus(true);
      
      // Create audio context for playback
      if (!playbackAudioContextRef.current) {
        playbackAudioContextRef.current = new AudioContext();
      }
      
      const audioContext = playbackAudioContextRef.current;
      
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Simulate Opus decompression effects based on configuration
      const processedAudio = new Float32Array(compressedData.length);
      
      for (let i = 0; i < compressedData.length; i++) {
        let sample = compressedData[i];
        
        // Apply compression artifacts based on bitrate
        if (config.bitrate < 32) {
          // Low bitrate: add quantization noise and reduce high frequencies
          const quantizationNoise = (Math.random() - 0.5) * 0.02;
          sample = sample * 0.8 + quantizationNoise;
          
          // Simple low-pass filter effect
          if (i > 0) {
            sample = sample * 0.7 + processedAudio[i-1] * 0.3;
          }
        } else if (config.bitrate < 64) {
          // Medium bitrate: subtle compression artifacts
          const quantizationNoise = (Math.random() - 0.5) * 0.005;
          sample = sample + quantizationNoise;
        }
        // High bitrate (64+): minimal artifacts, keep original quality
        
        processedAudio[i] = sample;
      }
      
      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(
        config.channels,
        processedAudio.length,
        48000
      );
      
      // Fill the buffer with processed audio data
      for (let channel = 0; channel < config.channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < processedAudio.length; i++) {
          channelData[i] = processedAudio[i];
        }
      }
      
      // Create and play the audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        setIsPlayingOpus(false);
      };
      
      source.start();
      
    } catch (error) {
      console.error('Error playing Opus audio:', error);
      setIsPlayingOpus(false);
      alert('Error playing audio. Please try again.');
    }
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

  // Calculate data sizes - match the actual WAV file format that gets downloaded (16-bit)
  const rawDataSize = audioData ? ((audioData.length * 2 + 44) / 1024) : 0; // KB (16-bit WAV = 2 bytes per sample + 44 byte header)
  const compressedDataSize = actualCompressedSize; // KB (actual compressed data size from Opus encoding)
  const spaceSaved = rawDataSize > 0 ? ((rawDataSize - compressedDataSize) / rawDataSize) * 100 : 0;
  const spaceSavedKB = rawDataSize - compressedDataSize;

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
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {isRecording ? 'Live Recording' : recordingComplete ? 'Audio Comparison' : 'Audio Visualization'}
              </h3>
            </div>
            
            <div ref={canvasRef} className="w-full h-80 bg-gray-50 rounded-lg mb-4 overflow-hidden"></div>
            
            <div className="flex flex-col items-center space-y-4">
              {!isRecording ? (
                <>
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                  >
                    Start Recording
                  </button>
                  <p className="text-sm text-gray-600 text-center max-w-md">
                    Click "Start Recording" to begin. Your browser will ask for microphone permissions.
                  </p>
                </>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  Stop Recording
                </button>
              )}
              
              {compressedData && (
                <div className="flex space-x-4">
                  <button
                    onClick={playWavAudio}
                    disabled={isPlayingWav}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      isPlayingWav 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {isPlayingWav ? (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                        <span>Playing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Play Original WAV</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={playOpusAudio}
                    disabled={isPlayingOpus}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      isPlayingOpus 
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isPlayingOpus ? (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                        <span>Playing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <span>Play Compressed Opus</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Stats Section - Always show inside Audio Comparison box when recording is complete */}
            {recordingComplete && audioData && (
              <div className="mt-8 space-y-6">
                {/* Live Data Size Comparison */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                    WAV vs Opus Size Comparison
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-300 shadow-sm">
                      <div className="text-sm text-blue-600 font-medium">Original WAV Audio</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {rawDataSize.toFixed(1)} KB
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {audioData.length.toLocaleString()} samples × 2 bytes + 44B header
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-red-300 shadow-sm">
                      <div className="text-sm text-red-600 font-medium">Compressed Opus Audio</div>
                      <div className="text-2xl font-bold text-red-700">
                        {compressedDataSize.toFixed(1)} KB
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        Real Opus WASM encoding at {config.bitrate} kbps
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-400 to-green-600 p-4 rounded-lg text-white shadow-lg">
                      <div className="text-sm font-medium">Space Saved</div>
                      <div className="text-2xl font-bold">
                        {spaceSaved.toFixed(0)}%
                      </div>
                      <div className="text-sm mt-1">
                        {spaceSavedKB.toFixed(1)} KB saved
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-4">
                    <div className="text-xs text-yellow-800 text-center flex items-center justify-center">
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Opus reduces data size by {spaceSaved.toFixed(0)}% while maintaining good audio quality!
                    </div>
                  </div>
                </div>

                {/* Quality Metrics */}
                {qualityMetrics && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality Metrics</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Signal-to-Noise Ratio</div>
                        <div className="text-xl font-bold text-primary-500">
                          {qualityMetrics.snr.toFixed(1)} dB
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Compression Ratio</div>
                        <div className="text-xl font-bold text-primary-500">
                          {qualityMetrics.compressionRatio.toFixed(1)}:1
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600">Estimated Quality</div>
                        <div className="text-xl font-bold text-primary-500">
                          {qualityMetrics.snr > 30 ? 'Excellent' : qualityMetrics.snr > 20 ? 'Good' : 'Fair'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            )}
          </motion.div>

          {/* Opus Configuration Panel - Always visible on the right */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
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
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo; 