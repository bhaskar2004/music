import { NextRequest } from 'next/server';
import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    
    if (!url || typeof url !== 'string' || !url.trim()) {
      return new Response(JSON.stringify({ error: 'Missing or invalid URL' }), { status: 400 });
    }

    const binDir = path.join(process.cwd(), 'bin');
    const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const YT_DLP_PATH = path.join(binDir, binName);

    if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
    
    if (!fs.existsSync(YT_DLP_PATH)) {
      await YTDlpWrap.downloadFromGithub(YT_DLP_PATH);
    }

    const ytDlp = new YTDlpWrap(YT_DLP_PATH);
    const commonArgs = ['--flat-playlist', '--dump-json', '--no-warnings', '--no-check-certificates'];
    
    let output: string;
    try {
      // Attempt 1: Without cookies
      console.log(`[PLAYLIST] Attempting extraction without cookies for ${url}`);
      output = await ytDlp.execPromise([url, ...commonArgs]);
    } catch (err: any) {
      const errMsg = err?.message || err?.stderr || '';
      if (errMsg.includes('Sign in to confirm') || errMsg.includes('registered users') || errMsg.includes('bot')) {
        console.log(`[PLAYLIST] Auth required, attempting extraction with cookies for ${url}`);
        try {
          output = await ytDlp.execPromise([url, ...commonArgs, '--cookies-from-browser', 'chrome']);
        } catch (innerErr: any) {
          const innerMsg = innerErr?.message || innerErr?.stderr || '';
          if (innerMsg.includes('Could not copy Chrome cookie database')) {
             // Fallback to strict single URL if playlist extraction is blocked by lock
             // Or we could just return the single URL
             return new Response(JSON.stringify({ urls: [url] }), { status: 200 });
          }
          throw innerErr;
        }
      } else {
        // For other errors, just fallback to the single URL instead of failing entirely
        return new Response(JSON.stringify({ urls: [url] }), { status: 200 });
      }
    }

    if (!output.trim()) {
      return new Response(JSON.stringify({ urls: [url] }), { status: 200 }); // fallback
    }

    const items = output.trim().split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    
    const urls = items.map(item => item.url || (item.id ? `https://youtube.com/watch?v=${item.id}` : null)).filter(Boolean);

    return new Response(JSON.stringify({ urls }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}
