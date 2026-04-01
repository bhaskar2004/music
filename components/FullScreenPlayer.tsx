'use client';

import { useEffect, useState, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, ListMusic,
  Volume2, VolumeX, ChevronDown, AlignLeft, Music, Download,
} from 'lucide-react';
import { useDownloadProcessor } from '@/hooks/useDownloadProcessor';
import Image from 'next/image';

export default function FullScreenPlayer() {
  const {
    currentTrack, isPlaying, shuffle, repeat, favorites,
    currentTime, duration, volume, lyrics, isLoadingLyrics,
    setIsPlaying, playNext, playPrev, toggleShuffle, toggleRepeat,
    toggleFavorite, setShowFullScreenPlayer, setActiveView, setCurrentTime,
    library,
  } = useMusicStore();

  const { processDownload } = useDownloadProcessor();

  const [visible, setVisible] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Parse LRC lyrics
  const parsedLyrics = (() => {
    if (!lyrics?.syncedLyrics) return null;
    const lines = lyrics.syncedLyrics.split('\n');
    const result: { time: number; text: string }[] = [];
    const timeRegex = /\[(\d+):(\d+\.\d+)\]/;
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const time = minutes * 60 + seconds;
        const text = line.replace(timeRegex, '').trim();
        if (text) result.push({ time, text });
      }
    });
    return result;
  })();

  const currentLineIndex = parsedLyrics
    ? parsedLyrics.findIndex((line, i) => {
      const nextLine = parsedLyrics[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    })
    : -1;

  useEffect(() => {
    if (showLyrics && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex, showLyrics]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setShowFullScreenPlayer(false), 380);
  };

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fspIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lyricsSlideIn {
          from { opacity: 0; transform: translateX(28px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.05); opacity: 0.2; }
        }
        .fsp-overlay { animation: fspIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .fsp-lyrics-panel { animation: lyricsSlideIn 0.5s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fsp-progress-bar:hover .fsp-thumb { opacity: 1 !important; transform: scale(1) !important; }
        .fsp-progress-bar:hover .fsp-fill { background: #fff !important; }
        .fsp-vinyl { animation: vinylSpin 3s linear infinite; animation-play-state: paused; }
        .fsp-vinyl.playing { animation-play-state: running; }
        .fsp-lyrics-container { scrollbar-width: none; -ms-overflow-style: none; }
        .fsp-lyrics-container::-webkit-scrollbar { display: none; }
        .fsp-lyric-line { transition: all 0.45s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .fsp-lyric-line:hover { color: rgba(255,255,255,0.9) !important; }
        .control-btn { transition: all 0.18s cubic-bezier(0.4,0,0.2,1) !important; }
        .control-btn:hover { transform: scale(1.12) !important; }
        .play-btn { transition: all 0.18s cubic-bezier(0.4,0,0.2,1) !important; }
        .play-btn:hover { transform: scale(1.06) !important; box-shadow: 0 0 0 8px rgba(255,255,255,0.08) !important; }
        .play-btn:active { transform: scale(0.97) !important; }
      `}</style>

      <div
        className="fsp-overlay"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Layered background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {currentTrack.coverUrl && (
            <Image
              src={currentTrack.coverUrl} alt=""
              fill unoptimized
              style={{ objectFit: 'cover', filter: 'blur(120px) brightness(0.2) saturate(2)', transform: 'scale(1.4)' }}
            />
          )}
          {/* Dark vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.92) 100%)' }} />
          {/* Grain texture */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat', backgroundSize: '200px 200px', opacity: 0.3, pointerEvents: 'none',
          }} />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 28, left: 32, zIndex: 10,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 99, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 400, letterSpacing: '0.02em',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          <ChevronDown size={15} />
          Now Playing
        </button>

        {/* Main layout */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'stretch', gap: 48,
          width: '100%', maxWidth: showLyrics ? 960 : 480,
          padding: '0 40px',
          transition: 'max-width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>

          {/* LEFT: Art + Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, flex: '0 0 auto', width: 380 }}>

            {/* Vinyl record art */}
            <div style={{ position: 'relative', width: 280, height: 280 }}>
              {/* Glow ring */}
              {isPlaying && (
                <div className="pulseRing" style={{
                  position: 'absolute', inset: -12, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
                  animation: 'pulseRing 2.5s ease-in-out infinite',
                }} />
              )}
              {/* Vinyl disc */}
              <div
                className={`fsp-vinyl${isPlaying ? ' playing' : ''}`}
                style={{
                  width: 280, height: 280, borderRadius: '50%', position: 'relative',
                  background: 'conic-gradient(from 0deg, #111 0%, #1a1a1a 25%, #0d0d0d 50%, #1a1a1a 75%, #111 100%)',
                  boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                {/* Grooves */}
                {[40, 55, 70, 85, 100].map(r => (
                  <div key={r} style={{
                    position: 'absolute',
                    inset: `${r}px`,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.03)',
                    pointerEvents: 'none',
                  }} />
                ))}
                {/* Album art center label */}
                <div style={{
                  position: 'absolute',
                  inset: '15%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid rgba(0,0,0,0.8)',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                }}>
                  {currentTrack.coverUrl ? (
                    <Image src={currentTrack.coverUrl} alt={currentTrack.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#1a1a1a',
                      fontSize: 40, fontFamily: 'Instrument Serif, serif',
                      color: 'rgba(255,255,255,0.15)',
                    }}>
                      {currentTrack.title.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Center hole */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#000', border: '1px solid rgba(255,255,255,0.1)',
                  zIndex: 2,
                }} />
              </div>
            </div>

            {/* Track info */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <h2 style={{
                fontFamily: 'Instrument Serif, serif',
                fontSize: 30, fontWeight: 400, fontStyle: 'italic',
                color: '#ffffff', letterSpacing: '-0.3px', lineHeight: 1.15,
                marginBottom: 8,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {currentTrack.title}
              </h2>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14, color: 'rgba(255,255,255,0.45)',
                fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {currentTrack.artist}
              </p>
            </div>

            {/* Glass controls card */}
            <div style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '24px 28px',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              {/* Progress bar */}
              <div>
                <div
                  ref={progressRef}
                  className="fsp-progress-bar"
                  onClick={seekTo}
                  onMouseMove={e => {
                    if (!progressRef.current || duration === 0) return;
                    const rect = progressRef.current.getBoundingClientRect();
                    setHoverProgress(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
                  }}
                  onMouseLeave={() => setHoverProgress(null)}
                  style={{ width: '100%', height: 24, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  <div style={{
                    width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99,
                    position: 'relative', overflow: 'visible',
                  }}>
                    <div
                      className="fsp-fill"
                      style={{
                        height: '100%', width: `${displayProgress}%`,
                        background: hoverProgress !== null ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                        borderRadius: 99,
                        transition: hoverProgress !== null ? 'none' : 'width 0.25s linear, background 0.2s',
                        position: 'relative',
                      }}
                    />
                    {/* Scrub thumb */}
                    <div
                      className="fsp-thumb"
                      style={{
                        position: 'absolute', top: '50%',
                        left: `${displayProgress}%`,
                        transform: 'translate(-50%, -50%) scale(0)',
                        width: 13, height: 13, borderRadius: '50%',
                        background: '#fff', opacity: 0,
                        transition: 'opacity 0.18s, transform 0.18s',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em' }}>
                    {formatDuration(currentTime)}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em' }}>
                    {formatDuration(duration)}
                  </span>
                </div>
              </div>

              {/* Main controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <IconBtn onClick={toggleShuffle} active={shuffle} title="Shuffle" size="sm">
                  <Shuffle size={16} />
                </IconBtn>

                <IconBtn onClick={playPrev} title="Previous" size="md">
                  <SkipBack size={20} fill="currentColor" />
                </IconBtn>

                <button
                  className="play-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    width: 58, height: 58, borderRadius: '50%',
                    background: '#ffffff',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  {isPlaying
                    ? <Pause size={22} color="#000" fill="#000" />
                    : <Play size={22} color="#000" fill="#000" style={{ marginLeft: 2 }} />
                  }
                </button>

                <IconBtn onClick={playNext} title="Next" size="md">
                  <SkipForward size={20} fill="currentColor" />
                </IconBtn>

                <IconBtn onClick={toggleRepeat} active={repeat !== 'off'} title={`Repeat: ${repeat}`} size="sm">
                  {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                </IconBtn>
              </div>

              {/* Bottom action row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <IconBtn
                    onClick={() => toggleFavorite(currentTrack.id)}
                    title="Like"
                    size="sm"
                    active={isLiked}
                    activeColor="#f87171"
                  >
                    <Heart size={15} fill={isLiked ? '#f87171' : 'none'} />
                  </IconBtn>

                  {isSearchTrack && !isDownloaded && (
                    <IconBtn onClick={() => processDownload(currentTrack.sourceUrl)} title="Download" size="sm">
                      <Download size={15} />
                    </IconBtn>
                  )}

                  <IconBtn
                    onClick={() => { handleClose(); setTimeout(() => setActiveView('queue'), 400); }}
                    title="Queue"
                    size="sm"
                  >
                    <ListMusic size={15} />
                  </IconBtn>
                </div>

                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: showLyrics ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: `1px solid ${showLyrics ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 99, padding: '5px 12px',
                    cursor: 'pointer',
                    color: showLyrics ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 12, fontWeight: 400, letterSpacing: '0.04em',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!showLyrics) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { if (!showLyrics) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                >
                  {showLyrics ? <Music size={12} /> : <AlignLeft size={12} />}
                  {showLyrics ? 'Art' : 'Lyrics'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Lyrics panel */}
          {showLyrics && (
            <div
              className="fsp-lyrics-panel"
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                minWidth: 0, alignSelf: 'stretch',
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.15em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)',
                }}>
                  Lyrics
                </p>
              </div>

              {/* Gradient fade container */}
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                {/* Top fade */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 80, zIndex: 2, pointerEvents: 'none',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
                }} />
                {/* Bottom fade */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, zIndex: 2, pointerEvents: 'none',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
                }} />

                <div
                  ref={lyricsContainerRef}
                  className="fsp-lyrics-container"
                  style={{
                    height: '100%', maxHeight: 480,
                    overflowY: 'auto',
                    display: 'flex', flexDirection: 'column',
                    padding: '60px 8px 60px 4px',
                    gap: 0,
                  }}
                >
                  {isLoadingLyrics ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                        Finding lyrics…
                      </span>
                    </div>
                  ) : lyrics ? (
                    parsedLyrics ? (
                      parsedLyrics.map((line, i) => {
                        const isActive = i === currentLineIndex;
                        const isPast = i < currentLineIndex;
                        return (
                          <div
                            key={i}
                            ref={isActive ? activeLineRef : null}
                            className="fsp-lyric-line"
                            onClick={() => {
                              const audio = document.querySelector('audio');
                              if (audio) { audio.currentTime = line.time; setCurrentTime(line.time); }
                            }}
                            style={{
                              fontFamily: isActive ? 'Instrument Serif, serif' : 'DM Sans, sans-serif',
                              fontSize: isActive ? 28 : 20,
                              fontStyle: isActive ? 'italic' : 'normal',
                              fontWeight: isActive ? 400 : 400,
                              color: isActive
                                ? '#ffffff'
                                : isPast
                                  ? 'rgba(255,255,255,0.18)'
                                  : 'rgba(255,255,255,0.28)',
                              lineHeight: 1.3,
                              padding: `${isActive ? 14 : 10}px 0`,
                              letterSpacing: isActive ? '-0.2px' : '0.01em',
                            }}
                          >
                            {line.text}
                          </div>
                        );
                      })
                    ) : lyrics.plainLyrics ? (
                      lyrics.plainLyrics.split('\n').map((line, i) => (
                        <div key={i} style={{
                          fontFamily: 'DM Sans, sans-serif', fontSize: 16,
                          color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, padding: '2px 0',
                        }}>
                          {line || '\u00A0'}
                        </div>
                      ))
                    ) : (
                      <EmptyState label="Lyrics not available for this track" />
                    )
                  ) : (
                    <EmptyState label="No lyrics found" />
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

// ─── Sub-components ────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.4 }}>
      <Music size={28} color="rgba(255,255,255,0.4)" />
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.03em' }}>
        {label}
      </span>
    </div>
  );
}

function IconBtn({
  children, onClick, active, title, size, activeColor,
}: {
  children: React.ReactNode; onClick: () => void;
  active?: boolean; title?: string;
  size?: 'sm' | 'md';
  activeColor?: string;
}) {
  const dim = size === 'md' ? 40 : 34;
  const activeCol = activeColor || '#ffffff';
  return (
    <button
      onClick={onClick}
      title={title}
      className="control-btn"
      style={{
        width: dim, height: dim,
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none', borderRadius: '50%', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? activeCol : 'rgba(255,255,255,0.4)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        e.currentTarget.style.color = active ? activeCol : 'rgba(255,255,255,0.85)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = active ? 'rgba(255,255,255,0.08)' : 'transparent';
        e.currentTarget.style.color = active ? activeCol : 'rgba(255,255,255,0.4)';
      }}
    >
      {children}
    </button>
  );
}