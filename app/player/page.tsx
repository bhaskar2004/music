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
import {
  connectSyncService,
  startSyncBroadcasting,
  broadcastPlayback,
} from '@/lib/syncService';

export default function Home() {
  const { fetchLibrary, activeView, showFullScreenPlayer, theme } = useMusicStore();
  const [loading, setLoading] = useState(true);
  const unsubBroadcastRef = useRef<(() => void) | null>(null);

  // Fetch library + connect sync
  useEffect(() => {
    fetchLibrary().finally(() => setLoading(false));

    // Connect socket and start listening for party events
    connectSyncService();

    // Subscribe store → broadcast (returns cleanup fn)
    unsubBroadcastRef.current = startSyncBroadcasting();

    return () => {
      unsubBroadcastRef.current?.();
    };
  }, [fetchLibrary]);

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
          // Broadcast play/pause if in a party
          if (partyId) {
            const audio = document.querySelector('audio') as HTMLAudioElement | null;
            broadcastPlayback(
              !isPlaying ? 'play' : 'pause',
              (audio?.currentTime ?? currentTime) * 1000,
            );
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

  // Broadcast seek events from the audio element to the party room
  useEffect(() => {
    const audio = document.querySelector('audio') as HTMLAudioElement | null;
    if (!audio) return;

    const onSeeked = () => {
      const { partyId } = useMusicStore.getState();
      if (partyId) broadcastPlayback('seek', audio.currentTime * 1000);
    };

    audio.addEventListener('seeked', onSeeked);
    return () => audio.removeEventListener('seeked', onSeeked);
  });

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar />
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            <MobileHeader />
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <>
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