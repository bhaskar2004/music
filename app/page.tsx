'use client';

import { useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import LibraryView from '@/components/LibraryView';
import QueueView from '@/components/QueueView';
import DownloadsView from '@/components/DownloadsView';
import NowPlayingBar from '@/components/NowPlayingBar';
import DownloadModal from '@/components/DownloadModal';

export default function Home() {
  const { setLibrary, activeView } = useMusicStore();

  useEffect(() => {
    fetch('/api/library')
      .then((r) => r.json())
      .then((data) => { if (data.tracks) setLibrary(data.tracks); })
      .catch(console.error);
  }, [setLibrary]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const { isPlaying, setIsPlaying, playNext, playPrev, volume, setVolume } =
        useMusicStore.getState();
      switch (e.code) {
        case 'Space': e.preventDefault(); setIsPlaying(!isPlaying); break;
        case 'ArrowRight': if (e.metaKey || e.ctrlKey) { e.preventDefault(); playNext(); } break;
        case 'ArrowLeft': if (e.metaKey || e.ctrlKey) { e.preventDefault(); playPrev(); } break;
        case 'ArrowUp': if (e.metaKey || e.ctrlKey) { e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); } break;
        case 'ArrowDown': if (e.metaKey || e.ctrlKey) { e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); } break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
          {activeView === 'library' && <LibraryView />}
          {activeView === 'queue' && <QueueView />}
          {activeView === 'downloads' && <DownloadsView />}
        </main>
      </div>
      <MobileNav />
      <NowPlayingBar />
      <DownloadModal />
    </div>
  );
}
