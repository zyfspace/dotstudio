// Server-only: Neon Postgres access for the dashboard data API.
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

const sql = () => {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url);
  }
  return client;
};

interface TableDef {
  key: string;
  owner: string;
  columns: string[];
  json: string[];
}

// Only these columns are written; anything else in a request body is ignored.
export const TABLES: Record<string, TableDef> = {
  clients: {
    key: 'id',
    owner: 'owner_email',
    columns: ['id', 'name', 'company', 'email', 'phone', 'address'],
    json: [],
  },
  projects: {
    key: 'id',
    owner: 'owner_email',
    columns: [
      'id', 'name', 'client_id', 'client_name', 'client_company', 'value', 'billing_type',
      'items', 'deadline', 'notes', 'plan', 'lang',
    ],
    json: ['items', 'plan'],
  },
  quotes: {
    key: 'id',
    owner: 'owner_email',
    columns: [
      'id', 'number', 'title', 'client_id', 'client_name', 'client_company', 'scope', 'items',
      'services', 'payment_terms', 'note', 'total', 'status', 'valid_until', 'date',
      'sender_name', 'sender_tagline', 'sender_email', 'sender_phone', 'lang',
    ],
    json: ['scope', 'items', 'services'],
  },
  studio_profiles: {
    key: 'email',
    owner: 'email',
    columns: [
      'studio_name', 'owner_name', 'tagline', 'phone', 'bank_name', 'account_number',
      'account_holder', 'default_payment_terms', 'payment_term_days', 'default_notes',
      'security_pin', 'updated_at',
    ],
    json: [],
  },
};

export const loadOwnerData = async (email: string) => {
  const db = sql();
  const [clients, projects, quotes, profiles] = await Promise.all([
    db.query('SELECT * FROM public.clients WHERE owner_email = $1', [email]),
    db.query('SELECT * FROM public.projects WHERE owner_email = $1', [email]),
    db.query('SELECT * FROM public.quotes WHERE owner_email = $1', [email]),
    db.query('SELECT * FROM public.studio_profiles WHERE email = $1', [email]),
  ]);
  return { clients, projects, quotes, profile: profiles[0] ?? null };
};

// Insert or update rows owned by `email`. A row whose key already belongs to
// another owner is left untouched.
export const upsertOwnerRows = async (
  table: string,
  rows: Record<string, unknown>[],
  email: string
) => {
  const def = TABLES[table];
  const db = sql();
  const queries = rows.map((row) => {
    const cols = def.columns.filter((c) => c !== def.owner && row[c] !== undefined);
    const values = cols.map((c) =>
      def.json.includes(c) ? JSON.stringify(row[c] ?? []) : row[c]
    );
    const allCols = [def.owner, ...cols];
    const placeholders = allCols.map((c, i) =>
      def.json.includes(c) ? `$${i + 1}::jsonb` : `$${i + 1}`
    );
    const updates = cols
      .filter((c) => c !== def.key)
      .map((c) => `"${c}" = EXCLUDED."${c}"`);
    const conflict = updates.length
      ? `DO UPDATE SET ${updates.join(', ')} WHERE public.${table}."${def.owner}" = EXCLUDED."${def.owner}"`
      : 'DO NOTHING';
    return db.query(
      `INSERT INTO public.${table} (${allCols.map((c) => `"${c}"`).join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT ("${def.key}") ${conflict}`,
      [email, ...values]
    );
  });
  if (queries.length) await db.transaction(queries);
};

export const deleteOwnerRow = async (table: string, id: number, email: string) => {
  const def = TABLES[table];
  await sql().query(
    `DELETE FROM public.${table} WHERE "${def.key}" = $1 AND "${def.owner}" = $2`,
    [id, email]
  );
};
