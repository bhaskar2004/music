'use client';

import { useEffect, useState, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import {
  X, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart, ListMusic,
  Volume2, VolumeX, ChevronDown, AlignLeft, Music,
} from 'lucide-react';
import Image from 'next/image';

export default function FullScreenPlayer() {
  const {
    currentTrack, isPlaying, shuffle, repeat, favorites,
    currentTime, duration, volume, lyrics, isLoadingLyrics,
    setIsPlaying, playNext, playPrev, toggleShuffle, toggleRepeat,
    toggleFavorite, setShowFullScreenPlayer, setActiveView, setCurrentTime,
  } = useMusicStore();

  const [visible, setVisible] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
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
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex, showLyrics]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setShowFullScreenPlayer(false), 350);
  };

  if (!currentTrack) return null;
  const isLiked = favorites.includes(currentTrack.id);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fullscreen-player-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Animated background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        {currentTrack.coverUrl && (
          <Image
            src={currentTrack.coverUrl}
            alt=""
            fill
            style={{ objectFit: 'cover', filter: 'blur(80px) brightness(0.3) saturate(1.5)', transform: 'scale(1.3)' }}
            unoptimized
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 500, width: '90%', padding: '40px 0' }}>
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: -20, right: -20,
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <ChevronDown size={22} />
        </button>

        {/* Album art / Lyrics Toggle */}
        <div
          style={{
            width: 320, height: 320, borderRadius: 16, position: 'relative',
            overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,0.6)',
            background: '#111',
          }}
        >
          {!showLyrics ? (
            currentTrack.coverUrl ? (
              <Image src={currentTrack.coverUrl} alt={currentTrack.title} fill style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, fontWeight: 800, color: 'rgba(255,255,255,0.1)' }}>
                {currentTrack.title.charAt(0)}
              </div>
            )
          ) : (
            <div 
              ref={lyricsContainerRef}
              style={{ 
                width: '100%', height: '100%', padding: '40% 16px', 
                overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24,
                background: 'rgba(0,0,0,0.4)', scrollBehavior: 'smooth',
                scrollbarWidth: 'none', msOverflowStyle: 'none'
              }}
            >
              {isLoadingLyrics ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                  Loading lyrics...
                </div>
              ) : lyrics ? (
                parsedLyrics ? (
                  parsedLyrics.map((line, i) => {
                    const isActive = i === currentLineIndex;
                    return (
                      <div 
                        key={i}
                        ref={isActive ? activeLineRef : null}
                        onClick={() => {
                          const audio = document.querySelector('audio');
                          if (audio) {
                            audio.currentTime = line.time;
                            setCurrentTime(line.time);
                          }
                        }}
                        style={{
                          fontSize: isActive ? 22 : 18, 
                          fontWeight: isActive ? 800 : 600, 
                          textAlign: 'center',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.25)',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                          padding: '8px 0',
                          cursor: 'pointer',
                          filter: isActive ? 'none' : 'blur(0.5px)',
                        }}
                      >
                        {line.text}
                      </div>
                    );
                  })
                ) : lyrics.plainLyrics ? (
                  lyrics.plainLyrics.split('\n').map((line, i) => (
                    <div key={i} style={{ fontSize: 16, color: '#fff', textAlign: 'center', opacity: 0.8 }}>{line}</div>
                  ))
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                    Lyrics not available for this track.
                  </div>
                )
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                  No lyrics found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Track info */}
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h2 style={{
            fontSize: 26, fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px', marginBottom: 6,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {currentTrack.title}
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
            {currentTrack.artist}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%' }}>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#fff', borderRadius: 99, transition: 'width 0.3s linear' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
              {formatDuration(currentTime)}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <FSControlBtn onClick={toggleShuffle} active={shuffle} title="Shuffle">
            <Shuffle size={18} />
          </FSControlBtn>

          <FSControlBtn onClick={playPrev} title="Previous">
            <SkipBack size={22} fill="currentColor" />
          </FSControlBtn>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fff',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.15s',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? <Pause size={26} color="#000" fill="#000" /> : <Play size={26} color="#000" fill="#000" style={{ marginLeft: 3 }} />}
          </button>

          <FSControlBtn onClick={playNext} title="Next">
            <SkipForward size={22} fill="currentColor" />
          </FSControlBtn>

          <FSControlBtn onClick={toggleRepeat} active={repeat !== 'off'} title={`Repeat: ${repeat}`}>
            {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </FSControlBtn>
        </div>

        {/* Bottom actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            onClick={() => setShowLyrics(!showLyrics)}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', 
              color: showLyrics ? 'var(--accent)' : 'rgba(255,255,255,0.5)', 
              transition: 'all 0.15s', display: 'flex', padding: 8 
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title={showLyrics ? "Show Album Art" : "Show Lyrics"}
          >
            {showLyrics ? <Music size={22} /> : <AlignLeft size={22} />}
          </button>

          <button
            onClick={() => toggleFavorite(currentTrack.id)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isLiked ? '#ff6b6b' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s', display: 'flex', padding: 8 }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Heart size={22} fill={isLiked ? '#ff6b6b' : 'none'} />
          </button>

          <button
            onClick={() => { handleClose(); setTimeout(() => setActiveView('queue'), 400); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 8, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            <ListMusic size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FSControlBtn({ children, onClick, active, title }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        display: 'flex', padding: 10, borderRadius: 99,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
