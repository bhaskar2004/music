'use client';

import { useMusicStore } from '@/store/musicStore';
import { DownloadJob } from '@/types';
import { CheckCircle2, AlertCircle, Loader2, X, Download, Music2, RotateCcw } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';
import { useDownloadProcessor } from '@/hooks/useDownloadProcessor';
import Image from 'next/image';

const STATUS_CONFIG = {
  pending:     { label: 'Queued',      color: 'var(--text-muted)' },
  downloading: { label: 'Downloading', color: 'var(--accent)' },
  processing:  { label: 'Converting',  color: 'var(--neon-blue)' },
  done:        { label: 'Complete',    color: 'var(--accent)' },
  error:       { label: 'Failed',      color: 'var(--danger)' },
};

const PLACEHOLDER_COLORS = ['#dbeafe','#dcfce7','#fef9c3','#fce7f3','#ede9fe'];

export default function DownloadsView() {
  const { downloads, removeDownload, setShowDownloadModal } = useMusicStore();
  const { processDownload } = useDownloadProcessor();
  const active = downloads.filter(d => d.status === 'downloading' || d.status === 'pending' || d.status === 'processing');
  const done   = downloads.filter(d => d.status === 'done' || d.status === 'error');

  return (
    <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="brand-text" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 4 }}>Downloads</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            {active.length > 0 ? `${active.length} active · ` : ''}{downloads.length} total
          </p>
        </div>
        <button
          onClick={() => setShowDownloadModal(true)}
          className="tap-active"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            background: 'var(--brand-gradient)', color: '#000',
            border: 'none', borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          }}
        >
          <Download size={14} />
          New Download
        </button>
      </div>

      {downloads.length === 0 ? (
        <EmptyState onAdd={() => setShowDownloadModal(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Active */}
          {active.length > 0 && (
            <section>
              <SectionLabel>Active</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {active.map((job, i) => (
                  <DownloadRow key={job.id} job={job} index={i} onRetry={processDownload} />
                ))}
              </div>
            </section>
          )}

          {/* History */}
          {done.length > 0 && (
            <section>
              <SectionLabel>History</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {done.map((job, i) => (
                  <DownloadRow key={job.id} job={job} index={i} onRemove={() => removeDownload(job.id)} onRetry={processDownload} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function DownloadRow({ job, index, onRemove, onRetry }: { 
  job: DownloadJob; index: number; onRemove?: () => void; onRetry: (url: string, folderId?: string, jobId?: string) => void 
}) {
  const cfg = STATUS_CONFIG[job.status];
  const isActive = job.status === 'downloading' || job.status === 'pending' || job.status === 'processing';
  const bgColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  return (
    <div
      className="animate-fade-in uber-card"
      style={{
        borderRadius: 'var(--radius)',
        padding: '16px',
        overflow: 'hidden',
        borderLeft: job.status === 'done' ? '4px solid var(--accent)' 
                  : job.status === 'error' ? '4px solid var(--danger)'
                  : isActive ? '4px solid var(--accent)'
                  : '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Thumbnail / placeholder */}
        <div style={{
          width: 52, height: 52, borderRadius: 8, flexShrink: 0,
          background: job.track?.coverUrl ? 'transparent' : bgColor,
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {job.track?.coverUrl ? (
            <Image src={job.track.coverUrl} alt={job.track.title} fill style={{ objectFit: 'cover' }} unoptimized />
          ) : (
            <Music2 size={20} color="rgba(0,0,0,0.25)" />
          )}
          {isActive && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Loader2 size={18} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
            }}>
              {job.track?.title ?? 'Fetching info…'}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: cfg.color,
              background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
              padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)',
              flexShrink: 0, border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)`,
            }}>
              {cfg.label}
            </span>
          </div>

          {/* Artist / URL */}
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: isActive ? 10 : 4,
          }}>
            {job.track?.artist ?? job.url}
          </div>

          {/* Progress bar */}
          {isActive && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {job.status === 'processing' ? 'Converting to MP3…'
                    : job.status === 'pending' ? 'Queued'
                    : 'Downloading audio'}
                </span>
                {job.progress > 0 && job.status === 'downloading' && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    {job.progress}%
                  </span>
                )}
              </div>
              <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: 99,
                  transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                  ...(job.status === 'processing' ? {
                    width: '100%',
                    background: 'var(--accent)',
                    backgroundImage: 'linear-gradient(90deg, var(--accent) 0%, var(--neon-blue) 50%, var(--accent) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.2s infinite',
                  } : job.status === 'pending' ? {
                    width: '4%',
                    background: 'var(--text-faint)',
                  } : {
                    width: `${job.progress}%`,
                    background: 'var(--brand-gradient)',
                  }),
                }} />
              </div>
            </div>
          )}

          {/* Done: track meta */}
          {job.status === 'done' && job.track && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {job.track.format?.toUpperCase() ?? 'MP3'}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-faint)', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {formatFileSize(job.track.fileSize)}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-faint)', display: 'inline-block' }} />
              <CheckCircle2 size={12} color="var(--accent)" />
              <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Added to library</span>
            </div>
          )}

          {/* Error message */}
          {job.status === 'error' && job.error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div style={{
                fontSize: 12, color: 'var(--danger)',
                background: 'rgba(229,62,62,0.06)',
                border: '1px solid rgba(229,62,62,0.15)',
                borderRadius: 6, padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <AlertCircle size={11} style={{ flexShrink: 0 }} />
                {job.error}
              </div>
              <button
                onClick={() => onRetry(job.url, job.track?.folderId, job.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  alignSelf: 'flex-start',
                  padding: '6px 12px',
                  background: 'var(--surface2)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface2)')}
              >
                <RotateCcw size={12} />
                Retry Download
              </button>
            </div>
          )}
        </div>

        {/* Remove button (only for finished jobs) */}
        {!isActive && onRemove && (
          <button
            onClick={onRemove}
            style={{
              width: 28, height: 28, background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 240, gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Download size={26} color="var(--text-faint)" />
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No downloads yet</p>
      <button
        onClick={onAdd}
        style={{
          padding: '9px 18px', background: 'var(--text)', color: 'var(--bg)',
          border: 'none', borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Add from URL
      </button>
    </div>
  );
}
