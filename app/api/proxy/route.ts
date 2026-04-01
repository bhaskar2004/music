import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  const binDir = path.join(process.cwd(), 'bin');
  const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const YT_DLP_PATH = path.join(binDir, binName);

  if (!fs.existsSync(YT_DLP_PATH)) {
    return new Response('yt-dlp not found. Please run a download first to initialize the engine.', { status: 500 });
  }

  // Find ffmpeg/ffprobe
  let ffmpegLocation = '';
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const wingetLinks = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links');
    if (fs.existsSync(path.join(wingetLinks, 'ffmpeg.exe'))) {
      ffmpegLocation = wingetLinks;
    }
  }

  const args = [
    url,
    '-o', '-',
    '-x',
    '--audio-format', 'mp3',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--prefer-free-formats',
  ];

  if (ffmpegLocation) {
    args.push('--ffmpeg-location', ffmpegLocation);
  }

  const ytDlpProcess = spawn(YT_DLP_PATH, args);

  const stream = new ReadableStream({
    start(controller) {
      ytDlpProcess.stdout.on('data', (chunk) => controller.enqueue(chunk));
      ytDlpProcess.stderr.on('data', (data) => {
        // Log errors from yt-dlp to console but don't stop the stream
        // console.error(`[PROXY] yt-dlp stderr: ${data}`);
      });
      ytDlpProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`[PROXY] yt-dlp exited with code ${code}`);
        }
        controller.close();
      });
    },
    cancel() {
      ytDlpProcess.kill();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
