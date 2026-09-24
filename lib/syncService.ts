/**
 * syncService.ts
 * Web-side Socket.IO client for the Listen Together feature.
 * Bridges the Zustand store ↔ Socket.IO server ↔ other clients.
 */

import { io, Socket } from 'socket.io-client';
import { useMusicStore } from '@/store/musicStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SyncPayload {
  partyId: string;
  action: 'play' | 'pause' | 'seek' | 'change_track';
  trackId: string;
  positionMs: number;
  track?: Record<string, unknown>;
  timestamp?: number;
}

interface PartyStatePayload {
  partyId: string;
  track?: Record<string, unknown>;
  trackId?: string;
  positionMs?: number;
  isPlaying?: boolean;
  isHostOnly?: boolean;
  vibe?: string;
  hostId?: string;
  timestamp?: number;
}

interface PartyMembersPayload {
  partyId: string;
  count: number;
}

// ─── Module-level state ───────────────────────────────────────────────────────

let socket: Socket | null = null;
let isHandlingSync = false; // Prevents local store → broadcast echo loops
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Connect to the Socket.IO server. Called once when the player page mounts.
 * Safe to call multiple times — re-uses existing connection.
 */
export function connectSyncService(): void {
  if (socket?.connected) return;

  // Tear down stale socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Connect to the same origin the web app is served from
  socket = io(window.location.origin, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[SyncService] ✓ Connected', socket?.id);
    // Re-join after reconnect
    const store = useMusicStore.getState();
    const partyId = store.partyId;
    if (partyId) {
      socket!.emit('join_party', partyId);
      if (store.displayName) {
        socket!.emit('member_info', { displayName: store.displayName });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('[SyncService] ✗ Disconnected');
  });

  socket.on('connect_error', (err) => {
    console.warn('[SyncService] Connect error:', err.message);
  });

  // ── Incoming playback events from other room members ────────────────────
  socket.on('playback_update', (data: SyncPayload) => {
    if (!data || !data.action) return;
    _applyRemoteSync(data);
  });

  // ── Initial room state sent when joining ─────────────────────────────────
  socket.on('party_state', (data: PartyStatePayload) => {
    if (!data) return;
    console.log('[SyncService] Received party_state:', data);
    _applyPartyState(data);
  });

  // ── Member count updates ─────────────────────────────────────────────────
  socket.on('party_members', (data: PartyMembersPayload) => {
    if (data?.count !== undefined) {
      useMusicStore.getState().setPartyMembers(data.count);
    }
  });

  // ── Member list updates (with names & colors) ───────────────────────────
  socket.on('party_members_list', (data: { partyId: string; members: Array<{ socketId: string; displayName: string; color: string }> }) => {
    if (data?.members) {
      useMusicStore.getState().setPartyMembersList(data.members);
    }
  });

  // ── Chat messages ───────────────────────────────────────────────────────
  socket.on('chat_message', (data: { partyId: string; message: import('@/types').ChatMessage }) => {
    if (data?.message) {
      useMusicStore.getState().addChatMessage(data.message);
    }
  });

  // ── Queue additions from other members ──────────────────────────────────
  socket.on('queue_add', (data: { partyId: string; track: Record<string, unknown> }) => {
    if (data?.track) {
      const track = _normalizeTrack(data.track);
      if (track) {
        useMusicStore.getState().addToQueue(track);
      }
    }
  });

  // ── Reactions ───────────────────────────────────────────────────────────
  socket.on('member_reaction', (data: { type: string; senderName: string; id: string }) => {
    useMusicStore.getState().addLiveReaction(data);
  });

  // ── Voting ──────────────────────────────────────────────────────────────
  socket.on('votes_update', (data: { partyId: string; votes: Record<string, number> }) => {
    useMusicStore.getState().setPartyVotes(data.votes);
  });

  // ── Room Settings ───────────────────────────────────────────────────────
  socket.on('room_settings_update', (data: { isHostOnly: boolean; vibe: any; hostId?: string }) => {
    const store = useMusicStore.getState();
    store.setIsHostOnly(data.isHostOnly);
    if (data.vibe) store.setPartyVibe(data.vibe);
  });

  // ── Member Progress ─────────────────────────────────────────────────────
  socket.on('member_progress_update', (data: { socketId: string; progressPct: number }) => {
    useMusicStore.getState().setMemberProgress(data.socketId, data.progressPct);
  });
}

// ─── Apply remote sync ────────────────────────────────────────────────────────

function _applyRemoteSync(data: SyncPayload): void {
  const store = useMusicStore.getState();
  const audio = _getAudio();

  // Calculate latency compensation (transit time)
  const now = Date.now();
  const latency = data.timestamp ? now - data.timestamp : 0;
  // Clamp latency to 0-5s
  const safeLatency = Math.min(Math.max(0, latency), 5000);

  isHandlingSync = true;

  try {
    switch (data.action) {
      case 'play':
        if (audio && data.positionMs != null) {
          // Add latency only if it was playing, but usually messages are sent for active events
          audio.currentTime = (data.positionMs + safeLatency) / 1000;
        }
        store.setIsPlaying(true);
        break;

      case 'pause':
        store.setIsPlaying(false);
        break;

      case 'seek':
        if (audio && data.positionMs != null) {
          const seekPos = (data.positionMs + safeLatency) / 1000;
          audio.currentTime = seekPos;
          store.setCurrentTime(seekPos);
        }
        break;

      case 'change_track':
        if (data.track) {
          const track = _normalizeTrack(data.track);
          if (track && store.currentTrack?.id !== track.id) {
            store.setCurrentTrack(track);
            store.setIsPlaying(true);
            // Seek after the track loads
            if (data.positionMs != null) {
              const onLoaded = () => {
                const a = _getAudio();
                if (a) a.currentTime = (data.positionMs + safeLatency) / 1000;
                a?.removeEventListener('loadedmetadata', onLoaded);
              };
              _getAudio()?.addEventListener('loadedmetadata', onLoaded);
            }
          }
        }
        break;
    }
  } finally {
    // Clear flag after a short delay so store listeners don't re-broadcast
    setTimeout(() => { isHandlingSync = false; }, 300);
  }
}

function _applyPartyState(data: PartyStatePayload): void {
  if (!data.track) return;
  const store = useMusicStore.getState();
  const track = _normalizeTrack(data.track);
  if (!track) return;

  isHandlingSync = true;

  store.setCurrentTrack(track);

  const seekAfterLoad = () => {
    const audio = _getAudio();
    
    // Calculate latency (transit time from server)
    const now = Date.now();
    const latency = data.timestamp ? now - data.timestamp : 0;
    const safeLatency = Math.min(Math.max(0, latency), 5000);

    if (audio && data.positionMs != null) {
      const adjustedPos = (data.positionMs + (data.isPlaying ? safeLatency : 0)) / 1000;
      audio.currentTime = adjustedPos;
      store.setCurrentTime(adjustedPos);
    }
    if (data.isPlaying) {
      store.setIsPlaying(true);
    } else {
      store.setIsPlaying(false);
    }
    
    if (data.isHostOnly !== undefined) store.setIsHostOnly(data.isHostOnly);
    if (data.vibe) store.setPartyVibe(data.vibe as any);

    setTimeout(() => { isHandlingSync = false; }, 300);
  };

  // Give the audio element a moment to load the new track
  setTimeout(seekAfterLoad, 500);
}

// ─── Party management ─────────────────────────────────────────────────────────

export function joinSyncParty(partyId: string): void {
  if (!socket) connectSyncService();

  useMusicStore.getState().setPartyId(partyId);
  useMusicStore.getState().setPartyMembers(0);

  if (socket?.connected) {
    socket.emit('join_party', partyId);
    if (useMusicStore.getState().displayName) {
      socket.emit('member_info', { displayName: useMusicStore.getState().displayName });
    }
  }
  // If not connected yet, the 'connect' handler will join once ready
}

export function leaveSyncParty(): void {
  const partyId = useMusicStore.getState().partyId;
  if (partyId && socket?.connected) {
    socket.emit('leave_party', partyId);
  }
  useMusicStore.getState().setPartyId(null);
  useMusicStore.getState().setPartyMembers(0);
  useMusicStore.getState().setPartyMembersList([]);
  useMusicStore.getState().clearChat();
}

export function generatePartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Send a chat message to the current party room. */
export function sendChatMessage(text: string): void {
  const store = useMusicStore.getState();
  if (!socket?.connected || !store.partyId || !text.trim()) return;

  socket.emit('chat_message', {
    partyId: store.partyId,
    message: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      senderId: socket.id,
      senderName: store.displayName || `User ${socket.id?.slice(0, 4)}`,
      timestamp: Date.now(),
    },
  });
}

