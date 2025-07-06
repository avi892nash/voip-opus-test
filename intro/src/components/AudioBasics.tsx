import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import p5 from 'p5';

const AudioBasics: React.FC = () => {
  const [compressionLevel, setCompressionLevel] = useState(50);
  const [showSpectrum, setShowSpectrum] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (canvasRef.current && !p5InstanceRef.current) {
      const sketch = (p: p5) => {
        let time = 0;
        
        const getCanvasWidth = () => canvasRef.current?.offsetWidth || 400;
        const getCanvasHeight = () => 300;
        
        p.setup = () => {
          const canvas = p.createCanvas(getCanvasWidth(), getCanvasHeight());
          canvas.parent(canvasRef.current!);
          p.background(248, 250, 252);
        };

        p.draw = () => {
          p.background(248, 250, 252);
          
          if (showSpectrum) {
            drawSpectrum(p);
          } else {
            drawWaveformComparison(p);
          }
          
          time += 0.05;
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
  }, [compressionLevel, showSpectrum]);

  const drawWaveformComparison = (p: p5) => {
    const centerY = p.height / 2;
    const originalAmplitude = 60;
    const compressedAmplitude = originalAmplitude * (compressionLevel / 100);
    
    // Draw original waveform (top)
    p.stroke(59, 130, 246);
    p.strokeWeight(3);
    p.noFill();
    p.beginShape();
    
    for (let x = 0; x < p.width; x++) {
      const time = x * 0.02;
      const y = centerY - originalAmplitude + Math.sin(time) * originalAmplitude + 
                Math.sin(time * 3) * (originalAmplitude * 0.3) + 
                Math.sin(time * 7) * (originalAmplitude * 0.1);
      p.vertex(x, y);
    }
    p.endShape();
    
    // Draw compressed waveform (bottom)
    p.stroke(239, 68, 68);
    p.strokeWeight(2);
    p.beginShape();
    
    for (let x = 0; x < p.width; x++) {
      const time = x * 0.02;
      const y = centerY + originalAmplitude + Math.sin(time) * compressedAmplitude + 
                Math.sin(time * 3) * (compressedAmplitude * 0.3) + 
                Math.sin(time * 7) * (compressedAmplitude * 0.1);
      p.vertex(x, y);
    }
    p.endShape();
    
    // Labels
    p.noStroke();
    p.fill(59, 130, 246);
    p.textAlign(p.LEFT);
    p.textSize(14);
    p.text('Original Audio', 20, 40);
    
    p.fill(239, 68, 68);
    p.text('Compressed Audio', 20, p.height - 20);
    
    // Compression indicator
    p.fill(0);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text(`Compression: ${compressionLevel}%`, p.width/2, 30);
  };

  const drawSpectrum = (p: p5) => {
    const centerY = p.height / 2;
    const maxAmplitude = 60;
    
    // Draw frequency spectrum as waves
    p.stroke(59, 130, 246);
    p.strokeWeight(2);
    p.noFill();
    
    // Draw multiple frequency components
    for (let freq = 1; freq <= 5; freq++) {
      const amplitude = maxAmplitude * (1 - compressionLevel / 100) / freq;
      const colorHue = p.map(freq, 1, 5, 0, 255);
      p.stroke(colorHue, 200, 200);
      
      p.beginShape();
      for (let x = 0; x < p.width; x++) {
        const time = x * 0.02;
        const y = centerY + Math.sin(time * freq) * amplitude + 
                  Math.sin(time * freq * 2) * (amplitude * 0.3) + 
                  Math.sin(time * freq * 3) * (amplitude * 0.1);
        p.vertex(x, y);
      }
      p.endShape();
    }
    
    // Labels
    p.noStroke();
    p.fill(0);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Frequency Spectrum Analysis', p.width/2, 30);
    p.textSize(12);
    p.text(`Compression: ${compressionLevel}%`, p.width/2, p.height - 10);
  };

  const calculateFileSize = (compression: number) => {
    const originalSize = 30; // MB
    const compressedSize = originalSize * (compression / 100);
    return { original: originalSize, compressed: compressedSize };
  };

  const fileSizes = calculateFileSize(compressionLevel);

  return (
    <section id="basics" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          What is Audio Compression?
        </motion.h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start mt-8">
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Why Do We Need Audio Compression?</h3>
            <p className="text-lg text-gray-600 mb-8">
              Raw audio files are huge! A 3-minute song in WAV format can be 30MB, but the same song compressed with Opus might be only 3MB with nearly identical quality.
            </p>
            
            <div className="bg-gray-50 p-8 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <h4 className="text-gray-800 mb-4 font-medium">
                    Uncompressed<br/>(WAV)
                  </h4>
                  <div className="text-3xl font-bold text-primary-500 mb-2">{fileSizes.original} MB</div>
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    High Quality
                  </div>
                </div>
                <div className="text-3xl text-primary-500 font-bold mx-8">→</div>
                <div className="text-center flex-1">
                  <h4 className="text-gray-800 mb-4 font-medium">
                    Compressed<br/>(Opus)
                  </h4>
                  <div className="text-3xl font-bold text-primary-500 mb-2">{fileSizes.compressed.toFixed(1)} MB</div>
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                    High Quality
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Controls - Desktop Only */}
            <div className="hidden lg:block bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Interactive Controls</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compression Level: {compressionLevel}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10% (High Quality)</span>
                    <span>90% (High Compression)</span>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowSpectrum(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !showSpectrum
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Waveform
                  </button>
                  <button
                    onClick={() => setShowSpectrum(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showSpectrum
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Spectrum
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 w-full">
              <h4 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                {showSpectrum ? 'Frequency Spectrum Analysis' : 'Real-time Audio Visualization'}
              </h4>
              <div ref={canvasRef} className="w-full h-80 bg-gray-50 rounded-lg overflow-hidden"></div>
              
              <div className="mt-4 text-center text-sm text-gray-600">
                {showSpectrum 
                  ? 'Frequency domain representation showing how compression affects different frequency components'
                  : 'Time domain comparison between original and compressed audio waveforms'
                }
              </div>
            </div>

            {/* Interactive Controls - Mobile Only */}
            <div className="lg:hidden bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Interactive Controls</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compression Level: {compressionLevel}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10% (High Quality)</span>
                    <span>90% (High Compression)</span>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowSpectrum(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !showSpectrum
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Waveform
                  </button>
                  <button
                    onClick={() => setShowSpectrum(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showSpectrum
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Spectrum
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional Information */}
        <motion.div 
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Lossy Compression</h4>
            <p className="text-gray-600">Opus uses psychoacoustic models to remove sounds humans can't hear, achieving high compression ratios.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Adaptive Quality</h4>
            <p className="text-gray-600">Automatically adjusts compression based on audio content - speech vs music, ensuring optimal quality.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Network Optimized</h4>
            <p className="text-gray-600">Designed for real-time communication with low latency and packet loss resilience.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AudioBasics; 