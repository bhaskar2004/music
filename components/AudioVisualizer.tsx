'use client';

import { useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';

interface AudioVisualizerProps {
  isPlaying: boolean;
  size?: number;
}

/**
 * Premium Audio Visualizer component
 * Uses a multi-layered pulse effect synchronized with the audio frequency.
 */
// Shared singleton audio graph to prevent "HTMLMediaElement already connected" errors
let sharedContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedSource: MediaElementAudioSourceNode | null = null;
let connectedElement: HTMLAudioElement | null = null;

export default function AudioVisualizer({ isPlaying, size = 300 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentAccentColor } = useMusicStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const initAudio = () => {
      if (typeof window === 'undefined') return;
      const audio = document.querySelector('audio');
      if (!audio) return;

      try {
        if (!sharedContext || sharedContext.state === 'closed') {
          sharedContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          sharedAnalyser = sharedContext.createAnalyser();
          sharedAnalyser.fftSize = 128;
        }

        if (sharedContext.state === 'suspended' && isPlaying) {
          sharedContext.resume();
        }

        if (connectedElement !== audio && sharedContext && sharedAnalyser) {
          if (sharedSource) {
            try { sharedSource.disconnect(); } catch (_) {}
          }
          sharedSource = sharedContext.createMediaElementSource(audio);
          sharedSource.connect(sharedAnalyser);
          sharedAnalyser.connect(sharedContext.destination);
          connectedElement = audio;
        }
      } catch (e) {
        // Fallback gracefully without breaking UI
      }
    };

    const draw = () => {
      const { width, height } = canvas;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = size / 3;
      let intensity = 0;

      if (!isPlaying) {
        ctx.clearRect(0, 0, width, height);
        // Draw a tiny static core when paused
        drawVisualLayer(ctx, centerX, centerY, baseRadius, 1.1, 0.1, 10, 0.1, currentAccentColor);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      if (sharedAnalyser) {
        const dataArray = new Uint8Array(sharedAnalyser.frequencyBinCount);
        sharedAnalyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        intensity = sum / dataArray.length / 255;
      }

      // Layer 1: Outer glow (larges, most transparent)
      drawVisualLayer(ctx, centerX, centerY, baseRadius, 2.2, 0.2, 60, intensity, currentAccentColor);
      // Layer 2: Middle pulse
      drawVisualLayer(ctx, centerX, centerY, baseRadius, 1.6, 0.4, 30, intensity, currentAccentColor);
      // Layer 3: Inner core (tightest, most opaque)
      drawVisualLayer(ctx, centerX, centerY, baseRadius, 1.1, 0.6, 15, intensity, currentAccentColor);

      animationFrame = requestAnimationFrame(draw);
    };

    initAudio();
    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, currentAccentColor, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size * 1.5}
      height={size * 1.5}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.8,
      }}
    />
  );
}

/**
 * Helper to draw a single glow layer
 */
function drawVisualLayer(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  baseRadius: number,
  radiusMult: number,
  opacityMult: number,
  blur: number,
  intensity: number,
  accentColor: string
) {
  const r = baseRadius * (radiusMult + intensity * 0.8);
  
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
  
  ctx.shadowBlur = blur + intensity * 40;
  ctx.shadowColor = accentColor;
  
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
  gradient.addColorStop(0, hexToRgba(accentColor, 0.4 * opacityMult));
  gradient.addColorStop(1, 'transparent');
  
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

/**
 * Converts hex to RGBA with alpha
 */
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
