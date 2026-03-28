import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

// Sanitize ID to prevent path traversal attacks
function isValidId(id: string): boolean {
  return /^[a-f0-9-]{36}$/.test(id);
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
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    const body = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(body, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'audio/mpeg',
      },
    });
  }

  const stream = fs.createReadStream(filePath);
  const body = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  return new NextResponse(body, {
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    },
  });
}
