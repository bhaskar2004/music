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
    // Remove common Indian music channel suffixes from artists
    .replace(/ Music$/gi, '')
    .replace(/ Vevo$/gi, '')
    .replace(/ Records$/gi, '')
    .replace(/ Series$/gi, '')
    // Remove anything in parentheses or brackets at the end
    .replace(/[\(\[].*?[\)\]]/g, '')
    // Split by common separators and take the first part
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

    // 2. Fallback to search (Artist + Title)
    const queries = [];
    if (artist && title) queries.push(`${artist} ${title}`);
    if (title) queries.push(title); // Second fallback: just the title

    for (const query of queries) {
      console.log(`[LYRICS_API] Trying search fallback for query: "${query}"`);
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const searchResponse = await fetch(searchUrl, { headers });

      if (searchResponse.ok) {
        try {
          const results = await searchResponse.json();
          if (results && Array.isArray(results) && results.length > 0) {
            // Pick first result
            console.log(`[LYRICS_API] Found result for query "${query}": ${results[0].trackName} by ${results[0].artistName}`);
            return NextResponse.json(results[0]);
          }
        } catch (e) {
          console.error('[LYRICS_API] Error parsing search results:', e);
        }
      }
    }

    return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[LYRICS_API] Catch-all error in lyrics route:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}
