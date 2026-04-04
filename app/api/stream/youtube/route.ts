import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const binDir = path.join(process.cwd(), 'bin');
const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const YT_DLP_PATH = path.join(binDir, binName);

// Simple in-memory cache for direct URLs
const urlCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 3600 * 1000; // 1 hour

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('v');

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
    const args = [
      url,
      '--get-url',
      '--format', 'bestaudio',
      '--no-playlist',
      '--no-warnings',
      '--no-check-certificates',
      '--cookies-from-browser', 'chrome'
    ];

    try {
      const child = spawn(YT_DLP_PATH, args);
      let directUrl = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        directUrl += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        child.on('close', resolve);
      });

      if (exitCode !== 0 || !directUrl.trim()) {
        console.error('[YT-STREAM] yt-dlp failed:', errorOutput);
        return NextResponse.json({ error: 'Failed to fetch YouTube stream URL' }, { status: 500 });
      }

      cleanDirectUrl = directUrl.trim();
      urlCache.set(videoId, { url: cleanDirectUrl, expires: Date.now() + CACHE_TTL });
    } catch (err: any) {
      console.error('[YT-STREAM] Unexpected error:', err.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  try {
    // Proxy with Range support
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    };
    if (range) {
      proxyHeaders['Range'] = range;
    }

    const response = await fetch(cleanDirectUrl, { headers: proxyHeaders });

    if (!response.ok && response.status !== 206) {
      // If fetching fails, clear cache as URL might have expired
      urlCache.delete(videoId);
      return NextResponse.json({ error: 'Failed to proxy YouTube stream' }, { status: response.status });
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
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (err: any) {
    console.error('[YT-STREAM] Proxy error:', err.message);
    urlCache.delete(videoId);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
