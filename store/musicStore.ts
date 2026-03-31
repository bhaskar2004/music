'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Track, DownloadJob, Folder, RecentPlay, ListeningStats, SleepTimerState } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type ViewId = 'library' | 'search' | 'queue' | 'downloads' | 'favorites' | 'history' | 'stats' | 'settings';

interface MusicStore {
  // Library & Folders
  library: Track[];
  folders: Folder[];
  activeFolderId: string | null;
  
  setLibrary: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addFolder: (name: string) => void;
  removeFolder: (id: string) => void;
  moveTrack: (trackId: string, folderId?: string) => void;
  setActiveFolderId: (id: string | null) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

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
  addToQueue: (track: Track) => void;
  playNextTrack: (track: Track) => void;
  playAll: (tracks: Track[]) => void;
  shufflePlay: (tracks: Track[]) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  // Download
  downloads: DownloadJob[];
  addDownload: (job: DownloadJob) => void;
  updateDownload: (id: string, updates: Partial<DownloadJob>) => void;
  removeDownload: (id: string) => void;

  // UI
  activeView: ViewId;
  setActiveView: (v: ViewId) => void;
  showDownloadModal: boolean;
  setShowDownloadModal: (v: boolean) => void;
  selectedTrack: Track | null;
  setSelectedTrack: (t: Track | null) => void;
  showFullScreenPlayer: boolean;
  setShowFullScreenPlayer: (v: boolean) => void;

  // Selection
  selectedTrackIds: string[];
  isSelectionMode: boolean;
  toggleTrackSelection: (id: string) => void;
  setSelectionMode: (v: boolean) => void;
  clearSelection: () => void;
  moveSelectedToFolder: (trackIds: string[], folderId?: string) => void;

  // Recently Played
  recentlyPlayed: RecentPlay[];
  addRecentPlay: (trackId: string, listenDuration?: number) => void;
  clearRecentlyPlayed: () => void;

  // Stats
  listeningStats: ListeningStats;
  incrementPlayCount: (trackId: string) => void;
  addListenTime: (seconds: number) => void;

  // Sleep Timer
  sleepTimer: SleepTimerState;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;

  // Crossfade
  crossfadeDuration: number; // 0–12 seconds
  setCrossfadeDuration: (v: number) => void;

  // Theme
  theme: 'system' | 'dark' | 'light';
  setTheme: (v: 'system' | 'dark' | 'light') => void;
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      library: [],
      folders: [],
      activeFolderId: null,

      setLibrary: (tracks) => set({ library: tracks }),
      addTrack: (track) => set((s) => ({ library: [track, ...s.library] })),
      removeTrack: (id) =>
        set((s) => ({
          library: s.library.filter((t) => t.id !== id),
          favorites: s.favorites.filter((fid) => fid !== id),
        })),
        
