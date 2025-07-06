import React, { useRef, useEffect, useState } from 'react';

const CANVAS_SIZE = 340;

interface AudioData {
  samples: number[];
  sampleRate: number;
  duration: number;
}

const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to read WAV file and extract audio data
  const loadAudioData = async (): Promise<AudioData> => {
    try {
      const response = await fetch('/sample.wav');
      const arrayBuffer = await response.arrayBuffer();
      
      // Parse WAV file
      const view = new DataView(arrayBuffer);
      
      // Check WAV header
      const riff = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
      const wave = String.fromCharCode(...new Uint8Array(arrayBuffer, 8, 4));
      
      if (riff !== 'RIFF' || wave !== 'WAVE') {
        throw new Error('Invalid WAV file');
      }
      
      // Get audio format info
      const sampleRate = view.getUint32(24, true);
      const bitsPerSample = view.getUint16(34, true);
      const channels = view.getUint16(22, true);
      
      // Find data chunk
      let dataOffset = 36;
      while (dataOffset < arrayBuffer.byteLength) {
        const chunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, dataOffset, 4));
        const chunkSize = view.getUint32(dataOffset + 4, true);
        
        if (chunkId === 'data') {
          break;
        }
        dataOffset += 8 + chunkSize;
      }
      
      // Extract audio samples
      const dataSize = view.getUint32(dataOffset + 4, true);
      const samples: number[] = [];
      
      for (let i = 0; i < dataSize; i += 2) {
        const sample = view.getInt16(dataOffset + 8 + i, true);
        samples.push(sample / 32768); // Normalize to [-1, 1]
      }
      
      // If stereo, convert to mono by averaging channels
      const monoSamples = channels === 2 
        ? samples.filter((_, i) => i % 2 === 0) // Take left channel
        : samples;
      
      // Downsample for visualization (take every nth sample)
      const downsampleFactor = Math.max(1, Math.floor(monoSamples.length / 800));
      const downsampledSamples = monoSamples.filter((_, i) => i % downsampleFactor === 0);
      
      return {
        samples: downsampledSamples,
        sampleRate,
        duration: downsampledSamples.length / sampleRate
      };
    } catch (error) {
      console.error('Error loading audio:', error);
      // Fallback to generated wave
      return generateFallbackWave();
    }
  };

  // Fallback wave generation
  const generateFallbackWave = (): AudioData => {
    const samples: number[] = [];
    for (let i = 0; i < 800; i++) {
      const t = i / 800;
      const sample = Math.sin(2 * Math.PI * 3 * t) * 0.5 + 
                    Math.sin(2 * Math.PI * 7 * t) * 0.3 +
                    Math.sin(2 * Math.PI * 12 * t) * 0.2 +
                    Math.random() * 0.1; // Add some noise
      samples.push(sample);
    }
    return { samples, sampleRate: 8000, duration: 1 };
  };

  useEffect(() => {
    const loadAndSetup = async () => {
      const data = await loadAudioData();
      setAudioData(data);
      setIsLoading(false);
    };
    
    loadAndSetup();
  }, []);

  useEffect(() => {
    if (!audioData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame = 0;
    let currentIndex = 0;
    const samplesPerFrame = 1; // Slower movement
    const waveLength = Math.floor(CANVAS_SIZE * 0.85); // Length of visible wave
    const waveHeight = CANVAS_SIZE * 0.5; // Height of wave
    const centerY = CANVAS_SIZE / 2;

    const animate = () => {
      // Clear canvas with professional gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
      gradient.addColorStop(0, '#0f172a'); // Dark slate
      gradient.addColorStop(0.3, '#1e293b'); // Slate
      gradient.addColorStop(0.7, '#334155'); // Light slate
      gradient.addColorStop(1, '#475569'); // Lighter slate
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw subtle grid pattern
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 0.5;
      
      // Vertical grid lines
      for (let x = 0; x < CANVAS_SIZE; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_SIZE);
        ctx.stroke();
      }
      
      // Horizontal grid lines
      for (let y = 0; y < CANVAS_SIZE; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_SIZE, y);
        ctx.stroke();
      }

      // Draw center line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(CANVAS_SIZE, centerY);
      ctx.stroke();

      // Draw the wave
      if (audioData.samples.length > 0) {
        const waveStartX = (CANVAS_SIZE - waveLength) / 2;
        
        // Create gradient for wave
        const waveGradient = ctx.createLinearGradient(waveStartX, 0, waveStartX + waveLength, 0);
        waveGradient.addColorStop(0, '#06b6d4'); // Cyan
        waveGradient.addColorStop(0.25, '#3b82f6'); // Blue
        waveGradient.addColorStop(0.5, '#8b5cf6'); // Purple
        waveGradient.addColorStop(0.75, '#ec4899'); // Pink
        waveGradient.addColorStop(1, '#f59e0b'); // Amber
        
        // Draw wave outline
        ctx.strokeStyle = waveGradient;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        
        // Draw wave from left to right
        for (let x = 0; x < waveLength; x++) {
          const sampleIndex = (currentIndex + x) % audioData.samples.length;
          const sample = audioData.samples[sampleIndex] || 0;
          const y = centerY + sample * waveHeight * 0.35;
          
          if (x === 0) {
            ctx.moveTo(waveStartX + x, y);
          } else {
            ctx.lineTo(waveStartX + x, y);
          }
        }
        
        ctx.stroke();

        // Draw wave fill with gradient
        const fillGradient = ctx.createLinearGradient(0, centerY - waveHeight * 0.2, 0, centerY + waveHeight * 0.2);
        fillGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        fillGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)');
        fillGradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
        
        ctx.fillStyle = fillGradient;
        ctx.beginPath();
        ctx.moveTo(waveStartX, centerY);
        
        for (let x = 0; x < waveLength; x++) {
          const sampleIndex = (currentIndex + x) % audioData.samples.length;
          const sample = audioData.samples[sampleIndex] || 0;
          const y = centerY + sample * waveHeight * 0.35;
          ctx.lineTo(waveStartX + x, y);
        }
        
        ctx.lineTo(waveStartX + waveLength, centerY);
        ctx.closePath();
        ctx.fill();

        // Draw amplitude indicators
        const currentSample = audioData.samples[currentIndex % audioData.samples.length] || 0;
        const amplitude = Math.abs(currentSample);
        
        // Left amplitude bar
        ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + amplitude * 0.7})`;
        ctx.fillRect(10, centerY - 30, 8, 60);
        
        // Right amplitude bar
        ctx.fillStyle = `rgba(139, 92, 246, ${0.3 + amplitude * 0.7})`;
        ctx.fillRect(CANVAS_SIZE - 18, centerY - 30, 8, 60);

        // Draw moving highlight with glow effect
        const highlightX = waveStartX + (animationFrame % waveLength);
        const highlightSample = audioData.samples[(currentIndex + (animationFrame % waveLength)) % audioData.samples.length] || 0;
        const highlightY = centerY + highlightSample * waveHeight * 0.35;
        
        // Glow effect
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(highlightX, 0);
        ctx.lineTo(highlightX, CANVAS_SIZE);
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Highlight dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(highlightX, highlightY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw frequency spectrum (simplified)
        const spectrumHeight = 40;
        const spectrumY = CANVAS_SIZE - spectrumHeight - 10;
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        for (let i = 0; i < 20; i++) {
          const barHeight = (Math.random() * 0.5 + 0.2) * spectrumHeight;
          const barWidth = 8;
          const barX = 10 + i * 15;
          ctx.fillRect(barX, spectrumY + spectrumHeight - barHeight, barWidth, barHeight);
        }

        // Update position
        currentIndex = (currentIndex + samplesPerFrame) % audioData.samples.length;
        animationFrame++;
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [audioData]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
          <p className="text-cyan-400 text-sm font-medium">Loading Audio Waveform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full mx-auto">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rounded-lg block w-full h-full shadow-2xl"
      />
    </div>
  );
};

export default HeroAnimation; 