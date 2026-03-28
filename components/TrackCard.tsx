'use client';

import { Track } from '@/types';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration, formatDate } from '@/lib/utils';
import { Play, Pause, MoreHorizontal, Trash2, ExternalLink, Heart } from 'lucide-react';
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
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue, library, removeTrack, toggleFavorite, favorites } =
    useMusicStore();

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
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
        borderRadius: '12px', /* More modern radius */
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        animationFillMode: 'both',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 32px rgba(0,0,0,0.15)'
          : isActive
          ? '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)'
          : '0 4px 12px rgba(0,0,0,0.02)',
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
                width: 48,
                height: 48,
                background: 'var(--text)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transform: hovered ? 'scale(1)' : 'scale(0.9)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Play size={20} color="var(--bg)" fill="var(--bg)" style={{ marginLeft: 3 }} />
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

        {/* Favorite indicator */}
        {isFav && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={11} color="var(--accent)" fill="var(--accent)" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ paddingRight: 8, marginTop: 4 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: isActive ? 'var(--text)' : 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 2,
            letterSpacing: '-0.2px',
          }}
          title={track.title}
        >
          {track.title}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: 10,
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
          aria-label="Track options"
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
              minWidth: 170,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              zIndex: 50,
            }}
            className="animate-fade-in"
          >
            {/* Favorite toggle */}
            <button
              onClick={() => { toggleFavorite(track.id); setMenuOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                color: isFav ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                width: '100%',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'all 0.1s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Heart size={12} fill={isFav ? 'currentColor' : 'none'} />
              {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
            </button>
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
