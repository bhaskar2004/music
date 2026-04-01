'use client';

import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import { Clock, Music2, TrendingUp, Disc3, Play, Heart } from 'lucide-react';
import { useMemo } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatListenTime(totalSeconds: number): { value: string; unit: string } {
  if (totalSeconds < 60) return { value: Math.round(totalSeconds).toString(), unit: 'sec' };
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return { value: `${hours}h ${mins}m`, unit: 'listened' };
  return { value: `${mins}`, unit: 'min' };
}

function formatSize(bytes: number): { value: string; unit: string } {
  if (bytes >= 1024 ** 3) return { value: (bytes / 1024 ** 3).toFixed(1), unit: 'GB' };
  return { value: (bytes / 1024 ** 2).toFixed(0), unit: 'MB' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatsView() {
  const { library, listeningStats, recentlyPlayed, favorites } = useMusicStore();

  const totalDuration = library.reduce((s, t) => s + (t.duration || 0), 0);
  const totalSize = library.reduce((s, t) => s + (t.fileSize || 0), 0);
  const totalPlays = Object.values(listeningStats.playCount).reduce((a, b) => a + b, 0);
  const uniquePlayed = Object.keys(listeningStats.playCount).length;

  const listenFmt = formatListenTime(listeningStats.totalListenTime);
  const sizeFmt = formatSize(totalSize);

  const topTracks = useMemo(() =>
    Object.entries(listeningStats.playCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([trackId, count]) => {
        const track = library.find(t => t.id === trackId);
        return track ? { track, count } : null;
      })
      .filter(Boolean) as Array<{ track: import('@/types').Track; count: number }>,
    [listeningStats.playCount, library]
  );

  const maxPlays = topTracks[0]?.count || 1;

  // Derive top artist from play counts
  const topArtist = useMemo(() => {
    const artistCounts: Record<string, number> = {};
    for (const [trackId, count] of Object.entries(listeningStats.playCount)) {
      const t = library.find(x => x.id === trackId);
      if (t) artistCounts[t.artist] = (artistCounts[t.artist] || 0) + count;
    }
    const sorted = Object.entries(artistCounts).sort(([, a], [, b]) => b - a);
    return sorted[0]?.[0] ?? '—';
  }, [listeningStats.playCount, library]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Epilogue:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @keyframes statsIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barGrow {
          from { width: 0 !important; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stats-root    { animation: statsIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .bar-fill      { animation: barGrow 0.9s 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        .track-row     { transition: background 0.15s; }
        .track-row:hover { background: var(--surface2) !important; }

        .stat-card {
          border-radius: 16px;
          padding: 22px 20px 18px;
          border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
          background: var(--surface);
          display: flex; flex-direction: column; gap: 10;
          animation: statsIn 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }
        .stat-card:nth-child(1) { animation-delay: 0.05s; }
        .stat-card:nth-child(2) { animation-delay: 0.10s; }
        .stat-card:nth-child(3) { animation-delay: 0.15s; }
        .stat-card:nth-child(4) { animation-delay: 0.20s; }

        .mini-stat {
          flex: 1; min-width: 120px;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
          background: var(--surface);
        }
      `}</style>

      <div
        className="stats-root responsive-padding"
        style={{ height: '100%', overflow: 'auto', paddingTop: 44, paddingBottom: 60, fontFamily: 'Epilogue, sans-serif' }}
      >

        {/* ── Page header ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)',
            }} />
            <span style={{
              fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
              color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>
              Listening Report
            </span>
          </div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 40, letterSpacing: '-1.5px', lineHeight: 1,
            color: 'var(--text)', margin: 0,
          }}>
            Your Stats
          </h1>
          <p style={{ fontFamily: 'Epilogue, sans-serif', color: 'var(--text-faint)', fontSize: 13, marginTop: 10, fontWeight: 400 }}>
            Everything you've listened to, in one place.
          </p>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 12, marginBottom: 40,
        }}>
          <StatCard
            icon={<Clock size={16} />}
            label="Listen time"
            value={listenFmt.value}
            unit={listenFmt.unit}
            accentColor="var(--accent)"
            delay={0}
          />
          <StatCard
            icon={<Music2 size={16} />}
            label="Library tracks"
            value={String(library.length)}
            unit={formatDuration(totalDuration)}
            accentColor="#a78bfa"
            delay={1}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Total plays"
            value={String(totalPlays)}
            unit={`${uniquePlayed} unique tracks`}
            accentColor="#fb923c"
            delay={2}
          />
          <StatCard
            icon={<Disc3 size={16} />}
            label="Library size"
            value={sizeFmt.value}
            unit={sizeFmt.unit}
            accentColor="#f472b6"
            delay={3}
          />
        </div>

        {/* ── Top tracks ──────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <SectionLabel icon={<TrendingUp size={12} />} title="Most Played" />

          {topTracks.length === 0 ? (
            <EmptyChart />
          ) : (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              {topTracks.map((item, i) => {
                const pct = (item.count / maxPlays) * 100;
                const isTop3 = i < 3;
                const rankColors = ['#f59e0b', '#94a3b8', '#cd7c3a'];
                return (
                  <div
                    key={item.track.id}
                    className="track-row"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 18px',
                      borderBottom: i < topTracks.length - 1
                        ? '1px solid color-mix(in srgb, var(--border) 30%, transparent)'
                        : 'none',
                      background: 'transparent', cursor: 'default',
                      position: 'relative',
                    }}
                  >
                    {/* Subtle fill bg */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${pct}%`,
                      background: isTop3
                        ? `color-mix(in srgb, var(--accent) 4%, transparent)`
                        : 'transparent',
                      borderRadius: 0,
                      transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                      pointerEvents: 'none',
                    }} />

                    {/* Rank */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12, fontWeight: 600, flexShrink: 0,
                      width: 22, textAlign: 'right',
                      color: isTop3 ? rankColors[i] : 'var(--text-faint)',
                      zIndex: 1,
                    }}>
                      {i + 1}
                    </span>

                    {/* Cover thumbnail */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                      background: 'var(--surface2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 1,
                    }}>
                      {item.track.coverUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.track.coverUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Music2 size={16} style={{ color: 'var(--text-faint)', opacity: 0.5 }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                      <p style={{
                        margin: 0, fontFamily: 'Epilogue, sans-serif',
                        fontWeight: 600, fontSize: 13.5,
                        color: 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.track.title}
                      </p>
                      <p style={{
                        margin: 0, fontFamily: 'Epilogue, sans-serif',
                        fontSize: 12, color: 'var(--text-faint)', fontWeight: 400, marginTop: 2,
                      }}>
                        {item.track.artist}
                      </p>
                    </div>

                    {/* Bar */}
                    <div style={{
                      width: 100, height: 3,
                      background: 'color-mix(in srgb, var(--border) 60%, transparent)',
                      borderRadius: 99, overflow: 'hidden', flexShrink: 0, zIndex: 1,
                    }}>
                      <div
                        className="bar-fill"
                        style={{
                          height: '100%', borderRadius: 99,
                          width: `${pct}%`,
                          background: isTop3
                            ? 'var(--brand-gradient)'
                            : 'color-mix(in srgb, var(--text-faint) 60%, transparent)',
                        }}
                      />
                    </div>

                    {/* Count */}
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11, fontWeight: 500,
                      color: isTop3 ? 'var(--accent)' : 'var(--text-faint)',
                      flexShrink: 0, width: 54, textAlign: 'right', zIndex: 1,
                    }}>
                      {item.count}×
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Quick stats strip ────────────────────────────────────── */}
        <section>
          <SectionLabel icon={<Disc3 size={12} />} title="Overview" />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <MiniStat label="Favorites" value={String(favorites.length)} />
            <MiniStat label="Recent plays" value={String(recentlyPlayed.length)} />
            <MiniStat label="Top artist" value={topArtist} mono={false} />
            <MiniStat
              label="Avg. plays / track"
              value={uniquePlayed > 0
                ? (totalPlays / uniquePlayed).toFixed(1)
                : '—'}
            />
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      marginBottom: 14,
    }}>
      <span style={{ color: 'var(--text-faint)', display: 'flex' }}>{icon}</span>
      <span style={{
        fontFamily: 'Syne, sans-serif', fontWeight: 700,
        fontSize: 9.5, textTransform: 'uppercase',
        letterSpacing: '0.14em', color: 'var(--text-faint)',
      }}>
        {title}
      </span>
    </div>
  );
}

