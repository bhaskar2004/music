'use client';

import { useMusicStore } from '@/store/musicStore';
import { useEffect } from 'react';
import { Sun, Moon, Monitor, Sliders, Volume2, HardDrive, Info, Keyboard, Music2 } from 'lucide-react';

const THEME_OPTIONS: { value: 'system' | 'dark' | 'light'; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const SHORTCUTS = [
  { keys: 'Space', action: 'Play / Pause' },
  { keys: 'Ctrl + →', action: 'Next Track' },
  { keys: 'Ctrl + ←', action: 'Previous Track' },
  { keys: 'Ctrl + ↑', action: 'Volume Up' },
  { keys: 'Ctrl + ↓', action: 'Volume Down' },
];

export default function SettingsView() {
  const { theme, setTheme, crossfadeDuration, setCrossfadeDuration, volume, library } = useMusicStore();

  const totalSize = library.reduce((sum, t) => sum + (t.fileSize || 0), 0);
  const totalDuration = library.reduce((sum, t) => sum + (t.duration || 0), 0);

  // Apply theme to html
  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (theme !== 'system') {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
      <h1 className="brand-text font-display" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 4 }}>
        Settings
      </h1>
      <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
        Customize your Wavelength experience.
      </p>

      {/* Appearance */}
      <SettingsSection icon={Sun} title="Appearance">
        <SettingsLabel>Theme</SettingsLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {THEME_OPTIONS.map(opt => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className="tap-active"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12,
                  background: active ? 'var(--brand-gradient)' : 'var(--surface2)',
                  color: active ? '#000' : 'var(--text)',
                  border: active ? 'none' : '1px solid var(--border)',
                  fontWeight: active ? 800 : 500, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <opt.icon size={16} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* Playback */}
      <SettingsSection icon={Sliders} title="Playback">
        <SettingsLabel>Crossfade Duration</SettingsLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <input
            type="range"
            min={0}
            max={12}
            step={1}
            value={crossfadeDuration}
            onChange={e => setCrossfadeDuration(parseInt(e.target.value))}
            style={{ flex: 1, maxWidth: 300, accentColor: 'var(--accent)' }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
            color: crossfadeDuration > 0 ? 'var(--accent)' : 'var(--text-muted)',
            minWidth: 40,
          }}>
            {crossfadeDuration === 0 ? 'Off' : `${crossfadeDuration}s`}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', maxWidth: 400 }}>
          Smoothly blend between tracks when one ends. Set to 0 to disable.
        </p>

        <div style={{ marginTop: 20 }}>
          <SettingsLabel>Volume</SettingsLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Volume2 size={16} color="var(--text-muted)" />
            <div style={{
              width: 200, height: 6, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{ height: '100%', width: `${volume * 100}%`, background: 'var(--brand-gradient)', borderRadius: 99 }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* Storage */}
      <SettingsSection icon={HardDrive} title="Storage">
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <StorageStat label="Total Tracks" value={`${library.length}`} />
          <StorageStat
            label="Storage Used"
            value={totalSize > 1024 * 1024 * 1024
              ? `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`
              : `${(totalSize / (1024 * 1024)).toFixed(0)} MB`}
          />
          <StorageStat
            label="Total Duration"
            value={`${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`}
          />
        </div>
      </SettingsSection>

      {/* Keyboard Shortcuts */}
      <SettingsSection icon={Keyboard} title="Keyboard Shortcuts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SHORTCUTS.map(s => (
            <div key={s.keys} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.action}</span>
              <kbd style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 10px', fontSize: 12,
                fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)',
              }}>
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* About */}
      <SettingsSection icon={Info} title="About">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'var(--brand-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Music2 size={20} color="#000" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-display)' }}>Wavelength</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v2.5 — Web Edition</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.6, maxWidth: 400 }}>
          A premium music library and player. Download music from YouTube, SoundCloud, and more. Built with Next.js and ❤️.
        </p>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, children }: {
  icon: typeof Sun; title: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      marginBottom: 32, padding: 24, background: 'var(--surface)',
      borderRadius: 16, border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Icon size={18} color="var(--accent)" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)' }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function SettingsLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10, fontFamily: 'var(--font-sans)' }}>
      {children}
    </div>
  );
}

function StorageStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
        {value}
      </div>
    </div>
  );
}
