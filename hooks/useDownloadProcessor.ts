'use client';

import { useMusicStore } from '@/store/musicStore';
import { v4 as uuidv4 } from 'uuid';

export function useDownloadProcessor() {
  const { addDownload, updateDownload, addTrack } = useMusicStore();

  const processDownload = async (videoUrl: string, folderId?: string, existingJobId?: string) => {
    const jobId = existingJobId || uuidv4();
    
    if (!existingJobId) {
      addDownload({ id: jobId, url: videoUrl, status: 'pending', progress: 0 });
    } else {
      updateDownload(jobId, { status: 'pending', progress: 0, error: undefined });
    }

    let res: Response;
    try {
      res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, folderId }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      updateDownload(jobId, { status: 'error', error: msg });
      return;
    }

    if (!res.body) {
      updateDownload(jobId, { status: 'error', error: 'No response body' });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    updateDownload(jobId, { status: 'downloading', progress: 0 });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          if (!frame.trim()) continue;

          let eventName = 'message';
          let dataLine = '';

          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
          }

          if (!dataLine) continue;
          let payload: any;
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }

          switch (eventName) {
            case 'status':
              if (payload.stage === 'downloading') {
                updateDownload(jobId, { status: 'downloading' });
              } else if (payload.stage === 'processing') {
                updateDownload(jobId, { status: 'processing' });
              }
              break;
            case 'progress':
              updateDownload(jobId, { progress: payload.percent as number });
              break;
            case 'done': {
              const track = payload.track;
              addTrack(track);
              updateDownload(jobId, { status: 'done', progress: 100, track });
              break;
            }
            case 'error':
              updateDownload(jobId, { status: 'error', error: payload.message || 'Unknown error' });
              break;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stream error';
      updateDownload(jobId, { status: 'error', error: msg });
    }
  };

  return { processDownload };
}
