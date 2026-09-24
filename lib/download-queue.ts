import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import YTDlpWrap from 'yt-dlp-wrap';
import { v4 as uuidv4 } from 'uuid';
import * as musicMetadata from 'music-metadata';
import { Track, DownloadJob } from '@/types';
import { libraryManager } from './library-manager';
import { getYtDlpBinaryPath, YT_DLP_CLIENT_ARGS } from './yt-dlp-helper';

const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
const BIN_DIR = path.join(process.cwd(), 'bin');

/**
 * DownloadQueue Manager
 * Orchestrates yt-dlp tasks with concurrency control and progress reporting.
 */
class DownloadQueue extends EventEmitter {
  private static instance: DownloadQueue;
  private queue: DownloadJob[] = [];
  private activeCount = 0;
  private maxConcurrency = 3;
  private ytDlp: YTDlpWrap | null = null;

  private constructor() {
    super();
    this.ensureDirs();
  }

  public static getInstance(): DownloadQueue {
    if (!DownloadQueue.instance) {
      DownloadQueue.instance = new DownloadQueue();
    }
    return DownloadQueue.instance;
  }

  private ensureDirs() {
    if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  private async getYtDlp(): Promise<YTDlpWrap> {
    if (this.ytDlp) return this.ytDlp;
    const binaryPath = await getYtDlpBinaryPath();
    this.ytDlp = new YTDlpWrap(binaryPath);
    return this.ytDlp;
  }

  /**
   * Add a new download job to the queue.
   */
  public enqueue(url: string, folderId?: string): string {
    const id = uuidv4();
    const job: DownloadJob = {
      id,
      url,
      status: 'pending',
      progress: 0,
    };

    this.queue.push(job);
    this.emit('jobAdded', job);
    this.processQueue();
    return id;
  }

  public getJob(id: string): DownloadJob | undefined {
    return this.queue.find(j => j.id === id);
  }

  private async processQueue() {
    if (this.activeCount >= this.maxConcurrency) return;

    const nextJob = this.queue.find(j => j.status === 'pending');
    if (!nextJob) return;

    nextJob.status = 'downloading';
    this.activeCount++;
    this.emit('update', { ...nextJob, url: nextJob.url });

    this.runJob(nextJob).finally(() => {
      this.activeCount--;
      this.processQueue();
    });
  }

  private async runJob(job: DownloadJob) {
    try {
      const ytDlp = await this.getYtDlp();
      const commonArgs = [...YT_DLP_CLIENT_ARGS];

      // 1. Fetch metadata
      this.emit('status', { id: job.id, url: job.url, stage: 'metadata', message: 'Fetching track info...' });
      const metaRaw = await ytDlp.execPromise([job.url, '--dump-json', ...commonArgs]);
      const meta = JSON.parse(metaRaw);

      const title = meta.title ?? 'Unknown Title';
      const artist = meta.uploader ?? meta.artist ?? 'Unknown Artist';
      const album = meta.album ?? meta.playlist ?? 'Unknown Album';
      
      this.emit('metadata', { id: job.id, title, artist, album, thumbnail: meta.thumbnail });

      // 2. Download - Optimized for high quality and speed
      const outputTemplate = path.join(AUDIO_DIR, `${job.id}.%(ext)s`);
      const args = [
        job.url, 
        '-x', 
        '--audio-format', 'mp3', 
        '--audio-quality', '320K', // Boost to 320k for premium feel
        '--embed-thumbnail', 
        '--add-metadata', 
        '-o', outputTemplate, 
        '--concurrent-fragments', '5', // Speed up multi-part downloads
        ...commonArgs
      ];

      await new Promise<void>((resolve, reject) => {
        const emitter = ytDlp.exec(args);
        emitter.on('progress', (p) => {
          job.progress = isNaN(p.percent ?? NaN) ? 0 : Math.round(p.percent!);
          this.emit('progress', { id: job.id, url: job.url, ...p });
        });
        emitter.on('ytDlpEvent', (event, data) => {
          if (event === 'ffmpeg' || (typeof data === 'string' && data.includes('Extracting audio'))) {
            job.status = 'processing';
            this.emit('status', { id: job.id, url: job.url, stage: 'processing', message: 'Converting to high-quality MP3...' });
          }
        });
        emitter.on('error', reject);
        emitter.on('close', () => resolve());
      });

      // 3. Finalize
      const files = fs.readdirSync(AUDIO_DIR).filter(f => f.startsWith(job.id));
      if (!files.length) throw new Error('Download failed - file not found');

      const filename = files[0];
      const filePath = path.join(AUDIO_DIR, filename);
      const stats = fs.statSync(filePath);

      let duration = meta.duration ?? 0;
      let format = 'mp3';
      try {
        const audioMeta = await musicMetadata.parseFile(filePath);
        duration = Math.round(audioMeta.format.duration ?? duration);
        format = audioMeta.format.codec ?? 'mp3';
      } catch (e) {
        console.warn(`[DownloadQueue] Metadata error for ${job.id}:`, e);
      }

      // 4. Cover
      let coverUrl: string | undefined;
      if (meta.thumbnail) {
        try {
          const thumbRes = await fetch(meta.thumbnail);
          if (thumbRes.ok) {
            const buffer = Buffer.from(await thumbRes.arrayBuffer());
            const thumbFile = `${job.id}_cover.jpg`;
            fs.writeFileSync(path.join(AUDIO_DIR, thumbFile), buffer);
            coverUrl = `/audio/${thumbFile}`;
          }
        } catch (e) {
          console.warn(`[DownloadQueue] Cover download failed:`, e);
        }
      }

      const track: Track = {
        id: job.id,
        title,
        artist,
        album,
        duration,
        filename,
        coverUrl,
        sourceUrl: job.url,
        addedAt: new Date().toISOString(),
        fileSize: stats.size,
        format,
        playlistIds: [],
      };

      await libraryManager.addTrack(track);
      
      job.status = 'done';
      job.track = track;
      this.emit('done', { id: job.id, track });

    } catch (err: any) {
      job.status = 'error';
      job.error = err.message || 'Unknown error';
      this.emit('error', { id: job.id, url: job.url, message: job.error });
      console.error(`[DownloadQueue] Job ${job.id} failed:`, job.error);
    }
  }
}

export const downloadQueue = DownloadQueue.getInstance();
