'use client';

import { Track } from '@/types';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration, formatDate } from '@/lib/utils';
import { Play, Pause, MoreHorizontal, Trash2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface TrackCardProps {
  track: Track;
  index: number;
}

const PLACEHOLDER_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#1b1b2f',
  '#2d1b69', '#11372a', '#1a0533', '#2c1810',
];

export default function TrackCard({ track, index }: TrackCardProps) {
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue, library, removeTrack } =
    useMusicStore();

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = currentTrack?.id === track.id;
  const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  const handlePlay = () => {
    if (isActive) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setQueue(library);
      setIsPlaying(true);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (isActive) { setCurrentTrack(null); setIsPlaying(false); }
    await fetch('/api/library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: track.id }),
    });
    removeTrack(track.id);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      className="animate-fade-in"
      style={{
        background: isActive ? 'var(--surface2)' : 'var(--surface)',
        border: `1px solid ${isActive ? 'rgba(6,193,103,0.25)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        animationFillMode: 'both',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.4)'
          : isActive
          ? '0 0 0 1px rgba(6,193,103,0.1)'
          : 'none',
      }}
      onClick={handlePlay}
    >
      {/* Cover Art */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 8,
          marginBottom: 12,
          position: 'relative',
          overflow: 'hidden',
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {track.coverUrl ? (
          <Image
            src={track.coverUrl}
            alt={track.title}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        ) : (
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 28,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.15)',
              userSelect: 'none',
            }}
          >
            {track.title.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Play overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered || isActive ? 1 : 0,
            transition: 'opacity 0.2s',
            borderRadius: 8,
          }}
        >
          {isActive && isPlaying ? (
            <div style={{ display: 'flex', gap: 3, height: 20, alignItems: 'flex-end' }}>
              <div className="eq-bar" style={{ height: '100%' }} />
              <div className="eq-bar" style={{ height: '100%' }} />
              <div className="eq-bar" style={{ height: '100%' }} />
            </div>
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                background: 'var(--accent)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px var(--accent-glow)',
              }}
            >
              {isActive && !isPlaying ? (
                <Play size={16} color="#000" fill="#000" style={{ marginLeft: 2 }} />
              ) : (
                <Play size={16} color="#000" fill="#000" style={{ marginLeft: 2 }} />
              )}
            </div>
          )}
        </div>

        {/* Active indicator */}
        {isActive && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent-glow)',
            }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ paddingRight: 8 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: isActive ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 3,
          }}
          title={track.title}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 8,
          }}
          title={track.artist}
        >
          {track.artist}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--text-faint)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>{formatDuration(track.duration)}</span>
          <span>{formatDate(track.addedAt)}</span>
        </div>
      </div>

      {/* Menu button */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: 28,
            height: 28,
            background: 'rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <MoreHorizontal size={13} />
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 32,
              right: 0,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              zIndex: 50,
            }}
            className="animate-fade-in"
          >
            <a
              href={track.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                color: 'var(--text-muted)',
                fontSize: 12,
                textDecoration: 'none',
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <ExternalLink size={12} />
              View Source
            </a>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <button
              onClick={handleDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                color: 'var(--danger)',
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,77,77,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
