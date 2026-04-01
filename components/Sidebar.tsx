'use client';

import { useMusicStore } from '@/store/musicStore';
import {
  Library,
  ListMusic,
  Download,
  Plus,
  Music2,
  Heart,
  Folder as FolderIcon,
  Trash2,
  Search,
  Clock,
  BarChart2,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
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
  const { activeView, setActiveView, library, downloads, favorites, setShowDownloadModal, playlists, addPlaylist, removePlaylist, activePlaylistId, setActivePlaylistId, recentlyPlayed } =
    useMusicStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  const pendingDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'pending'
  ).length;

  return (
    <aside
      className="desktop-only"
      aria-label="Main navigation"
      style={{
        width: 240,
        minWidth: 240,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        height: '100%',
        overflow: 'hidden',
        borderRight: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
          <Image src="/logo.svg" alt="Wavelength Logo" fill style={{ objectFit: 'contain' }} priority />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px', color: 'var(--text)' }}>
            Wavelength
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {library.length} tracks
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px', flex: 1, overflowY: 'auto' }} role="navigation">
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 12px' }}>
          Menu
        </div>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeView === id && (id !== 'library' || !activePlaylistId);
          const badge =
            id === 'downloads' && pendingDownloads > 0
              ? pendingDownloads
              : id === 'favorites' && favorites.length > 0
                ? favorites.length
                : id === 'history' && recentlyPlayed.length > 0
                  ? recentlyPlayed.length
                  : null;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveView(id);
                if (id === 'library') setActivePlaylistId(null);
              }}
              aria-current={active ? 'page' : undefined}
              className="tap-active"
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 4,
                background: active ? 'var(--accent-dim)' : 'transparent',
                border: 'none',
                borderRadius: '10px',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface2)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              } }
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              } }
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'inherit',
                transition: 'all 0.2s ease',
              }}>
                <Icon size={18} />
              </div>
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span style={{
                  background: active ? 'var(--accent)' : 'var(--surface3)',
                  color: active ? '#fff' : 'var(--text-muted)',
                  borderRadius: 99,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Playlists Section */}
      <div style={{ padding: '0 12px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 12px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Playlists
          </div>
          <button
            onClick={() => setIsCreatingPlaylist(true)}
            className="tap-active"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
          >
            <Plus size={14} />
          </button>
        </div>

        {isCreatingPlaylist && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, padding: '0 12px' }}>
            <input
              type="text" autoFocus placeholder="New Playlist..."
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newPlaylistName.trim()) {
                  addPlaylist(newPlaylistName.trim()); setNewPlaylistName(''); setIsCreatingPlaylist(false);
                } else if (e.key === 'Escape') {
                  setNewPlaylistName(''); setIsCreatingPlaylist(false);
                }
              }}
              onBlur={() => {
                if (newPlaylistName.trim()) addPlaylist(newPlaylistName.trim());
                setNewPlaylistName(''); setIsCreatingPlaylist(false);
              }}
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>
        )}

        <div style={{ overflowY: 'auto', maxHeight: '20vh' }}>
          {playlists.map(playlist => {
            const isPlaylistActive = activeView === 'library' && activePlaylistId === playlist.id;
            return (
              <div
                key={playlist.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: isPlaylistActive ? 'var(--accent-dim)' : 'transparent',
                  color: isPlaylistActive ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: 2
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
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => { setActivePlaylistId(playlist.id); setActiveView('library'); }}
                >
                  <FolderIcon size={16} fill={isPlaylistActive ? 'currentColor' : 'none'} opacity={isPlaylistActive ? 1 : 0.7} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: isPlaylistActive ? 700 : 500 }}>{playlist.name}</span>
                </div>
                {isPlaylistActive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removePlaylist(playlist.id); }}
                    className="tap-active"
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, opacity: 0.7 }}
                    title="Delete Playlist"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add button & Footer */}
      <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => setShowDownloadModal(true)}
          aria-label="Add music from URL"
          className="tap-active"
          style={{
            width: '100%', padding: '12px 16px', background: 'var(--brand-gradient)',
            color: '#fff', border: 'none', borderRadius: '14px', fontFamily: 'var(--font-sans)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 8px 24px var(--accent-glow)', marginBottom: 20,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 32px var(--accent-glow)';
            e.currentTarget.style.background = 'var(--brand-gradient-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)';
            e.currentTarget.style.background = 'var(--brand-gradient)';
          }}
        >
          <Plus size={18} strokeWidth={3} /> Add Music
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)', justifyContent: 'center', opacity: 0.6 }}>
          <Music2 size={12} />
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.5px' }}>
            WAVELENGTH v2.5
          </span>
        </div>
      </div>
    </aside>
  );
}
