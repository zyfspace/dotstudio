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
  defaultNotes: '',
};

export const MASTER_STUDIO_PROFILE: StudioProfile = {
  studioName: 'Zyf.Space',
  ownerName: 'Faiz Dawami',
  tagline: 'Your digital partner solution.',
  email: 'zyfxspace@gmail.com',
  phone: '0851-5637-9510',
  bankName: 'BCA / Mandiri Transfer',
  accountNumber: '123-456-7890',
  accountHolder: 'Faiz Dawami',
  defaultPaymentTerms: '50% di awal sebelum pengerjaan, pelunasan saat selesai',
  defaultNotes: 'Quotation berlaku sesuai tanggal yang tertera.',
};

export const loadStudioProfile = (userEmail?: string): StudioProfile => {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_PROFILE;
  try {
    const isMaster = userEmail?.toLowerCase() === 'zyfxspace@gmail.com';
    const key = getProfileKey(userEmail);
    const raw = localStorage.getItem(key) || (isMaster ? localStorage.getItem('zyf-studio-profile-v1') : null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_STUDIO_PROFILE, ...parsed };
      }
    }
    if (isMaster) {
      return MASTER_STUDIO_PROFILE;
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
  const targetEmail = (userEmail || profile.email || 'zyfxspace@gmail.com').toLowerCase();
  try {
    await supabase.from('studio_profiles').upsert(
      {
        owner_email: targetEmail,
        profile: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_email' }
    );
  } catch (e) {
    // Silent fail if table not created yet
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
  const targetEmail = (userEmail || 'zyfxspace@gmail.com').toLowerCase();

  try {
    currentSyncStatus = { ...currentSyncStatus, status: 'syncing' };

    const [clientsRes, projectsRes, quotesRes, profileRes] = await Promise.allSettled([
      supabase.from('clients').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('quotes').select('*'),
      supabase.from('studio_profiles').select('*').eq('email', targetEmail).maybeSingle(),
    ]);

    let hadErrors = false;
    let errorMsg = '';

    if (clientsRes.status === 'rejected' || (clientsRes.status === 'fulfilled' && clientsRes.value.error)) {
      hadErrors = true;
      errorMsg = (clientsRes as any).value?.error?.message || 'Failed to query clients table';
    }

    const clientsRaw = clientsRes.status === 'fulfilled' && clientsRes.value.data ? clientsRes.value.data : [];
    const projectsRaw = projectsRes.status === 'fulfilled' && projectsRes.value.data ? projectsRes.value.data : [];
    const quotesRaw = quotesRes.status === 'fulfilled' && quotesRes.value.data ? quotesRes.value.data : [];
    const profileRaw = profileRes.status === 'fulfilled' && profileRes.value.data ? profileRes.value.data : null;

    const clients: Client[] = clientsRaw.map((c: any) => ({
      id: Number(c.id),
      name: c.name || '',
      co: c.company || '',
      mail: c.email || '',
      tel: c.phone || '',
      n: c.address || '',
    }));

    const projects: Project[] = projectsRaw.map((p: any) => ({
      id: Number(p.id),
      name: p.name || '',
      c: Number(p.client_id) || 0,
      v: Number(p.value) || 0,
      billingType: p.billing_type || 'One-time',
      items: Array.isArray(p.items) ? p.items : [{ d: p.name || '', type: p.billing_type || 'One-time', p: Number(p.value) || 0 }],
      due: p.deadline || '',
      desc: p.notes || '',
      n: '',
      plan: Array.isArray(p.plan) ? p.plan : [],
    }));

    const quotes: Quotation[] = quotesRaw.map((q: any) => ({
      id: Number(q.id),
      no: q.number || '',
      cn: q.client_name || '',
      co: q.client_company || '',
      mail: q.client_email || '',
      tel: q.client_phone || '',
      title: q.title || '',
      date: q.date || '',
      valid: q.valid_until || '',
      validDays: 7,
      scope: Array.isArray(q.scope) ? q.scope : [],
      items: Array.isArray(q.items) ? q.items : [],
      services: Array.isArray(q.services) ? q.services : [],
      paymentTerms: q.payment_terms || '',
      note: q.note || '',
      s: q.status || 'Draft',
      pid: Number(q.client_id) || 0,
      senderName: q.sender_name || '',
      senderTagline: q.sender_tagline || '',
      senderEmail: q.sender_email || '',
      senderPhone: q.sender_phone || '',
    }));

    let profile: StudioProfile | undefined = undefined;
    if (profileRaw) {
      profile = {
        studioName: profileRaw.studio_name || '',
        ownerName: profileRaw.owner_name || '',
        tagline: profileRaw.tagline || '',
        email: profileRaw.email || targetEmail,
        phone: profileRaw.phone || '',
        bankName: profileRaw.bank_name || '',
        accountNumber: profileRaw.account_number || '',
        accountHolder: profileRaw.account_holder || '',
        defaultPaymentTerms: profileRaw.default_payment_terms || '',
        defaultNotes: profileRaw.default_notes || '',
        securityPin: profileRaw.security_pin || undefined,
      };
    }

    if (clients.length > 0 || projects.length > 0 || quotes.length > 0 || profile) {
      const syncedData = { clients, projects, quotes };
      if (typeof window !== 'undefined') {
        const key = getStorageKey(userEmail);
        localStorage.setItem(key, JSON.stringify(syncedData));
        if (profile) {
          saveStudioProfile(profile, userEmail);
        }
      }
      currentSyncStatus = {
        lastSyncedAt: new Date().toLocaleTimeString(),
        status: 'success',
      };
      return { data: syncedData, profile };
    }

    if (hadErrors) {
      currentSyncStatus = {
        lastSyncedAt: null,
        status: 'error',
        errorMessage: errorMsg,
      };
    } else {
      currentSyncStatus = {
        lastSyncedAt: new Date().toLocaleTimeString(),
        status: 'success',
      };
    }
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

// Sync whole state to Supabase safely (Upsert items)
export const syncToSupabase = async (data: StorageData, userEmail?: string) => {
  const targetEmail = (userEmail || 'zyfxspace@gmail.com').toLowerCase();

  try {
    currentSyncStatus = { ...currentSyncStatus, status: 'syncing' };

    // 1. Sync Clients
    for (const c of data.clients) {
      await supabase.from('clients').upsert(
        {
          id: c.id,
          name: c.name,
          company: c.co || '',
          email: c.mail || '',
          phone: c.tel || '',
          address: c.n || '',
          owner_email: targetEmail,
        },
        { onConflict: 'id' }
      );
    }

    // 2. Sync Projects
    for (const p of data.projects) {
      const client = data.clients.find((c) => c.id === p.c);
      await supabase.from('projects').upsert(
        {
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
          owner_email: targetEmail,
        },
        { onConflict: 'id' }
      );
    }

    // 3. Sync Quotes
    for (const q of data.quotes) {
      await supabase.from('quotes').upsert(
        {
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
          note: q.note || '',
          total: (q.items || []).reduce((s, i) => s + (i.p || 0) * (i.q || 1), 0),
          status: q.s || 'Draft',
          valid_until: q.valid || '',
          date: q.date || '',
          sender_name: q.senderName || '',
          sender_tagline: q.senderTagline || '',
          sender_email: q.senderEmail || '',
          sender_phone: q.senderPhone || '',
          owner_email: targetEmail,
        },
        { onConflict: 'id' }
      );
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
export const deleteProjectFromSupabase = async (projectId: number) => {
  try {
    await supabase.from('projects').delete().eq('id', projectId);
  } catch (e) {
    console.error('Error deleting project from Supabase', e);
  }
};

// Delete single client from Supabase
export const deleteClientFromSupabase = async (clientId: number) => {
  try {
    await supabase.from('clients').delete().eq('id', clientId);
  } catch (e) {
    console.error('Error deleting client from Supabase', e);
  }
};

// Delete single quote from Supabase
export const deleteQuoteFromSupabase = async (quoteId: number) => {
  try {
    await supabase.from('quotes').delete().eq('id', quoteId);
  } catch (e) {
    console.error('Error deleting quote from Supabase', e);
  }
};


