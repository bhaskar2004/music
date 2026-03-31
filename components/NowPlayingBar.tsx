'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  ListMusic, Heart, Maximize2,
} from 'lucide-react';
import Image from 'next/image';
import SleepTimerDropdown from './SleepTimerDropdown';

const PLACEHOLDER_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#1b1b2f',
  '#2d1b69', '#11372a', '#1a0533', '#2c1810',
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
    audio.src = `/api/stream/${currentTrack.id}`;
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
        audio2.src = `/api/stream/${nextTrack.id}`;
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
          height: 84,
          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
          display: 'grid',
          alignItems: 'center',
          padding: '0 24px',
          gap: 20,
          flexShrink: 0,
          position: 'relative',
          zIndex: 90,
        }}
      >
        {/* Left — Track info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Album art — clickable for full-screen */}
          <div
            onClick={() => setShowFullScreenPlayer(true)}
            style={{
              width: 48, height: 48, borderRadius: 8, background: bgColor,
              flexShrink: 0, position: 'relative', overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)', cursor: 'pointer',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Open full-screen player"
          >
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl} alt={currentTrack.title}
                fill style={{ objectFit: 'cover' }} unoptimized
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.15)' }}>
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
              <Maximize2 size={14} color="#fff" />
            </div>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-sans)',
              color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', marginBottom: 2, letterSpacing: '-0.2px',
            }}>
              {currentTrack.title}
            </div>
            <div style={{
              fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
              color: 'var(--text-muted)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentTrack.artist}
            </div>
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            className="desktop-only"
            aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: isLiked ? 'var(--accent)' : 'var(--text-faint)',
              display: 'flex', padding: 4, transition: 'color 0.15s, transform 0.1s', flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Heart size={15} fill={isLiked ? 'var(--accent)' : 'none'} />
          </button>
        </div>

        {/* Center — Controls + Seek */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Playback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ControlBtn onClick={toggleShuffle} active={shuffle} title="Shuffle" ariaLabel={`Shuffle ${shuffle ? 'on' : 'off'}`} className="desktop-only">
              <Shuffle size={14} />
            </ControlBtn>

            <ControlBtn onClick={playPrev} title="Previous" ariaLabel="Previous track">
              <SkipBack size={16} fill="currentColor" />
            </ControlBtn>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              style={{
                width: 44, height: 44, borderRadius: '50%', background: 'var(--text)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s, box-shadow 0.15s',
                flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            >
              {isPlaying ? (
                <Pause size={18} color="var(--bg)" fill="var(--bg)" />
              ) : (
                <Play size={18} color="var(--bg)" fill="var(--bg)" style={{ marginLeft: 3 }} />
              )}
            </button>

            <ControlBtn onClick={playNext} title="Next" ariaLabel="Next track">
              <SkipForward size={16} fill="currentColor" />
            </ControlBtn>

            <ControlBtn onClick={toggleRepeat} active={repeat !== 'off'} title={`Repeat: ${repeat}`} ariaLabel={`Repeat ${repeat}`} className="desktop-only">
              {repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
            </ControlBtn>
          </div>

          {/* Seek bar */}
          <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 480 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 36, textAlign: 'right', flexShrink: 0 }}>
              {formatDuration(displayTime)}
            </span>
            <div
              ref={progressRef}
              onMouseDown={handleProgressMouseDown}
              onClick={handleProgressClick}
              role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(displayTime)} tabIndex={0}
              style={{ flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 99, cursor: 'pointer', position: 'relative', overflow: 'visible' }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPct}%`, background: 'var(--text)', borderRadius: 99, transition: dragging ? 'none' : 'width 0.1s linear' }} />
              <div style={{ position: 'absolute', top: '50%', left: `${progressPct}%`, transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--text)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', transition: dragging ? 'none' : 'left 0.1s linear', pointerEvents: 'none' }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', width: 36, flexShrink: 0 }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right — Volume + Queue + Sleep Timer */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <SleepTimerDropdown />

          <button
            onClick={() => setShowFullScreenPlayer(true)}
            aria-label="Full-screen player"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 6, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Expand"
          >
            <Maximize2 size={15} />
          </button>

          <button
            onClick={() => { setActiveView('queue'); }}
            aria-label="View queue"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 6, borderRadius: 6, transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Queue"
          >
            <ListMusic size={15} />
          </button>

          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Unmute' : 'Mute'}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', padding: 4, transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div style={{ width: 90 }}>
            <input
              type="range" min={0} max={1} step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => { setVolume(parseFloat(e.target.value)); if (muted) setMuted(false); }}
              aria-label="Volume"
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
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
      onClick={onClick} title={title} aria-label={ariaLabel || title} className={className}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        display: 'flex', padding: 8, borderRadius: 8,
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = active ? 'var(--text)' : 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
      {active && (
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
      )}
    </button>
  );
}

function EmptyBar() {
  return (
    <div style={{ height: 80, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <p style={{ color: 'var(--text-faint)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
        Select a track to begin playing
      </p>
    </div>
  );
}