/** Send display name to the server. */
export function sendMemberInfo(displayName: string): void {
  if (!socket?.connected) return;
  socket.emit('member_info', { displayName });
}

/** Get this client's socket ID. */
export function getSocketId(): string | null {
  return socket?.id ?? null;
}

/** Broadcast a queue addition to the party room. */
export function broadcastQueueAdd(track: Record<string, unknown>): void {
  const store = useMusicStore.getState();
  if (!socket?.connected || !store.partyId) return;
  socket.emit('queue_add', { partyId: store.partyId, track });
}

/** Emit a reaction. */
export function emitReaction(type: string): void {
  const store = useMusicStore.getState();
  if (!socket?.connected || !store.partyId) return;
  socket.emit('member_reaction', { partyId: store.partyId, type });
}

/** Emit a vote for a track. */
export function emitVote(trackId: string): void {
  const store = useMusicStore.getState();
  if (!socket?.connected || !store.partyId) return;
  socket.emit('vote_track', { partyId: store.partyId, trackId });
}

/** Update room settings (Host only). */
export function emitRoomSettings(isHostOnly: boolean, vibe: string): void {
  const store = useMusicStore.getState();
  if (!socket?.connected || !store.partyId) return;
  socket.emit('update_room_settings', { partyId: store.partyId, isHostOnly, vibe });
}

