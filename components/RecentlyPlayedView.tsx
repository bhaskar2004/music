'use client';

import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import { Clock, Play, Shuffle, Trash2, Music2 } from 'lucide-react';
import Image from 'next/image';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function RecentlyPlayedView() {
  const { recentlyPlayed, library, clearRecentlyPlayed, setCurrentTrack, setQueue, setIsPlaying, playAll, shufflePlay } = useMusicStore();

  const recentTracks = recentlyPlayed
    .map(r => {
      const track = library.find(t => t.id === r.trackId);
      return track ? { ...r, track } : null;
    })
    .filter(Boolean) as Array<{ trackId: string; playedAt: string; listenDuration: number; track: import('@/types').Track }>;

  const handlePlayAll = () => {
    const tracks = recentTracks.map(r => r.track);
    playAll(tracks);
  };

  const handleShufflePlay = () => {
    const tracks = recentTracks.map(r => r.track);
    shufflePlay(tracks);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        className="responsive-padding"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexShrink: 0, paddingBottom: 0, flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="brand-text font-display" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 4 }}>
            Recently Played
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            {recentTracks.length} {recentTracks.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {recentTracks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handlePlayAll} className="tap-active uber-btn-accent" style={{ padding: '8px 20px', fontSize: 13 }}>
              <Play size={14} fill="currentColor" /> Play All
            </button>
            <button onClick={handleShufflePlay} className="tap-active uber-btn-primary"
              style={{ padding: '8px 20px', fontSize: 13, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              <Shuffle size={14} /> Shuffle
            </button>
            <button onClick={clearRecentlyPlayed} className="tap-active"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)',
                borderRadius: 'var(--radius)', color: 'var(--danger)', fontWeight: 600,
                fontSize: 12, cursor: 'pointer',
              }}>
              <Trash2 size={12} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="responsive-padding" style={{ flex: 1, overflow: 'auto' }}>
        {recentTracks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={32} color="var(--text-faint)" />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>No history yet</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280 }}>
                Tracks you listen to will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentTracks.map((entry, i) => (
              <RecentRow
                key={`${entry.trackId}-${entry.playedAt}`}
                track={entry.track}
                playedAt={entry.playedAt}
                index={i}
                onPlay={() => {
                  setCurrentTrack(entry.track);
                  setQueue(recentTracks.map(r => r.track));
                  setIsPlaying(true);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentRow({ track, playedAt, index, onPlay }: {
  track: import('@/types').Track; playedAt: string; index: number; onPlay: () => void;
}) {
  const { currentTrack, isPlaying } = useMusicStore();
  const isActive = currentTrack?.id === track.id;

  return (
    <div
      onClick={onPlay}
      className="animate-fade-in"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
        background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
      }}
      onMouseEnter={e => e.currentTarget.style.background = isActive ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent'}
    >
      {/* Cover */}
      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface2)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        {track.coverUrl ? (
          <Image src={track.coverUrl} alt={track.title} fill style={{ objectFit: 'cover' }} unoptimized />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music2 size={18} color="var(--text-faint)" />
          </div>
        )}
        {isActive && isPlaying && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 2, height: 14, alignItems: 'flex-end' }}>
              <div className="eq-bar" style={{ height: '100%' }} />
              <div className="eq-bar" style={{ height: '100%' }} />
              <div className="eq-bar" style={{ height: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </div>
      </div>

      {/* Time info */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          {timeAgo(playedAt)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          {formatDuration(track.duration)}
        </div>
      </div>
    </div>
  );
}