      addFolder: (name) => set((s) => ({
        folders: [...s.folders, { id: uuidv4(), name, createdAt: new Date().toISOString() }],
      })),
      removeFolder: (id) => set((s) => ({
        folders: s.folders.filter((f) => f.id !== id),
        library: s.library.map((t) => t.folderId === id ? { ...t, folderId: undefined } : t),
        activeFolderId: s.activeFolderId === id ? null : s.activeFolderId,
      })),
      moveTrack: (trackId, folderId) => set((s) => {
        const updatedLibrary = s.library.map((t) => t.id === trackId ? { ...t, folderId } : t);
        fetch('/api/library/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackId, folderId }),
        }).catch(err => console.error("Failed to sync folder move to backend:", err));
        return { library: updatedLibrary };
      }),
      setActiveFolderId: (id) => set({ activeFolderId: id }),

      // Favorites
      favorites: [],
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((fid) => fid !== id)
            : [...s.favorites, id],
        })),
      isFavorite: (id) => get().favorites.includes(id),

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
        } else if (idx === queue.length - 1 && repeat === 'off') {
          set({ isPlaying: false });
          return;
        } else {
          next = queue[(idx + 1) % queue.length] ?? null;
        }
        set({ currentTrack: next, isPlaying: true, currentTime: 0 });
      },

      playPrev: () => {
        const { queue, currentTrack, currentTime } = get();
        if (!queue.length) return;
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }
        const idx = queue.findIndex((t) => t.id === currentTrack?.id);
        const prev = queue[(idx - 1 + queue.length) % queue.length] ?? null;
        set({ currentTrack: prev, isPlaying: true, currentTime: 0 });
      },

      addToQueue: (track) => set((s) => ({ queue: [...s.queue, track] })),
      
      playNextTrack: (track) => set((s) => {
        const idx = s.queue.findIndex((t) => t.id === s.currentTrack?.id);
        const newQueue = [...s.queue];
        if (idx === -1) {
          newQueue.unshift(track);
        } else {
          newQueue.splice(idx + 1, 0, track);
        }
        return { queue: newQueue };
      }),

      playAll: (tracks) => {
        if (!tracks.length) return;
        set({ queue: tracks, currentTrack: tracks[0], isPlaying: true, currentTime: 0 });
      },

      shufflePlay: (tracks) => {
        if (!tracks.length) return;
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        set({ queue: shuffled, currentTrack: shuffled[0], isPlaying: true, currentTime: 0 });
      },

      reorderQueue: (fromIndex, toIndex) => set((s) => {
        const newQueue = [...s.queue];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);
        return { queue: newQueue };
      }),

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
      showFullScreenPlayer: false,
      setShowFullScreenPlayer: (v) => set({ showFullScreenPlayer: v }),

      // Selection
      selectedTrackIds: [],
      isSelectionMode: false,
      toggleTrackSelection: (id) => set((s) => ({
        selectedTrackIds: s.selectedTrackIds.includes(id)
          ? s.selectedTrackIds.filter(tid => tid !== id)
          : [...s.selectedTrackIds, id]
      })),
      setSelectionMode: (v) => set({ isSelectionMode: v, selectedTrackIds: v ? get().selectedTrackIds : [] }),
      clearSelection: () => set({ selectedTrackIds: [] }),
      moveSelectedToFolder: (trackIds, folderId) => set((s) => {
        const updatedLibrary = s.library.map((t) => 
          trackIds.includes(t.id) ? { ...t, folderId } : t
        );
        trackIds.forEach(id => {
          fetch('/api/library/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId: id, folderId }),
          }).catch(err => console.error("Failed to sync bulk move:", err));
        });
        return { library: updatedLibrary, selectedTrackIds: [], isSelectionMode: false };
      }),

      // Recently Played
      recentlyPlayed: [],
      addRecentPlay: (trackId, listenDuration = 0) => set((s) => {
        const filtered = s.recentlyPlayed.filter(r => r.trackId !== trackId);
        const entry: RecentPlay = { trackId, playedAt: new Date().toISOString(), listenDuration };
        return { recentlyPlayed: [entry, ...filtered].slice(0, 50) };
      }),
      clearRecentlyPlayed: () => set({ recentlyPlayed: [] }),

      // Stats
      listeningStats: { totalListenTime: 0, playCount: {} },
      incrementPlayCount: (trackId) => set((s) => ({
        listeningStats: {
          ...s.listeningStats,
          playCount: {
            ...s.listeningStats.playCount,
            [trackId]: (s.listeningStats.playCount[trackId] || 0) + 1,
          },
        },
      })),
      addListenTime: (seconds) => set((s) => ({
        listeningStats: {
          ...s.listeningStats,
          totalListenTime: s.listeningStats.totalListenTime + seconds,
        },
      })),

      // Sleep Timer
      sleepTimer: { endTime: null, duration: 0, active: false },
      setSleepTimer: (minutes) => set({
        sleepTimer: {
          endTime: Date.now() + minutes * 60 * 1000,
          duration: minutes,
          active: true,
        },
      }),
      clearSleepTimer: () => set({ sleepTimer: { endTime: null, duration: 0, active: false } }),

      // Crossfade
      crossfadeDuration: 0,
      setCrossfadeDuration: (v) => set({ crossfadeDuration: v }),

      // Theme
      theme: 'system',
      setTheme: (v) => set({ theme: v }),
    }),
    {
      name: 'wavelength-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        favorites: state.favorites,
        folders: state.folders,
        recentlyPlayed: state.recentlyPlayed,
        listeningStats: state.listeningStats,
        crossfadeDuration: state.crossfadeDuration,
        theme: state.theme,
      }),
    }
  )
);
