import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['thermal-named-smilies-camp.trycloudflare.com', 'localhost:3000'],
  serverExternalPackages: ['yt-dlp-wrap', 'music-metadata'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['thermal-named-smilies-camp.trycloudflare.com', 'localhost:3000'],
    },
  },
};

export default nextConfig;