function StatCard({
  icon, label, value, unit, accentColor, delay,
}: {
  icon: React.ReactNode; label: string;
  value: string; unit: string;
  accentColor: string; delay: number;
}) {
  return (
    <div
      className="stat-card"
      style={{ animationDelay: `${delay * 0.07}s` }}
    >
      {/* Icon pip */}
      <div style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accentColor} 22%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentColor,
      }}>
        {icon}
      </div>

      {/* Value */}
      <div>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: 30, letterSpacing: '-1px', lineHeight: 1,
          color: 'var(--text)',
        }}>
          {value}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, fontWeight: 500,
          color: accentColor, marginTop: 4,
          letterSpacing: '0.04em', textTransform: 'lowercase',
          opacity: 0.9,
        }}>
          {unit}
        </div>
      </div>

      {/* Label */}
      <div style={{
        fontFamily: 'Epilogue, sans-serif',
        fontSize: 12, color: 'var(--text-faint)',
        fontWeight: 400, marginTop: 'auto',
      }}>
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mini-stat">
      <p style={{
        fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700,
        color: 'var(--text-faint)', textTransform: 'uppercase',
        letterSpacing: '0.12em', margin: '0 0 6px',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: mono ? 'JetBrains Mono, monospace' : 'Epilogue, sans-serif',
        fontSize: mono ? 20 : 16,
        fontWeight: mono ? 600 : 600,
        color: 'var(--text)', margin: 0,
        letterSpacing: mono ? '-0.5px' : '-0.2px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {value}
      </p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '52px 24px', gap: 10,
      background: 'var(--surface)',
      border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
      borderRadius: 16,
    }}>
      <Play size={28} style={{ color: 'var(--text-faint)', opacity: 0.25 }} />
      <p style={{
        fontFamily: 'Epilogue, sans-serif', fontSize: 13,
        color: 'var(--text-faint)', margin: 0, opacity: 0.6,
      }}>
        Play some tracks to see your chart
      </p>
    </div>
  );
}