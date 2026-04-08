'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Track, DownloadJob, Playlist, RecentPlay, ListeningStats, SleepTimerState, Lyrics } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type ViewId = 'library' | 'search' | 'queue' | 'downloads' | 'favorites' | 'history' | 'stats' | 'settings';

interface MusicStore {
  // Library & Playlists
  library: Track[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  
  setLibrary: (tracks: Track[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  addPlaylist: (name: string) => Promise<Playlist | null>;
  removePlaylist: (id: string) => Promise<void>;
  toggleTrackInPlaylist: (trackId: string, playlistId: string) => Promise<void>;
  setActivePlaylistId: (id: string | null) => void;
  fetchLibrary: () => Promise<void>;
  fetchPlaylists: () => Promise<void>;

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

  // Lyrics
  lyrics: Lyrics | null;
  isLoadingLyrics: boolean;
  fetchLyrics: (title: string, artist: string) => Promise<void>;

  // Autoplay
  isAutoplayEnabled: boolean;
  toggleAutoplay: () => void;
  autoplayNext: () => Promise<void>;
  isAutoplayLoading: boolean;

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
  moveSelectedToPlaylist: (trackIds: string[], playlistId: string) => void;

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
      playlists: [],
      activePlaylistId: null,

      setLibrary: (tracks) => set({ library: tracks.map(t => ({ ...t, playlistIds: t.playlistIds || [] })) }),
      setPlaylists: (playlists) => set({ playlists }),
      addTrack: (track) => set((s) => ({ 
        library: [
          { ...track, playlistIds: track.playlistIds || [] }, 
          ...s.library
        ] 
      })),
      removeTrack: (id) =>
        set((s) => ({
          library: s.library.filter((t) => t.id !== id),
          favorites: s.favorites.filter((fid) => fid !== id),
        })),
        
      addPlaylist: async (name) => {
        try {
          const res = await fetch('/api/playlists', {
            method: 'POST',
            body: JSON.stringify({ name }),
          });
          const newPlaylist = await res.json();
          set((s) => ({ playlists: [...s.playlists, newPlaylist] }));
          return newPlaylist;
        } catch (err) {
          console.error("Failed to add playlist:", err);
          return null;
        }
      },
      removePlaylist: async (id) => {
        try {
          await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
          set((s) => ({
            playlists: s.playlists.filter((p) => p.id !== id),
            library: s.library.map((t) => ({
              ...t,
              playlistIds: (t.playlistIds || []).filter(pid => pid !== id)
            })),
            activePlaylistId: s.activePlaylistId === id ? null : s.activePlaylistId,
          }));
        } catch (err) {
          console.error("Failed to remove playlist:", err);
        }
      },
      toggleTrackInPlaylist: async (trackId, playlistId) => {
        const track = get().library.find(t => t.id === trackId);
        if (!track) return;
        
        const isAdding = !track.playlistIds?.includes(playlistId);
        const action = isAdding ? 'add' : 'remove';
        
        // Optimistic update
        set((s) => ({
          library: s.library.map(t => t.id === trackId ? {
            ...t,
            playlistIds: isAdding 
              ? [...(t.playlistIds || []), playlistId]
              : (t.playlistIds || []).filter(pid => pid !== playlistId)
          } : t)
        }));

        try {
          await fetch('/api/library/playlist', {
            method: 'POST',
            body: JSON.stringify({ trackId, playlistId, action }),
          });
        } catch (err) {
          console.error("Failed to sync playlist toggle:", err);
        }
      },
      setActivePlaylistId: (id) => set({ activePlaylistId: id }),
      fetchLibrary: async () => {
        try {
          const res = await fetch('/api/library');
          const data = await res.json();
          if (data.tracks) get().setLibrary(data.tracks);
          if (data.playlists) get().setPlaylists(data.playlists);
        } catch (err) {
          console.error("Failed to fetch library:", err);
        }
      },
      fetchPlaylists: async () => {
        try {
          const res = await fetch('/api/playlists');
          const data = await res.json();
          set({ playlists: data });
        } catch (err) {
          console.error("Failed to fetch playlists:", err);
        }
      },

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
      
      lyrics: null,
      isLoadingLyrics: false,

      // Autoplay fields
      isAutoplayEnabled: true,
      toggleAutoplay: () => set((s) => ({ isAutoplayEnabled: !s.isAutoplayEnabled })),
      isAutoplayLoading: false,
      autoplayNext: async () => {
        const { currentTrack, queue, isAutoplayLoading } = get();
        if (!currentTrack || isAutoplayLoading) return;

        set({ isAutoplayLoading: true });
        console.log(`[Autoplay] fetching similar tracks for "${currentTrack.title}"`);

        try {
          const cleanTitle = currentTrack.title
            .replace(/\(.*?\)|\[.*?\]/gi, '')
            .replace(/official\s*(music\s*)?video|lyric(al)?\s*video|audio|full\s*song|hd|4k|music\s*video/gi, '')
            .trim();
          const query = `${currentTrack.artist} ${cleanTitle} music`;
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          if (res.ok) {
            const data = await res.json();
            const existingIds = new Set(queue.map(t => t.id));
            const newTracks = (data.results || []).filter((t: any) => !existingIds.has(`search-${t.id}`) && !existingIds.has(t.id) && t.id !== currentTrack.id).slice(0, 5);

            if (newTracks.length > 0) {
              const tracksToAdd = newTracks.map((t: any) => ({
                id: `search-${t.id}`,
                title: t.title,
                artist: t.artist,
                album: 'Unknown',
                duration: Math.round(t.duration / 1000) || 0,
                filename: `${t.id}.mp3`,
                coverUrl: t.thumbnail,
                sourceUrl: t.url,
                format: 'mp3',
              }));

              set((s) => ({ queue: [...s.queue, ...tracksToAdd] }));
              
              // Proceed to next newly added track
              const updatedQueue = get().queue;
              const idx = updatedQueue.findIndex((t) => t.id === currentTrack.id);
              if (idx !== -1 && idx < updatedQueue.length - 1) {
                const nextTrack = updatedQueue[idx + 1];
                set({ currentTrack: nextTrack, isPlaying: true, currentTime: 0 });
              }
            } else {
              console.log("[Autoplay] no related tracks found");
              set({ isPlaying: false });
            }
          } else {
            console.warn(`[Autoplay] Search API failed: ${res.status}`);
            set({ isPlaying: false });
          }
        } catch (err) {
          console.error("[Autoplay] Error:", err);
          set({ isPlaying: false });
        } finally {
          set({ isAutoplayLoading: false });
        }
      },

      setCurrentTrack: (track) => {
        set({ currentTrack: track, currentTime: 0, lyrics: null });
        if (track) {
          get().fetchLyrics(track.title, track.artist);
        }
      },
      
      fetchLyrics: async (title, artist) => {
        set({ isLoadingLyrics: true, lyrics: null });
        try {
          const res = await fetch(`/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
          if (res.ok) {
            const data = await res.json();
            set({ lyrics: data });
          } else {
            console.warn(`[LYRICS] Failed to fetch: ${res.status}`);
          }
        } catch (err) {
          console.error("[LYRICS] Error:", err);
        } finally {
          set({ isLoadingLyrics: false });
        }
      },
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
        const { queue, currentTrack, shuffle, repeat, isAutoplayEnabled, autoplayNext } = get();
        if (!queue.length) return;
        const idx = queue.findIndex((t) => t.id === currentTrack?.id);
        let next: Track | null = null;

        if (shuffle) {
          const others = queue.filter((t) => t.id !== currentTrack?.id);
          next = others[Math.floor(Math.random() * others.length)] ?? null;
        } else if (repeat === 'one') {
          next = currentTrack;
        } else if (idx === queue.length - 1 && repeat === 'off') {
          if (isAutoplayEnabled) {
            autoplayNext();
          } else {
            set({ isPlaying: false });
          }
          return;
        } else {
          next = queue[(idx + 1) % queue.length] ?? null;
        }
        
        if (next) set({ currentTrack: next, isPlaying: true, currentTime: 0 });
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
      moveSelectedToPlaylist: (trackIds: string[], playlistId: string) => set((s) => {
        const updatedLibrary = s.library.map((t) => 
          trackIds.includes(t.id) ? { 
            ...t, 
            playlistIds: [...(t.playlistIds || []).filter(pid => pid !== playlistId), playlistId] 
          } : t
        );
        trackIds.forEach(id => {
          fetch('/api/library/playlist', {
            method: 'POST',
            body: JSON.stringify({ trackId: id, playlistId, action: 'add' }),
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
        playlists: state.playlists,
        recentlyPlayed: state.recentlyPlayed,
        listeningStats: state.listeningStats,
        crossfadeDuration: state.crossfadeDuration,
        theme: state.theme,
        isAutoplayEnabled: state.isAutoplayEnabled,
      }),
    }
  )
);
