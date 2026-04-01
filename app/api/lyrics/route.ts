import { NextRequest, NextResponse } from 'next/server';

function getSearchQueries(title: string, artist: string): string[] {
  const noise = /\b(official|video|audio|full|song|lyrics|hd|4k|high res|track|vevo|records|series|music|video|audio|original)\b/gi;
  const clean = (s: string) => s.replace(/[\(\[].*?[\)\]]/g, '').replace(noise, '').replace(/\s+/g, ' ').trim();

  const queries: string[] = [];
  
  const cTitle = clean(title);
  const cArtist = clean(artist);

  // 1. Combined Artist + Title (Best for specific matches)
  if (cArtist && cTitle) queries.push(`${cArtist} ${cTitle}`);
  
  // 2. Title + Artist (Alternative ordering)
  if (cArtist && cTitle) queries.push(`${cTitle} ${cArtist}`);

  // 3. Title only
  if (cTitle) queries.push(cTitle);

  // 4. Handle "Title - Movie | Artist" formats
  const segments = title.split(/\s*[\|:]\s*|\s-\s/);
  if (segments.length > 1) {
    const firstTwo = clean(`${segments[0]} ${segments[1]}`);
    if (firstTwo && !queries.includes(firstTwo)) queries.push(firstTwo);
    
    const firstOnly = clean(segments[0]);
    if (firstOnly && !queries.includes(firstOnly)) queries.push(firstOnly);
  }

  // 5. Raw-ish title (Last resort: just remove brackets/parentheses)
  const semiRaw = title.replace(/[\(\[].*?[\)\]]/g, '').trim();
  if (semiRaw && !queries.includes(semiRaw)) queries.push(semiRaw);

  return Array.from(new Set(queries)).filter(q => q.length > 2);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawArtist = searchParams.get('artist') || '';
  const rawTitle = searchParams.get('title') || '';

  if (!rawArtist && !rawTitle) {
    return NextResponse.json({ error: 'Artist or title is required' }, { status: 400 });
  }

  const queries = getSearchQueries(rawTitle, rawArtist);
  const headers = {
    'User-Agent': 'WavelengthMusicApp/1.0 (https://github.com/bhaskar2004/music-app)'
  };

  console.log(`[LYRICS_API] Generated ${queries.length} queries:`, queries);

  try {
    for (const query of queries) {
      console.log(`[LYRICS_API] Searching: "${query}"`);
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, { headers });

      if (response.ok) {
        const results = await response.json();
        if (results && Array.isArray(results) && results.length > 0) {
          // Find the best match among results
          // For now, take the first one, but could be improved with string similarity
          console.log(`[LYRICS_API] Found match for "${query}": ${results[0].trackName} by ${results[0].artistName}`);
          return NextResponse.json(results[0]);
        }
      }
    }

    return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
  } catch (error: any) {
    console.error('[LYRICS_API] Error in lyrics route:', error);
    return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
  }
}

