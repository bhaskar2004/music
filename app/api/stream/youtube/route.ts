import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const binDir = path.join(process.cwd(), 'bin');
const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const YT_DLP_PATH = path.join(binDir, binName);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('v');

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Invalid or missing YouTube Video ID' }, { status: 400 });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  
  // Use yt-dlp to get the best audio URL
  const args = [
    url,
    '--get-url',
    '--format', 'bestaudio',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--cookies-from-browser', 'chrome' // Optional, helps with throttles
  ];

  try {
    // We use spawn instead of execPromise for better control and because we might want to pipe directly later
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

    const cleanDirectUrl = directUrl.trim();
    
    // Now proxy the direct URL to the client
    const response = await fetch(cleanDirectUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to proxy YouTube stream' }, { status: response.status });
    }

    // Set headers for streaming
    const headers = new Headers();
    headers.set('Content-Type', 'audio/mpeg'); // Most yt-dlp bestaudio is opus/m4a, but mpeg is a safe fallback for some players or we can be more specific
    if (response.headers.has('Content-Length')) {
      headers.set('Content-Length', response.headers.get('Content-Length')!);
    }
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (err: any) {
    console.error('[YT-STREAM] Unexpected error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
