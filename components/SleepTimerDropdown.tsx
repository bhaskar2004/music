'use client';

import { useState, useEffect, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { Timer, X } from 'lucide-react';

const PRESETS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

export default function SleepTimerDropdown() {
  const { sleepTimer, setSleepTimer, clearSleepTimer, setIsPlaying } = useMusicStore();
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Countdown display
  useEffect(() => {
    if (!sleepTimer.active || !sleepTimer.endTime) return;

    const update = () => {
      const diff = sleepTimer.endTime! - Date.now();
      if (diff <= 0) {
        setIsPlaying(false);
        clearSleepTimer();
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer.active, sleepTimer.endTime, setIsPlaying, clearSleepTimer]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title={sleepTimer.active ? `Sleep timer: ${remaining}` : 'Sleep timer'}
        aria-label="Sleep timer"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: sleepTimer.active ? 'var(--accent)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 4, padding: 6, borderRadius: 6,
          transition: 'color 0.15s', position: 'relative',
        }}
        onMouseEnter={e => e.currentTarget.style.color = sleepTimer.active ? 'var(--accent)' : 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = sleepTimer.active ? 'var(--accent)' : 'var(--text-muted)'}
      >
        <Timer size={15} />
        {sleepTimer.active && (
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
            color: 'var(--accent)', animation: 'pulse-glow 2s infinite',
            background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 99,
          }}>
            {remaining}
          </span>
        )}
      </button>

      {open && (
        <div
          className="premium-dropdown"
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
            minWidth: 180, zIndex: 200,
          }}
        >
          <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Sleep Timer
          </div>

          {sleepTimer.active ? (
            <>
              <div style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Timer size={14} color="var(--accent)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{remaining}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>remaining</span>
              </div>
              <button
                onClick={() => { clearSleepTimer(); setOpen(false); }}
                className="dropdown-item danger"
                style={{ border: 'none', background: 'transparent', width: '100%', padding: 0, cursor: 'pointer' }}
              >
                <div className="dropdown-item danger" style={{ width: '100%' }}>
                  <X size={12} /> Cancel Timer
                </div>
              </button>
            </>
          ) : (
            PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => { setSleepTimer(preset.value); setOpen(false); }}
                className="dropdown-item"
                style={{ border: 'none', background: 'transparent', width: '100%', padding: 0, cursor: 'pointer' }}
              >
                <div className="dropdown-item" style={{ width: '100%' }}>
                  {preset.label}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