/** Emit local progress. */
export function emitProgress(progressPct: number): void {
  const store = useMusicStore.getState();
  if (!socket?.connected || !store.partyId) return;
  socket.emit('member_progress', { partyId: store.partyId, progressPct });
}




// ─── Broadcast ────────────────────────────────────────────────────────────────

export function broadcastPlayback(
  action: SyncPayload['action'],
  positionMs: number,
  track?: Record<string, unknown>,
): void {
  if (isHandlingSync) return; // Don't echo received events back

  const store = useMusicStore.getState();
  const partyId = store.partyId;
  if (!socket?.connected || !partyId) return;

  const currentTrack = store.currentTrack;
  if (!currentTrack) return;

  const payload: SyncPayload = {
    partyId,
    action,
    trackId: currentTrack.id,
    positionMs: Math.round(positionMs),
    timestamp: Date.now(),
  };

  if (track) payload.track = track;
  if (action === 'change_track' && currentTrack) {
    payload.track = currentTrack as unknown as Record<string, unknown>;
  }

  socket.emit('sync_playback', payload);
}

// ─── Store subscription ───────────────────────────────────────────────────────

/**
 * Subscribe to store changes and broadcast them to the party room.
 * Must be called once after the store is initialized.
 */
export function startSyncBroadcasting(): () => void {
  let prevIsPlaying = false;
  let prevTrackId: string | null = null;

  const unsubscribe = useMusicStore.subscribe((state) => {
    if (!state.partyId || isHandlingSync) return;

    // Track changed
    if (state.currentTrack?.id !== prevTrackId) {
      prevTrackId = state.currentTrack?.id ?? null;
      if (state.currentTrack) {
        broadcastPlayback('change_track', (state.currentTime ?? 0) * 1000);
      }
    }

    // Play/pause toggled
    if (state.isPlaying !== prevIsPlaying) {
      prevIsPlaying = state.isPlaying;
      const audio = _getAudio();
      const posMs = audio ? audio.currentTime * 1000 : 0;
      broadcastPlayback(state.isPlaying ? 'play' : 'pause', posMs);
    }
  });

  return unsubscribe;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get the active <audio> element from the DOM. */
function _getAudio(): HTMLAudioElement | null {
  return (document.querySelector('audio') as HTMLAudioElement | null);
}

/** Normalise a raw track payload from the socket into a web Track shape. */
function _normalizeTrack(raw: Record<string, unknown>): import('@/types').Track | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Unknown'),
    artist: String(raw.artist ?? 'Unknown'),
    album: String(raw.album ?? 'Unknown'),
    duration: Number(raw.duration ?? 0),
    filename: String(raw.filename ?? ''),
    coverUrl: raw.coverUrl ? String(raw.coverUrl) : undefined,
    sourceUrl: String(raw.sourceUrl ?? ''),
    addedAt: String(raw.addedAt ?? new Date().toISOString()),
    fileSize: Number(raw.fileSize ?? 0),
    format: String(raw.format ?? 'mp3'),
    playlistIds: Array.isArray(raw.playlistIds)
      ? (raw.playlistIds as string[])
      : [],
  } as import('@/types').Track;
}