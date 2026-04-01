'use client';

import { useMusicStore } from '@/store/musicStore';
import TrackCard from './TrackCard';
import { Plus, Search, Music2, ArrowUpDown, Play, Shuffle, X, CheckSquare, ListPlus, Trash2, ChevronDown, RefreshCcw } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Track } from '@/types';

type SortOption = 'recent' | 'title' | 'artist' | 'duration';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'duration', label: 'Duration' },
];

function sortTracks(tracks: Track[], sortBy: SortOption): Track[] {
  const sorted = [...tracks];
  switch (sortBy) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'artist':
      return sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    case 'duration':
      return sorted.sort((a, b) => b.duration - a.duration);
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }
}

export default function LibraryView() {
  const { 
    library, setShowDownloadModal, setQueue, setCurrentTrack, setIsPlaying, 
    activePlaylistId, playlists, playAll, shufflePlay, 
    isSelectionMode, setSelectionMode, selectedTrackIds, clearSelection, moveSelectedToPlaylist
  } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [isAddingSongs, setIsAddingSongs] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label;

  const activePlaylist = activePlaylistId ? playlists.find(p => p.id === activePlaylistId) : null;

  const filtered = useMemo(() => {
    const searched = library.filter((t) => {
      if (activePlaylistId) {
        const isInPlaylist = t.playlistIds?.includes(activePlaylistId);
        if (isAddingSongs) {
          // In "Add Songs" mode, show songs NOT in current playlist
          if (isInPlaylist) return false;
        } else {
          // Normal view: show songs IN current playlist
          if (!isInPlaylist) return false;
        }
      }
      
      return (
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.artist.toLowerCase().includes(search.toLowerCase()) ||
        t.album.toLowerCase().includes(search.toLowerCase())
      );
    });
    return sortTracks(searched, sortBy);
  }, [library, search, sortBy, activePlaylistId, isAddingSongs]);

  const handleStartAdding = () => {
    setIsAddingSongs(true);
    setSelectionMode(true);
  };

  const handleCancelSelection = () => {
    setIsAddingSongs(false);
    setSelectionMode(false);
    clearSelection();
  };

  const handleBulkMove = (targetPlaylistId: string) => {
    moveSelectedToPlaylist(selectedTrackIds, targetPlaylistId);
    setIsAddingSongs(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        className="responsive-padding"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          flexShrink: 0,
          paddingTop: 48,
          paddingBottom: 24,
          flexWrap: 'wrap',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
        }}
      >
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ 
            fontSize: 12, fontWeight: 800, color: 'var(--accent)', 
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Music2 size={14} />
            Your Collection
          </div>
          <h1 className="brand-text font-display" style={{ fontWeight: 900, fontSize: 48, letterSpacing: '-2px', marginBottom: 8, lineHeight: 1 }}>
            {activePlaylist ? activePlaylist.name : 'Library'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
            <span>{filtered.length} {filtered.length === 1 ? 'track' : 'tracks'}</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ color: 'var(--text-faint)' }}>Sorted by {activeSortLabel}</span>
            <span style={{ opacity: 0.3 }}>•</span>
            <button 
              onClick={() => useMusicStore.getState().fetchLibrary()}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 6 }}
              className="tap-active"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <RefreshCcw size={12} />
              Sync
            </button>
          </div>
        </div>

        {library.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <button
              onClick={() => playAll(filtered)}
              className="tap-active"
              style={{
                background: 'var(--accent)', color: '#000', border: 'none',
                borderRadius: '99px', padding: '12px 28px', fontSize: 14, fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 8px 24px var(--accent-glow)',
                transition: 'all 0.2s',
              }}
            >
              <Play size={16} fill="currentColor" />
              Play All
            </button>

            <button
              onClick={() => shufflePlay(filtered)}
              className="tap-active glass-panel"
              style={{
                padding: '12px 24px', fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <Shuffle size={16} />
              Shuffle
            </button>

            {activePlaylistId && !isAddingSongs && (
              <button
                onClick={handleStartAdding}
                className="tap-active"
                style={{
                  padding: '12px 24px', fontSize: 14, fontWeight: 700, border: 'none',
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', gap: 8, borderRadius: '99px',
                }}
              >
                <Plus size={16} />
                Add Songs
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      {library.length > 0 && (
        <div 
          className="responsive-padding"
          style={{ 
            display: 'flex', alignItems: 'center', gap: 12, 
            paddingTop: 0, paddingBottom: 16, flexShrink: 0,
            borderBottom: '1px solid color-mix(in srgb, var(--border) 30%, transparent)'
          }}
        >
          {/* Search */}
          <div
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: '12px',
              padding: '8px 16px',
              flex: '0 1 280px',
              transition: 'all 0.2s',
              background: 'var(--surface)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface2)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <Search size={18} color="var(--text-faint)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-sans)', flex: 1,
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Sort dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="tap-active"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                padding: '8px 12px', cursor: 'pointer', borderRadius: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ArrowUpDown size={14} />
              Sort by: {activeSortLabel}
              <ChevronDown size={14} />
            </button>

            {isSortOpen && (
              <div
                className="premium-dropdown"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  minWidth: 180, zIndex: 100,
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className="dropdown-item"
                    onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                    style={{ 
                      color: sortBy === opt.value ? 'var(--accent)' : 'inherit',
                      fontWeight: sortBy === opt.value ? 700 : 500,
                      justifyContent: 'space-between',
                    }}
                  >
                    {opt.label}
                    {sortBy === opt.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="responsive-padding" style={{ flex: 1, overflow: 'auto', paddingTop: 24 }}>
        {library.length === 0 ? (
          <EmptyState onAdd={() => setShowDownloadModal(true)} />
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: 300, color: 'var(--text-muted)', gap: 12,
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              <Search size={28} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 500 }}>No tracks match &quot;{search}&quot;</p>
            <button onClick={() => setSearch('')} style={{ color: 'var(--accent)', background: 'transparent', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              Clear Search
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 20,
              paddingBottom: 100,
            }}
          >
            {filtered.map((track, i) => (
              <TrackCard key={track.id} track={track} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedTrackIds.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 116,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg)',
            border: '1px solid var(--accent)',
            borderRadius: 24,
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            boxShadow: '0 20px 64px rgba(0,0,0,0.4), 0 0 40px var(--accent-glow)',
            zIndex: 1000,
            backdropFilter: 'blur(32px)',
          }}
          className="animate-slide-up"
        >
          <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14, paddingRight: 16, borderRight: '1px solid var(--border)' }}>
            {selectedTrackIds.length} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>selected</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {activePlaylistId && isAddingSongs ? (
              <button
                onClick={() => handleBulkMove(activePlaylistId)}
                className="tap-active"
                style={{
                  padding: '10px 24px', fontSize: 13, fontWeight: 700, border: 'none',
                  background: 'var(--accent)', color: '#000', borderRadius: '99px',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <Plus size={16} fill="currentColor" />
                Add to Playlist
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    selectedTrackIds.forEach(id => {
                      const t = library.find(track => track.id === id);
                      if (t) useMusicStore.getState().addToQueue(t);
                    });
                    clearSelection();
                    setSelectionMode(false);
                  }}
                  className="tap-active glass-panel"
                  style={{ padding: '10px 20px', borderRadius: '14px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <ListPlus size={16} />
                  Queue
                </button>
                
                {activePlaylistId && !isAddingSongs && (
                  <button
                    onClick={() => {
                      selectedTrackIds.forEach(trackId => {
                        useMusicStore.getState().toggleTrackInPlaylist(trackId, activePlaylistId);
                      });
                      clearSelection();
                      setSelectionMode(false);
                    }}
                    className="tap-active"
                    style={{ padding: '10px 20px', borderRadius: '14px', fontSize: 13, fontWeight: 600, color: 'var(--danger)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleCancelSelection}
            style={{ background: 'var(--surface2)', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 24,
        textAlign: 'center',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: 120,
          height: 120,
          borderRadius: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        }}
      >
        <Music2 size={48} color="var(--accent)" strokeWidth={1.5} style={{ opacity: 0.8 }} />
      </div>
      <div style={{ maxWidth: 360 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 32, marginBottom: 12, letterSpacing: '-1px' }}>
          Your Library is Empty
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, fontWeight: 500 }}>
          The world of offline music is just a link away. Discover tracks and build your private collection today.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="tap-active"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 36px',
          background: 'var(--brand-gradient)',
          color: '#000',
          border: 'none',
          borderRadius: '99px',
          fontFamily: 'var(--font-sans)',
          fontWeight: 800,
          fontSize: 16,
          cursor: 'pointer',
          boxShadow: '0 12px 32px var(--accent-glow)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1) translateY(0)')}
      >
        <Plus size={20} />
        Start Your Library
      </button>
    </div>
  );
}
