'use client';

import { useMusicStore } from '@/store/musicStore';
import {
  Library,
  ListMusic,
  Download,
  Plus,
  Music2,
  Zap,
} from 'lucide-react';

const navItems = [
  { id: 'library' as const, label: 'Library', icon: Library },
  { id: 'queue' as const, label: 'Queue', icon: ListMusic },
  { id: 'downloads' as const, label: 'Downloads', icon: Download },
];

export default function Sidebar() {
  const { activeView, setActiveView, library, downloads, setShowDownloadModal } =
    useMusicStore();

  const pendingDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'pending'
  ).length;

  return (
    <aside
      className="desktop-only"
      style={{
        width: 220,
        minWidth: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Zap size={16} color="#000" fill="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
            Wavelength
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {library.length} tracks
          </div>
        </div>
      </div>

      {/* Add button */}
      <div style={{ padding: '16px 14px 8px' }}>
        <button
          onClick={() => setShowDownloadModal(true)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Plus size={15} />
          Add from URL
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeView === id;
          const badge =
            id === 'downloads' && pendingDownloads > 0 ? pendingDownloads : null;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              style={{
                width: '100%',
                padding: '9px 12px',
                marginBottom: 2,
                background: active ? 'var(--accent-dim)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontWeight: active ? 600 : 400,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface2)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span
                  style={{
                    background: 'var(--accent)',
                    color: '#000',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-faint)',
        }}
      >
        <Music2 size={13} />
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          v1.0.0
        </span>
      </div>
    </aside>
  );
}
