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

function getRoomState(partyId) {
  return rooms.get(partyId) || null;
}

function setRoomState(partyId, data) {
  const existing = rooms.get(partyId) || {};
  rooms.set(partyId, {
    ...existing,
    track: data.track ?? existing.track ?? null,
    trackId: data.trackId ?? existing.trackId ?? '',
    positionMs: data.positionMs ?? existing.positionMs ?? 0,
    isPlaying: data.isPlaying ?? existing.isPlaying ?? false,
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
  // Clean up empty rooms
  if (count === 0) {
    rooms.delete(partyId);
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

      // Send current room state to the joining user
      if (state) {
        socket.emit('party_state', {
          partyId,
          track: state.track,
          trackId: state.trackId,
          positionMs: getEstimatedPosition(partyId),
          isPlaying: state.isPlaying,
          timestamp: Date.now(),
        });
      }

      // Broadcast updated member count to all in room
      broadcastMemberCount(io, partyId);
    });

    // Leave a party room
    socket.on('leave_party', (partyId) => {
      if (!partyId || typeof partyId !== 'string') return;

      socket.leave(partyId);
      joinedParties.delete(partyId);
      console.log(`[Socket] ${socket.id} left party: ${partyId}`);

      // Broadcast updated member count
      broadcastMemberCount(io, partyId);
    });

    // Broadcast playback state to the party
    socket.on('sync_playback', (data) => {
      if (!data || typeof data !== 'object') return;
      const { partyId, action, trackId, positionMs, track } = data;
      if (!partyId) return;

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

    socket.on('disconnect', () => {
      console.log(`[Socket] ✗ User disconnected: ${socket.id}`);
      // Update member counts for all rooms this socket was in
      for (const partyId of joinedParties) {
        broadcastMemberCount(io, partyId);
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
