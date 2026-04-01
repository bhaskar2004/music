import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const PLAYLISTS_PATH = path.join(process.cwd(), 'data', 'playlists.json');

function readPlaylists(): any[] {
  try {
    const data = fs.readFileSync(PLAYLISTS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writePlaylists(data: any[]) {
  const dir = path.dirname(PLAYLISTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PLAYLISTS_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json({ playlists: readPlaylists() });
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const playlists = readPlaylists();
    const newPlaylist = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    writePlaylists(playlists);

    return NextResponse.json(newPlaylist);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
