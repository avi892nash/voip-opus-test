import React, { useRef, useEffect } from 'react';

const CANVAS_SIZE = 340;

const HeroAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let t = 0;
    let gridOffset = 0;
    const dotSpacing = 32;
    const dotRadius = 4;

    console.log('[Canvas] Animation started');

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Dots grid background (moving left)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.125)';
      gridOffset -= 0.7;
      if (gridOffset < -dotSpacing) gridOffset += dotSpacing;
      
      for (let x = gridOffset; x < CANVAS_SIZE + dotSpacing; x += dotSpacing) {
        for (let y = dotSpacing / 2; y < CANVAS_SIZE; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Animate a single audio wave with varying amplitude and frequency
      const waveY = CANVAS_SIZE / 2;
      const amp = 40 + 30 * Math.sin(t * 0.013);
      const freq = 2 * Math.PI / (90 + 30 * Math.cos(t * 0.008));
      
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      
      for (let x = 0; x < CANVAS_SIZE; x += 2) {
        const y = waveY + amp * Math.sin(freq * (x - t));
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();

      t += 2.2;
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
        console.log('[Canvas] Animation stopped');
      }
    };
  }, []);

  return (
    <div className="w-full h-full mx-auto">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="rounded-lg block w-full h-full"
      />
    </div>
  );
};

export default HeroAnimation; 