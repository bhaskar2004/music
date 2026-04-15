import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { Readable } from 'stream';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

// In-memory cache for library metadata
let libraryCache: any[] | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function getLibrary() {
  const now = Date.now();
  if (libraryCache && (now - lastCacheUpdate < CACHE_TTL)) {
    return libraryCache;
  }
  
  try {
    const data = await fsp.readFile(LIBRARY_PATH, 'utf-8');
    libraryCache = JSON.parse(data);
    lastCacheUpdate = now;
    return libraryCache;
  } catch (err) {
    console.error('[STREAM] Error loading library:', err);
    return [];
  }
}

// Sanitize ID to prevent path traversal attacks
function isValidId(id: string): boolean {
  return /^[a-f0-9-]{36}$/.test(id);
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

  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid track ID' }, { status: 400 });
  }

  const library = await getLibrary();
  const track = library.find((t) => t.id === id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  const safeFilename = path.basename(track.filename);
  const filePath = path.join(AUDIO_DIR, safeFilename);

  try {
    const stats = await fsp.stat(filePath);
    const fileSize = stats.size;
    const range = req.headers.get('range');

    const headers = new Headers({
      'Accept-Ranges': 'bytes',
      'Content-Type': 'audio/mpeg',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...CORS_HEADERS,
    });

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}`, ...CORS_HEADERS },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(filePath, { start, end });
      
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Content-Length', chunkSize.toString());

      console.log(`[STREAM] Partial stream: ${track.title} (${start}-${end})`);

      return new NextResponse(Readable.toWeb(nodeStream) as any, {
        status: 206,
        headers,
      });
    }

    const nodeStream = fs.createReadStream(filePath);
    headers.set('Content-Length', fileSize.toString());

    console.log(`[STREAM] Full stream: ${track.title}`);

    return new NextResponse(Readable.toWeb(nodeStream) as any, {
      headers,
    });

  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }
    console.error(`[STREAM] Unexpected error for ${id}:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
