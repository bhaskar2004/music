import { NextRequest } from 'next/server';

// Simple health-check endpoint for auto-discovery by the mobile app.
// The app scans the local network and looks for this specific response.
export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'wavelength',
      version: '2.0',
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
