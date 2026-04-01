import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const PLAYLISTS_PATH = path.join(process.cwd(), 'data', 'playlists.json');
const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

function readData(filePath: string): any[] {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeData(filePath: string, data: any[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  try {
    // Remove playlist metadata
    const playlists = readData(PLAYLISTS_PATH);
    const updatedPlaylists = playlists.filter((p: any) => p.id !== id);
    writeData(PLAYLISTS_PATH, updatedPlaylists);

    // Remove association from all tracks
    const library = readData(LIBRARY_PATH);
    const updatedLibrary = library.map((track: any) => {
      if (track.playlistIds) {
        return {
          ...track,
          playlistIds: track.playlistIds.filter((pid: string) => pid !== id)
        };
      }
      if (track.folderId === id) {
        const { folderId, ...rest } = track;
        return rest;
      }
      return track;
    });
    writeData(LIBRARY_PATH, updatedLibrary);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
