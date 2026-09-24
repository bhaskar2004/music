import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ─── Room state management ──────────────────────────────────────────────────
// Each room tracks its current playback state so new joiners can sync immediately.
const rooms = new Map();
// rooms: Map<partyId, { track, trackId, positionMs, isPlaying, lastUpdateTs }>
const cleanupTimers = new Map();
const ROOM_CLEANUP_DELAY = 60 * 1000; // 60 seconds grace period

function getRoomState(partyId) {
  return rooms.get(partyId) || null;
}

function setRoomState(partyId, data) {
  const existing = rooms.get(partyId) || { 
    hostId: null, 
    isHostOnly: false, 
    vibe: 'default',
    votes: new Map() // trackId -> Set of socketIds
  };
  
  rooms.set(partyId, {
    ...existing,
    track: data.track ?? existing.track ?? null,
    trackId: data.trackId ?? existing.trackId ?? '',
    positionMs: data.positionMs ?? existing.positionMs ?? 0,
    isPlaying: data.isPlaying ?? existing.isPlaying ?? false,
    hostId: data.hostId ?? existing.hostId,
    isHostOnly: data.isHostOnly ?? existing.isHostOnly ?? false,
    vibe: data.vibe ?? existing.vibe ?? 'default',
    lastUpdateTs: Date.now(),
  });
}

function getRoomMemberCount(io, partyId) {
  const room = io.sockets.adapter.rooms.get(partyId);
  return room ? room.size : 0;
}

function broadcastMemberCount(io, partyId) {
  const count = getRoomMemberCount(io, partyId);
  io.to(partyId).emit('party_members', { partyId, count });

  // Clean up empty rooms after a grace period
  if (count === 0) {
    if (!cleanupTimers.has(partyId)) {
      console.log(`[Room] Starting cleanup timer for empty room: ${partyId}`);
      const timer = setTimeout(() => {
        console.log(`[Room] Grace period expired. Deleting room: ${partyId}`);
        rooms.delete(partyId);
        cleanupTimers.delete(partyId);
      }, ROOM_CLEANUP_DELAY);
      cleanupTimers.set(partyId, timer);
    }
  } else {
    // If members rejoined, cancel the cleanup
    if (cleanupTimers.has(partyId)) {
      console.log(`[Room] Members rejoined. Cancelling cleanup for: ${partyId}`);
      clearTimeout(cleanupTimers.get(partyId));
      cleanupTimers.delete(partyId);
    }
  }
}

