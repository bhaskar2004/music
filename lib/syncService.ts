import { io, Socket } from 'socket.io-client';
import { useMusicStore } from '@/store/musicStore';

let socket: Socket | null = null;
let currentPartyId: string | null = null;
let isSettingRemoteState = false; // Prevent feedback loops

export function connectSyncService() {
  if (socket) return;

  // Assuming Next.js serves on same origin or process.env.NEXT_PUBLIC_API_URL
  const url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  socket = io(url, {
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('[SyncService] Connected to server:', socket?.id);
    if (currentPartyId) socket?.emit('join_party', currentPartyId);
  });

  // ─── Initial state sync on join ───────────────────────────────────────────
  socket.on('party_state', (data: any) => {
    if (!data || !currentPartyId) return;
    console.log('[SyncService] Received party state on join:', data);

    const state = useMusicStore.getState();
    isSettingRemoteState = true;

    try {
      const { track, positionMs, isPlaying } = data;

      // Load the track if we're not already playing it
      if (track && track.id !== state.currentTrack?.id) {
        state.setCurrentTrack(track);
      }

      // Seek to the correct position
      if (positionMs != null) {
        state.setPendingSeek(positionMs / 1000);
        state.setCurrentTime(positionMs / 1000);
      }

      // Match play/pause state
      state.setIsPlaying(!!isPlaying);
    } finally {
      setTimeout(() => {
        isSettingRemoteState = false;
      }, 500); // Longer delay for initial state to prevent echo
    }
  });

  // ─── Member count updates ────────────────────────────────────────────────
  socket.on('party_members', (data: any) => {
    if (!data) return;
    console.log('[SyncService] Party members:', data.count);
    useMusicStore.getState().setPartyMembers(data.count ?? 0);
  });

  // ─── Playback updates from other users ───────────────────────────────────
  socket.on('playback_update', (data: any) => {
    if (!data || !currentPartyId) return;

    const state = useMusicStore.getState();
    const { action, trackId, positionMs } = data;

    console.log('[SyncService] Received playback update:', action, trackId);
    isSettingRemoteState = true;

    try {
      if (action === 'change_track') {
        // Track changed — load the new track
        const track = data.track || state.library.find((t) => t.id === trackId);
        if (track && state.currentTrack?.id !== track.id) {
          state.setCurrentTrack(track);
          state.setIsPlaying(true);
          if (positionMs != null) {
            state.setPendingSeek(positionMs / 1000);
            state.setCurrentTime(positionMs / 1000);
          }
        }
      } else if (action === 'play') {
        state.setIsPlaying(true);
        if (positionMs != null) {
          state.setPendingSeek(positionMs / 1000);
          state.setCurrentTime(positionMs / 1000);
        }
      } else if (action === 'pause') {
        state.setIsPlaying(false);
        if (positionMs != null) {
          state.setCurrentTime(positionMs / 1000);
        }
      } else if (action === 'seek') {
        if (positionMs != null) {
          state.setPendingSeek(positionMs / 1000);
          state.setCurrentTime(positionMs / 1000);
        }
      }
    } finally {
      setTimeout(() => {
        isSettingRemoteState = false;
      }, 300);
    }
  });

  // ─── Broadcast local changes ─────────────────────────────────────────────
  useMusicStore.subscribe((state, prevState) => {
    if (!socket || !currentPartyId || isSettingRemoteState) return;
    
    // Determine what changed
    const trackChanged = state.currentTrack?.id !== prevState.currentTrack?.id;
    const playingChanged = state.isPlaying !== prevState.isPlaying;
    const seeked = Math.abs(state.currentTime - prevState.currentTime) > 2;

    if (trackChanged || playingChanged || seeked) {
       const action = trackChanged ? 'change_track' : playingChanged ? (state.isPlaying ? 'play' : 'pause') : 'seek';
       
       socket.emit('sync_playback', {
          partyId: currentPartyId,
          action,
          trackId: state.currentTrack?.id || '',
          track: state.currentTrack,
          positionMs: Math.floor(state.currentTime * 1000),
          timestamp: Date.now(),
       });
    }
  });
}

export function joinSyncParty(partyId: string) {
  if (!socket) connectSyncService();
  currentPartyId = partyId;
  useMusicStore.getState().setPartyId(partyId);
  socket?.emit('join_party', partyId);
}

export function leaveSyncParty() {
  if (currentPartyId && socket) {
    socket.emit('leave_party', currentPartyId);
  }
  currentPartyId = null;
  const state = useMusicStore.getState();
  state.setPartyId(null);
  state.setPartyMembers(0);
}

export function generatePartyCode(): string {
  // Generate a clean 6-char uppercase alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
