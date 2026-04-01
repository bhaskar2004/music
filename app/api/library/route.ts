import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

function readLibrary(): Array<Record<string, unknown>> {
  try {
    const data = fs.readFileSync(LIBRARY_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLibrary(data: unknown[]) {
  const dir = path.dirname(LIBRARY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2));
}

const PLAYLISTS_PATH = path.join(process.cwd(), 'data', 'playlists.json');

function readPlaylists(): any[] {
  try {
    if (!fs.existsSync(PLAYLISTS_PATH)) return [];
    const data = fs.readFileSync(PLAYLISTS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET() {
  return NextResponse.json({ 
    tracks: readLibrary(),
    playlists: readPlaylists()
  });
}

export async function DELETE(req: NextRequest) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id } = body;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid track ID' }, { status: 400 });
  }

  // Validate UUID format
  if (!/^[a-f0-9-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid track ID format' }, { status: 400 });
  }

  const library = readLibrary();
  const track = library.find((t) => t.id === id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // Delete audio file
  try {
    if (track.filename && typeof track.filename === 'string') {
      const safeFilename = path.basename(track.filename as string);
      const audioPath = path.join(AUDIO_DIR, safeFilename);
      if (audioPath.startsWith(AUDIO_DIR) && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
    // Delete cover
    if (track.coverUrl && typeof track.coverUrl === 'string') {
      const coverFile = (track.coverUrl as string).replace('/audio/', '');
      const safeCover = path.basename(coverFile);
      const coverPath = path.join(AUDIO_DIR, safeCover);
      if (coverPath.startsWith(AUDIO_DIR) && fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
      }
    }
  } catch (err) {
    console.warn('[Library] File cleanup error:', err);
  }

  const updated = library.filter((t) => t.id !== id);
  writeLibrary(updated);

  return NextResponse.json({ success: true });
}
