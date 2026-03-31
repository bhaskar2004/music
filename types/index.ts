export interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  filename: string;
  coverUrl?: string;
  sourceUrl: string;
  addedAt: string;
  fileSize: number; // bytes
  format: string;
  folderId?: string; // Links track to a custom user folder
}

export interface DownloadJob {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  track?: Track;
}

export interface RecentPlay {
  trackId: string;
  playedAt: string;
  listenDuration: number; // seconds listened
}

export interface ListeningStats {
  totalListenTime: number; // seconds
  playCount: Record<string, number>; // trackId -> count
}

export interface SleepTimerState {
  endTime: number | null; // Unix timestamp
  duration: number; // minutes
  active: boolean;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
}
