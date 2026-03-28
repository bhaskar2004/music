'use client';

import { useMusicStore } from '@/store/musicStore';
import { Library, ListMusic, Download } from 'lucide-react';

export default function MobileNav() {
  const { activeView, setActiveView } = useMusicStore();

  const navItems = [
    { id: 'library' as const, label: 'Library', icon: Library },
    { id: 'queue' as const, label: 'Queue', icon: ListMusic },
    { id: 'downloads' as const, label: 'Downloads', icon: Download },
  ];

  return (
    <nav
      className="mobile-only"
      style={{
        height: 64,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 10px',
        zIndex: 100,
      }}
    >
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              padding: '8px 12px',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
