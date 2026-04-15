'use client';

import { useEffect, useState, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, ListMusic,
  Volume2, VolumeX, ChevronDown, AlignLeft, Music, Download, Library,
  Radar, Plus, Check,
} from 'lucide-react';
import { useDownloadProcessor } from '@/hooks/useDownloadProcessor';
import Image from 'next/image';
import AudioVisualizer from './AudioVisualizer';
import { extractAccentColor } from '@/lib/colorUtils';

export default function FullScreenPlayer() {
  const {
    currentTrack, isPlaying, shuffle, repeat, favorites,
    currentTime, duration, volume, lyrics, isLoadingLyrics,
    setIsPlaying, playNext, playPrev, toggleShuffle, toggleRepeat,
    toggleFavorite, setShowFullScreenPlayer, setActiveView, setCurrentTime,
    library, currentAccentColor, setAccentColor, recommendedTracks,
    isLoadingRecommendations, fetchRecommendations, addToQueue, playNextTrack,
    queue, setCurrentTrack,
  } = useMusicStore();

  const { processDownload } = useDownloadProcessor();

  const [visible, setVisible] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const [showRadar, setShowRadar] = useState(false);

  /* ── Dynamic Theming & Recommendations ────────────────────────── */
  useEffect(() => {
    if (!currentTrack) return;
    
    // 1. Color Extraction
    if (currentTrack.coverUrl) {
      extractAccentColor(currentTrack.coverUrl).then(color => {
        if (color) setAccentColor(color);
      });
    }

    // 2. Recommendations
    fetchRecommendations(currentTrack);
  }, [currentTrack, setAccentColor, fetchRecommendations]);

  /* ── LRC parser ─────────────────────────────────────────────────── */
  const parsedLyrics = (() => {
    if (!lyrics?.syncedLyrics) return null;
    const lines = lyrics.syncedLyrics.split('\n');
    const result: { time: number; text: string }[] = [];
    const timeRegex = /\[(\d+):(\d+\.\d+)\]/;
    const offsetRegex = /\[offset:(-?\d+)\]/;
    let offsetMs = 0;
    lines.forEach(line => {
      const m = offsetRegex.exec(line);
      if (m) offsetMs = parseInt(m[1]);
    });
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const time = (parseInt(match[1]) * 60 + parseFloat(match[2])) + offsetMs / 1000;
        const text = line.replace(timeRegex, '').trim();
        if (text) result.push({ time, text });
      }
    });
    return result;
  })();

  /* ── High-precision rAF time sync ───────────────────────────────── */
  const [smoothTime, setSmoothTime] = useState(currentTime);
  const rAFRef = useRef<number | null>(null);
  useEffect(() => {
    const audio = document.querySelector('audio');
    if (!audio || !isPlaying) { setSmoothTime(currentTime); if (rAFRef.current) cancelAnimationFrame(rAFRef.current); return; }
    const tick = () => { if (audio) setSmoothTime(audio.currentTime); rAFRef.current = requestAnimationFrame(tick); };
    rAFRef.current = requestAnimationFrame(tick);
    return () => { if (rAFRef.current) cancelAnimationFrame(rAFRef.current); };
  }, [isPlaying, currentTime]);

  const currentLineIndex = parsedLyrics
    ? parsedLyrics.findIndex((line, i) => {
      const next = parsedLyrics[i + 1];
      return smoothTime >= line.time && (!next || smoothTime < next.time);
    })
    : -1;

  useEffect(() => {
    if (showLyrics && activeLineRef.current)
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLineIndex, showLyrics]);

  /* ── Mount / keyboard ───────────────────────────────────────────── */
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(() => setShowFullScreenPlayer(false), 420); };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || duration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const audio = document.querySelector('audio');
    if (audio) { audio.currentTime = pct * duration; setCurrentTime(pct * duration); }
  };

  if (!currentTrack) return null;
  const isLiked = favorites.includes(currentTrack.id);
  const isSearchTrack = currentTrack.id.includes('search-');
  const isDownloaded = library.some(t => t.id === currentTrack.id);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = hoverProgress !== null ? hoverProgress : progressPct;

  /* ── Dynamic Accent Colors ─────────────────────────────────────── */
  const ACCENT = currentAccentColor;
  const ACCENT_BG = `rgba(${parseInt(ACCENT.slice(1,3),16)}, ${parseInt(ACCENT.slice(3,5),16)}, ${parseInt(ACCENT.slice(5,7),16)}, 0.08)`;
  const ACCENT_SOFT = `rgba(${parseInt(ACCENT.slice(1,3),16)}, ${parseInt(ACCENT.slice(3,5),16)}, ${parseInt(ACCENT.slice(5,7),16)}, 0.12)`;

  return (
    <>
      <style>{`


        /* ── Keyframes ── */
        @keyframes fspFadeUp {
          from { opacity:0; transform:translateY(20px) scale(0.985); }
          to   { opacity:1; transform:translateY(0)    scale(1);     }
        }
        @keyframes lyricsReveal {
          from { opacity:0; transform:translateX(24px); }
          to   { opacity:1; transform:translateX(0);    }
        }
        @keyframes vinylSpin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes artFloat {
          0%,100% { transform:translateY(0px); }
          50%      { transform:translateY(-6px); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 20px 80px ${ACCENT_SOFT}, 0 4px 24px rgba(0,0,0,0.08); }
          50%      { box-shadow: 0 28px 100px ${ACCENT_SOFT.replace('0.12', '0.2')},  0 4px 32px rgba(0,0,0,0.10); }
        }
        @keyframes spinnerFade {
          0%   { opacity: 0.15; }
          50%  { opacity: 0.55; }
          100% { opacity: 0.15; }
        }

        /* ── Base overlay ── */
        .fsp-root {
          position: fixed; inset: 0; z-index: 9999;
          background: #FAFAF9;
          display: flex; align-items: center; justify-content: center;
          animation: fspFadeUp 0.42s cubic-bezier(0.16,1,0.3,1) both;
          font-family: var(--font-sans);
          overflow: hidden;
        }

        /* Subtle warm gradient wash behind art */
        .fsp-root::before {
          content:'';
          position:absolute;
          top:-30%; left:-20%;
          width:70%; height:80%;
          background: radial-gradient(ellipse, ${ACCENT}10 0%, transparent 70%);
          pointer-events:none;
        }
        .fsp-root::after {
          content:'';
          position:absolute;
          bottom:-20%; right:-10%;
          width:60%; height:60%;
          background: radial-gradient(ellipse, rgba(120,80,200,0.04) 0%, transparent 70%);
          pointer-events:none;
        }

        /* ── Close button ── */
        .fsp-close {
          position:absolute; top:28px; left:32px; z-index:20;
          display:flex; align-items:center; gap:7px;
          background:rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.07);
          border-radius:100px; padding:8px 16px;
          cursor:pointer; color:rgba(0,0,0,0.45);
          font-family: var(--font-sans); font-size:12.5px; font-weight:450; letter-spacing:0.02em;
          transition:all 0.18s; backdrop-filter:blur(8px);
        }
        .fsp-close:hover { background:rgba(0,0,0,0.07); color:rgba(0,0,0,0.75); }

        .fsp-back-lib {
          position:absolute; top:28px; right:32px; z-index:20;
          display:flex; align-items:center; gap:7px;
          background:rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.07);
          border-radius:100px; padding:8px 16px;
          cursor:pointer; color:rgba(0,0,0,0.45);
          font-family: var(--font-sans); font-size:12.5px; font-weight:450; letter-spacing:0.02em;
          transition:all 0.18s; backdrop-filter:blur(8px);
        }
        .fsp-back-lib:hover { 
          background: color-mix(in srgb, var(--accent) 8%, transparent);
          color: var(--accent);
          border-color: color-mix(in srgb, var(--accent) 20%, transparent);
        }

        /* ── Layout ── */
        .fsp-layout {
          position:relative; z-index:1;
          display:flex; align-items:flex-start; gap:52px;
          width:100%; max-width:960px;
          padding:0 48px;
          transition:max-width 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        .fsp-layout.no-lyrics { max-width:480px; }

        /* ── Left panel ── */
        .fsp-left {
          display:flex; flex-direction:column; align-items:center;
          gap:28px; flex:0 0 auto; width:360px;
        }

        /* ── Album art wrapper ── */
        .fsp-art-wrap {
          position:relative;
          width:272px; height:272px;
          animation: artFloat 6s ease-in-out infinite;
        }
        .fsp-art-wrap.playing {
          animation: artFloat 6s ease-in-out infinite, pulseGlow 3s ease-in-out infinite;
        }

        /* Vinyl disc */
        .fsp-vinyl {
          width:272px; height:272px; border-radius:50%;
          background: conic-gradient(from 0deg,
            #1a1a1a 0%, #222 15%, #161616 30%,
            #222 45%, #1a1a1a 60%, #1c1c1c 75%, #1a1a1a 100%);
          box-shadow:
            0 32px 80px rgba(0,0,0,0.22),
            0 8px 24px rgba(0,0,0,0.12),
            inset 0 0 0 1px rgba(255,255,255,0.06);
          animation:vinylSpin 3.5s linear infinite;
          animation-play-state:paused;
        }
        .fsp-vinyl.playing { animation-play-state:running; }

        /* Album art cutout */
        .fsp-art-center {
          position:absolute;
          inset:16%;
          border-radius:50%;
          overflow:hidden;
          border:3px solid rgba(0,0,0,0.55);
          box-shadow:inset 0 0 16px rgba(0,0,0,0.4);
        }
        .fsp-art-placeholder {
          width:100%; height:100%;
          display:flex; align-items:center; justify-content:center;
          background:#2a2a2a;
          font-size:36px; font-family: var(--font-display);
          color:rgba(255,255,255,0.2);
        }
        /* Center spindle */
        .fsp-spindle {
          position:absolute; top:50%; left:50%;
          transform:translate(-50%,-50%);
          width:10px; height:10px; border-radius:50%;
          background:#111; border:1.5px solid rgba(255,255,255,0.12); z-index:2;
        }
        /* Vinyl grooves */
        .fsp-groove {
          position:absolute; border-radius:50%;
          border:1px solid rgba(255,255,255,0.025); pointer-events:none;
        }

        /* ── Track info ── */
        .fsp-track-info { text-align:center; width:100%; padding:0 8px; }
        .fsp-title {
          font-family: var(--font-display);
          font-size: 28px; font-weight: 500; font-style: italic;
          color:#111; letter-spacing:-0.4px; line-height:1.2;
          margin:0 0 8px;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .fsp-artist {
          font-family: var(--font-sans);
          font-size:12px; font-weight:500; letter-spacing:0.1em;
          text-transform:uppercase; color:rgba(0,0,0,0.38);
          margin:0;
        }

        /* ── Controls card ── */
        .fsp-card {
          width:100%;
          background:#fff;
          border:1px solid rgba(0,0,0,0.07);
          border-radius:20px;
          padding:22px 24px 20px;
          box-shadow:0 2px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
          display:flex; flex-direction:column; gap:18px;
        }

        /* ── Progress bar ── */
        .fsp-progress-wrap {
          width:100%; height:22px;
          display:flex; align-items:center; cursor:pointer;
          position:relative;
        }
        .fsp-progress-track {
          width:100%; height:3px;
          background:rgba(0,0,0,0.08); border-radius:99px;
          position:relative; overflow:visible;
        }
        .fsp-progress-fill {
          height:100%; border-radius:99px;
          background: #111;
          transition:width 0.25s linear, background 0.2s;
          position:relative;
        }
        .fsp-progress-wrap:hover .fsp-progress-fill { background:${ACCENT}; }
        .fsp-progress-thumb {
          position:absolute; top:50%;
          transform:translate(-50%,-50%) scale(0);
          width:12px; height:12px; border-radius:50%;
          background:${ACCENT};
          opacity:0; transition:opacity 0.15s, transform 0.15s;
          box-shadow:0 2px 8px rgba(193,52,74,0.35);
        }
        .fsp-progress-wrap:hover .fsp-progress-thumb {
          opacity:1 !important; transform:translate(-50%,-50%) scale(1) !important;
        }
        .fsp-time {
          display:flex; justify-content:space-between; margin-top:4px;
        }
        .fsp-time span {
          font-family: var(--font-mono);
          font-size:10.5px; font-weight:400; letter-spacing:0.06em;
          color:rgba(0,0,0,0.3);
        }

        /* ── Main controls ── */
        .fsp-controls {
          display:flex; align-items:center; justify-content:space-between;
        }

        /* Icon buttons (shuffle, repeat, etc.) */
        .fsp-icon-btn {
          display:flex; align-items:center; justify-content:center;
          border:none; background:transparent;
          border-radius:50%; cursor:pointer;
          transition:all 0.16s cubic-bezier(0.4,0,0.2,1);
          color:rgba(0,0,0,0.3);
        }
        .fsp-icon-btn:hover { background:rgba(0,0,0,0.05); color:rgba(0,0,0,0.75); transform:scale(1.1); }
        .fsp-icon-btn.active { color:#111; }
        .fsp-icon-btn.active-accent { color:${ACCENT}; background:${ACCENT_SOFT}; }
        .fsp-icon-btn:active { transform:scale(0.92); }

        /* Skip buttons */
        .fsp-skip-btn {
          width:40px; height:40px;
          display:flex; align-items:center; justify-content:center;
          border:none; background:transparent; border-radius:50%;
          cursor:pointer; color:rgba(0,0,0,0.6);
          transition:all 0.16s cubic-bezier(0.4,0,0.2,1);
        }
        .fsp-skip-btn:hover { background:rgba(0,0,0,0.05); color:#111; transform:scale(1.08); }
        .fsp-skip-btn:active { transform:scale(0.94); }

        /* Play/Pause */
        .fsp-play-btn {
          width:56px; height:56px; border-radius:50%;
          background:#111; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 24px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.12);
          transition:all 0.18s cubic-bezier(0.4,0,0.2,1);
          position:relative; overflow:hidden;
        }
        .fsp-play-btn::before {
          content:''; position:absolute; inset:0; border-radius:50%;
          background:rgba(255,255,255,0.05);
          transition:opacity 0.18s;
          opacity:0;
        }
        .fsp-play-btn:hover {
          transform:scale(1.07);
          box-shadow:0 10px 36px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15);
        }
        .fsp-play-btn:hover::before { opacity:1; }
        .fsp-play-btn:active { transform:scale(0.96); }

        /* ── Bottom actions ── */
        .fsp-actions {
          display:flex; align-items:center; justify-content:space-between;
        }
        .fsp-action-group { display:flex; gap:2px; }

        /* Lyrics toggle button */
        .fsp-lyrics-toggle {
          display:flex; align-items:center; gap:6px;
          border:1px solid rgba(0,0,0,0.1);
          border-radius:100px; padding:5px 14px;
          cursor:pointer; background:transparent;
          font-family: var(--font-sans);
          font-size:11.5px; font-weight:450; letter-spacing:0.04em;
          color:rgba(0,0,0,0.4);
          transition:all 0.18s;
        }
        .fsp-lyrics-toggle.on {
          background:${ACCENT_BG};
          border-color:rgba(193,52,74,0.18);
          color:${ACCENT};
        }
        .fsp-lyrics-toggle:hover:not(.on) { background:rgba(0,0,0,0.04); color:rgba(0,0,0,0.65); }

        /* ── Lyrics panel ── */
        .fsp-lyrics-panel {
          flex:1; display:flex; flex-direction:column;
          min-width:0; align-self:stretch;
          animation:lyricsReveal 0.5s 0.08s cubic-bezier(0.16,1,0.3,1) both;
        }
        .fsp-lyrics-header {
          font-family: var(--font-display);
          font-size:11px; font-weight:700;
          letter-spacing:0.14em; text-transform:uppercase;
          color:rgba(0,0,0,0.28); margin:0 0 16px 4px;
        }
        .fsp-lyrics-scroll-wrap { position:relative; flex:1; min-height:0; }

        /* Fade gradients top/bottom */
        .fsp-lyrics-scroll-wrap::before,
        .fsp-lyrics-scroll-wrap::after {
          content:''; position:absolute; left:0; right:0; z-index:2; pointer-events:none;
        }
        .fsp-lyrics-scroll-wrap::before {
          top:0; height:60px;
          background:linear-gradient(to bottom, #FAFAF9, transparent);
        }
        .fsp-lyrics-scroll-wrap::after {
          bottom:0; height:80px;
          background:linear-gradient(to top, #FAFAF9, transparent);
        }

        .fsp-lyrics-scroll {
          height:100%; max-height:480px; overflow-y:auto;
          padding:52px 12px 72px 4px;
          display:flex; flex-direction:column; gap:0;
          scrollbar-width:none;
        }
        .fsp-lyrics-scroll::-webkit-scrollbar { display:none; }

        /* Lyric lines */
        .lyric-line {
          font-family: var(--font-display);
          font-size:22px; line-height:1.55;
          padding:5px 6px; border-radius:8px;
          cursor:pointer;
          transition:all 0.32s cubic-bezier(0.4,0,0.2,1);
          user-select:none;
        }
        .lyric-line--active {
          font-size:26px; font-weight:500;
          color:#111; letter-spacing:-0.2px;
          padding:7px 6px;
        }
        .lyric-line--recent-past { color:rgba(0,0,0,0.45); }
        .lyric-line--past        { color:rgba(0,0,0,0.2);  }
        .lyric-line--upcoming    { color:rgba(0,0,0,0.5);  }
        .lyric-line--future      { color:rgba(0,0,0,0.18); }
        .lyric-line--plain       { color:rgba(0,0,0,0.55); }

        .lyric-line:hover:not(.lyric-line--active) { color:rgba(0,0,0,0.7); background:rgba(0,0,0,0.03); }

        /* Loading state */
        .fsp-lyrics-loading {
          display:flex; align-items:center; justify-content:center;
          flex:1; flex-direction:column; gap:14px;
          padding:40px 0;
        }
        .fsp-spinner {
          width:24px; height:24px; position:relative;
        }
        .fsp-spinner span {
          position:absolute; width:4px; height:4px;
          border-radius:50%; background:rgba(0,0,0,0.25);
        }
        .fsp-loading-text {
          font-family: var(--font-sans);
          font-size:12px; color:rgba(0,0,0,0.3);
          letter-spacing:0.05em;
        }

        /* Empty state */
        .fsp-empty {
          flex:1; display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          gap:10px; opacity:0.4; padding:48px 0;
        }
        .fsp-empty span {
          font-family: var(--font-sans);
          font-size:13px; color:rgba(0,0,0,0.45);
          letter-spacing:0.03em;
        }

        /* ── Divider line in lyrics panel ── */
        .fsp-divider {
          width:32px; height:1.5px;
          background:rgba(0,0,0,0.1);
          border-radius:99px;
          margin:0 0 20px 4px;
        }
      `}</style>

      <div className="fsp-root">

        {/* Close / collapse */}
        <button className="fsp-close bouncy-hover" onClick={handleClose}>
          <ChevronDown size={14} />
          Now Playing
        </button>

        {/* Back to Library */}
        <button 
          className="fsp-back-lib bouncy-hover" 
          onClick={() => {
            setActiveView('library');
            handleClose();
          }}
        >
          <Library size={14} />
          Library
        </button>

        {/* ── Main layout ── */}
        <div className={`fsp-layout${showLyrics ? '' : ' no-lyrics'}`}>

          {/* ════ LEFT: Art + Controls ════ */}
          <div className="fsp-left">

            {/* Vinyl art */}
            <div className={`fsp-art-wrap${isPlaying ? ' playing' : ''}`}>
              {/* Reactive Visualizer */}
              <AudioVisualizer isPlaying={isPlaying} />

              <div className={`fsp-vinyl${isPlaying ? ' playing' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
                {/* Grooves */}
                {[38, 52, 66, 80, 96].map(inset => (
                  <div key={inset} className="fsp-groove" style={{ inset }} />
                ))}
                {/* Center art label */}
                <div className="fsp-art-center">
                  {currentTrack.coverUrl ? (
                    <Image
                      src={currentTrack.coverUrl} alt={currentTrack.title}
                      fill style={{ objectFit: 'cover' }} unoptimized
                    />
                  ) : (
                    <div className="fsp-art-placeholder">
                      {currentTrack.title.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="fsp-spindle" />
              </div>
            </div>

            {/* Track info */}
            <div className="fsp-track-info">
              <h2 className="fsp-title">{currentTrack.title}</h2>
              <p className="fsp-artist">{currentTrack.artist}</p>
            </div>

            {/* Glass controls card */}
            <div className="fsp-card">

              {/* Progress */}
              <div>
                <div
                  ref={progressRef}
                  className="fsp-progress-wrap"
                  onClick={seekTo}
                  onMouseMove={e => {
                    if (!progressRef.current || duration === 0) return;
                    const rect = progressRef.current.getBoundingClientRect();
                    setHoverProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                  }}
                  onMouseLeave={() => setHoverProgress(null)}
                >
                  <div className="fsp-progress-track">
                    <div
                      className="fsp-progress-fill"
                      style={{ width: `${displayProgress}%` }}
                    />
                    <div
                      className="fsp-progress-thumb"
                      style={{ left: `${displayProgress}%`, opacity: 0 }}
                    />
                  </div>
                </div>
                <div className="fsp-time">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Controls row */}
              <div className="fsp-controls">
                {/* Shuffle */}
                <button
                  className={`fsp-icon-btn${shuffle ? ' active-accent' : ''}`}
                  style={{ width: 34, height: 34 }}
                  onClick={toggleShuffle}
                  title="Shuffle"
                >
                  <Shuffle size={15} />
                </button>

                {/* Prev */}
                <button className="fsp-skip-btn" onClick={playPrev} title="Previous">
                  <SkipBack size={20} fill="currentColor" />
                </button>

                {/* Play/Pause */}
                <button className="fsp-play-btn" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying
                    ? <Pause size={21} color="#fff" fill="#fff" />
                    : <Play size={21} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                  }
                </button>

                {/* Next */}
                <button className="fsp-skip-btn" onClick={playNext} title="Next">
                  <SkipForward size={20} fill="currentColor" />
                </button>

                {/* Repeat */}
                <button
                  className={`fsp-icon-btn${repeat !== 'off' ? ' active-accent' : ''}`}
                  style={{ width: 34, height: 34 }}
                  onClick={toggleRepeat}
                  title={`Repeat: ${repeat}`}
                >
                  {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
                </button>
              </div>

              {/* Bottom action row */}
              <div className="fsp-actions">
                <div className="fsp-action-group">
                  {/* Like */}
                  <button
                    className={`fsp-icon-btn${isLiked ? ' active-accent' : ''}`}
                    style={{ width: 32, height: 32 }}
                    onClick={() => toggleFavorite(currentTrack.id)}
                    title={isLiked ? 'Unlike' : 'Like'}
                  >
                    <Heart size={14} fill={isLiked ? ACCENT : 'none'} />
                  </button>

                  {/* Download (search tracks only) */}
                  {isSearchTrack && !isDownloaded && (
                    <button
                      className="fsp-icon-btn"
                      style={{ width: 32, height: 32 }}
                      onClick={() => processDownload(currentTrack.sourceUrl)}
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  )}

                  {/* Queue */}
                  <button
                    className="fsp-icon-btn"
                    style={{ width: 32, height: 32 }}
                    onClick={() => { handleClose(); setTimeout(() => setActiveView('queue'), 400); }}
                    title="Queue"
                  >
                    <ListMusic size={14} />
                  </button>
                </div>

                  {/* Discovery Radar toggle */}
                  <button
                    className={`fsp-lyrics-toggle${showRadar ? ' on' : ''}`}
                    onClick={() => { setShowRadar(v => !v); if (!showRadar) setShowLyrics(true); }}
                    title={showRadar ? 'Hide Discovery Radar' : 'Show Discovery Radar'}
                    style={{ marginLeft: 8 }}
                  >
                    <Radar size={11} />
                    {showRadar ? 'Close Radar' : 'Radar'}
                  </button>

                  <button
                    className={`fsp-lyrics-toggle${showLyrics && !showRadar ? ' on' : ''}`}
                    onClick={() => { setShowLyrics(v => !v); setShowRadar(false); }}
                    title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
                  >
                    {showLyrics ? <Music size={11} /> : <AlignLeft size={11} />}
                    {showLyrics ? 'Art view' : 'Lyrics'}
                  </button>
              </div>
            </div>
          </div>

          {/* ════ RIGHT: Panel (Lyrics or Radar) ════ */}
          {showLyrics && (
            <div className="fsp-lyrics-panel">
              <p className="fsp-lyrics-header">{showRadar ? 'Discovery Radar' : 'Lyrics'}</p>
              <div className="fsp-divider" />

              <div className="fsp-lyrics-scroll-wrap">
                <div ref={lyricsContainerRef} className="fsp-lyrics-scroll">
                  {showRadar ? (
                    isLoadingRecommendations ? (
                      <div className="fsp-lyrics-loading">
                        <div className="fsp-loading-text">Scanning for similar vibes…</div>
                      </div>
                    ) : recommendedTracks.length > 0 ? (
                      <div className="flex flex-col gap-3">
                          {recommendedTracks.map(track => {
                            const isDownloaded = library.some(t => t.sourceUrl === track.sourceUrl);
                            const isDownloading = downloads.some(d => d.url === track.sourceUrl && d.status !== 'completed' && d.status !== 'failed');
                            
                            return (
                              <div 
                                key={track.id}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-black/5 transition-all cursor-pointer group"
                                onClick={() => setCurrentTrack(track)}
                              >
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                  {track.coverUrl ? (
                                    <Image src={track.coverUrl} alt={track.title} fill className="object-cover" unoptimized />
                                  ) : (
                                    <div className="w-full h-full bg-black/10 flex items-center justify-center"><Music size={16} /></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold truncate leading-tight">{track.title}</h4>
                                    <p className="text-[11px] text-black/40 font-medium truncate mt-0.5 uppercase tracking-wider">{track.artist}</p>
                                </div>
                                <button 
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                                    isDownloaded 
                                    ? 'bg-green-50 text-green-600' 
                                    : (isDownloading ? 'bg-orange-50 text-orange-600 animate-pulse' : 'hover:bg-black/10 text-black/40 hover:text-black')
                                  }`}
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (!isDownloaded && !isDownloading) {
                                      processDownload(track.sourceUrl);
                                    }
                                  }}
                                  title={isDownloaded ? 'In Library' : (isDownloading ? 'Downloading...' : 'Add to Library')}
                                >
                                  {isDownloaded ? <Check size={16} /> : (isDownloading ? <Download size={14} /> : <Plus size={16} />)}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <LyricsEmpty label="No recommendations found yet" />
                    )
                  ) : isLoadingLyrics ? (
                    <div className="fsp-lyrics-loading">
                      <div className="fsp-loading-text">Finding lyrics…</div>
                    </div>
                  ) : lyrics ? (
                    parsedLyrics ? (
                      parsedLyrics.map((line, i) => {
                        const isActive = i === currentLineIndex;
                        const isPast = i < currentLineIndex;
                        const isRecent = isPast && currentLineIndex - i <= 2;
                        const isUpcoming = !isPast && !isActive && i - currentLineIndex <= 2;
                        let cls = 'lyric-line';
                        if (isActive) cls += ' lyric-line--active';
                        else if (isRecent) cls += ' lyric-line--recent-past';
                        else if (isPast) cls += ' lyric-line--past';
                        else if (isUpcoming) cls += ' lyric-line--upcoming';
                        else cls += ' lyric-line--future';
                        return (
                          <div
                            key={i}
                            ref={isActive ? activeLineRef : null}
                            className={cls}
                            onClick={() => {
                              const audio = document.querySelector('audio');
                              if (audio) { audio.currentTime = line.time; setCurrentTime(line.time); }
                            }}
                          >
                            {line.text}
                          </div>
                        );
                      })
                    ) : lyrics.plainLyrics ? (
                      lyrics.plainLyrics.split('\n').map((line, i) => (
                        <div key={i} className="lyric-line lyric-line--plain">
                          {line || '\u00A0'}
                        </div>
                      ))
                    ) : (
                      <LyricsEmpty label="Lyrics not available for this track" />
                    )
                  ) : (
                    <LyricsEmpty label="No lyrics found" />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function LyricsEmpty({ label }: { label: string }) {
  return (
    <div className="fsp-empty">
      <Music size={24} color="rgba(0,0,0,0.25)" />
      <span>{label}</span>
    </div>
  );
}