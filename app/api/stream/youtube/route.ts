import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { Readable } from 'stream';

const binDir = path.join(process.cwd(), 'bin');
const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const YT_DLP_PATH = path.join(binDir, binName);

// Simple in-memory cache for direct URLs
const urlCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('v');
  console.log(`[YT-STREAM] Received request for videoId: ${videoId} from ${req.headers.get('user-agent')}`);

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid or missing YouTube Video ID' }, { status: 400 });
  }

  const range = req.headers.get('range');
  let cleanDirectUrl = '';

  // Check cache first
  const cached = urlCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    cleanDirectUrl = cached.url;
    console.log(`[YT-STREAM] Cache hit for ${videoId}`);
  } else {
    console.log(`[YT-STREAM] Cache miss for ${videoId}, fetching new URL...`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    const tryFetchUrl = async (useCookies: boolean) => {
      const args = [
        url,
        '--get-url',
        '-f', 'bestaudio',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      ];
      if (useCookies) {
        args.push('--cookies-from-browser', 'chrome');
      }

      const child = spawn(YT_DLP_PATH, args);
      let output = '';
      let error = '';

      child.stdout.on('data', (d) => output += d.toString());
      child.stderr.on('data', (d) => error += d.toString());

      const code = await new Promise<number>((resolve) => child.on('close', resolve));
      return { code, output: output.trim(), error: error.trim() };
    };

    try {
      // Attempt 1: Without cookies
      let result = await tryFetchUrl(false);
      
      // Attempt 2: With cookies if needed
      if (result.code !== 0 || !result.output) {
        console.warn('[YT-STREAM] Initial fetch failed, trying with cookies...', result.error);
        const cookieResult = await tryFetchUrl(true);
        if (cookieResult.code === 0 && cookieResult.output) {
          result = cookieResult;
        }
      }

      if (result.code !== 0 || !result.output) {
        console.error('[YT-STREAM] yt-dlp failed completely:', result.error);
        return NextResponse.json(
          { error: 'YouTube extraction failed', details: result.error },
          { status: 500, headers: CORS_HEADERS }
        );
      }

      cleanDirectUrl = result.output.split('\n')[0]; // Take first URL if multiple
      urlCache.set(videoId, { url: cleanDirectUrl, expires: Date.now() + CACHE_TTL });
    } catch (err: any) {
      console.error('[YT-STREAM] Unexpected error during extraction:', err.message);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500, headers: CORS_HEADERS }
      );
    }
  }

  // ── Prefetch mode: only warm the URL cache, don't stream ──
  const prefetch = searchParams.get('prefetch');
  if (prefetch === '1') {
    console.log(`[YT-STREAM] Prefetch complete for ${videoId}`);
    return NextResponse.json(
      { ok: true, videoId, cached: true },
      { headers: CORS_HEADERS }
    );
  }

  try {
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Referer': 'https://www.youtube.com/',
    };
    if (range) {
      proxyHeaders['Range'] = range;
    }

    const response = await fetch(cleanDirectUrl, {
      headers: proxyHeaders,
      cache: 'no-store',  // Prevent Next.js from buffering/caching
    });

    if (!response.ok && response.status !== 206) {
      console.error(`[YT-STREAM] Upstream proxy failed with status ${response.status} for ${videoId}`);
      urlCache.delete(videoId);
      return NextResponse.json(
        { error: 'Upstream proxy failed' },
        { status: response.status, headers: CORS_HEADERS }
      );
    }

    const headers = new Headers();
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
    headers.set('Content-Type', contentType);
    
    if (response.headers.has('Content-Length')) {
      headers.set('Content-Length', response.headers.get('Content-Length')!);
    }
    if (response.headers.has('Content-Range')) {
      headers.set('Content-Range', response.headers.get('Content-Range')!);
    }
    
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('X-Accel-Buffering', 'no');

    // Merge CORS headers
    for (const [key, val] of Object.entries(CORS_HEADERS)) {
      headers.set(key, val);
    }

    return new NextResponse(Readable.toWeb(upstream as any) as any, {
      status: response.status,
      headers,
    });
  } catch (err: any) {
    console.error('[YT-STREAM] Proxy logic error:', err.message);
    urlCache.delete(videoId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
