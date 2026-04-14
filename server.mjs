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

    // Join a specific party room
    socket.on('join_party', (partyId) => {
      socket.join(partyId);
      console.log(`[Socket] ${socket.id} joined party: ${partyId}`);
    });

    // Leave a party room
    socket.on('leave_party', (partyId) => {
      socket.leave(partyId);
      console.log(`[Socket] ${socket.id} left party: ${partyId}`);
    });

    // Broadcast playback state to the party
    socket.on('sync_playback', (data) => {
      // data shape: { partyId, action (play/pause/seek/track), trackObj, positionMs, ... }
      const { partyId } = data;
      if (partyId) {
        socket.to(partyId).emit('playback_update', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] ✗ User disconnected: ${socket.id}`);
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
