import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow ALL trycloudflare.com subdomains (they change each restart)
  // Also allow any custom domain if TUNNEL_HOST env var is set
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'localhost:3000',
    ...(process.env.NEXT_PUBLIC_TUNNEL_HOST ? [process.env.NEXT_PUBLIC_TUNNEL_HOST] : []),
  ],
  serverExternalPackages: ['yt-dlp-wrap', 'music-metadata'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        '*.trycloudflare.com',
        'localhost:3000',
        ...(process.env.NEXT_PUBLIC_TUNNEL_HOST ? [process.env.NEXT_PUBLIC_TUNNEL_HOST] : []),
      ],
    },
  },
};

export default nextConfig;
