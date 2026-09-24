import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { libraryManager } from '@/lib/library-manager';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
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
  const tracks = await libraryManager.getTracks();
  return NextResponse.json({ 
    tracks,
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
  if (!id || typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid track ID' }, { status: 400 });
  }

  const tracks = await libraryManager.getTracks();
  const track = tracks.find((t) => t.id === id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // Delete audio file and cover
  try {
    const filesToDelete = [
      track.filename,
      track.coverUrl?.replace('/audio/', '')
    ].filter(Boolean) as string[];

    for (const file of filesToDelete) {
      const safePath = path.join(AUDIO_DIR, path.basename(file));
      if (fs.existsSync(safePath)) {
        fs.unlinkSync(safePath);
      }
    }
  } catch (err) {
    console.warn('[Library] File cleanup error:', err);
  }

  await libraryManager.removeTrack(id);

  return NextResponse.json({ success: true });
}
