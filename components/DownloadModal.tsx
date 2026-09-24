'use client';

import { useState, useRef, useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { detectPlatform } from '@/lib/utils';
import { X, Link, Download, DownloadCloud } from 'lucide-react';
import { useDownloadProcessor } from '@/hooks/useDownloadProcessor';

export default function DownloadModal() {
  const { showDownloadModal, setShowDownloadModal, setActiveView, playlists, activePlaylistId } =
    useMusicStore();
  const { processBulkDownload } = useDownloadProcessor();

  const [url, setUrl] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showDownloadModal) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setUrl('');
      setSelectedPlaylistId(activePlaylistId || 'none');
      setIsProcessing(false);
    }
  }, [showDownloadModal, activePlaylistId]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDownloadModal(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [setShowDownloadModal]);

  function handleClose() {
    if (isProcessing) return;
    setShowDownloadModal(false);
  }

  async function handleDownload() {
    if (!url.trim() || isProcessing) return;

    const urls = url
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.startsWith('http'));

    if (urls.length === 0) return;

    setIsProcessing(true);

    try {
      // Use the new bulk processor which is much more efficient
      await processBulkDownload(urls);
      
      setUrl('');
      setShowDownloadModal(false);
      setActiveView('downloads');
    } catch (err) {
      console.error('[DownloadModal] Bulk error:', err);
      // Fallback or error UI could go here
    } finally {
      setIsProcessing(false);
    }
  }

  const platform = url ? detectPlatform(url) : null;
  if (!showDownloadModal) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }} />

      <div
        className="animate-slide-up glass-panel"
        style={{
          position: 'relative', width: '100%', maxWidth: 520, margin: 20,
          borderRadius: 24, padding: 32,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <button onClick={handleClose} disabled={isProcessing}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'var(--surface2)', border: 'none',
            borderRadius: 12, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-faint)', transition: 'all 0.15s',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44,
              background: 'var(--brand-gradient)',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000',
              boxShadow: '0 8px 20px var(--accent-glow)',
            }}>
              <DownloadCloud size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px' }}>Add to Library</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Paste one or more links to start downloading.</div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 16, padding: '16px', marginBottom: 20,
          transition: 'all 0.2s',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Link size={14} color="var(--accent)" />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source Links</span>
          </div>
          <textarea
            ref={inputRef as any}
            value={url}
            disabled={isProcessing}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleDownload(); } }}
            placeholder="https://youtube.com/watch?v=...&#10;https://soundcloud.com/..."
            style={{
              width: '100%', background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13,
              minHeight: 120, resize: 'none', lineHeight: 1.6,
            }}
          />
          {platform && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                {platform} Detected
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!url.trim() || isProcessing}
          className="tap-active"
          style={{
            width: '100%', padding: '16px',
            background: url.trim() && !isProcessing ? 'var(--brand-gradient)' : 'var(--surface3)',
            color: url.trim() && !isProcessing ? '#000' : 'var(--text-faint)',
            border: 'none', borderRadius: 16,
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15,
            cursor: !url.trim() || isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: url.trim() && !isProcessing ? '0 12px 28px var(--accent-glow)' : 'none',
          }}
        >
          {isProcessing ? (
            <div className="spinner" style={{ width: 20, height: 20, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          ) : (
            <>
              <Download size={18} strokeWidth={2.5} />
              Start Bulk Download
            </>
          )}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 11, marginTop: 20, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
          Tasks are processed in the background with a max concurrency of 3.
        </p>
      </div>
    </div>
  );
}
