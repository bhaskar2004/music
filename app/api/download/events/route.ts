import { NextRequest } from 'next/server';
import { downloadQueue } from '@/lib/download-queue';

/**
 * GET /api/download/events
 * Global SSE stream for all download queue updates.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          // Client likely disconnected
        }
      };

      // Listen to all queue events
      const onUpdate = (job: any) => send('update', job);
      const onProgress = (data: any) => send('progress', data);
      const onStatus = (data: any) => send('status', data);
      const onMetadata = (data: any) => send('metadata', data);
      const onDone = (data: any) => send('done', data);
      const onError = (data: any) => send('error', data);

      downloadQueue.on('update', onUpdate);
      downloadQueue.on('progress', onProgress);
      downloadQueue.on('status', onStatus);
      downloadQueue.on('metadata', onMetadata);
      downloadQueue.on('done', onDone);
      downloadQueue.on('error', onError);

      // Keep alive heartbeat
      const heartbeat = setInterval(() => send('heartbeat', { time: Date.now() }), 30000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        downloadQueue.off('update', onUpdate);
        downloadQueue.off('progress', onProgress);
        downloadQueue.off('status', onStatus);
        downloadQueue.off('metadata', onMetadata);
        downloadQueue.off('done', onDone);
        downloadQueue.off('error', onError);
        try { controller.close(); } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
