'use client';

import { useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';

interface AudioVisualizerProps {
  isPlaying: boolean;
  size?: number;
}

export default function AudioVisualizer({ isPlaying, size = 300 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const { currentAccentColor } = useMusicStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let fallbackProgress = 0;

    const initAudio = () => {
      if (typeof window === 'undefined') return;
      const audio = document.querySelector('audio');
      if (!audio) return;

      try {
        if (!contextRef.current) {
          contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = contextRef.current.createAnalyser();
          analyserRef.current.fftSize = 128;
          
          // Note: createMediaElementSource can only be called once per element
          sourceRef.current = contextRef.current.createMediaElementSource(audio);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(contextRef.current.destination);
        }
      } catch (e) {
        console.warn('[Visualizer] AudioContext init failed:', e);
      }
    };

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      let intensity = 0;
      if (analyserRef.current && isPlaying) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        intensity = sum / dataArray.length / 255;
      } else {
        // Fallback breathing animation
        fallbackProgress += 0.015;
        intensity = 0.15 + Math.sin(fallbackProgress) * 0.05;
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = size / 3;

      // Color layers
      const drawLayer = (radiusMult: number, opacityMult: number, blur: number) => {
        ctx.save();
        ctx.beginPath();
        const r = baseRadius * (radiusMult + intensity * 0.8);
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        
        ctx.shadowBlur = blur + intensity * 40;
        ctx.shadowColor = currentAccentColor;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
        gradient.addColorStop(0, hexToRgba(currentAccentColor, 0.4 * opacityMult));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      };

      // Layer 1: Outer glow
      drawLayer(2.2, 0.2, 60);
      // Layer 2: Middle pulse
      drawLayer(1.6, 0.4, 30);
      // Layer 3: Inner core
      drawLayer(1.1, 0.6, 15);

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
      }}
    />
  );
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
