import { Client, Project, Quotation, PlanItem, StudioProfile } from '../types';
import { ago, Y } from './formatters';
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
    const key = getProfileKey(userEmail);
    const raw = localStorage.getItem(key) || (userEmail?.toLowerCase() === 'zyfxspace@gmail.com' ? localStorage.getItem('zyf-studio-profile-v1') : null);
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

  // Only sync to master Supabase tables for the owner account (zyfxspace@gmail.com)
  const isMasterAccount = !userEmail || userEmail.toLowerCase() === 'zyfxspace@gmail.com';
  if (isMasterAccount) {
    syncToSupabase(data).catch(() => {});
  }
};

// Fetch from Supabase
export const fetchFromSupabase = async (userEmail?: string): Promise<StorageData | null> => {
  const isMasterAccount = !userEmail || userEmail.toLowerCase() === 'zyfxspace@gmail.com';
  if (!isMasterAccount) {
    return null;
  }

  try {
    const [clientsRes, projectsRes, quotesRes] = await Promise.allSettled([
      supabase.from('clients').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('quotes').select('*'),
    ]);

    const clientsRaw = clientsRes.status === 'fulfilled' && clientsRes.value.data ? clientsRes.value.data : [];
    const projectsRaw = projectsRes.status === 'fulfilled' && projectsRes.value.data ? projectsRes.value.data : [];
    const quotesRaw = quotesRes.status === 'fulfilled' && quotesRes.value.data ? quotesRes.value.data : [];

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
      c: Number(p.client_id) || 1,
      v: Number(p.value) || 0,
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
      mail: '',
      tel: '',
      title: q.title || '',
      date: q.date || '',
      valid: q.valid_until || '',
      items: Array.isArray(q.items) ? q.items : [],
      note: '',
      s: q.status || 'Draft',
      pid: Number(q.client_id) || 0,
    }));

    if (clients.length > 0 || projects.length > 0 || quotes.length > 0) {
      const syncedData = { clients, projects, quotes };
      if (typeof window !== 'undefined') {
        const key = getStorageKey(userEmail);
        localStorage.setItem(key, JSON.stringify(syncedData));
      }
      return syncedData;
    }
  } catch (e) {
    console.error('Error fetching from Supabase', e);
  }
  return null;
};

// Sync whole state to Supabase safely (Upsert items, never wipe entire table on empty local state)
export const syncToSupabase = async (data: StorageData) => {
  try {
    // 1. Sync Clients
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

    // 2. Sync Projects
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

    // 3. Sync Quotes
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
    console.error('Error syncing to Supabase', e);
  }
};
