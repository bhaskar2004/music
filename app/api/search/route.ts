import { NextRequest, NextResponse } from 'next/server';
import YouTube from 'youtube-sr';

// Simple in-memory cache for search results
// Map<query, { results: any[], expires: number }>
const searchCache = new Map<string, { results: any[], expires: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  // Check cache
  const cached = searchCache.get(query);
  if (cached && cached.expires > Date.now()) {
    console.log(`[SEARCH] Cache HIT for: "${query}"`);
    return NextResponse.json({ results: cached.results }, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  console.log(`[SEARCH] Cache MISS for: "${query}", fetching from YouTube...`);

  try {
    const results = await YouTube.search(query, {
      limit: 20,
      type: 'video',
    });

    const parsedResults = results.map((video) => ({
      id: video.id,
      title: video.title,
      artist: video.channel?.name || 'Unknown',
      duration: video.duration,
      durationFormatted: video.durationFormatted,
      thumbnail: video.thumbnail?.url || '',
      url: video.url,
    }));

    // Store in cache
    searchCache.set(query, {
      results: parsedResults,
      expires: Date.now() + CACHE_TTL
    });

    // Strategy: periodic cleanup of very old cache entries to prevent memory growth
    if (searchCache.size > 500) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }

    return NextResponse.json({ results: parsedResults }, {
      headers: { 'X-Cache': 'MISS' }
    });
  } catch (error: any) {
    console.error(`[SEARCH] YouTube API error:`, error.message);
    return NextResponse.json(
      { error: error.message || 'Error fetching search results' },
      { status: 500 }
    );
  }
}
