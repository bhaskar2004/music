'use client';

import { Track } from '@/types';
import { useMusicStore } from '@/store/musicStore';
import { formatDuration, formatDate } from '@/lib/utils';
import { Play, Pause, MoreHorizontal, Trash2, ExternalLink, Heart, Folder as FolderIcon, ListPlus, PlayCircle, Check, Square } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface TrackCardProps {
  track: Track;
  index: number;
}

const PLACEHOLDER_COLORS = [
  'var(--surface2)', 'var(--surface3)', 'color-mix(in srgb, var(--surface) 80%, var(--accent) 5%)'
];

export default function TrackCard({ track, index }: TrackCardProps) {
  const { currentTrack, isPlaying, setCurrentTrack, setIsPlaying, setQueue, library, removeTrack, toggleFavorite, favorites, folders, moveTrack, addToQueue, playNextTrack,
    isSelectionMode, selectedTrackIds, toggleTrackSelection } =
    useMusicStore();

  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  const isSelected = selectedTrackIds.includes(track.id);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectionMode) {
      toggleTrackSelection(track.id);
      return;
    }
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
      style={{
        borderRadius: '12px',
        padding: 16,
        cursor: 'pointer',
        position: 'relative',
        zIndex: hovered || menuOpen ? 50 : 1,
      }}
      className={`animate-fade-in premium-card ${isActive ? 'premium-card-active neon-border' : ''}`}
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

        {/* Play overlay - Styled like Uber/Spotify */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered || isActive || isSelectionMode ? 1 : 0,
            transition: 'opacity 0.25s ease',
            borderRadius: 8,
          }}
        >
          {isSelectionMode ? (
            <div
              className="tap-active"
              style={{
                width: 32,
                height: 32,
                background: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${isSelected ? 'var(--accent)' : '#fff'}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {isSelected && <Check size={18} color="#000" strokeWidth={3} />}
            </div>
          ) : isActive && isPlaying ? (
            <div style={{ display: 'flex', gap: 3, height: 20, alignItems: 'flex-end' }}>
              <div className="eq-bar" style={{ height: '100%' }} />
              <div className="eq-bar" style={{ height: '100%' }} />
              <div className="eq-bar" style={{ height: '100%' }} />
            </div>
          ) : (
            <div
              className="tap-active"
              style={{
                width: 44,
                height: 44,
                background: 'var(--text)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                transform: hovered ? 'scale(1)' : 'scale(0.8)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <Play size={18} color="var(--bg)" fill="var(--bg)" style={{ marginLeft: 2 }} />
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
            fontFamily: 'var(--font-sans)',
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
            fontFamily: 'var(--font-sans)',
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
              minWidth: 170,
              zIndex: 100,
            }}
            className="premium-dropdown"
          >
            {/* Queue Options */}
            <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
              Queue
            </div>
            <button
              className="dropdown-item"
              onClick={() => { playNextTrack(track); setMenuOpen(false); }}
              style={{ border: 'none', background: 'transparent', width: '100%', padding: 0 }}
            >
              <div className="dropdown-item" style={{ width: '100%' }}>
                <PlayCircle size={12} />
                Play Next
              </div>
            </button>
            <button
              className="dropdown-item"
              onClick={() => { addToQueue(track); setMenuOpen(false); }}
              style={{ border: 'none', background: 'transparent', width: '100%', padding: 0 }}
            >
              <div className="dropdown-item" style={{ width: '100%' }}>
                <ListPlus size={12} />
                Add to Queue
              </div>
            </button>
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            {/* Playlists */}
            {folders.length > 0 && (
              <>
                <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase' }}>
                  Move to Playlist
                </div>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    className="dropdown-item"
                    onClick={() => { moveTrack(track.id, folder.id); setMenuOpen(false); }}
                    style={{ border: 'none', background: 'transparent', width: '100%', padding: 0 }}
                  >
                    <div className="dropdown-item" style={{ width: '100%', color: track.folderId === folder.id ? 'var(--neon-blue)' : 'inherit' }}>
                      <FolderIcon size={12} fill={track.folderId === folder.id ? 'currentColor' : 'none'} />
                      {folder.name}
                    </div>
                  </button>
                ))}
                {track.folderId && (
                  <button
                    onClick={() => { moveTrack(track.id, undefined); setMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                      color: 'var(--text-muted)', fontSize: 12, background: 'transparent', border: 'none', width: '100%',
                      cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <FolderIcon size={12} opacity={0.5} />
                    Remove from Playlist
                  </button>
                )}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              </>
            )}

            {/* Favorite toggle */}
            <button
              className="dropdown-item"
              onClick={() => { toggleFavorite(track.id); setMenuOpen(false); }}
              style={{ border: 'none', background: 'transparent', width: '100%', padding: 0 }}
            >
              <div className="dropdown-item" style={{ width: '100%', color: isFav ? 'var(--neon-purple)' : 'inherit' }}>
                <Heart size={12} fill={isFav ? 'currentColor' : 'none'} />
                {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
              </div>
            </button>
            
            <a
              href={track.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="dropdown-item"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={12} />
              View Source
            </a>
            
            <div style={{ height: 1, background: 'var(--border)' }} />
            
            <button
              className="dropdown-item danger"
              onClick={handleDelete}
              style={{ border: 'none', background: 'transparent', width: '100%', padding: 0 }}
            >
              <div className="dropdown-item danger" style={{ width: '100%' }}>
                <Trash2 size={12} />
                Remove
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
