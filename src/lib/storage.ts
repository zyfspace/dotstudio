import { Client, Project, Quotation, PlanItem, StudioProfile } from '../types';
import { supabase } from './supabase';

export const getStorageKey = (email?: string) => {
  const clean = email ? email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'zyfxspace_gmail_com';
  return `zyf-studio-db-${clean}`;
};

export const getProfileKey = (email?: string) => {
  const clean = email ? email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'zyfxspace_gmail_com';
  return `zyf-studio-profile-${clean}`;
};

export const DEFAULT_STUDIO_PROFILE: StudioProfile = {
  studioName: '',
  ownerName: '',
  tagline: '',
  email: '',
  phone: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
  defaultPaymentTerms: '',
  paymentTermDays: 7,
  defaultNotes: '',
};

export const MASTER_STUDIO_PROFILE: StudioProfile = DEFAULT_STUDIO_PROFILE;

export const loadStudioProfile = (userEmail?: string): StudioProfile => {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_PROFILE;
  try {
    const key = getProfileKey(userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STUDIO_PROFILE, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to load studio profile', e);
  }
  return DEFAULT_STUDIO_PROFILE;
};

export const saveStudioProfile = (profile: StudioProfile, userEmail?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getProfileKey(userEmail);
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save studio profile', e);
  }

  // Also sync profile to Supabase in background
  syncProfileToSupabase(profile, userEmail).catch(() => {});
};

export const syncProfileToSupabase = async (profile: StudioProfile, userEmail?: string) => {
  // Profiles are keyed by the signed-in account; never guess another owner.
  if (!userEmail) return;
  const targetEmail = userEmail.toLowerCase();
  try {
    const row = {
      email: targetEmail,
      studio_name: profile.studioName || '',
      owner_name: profile.ownerName || '',
      tagline: profile.tagline || '',
      phone: profile.phone || '',
      bank_name: profile.bankName || '',
      account_number: profile.accountNumber || '',
      account_holder: profile.accountHolder || '',
      default_payment_terms: profile.defaultPaymentTerms || '',
      default_notes: profile.defaultNotes || '',
      security_pin: profile.securityPin || '',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('studio_profiles')
      .upsert({ ...row, payment_term_days: profile.paymentTermDays ?? 7 }, { onConflict: 'email' });
    // Databases created before payment_term_days existed reject the column; keep syncing the rest.
    if (error && /payment_term_days/.test(error.message || '')) {
      await supabase.from('studio_profiles').upsert(row, { onConflict: 'email' });
    }
  } catch (e) {
    console.error('Failed to sync profile to Supabase', e);
  }
};

export const syncStudioProfileToSupabase = syncProfileToSupabase;


export const getInitialClients = (): Client[] => [];
export const getInitialProjects = (): Project[] => [];
export const getInitialQuotes = (): Quotation[] => [];

export interface StorageData {
  clients: Client[];
  projects: Project[];
  quotes: Quotation[];
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

let currentSyncStatus: SyncStatus = {
  lastSyncedAt: null,
  status: 'idle',
};

export const getSyncStatus = (): SyncStatus => currentSyncStatus;

// Load data from LocalStorage (isolated per user email)
export const loadStoredData = (userEmail?: string): StorageData => {
  if (typeof window === 'undefined') {
    return {
      clients: getInitialClients(),
      projects: getInitialProjects(),
      quotes: getInitialQuotes(),
    };
  }

  try {
    const key = getStorageKey(userEmail);
    const raw = localStorage.getItem(key) || (userEmail?.toLowerCase() === 'zyfxspace@gmail.com' ? localStorage.getItem('zyf-studio-db-v1') : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.clients)) {
        return {
          clients: parsed.clients,
          projects: parsed.projects,
          quotes: parsed.quotes || [],
        };
      }
    }
  } catch (e) {
    console.error('Failed to load storage data', e);
  }

  return {
    clients: getInitialClients(),
    projects: getInitialProjects(),
    quotes: getInitialQuotes(),
  };
};

// Save to LocalStorage and sync to Supabase in background
export const saveStoredData = (data: StorageData, userEmail?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userEmail);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save localStorage data', e);
  }

  syncToSupabase(data, userEmail).catch(() => {});
};

