import path from 'path';
import fs from 'fs';
import YTDlpWrap from 'yt-dlp-wrap';

const BIN_DIR = path.join(process.cwd(), 'bin');
const LOCAL_YT_DLP = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

let cachedBinaryPath: string | null = null;

/**
 * Resolves the path to a working yt-dlp executable across:
 * 1. Local project bin directory
 * 2. System container paths (/usr/local/bin, /app/bin, /usr/bin)
 * 3. Dynamic GitHub download fallback with execute permissions
 */
export async function getYtDlpBinaryPath(): Promise<string> {
  if (cachedBinaryPath && fs.existsSync(cachedBinaryPath)) {
    return cachedBinaryPath;
  }

  // 1. Check container / system paths first (installed via Docker)
  const candidatePaths = [
    '/usr/local/bin/yt-dlp',
    '/app/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    LOCAL_YT_DLP,
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        if (process.platform !== 'win32') fs.chmodSync(p, 0o755);
      } catch {}
      cachedBinaryPath = p;
      return cachedBinaryPath;
    }
  }

  // 2. If not found, download to local bin directory
  if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
  }

  console.log('[yt-dlp-helper] Initializing yt-dlp binary from GitHub...');
  await YTDlpWrap.downloadFromGithub(LOCAL_YT_DLP);
  try {
    if (process.platform !== 'win32') fs.chmodSync(LOCAL_YT_DLP, 0o755);
  } catch {}

  cachedBinaryPath = LOCAL_YT_DLP;
  return cachedBinaryPath;
}

/**
 * Standard yt-dlp CLI arguments:
 * Uses Android client emulation which reliably bypasses cloud/datacenter IP blocking on YouTube.
 */
export const YT_DLP_CLIENT_ARGS = [
  '--no-playlist',
  '--no-warnings',
  '--no-check-certificates',
  '--extractor-args', 'youtube:player_client=android,web',
  '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];
