'use client';

import { useMusicStore } from '@/store/musicStore';
import { formatDuration } from '@/lib/utils';
import { BarChart2, Clock, Music2, Play, TrendingUp, Disc3 } from 'lucide-react';

function formatListenTime(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function StatsView() {
  const { library, listeningStats, recentlyPlayed, favorites } = useMusicStore();

  const totalLibraryDuration = library.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalLibrarySize = library.reduce((sum, t) => sum + (t.fileSize || 0), 0);

  // Top tracks by play count
  const topTracks = Object.entries(listeningStats.playCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([trackId, count]) => {
      const track = library.find(t => t.id === trackId);
      return track ? { track, count } : null;
    })
    .filter(Boolean) as Array<{ track: import('@/types').Track; count: number }>;

  const maxPlays = topTracks.length > 0 ? topTracks[0].count : 1;

  const statCards = [
    {
      icon: Clock,
      label: 'Total Listen Time',
      value: formatListenTime(listeningStats.totalListenTime),
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.1)',
    },
    {
      icon: Music2,
      label: 'Library Tracks',
      value: `${library.length}`,
      sub: formatDuration(totalLibraryDuration) + ' total',
      color: '#06C167',
      bg: 'rgba(6, 193, 103, 0.1)',
    },
    {
      icon: TrendingUp,
      label: 'Total Plays',
      value: `${Object.values(listeningStats.playCount).reduce((a, b) => a + b, 0)}`,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    {
      icon: Disc3,
      label: 'Library Size',
      value: totalLibrarySize > 1024 * 1024 * 1024
        ? `${(totalLibrarySize / (1024 * 1024 * 1024)).toFixed(1)} GB`
        : `${(totalLibrarySize / (1024 * 1024)).toFixed(0)} MB`,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.1)',
    },
  ];

  return (
    <div className="responsive-padding" style={{ height: '100%', overflow: 'auto' }}>
      <h1 className="brand-text font-display" style={{ fontWeight: 800, fontSize: 32, letterSpacing: '-1.5px', marginBottom: 4 }}>
        Stats
      </h1>
      <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
        Your listening activity at a glance.
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 36 }}>
        {statCards.map(card => (
          <div
            key={card.label}
            className="premium-card animate-fade-in"
            style={{ padding: 20, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: card.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <card.icon size={20} color={card.color} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '-1px' }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                {card.label}
              </div>
              {card.sub && (
                <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {card.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Top Tracks */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 16, color: 'var(--text)' }}>
          <BarChart2 size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
          Most Played
        </h2>

        {topTracks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            <Play size={24} color="var(--text-faint)" style={{ marginBottom: 8 }} />
            <p style={{ fontSize: 14 }}>Play some tracks to see your top songs!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topTracks.map((item, i) => (
              <div
                key={item.track.id}
                className="animate-fade-in"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px',
                  borderRadius: 12, transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{
                  fontSize: 14, fontWeight: 800, color: i < 3 ? 'var(--accent)' : 'var(--text-faint)',
                  fontFamily: 'var(--font-mono)', width: 24, textAlign: 'right', flexShrink: 0,
                }}>
                  {i + 1}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.track.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.track.artist}</div>
                </div>

                {/* Bar */}
                <div style={{ width: 120, height: 6, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    width: `${(item.count / maxPlays) * 100}%`,
                    background: i < 3 ? 'var(--brand-gradient)' : 'var(--text-muted)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>

                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0, width: 50, textAlign: 'right' }}>
                  {item.count} {item.count === 1 ? 'play' : 'plays'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div style={{
        display: 'flex', gap: 24, padding: '16px 20px', background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Favorites</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{favorites.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Plays</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{recentlyPlayed.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unique Tracks Played</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{Object.keys(listeningStats.playCount).length}</div>
        </div>
      </div>
    </div>
  );
}
