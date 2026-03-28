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
}

export interface DownloadJob {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
  track?: Track;
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
