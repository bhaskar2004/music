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
} from 'lucide-react';

const navItems = [
  { id: 'library' as const, label: 'Library', icon: Library },
  { id: 'favorites' as const, label: 'Favorites', icon: Heart },
  { id: 'queue' as const, label: 'Queue', icon: ListMusic },
  { id: 'downloads' as const, label: 'Downloads', icon: Download },
];

export default function Sidebar() {
  const { activeView, setActiveView, library, downloads, favorites, setShowDownloadModal } =
    useMusicStore();

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
            background: 'var(--text)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Zap size={18} color="var(--bg)" fill="var(--bg)" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px', color: 'var(--text)' }}>
            Wavelength
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {library.length} tracks
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px', flex: 1 }} role="navigation">
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 12px' }}>
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
              onClick={() => setActiveView(id)}
              aria-current={active ? 'page' : undefined}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: 4,
                background: active ? 'var(--surface3)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active ? 'var(--text)' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontWeight: active ? 600 : 500,
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
              <Icon size={18} fill={active ? 'currentColor' : 'none'} opacity={active ? 1 : 0.8} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span
                  style={{
                    background: active ? 'var(--text)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--text)',
                    border: active ? 'none' : '1px solid var(--border)',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
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

      {/* Add button & Footer */}
      <div style={{ padding: '20px' }}>
        <button
          onClick={() => setShowDownloadModal(true)}
          aria-label="Add music from URL"
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--text)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: '12px',
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'transform 0.1s, opacity 0.15s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: 20,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
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
