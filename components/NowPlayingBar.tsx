'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  ListMusic, Heart, Maximize2, Music2, Radio,
} from 'lucide-react';
import Image from 'next/image';
import SleepTimerDropdown from './SleepTimerDropdown';

const PLACEHOLDER_COLORS = [
  'var(--surface2)', 'var(--surface3)', 'color-mix(in srgb, var(--surface) 80%, var(--accent) 5%)'
];

export default function NowPlayingBar() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    shuffle,
    repeat,
    favorites,
    crossfadeDuration,
    setIsPlaying,
    setVolume,
    setCurrentTime,
    setDuration,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    playNext,
    playPrev,
    setActiveView,
    setShowFullScreenPlayer,
    addRecentPlay,
    incrementPlayCount,
    addListenTime,
    queue,
    toggleAutoplay,
    isAutoplayEnabled,
    pendingSeek,
    setPendingSeek,
    partyId,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioRef2 = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const lastTrackIdRef = useRef<string | null>(null);
  const listenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLiked = currentTrack ? favorites.includes(currentTrack.id) : false;

  // Track recently played & play count
  useEffect(() => {
    if (!currentTrack) return;
    if (lastTrackIdRef.current !== currentTrack.id) {
      addRecentPlay(currentTrack.id);
      incrementPlayCount(currentTrack.id);
      lastTrackIdRef.current = currentTrack.id;
    }
  }, [currentTrack?.id]);

  // Listen time tracking — every 10 seconds
  useEffect(() => {
    if (isPlaying) {
      listenIntervalRef.current = setInterval(() => {
        addListenTime(10);
      }, 10000);
    } else {
      if (listenIntervalRef.current) clearInterval(listenIntervalRef.current);
    }
    return () => { if (listenIntervalRef.current) clearInterval(listenIntervalRef.current); };
  }, [isPlaying]);

  // Sync audio src when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    
    const isSearchTrack = currentTrack.id.startsWith('search-');
    const isYouTubeUrl = currentTrack.sourceUrl?.includes('youtube.com') || currentTrack.sourceUrl?.includes('youtu.be');
    const isUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(currentTrack.id);

    if (isSearchTrack || (!isUUID && isYouTubeUrl)) {
      // Use the fast YouTube stream pipeline
      let videoId = currentTrack.id.replace('search-', '');
      if (videoId.length !== 11 && currentTrack.sourceUrl) {
        const match = currentTrack.sourceUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) videoId = match[1];
        else {
          const shortMatch = currentTrack.sourceUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
          if (shortMatch) videoId = shortMatch[1];
        }
      }
      audio.src = `/api/stream/youtube?v=${encodeURIComponent(videoId)}`;
    } else {
      audio.src = `/api/stream/${currentTrack.id}`;
    }
    
    audio.load();
    if (isPlaying) audio.play().catch(() => {});
  }, [currentTrack?.id]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // ─── Remote seek: consume pendingSeek from sync service ─────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (pendingSeek == null || !audio) return;
    audio.currentTime = pendingSeek;
    setLocalTime(pendingSeek);
    setPendingSeek(null);
  }, [pendingSeek]);

  // Crossfade logic
  const handleCrossfade = useCallback(() => {
    if (crossfadeDuration <= 0 || isCrossfading) return;
    const audio1 = audioRef.current;
    const audio2 = audioRef2.current;
    if (!audio1 || !audio2 || !duration) return;

    const remainingTime = duration - audio1.currentTime;
    if (remainingTime <= crossfadeDuration && remainingTime > 0.5) {
      setIsCrossfading(true);

      // Get next track
      const { queue: q, currentTrack: ct, shuffle: sh, repeat: rp } = useMusicStore.getState();
      const idx = q.findIndex(t => t.id === ct?.id);
      let nextTrack = null;
      if (sh) {
        const others = q.filter(t => t.id !== ct?.id);
        nextTrack = others[Math.floor(Math.random() * others.length)] ?? null;
      } else if (rp !== 'one') {
        nextTrack = q[(idx + 1) % q.length] ?? null;
      }

      if (nextTrack && nextTrack.id !== ct?.id) {
        if (nextTrack.id.startsWith('search-')) {
          const videoId = nextTrack.id.replace('search-', '');
          audio2.src = `/api/stream/youtube?v=${encodeURIComponent(videoId)}`;
        } else {
          audio2.src = `/api/stream/${nextTrack.id}`;
        }
        audio2.volume = 0;
        audio2.play().catch(() => {});

        const fadeSteps = 20;
        const fadeInterval = (crossfadeDuration * 1000) / fadeSteps;
        let step = 0;

        const fadeTimer = setInterval(() => {
          step++;
          const progress = step / fadeSteps;
          if (audio1) audio1.volume = Math.max(0, (muted ? 0 : volume) * (1 - progress));
          if (audio2) audio2.volume = (muted ? 0 : volume) * progress;

          if (step >= fadeSteps) {
            clearInterval(fadeTimer);
            audio1.pause();
            // Swap: audio2 becomes the new primary
            const { setCurrentTrack: setCT, setIsPlaying: setSP } = useMusicStore.getState();
            setCT(nextTrack);
            setIsCrossfading(false);
          }
        }, fadeInterval);
      }
    }
  }, [crossfadeDuration, isCrossfading, duration, muted, volume]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || dragging) return;
    setCurrentTime(audio.currentTime);
    setLocalTime(audio.currentTime);

    // Check for crossfade
    if (crossfadeDuration > 0) {
      handleCrossfade();
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
  };

  const handleEnded = () => {
    if (isCrossfading) return; // crossfade handles it
    if (repeat === 'one') {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play(); }
    } else {
      playNext();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !audioRef.current || !duration) return;
    const pct = (e.clientX - rect.left) / rect.width;
    const newTime = pct * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setLocalTime(newTime);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDragging(true);
    handleProgressClick(e);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const rect = progressRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setLocalTime(pct * duration);
    };
    const onUp = (e: MouseEvent) => {
      const rect = progressRef.current?.getBoundingClientRect();
      if (!rect || !duration || !audioRef.current) return;
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = pct * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setLocalTime(newTime);
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, duration]);
  const displayTime = dragging ? localTime : currentTime;
  const progressPct = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bgColor = PLACEHOLDER_COLORS[0];

  if (!currentTrack) return <EmptyBar />;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setIsPlaying(false)}
        preload="auto"
      />
      <audio ref={audioRef2} preload="none" />

      <div
        className="now-playing-container"
        style={{
          height: 88,
          margin: '0 20px 20px 20px',
          borderRadius: 24,
          background: 'color-mix(in srgb, var(--bg) 65%, transparent)',
          backdropFilter: 'blur(40px) saturate(2)',
          WebkitBackdropFilter: 'blur(40px) saturate(2)',
          border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
          display: 'grid',
          alignItems: 'center',
          padding: '0 24px',
          gap: 24,
          flexShrink: 0,
          position: 'relative',
          zIndex: 100,
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        {/* Left — Track info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          {/* Album art — clickable for full-screen */}
          <div
            onClick={() => setShowFullScreenPlayer(true)}
            className="bouncy-hover"
            style={{
              width: 52, height: 52, borderRadius: 12, background: bgColor,
              flexShrink: 0, position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', cursor: 'pointer',
            }}
            title="Open full-screen player"
          >
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl} alt={currentTrack.title}
                fill style={{ objectFit: 'cover' }} unoptimized
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--text-faint)', opacity: 0.3 }}>
                {currentTrack.title.charAt(0)}
              </div>
            )}
            {/* Expand overlay on hover */}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >
              <Maximize2 size={16} color="#fff" />
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-sans)',
              color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', marginBottom: 2, letterSpacing: '-0.4px',
            }}>
              {currentTrack.title}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
              color: 'var(--text-muted)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentTrack.artist}
            </div>
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className="desktop-only tap-active"
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: isLiked ? 'var(--accent)' : 'var(--text-faint)',
              display: 'flex', padding: 8, transition: 'all 0.2s ease', flexShrink: 0,
            }}
          >
            <Heart size={18} fill={isLiked ? 'var(--accent)' : 'none'} strokeWidth={isLiked ? 0 : 2} />
          </button>
        </div>

        {/* Center — Controls + Seek */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
          {/* Playback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ControlBtn onClick={toggleShuffle} active={shuffle} title="Shuffle" ariaLabel={`Shuffle ${shuffle ? 'on' : 'off'}`} className="desktop-only">
              <Shuffle size={16} />
            </ControlBtn>

            <ControlBtn onClick={playPrev} title="Previous" ariaLabel="Previous track">
              <SkipBack size={20} fill="currentColor" />
            </ControlBtn>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="tap-active"
              style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--text)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                flexShrink: 0, boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isPlaying ? (
                <Pause size={22} color="var(--bg)" fill="var(--bg)" />
              ) : (
                <Play size={22} color="var(--bg)" fill="var(--bg)" style={{ marginLeft: 4 }} />
              )}
            </button>

            <ControlBtn onClick={playNext} title="Next" ariaLabel="Next track">
              <SkipForward size={20} fill="currentColor" />
            </ControlBtn>

            <ControlBtn onClick={toggleRepeat} active={repeat !== 'off'} title={`Repeat: ${repeat}`} ariaLabel={`Repeat ${repeat}`} className="desktop-only">
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </ControlBtn>

            <ControlBtn onClick={toggleAutoplay} active={isAutoplayEnabled} title={`Autoplay (Infinite Radio) ${isAutoplayEnabled ? 'On' : 'Off'}`} ariaLabel="Autoplay toggle" className="desktop-only">
              <Radio size={16} />
            </ControlBtn>
          </div>

          {/* Seek bar */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 580 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 44, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
              {formatDuration(displayTime)}
            </span>
            <div
              ref={progressRef}
              onMouseDown={handleProgressMouseDown}
              onClick={handleProgressClick}
              role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(displayTime)} tabIndex={0}
              className={`seek-bar-container ${dragging ? 'dragging' : ''}`}
            >
              <div className="seek-bar-fill" style={{ width: `${progressPct}%`, transition: dragging ? 'none' : 'all 0.1s linear' }} />
              <div className="seek-handle" style={{ left: `${progressPct}%`, transition: dragging ? 'none' : 'left 0.1s linear' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 44, flexShrink: 0, fontWeight: 600 }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right — Volume + Queue + Sleep Timer */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          <SleepTimerDropdown />

          <button
            onClick={() => setShowFullScreenPlayer(true)}
            aria-label="Full-screen player"
            className="tap-active"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 8, borderRadius: 10, transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Full Screen"
          >
            <Maximize2 size={18} />
          </button>

          <button
            onClick={() => { setActiveView('queue'); }}
            aria-label="View queue"
            className="tap-active"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 8, borderRadius: 10, transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Queue"
          >
            <ListMusic size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <button
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="tap-active"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', padding: 4, transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div style={{ width: 100 }}>
              <input
                type="range" min={0} max={1} step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => { setVolume(parseFloat(e.target.value)); if (muted) setMuted(false); }}
                aria-label="Volume"
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', height: 4 }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ControlBtn({ children, onClick, active, title, ariaLabel, className }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; title?: string; ariaLabel?: string; className?: string;
}) {
  return (
    <button
      onClick={onClick} title={title} aria-label={ariaLabel || title} className={`tap-active ${className}`}
      style={{
        background: active ? 'var(--accent-dim)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        display: 'flex', padding: 10, borderRadius: 12,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? 'var(--accent)' : 'var(--text-muted)'; e.currentTarget.style.background = active ? 'var(--accent-dim)' : 'transparent'; }}
    >
      {children}
    </button>
  );
}

function EmptyBar() {
  return (
    <div style={{
      height: 88,
      margin: '0 20px 20px 20px',
      borderRadius: 24,
      background: 'color-mix(in srgb, var(--surface) 60%, transparent)',
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
      border: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      gap: 32,
      padding: '0 24px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.06)'
    }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Music2 size={24} color="var(--text-faint)" opacity={0.3} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 16, width: 140, background: 'var(--surface2)', borderRadius: 4 }} />
          <div style={{ height: 12, width: 90, background: 'var(--surface2)', borderRadius: 4 }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.3, pointerEvents: 'none' }}>
        <SkipBack size={20} />
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={22} color="var(--bg)" fill="var(--bg)" style={{ marginLeft: 4 }} />
        </div>
        <SkipForward size={20} />
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', opacity: 0.3, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Maximize2 size={18} />
          <ListMusic size={18} />
          <Volume2 size={18} />
          <div style={{ width: 100, height: 4, background: 'var(--surface2)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
