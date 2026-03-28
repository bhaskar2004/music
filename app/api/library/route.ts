import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

function readLibrary() {
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLibrary(data: unknown[]) {
  fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json({ tracks: readLibrary() });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const library = readLibrary();
  const track = library.find((t: { id: string }) => t.id === id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  // Delete audio file
  try {
    const audioPath = path.join(AUDIO_DIR, track.filename);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    // Delete cover
    if (track.coverUrl) {
      const coverFile = track.coverUrl.replace('/audio/', '');
      const coverPath = path.join(AUDIO_DIR, coverFile);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }
  } catch {
    // File may already be gone
  }

  const updated = library.filter((t: { id: string }) => t.id !== id);
  writeLibrary(updated);

  return NextResponse.json({ success: true });
}