// Fetch from Supabase
export const fetchFromSupabase = async (
  userEmail?: string
): Promise<{ data: StorageData; profile?: StudioProfile } | null> => {
  if (!userEmail) return null;
  const targetEmail = userEmail.toLowerCase();

  try {
    // Without a signed-in Supabase session RLS returns no rows, which would
    // look like an empty account; treat it as "not loaded" instead.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.email?.toLowerCase() !== targetEmail) return null;

    currentSyncStatus = { ...currentSyncStatus, status: 'syncing' };

    const [clientsRes, projectsRes, quotesRes, profileRes] = await Promise.allSettled([
      supabase.from('clients').select('*').eq('owner_email', targetEmail),
      supabase.from('projects').select('*').eq('owner_email', targetEmail),
      supabase.from('quotes').select('*').eq('owner_email', targetEmail),
      supabase.from('studio_profiles').select('*').eq('email', targetEmail).maybeSingle(),
    ]);

    let hadErrors = false;
    let errorMsg = '';

    for (const res of [clientsRes, projectsRes, quotesRes]) {
      if (res.status === 'rejected' || res.value.error) {
        hadErrors = true;
        errorMsg = (res as any).value?.error?.message || 'Failed to query Supabase';
      }
    }

    const clientsRaw = clientsRes.status === 'fulfilled' && clientsRes.value.data ? clientsRes.value.data : [];
    const projectsRaw = projectsRes.status === 'fulfilled' && projectsRes.value.data ? projectsRes.value.data : [];
    const quotesRaw = quotesRes.status === 'fulfilled' && quotesRes.value.data ? quotesRes.value.data : [];
    const profileRaw = profileRes.status === 'fulfilled' && profileRes.value.data ? profileRes.value.data : null;

    const clients: Client[] = clientsRaw.map((c: any) => ({
      id: Number(c.id),
      name: c.name || '',
      co: c.co || c.company || '',
      mail: c.mail || c.email || '',
      tel: c.tel || c.phone || '',
      n: c.n || c.address || '',
    }));

    const projects: Project[] = projectsRaw.map((p: any) => ({
      id: Number(p.id),
      name: p.name || '',
      c: Number(p.c ?? p.client_id) || 0,
      v: Number(p.v ?? p.value) || 0,
      billingType: p.billingType || p.billing_type || 'One-time',
      items: Array.isArray(p.items) ? p.items : (Array.isArray(p.scope) ? p.scope : [{ d: p.name || '', type: p.billing_type || 'One-time', p: Number(p.v ?? p.value) || 0 }]),
      due: p.due || p.deadline || '',
      desc: p.desc || p.notes || '',
      n: p.n || '',
      plan: Array.isArray(p.plan) ? p.plan : (Array.isArray(p.p) ? p.p : []),
      ...(p.lang === 'en' || p.lang === 'id' ? { lang: p.lang as 'en' | 'id' } : {}),
    }));

    const quotes: Quotation[] = quotesRaw.map((q: any) => ({
      id: Number(q.id),
      no: String(q.no || q.number || ''),
      cn: q.cn || q.client_name || '',
      co: q.co || q.client_company || '',
      mail: q.mail || q.client_email || '',
      tel: q.tel || q.client_phone || '',
      title: q.title || '',
      date: q.date || '',
      valid: q.valid || q.valid_until || '',
      validDays: Number(q.validDays || q.valid_days) || 7,
      scope: Array.isArray(q.scope) ? q.scope : [],
      items: Array.isArray(q.items) ? q.items : [],
      services: Array.isArray(q.services) ? q.services : [],
      terms: Array.isArray(q.terms) && q.terms.length > 0
        ? q.terms
        : (() => {
            if (typeof q.note === 'string' && q.note.trim().startsWith('[') && q.note.trim().endsWith(']')) {
              try {
                const parsed = JSON.parse(q.note);
                if (Array.isArray(parsed)) return parsed;
              } catch {}
            }
            return [
              q.paymentTerms || q.payment_terms ? `Syarat pembayaran: ${q.paymentTerms || q.payment_terms}` : '',
              q.note || q.notes || '',
            ].filter(Boolean);
          })(),
      paymentTerms: q.paymentTerms || q.payment_terms || '',
      note: q.note || q.notes || '',
      s: q.s || q.status || 'Draft',
      pid: Number(q.pid ?? q.client_id) || 0,
      senderName: q.senderName || q.sender_name || '',
      senderTagline: q.senderTagline || q.sender_tagline || '',
      senderEmail: q.senderEmail || q.sender_email || '',
      senderPhone: q.senderPhone || q.sender_phone || '',
      ...(q.lang === 'en' || q.lang === 'id' ? { lang: q.lang as 'en' | 'id' } : {}),
    }));

    let profile: StudioProfile | undefined = undefined;
    if (profileRaw) {
      profile = {
        studioName: profileRaw.studio_name || profileRaw.studioName || '',
        ownerName: profileRaw.owner_name || profileRaw.ownerName || '',
        tagline: profileRaw.tagline || '',
        email: profileRaw.email || targetEmail,
        phone: profileRaw.phone || '',
        bankName: profileRaw.bank_name || profileRaw.bankName || '',
        accountNumber: profileRaw.account_number || profileRaw.accountNumber || '',
        accountHolder: profileRaw.account_holder || profileRaw.accountHolder || '',
        defaultPaymentTerms: profileRaw.default_payment_terms || profileRaw.defaultPaymentTerms || '',
        paymentTermDays:
          typeof profileRaw.payment_term_days === 'number' ? profileRaw.payment_term_days : 7,
        defaultNotes: profileRaw.default_notes || profileRaw.defaultNotes || '',
        securityPin: profileRaw.security_pin || profileRaw.securityPin || undefined,
      };
    }

    // A complete answer replaces the local cache, even when the account is
    // empty, so rows deleted on another device don't linger here.
    if (!hadErrors) {
      const syncedData = { clients, projects, quotes };
      rememberServerRows(syncedData, targetEmail);
      if (typeof window !== 'undefined') {
        const key = getStorageKey(userEmail);
        localStorage.setItem(key, JSON.stringify(syncedData));
        if (profile) {
          // Cache locally only; re-uploading what was just fetched is redundant.
          localStorage.setItem(getProfileKey(userEmail), JSON.stringify(profile));
        }
      }
      currentSyncStatus = {
        lastSyncedAt: new Date().toLocaleTimeString(),
        status: 'success',
      };
      return { data: syncedData, profile };
    }

    currentSyncStatus = {
      lastSyncedAt: null,
      status: 'error',
      errorMessage: errorMsg,
    };
  } catch (e: any) {
    currentSyncStatus = {
      lastSyncedAt: null,
      status: 'error',
      errorMessage: e?.message || 'Error connecting to Supabase',
    };
    console.error('Error fetching from Supabase', e);
  }
  return null;
};

