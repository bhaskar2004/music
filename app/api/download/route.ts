import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import YTDlpWrap from 'yt-dlp-wrap';
import * as musicMetadata from 'music-metadata';

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

function readLibrary() {
  try { return JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf-8')); }
  catch { return []; }
}
function writeLibrary(data: unknown[]) {
  fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2));
}
function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// SSE helper — encodes a named event + JSON payload
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  // Validate Content-Type
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return new Response('Content-Type must be application/json', { status: 400 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return new Response('Missing or invalid URL', { status: 400 });
  }

  // Validate URL protocol (only http/https)
  try {
    const parsed = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return new Response('Only http and https URLs are supported', { status: 400 });
    }
  } catch {
    return new Response('Invalid URL format', { status: 400 });
  }

  ensureAudioDir();
  const id = uuidv4();

  // Build a ReadableStream that we drive manually so we can push SSE frames
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(new TextEncoder().encode(sseEvent(event, data))); }
        catch { /* client disconnected */ }
      };

      try {
        // ── 1. Fetch metadata ────────────────────────────────────────────
        send('status', { stage: 'metadata', message: 'Fetching track info…' });

        const binDir = path.join(process.cwd(), 'bin');
        const binName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        const YT_DLP_PATH = path.join(binDir, binName);

        if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

        if (!fs.existsSync(YT_DLP_PATH)) {
          send('status', { stage: 'metadata', message: 'Downloading yt-dlp engine (first run only)…' });
          await YTDlpWrap.downloadFromGithub(YT_DLP_PATH);
        }

        const ytDlp = new YTDlpWrap(YT_DLP_PATH);

        // Find ffmpeg/ffprobe installed via winget
        let ffmpegLocation = '';
        if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
          const wingetLinks = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links');
          if (fs.existsSync(path.join(wingetLinks, 'ffmpeg.exe'))) {
            ffmpegLocation = wingetLinks;
          }
        }

        const argsMeta = [url, '--dump-json', '--no-playlist'];
        if (ffmpegLocation) Object.assign(argsMeta, [...argsMeta, '--ffmpeg-location', ffmpegLocation]);
        
        const metaRaw = await ytDlp.execPromise(argsMeta);
        const meta = JSON.parse(metaRaw);

        const title: string   = meta.title    ?? 'Unknown Title';
        const artist: string  = meta.uploader ?? meta.artist ?? 'Unknown Artist';
        const album: string   = meta.album    ?? meta.playlist ?? 'Unknown Album';
        const thumbnail: string | undefined = meta.thumbnail;

        send('metadata', { title, artist, album, thumbnail });

        // ── 2. Download audio with live progress ─────────────────────────
        send('status', { stage: 'downloading', message: 'Downloading audio…' });

        const outputTemplate = path.join(AUDIO_DIR, `${id}.%(ext)s`);

        const execArgs = [
            url,
            '--no-playlist',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
            '--add-metadata',
            '-o', outputTemplate,
        ];
        if (ffmpegLocation) {
            execArgs.push('--ffmpeg-location', ffmpegLocation);
        }

        console.log(`[DOWNLOAD] Starting download for ${url} with ID ${id}`);
        await new Promise<void>((resolve, reject) => {
          const emitter = ytDlp.exec(execArgs);

          emitter.on('progress', (p: { percent?: number; totalSize?: string; currentSpeed?: string; eta?: string }) => {
            send('progress', {
              percent: isNaN(p.percent ?? NaN) ? 0 : Math.round(p.percent!),
              totalSize:    p.totalSize    ?? '',
              currentSpeed: p.currentSpeed ?? '',
              eta:          p.eta          ?? '',
            });
          });

          emitter.on('ytDlpEvent', (event: string, data: string) => {
            console.log(`[DOWNLOAD] yt-dlp event [${event}]:`, data.slice(0, 100));
            if (event === 'ffmpeg') {
              send('status', { stage: 'processing', message: 'Converting to MP3…' });
            }
          });

          emitter.on('error', (err) => {
            console.error(`[DOWNLOAD] yt-dlp error for ${id}:`, err);
            reject(err);
          });
          emitter.on('close', () => {
            console.log(`[DOWNLOAD] yt-dlp closed for ${id}`);
            resolve();
          });
        });

        // ── 6. Persist to library ─────────────────────────────────────────
        console.log(`[DOWNLOAD] Finalizing track ${id}. Looking for files in ${AUDIO_DIR}`);
        const allFiles = fs.readdirSync(AUDIO_DIR);
        console.log(`[DOWNLOAD] All files in audio dir:`, allFiles);
        const files = allFiles.filter((f) => f.startsWith(id));
        console.log(`[DOWNLOAD] Matching files for ${id}:`, files);

        if (!files.length) {
          console.error(`[DOWNLOAD] ERROR: No files found starting with ${id}`);
          throw new Error('Download failed — file not found');
        }

        const filename = files[0];
        const filePath = path.join(AUDIO_DIR, filename);
        const stats    = fs.statSync(filePath);

        // ── 4. Parse audio metadata ───────────────────────────────────────
        let duration = meta.duration ?? 0;
        let format   = 'mp3';
        try {
          const audioMeta = await musicMetadata.parseFile(filePath);
          duration = Math.round(audioMeta.format.duration ?? duration);
          format   = audioMeta.format.codec ?? 'mp3';
        } catch (e: any) {
          console.warn(`[DOWNLOAD] Metadata parse warning for ${id}:`, e.message);
        }

        // ── 5. Download thumbnail ─────────────────────────────────────────
        let coverUrl: string | undefined;
        if (thumbnail) {
          try {
            const thumbRes = await fetch(thumbnail);
            if (thumbRes.ok) {
              const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());
              const thumbFile   = `${id}_cover.jpg`;
              fs.writeFileSync(path.join(AUDIO_DIR, thumbFile), thumbBuffer);
              coverUrl = `/audio/${thumbFile}`;
            }
          } catch (e: any) {
            console.warn(`[DOWNLOAD] Thumbnail download failed for ${id}:`, e.message);
          }
        }

        const track = {
          id, title, artist, album, duration, filename,
          coverUrl, sourceUrl: url,
          addedAt: new Date().toISOString(),
          fileSize: stats.size,
          format,
        };

        const library = readLibrary();
        library.unshift(track);
        writeLibrary(library);

        console.log(`[DOWNLOAD] Successfully added track: ${title} (${id})`);
        send('done', { track });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Download error:', message);
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering if behind proxy
    },
  });
}
