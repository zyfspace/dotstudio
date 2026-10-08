import { Client, Project, Quotation, PlanItem, StudioProfile } from '../types';
import { ago, Y } from './formatters';
import { supabase } from './supabase';

export const STORAGE_KEY = 'zyf-studio-db-v1';
export const STUDIO_PROFILE_KEY = 'zyf-studio-profile-v1';

export const DEFAULT_STUDIO_PROFILE: StudioProfile = {
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

export const loadStudioProfile = (): StudioProfile => {
  if (typeof window === 'undefined') return DEFAULT_STUDIO_PROFILE;
  try {
    const raw = localStorage.getItem(STUDIO_PROFILE_KEY);
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

export const saveStudioProfile = (profile: StudioProfile) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STUDIO_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save studio profile', e);
  }
};

// Start from 0 (Empty State for production)
export const getInitialClients = (): Client[] => [];

export const getInitialProjects = (): Project[] => [];

export const getInitialQuotes = (): Quotation[] => [];

export interface StorageData {
  clients: Client[];
  projects: Project[];
  quotes: Quotation[];
}

// Load data from LocalStorage (initial fallback / cache)
export const loadStoredData = (): StorageData => {
  if (typeof window === 'undefined') {
    return {
      clients: getInitialClients(),
      projects: getInitialProjects(),
      quotes: getInitialQuotes(),
    };
  }

  try {
    // Purge ALL legacy storage versions completely
    const keepKeys = new Set([STORAGE_KEY, 'studio-theme', 'studio-sb']);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keepKeys.has(key) && (key.startsWith('studio-') || key.startsWith('zyf-') || key === 'studio-state' || key === 'studio-data')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

    const raw = localStorage.getItem(STORAGE_KEY);
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
export const saveStoredData = (data: StorageData) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save localStorage data', e);
  }

  // Push to Supabase asynchronously
  syncToSupabase(data).catch(() => {});
};

// Fetch from Supabase
export const fetchFromSupabase = async (): Promise<StorageData | null> => {
  try {
    const [clientsRes, projectsRes, quotesRes] = await Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('quotes').select('*'),
    ]);

    if (clientsRes.error || projectsRes.error || quotesRes.error) {
      return null;
    }

    if (clientsRes.data && projectsRes.data) {
      const clients: Client[] = clientsRes.data.map((c: any) => ({
        id: Number(c.id),
        name: c.name,
        co: c.company || '',
        mail: c.email || '',
        tel: c.phone || '',
        n: c.address || '',
      }));

      const projects: Project[] = projectsRes.data.map((p: any) => ({
        id: Number(p.id),
        name: p.name,
        c: Number(p.client_id) || 1,
        v: Number(p.value) || 0,
        due: p.deadline || '',
        desc: p.notes || '',
        n: '',
        plan: Array.isArray(p.plan) ? p.plan : [],
      }));

      const quotes: Quotation[] = (quotesRes.data || []).map((q: any) => ({
        id: Number(q.id),
        no: q.number,
        cn: q.client_name,
        co: q.client_company || '',
        mail: '',
        tel: '',
        title: q.title,
        date: q.date || '',
        valid: q.valid_until || '',
        items: Array.isArray(q.items) ? q.items : [],
        note: '',
        s: q.status || 'Draft',
        pid: Number(q.client_id) || 0,
      }));

      const syncedData = { clients, projects, quotes };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedData));
      }
      return syncedData;
    }
  } catch (e) {
    // Graceful fallback to local cache
  }
  return null;
};

// Sync whole state to Supabase
export const syncToSupabase = async (data: StorageData) => {
  try {
    // 1. Sync Clients (Delete removed, upsert existing)
    const clientIds = data.clients.map((c) => c.id);
    if (clientIds.length > 0) {
      await supabase.from('clients').delete().not('id', 'in', `(${clientIds.join(',')})`);
    } else {
      await supabase.from('clients').delete().neq('id', 0);
    }
    for (const c of data.clients) {
      await supabase.from('clients').upsert(
        {
          id: c.id,
          name: c.name,
          company: c.co,
          email: c.mail,
          phone: c.tel,
          address: c.n,
        },
        { onConflict: 'id' }
      );
    }

    // 2. Sync Projects (Delete removed, upsert existing)
    const projectIds = data.projects.map((p) => p.id);
    if (projectIds.length > 0) {
      await supabase.from('projects').delete().not('id', 'in', `(${projectIds.join(',')})`);
    } else {
      await supabase.from('projects').delete().neq('id', 0);
    }
    for (const p of data.projects) {
      const client = data.clients.find((c) => c.id === p.c);
      await supabase.from('projects').upsert(
        {
          id: p.id,
          name: p.name,
          client_id: p.c,
          client_name: client ? client.name : '',
          client_company: client ? client.co : '',
          value: p.v,
          deadline: p.due,
          notes: p.desc || '',
          plan: p.plan,
        },
        { onConflict: 'id' }
      );
    }

    // 3. Sync Quotes (Delete removed, upsert existing)
    const quoteIds = data.quotes.map((q) => q.id);
    if (quoteIds.length > 0) {
      await supabase.from('quotes').delete().not('id', 'in', `(${quoteIds.join(',')})`);
    } else {
      await supabase.from('quotes').delete().neq('id', 0);
    }
    for (const q of data.quotes) {
      await supabase.from('quotes').upsert(
        {
          id: q.id,
          number: q.no,
          title: q.title,
          client_name: q.cn,
          client_company: q.co,
          total: q.items.reduce((s, i) => s + (i.p || 0) * (i.q || 1), 0),
          status: q.s,
          valid_until: q.valid,
          date: q.date,
          items: q.items,
        },
        { onConflict: 'id' }
      );
    }
  } catch (e) {
    // Supabase will sync whenever tables are created/online
  }
};
