import { NextRequest } from 'next/server';
import { downloadQueue } from '@/lib/download-queue';
import { libraryManager } from '@/lib/library-manager';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// SSE helper
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const { url, folderId } = await req.json();
    if (!url) return new Response('Missing URL', { status: 400 });

    const cleanUrl = url.trim();

    // 1. Check library via Manager (Optimized)
    const tracks = await libraryManager.getTracks();
    const existing = tracks.find(t => t.sourceUrl === cleanUrl);
    
    if (existing && fs.existsSync(path.join(AUDIO_DIR, existing.filename))) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseEvent('status', { stage: 'done', message: 'Already in library' })));
          controller.enqueue(new TextEncoder().encode(sseEvent('done', { track: existing, cached: true })));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
    }

    // 2. Enqueue via Manager
    const jobId = downloadQueue.enqueue(cleanUrl, folderId);

    // 3. Stream status via SSE
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          try { controller.enqueue(new TextEncoder().encode(sseEvent(event, data))); } catch {}
        };

        const onProgress = (data: any) => { if (data.id === jobId) send('progress', data); };
        const onStatus   = (data: any) => { if (data.id === jobId) send('status', data); };
        const onMetadata = (data: any) => { if (data.id === jobId) send('metadata', data); };
        const onDone     = (data: any) => { 
          if (data.id === jobId) {
            send('done', data);
            cleanup();
            controller.close();
          }
        };
        const onError    = (data: any) => {
          if (data.id === jobId) {
            send('error', data);
            cleanup();
            controller.close();
          }
        };

        const cleanup = () => {
          downloadQueue.off('progress', onProgress);
          downloadQueue.off('status', onStatus);
          downloadQueue.off('metadata', onMetadata);
          downloadQueue.off('done', onDone);
          downloadQueue.off('error', onError);
        };

        downloadQueue.on('progress', onProgress);
        downloadQueue.on('status', onStatus);
        downloadQueue.on('metadata', onMetadata);
        downloadQueue.on('done', onDone);
        downloadQueue.on('error', onError);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      }
    });
  } catch (err) {
    return new Response('Internal Error', { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return new Response('Missing ID', { status: 400 });

  const sanitized = id.replace(/[^a-zA-Z0-9\-]/g, '');
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.startsWith(sanitized));
  
  if (!files.length) return new Response('Not found', { status: 404 });

  const filePath = path.join(AUDIO_DIR, files[0]);
  const stats = fs.statSync(filePath);
  const nodeStream = fs.createReadStream(filePath);
  const contentType = files[0].endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream';

  return new Response(Readable.toWeb(nodeStream) as any, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stats.size.toString(),
      'Content-Disposition': `attachment; filename="${files[0]}"`,
      'Access-Control-Allow-Origin': '*',
    }
  });
}
