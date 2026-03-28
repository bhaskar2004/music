'use client';

import { useState, useRef, useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { detectPlatform } from '@/lib/utils';
import {
  X, Link, Download, AlertCircle, CheckCircle2,
  Loader2, Zap, Music2, Cpu,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type Stage = 'idle' | 'metadata' | 'downloading' | 'processing' | 'done' | 'error';

interface ProgressState {
  stage: Stage;
  message: string;
  percent: number;
  totalSize: string;
  currentSpeed: string;
  eta: string;
  title?: string;
  artist?: string;
  error?: string;
}

const STAGE_ICONS: Record<Stage, React.ReactNode> = {
  idle:        <Download size={15} />,
  metadata:    <Zap size={15} style={{ animation: 'spin 1s linear infinite' }} />,
  downloading: <Download size={15} />,
  processing:  <Cpu size={15} style={{ animation: 'spin 1s linear infinite' }} />,
  done:        <CheckCircle2 size={15} />,
  error:       <AlertCircle size={15} />,
};

const STAGE_LABELS: Record<Stage, string> = {
  idle:        'Download & Add to Library',
  metadata:    'Fetching info…',
  downloading: 'Downloading…',
  processing:  'Converting to MP3…',
  done:        'Added to Library!',
  error:       'Download Failed',
};

export default function DownloadModal() {
  const { showDownloadModal, setShowDownloadModal, addDownload, updateDownload, addTrack, setActiveView } =
    useMusicStore();

  const [url, setUrl]       = useState('');
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle', message: '', percent: 0,
    totalSize: '', currentSpeed: '', eta: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const esRef    = useRef<EventSource | null>(null);
  const jobIdRef = useRef<string>('');

  const isActive = ['metadata', 'downloading', 'processing'].includes(progress.stage);

  // Focus & reset on open
  useEffect(() => {
    if (showDownloadModal) {
      setTimeout(() => inputRef.current?.focus(), 80);
      reset();
    } else {
      esRef.current?.close();
    }
  }, [showDownloadModal]);

  // Escape to close
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isActive) setShowDownloadModal(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isActive, setShowDownloadModal]);

  function reset() {
    setUrl('');
    setProgress({ stage: 'idle', message: '', percent: 0, totalSize: '', currentSpeed: '', eta: '' });
    esRef.current?.close();
    esRef.current = null;
  }

  function handleClose() {
    if (isActive) return; // don't close mid-download
    setShowDownloadModal(false);
  }

  async function handleDownload() {
    if (!url.trim() || isActive) return;

    const jobId = uuidv4();
    jobIdRef.current = jobId;
    addDownload({ id: jobId, url, status: 'pending', progress: 0 });

    // POST to the SSE endpoint — fetch, then parse the response as an event stream
    setProgress(p => ({ ...p, stage: 'metadata', message: 'Fetching track info…', percent: 0 }));

    let res: Response;
    try {
      res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setProgress(p => ({ ...p, stage: 'error', error: msg }));
      updateDownload(jobId, { status: 'error', error: msg });
      return;
    }

    if (!res.body) {
      setProgress(p => ({ ...p, stage: 'error', error: 'No response body' }));
      return;
    }

    // Parse the SSE stream manually from the fetch ReadableStream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    updateDownload(jobId, { status: 'downloading', progress: 0 });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double newlines
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? ''; // keep incomplete frame

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventName = 'message';
          let dataLine  = '';

          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: '))  dataLine  = line.slice(6).trim();
          }

          if (!dataLine) continue;
          let payload: Record<string, unknown>;
          try { payload = JSON.parse(dataLine); }
          catch { continue; }

          switch (eventName) {
            case 'status':
              setProgress(p => ({
                ...p,
                stage: (payload.stage as Stage) ?? p.stage,
                message: (payload.message as string) ?? p.message,
              }));
              if (payload.stage === 'downloading') {
                updateDownload(jobId, { status: 'downloading' });
              }
              break;

            case 'metadata':
              setProgress(p => ({
                ...p,
                title: payload.title as string,
                artist: payload.artist as string,
              }));
              break;

            case 'progress': {
              const pct = payload.percent as number;
              setProgress(p => ({
                ...p,
                percent: pct,
                totalSize:    (payload.totalSize as string)    ?? p.totalSize,
                currentSpeed: (payload.currentSpeed as string) ?? p.currentSpeed,
                eta:          (payload.eta as string)          ?? p.eta,
              }));
              updateDownload(jobId, { progress: pct });
              break;
            }

            case 'done': {
              const track = payload.track as Parameters<typeof addTrack>[0];
              addTrack(track);
              updateDownload(jobId, { status: 'done', progress: 100, track });
              setProgress(p => ({
                ...p,
                stage: 'done',
                percent: 100,
                title: track.title,
                artist: track.artist,
              }));
              setTimeout(() => {
                setShowDownloadModal(false);
                reset();
              }, 2000);
              break;
            }

            case 'error': {
              const msg = payload.message as string ?? 'Unknown error';
              setProgress(p => ({ ...p, stage: 'error', error: msg }));
              updateDownload(jobId, { status: 'error', error: msg });
              break;
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stream read error';
      setProgress(p => ({ ...p, stage: 'error', error: msg }));
      updateDownload(jobId, { status: 'error', error: msg });
    }
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
        className="animate-slide-up"
        style={{
          position: 'relative', width: '100%', maxWidth: 520, margin: 20,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
        }}
      >
        {/* Close */}
        {!isActive && (
          <button onClick={handleClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <X size={14} />
          </button>
        )}

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36,
              background: progress.stage === 'done' ? 'rgba(6,193,103,0.12)' : 'var(--surface)',
              border: `1px solid ${progress.stage === 'done' ? 'rgba(6,193,103,0.25)' : 'var(--border)'}`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: progress.stage === 'done' ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all 0.3s',
            }}>
              <Download size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Add from URL</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>YouTube, SoundCloud, Bandcamp & 1000+ sites</div>
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--surface)',
          border: `1px solid ${progress.stage === 'error' ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16,
          opacity: isActive ? 0.6 : 1, transition: 'all 0.2s',
        }}>
          <Link size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={url}
            onChange={e => { setUrl(e.target.value); if (progress.stage === 'error') setProgress(p => ({ ...p, stage: 'idle', error: '' })); }}
            onKeyDown={e => e.key === 'Enter' && !isActive && handleDownload()}
            placeholder="https://youtube.com/watch?v=..."
            disabled={isActive}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12,
            }}
          />
          {platform && !isActive && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--accent)',
              background: 'var(--accent-dim)', padding: '2px 8px',
              borderRadius: 4, fontFamily: 'var(--font-mono)', flexShrink: 0,
            }}>{platform}</span>
          )}
        </div>

        {/* ── Progress section — only shown when active / done / error ── */}
        {progress.stage !== 'idle' && (
          <div
            className="animate-fade-in"
            style={{
              background: 'var(--surface)',
              border: `1px solid ${
                progress.stage === 'error' ? 'rgba(229,62,62,0.3)'
                : progress.stage === 'done'  ? 'rgba(6,193,103,0.3)'
                : 'var(--border)'
              }`,
              borderRadius: 'var(--radius)',
              padding: 16,
              marginBottom: 16,
            }}
          >
            {/* Stage + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                color: progress.stage === 'error' ? 'var(--danger)'
                  : progress.stage === 'done' ? 'var(--accent)'
                  : 'var(--text-muted)',
              }}>
                {isActive
                  ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : progress.stage === 'done'
                    ? <CheckCircle2 size={14} />
                    : <AlertCircle size={14} />
                }
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {progress.title ?? progress.message}
                </div>
                {progress.title && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{progress.artist}</div>
                )}
              </div>
              {progress.stage === 'downloading' && progress.percent > 0 && (
                <span style={{
                  fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: 'var(--accent)',
                }}>
                  {progress.percent}%
                </span>
              )}
            </div>

            {/* Progress bar */}
            {(isActive || progress.stage === 'done') && (
              <div style={{ marginBottom: progress.currentSpeed ? 10 : 0 }}>
                <div style={{
                  height: 5, background: 'var(--surface2)',
                  borderRadius: 99, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: progress.stage === 'processing' ? '100%'
                      : progress.stage === 'metadata' ? '5%'
                      : progress.stage === 'done' ? '100%'
                      : `${progress.percent}%`,
                    background: 'var(--accent)',
                    borderRadius: 99,
                    transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                    ...(progress.stage === 'processing' ? {
                      backgroundImage: 'linear-gradient(90deg, var(--accent) 0%, rgba(6,193,103,0.5) 50%, var(--accent) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.2s infinite',
                    } : {}),
                  }} />
                </div>
              </div>
            )}

            {/* Speed / ETA / size row */}
            {progress.stage === 'downloading' && (progress.currentSpeed || progress.eta || progress.totalSize) && (
              <div style={{
                display: 'flex', gap: 16,
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
                flexWrap: 'wrap',
              }}>
                {progress.currentSpeed && (
                  <span>⚡ {progress.currentSpeed}</span>
                )}
                {progress.totalSize && progress.totalSize !== 'N/A' && (
                  <span>📦 {progress.totalSize}</span>
                )}
                {progress.eta && progress.eta !== 'N/A' && (
                  <span>⏱ ETA {progress.eta}</span>
                )}
              </div>
            )}

            {/* Error */}
            {progress.stage === 'error' && progress.error && (
              <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{progress.error}</p>
            )}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={progress.stage === 'error' ? reset : handleDownload}
          disabled={isActive || (!url.trim() && progress.stage !== 'error')}
          style={{
            width: '100%', padding: '13px',
            background: progress.stage === 'done' ? 'var(--accent)'
              : progress.stage === 'error' ? 'var(--surface)'
              : isActive ? 'var(--surface2)'
              : url.trim() ? 'var(--text)' : 'var(--surface2)',
            color: progress.stage === 'done' ? '#fff'
              : isActive ? 'var(--text-muted)'
              : url.trim() ? 'var(--bg)' : 'var(--text-muted)',
            border: progress.stage === 'error' ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14,
            cursor: isActive ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          {isActive
            ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />{STAGE_LABELS[progress.stage]}</>
            : progress.stage === 'done'
              ? <><CheckCircle2 size={15} />{STAGE_LABELS.done}</>
              : progress.stage === 'error'
                ? 'Try Again'
                : <><Download size={15} />{STAGE_LABELS.idle}</>
          }
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 11, marginTop: 14, fontFamily: 'var(--font-mono)' }}>
          powered by yt-dlp · stored locally · audio/mp3
        </p>
      </div>
    </div>
  );
}
