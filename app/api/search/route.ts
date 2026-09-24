import { NextRequest, NextResponse } from 'next/server';
import YouTube, { Video, Channel, Playlist } from 'youtube-sr';
import { spawn } from 'child_process';
import { getYtDlpBinaryPath, YT_DLP_CLIENT_ARGS } from '@/lib/yt-dlp-helper';

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
        duration: Math.round(video.duration ? video.duration / 1000 : 0),
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

// Fallback search using yt-dlp binary with Android client spoofing
async function searchWithYtDlp(query: string, limit: number): Promise<any[]> {
  try {
    const binaryPath = await getYtDlpBinaryPath();
    return new Promise((resolve) => {
      console.log(`[SEARCH] Fallback: Fetching from yt-dlp for "${query}"...`);
      const args = [
        `ytsearch${limit}:${query}`,
        '--dump-json',
        '--flat-playlist',
        ...YT_DLP_CLIENT_ARGS,
      ];

      const child = spawn(binaryPath, args);
      let output = '';
      let error = '';

      child.stdout.on('data', (d) => output += d.toString());
      child.stderr.on('data', (d) => error += d.toString());

      child.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[SEARCH] yt-dlp closed with code ${code}:`, error.slice(0, 150));
          return resolve([]);
        }

        try {
          const lines = output.trim().split('\n').filter(l => l.trim().length > 0);
          const results = lines.map(line => {
            try {
              const data = JSON.parse(line);
              if (!data.id) return null;
              const durationSec = Math.round(data.duration || 0);
              const mins = Math.floor(durationSec / 60);
              const secs = durationSec % 60;
              return {
                id: data.id,
                title: data.title,
                artist: data.uploader || data.channel || 'Unknown',
                duration: durationSec,
                durationFormatted: data.duration_string || `${mins}:${secs < 10 ? '0' : ''}${secs}`,
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

      child.on('error', (err) => {
        console.warn(`[SEARCH] yt-dlp process error:`, err.message);
        resolve([]);
      });
    });
  } catch (err: any) {
    console.warn(`[SEARCH] yt-dlp path resolution error:`, err.message);
    return [];
  }
}

// Guaranteed cloud-proof fallback: iTunes Search API
async function searchWithITunes(query: string, limit: number): Promise<any[]> {
  try {
    console.log(`[SEARCH] Fallback: Fetching from iTunes API for "${query}"...`);
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WavelengthApp/1.0)' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.results || !Array.isArray(json.results)) return [];

    return json.results.map((item: any) => {
      const durationSec = Math.round((item.trackTimeMillis || 0) / 1000);
      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      const queryStr = `${item.artistName} - ${item.trackName}`;
      return {
        id: `itunes-${item.trackId}`,
        title: item.trackName || 'Unknown Title',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Unknown Album',
        duration: durationSec,
        durationFormatted: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
        thumbnail: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}`,
      };
    });
  } catch (err: any) {
    console.warn('[SEARCH] iTunes search error:', err.message);
    return [];
  }
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
    return NextResponse.json({ results: cached.results }, {
      headers: { 'X-Cache': 'HIT' }
    });
  }

  try {
    let results: any[] = [];
    let method = 'youtube-sr:video';

    // Tier 1: youtube-sr (fast direct search)
    try {
      const rawResults = await YouTube.search(query, { limit: 20, type: 'video' });
      results = mapYoutubeSR(rawResults, query);
    } catch (err: any) {
      console.warn(`[SEARCH] Tier 1 youtube-sr (video) failed:`, err.message);
    }

    // Tier 2: yt-dlp with android client spoofing (bypasses datacenter block)
    if (results.length === 0) {
      method = 'yt-dlp';
      results = await searchWithYtDlp(query, 20);
    }

    // Tier 3: iTunes Search API (100% cloud-proof guaranteed fallback)
    if (results.length === 0) {
      method = 'itunes';
      results = await searchWithITunes(query, 20);
    }

    // Deduplicate results
    const seen = new Set<string>();
    results = results.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    // Store in cache
    if (results.length > 0) {
      searchCache.set(query, {
        results,
        expires: Date.now() + CACHE_TTL
      });
    }

    // Cache size management
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
    // Last ditch emergency fallback to iTunes so the user NEVER gets an empty search error screen
    const emergencyResults = await searchWithITunes(query, 20);
    return NextResponse.json({ results: emergencyResults, fallback: true });
  }
}