// Compute estimated current position accounting for elapsed time since last update
function getEstimatedPosition(partyId) {
  const state = getRoomState(partyId);
  if (!state) return 0;
  if (!state.isPlaying) return state.positionMs;
  const elapsed = Date.now() - state.lastUpdateTs;
  return state.positionMs + elapsed;
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

// ─── Member display names & colors ─────────────────────────────────────────
const memberNames = new Map(); // socketId → { displayName, color }
const AVATAR_COLORS = [
  '#06C167', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6',
  '#8b5cf6', '#ef4444', '#3b82f6', '#10b981', '#f97316',
];

function getMemberColor(socketId) {
  let hash = 0;
  for (let i = 0; i < socketId.length; i++) hash = ((hash << 5) - hash) + socketId.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function buildMembersList(io, partyId) {
  const room = io.sockets.adapter.rooms.get(partyId);
  if (!room) return [];
  const members = [];
  for (const sid of room) {
    const info = memberNames.get(sid) || { displayName: `User ${sid.slice(0, 4)}`, color: getMemberColor(sid) };
    members.push({ socketId: sid, displayName: info.displayName, color: info.color });
  }
  return members;
}

function broadcastMembersList(io, partyId) {
  const members = buildMembersList(io, partyId);
  io.to(partyId).emit('party_members_list', { partyId, members });
}

  io.on('connection', (socket) => {
    console.log(`[Socket] ✓ User connected: ${socket.id}`);

    // Track which parties this socket is in (for cleanup on disconnect)
    const joinedParties = new Set();

    // Join a specific party room
    socket.on('join_party', (partyId) => {
      if (!partyId || typeof partyId !== 'string') return;

      socket.join(partyId);
      joinedParties.add(partyId);
      console.log(`[Socket] ${socket.id} joined party: ${partyId}`);

      // Cancel cleanup if someone joins
      if (cleanupTimers.has(partyId)) {
        console.log(`[Room] Member joined. Cancelling cleanup for: ${partyId}`);
        clearTimeout(cleanupTimers.get(partyId));
        cleanupTimers.delete(partyId);
      }

      // Initialize room if it doesn't exist or assign host if none
      const existingState = getRoomState(partyId);
      if (!existingState) {
        setRoomState(partyId, { hostId: socket.id });
      } else if (!existingState.hostId) {
        setRoomState(partyId, { hostId: socket.id });
      }

      // Send current room state to the joining user
      const state = getRoomState(partyId);
      if (state) {
        socket.emit('party_state', {
          partyId,
          track: state.track,
          trackId: state.trackId,
          positionMs: getEstimatedPosition(partyId),
          isPlaying: state.isPlaying,
          isHostOnly: state.isHostOnly,
          vibe: state.vibe,
          hostId: state.hostId,
          timestamp: Date.now(),
        });
        
        // Also send current votes
        const votesObj = {};
        if (state.votes) {
          for (const [tid, set] of state.votes) {
            votesObj[tid] = set.size;
          }
        }
        socket.emit('votes_update', { partyId, votes: votesObj });
      }

      // Broadcast updated member count to all in room
      broadcastMemberCount(io, partyId);
      broadcastMembersList(io, partyId);
    });

    // Leave a party room
    socket.on('leave_party', (partyId) => {
      if (!partyId || typeof partyId !== 'string') return;

      socket.leave(partyId);
      joinedParties.delete(partyId);
      console.log(`[Socket] ${socket.id} left party: ${partyId}`);

      // Broadcast updated member count
      broadcastMemberCount(io, partyId);
      broadcastMembersList(io, partyId);
    });

    // Member info (display name)
    socket.on('member_info', (data) => {
      if (!data || typeof data !== 'object') return;
      const { displayName } = data;
      memberNames.set(socket.id, {
        displayName: typeof displayName === 'string' ? displayName.slice(0, 24) : `User ${socket.id.slice(0, 4)}`,
        color: getMemberColor(socket.id),
      });
      // Broadcast updated member list to all rooms this socket is in
      for (const partyId of joinedParties) {
        broadcastMembersList(io, partyId);
      }
    });

    // Broadcast playback state to the party
    socket.on('sync_playback', (data) => {
      if (!data || typeof data !== 'object') return;
      const { partyId, action, trackId, positionMs, track } = data;
      if (!partyId) return;

      const room = getRoomState(partyId);
      if (room?.isHostOnly && room.hostId !== socket.id) {
        console.log(`[Socket] Blocked non-host playback sync from ${socket.id}`);
        return;
      }

      // Update server-side room state
      const isPlaying = action === 'play' || action === 'change_track';
      const isPause = action === 'pause';

      setRoomState(partyId, {
        track: track ?? getRoomState(partyId)?.track,
        trackId: trackId ?? '',
        positionMs: positionMs ?? 0,
        isPlaying: isPause ? false : (isPlaying ? true : (getRoomState(partyId)?.isPlaying ?? false)),
      });

      // Relay to everyone else in the room
      socket.to(partyId).emit('playback_update', data);
    });

    // Reaction relay
    socket.on('member_reaction', (data) => {
      if (!data || !data.partyId) return;
      const info = memberNames.get(socket.id);
      io.to(data.partyId).emit('member_reaction', {
        type: data.type,
        senderName: info?.displayName || `User ${socket.id.slice(0, 4)}`,
        id: `${Date.now()}-${Math.random()}`
      });
    });

    // Voting
    socket.on('vote_track', (data) => {
      const { partyId, trackId } = data;
      if (!partyId || !trackId) return;
      
      const room = getRoomState(partyId);
      if (!room) return;
      
      if (!room.votes) room.votes = new Map();
      if (!room.votes.has(trackId)) room.votes.set(trackId, new Set());
      
      const voters = room.votes.get(trackId);
      if (voters.has(socket.id)) {
        voters.delete(socket.id); // Toggle off
      } else {
        voters.add(socket.id); // Toggle on
      }
      
      const votesObj = {};
      for (const [tid, set] of room.votes) {
        votesObj[tid] = set.size;
      }
      io.to(partyId).emit('votes_update', { partyId, votes: votesObj });
    });

    // Room Settings
    socket.on('update_room_settings', (data) => {
      const { partyId, isHostOnly, vibe } = data;
      if (!partyId) return;
      
      const room = getRoomState(partyId);
      if (!room || room.hostId !== socket.id) return;
      
      setRoomState(partyId, { isHostOnly, vibe });
      io.to(partyId).emit('room_settings_update', { 
        partyId, 
        isHostOnly: room.isHostOnly, 
        vibe: room.vibe 
      });
    });

    // Chat message relay
    socket.on('chat_message', (data) => {
      if (!data || typeof data !== 'object') return;
      const { partyId, message } = data;
      if (!partyId || !message) return;

      // Broadcast to everyone in the room (including sender for confirmation)
      io.to(partyId).emit('chat_message', {
        partyId,
        message: {
          ...message,
          senderId: socket.id,
          senderName: memberNames.get(socket.id)?.displayName || `User ${socket.id.slice(0, 4)}`,
          timestamp: Date.now(),
        },
      });
    });

    // Queue add relay — when a party member adds a track to shared queue
    socket.on('queue_add', (data) => {
      if (!data || typeof data !== 'object') return;
      const { partyId, track } = data;
      if (!partyId || !track) return;
      socket.to(partyId).emit('queue_add', { partyId, track });
    });

    // Member progress tracking
    socket.on('member_progress', (data) => {
      if (!data || !data.partyId) return;
      socket.to(data.partyId).emit('member_progress_update', {
        socketId: socket.id,
        progressPct: data.progressPct
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ✗ User disconnected: ${socket.id}`);
      memberNames.delete(socket.id);
      // Update member counts for all rooms this socket was in
      for (const partyId of joinedParties) {
        const room = getRoomState(partyId);
        if (room && room.hostId === socket.id) {
          // Assign new host
          const roomMembers = io.sockets.adapter.rooms.get(partyId);
          if (roomMembers && roomMembers.size > 0) {
            const nextHostId = roomMembers.values().next().value;
            room.hostId = nextHostId;
            console.log(`[Room] Host left. New host assigned: ${nextHostId}`);
            io.to(partyId).emit('room_settings_update', { 
              partyId, 
              isHostOnly: room.isHostOnly, 
              vibe: room.vibe,
              hostId: room.hostId
            });
          }
        }
        broadcastMemberCount(io, partyId);
        broadcastMembersList(io, partyId);
      }
      joinedParties.clear();
    });
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready with Socket.IO on http://${hostname}:${port}`);
  });
});
