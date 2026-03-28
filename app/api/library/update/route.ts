import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

export async function POST(req: NextRequest) {
  try {
    const { trackId, folderId } = await req.json();
    if (!trackId) {
      return new Response('Missing trackId', { status: 400 });
    }

    if (!fs.existsSync(LIBRARY_PATH)) {
      return new Response('Library not found', { status: 404 });
    }

    const libraryData = fs.readFileSync(LIBRARY_PATH, 'utf-8');
    const library = JSON.parse(libraryData);

    let updated = false;
    const newLibrary = library.map((track: any) => {
      if (track.id === trackId) {
        updated = true;
        if (folderId) {
          track.folderId = folderId;
        } else {
          delete track.folderId;
        }
      }
      return track;
    });

    if (updated) {
      fs.writeFileSync(LIBRARY_PATH, JSON.stringify(newLibrary, null, 2));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response('Track not found', { status: 404 });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
