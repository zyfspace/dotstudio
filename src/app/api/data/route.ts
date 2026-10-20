import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '@/lib/supabase';
import { TABLES, loadOwnerData, upsertOwnerRows, deleteOwnerRow } from '@/lib/db';

// Sign-in stays on Supabase Auth; the data lives in Neon. Every request
// carries the Supabase access token, and rows are scoped to its email.
const auth = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ownerEmail = async (request: Request): Promise<string | null> => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user?.email?.toLowerCase() || null;
};

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function GET(request: Request) {
  const email = await ownerEmail(request);
  if (!email) return fail(401, 'Not signed in');
  try {
    return Response.json(await loadOwnerData(email));
  } catch (e: any) {
    console.error('Failed to load data', e);
    return fail(500, 'Failed to load data');
  }
}

export async function POST(request: Request) {
  const email = await ownerEmail(request);
  if (!email) return fail(401, 'Not signed in');

  const body = await request.json().catch(() => null);
  if (!body || !(body.table in TABLES)) return fail(400, 'Unknown table');

  try {
    if (body.action === 'upsert' && Array.isArray(body.rows)) {
      await upsertOwnerRows(body.table, body.rows, email);
    } else if (body.action === 'delete' && body.table !== 'studio_profiles' && Number.isFinite(body.id)) {
      await deleteOwnerRow(body.table, body.id, email);
    } else {
      return fail(400, 'Invalid request');
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('Failed to write data', e);
    return fail(500, 'Failed to save data');
  }
}
