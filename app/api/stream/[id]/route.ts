import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

// Sanitize ID to prevent path traversal attacks
function isValidId(id: string): boolean {
  return /^[a-f0-9-]{36}$/.test(id);
}

/** Convert a Node.js Readable into a web ReadableStream with backpressure. */
function nodeStreamToWeb(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      // Pause immediately — we pull on demand
      nodeStream.pause();

      nodeStream.on('error', (err) => {
        try { controller.error(err); } catch { /* already closed */ }
        nodeStream.destroy();
      });

      nodeStream.on('end', () => {
        try { controller.close(); } catch { /* already closed */ }
      });
    },

    pull(controller) {
      return new Promise<void>((resolve) => {
        const chunk = nodeStream.read();
        if (chunk !== null) {
          controller.enqueue(new Uint8Array(chunk));
          resolve();
          return;
        }
        // No data available yet — wait for 'readable'
        const onReadable = () => {
          cleanup();
          const data = nodeStream.read();
          if (data !== null) {
            controller.enqueue(new Uint8Array(data));
          }
          resolve();
        };
        const onEnd = () => {
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
          resolve();
        };
        const onError = (err: Error) => {
          cleanup();
          try { controller.error(err); } catch { /* already closed */ }
          resolve();
        };
        const cleanup = () => {
          nodeStream.removeListener('readable', onReadable);
          nodeStream.removeListener('end', onEnd);
          nodeStream.removeListener('error', onError);
        };
        nodeStream.on('readable', onReadable);
        nodeStream.on('end', onEnd);
        nodeStream.on('error', onError);
      });
    },

    cancel() {
      nodeStream.destroy();
    },
  });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate the ID format
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid track ID' }, { status: 400 });
  }

  let library: Array<{ id: string; filename: string }>;
  try {
    library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8'));
  } catch {
    return NextResponse.json({ error: 'Library not available' }, { status: 500 });
  }

  const track = library.find((t) => t.id === id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // Ensure filename doesn't contain path traversal
  const safeFilename = path.basename(track.filename);
  const filePath = path.join(AUDIO_DIR, safeFilename);

  // Verify the resolved path is still within AUDIO_DIR
  if (!filePath.startsWith(AUDIO_DIR)) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Validate range
    if (isNaN(start) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}`, ...CORS_HEADERS },
      });
    }

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    return new NextResponse(nodeStreamToWeb(stream), {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'audio/mpeg',
        ...CORS_HEADERS,
      },
    });
  }

  const stream = fs.createReadStream(filePath);

  return new NextResponse(nodeStreamToWeb(stream), {
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      ...CORS_HEADERS,
    },
  });
}
