'use client';

import { useMusicStore } from '@/store/musicStore';
import {
  Library, ListMusic, Download, Plus, Music2, Heart,
  Folder as FolderIcon, Trash2, Search, Clock, BarChart2,
  Settings, RefreshCcw, Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const navItems = [
  { id: 'library' as const, label: 'Library', icon: Library },
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'favorites' as const, label: 'Favorites', icon: Heart },
  { id: 'history' as const, label: 'History', icon: Clock },
  { id: 'queue' as const, label: 'Queue', icon: ListMusic },
  { id: 'downloads' as const, label: 'Downloads', icon: Download },
  { id: 'stats' as const, label: 'Stats', icon: BarChart2 },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const {
    activeView, setActiveView, library, downloads, favorites,
    setShowDownloadModal, playlists, addPlaylist, removePlaylist,
    activePlaylistId, setActivePlaylistId, recentlyPlayed,
    setShowPartyModal,
    partyId,
    partyMembers,
  } = useMusicStore();

  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pendingDownloads = downloads.filter(
    d => d.status === 'downloading' || d.status === 'pending'
  ).length;

  if (!mounted) {
    return (
      <aside
        className="desktop-only"
        style={{
          width: 232,
          minWidth: 232,
          background: 'var(--surface)',
          borderRight: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
        }}
      />
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Epilogue:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes sidebarItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes waveAnim {
          0%,100% { transform: scaleY(0.4); }
          50%      { transform: scaleY(1);   }
        }
        .sidebar-nav-item {
          animation: sidebarItemIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
        }
        .sidebar-nav-item:nth-child(1)  { animation-delay: 0.04s; }
        .sidebar-nav-item:nth-child(2)  { animation-delay: 0.08s; }
        .sidebar-nav-item:nth-child(3)  { animation-delay: 0.12s; }
        .sidebar-nav-item:nth-child(4)  { animation-delay: 0.16s; }
        .sidebar-nav-item:nth-child(5)  { animation-delay: 0.20s; }
        .sidebar-nav-item:nth-child(6)  { animation-delay: 0.24s; }
        .sidebar-nav-item:nth-child(7)  { animation-delay: 0.28s; }
        .sidebar-nav-item:nth-child(8)  { animation-delay: 0.32s; }
        .sidebar-wave-bar {
          display: inline-block;
          width: 2px;
          border-radius: 2px;
          background: var(--accent, #22c55e);
          animation: waveAnim 1.1s ease-in-out infinite;
        }
        .sidebar-wave-bar:nth-child(2) { animation-delay: 0.18s; }
        .sidebar-wave-bar:nth-child(3) { animation-delay: 0.36s; }
        .sidebar-wave-bar:nth-child(4) { animation-delay: 0.54s; }
        .sidebar-add-btn:hover { transform: translateY(-1px); }
        .sidebar-add-btn:active { transform: translateY(0) scale(0.98); }
        .playlist-row:hover .playlist-delete { opacity: 1 !important; }
      `}</style>

      <aside
        className="desktop-only"
        aria-label="Main navigation"
        style={{
          width: 232,
          minWidth: 232,
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          borderRight: '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
          fontFamily: 'Epilogue, sans-serif',
        }}
      >
        {/* ── Logo ─────────────────────────────────────── */}
        <div style={{
          padding: '26px 20px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
        }}>
          <div style={{ width: 32, height: 32, position: 'relative', flexShrink: 0 }}>
            <Image src="/logo.svg" alt="Wavelength" fill style={{ objectFit: 'contain' }} priority />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800, fontSize: 15,
              letterSpacing: '-0.3px',
              color: 'var(--text)',
              lineHeight: 1,
            }}>
              Wavelength
            </div>
            <div style={{
              marginTop: 4,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {/* Mini waveform */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 10 }}>
                {[8, 12, 7, 11, 9].map((h, i) => (
                  <span key={i} className="sidebar-wave-bar" style={{ height: h, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, fontWeight: 400,
                color: 'var(--text-faint)',
                letterSpacing: '0.04em',
              }}>
                {library.length} tracks
              </span>
            </div>
          </div>

          <button
            onClick={() => useMusicStore.getState().fetchLibrary()}
            title="Refresh"
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: 6, borderRadius: 6,
              color: 'var(--text-faint)',
              transition: 'color 0.15s, background 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCcw size={12} />
          </button>
        </div>

        {/* ── Nav ──────────────────────────────────────── */}
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }} role="navigation">
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 9.5, fontWeight: 700,
            color: 'var(--text-faint)', textTransform: 'uppercase',
            letterSpacing: '0.14em', padding: '4px 10px 10px',
          }}>
            Browse
          </p>

          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeView === id && (id !== 'library' || !activePlaylistId);
            const badge =
              id === 'downloads' && pendingDownloads > 0 ? pendingDownloads
                : id === 'favorites' && favorites.length > 0 ? favorites.length
                  : id === 'history' && recentlyPlayed.length > 0 ? recentlyPlayed.length
                    : null;

            return (
              <button
                key={id}
                className="sidebar-nav-item tap-active"
                onClick={() => { setActiveView(id); if (id === 'library') setActivePlaylistId(null); }}
                aria-current={active ? 'page' : undefined}
                style={{
                  width: '100%',
                  padding: '9px 10px 9px 12px',
                  marginBottom: 1,
                  background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                  border: 'none',
                  borderRadius: 9,
                  /* Active left accent bar via box-shadow trick */
                  boxShadow: active ? 'inset 3px 0 0 var(--accent)' : 'none',
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  fontFamily: 'Epilogue, sans-serif',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 11,
                  transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                  textAlign: 'left',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--surface2)';
                    e.currentTarget.style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <Icon
                  size={15}
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{
                    color: active ? 'var(--accent)' : 'inherit',
                    flexShrink: 0,
                    transition: 'color 0.18s',
                  }}
                />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{
                    background: active
                      ? 'var(--accent)'
                      : 'color-mix(in srgb, var(--border) 80%, transparent)',
                    color: active ? '#fff' : 'var(--text-muted)',
                    borderRadius: 99,
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '1px 7px',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.03em',
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Playlists ─────────────────────────────────── */}
        <div style={{
          padding: '0 10px 10px',
          borderTop: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
          paddingTop: 12,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 10px 8px',
          }}>
            <p style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 9.5, fontWeight: 700,
              color: 'var(--text-faint)', textTransform: 'uppercase',
              letterSpacing: '0.14em', margin: 0,
            }}>
              Playlists
            </p>
            <button
              onClick={() => setIsCreatingPlaylist(true)}
              title="New playlist"
              style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '4px 5px', borderRadius: 6,
                color: 'var(--text-faint)',
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, transparent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Plus size={13} />
            </button>
          </div>

          {isCreatingPlaylist && (
            <div style={{ padding: '0 2px 8px' }}>
              <input
                type="text" autoFocus placeholder="Playlist name…"
                value={newPlaylistName}
                onChange={e => setNewPlaylistName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newPlaylistName.trim()) {
                    addPlaylist(newPlaylistName.trim());
                    setNewPlaylistName(''); setIsCreatingPlaylist(false);
                  } else if (e.key === 'Escape') {
                    setNewPlaylistName(''); setIsCreatingPlaylist(false);
                  }
                }}
                onBlur={() => {
                  if (newPlaylistName.trim()) addPlaylist(newPlaylistName.trim());
                  setNewPlaylistName(''); setIsCreatingPlaylist(false);
                }}
                style={{
                  width: '100%',
                  background: 'var(--surface2)',
                  border: '1px solid var(--accent)',
                  borderRadius: 8, padding: '7px 10px',
                  color: 'var(--text)', fontSize: 12.5,
                  outline: 'none', fontFamily: 'Epilogue, sans-serif',
                  boxSizing: 'border-box',
                  boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)',
                }}
              />
            </div>
          )}

          <div style={{ overflowY: 'auto', maxHeight: '18vh' }}>
            {playlists.length === 0 && !isCreatingPlaylist && (
              <p style={{
                fontFamily: 'Epilogue, sans-serif',
                fontSize: 12, color: 'var(--text-faint)',
                padding: '4px 10px', margin: 0, fontStyle: 'italic',
              }}>
                No playlists yet
              </p>
            )}
            {playlists.map(playlist => {
              const isPlaylistActive = activeView === 'library' && activePlaylistId === playlist.id;
              return (
                <div
                  key={playlist.id}
                  className="playlist-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px 7px 12px',
                    borderRadius: 8,
                    background: isPlaylistActive
                      ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                      : 'transparent',
                    boxShadow: isPlaylistActive ? 'inset 3px 0 0 var(--accent)' : 'none',
                    color: isPlaylistActive ? 'var(--text)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    marginBottom: 1,
                  }}
                  onMouseEnter={e => {
                    if (!isPlaylistActive) {
                      e.currentTarget.style.background = 'var(--surface2)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isPlaylistActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }
                  }}
                >
                  <div
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}
                    onClick={() => { setActivePlaylistId(playlist.id); setActiveView('library'); }}
                  >
                    <FolderIcon
                      size={13}
                      strokeWidth={isPlaylistActive ? 2.2 : 1.7}
                      fill={isPlaylistActive ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'none'}
                      style={{ flexShrink: 0, color: isPlaylistActive ? 'var(--accent)' : 'inherit' }}
                    />
                    <span style={{
                      fontFamily: 'Epilogue, sans-serif',
                      fontSize: 13, fontWeight: isPlaylistActive ? 600 : 400,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {playlist.name}
                    </span>
                  </div>
                  <button
                    className="playlist-delete"
                    onClick={e => { e.stopPropagation(); removePlaylist(playlist.id); }}
                    title="Delete"
                    style={{
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', padding: 4, borderRadius: 5,
                      color: 'var(--danger)', opacity: 0,
                      transition: 'opacity 0.15s, background 0.15s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 12%, transparent)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────── */}
        <div style={{
          padding: '14px 16px 18px',
          borderTop: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <button
            className="sidebar-add-btn tap-active"
            onClick={() => setShowDownloadModal(true)}
            aria-label="Add music from URL"
            style={{
              width: '100%', padding: '10px 16px',
              background: 'var(--brand-gradient)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'transform 0.18s cubic-bezier(0.4,0,0.2,1), box-shadow 0.18s',
              boxShadow: '0 4px 18px var(--accent-glow)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 8px 28px var(--accent-glow)';
              e.currentTarget.style.background = 'var(--brand-gradient-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 4px 18px var(--accent-glow)';
              e.currentTarget.style.background = 'var(--brand-gradient)';
            }}
          >
            <Plus size={15} strokeWidth={2.8} />
            Add Music
          </button>

          <button
            className="sidebar-add-btn tap-active"
            onClick={() => setShowPartyModal(true)}
            aria-label="Listen Together"
            style={{
              width: '100%', padding: '10px 16px',
              background: partyId
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'var(--surface2)',
              color: partyId ? 'var(--accent)' : 'var(--text)',
              border: partyId
                ? '1px solid color-mix(in srgb, var(--accent) 40%, transparent)'
                : '1px solid color-mix(in srgb, var(--border) 60%, transparent)',
              borderRadius: 10,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: 13,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
              letterSpacing: '0.02em',
              boxShadow: partyId ? '0 0 16px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = partyId
                ? 'color-mix(in srgb, var(--accent) 18%, transparent)'
                : 'var(--surface3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = partyId
                ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                : 'var(--surface2)';
            }}
          >
            <Users size={15} strokeWidth={2.4} color="var(--accent)" />
            {partyId ? (
              <>
                Party Active
                {partyMembers > 0 && (
                  <span style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 7px',
                    fontFamily: 'JetBrains Mono, monospace',
                    marginLeft: 2,
                  }}>
                    {partyMembers}
                  </span>
                )}
              </>
            ) : (
              'Listen Together'
            )}
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Music2 size={10} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9.5, fontWeight: 500,
              color: 'var(--text-faint)', opacity: 0.5,
              letterSpacing: '0.08em',
            }}>
              WAVELENGTH v2.5
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}