'use client';

import { useMusicStore } from '@/store/musicStore';
import TrackCard from './TrackCard';
import {
  Plus, Search, Music2, ArrowUpDown, Play, Shuffle,
  X, ListPlus, Trash2, ChevronDown, RefreshCcw,
} from 'lucide-react';
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
    case 'title': return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'artist': return sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    case 'duration': return sorted.sort((a, b) => b.duration - a.duration);
    default: return sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }
}

export default function LibraryView() {
  const {
    library, setShowDownloadModal, playlists,
    playAll, shufflePlay, activePlaylistId,
    isSelectionMode, setSelectionMode, selectedTrackIds, clearSelection, moveSelectedToPlaylist,
  } = useMusicStore();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [isAddingSongs, setIsAddingSongs] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label;
  const activePlaylist = activePlaylistId ? playlists.find(p => p.id === activePlaylistId) : null;

  const filtered = useMemo(() => {
    const searched = library.filter(t => {
      if (activePlaylistId) {
        const isInPlaylist = t.playlistIds?.includes(activePlaylistId);
        if (isAddingSongs ? isInPlaylist : !isInPlaylist) return false;
      }
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q);
    });
    return sortTracks(searched, sortBy);
  }, [library, search, sortBy, activePlaylistId, isAddingSongs]);

  const handleStartAdding = () => { setIsAddingSongs(true); setSelectionMode(true); };
  const handleCancelSelection = () => { setIsAddingSongs(false); setSelectionMode(false); clearSelection(); };
  const handleBulkMove = (id: string) => { moveSelectedToPlaylist(selectedTrackIds, id); setIsAddingSongs(false); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Epilogue:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes libHeaderIn {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes libGridIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bulkBarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes emptyIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .lib-header  { animation: libHeaderIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .lib-grid    { animation: libGridIn   0.45s 0.06s cubic-bezier(0.16,1,0.3,1) both; }
        .bulk-bar    { animation: bulkBarIn   0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .lib-empty   { animation: emptyIn     0.5s cubic-bezier(0.16,1,0.3,1) both; }

        .lib-sort-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          min-width: 192px; z-index: 200;
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
          border-radius: 12px;
          padding: 6px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .lib-sort-item {
          width: 100%; padding: 9px 12px;
          background: transparent; border: none; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center; justify-content: space-between;
          font-family: Epilogue, sans-serif; font-size: 13px; font-weight: 400;
          color: var(--text-muted); text-align: left;
          transition: background 0.15s, color 0.15s;
        }
        .lib-sort-item:hover { background: var(--surface2); color: var(--text); }
        .lib-sort-item.active { color: var(--accent); font-weight: 600; }

        .lib-action-btn {
          display: flex; align-items: center; gap: 8px;
          border: none; border-radius: 99px; cursor: pointer;
          font-family: Syne, sans-serif; font-size: 13px; font-weight: 700;
          padding: 10px 22px; transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
          letter-spacing: 0.01em;
        }
        .lib-action-btn:hover { transform: translateY(-1px); }
        .lib-action-btn:active { transform: translateY(0) scale(0.97); }

        .lib-search-wrap {
          display: flex; align-items: center; gap: 10;
          border-radius: 10px; padding: 8px 14px;
          background: var(--surface);
          border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
          transition: border-color 0.18s, background 0.18s;
          flex: 0 1 260px;
        }
        .lib-search-wrap.focused {
          border-color: color-mix(in srgb, var(--accent) 50%, transparent);
          background: var(--surface2);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent);
        }
      `}</style>

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Epilogue, sans-serif' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="lib-header responsive-padding"
          style={{
            paddingTop: 44, paddingBottom: 20,
            flexShrink: 0,
            borderBottom: '1px solid color-mix(in srgb, var(--border) 30%, transparent)',
          }}
        >
          {/* Top row: title + actions */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              {/* Eyebrow */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: 10,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent)',
                }} />
                <span style={{
                  fontFamily: 'Syne, sans-serif',
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '0.14em',
                }}>
                  {activePlaylist ? 'Playlist' : 'Your Collection'}
                </span>
              </div>

              <h1 style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800, fontSize: 42,
                letterSpacing: '-1.5px', lineHeight: 1,
                color: 'var(--text)', margin: 0,
              }}>
                {activePlaylist ? activePlaylist.name : 'Library'}
              </h1>

              {/* Meta row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginTop: 10,
                color: 'var(--text-faint)',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, fontWeight: 400, letterSpacing: '0.04em',
              }}>
                <span>{filtered.length} {filtered.length === 1 ? 'track' : 'tracks'}</span>
                <span style={{ opacity: 0.3 }}>／</span>
                <span>{activeSortLabel}</span>
                <span style={{ opacity: 0.3 }}>／</span>
                <button
                  onClick={() => useMusicStore.getState().fetchLibrary()}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '2px 0', transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <RefreshCcw size={10} />
                  sync
                </button>
              </div>
            </div>

            {/* Action buttons */}
            {library.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingBottom: 4 }}>
                <button
                  onClick={() => playAll(filtered)}
                  className="lib-action-btn tap-active"
                  style={{
                    background: 'var(--accent)', color: '#000',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px var(--accent-glow)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px var(--accent-glow)'}
                >
                  <Play size={14} fill="currentColor" />
                  Play all
                </button>

                <button
                  onClick={() => shufflePlay(filtered)}
                  className="lib-action-btn tap-active"
                  style={{
                    background: 'var(--surface2)',
                    color: 'var(--text)',
                    border: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
                  }}
                >
                  <Shuffle size={14} />
                  Shuffle
                </button>

                {activePlaylistId && !isAddingSongs && (
                  <button
                    onClick={handleStartAdding}
                    className="lib-action-btn tap-active"
                    style={{
                      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      color: 'var(--accent)',
                      border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                    }}
                  >
                    <Plus size={14} />
                    Add songs
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toolbar row */}
          {library.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Search */}
              <div className={`lib-search-wrap${searchFocused ? ' focused' : ''}`}>
                <Search size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks, artists, albums…"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: 13,
                    fontFamily: 'Epilogue, sans-serif', flex: 1,
                    fontWeight: 400,
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'var(--text-faint)', padding: 0, display: 'flex',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div style={{ flex: 1 }} />

              {/* Sort */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: isSortOpen ? 'var(--surface2)' : 'transparent',
                    border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
                    borderRadius: 8, padding: '7px 12px',
                    color: 'var(--text-muted)', fontSize: 12,
                    fontFamily: 'Epilogue, sans-serif', fontWeight: 400,
                    cursor: 'pointer', transition: 'all 0.15s',
                    letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => { if (!isSortOpen) e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { if (!isSortOpen) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <ArrowUpDown size={12} />
                  {activeSortLabel}
                  <ChevronDown
                    size={11}
                    style={{
                      transform: isSortOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>

                {isSortOpen && (
                  <div className="lib-sort-dropdown">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`lib-sort-item${sortBy === opt.value ? ' active' : ''}`}
                        onClick={() => { setSortBy(opt.value); setIsSortOpen(false); }}
                      >
                        {opt.label}
                        {sortBy === opt.value && (
                          <div style={{
                            width: 5, height: 5, borderRadius: '50%',
                            background: 'var(--accent)',
                          }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div
          className="responsive-padding"
          style={{ flex: 1, overflow: 'auto', paddingTop: 28, paddingBottom: 120 }}
        >
          {library.length === 0 ? (
            <EmptyState onAdd={() => setShowDownloadModal(true)} />
          ) : filtered.length === 0 ? (
            <NoResults query={search} onClear={() => setSearch('')} />
          ) : (
            <div
              className="lib-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))',
                gap: 18,
              }}
            >
              {filtered.map((track, i) => (
                <TrackCard key={track.id} track={track} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Bulk Action Bar ──────────────────────────────────── */}
        {selectedTrackIds.length > 0 && (
          <div
            className="bulk-bar"
            style={{
              position: 'absolute',
              bottom: 116,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              borderRadius: 20,
              padding: '10px 10px 10px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 0 0 1px var(--border)',
              zIndex: 1000,
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 12, fontWeight: 500, color: 'var(--text)',
              paddingRight: 14,
              borderRight: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
              marginRight: 4,
            }}>
              {selectedTrackIds.length} selected
            </span>

            {activePlaylistId && isAddingSongs ? (
              <BulkBtn
                onClick={() => handleBulkMove(activePlaylistId)}
                variant="accent"
                icon={<Plus size={13} />}
                label="Add to playlist"
              />
            ) : (
              <>
                <BulkBtn
                  onClick={() => {
                    selectedTrackIds.forEach(id => {
                      const t = library.find(track => track.id === id);
                      if (t) useMusicStore.getState().addToQueue(t);
                    });
                    clearSelection(); setSelectionMode(false);
                  }}
                  variant="ghost"
                  icon={<ListPlus size={13} />}
                  label="Queue"
                />
                {activePlaylistId && !isAddingSongs && (
                  <BulkBtn
                    onClick={() => {
                      selectedTrackIds.forEach(trackId =>
                        useMusicStore.getState().toggleTrackInPlaylist(trackId, activePlaylistId)
                      );
                      clearSelection(); setSelectionMode(false);
                    }}
                    variant="danger"
                    icon={<Trash2 size={13} />}
                    label="Remove"
                  />
                )}
              </>
            )}

            <button
              onClick={handleCancelSelection}
              style={{
                background: 'var(--surface2)', border: 'none',
                color: 'var(--text-faint)', cursor: 'pointer',
                padding: 8, borderRadius: 99, display: 'flex',
                marginLeft: 4, transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text-faint)'; }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function BulkBtn({ onClick, variant, icon, label }: {
  onClick: () => void;
  variant: 'accent' | 'ghost' | 'danger';
  icon: React.ReactNode;
  label: string;
}) {
  const colors: Record<string, { bg: string; color: string; hoverBg: string }> = {
    accent: { bg: 'var(--accent)', color: '#000', hoverBg: 'color-mix(in srgb, var(--accent) 85%, #fff)' },
    ghost: { bg: 'var(--surface2)', color: 'var(--text)', hoverBg: 'var(--surface3)' },
    danger: { bg: 'transparent', color: 'var(--danger)', hoverBg: 'color-mix(in srgb, var(--danger) 12%, transparent)' },
  };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 10, border: 'none',
        background: c.bg, color: c.color,
        fontFamily: 'Epilogue, sans-serif', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.02em',
      }}
      onMouseEnter={e => e.currentTarget.style.background = c.hoverBg}
      onMouseLeave={e => e.currentTarget.style.background = c.bg}
    >
      {icon}
      {label}
    </button>
  );
}

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 280, gap: 14, textAlign: 'center',
    }}>
      <Search size={32} style={{ color: 'var(--text-faint)', opacity: 0.3 }} />
      <div>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18,
          color: 'var(--text)', margin: '0 0 6px',
        }}>
          No results
        </p>
        <p style={{
          fontFamily: 'Epilogue, sans-serif', fontSize: 13,
          color: 'var(--text-faint)', margin: 0,
        }}>
          Nothing matched &ldquo;{query}&rdquo;
        </p>
      </div>
      <button
        onClick={onClear}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'Epilogue, sans-serif', fontSize: 13, fontWeight: 600,
          color: 'var(--accent)', padding: '4px 12px', borderRadius: 99,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        Clear search
      </button>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="lib-empty"
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '60vh', gap: 28, textAlign: 'center',
      }}
    >
      {/* Decorative rings */}
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            inset: `${-i * 14}px`,
            borderRadius: '50%',
            border: `1px solid color-mix(in srgb, var(--accent) ${18 - i * 6}%, transparent)`,
            pointerEvents: 'none',
          }} />
        ))}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--accent) 8%, var(--surface))',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Music2 size={40} style={{ color: 'var(--accent)', opacity: 0.8 }} strokeWidth={1.5} />
        </div>
      </div>

      <div style={{ maxWidth: 340 }}>
        <h2 style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800, fontSize: 28,
          letterSpacing: '-0.8px', color: 'var(--text)',
          marginBottom: 10, lineHeight: 1.1,
        }}>
          Your library is empty
        </h2>
        <p style={{
          fontFamily: 'Epilogue, sans-serif',
          color: 'var(--text-faint)', fontSize: 14,
          lineHeight: 1.65, fontWeight: 400, margin: 0,
        }}>
          Drop a link and build your private collection. No streams, no algorithms — just your music.
        </p>
      </div>

      <button
        onClick={onAdd}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '13px 32px',
          background: 'var(--brand-gradient)', color: '#000',
          border: 'none', borderRadius: 99,
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14,
          cursor: 'pointer', letterSpacing: '0.01em',
          boxShadow: '0 8px 28px var(--accent-glow)',
          transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px var(--accent-glow)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px var(--accent-glow)'; }}
      >
        <Plus size={16} strokeWidth={2.8} />
        Start your library
      </button>
    </div>
  );
}