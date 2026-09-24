import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getYtDlpBinaryPath, YT_DLP_CLIENT_ARGS } from '@/lib/yt-dlp-helper';

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

export async function handleYouTubeStream(videoId: string, req: NextRequest): Promise<NextResponse> {
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
    
    const tryFetchUrl = async () => {
      const binaryPath = await getYtDlpBinaryPath();
      const args = [
        url,
        '--get-url',
        '-f', 'bestaudio/best',
        ...YT_DLP_CLIENT_ARGS,
      ];

      const child = spawn(binaryPath, args);
      let output = '';
      let error = '';

      child.stdout.on('data', (d) => output += d.toString());
      child.stderr.on('data', (d) => error += d.toString());

      const code = await new Promise<number>((resolve) => child.on('close', resolve));
      return { code, output: output.trim(), error: error.trim() };
    };

    try {
      const result = await tryFetchUrl();

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

  // Prefetch mode
  const { searchParams } = new URL(req.url);
  const prefetch = searchParams.get('prefetch');
  if (prefetch === '1') {
    return NextResponse.json({ ok: true, videoId, cached: true }, { headers: CORS_HEADERS });
  }

  try {
    const proxyHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.youtube.com/',
    };
    if (range) {
      proxyHeaders['Range'] = range;
    }

    const response = await fetch(cleanDirectUrl, {
      headers: proxyHeaders,
      cache: 'no-store',
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

    for (const [key, val] of Object.entries(CORS_HEADERS)) {
      headers.set(key, val);
    }

    return new NextResponse(response.body, {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('v') || '';
  return handleYouTubeStream(videoId, req);
}
