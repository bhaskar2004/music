import { NextRequest, NextResponse } from 'next/server';
import { downloadQueue } from '@/lib/download-queue';

/**
 * POST /api/download/bulk
 * Enqueues multiple tracks for download.
 * Payload: { urls: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Expected an array of URLs' }, { status: 400 });
    }

    const jobs = urls.map(url => {
      const id = downloadQueue.enqueue(url.trim());
      return { url, id };
    });

    return NextResponse.json({ 
      message: `${jobs.length} jobs enqueued`,
      jobs 
    });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

/**
 * GET /api/download/bulk?ids=id1,id2
 * Combined status for multiple jobs.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids');
  
  if (!idsParam) {
    return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
  }

  const ids = idsParam.split(',');
  const statuses = ids.map(id => {
    const job = downloadQueue.getJob(id);
    return job ? { id: job.id, status: job.status, progress: job.progress, trackId: job.track?.id } : { id, status: 'not_found' };
  });

  return NextResponse.json({ statuses });
}
