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

  socket.on('playback_update', (data: any) => {
    if (!data || !currentPartyId) return;

    // We got an update from someone else in the party
    const state = useMusicStore.getState();
    const { action, trackId, positionMs } = data;

    isSettingRemoteState = true;

    try {
      if (action === 'play') {
        state.setIsPlaying(true);
      } else if (action === 'pause') {
        state.setIsPlaying(false);
      } else if (action === 'seek' || action === 'sync') {
        state.setCurrentTime(positionMs / 1000);
      } else if (action === 'change_track' || (action === 'play' && state.currentTrack?.id !== trackId)) {
        // If track changed, we need to find it and play it. Let's try passed track first.
        const track = data.track || state.library.find((t) => t.id === trackId);
        if (track && state.currentTrack?.id !== track.id) {
           state.setCurrentTrack(track);
           state.setIsPlaying(true);
           if (positionMs) {
             setTimeout(() => {
                useMusicStore.getState().setCurrentTime(positionMs / 1000);
             }, 500); // Give player time to load track
           }
        }
      }
    } finally {
      setTimeout(() => {
        isSettingRemoteState = false;
      }, 200); // Short delay to prevent echo
    }
  });

  // Listen to local store changes and broadcast
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
  useMusicStore.getState().setPartyId(null);
}

export function generatePartyCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