// Ids deleted in this tab. A sync that started before a delete still holds the
// old rows, so skip these to keep it from re-creating them.
const deletedIds = {
  clients: new Set<number>(),
  projects: new Set<number>(),
  quotes: new Set<number>(),
};

// The server is the source of truth. Until this tab has loaded the account's
// rows from Supabase, nothing is pushed: a device with an old local cache
// (e.g. a phone not opened for a while) would otherwise re-create rows that
// were deleted elsewhere. After loading, only rows that differ from what the
// server last held are written.
let loadedFor: string | null = null;
const serverRows = {
  clients: new Map<number, string>(),
  projects: new Map<number, string>(),
  quotes: new Map<number, string>(),
};

const clientRow = (c: Client, owner: string) => ({
  id: c.id,
  name: c.name,
  company: c.co || '',
  email: c.mail || '',
  phone: c.tel || '',
  address: c.n || '',
  owner_email: owner,
});

const projectRow = (p: Project, clients: Client[], owner: string) => {
  const client = clients.find((c) => c.id === p.c);
  return {
    id: p.id,
    name: p.name,
    client_id: p.c || 0,
    client_name: client ? client.name : '',
    client_company: client ? client.co || '' : '',
    value: p.v,
    billing_type: p.billingType || 'One-time',
    items: p.items || [],
    deadline: p.due || '',
    notes: p.desc || '',
    plan: p.plan || [],
    ...(p.lang ? { lang: p.lang } : {}),
    owner_email: owner,
  };
};

