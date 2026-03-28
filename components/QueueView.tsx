'use client';

import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import { Play, Music2, Trash2 } from 'lucide-react';
import Image from 'next/image';

const PLACEHOLDER_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#1b1b2f',
  '#2d1b69', '#11372a', '#1a0533', '#2c1810',
];

export default function QueueView() {
  const { queue, currentTrack, setCurrentTrack, setIsPlaying, setQueue, library } = useMusicStore();

  const totalDuration = queue.reduce((sum, t) => sum + (t.duration || 0), 0);

  if (!queue.length) {
    return (
      <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
        <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1px', marginBottom: 24, color: 'var(--text)' }}>
          Queue
        </h1>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'var(--text-muted)',
            gap: 12,
          }}
        >
          <Music2 size={28} color="var(--text-faint)" />
          <p style={{ fontSize: 14 }}>No tracks in queue</p>
          {library.length > 0 && (
            <button
              onClick={() => {
                setQueue(library);
                setCurrentTrack(library[0]);
                setIsPlaying(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
                marginTop: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <Play size={14} />
              Play All from Library
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
  const upNext = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

  return (
    <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1px', marginBottom: 4, color: 'var(--text)' }}>
            Queue
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
            {queue.length} {queue.length === 1 ? 'track' : 'tracks'} · {formatDuration(totalDuration)}
          </p>
        </div>
        <button
          onClick={() => {
            setQueue([]);
            setCurrentTrack(null);
            setIsPlaying(false);
          }}
          aria-label="Clear queue"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(229,62,62,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <Trash2 size={12} />
          Clear Queue
        </button>
      </div>

      {currentTrack && (
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            Now Playing
          </div>
          <QueueRow track={currentTrack} index={0} isActive />
        </div>
      )}

      {upNext.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            Up Next — {upNext.length} tracks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upNext.map((track, i) => (
              <QueueRow
                key={track.id}
                track={track}
                index={i}
                onPlay={() => {
                  setCurrentTrack(track);
                  setIsPlaying(true);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QueueRow({
  track,
  index,
  isActive,
  onPlay,
}: {
  track: import('@/types').Track;
  index: number;
  isActive?: boolean;
  onPlay?: () => void;
}) {
  const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  return (
    <div
      onClick={onPlay}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'var(--accent-dim)' : 'transparent',
        border: `1px solid ${isActive ? 'rgba(6,193,103,0.2)' : 'transparent'}`,
        cursor: onPlay ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isActive && onPlay) e.currentTarget.style.background = 'var(--surface2)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Cover */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          background: bgColor,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {track.coverUrl ? (
          <Image src={track.coverUrl} alt={track.title} fill style={{ objectFit: 'cover' }} unoptimized />
        ) : (
          <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.15)' }}>
            {track.title.charAt(0)}
          </span>
        )}
        {isActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        <div style={{ fontWeight: 500, fontSize: 13, color: isActive ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artist}
        </div>
      </div>

      {/* Duration */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {formatDuration(track.duration)}
      </div>
    </div>
  );
}
