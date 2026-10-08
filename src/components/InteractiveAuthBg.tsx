'use client';

import React, { useEffect, useRef } from 'react';

interface InteractiveAuthBgProps {
  theme?: 'light' | 'dark';
}

export function InteractiveAuthBg({ theme = 'dark' }: InteractiveAuthBgProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates with smooth lerping
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    const gridSize = 40;

    const render = () => {
      // Smooth interpolation for spotlight movement
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const isDark = theme === 'dark';

      // 1. Draw base subtle grid
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. Draw active spotlight grid illumination around cursor
      const spotRadius = 380;
      
      // Create radial gradient for spotlight highlight
      const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, spotRadius);
      if (isDark) {
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
        grad.addColorStop(0.3, 'rgba(241, 104, 24, 0.08)');
        grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.14)');
        grad.addColorStop(0.3, 'rgba(241, 104, 24, 0.06)');
        grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.03)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.save();
      // Clip to spotlight area for high performance
      ctx.beginPath();
      ctx.arc(mouseX, mouseY, spotRadius, 0, Math.PI * 2);
      ctx.clip();

      // Highlighted grid lines within spotlight
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();

      const startX = Math.max(0, Math.floor((mouseX - spotRadius) / gridSize) * gridSize);
      const endX = Math.min(width, Math.ceil((mouseX + spotRadius) / gridSize) * gridSize);
      const startY = Math.max(0, Math.floor((mouseY - spotRadius) / gridSize) * gridSize);
      const endY = Math.min(height, Math.ceil((mouseY + spotRadius) / gridSize) * gridSize);

      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // Subtle crosshair / tiny dot at intersections within spotlight
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          const dist = Math.hypot(x - mouseX, y - mouseY);
          if (dist < spotRadius * 0.75) {
            const alpha = (1 - dist / (spotRadius * 0.75)) * (isDark ? 0.35 : 0.25);
            ctx.fillStyle = isDark
              ? `rgba(255, 255, 255, ${alpha})`
              : `rgba(0, 0, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();

      // 3. Subtle ambient ambient glow right under cursor
      const ambientGlow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, spotRadius * 0.7);
      if (isDark) {
        ambientGlow.addColorStop(0, 'rgba(255, 255, 255, 0.025)');
        ambientGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        ambientGlow.addColorStop(0, 'rgba(0, 0, 0, 0.02)');
        ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {/* Top & radial soft vignette so grid fades cleanly toward page edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            theme === 'dark'
              ? 'radial-gradient(ellipse 90% 70% at 50% 50%, transparent 40%, var(--bg) 95%)'
              : 'radial-gradient(ellipse 90% 70% at 50% 50%, transparent 40%, var(--bg) 95%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export default InteractiveAuthBg;