const quoteRow = (q: Quotation, owner: string) => ({
  id: q.id,
  number: q.no,
  title: q.title,
  client_id: q.pid || 0,
  client_name: q.cn || '',
  client_company: q.co || '',
  scope: q.scope || [],
  items: q.items || [],
  services: q.services || [],
  payment_terms: q.paymentTerms || '',
  note: q.terms && q.terms.length ? JSON.stringify(q.terms) : (q.note || ''),
  total: (q.items || []).reduce((s, i) => s + (i.p || 0) * (i.q || 1), 0),
  status: q.s || 'Draft',
  valid_until: q.valid || '',
  date: q.date || '',
  sender_name: q.senderName || '',
  sender_tagline: q.senderTagline || '',
  sender_email: q.senderEmail || '',
  sender_phone: q.senderPhone || '',
  ...(q.lang ? { lang: q.lang } : {}),
  owner_email: owner,
});

const rememberServerRows = (data: StorageData, owner: string) => {
  serverRows.clients = new Map(data.clients.map((c) => [c.id, JSON.stringify(clientRow(c, owner))]));
  serverRows.projects = new Map(
    data.projects.map((p) => [p.id, JSON.stringify(projectRow(p, data.clients, owner))])
  );
  serverRows.quotes = new Map(data.quotes.map((q) => [q.id, JSON.stringify(quoteRow(q, owner))]));
  loadedFor = owner;
};

// Write the rows that changed since the server last saw them
export const syncToSupabase = async (data: StorageData, userEmail?: string) => {
  if (!userEmail) return;
  const targetEmail = userEmail.toLowerCase();
  if (loadedFor !== targetEmail) return;

  type Row = { id: number } & Record<string, unknown>;
  const tables: { table: string; seen: Map<number, string>; skip: Set<number>; rows: Row[] }[] = [
    { table: 'clients', seen: serverRows.clients, skip: deletedIds.clients,
      rows: data.clients.map((c) => clientRow(c, targetEmail)) },
    { table: 'projects', seen: serverRows.projects, skip: deletedIds.projects,
      rows: data.projects.map((p) => projectRow(p, data.clients, targetEmail)) },
    { table: 'quotes', seen: serverRows.quotes, skip: deletedIds.quotes,
      rows: data.quotes.map((q) => quoteRow(q, targetEmail)) },
  ];

  try {
    currentSyncStatus = { ...currentSyncStatus, status: 'syncing' };

    for (const { table, seen, skip, rows } of tables) {
      for (const row of rows) {
        if (skip.has(row.id)) continue;
        const json = JSON.stringify(row);
        if (seen.get(row.id) === json) continue;
        const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
        if (error) throw error;
        seen.set(row.id, json);
      }
    }

    currentSyncStatus = {
      lastSyncedAt: new Date().toLocaleTimeString(),
      status: 'success',
    };
  } catch (e: any) {
    currentSyncStatus = {
      lastSyncedAt: null,
      status: 'error',
      errorMessage: e?.message || 'Sync failed',
    };
    console.error('Error syncing to Supabase', e);
  }
};

// Delete single project from Supabase
export const deleteProjectFromSupabase = async (projectId: number, userEmail?: string) => {
  if (!userEmail) return;
  deletedIds.projects.add(projectId);
  serverRows.projects.delete(projectId);
  try {
    await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('owner_email', userEmail.toLowerCase());
  } catch (e) {
    console.error('Error deleting project from Supabase', e);
  }
};

// Delete single client from Supabase
export const deleteClientFromSupabase = async (clientId: number, userEmail?: string) => {
  if (!userEmail) return;
  deletedIds.clients.add(clientId);
  serverRows.clients.delete(clientId);
  try {
    await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('owner_email', userEmail.toLowerCase());
  } catch (e) {
    console.error('Error deleting client from Supabase', e);
  }
};

// Delete single quote from Supabase
export const deleteQuoteFromSupabase = async (quoteId: number, userEmail?: string) => {
  if (!userEmail) return;
  deletedIds.quotes.add(quoteId);
  serverRows.quotes.delete(quoteId);
  try {
    await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId)
      .eq('owner_email', userEmail.toLowerCase());
  } catch (e) {
    console.error('Error deleting quote from Supabase', e);
  }
};


