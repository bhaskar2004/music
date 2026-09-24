import { NextRequest } from 'next/server';

/**
 * Image Proxy Route
 * Proxies external images (like YouTube thumbnails) to the client with
 * aggressive caching headers. This improves load times and hides the source URL.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) {
      return Response.redirect(url, 302);
    }

    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    // Graceful fallback: Redirect client to fetch image directly
    return Response.redirect(url, 302);
  }
}
