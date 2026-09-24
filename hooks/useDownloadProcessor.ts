'use client';

import { useMusicStore } from '@/store/musicStore';
import { v4 as uuidv4 } from 'uuid';

export function useDownloadProcessor() {
  const { addDownload, updateDownload, addTrack } = useMusicStore();

  const processDownload = async (videoUrl: string, folderId?: string, existingJobId?: string) => {
    const jobId = existingJobId || uuidv4();
    
    // ── Pre-check: Is it already in the library? ──────────────────────
    const { library } = useMusicStore.getState();
    if (library.some(t => t.sourceUrl === videoUrl)) {
      if (existingJobId) {
        const track = library.find(t => t.sourceUrl === videoUrl);
        updateDownload(jobId, { status: 'done', progress: 100, track });
      }
      return;
    }
    
    if (!existingJobId) {
      addDownload({ id: jobId, url: videoUrl, status: 'pending', progress: 0 });
    } else {
      updateDownload(jobId, { status: 'pending', progress: 0, error: undefined });
    }

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, folderId }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
          const payload = JSON.parse(dataLine);

          switch (eventName) {
            case 'status':
              updateDownload(jobId, { status: payload.stage === 'processing' ? 'processing' : 'downloading' });
              break;
            case 'progress':
              updateDownload(jobId, { progress: payload.percent });
              break;
            case 'done':
              addTrack(payload.track);
              updateDownload(jobId, { status: 'done', progress: 100, track: payload.track });
              break;
            case 'error':
              updateDownload(jobId, { status: 'error', error: payload.message });
              break;
          }
        }
      }
    } catch (err: any) {
      updateDownload(jobId, { status: 'error', error: err.message });
    }
  };

  const processBulkDownload = async (urls: string[]) => {
    try {
      const res = await fetch('/api/download/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      
      if (data.jobs) {
        data.jobs.forEach((job: { url: string; id: string }) => {
          addDownload({ id: job.id, url: job.url, status: 'pending', progress: 0 });
        });
      }
      return data.jobs;
    } catch (err) {
      console.error('[BulkDownload] Failed:', err);
      throw err;
    }
  };

  return { processDownload, processBulkDownload };
}
