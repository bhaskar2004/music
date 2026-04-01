import { NextRequest, NextResponse } from 'next/server';

function cleanMetadata(text: string): string {
  if (!text) return '';
  return text
    .replace(/\(Official Video\)/gi, '')
    .replace(/\[HD\]/gi, '')
    .replace(/\[4K\]/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\(Audio\)/gi, '')
    .replace(/Full Song/gi, '')
    .replace(/Full Video/gi, '')
    .replace(/\(Video\)/gi, '')
    .replace(/Official/gi, '')
    .replace(/Video/gi, '')
    .replace(/Audio/gi, '')
    // Remove anything in parentheses or brackets at the end
    .replace(/[\(\[].*?[\)\]]/g, '')
    // Split by common separators and take the first part if it's the title
    .split(/[|:-]/)[0]
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawArtist = searchParams.get('artist') || '';
  const rawTitle = searchParams.get('title') || '';

  if (!rawArtist && !rawTitle) {
    return NextResponse.json({ error: 'Artist or title is required' }, { status: 400 });
  }

  const artist = cleanMetadata(rawArtist);
  const title = cleanMetadata(rawTitle);

  const headers = {
    'User-Agent': 'WavelengthMusicApp/1.0 (https://github.com/bhaskar2004/music-app)'
  };

  try {
    // 1. Try exact match first
    const exactUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
    let response = await fetch(exactUrl, { headers });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // 2. Fallback to search if exact match fails
    console.log(`[LYRICS_API] Exact match failed for "${artist} - ${title}", trying search...`);
    const query = `${artist} ${title}`.trim();
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    response = await fetch(searchUrl, { headers });

    if (response.ok) {
       try {
          const results = await response.json();
          if (results && Array.isArray(results) && results.length > 0) {
            // Return the first candidate
            console.log(`[LYRICS_API] Found ${results.length} results for query "${query}". Using first result.`);
            return NextResponse.json(results[0]);
          }
       } catch (e) {
          console.error('[LYRICS_API] Parse error in search fallback:', e);
       }
    }

    return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[LYRICS_API] Error fetching lyrics:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}
