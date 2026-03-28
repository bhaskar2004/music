'use client';

import { useMusicStore } from '@/store/musicStore';
import TrackCard from './TrackCard';
import { Plus, Search, Music2, ArrowUpDown, Play, Shuffle, X, CheckSquare, ListPlus, Trash2, ChevronDown } from 'lucide-react';
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
    activeFolderId, folders, playAll, shufflePlay, 
    isSelectionMode, setSelectionMode, selectedTrackIds, clearSelection, moveSelectedToFolder
  } = useMusicStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [isAddingSongs, setIsAddingSongs] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label;

  const activeFolder = activeFolderId ? folders.find(f => f.id === activeFolderId) : null;

  const filtered = useMemo(() => {
    const searched = library.filter((t) => {
      if (activeFolderId) {
        if (isAddingSongs) {
          // In "Add Songs" mode, show songs NOT in current folder
          if (t.folderId === activeFolderId) return false;
        } else {
          // Normal view: show songs IN current folder
          if (t.folderId !== activeFolderId) return false;
        }
      }
      
      return (
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.artist.toLowerCase().includes(search.toLowerCase()) ||
        t.album.toLowerCase().includes(search.toLowerCase())
      );
    });
    return sortTracks(searched, sortBy);
  }, [library, search, sortBy, activeFolderId, isAddingSongs]);

  const handleStartAdding = () => {
    setIsAddingSongs(true);
    setSelectionMode(true);
  };

  const handleCancelSelection = () => {
    setIsAddingSongs(false);
    setSelectionMode(false);
    clearSelection();
  };

  const handleBulkMove = (targetFolderId?: string) => {
    moveSelectedToFolder(selectedTrackIds, targetFolderId);
    setIsAddingSongs(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        className="responsive-padding"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexShrink: 0,
          paddingBottom: 0,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="brand-text" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 4 }}>
            {activeFolder ? activeFolder.name : 'Library'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            {filtered.length} {filtered.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>

        {library.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => playAll(filtered)}
              className="tap-active uber-btn-accent"
              style={{ padding: '8px 20px', fontSize: 13 }}
            >
              <Play size={14} fill="currentColor" />
              Play All
            </button>

            <button
              onClick={() => shufflePlay(filtered)}
              className="tap-active uber-btn-primary"
              style={{ padding: '8px 20px', fontSize: 13, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              <Shuffle size={14} />
              Shuffle
            </button>

            {activeFolderId && !isAddingSongs && (
              <button
                onClick={handleStartAdding}
                className="tap-active uber-btn-primary"
                style={{ padding: '8px 20px', fontSize: 13, background: 'rgba(6, 193, 103, 0.1)', color: 'var(--accent)', border: '1px solid rgba(6, 193, 103, 0.2)' }}
              >
                <Plus size={14} />
                Add Songs
              </button>
            )}

            {!activeFolderId && !isSelectionMode && (
              <button
                onClick={() => setSelectionMode(true)}
                className="tap-active uber-btn-primary"
                style={{ padding: '8px 20px', fontSize: 13, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                <CheckSquare size={14} />
                Select
              </button>
            )}

            {isSelectionMode && (
              <button
                onClick={handleCancelSelection}
                className="tap-active uber-btn-primary"
                style={{ padding: '8px 20px', fontSize: 13, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}
              >
                <X size={14} />
                Cancel
              </button>
            )}

            {/* Sort dropdown - Custom Premium UI */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="glass-panel tap-active"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: '99px',
                  padding: '8px 16px',
                  transition: 'all 0.2s',
                  background: isSortOpen ? 'var(--surface2)' : 'transparent',
                  border: isSortOpen ? '1px solid var(--accent)' : '1px solid transparent',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowUpDown size={13} color={isSortOpen ? 'var(--accent)' : 'var(--text-muted)'} />
                {activeSortLabel}
                <ChevronDown size={14} style={{ transform: isSortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isSortOpen && (
                <div
                  className="premium-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: 160,
                    zIndex: 100,
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className="dropdown-item"
                      onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                      style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        width: '100%', 
                        padding: '10px 16px',
                        color: sortBy === opt.value ? 'var(--accent)' : 'inherit',
                        fontWeight: sortBy === opt.value ? 700 : 500,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
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

            {/* Search */}
            <div
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: '99px',
                padding: '10px 16px',
                flex: '0 0 240px',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--accent)'; e.currentTarget.style.background = 'var(--surface)'; }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search library..."
                aria-label="Search tracks"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  flex: 1,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="responsive-padding" style={{ flex: 1, overflow: 'auto' }}>
        {library.length === 0 ? (
          <EmptyState onAdd={() => setShowDownloadModal(true)} />
        ) : filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'var(--text-muted)',
              gap: 8,
            }}
          >
            <Search size={24} color="var(--text-faint)" />
            <p style={{ fontSize: 14 }}>No tracks match &quot;{search}&quot;</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 14,
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
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#000',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            zIndex: 1000,
            backdropFilter: 'blur(20px)',
          }}
          className="animate-slide-up"
        >
          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14, paddingRight: 12, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            {selectedTrackIds.length} selected
          </div>

          {activeFolderId && isAddingSongs ? (
            <button
              onClick={() => handleBulkMove(activeFolderId)}
              className="tap-active uber-btn-accent"
              style={{ padding: '8px 24px', fontSize: 13 }}
            >
              <Plus size={14} fill="currentColor" />
              Add to {activeFolder?.name}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  selectedTrackIds.forEach(id => {
                    const t = library.find(track => track.id === id);
                    if (t) {
                      const { addToQueue } = useMusicStore.getState();
                      addToQueue(t);
                    }
                  });
                  clearSelection();
                  setSelectionMode(false);
                }}
                className="tap-active"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}
              >
                <ListPlus size={14} />
                Add to queue
              </button>
              
              {activeFolderId && !isAddingSongs && (
                <button
                  onClick={() => handleBulkMove(undefined)}
                  className="tap-active"
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', opacity: 0.8 }}
                >
                  <Trash2 size={14} />
                  Remove from folder
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleCancelSelection}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}
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
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Music2 size={32} color="var(--text-faint)" />
      </div>
      <div>
        <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 6, letterSpacing: '-0.3px' }}>
          Your library is empty
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280 }}>
          Paste a YouTube, SoundCloud, or Bandcamp URL to download music directly to your library.
        </p>
      </div>
      <button
        onClick={onAdd}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 20px',
          background: 'var(--accent)',
          color: '#000',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          marginTop: 4,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <Plus size={16} />
        Add from URL
      </button>
    </div>
  );
}
