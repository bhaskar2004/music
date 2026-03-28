import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['yt-dlp-wrap', 'music-metadata'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
};

export default nextConfig;
