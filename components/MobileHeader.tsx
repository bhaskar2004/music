'use client';

import Image from 'next/image';
import { useMusicStore } from '@/store/musicStore';

export default function MobileHeader() {
  const { library } = useMusicStore();
  
  return (
    <header 
      className="mobile-only"
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--bg)',
        borderBottom: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ width: 32, height: 32, position: 'relative' }}>
        <Image
          src="/logo.svg"
          alt="Wavelength Logo"
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div>
        <div className="brand-text" style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>
          Wavelength
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
          {library.length} tracks
        </div>
      </div>
    </header>
  );
}
