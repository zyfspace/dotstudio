// Reports the build this server is running, so open tabs can tell when a
// newer deployment has replaced the JavaScript they loaded.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? '' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
