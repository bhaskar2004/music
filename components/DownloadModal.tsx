'use client';

import { useState, useRef, useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { detectPlatform } from '@/lib/utils';
import { X, Link, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useDownloadProcessor } from '@/hooks/useDownloadProcessor';

export default function DownloadModal() {
  const { showDownloadModal, setShowDownloadModal, addDownload, updateDownload, addTrack, setActiveView, folders, activeFolderId } =
    useMusicStore();
  const { processDownload } = useDownloadProcessor();

  const [url, setUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus & reset on open
  useEffect(() => {
    if (showDownloadModal) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setUrl('');
      setSelectedFolderId(activeFolderId || 'none');
    }
  }, [showDownloadModal, activeFolderId]);

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDownloadModal(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [setShowDownloadModal]);

  function handleClose() {
    setShowDownloadModal(false);
  }

  async function handleDownload() {
    if (!url.trim()) return;

    const urls = url
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.startsWith('http'));

    if (urls.length === 0) return;

    // Dispatch to background and UX reset
    setUrl('');
    setShowDownloadModal(false);
    setActiveView('downloads');

    const processAll = async () => {
      for (const currentUrl of urls) {
        let urlsToDownload: string[] = [currentUrl];

        try {
          const pRes = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: currentUrl }),
          });
          if (pRes.ok) {
            const data = await pRes.json();
            if (data.urls && data.urls.length > 0) {
              urlsToDownload = data.urls;
            }
          }
        } catch {
          // Fallback to strict single download if playlist parser fails
        }

        for (const videoUrl of urlsToDownload) {
          const folderIdStr = selectedFolderId !== 'none' ? selectedFolderId : undefined;
          await processDownload(videoUrl, folderIdStr);
        }
      }
    };

    processAll();
  }

  const platform = url ? detectPlatform(url) : null;

  if (!showDownloadModal) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }} />

      {/* Panel */}
      <div
        className="animate-slide-up glass-panel"
        style={{
          position: 'relative', width: '100%', maxWidth: 520, margin: 20,
          borderRadius: 'var(--radius-lg)', padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Close */}
        <button onClick={handleClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'var(--surface)', border: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--brand-gradient)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000',
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            }}>
              <Download size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.4px' }}>Add from URL</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>YouTube, SoundCloud, Bandcamp & more</div>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16,
          transition: 'all 0.2s',
        }}>
          <Link size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <textarea
            ref={inputRef as any}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDownload(); } }}
            placeholder="Paste one or more URLs (one per line or separated by commas)..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12,
              minHeight: 60, resize: 'none', padding: '4px 0',
            }}
          />
          {platform && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--accent)',
              background: 'var(--accent-dim)', padding: '2px 8px',
              borderRadius: 4, fontFamily: 'var(--font-mono)', flexShrink: 0,
            }}>{platform}</span>
          )}
        </div>

        {/* Playlist Selection */}
        {folders.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
              Target Playlist
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedFolderId}
                onChange={e => setSelectedFolderId(e.target.value)}
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '12px 14px', color: 'var(--text)',
                  fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)', cursor: 'pointer',
                  appearance: 'none', fontWeight: 600,
                }}
              >
                <option value="none">No Playlist (Default)</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-faint)', fontSize: 10 }}>▼</div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleDownload}
          disabled={!url.trim()}
          className="tap-active"
          style={{
            width: '100%', padding: '14px',
            background: url.trim() ? 'var(--brand-gradient)' : 'var(--surface3)',
            color: url.trim() ? '#000' : 'var(--text-faint)',
            border: 'none', borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 14,
            cursor: !url.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: url.trim() ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          <Download size={16} />
          Start Download
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 11, marginTop: 14, fontFamily: 'var(--font-mono)' }}>
          Downloads automatically queue and run in parallel
        </p>
      </div>
    </div>
  );
}
