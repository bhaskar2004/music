'use client';

import { create } from 'zustand';
import { Track, DownloadJob } from '@/types';

interface MusicStore {
  // Library
  library: Track[];
  setLibrary: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;

  // Player
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  queue: Track[];

  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setQueue: (tracks: Track[]) => void;
  playNext: () => void;
  playPrev: () => void;

  // Download
  downloads: DownloadJob[];
  addDownload: (job: DownloadJob) => void;
  updateDownload: (id: string, updates: Partial<DownloadJob>) => void;
  removeDownload: (id: string) => void;

  // UI
  activeView: 'library' | 'queue' | 'downloads';
  setActiveView: (v: 'library' | 'queue' | 'downloads') => void;
  showDownloadModal: boolean;
  setShowDownloadModal: (v: boolean) => void;
  selectedTrack: Track | null;
  setSelectedTrack: (t: Track | null) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  library: [],
  setLibrary: (tracks) => set({ library: tracks }),
  addTrack: (track) => set((s) => ({ library: [track, ...s.library] })),
  removeTrack: (id) =>
    set((s) => ({ library: s.library.filter((t) => t.id !== id) })),

  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  queue: [],

  setCurrentTrack: (track) => set({ currentTrack: track, currentTime: 0 }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => set({ volume: v }),
  setCurrentTime: (v) => set({ currentTime: v }),
  setDuration: (v) => set({ duration: v }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () =>
    set((s) => ({
      repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
    })),
  setQueue: (tracks) => set({ queue: tracks }),

  playNext: () => {
    const { queue, currentTrack, shuffle, repeat } = get();
    if (!queue.length) return;
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    let next: Track | null = null;
    if (shuffle) {
      const others = queue.filter((t) => t.id !== currentTrack?.id);
      next = others[Math.floor(Math.random() * others.length)] ?? null;
    } else if (repeat === 'one') {
      next = currentTrack;
    } else {
      next = queue[(idx + 1) % queue.length] ?? null;
    }
    set({ currentTrack: next, isPlaying: true, currentTime: 0 });
  },

  playPrev: () => {
    const { queue, currentTrack } = get();
    if (!queue.length) return;
    const idx = queue.findIndex((t) => t.id === currentTrack?.id);
    const prev = queue[(idx - 1 + queue.length) % queue.length] ?? null;
    set({ currentTrack: prev, isPlaying: true, currentTime: 0 });
  },

  downloads: [],
  addDownload: (job) => set((s) => ({ downloads: [job, ...s.downloads] })),
  updateDownload: (id, updates) =>
    set((s) => ({
      downloads: s.downloads.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDownload: (id) =>
    set((s) => ({ downloads: s.downloads.filter((d) => d.id !== id) })),

  activeView: 'library',
  setActiveView: (v) => set({ activeView: v }),
  showDownloadModal: false,
  setShowDownloadModal: (v) => set({ showDownloadModal: v }),
  selectedTrack: null,
  setSelectedTrack: (t) => set({ selectedTrack: t }),
}));
