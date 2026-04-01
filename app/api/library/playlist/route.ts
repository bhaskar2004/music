import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

function readLibrary(): any[] {
  try {
    const data = fs.readFileSync(LIBRARY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeLibrary(data: any[]) {
  fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const { trackId, playlistId, action } = await req.json(); // action: 'add' | 'remove'
    if (!trackId || !playlistId) {
      return NextResponse.json({ error: 'Missing trackId or playlistId' }, { status: 400 });
    }

    const library = readLibrary();
    const trackIdx = library.findIndex(t => t.id === trackId);
    if (trackIdx === -1) return NextResponse.json({ error: 'Track not found' }, { status: 404 });

    const track = library[trackIdx];
    let playlistIds = track.playlistIds || [];
    
    // Migration check: if track still has folderId, convert it
    if (track.folderId) {
      if (!playlistIds.includes(track.folderId)) playlistIds.push(track.folderId);
      delete track.folderId;
    }

    if (action === 'add') {
      if (!playlistIds.includes(playlistId)) playlistIds.push(playlistId);
    } else {
      playlistIds = playlistIds.filter((id: string) => id !== playlistId);
    }

    track.playlistIds = playlistIds;
    library[trackIdx] = track;
    writeLibrary(library);

    return NextResponse.json({ success: true, playlistIds });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
