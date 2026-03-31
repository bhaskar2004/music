'use client';

import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import { Play, Music2, Trash2, GripVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import Image from 'next/image';

const PLACEHOLDER_COLORS = [
  '#000000', '#0A0A0A', '#121212', '#1A1A1A'
];

export default function QueueView() {
  const { queue, currentTrack, setCurrentTrack, setIsPlaying, setQueue, library, reorderQueue } = useMusicStore();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  const totalDuration = queue.reduce((sum, t) => sum + (t.duration || 0), 0);

  if (!queue.length) {
    return (
      <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
      <h1 className="brand-text" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 24 }}>
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
              className="tap-active uber-btn-accent"
              style={{ padding: '10px 24px', fontSize: 13, marginTop: 12 }}
            >
              <Play size={14} fill="currentColor" />
              Play All from Library
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentIdx = queue.findIndex((t) => t.id === currentTrack?.id);
  const upNext = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

  const handleDragStart = (absoluteIndex: number) => {
    setDragIdx(absoluteIndex);
  };

  const handleDragOver = (e: React.DragEvent, absoluteIndex: number) => {
    e.preventDefault();
    setDropIdx(absoluteIndex);
  };

  const handleDrop = (absoluteIndex: number) => {
    if (dragIdx !== null && dragIdx !== absoluteIndex) {
      reorderQueue(dragIdx, absoluteIndex);
    }
    setDragIdx(null);
    setDropIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDropIdx(null);
  };

  return (
    <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="brand-text" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 4 }}>
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
          className="tap-active"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: 'rgba(229,62,62,0.1)', border: '1px solid rgba(229,62,62,0.2)',
            borderRadius: 'var(--radius)', color: 'var(--danger)', fontFamily: 'var(--font-sans)',
            fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(229,62,62,0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(229,62,62,0.1)')}
        >
          <Trash2 size={12} /> Clear Queue
        </button>
      </div>

      {currentTrack && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Now Playing
          </div>
          <QueueRow track={currentTrack} index={0} isActive absoluteIndex={currentIdx} />
        </div>
      )}

      {upNext.length > 0 && (
        <div>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
          }}>
            Up Next — {upNext.length} tracks · Drag to reorder
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {upNext.map((track, i) => {
              const absoluteIndex = currentIdx + 1 + i;
              return (
                <div
                  key={track.id}
                  draggable
                  onDragStart={() => handleDragStart(absoluteIndex)}
                  onDragOver={(e) => handleDragOver(e, absoluteIndex)}
                  onDrop={() => handleDrop(absoluteIndex)}
                  onDragEnd={handleDragEnd}
                  style={{
                    position: 'relative',
                    opacity: dragIdx === absoluteIndex ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {dropIdx === absoluteIndex && dragIdx !== absoluteIndex && (
                    <div style={{
                      position: 'absolute', top: -2, left: 0, right: 0, height: 3,
                      background: 'var(--brand-gradient)', borderRadius: 99, zIndex: 10,
                    }} />
                  )}
                  <QueueRow
                    track={track}
                    index={i}
                    absoluteIndex={absoluteIndex}
                    onPlay={() => {
                      setCurrentTrack(track);
                      setIsPlaying(true);
                    }}
                    draggable
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QueueRow({
  track, index, isActive, onPlay, draggable: isDraggable, absoluteIndex,
}: {
  track: import('@/types').Track;
  index: number;
  isActive?: boolean;
  onPlay?: () => void;
  draggable?: boolean;
  absoluteIndex: number;
}) {
  const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  return (
    <div
      onClick={onPlay}
      className={`uber-card ${isActive ? 'uber-card-active' : ''}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
        borderRadius: 12, cursor: onPlay ? 'pointer' : 'default', marginBottom: 4,
      }}
    >
      {/* Drag handle */}
      {isDraggable && (
        <div
          style={{
            cursor: 'grab', color: 'var(--text-faint)', display: 'flex', padding: 2,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-muted)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* Cover */}
      <div style={{
        width: 40, height: 40, borderRadius: 6, background: bgColor,
        flexShrink: 0, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
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
