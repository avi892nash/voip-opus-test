import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import p5 from 'p5';

interface OpusStep {
  number: number;
  title: string;
  description: string;
  animation: string;
  details: string[];
}

const OpusCodec: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [bitrate, setBitrate] = useState(64);
  const [quality, setQuality] = useState(0.8);
  const canvasRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  const steps: OpusStep[] = [
    {
      number: 1,
      title: 'Audio Input',
      description: 'Raw audio waveform is captured',
      animation: 'waveform',
      details: ['Analog audio signal', 'Digital sampling at 48kHz', '16-bit PCM format']
    },
    {
      number: 2,
      title: 'Frame Splitting',
      description: 'Audio is divided into small frames',
      animation: 'frames',
      details: ['2.5ms, 5ms, 10ms, 20ms frames', 'Overlap between frames', 'Window function applied']
    },
    {
      number: 3,
      title: 'Encoding',
      description: 'Each frame is compressed using CELT + SILK',
      animation: 'encoding',
      details: ['CELT for music (MDCT)', 'SILK for speech (LPC)', 'Adaptive bitrate allocation']
    },
    {
      number: 4,
      title: 'Output',
      description: 'Compressed data is ready for transmission',
      animation: 'output',
      details: ['Opus bitstream', 'Error correction', 'Network packetization']
    }
  ];

  useEffect(() => {
    if (canvasRef.current && !p5InstanceRef.current) {
      const sketch = (p: p5) => {
        const getCanvasWidth = () => canvasRef.current?.offsetWidth || 400;
        const getCanvasHeight = () => 200;
        
        p.setup = () => {
          const canvas = p.createCanvas(getCanvasWidth(), getCanvasHeight());
          canvas.parent(canvasRef.current!);
          p.background(248, 250, 252);
        };

        p.draw = () => {
          p.background(248, 250, 252);
          
          if (activeStep === 0) {
            drawWaveform(p);
          } else if (activeStep === 1) {
            drawFrames(p);
          } else if (activeStep === 2) {
            drawEncoding(p);
          } else if (activeStep === 3) {
            drawOutput(p);
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
  }, [activeStep]);

  const drawWaveform = (p: p5) => {
    p.stroke(59, 130, 246);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    
    for (let x = 0; x < p.width; x++) {
      const time = x * 0.02;
      const y = p.height/2 + Math.sin(time) * 30 + Math.sin(time * 3) * 15;
      p.vertex(x, y);
    }
    p.endShape();
    
    p.noStroke();
    p.fill(59, 130, 246);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Raw Audio Waveform', p.width/2, 30);
  };

  const drawFrames = (p: p5) => {
    const frameWidth = p.width / 8;
    p.stroke(34, 197, 94);
    p.strokeWeight(2);
    p.noFill();
    
    for (let i = 0; i < 8; i++) {
      const x = i * frameWidth;
      p.rect(x + 10, 50, frameWidth - 20, 100);
      
      // Draw waveform in each frame
      p.stroke(59, 130, 246);
      p.beginShape();
      for (let j = 0; j < frameWidth - 20; j++) {
        const time = (x + j) * 0.02;
        const y = 100 + Math.sin(time + i) * 20;
        p.vertex(x + 10 + j, y);
      }
      p.endShape();
      p.stroke(34, 197, 94);
    }
    
    p.noStroke();
    p.fill(34, 197, 94);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Audio Frames', p.width/2, 30);
  };

  const drawEncoding = (p: p5) => {
    // Draw CELT encoding
    p.fill(168, 85, 247);
    p.noStroke();
    p.rect(50, 60, 120, 80);
    p.fill(255);
    p.textAlign(p.CENTER);
    p.text('CELT', 110, 105);
    
    // Draw SILK encoding
    p.fill(236, 72, 153);
    p.rect(230, 60, 120, 80);
    p.fill(255);
    p.text('SILK', 290, 105);
    
    // Draw arrows
    p.stroke(0);
    p.strokeWeight(2);
    p.line(110, 140, 110, 160);
    p.line(290, 140, 290, 160);
    p.line(110, 160, 290, 160);
    
    p.noStroke();
    p.fill(0);
    p.text('Combined Opus Stream', 200, 180);
  };

  const drawOutput = (p: p5) => {
    // Draw compressed data blocks
    const blockWidth = 30;
    const blockHeight = 20;
    const blocks = 12;
    
    p.fill(239, 68, 68);
    p.noStroke();
    
    for (let i = 0; i < blocks; i++) {
      const x = 50 + (i % 6) * (blockWidth + 10);
      const y = 80 + Math.floor(i / 6) * (blockHeight + 10);
      p.rect(x, y, blockWidth, blockHeight);
    }
    
    p.noStroke();
    p.fill(239, 68, 68);
    p.textAlign(p.CENTER);
    p.textSize(16);
    p.text('Compressed Opus Data', p.width/2, 30);
    p.textSize(12);
    p.text(`${bitrate} kbps`, p.width/2, 50);
  };

  const calculateQuality = (bitrate: number) => {
    // Simple quality calculation based on bitrate
    if (bitrate >= 128) return 0.95;
    if (bitrate >= 96) return 0.9;
    if (bitrate >= 64) return 0.8;
    if (bitrate >= 32) return 0.6;
    return 0.4;
  };

  const fileSize = Math.round((bitrate * 60) / 8); // KB for 1 minute

  return (
    <section id="opus" className="section">
      <div className="container">
        <motion.h2 
          className="section-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          How Does Opus Work?
        </motion.h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8">
          {/* Animation Canvas */}
          <motion.div 
            className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              {steps[activeStep].title} Process
            </h3>
            <div ref={canvasRef} className="w-full h-48 bg-gray-50 rounded-lg overflow-hidden"></div>
            
            <div className="mt-6 space-y-2">
              {steps[activeStep].details.map((detail, index) => (
                <motion.div
                  key={index}
                  className="flex items-center text-sm text-gray-600"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                  {detail}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Controls */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {/* Step Navigation */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Encoding Process</h3>
              <div className="grid grid-cols-2 gap-4">
                {steps.map((step, index) => (
                  <motion.button
                    key={step.number}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                      activeStep === index
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-primary-300'
                    }`}
                    onClick={() => setActiveStep(index)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs mt-1 opacity-75">{step.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Quality vs Bitrate Controls */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quality vs Bitrate Tradeoff</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bitrate: {bitrate} kbps
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="128"
                    value={bitrate}
                    onChange={(e) => setBitrate(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>8 kbps</span>
                    <span>128 kbps</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Quality</div>
                    <div className="text-2xl font-bold text-primary-500">
                      {Math.round(calculateQuality(bitrate) * 100)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">File Size (1min)</div>
                    <div className="text-2xl font-bold text-primary-500">
                      {fileSize} KB
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-100 to-green-100 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Quality Indicator</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${calculateQuality(bitrate) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OpusCodec; 