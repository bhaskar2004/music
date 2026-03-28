'use client';

import { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Shuffle, Repeat, Repeat1,
  ListMusic, Heart,
} from 'lucide-react';
import Image from 'next/image';

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
    setIsPlaying,
    setVolume,
    setCurrentTime,
    setDuration,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrev,
    setActiveView,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(false);

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

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || dragging) return;
    setCurrentTime(audio.currentTime);
    setLocalTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
  };

  const handleEnded = () => {
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

      <div
        className="now-playing-container"
        style={{
          height: 80,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'grid',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Left — Track info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Album art */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: bgColor,
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.15)',
                }}
              >
                {currentTrack.title.charAt(0)}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: 2,
              }}
            >
              {currentTrack.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentTrack.artist}
            </div>
          </div>

          <button
            onClick={() => setLiked(!liked)}
            className="desktop-only"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: liked ? 'var(--accent)' : 'var(--text-faint)',
              display: 'flex',
              padding: 4,
              transition: 'color 0.15s, transform 0.1s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Heart size={15} fill={liked ? 'var(--accent)' : 'none'} />
          </button>
        </div>

        {/* Center — Controls + Seek */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Playback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ControlBtn
              onClick={toggleShuffle}
              active={shuffle}
              title="Shuffle"
              className="desktop-only"
            >
              <Shuffle size={14} />
            </ControlBtn>

            <ControlBtn onClick={playPrev} title="Previous">
              <SkipBack size={16} fill="currentColor" />
            </ControlBtn>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--text)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.1s, background 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--text)')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isPlaying ? (
                <Pause size={16} color="#fff" fill="#fff" />
              ) : (
                <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              )}
            </button>

            <ControlBtn onClick={playNext} title="Next">
              <SkipForward size={16} fill="currentColor" />
            </ControlBtn>

            <ControlBtn
              onClick={toggleRepeat}
              active={repeat !== 'off'}
              title={`Repeat: ${repeat}`}
              className="desktop-only"
            >
              {repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
            </ControlBtn>
          </div>

          {/* Seek bar */}
          <div
            className="desktop-only"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                width: 36,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {formatDuration(displayTime)}
            </span>

            {/* Progress track */}
            <div
              ref={progressRef}
              onMouseDown={handleProgressMouseDown}
              onClick={handleProgressClick}
              style={{
                flex: 1,
                height: 4,
                background: 'var(--surface3)',
                borderRadius: 99,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {/* Filled */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progressPct}%`,
                  background: 'var(--accent)',
                  borderRadius: 99,
                  transition: dragging ? 'none' : 'width 0.1s',
                }}
              />
              {/* Thumb */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${progressPct}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--text)',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.1)',
                  transition: dragging ? 'none' : 'left 0.1s',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                width: 36,
                flexShrink: 0,
              }}
            >
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right — Volume + Queue */}
        <div
          className="desktop-only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={() => { setActiveView('queue'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: 6,
              borderRadius: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            title="Queue"
          >
            <ListMusic size={15} />
          </button>

          <button
            onClick={() => setMuted(!muted)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              padding: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div style={{ width: 90 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (muted) setMuted(false);
              }}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function ControlBtn({
  children,
  onClick,
  active,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={className}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        display: 'flex',
        padding: 8,
        borderRadius: 6,
        transition: 'color 0.15s, transform 0.1s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = 'var(--text)';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active ? 'var(--accent)' : 'var(--text-muted)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
      {active && (
        <div
          style={{
            position: 'absolute',
            bottom: 2,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'var(--accent)',
          }}
        />
      )}
    </button>
  );
}

function EmptyBar() {
  return (
    <div
      style={{
        height: 80,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <p style={{ color: 'var(--text-faint)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
        Select a track to begin playing
      </p>
    </div>
  );
}
