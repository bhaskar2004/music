import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get('artist');
  const title = searchParams.get('title');

  if (!artist || !title) {
    return NextResponse.json({ error: 'Artist and title are required' }, { status: 400 });
  }

  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WavelengthMusicApp/1.0 (https://github.com/bhaskar2004/music-app)'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
      }
      throw new Error(`LRCLIB returned ${response.status}`);
    }

    const data = await response.json();
    
    // Return a clean structure
    return NextResponse.json({
      id: data.id,
      trackName: data.trackName,
      artistName: data.artistName,
      albumName: data.albumName,
      duration: data.duration,
      instrumental: data.instrumental,
      plainLyrics: data.plainLyrics,
      syncedLyrics: data.syncedLyrics,
    });
  } catch (error: any) {
    console.error('[LYRICS_API] Error fetching lyrics:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}
