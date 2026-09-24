'use client';

import { useEffect, useState, useRef } from 'react';
import { useMusicStore } from '@/store/musicStore';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import MobileNav from '@/components/MobileNav';
import LibraryView from '@/components/LibraryView';
import QueueView from '@/components/QueueView';
import DownloadsView from '@/components/DownloadsView';
import FavoritesView from '@/components/FavoritesView';
import SearchView from '@/components/SearchView';
import NowPlayingBar from '@/components/NowPlayingBar';
import DownloadModal from '@/components/DownloadModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import RecentlyPlayedView from '@/components/RecentlyPlayedView';
import StatsView from '@/components/StatsView';
import SettingsView from '@/components/SettingsView';
import FullScreenPlayer from '@/components/FullScreenPlayer';
import PartyModal from '@/components/PartyModal';
import PlayTogetherView from '@/components/PlayTogetherView';
import {
  connectSyncService,
  startSyncBroadcasting,
  broadcastPlayback,
} from '@/lib/syncService';

export default function Home() {
  const { fetchLibrary, activeView, showFullScreenPlayer, theme, updateDownload, addTrack, partyId, partyMembersList } = useMusicStore();
  const [loading, setLoading] = useState(true);
  const unsubBroadcastRef = useRef<(() => void) | null>(null);

  // Fetch library + connect sync
  useEffect(() => {
    fetchLibrary().finally(() => setLoading(false));
    connectSyncService();
    unsubBroadcastRef.current = startSyncBroadcasting();

    // ── Global Download Events ──
    const eventSource = new EventSource('/api/download/events');
    
    const safeParse = (data: string) => {
      if (!data || data === 'undefined') return null;
      try { return JSON.parse(data); } catch { return null; }
    };

    eventSource.addEventListener('update', (e) => {
      const data = safeParse((e as MessageEvent).data);
      if (!data) return;
      updateDownload(data.id, { 
        url: data.url,
        status: data.status,
        progress: data.progress 
      });
    });

    eventSource.addEventListener('progress', (e) => {
      const data = safeParse((e as MessageEvent).data);
      if (!data) return;
      updateDownload(data.id, { 
        url: data.url,
        progress: data.percent, 
        status: 'downloading' 
      });
    });

    eventSource.addEventListener('status', (e) => {
      const data = safeParse((e as MessageEvent).data);
      if (!data) return;
      updateDownload(data.id, { 
        url: data.url,
        status: data.stage === 'processing' ? 'processing' : 'downloading' 
      });
    });

    eventSource.addEventListener('done', (e) => {
      const data = safeParse((e as MessageEvent).data);
      if (!data) return;
      addTrack(data.track);
      updateDownload(data.id, { status: 'done', progress: 100, track: data.track });
    });

    eventSource.addEventListener('error', (e) => {
      const data = safeParse((e as MessageEvent).data);
      if (!data) return;
      updateDownload(data.id, { status: 'error', error: data.message });
    });

    return () => {
      unsubBroadcastRef.current?.();
      eventSource.close();
    };
  }, [fetchLibrary, updateDownload, addTrack]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    if (theme !== 'system') root.setAttribute('data-theme', theme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const { isPlaying, setIsPlaying, playNext, playPrev, volume, setVolume, partyId, currentTime } =
        useMusicStore.getState();
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          if (partyId) {
            const audio = document.querySelector('audio') as HTMLAudioElement | null;
            broadcastPlayback(!isPlaying ? 'play' : 'pause', (audio?.currentTime ?? currentTime) * 1000);
          }
          break;
        case 'ArrowRight':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); playNext(); }
          break;
        case 'ArrowLeft':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); playPrev(); }
          break;
        case 'ArrowUp':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); }
          break;
        case 'ArrowDown':
          if (e.metaKey || e.ctrlKey) { e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            <MobileHeader />
            {partyId && activeView !== 'together' && (
              <div className="party-banner">
                <div className="party-banner-dot" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Session
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Code: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{partyId}</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 'auto' }}>
                  {partyMembersList.length} member{partyMembersList.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => useMusicStore.getState().setActiveView('together')}
                  style={{
                    background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 99,
                    padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginLeft: 12
                  }}
                >
                  View
                </button>
              </div>
            )}
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
                {activeView === 'together' && <PlayTogetherView />}
                {activeView === 'library' && <LibraryView />}
                {activeView === 'search' && <SearchView />}
                {activeView === 'favorites' && <FavoritesView />}
                {activeView === 'queue' && <QueueView />}
                {activeView === 'downloads' && <DownloadsView />}
                {activeView === 'history' && <RecentlyPlayedView />}
                {activeView === 'stats' && <StatsView />}
                {activeView === 'settings' && <SettingsView />}
              </>
            )}
          </main>
        </div>
        <MobileNav />
        <NowPlayingBar />
        <DownloadModal />
        <PartyModal />
        {showFullScreenPlayer && <FullScreenPlayer />}
      </div>
    </ErrorBoundary>
  );
}

function LoadingSkeleton() {
  return (
    <div className="responsive-padding" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="skeleton" style={{ width: 140, height: 32, marginBottom: 8, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 90, height: 16, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 260, height: 44, borderRadius: '12px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginTop: 8 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'var(--surface)', borderRadius: '12px' }}>
            <div className="skeleton" style={{ width: '100%', aspectRatio: '1', borderRadius: 8 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <div className="skeleton" style={{ width: '85%', height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: '60%', height: 12, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}