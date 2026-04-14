'use client';

import { useMusicStore } from '@/store/musicStore';
import { Library, ListMusic, Download, Heart, Search } from 'lucide-react';

export default function MobileNav() {
  const { activeView, setActiveView } = useMusicStore();

  const navItems = [
    { id: 'library' as const, label: 'Library', icon: Library },
    { id: 'search' as const, label: 'Search', icon: Search },
    { id: 'favorites' as const, label: 'Favorites', icon: Heart },
    { id: 'queue' as const, label: 'Queue', icon: ListMusic },
    { id: 'downloads' as const, label: 'Downloads', icon: Download },
  ];

  return (
    <nav
      className="mobile-only"
      role="navigation"
      aria-label="Mobile navigation"
      style={{
        position: 'fixed',
        bottom: 0, /* We will push this up via NowPlayingBar bottom padding, or NowPlayingBar will just sit above it */
        left: 0,
        right: 0,
        height: 80, /* Increased for touch target and safe area */
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)', /* iOS safe area */
        zIndex: 100,
      }}
    >
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = activeView === id;
        return (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: active ? 'var(--text)' : 'var(--text-faint)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              height: '100%',
              minWidth: 64,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 32,
              borderRadius: 16,
              color: active ? 'var(--accent)' : 'var(--text-faint)',
              transition: 'all 0.2s',
            }}>
              <Icon size={20} fill={active ? 'currentColor' : 'none'} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span style={{ 
              marginTop: 2,
              fontFamily: 'var(--font-sans)',
              opacity: active ? 1 : 0.8,
              transform: active ? 'translateY(0)' : 'translateY(2px)',
              transition: 'all 0.2s'
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
// Force rebuild
