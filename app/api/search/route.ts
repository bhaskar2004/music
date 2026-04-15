import { NextRequest, NextResponse } from 'next/server';
import YouTube, { Video, Channel, Playlist } from 'youtube-sr';
import path from 'path';
import { spawn } from 'child_process';

const binDir = path.join(process.cwd(), 'bin');
const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const YT_DLP_PATH = path.join(binDir, binName);

// Simple in-memory cache for search results
interface CachedSearch {
  results: any[];
  expires: number;
}
const searchCache = new Map<string, CachedSearch>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Helper to manually filter and map youtube-sr results
function mapYoutubeSR(results: (Video | Channel | Playlist)[], query: string) {
  return results.map((video: any) => {
    try {
      if (!video || !video.id || !video.title) return null;
      return {
        id: video.id,
        title: video.title,
        artist: video.channel?.name || 'Unknown',
        duration: video.duration || 0,
        durationFormatted: video.durationFormatted || '0:00',
        thumbnail: video.thumbnail?.url || '',
        url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
      };
    } catch (err: any) {
      console.warn(`[SEARCH] Skipping malformed result for query "${query}":`, err.message);
      return null;
    }
  }).filter((v): v is any => v !== null);
}

// Fallback search using yt-dlp binary
async function searchWithYtDlp(query: string, limit: number): Promise<any[]> {
  return new Promise((resolve) => {
    console.log(`[SEARCH] Fallback: Fetching from yt-dlp for "${query}"...`);
    // ytsearchN:query returns N results in JSON format
    const args = [
      `ytsearch${limit}:${query}`,
      '--dump-json',
      '--no-playlist',
      '--flat-playlist',
      '--no-warnings',
    ];

    const child = spawn(YT_DLP_PATH, args);
    let output = '';
    let error = '';

    child.stdout.on('data', (d) => output += d.toString());
    child.stderr.on('data', (d) => error += d.toString());

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[SEARCH] yt-dlp failed with code ${code}:`, error);
        return resolve([]); // Resolve with empty on failure to allow other logic
      }

      try {
        const lines = output.trim().split('\n').filter(l => l.trim().length > 0);
        const results = lines.map(line => {
          try {
            const data = JSON.parse(line);
            if (!data.id) return null;
            return {
              id: data.id,
              title: data.title,
              artist: data.uploader || data.channel || 'Unknown',
              duration: (data.duration || 0) * 1000, // convert to ms
              durationFormatted: data.duration_string || '0:00',
              thumbnail: data.thumbnail || (data.thumbnails && data.thumbnails[0]?.url) || '',
              url: `https://www.youtube.com/watch?v=${data.id}`,
            };
          } catch {
            return null;
          }
        }).filter((v): v is any => v !== null);
        resolve(results);
      } catch (err: unknown) {
        console.error(`[SEARCH] Error parsing yt-dlp output:`, err);
        resolve([]);
      }
    });
  });
}

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
    let results: any[] = [];
    let method = 'youtube-sr:video';

    try {
      // Strategy 1: youtube-sr with type 'video' (Fastest, usually best metadata)
      const rawResults = await YouTube.search(query, { limit: 20, type: 'video' });
      results = mapYoutubeSR(rawResults, query);
    } catch (err: any) {
      console.warn(`[SEARCH] youtube-sr (video) failed for "${query}":`, err.message);
      
      // Strategy 2: youtube-sr with type 'all' (Bypasses some internal parsing crashes)
      try {
        method = 'youtube-sr:all';
        const rawResults = await YouTube.search(query, { limit: 20, type: 'all' });
        // Filter for only videos from the mixed result set
        const videoOnlyResults = rawResults.filter((r): r is Video => r instanceof Video || (r as any).type === 'video');
        results = mapYoutubeSR(videoOnlyResults, query);
      } catch (err2: any) {
        console.warn(`[SEARCH] youtube-sr (all) failed for "${query}":`, err2.message);
        
        // Strategy 3: yt-dlp (Most reliable fallback)
        method = 'yt-dlp';
        results = await searchWithYtDlp(query, 20);
      }
    }

    if (results.length === 0 && query.length > 5) {
      // Last ditch effort: if results were empty (but query was substantial), try yt-dlp search anyway
      // This handles cases where youtube-sr returns empty results incorrectly
      method = 'yt-dlp:retry';
      results = await searchWithYtDlp(query, 20);
    }

    // Ensure unique IDs to prevent React key collision errors
    const seen = new Set<string>();
    results = results.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    // Store in cache
    searchCache.set(query, {
      results,
      expires: Date.now() + CACHE_TTL
    });

    // Strategy: periodic cleanup of very old cache entries to prevent memory growth
    if (searchCache.size > 500) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey) searchCache.delete(firstKey);
    }

    return NextResponse.json({ results }, {
      headers: { 
        'X-Cache': 'MISS',
        'X-Search-Method': method 
      }
    });
  } catch (error: any) {
    console.error(`[SEARCH] Fatal search error:`, error.message);
    return NextResponse.json(
      { error: error.message || 'Error fetching search results' },
      { status: 500 }
    );
  }
}
