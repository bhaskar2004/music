'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Track, DownloadJob, Folder } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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

  // Download
  downloads: DownloadJob[];
  addDownload: (job: DownloadJob) => void;
  updateDownload: (id: string, updates: Partial<DownloadJob>) => void;
  removeDownload: (id: string) => void;

  // UI
  activeView: 'library' | 'search' | 'queue' | 'downloads' | 'favorites';
  setActiveView: (v: 'library' | 'search' | 'queue' | 'downloads' | 'favorites') => void;
  showDownloadModal: boolean;
  setShowDownloadModal: (v: boolean) => void;
  selectedTrack: Track | null;
  setSelectedTrack: (t: Track | null) => void;

  // Selection
  selectedTrackIds: string[];
  isSelectionMode: boolean;
  toggleTrackSelection: (id: string) => void;
  setSelectionMode: (v: boolean) => void;
  clearSelection: () => void;
  moveSelectedToFolder: (trackIds: string[], folderId?: string) => void;
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
        // Optimistically update memory library
        const updatedLibrary = s.library.map((t) => t.id === trackId ? { ...t, folderId } : t);
        
        // Push the update to the backend library.json so it persists across reloads!
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
          // At the end and repeat is off — stop
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
        // If more than 3 seconds into a track, restart it
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
        
        // Sync each move to backend (sequential or batch if we had an endpoint, 
        // using moveTrack's endpoint for now)
        trackIds.forEach(id => {
          fetch('/api/library/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId: id, folderId }),
          }).catch(err => console.error("Failed to sync bulk move:", err));
        });

        return { library: updatedLibrary, selectedTrackIds: [], isSelectionMode: false };
      }),
    }),
    {
      name: 'wavelength-settings',
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences — NOT ephemeral state
      partialize: (state) => ({
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        favorites: state.favorites,
        folders: state.folders,
      }),
    }
  )
);
