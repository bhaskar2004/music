'use client';

import { useMusicStore } from '@/store/musicStore';
import {
  Library,
  ListMusic,
  Download,
  Plus,
  Music2,
  Zap,
  Heart,
  Folder as FolderIcon,
  Trash2,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

const navItems = [
  { id: 'library' as const, label: 'Library', icon: Library },
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'favorites' as const, label: 'Favorites', icon: Heart },
  { id: 'queue' as const, label: 'Queue', icon: ListMusic },
  { id: 'downloads' as const, label: 'Downloads', icon: Download },
];


export default function Sidebar() {
  const { activeView, setActiveView, library, downloads, favorites, setShowDownloadModal, folders, addFolder, removeFolder, activeFolderId, setActiveFolderId } =
    useMusicStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const pendingDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'pending'
  ).length;

  return (
    <aside
      className="desktop-only"
      aria-label="Main navigation"
      style={{
        width: 240, /* Slightly wider for premium feel */
        minWidth: 240,
        background: 'var(--surface)',  /* Use surface for the sidebar */
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        height: '100%',
        overflow: 'hidden',
        borderRight: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '28px 24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <Image
            src="/logo.svg"
            alt="Wavelength Logo"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />
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
      <nav style={{ padding: '12px', flex: 1 }} role="navigation">
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 12px' }}>
          Menu
        </div>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          const badge =
            id === 'downloads' && pendingDownloads > 0
              ? pendingDownloads
              : id === 'favorites' && favorites.length > 0
                ? favorites.length
                : null;
          return (
            <button
              key={id}
              onClick={() => {
                setActiveView(id);
                if (id === 'library') setActiveFolderId(null);
              }}
              aria-current={active && (id !== 'library' || !activeFolderId) ? 'page' : undefined}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 4,
                background: active && (id !== 'library' || !activeFolderId) ? 'var(--brand-gradient)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active && (id !== 'library' || !activeFolderId) ? '#000' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontWeight: active && (id !== 'library' || !activeFolderId) ? 800 : 500,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={18} fill={active && (id !== 'library' || !activeFolderId) ? 'currentColor' : 'none'} opacity={active && (id !== 'library' || !activeFolderId) ? 1 : 0.8} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span
                  style={{
                    background: active && (id !== 'library' || !activeFolderId) ? 'rgba(0,0,0,0.1)' : 'transparent',
                    color: active && (id !== 'library' || !activeFolderId) ? '#000' : 'var(--text)',
                    border: active && (id !== 'library' || !activeFolderId) ? 'none' : '1px solid var(--border)',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 8px',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Folders Section */}
      <div style={{ padding: '0 12px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px' }}>
            Playlists
          </div>
          <button 
            onClick={() => setIsCreatingFolder(true)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <Plus size={14} />
          </button>
        </div>

        {isCreatingFolder && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, padding: '0 12px' }}>
            <input
              type="text"
              autoFocus
              placeholder="New Folder..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  addFolder(newFolderName.trim());
                  setNewFolderName('');
                  setIsCreatingFolder(false);
                } else if (e.key === 'Escape') {
                  setNewFolderName('');
                  setIsCreatingFolder(false);
                }
              }}
              onBlur={() => {
                if (newFolderName.trim()) addFolder(newFolderName.trim());
                setNewFolderName('');
                setIsCreatingFolder(false);
              }}
              style={{
                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', 
                borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none',
                fontFamily: 'var(--font-sans)'
              }}
            />
          </div>
        )}

        <div style={{ overflowY: 'auto', maxHeight: '30vh' }}>
          {folders.map(folder => {
            const isFolderActive = activeView === 'library' && activeFolderId === folder.id;
            return (
              <div 
                key={folder.id}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: isFolderActive ? 'var(--brand-gradient)' : 'transparent', color: isFolderActive ? '#000' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', marginBottom: 2 }}
                onMouseEnter={e => { if (!isFolderActive) e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { if (!isFolderActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <div 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}
                  onClick={() => {
                    setActiveFolderId(folder.id);
                    setActiveView('library');
                  }}
                >
                  <FolderIcon size={16} fill={isFolderActive ? 'currentColor' : 'none'} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: isFolderActive ? 800 : 500 }}>{folder.name}</span>
                </div>
                {isFolderActive && (
                  <button onClick={() => removeFolder(folder.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }} title="Delete Folder">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add button & Footer */}
      <div style={{ padding: '20px', borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)' }}>
        <button
          onClick={() => setShowDownloadModal(true)}
          aria-label="Add music from URL"
          className="tap-active"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--brand-gradient)',
            color: '#000',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'transform 0.1s, opacity 0.15s',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            marginBottom: 20,
          }}
        >
          <Plus size={18} />
          Add from URL
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-faint)',
            justifyContent: 'center',
          }}
        >
          <Music2 size={14} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
            Wavelength v2.0
          </span>
        </div>
      </div>
    </aside>
  );
}
