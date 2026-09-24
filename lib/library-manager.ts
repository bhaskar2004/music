import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { Track } from '@/types';

const LIBRARY_PATH = path.join(process.cwd(), 'data', 'library.json');

/**
 * LibraryManager singleton
 * Handles in-memory caching and thread-safe writes for the library.json database.
 */
class LibraryManager {
  private static instance: LibraryManager;
  private cache: Track[] | null = null;
  private lastUpdate = 0;
  private writeQueue: Promise<void> = Promise.resolve();

  private constructor() {}

  public static getInstance(): LibraryManager {
    if (!LibraryManager.instance) {
      LibraryManager.instance = new LibraryManager();
    }
    return LibraryManager.instance;
  }

  /**
   * Get all tracks. Uses cache if available.
   */
  public async getTracks(): Promise<Track[]> {
    if (this.cache) return this.cache;

    try {
      if (!fs.existsSync(LIBRARY_PATH)) {
        this.cache = [];
        return [];
      }
      const data = await fsp.readFile(LIBRARY_PATH, 'utf-8');
      this.cache = JSON.parse(data);
      this.lastUpdate = Date.now();
      return this.cache || [];
    } catch (err) {
      console.error('[LibraryManager] Error reading library:', err);
      return this.cache || [];
    }
  }

  /**
   * Add a new track to the library.
   */
  public async addTrack(track: Track): Promise<void> {
    await this.updateLibrary((tracks) => {
      // Prevent duplicates by URL
      if (tracks.some(t => t.sourceUrl === track.sourceUrl)) {
        return tracks;
      }
      return [track, ...tracks];
    });
  }

  /**
   * Remove a track by ID.
   */
  public async removeTrack(id: string): Promise<void> {
    await this.updateLibrary((tracks) => tracks.filter(t => t.id !== id));
  }

  /**
   * Update a track's metadata.
   */
  public async updateTrack(id: string, updates: Partial<Track>): Promise<void> {
    await this.updateLibrary((tracks) =>
      tracks.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }

  /**
   * Internal helper to perform atomic serialized writes.
   */
  private async updateLibrary(updater: (tracks: Track[]) => Track[]): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const current = await this.getTracks();
      const next = updater(current);
      
      try {
        const dir = path.dirname(LIBRARY_PATH);
        if (!fs.existsSync(dir)) await fsp.mkdir(dir, { recursive: true });
        
        await fsp.writeFile(LIBRARY_PATH, JSON.stringify(next, null, 2));
        this.cache = next;
        this.lastUpdate = Date.now();
      } catch (err) {
        console.error('[LibraryManager] Write failed:', err);
        throw err;
      }
    });

    return this.writeQueue;
  }
}

export const libraryManager = LibraryManager.getInstance();
