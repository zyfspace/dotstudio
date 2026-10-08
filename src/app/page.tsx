'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Client,
  Project,
  Quotation,
  PlanItem,
  ViewMode,
  DocState,
  ProjectStatus,
  StudioProfile,
} from '@/types';
import {
  loadStoredData,
  saveStoredData,
  fetchFromSupabase,
  getInitialClients,
  getInitialProjects,
  getInitialQuotes,
  DEFAULT_STUDIO_PROFILE,
  loadStudioProfile,
  saveStudioProfile,
} from '@/lib/storage';
import {
  Y,
  ago,
  today,
  rp,
  sh,
  dt,
  pad,
  isOverdue,
} from '@/lib/formatters';
import { Icon } from '@/components/Icons';
import { IncomeChart, ChartMode } from '@/components/IncomeChart';
import { AutoTextarea } from '@/components/AutoTextarea';
import { DatePicker } from '@/components/DatePicker';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { LandingPage } from '@/components/LandingPage';
import { AuthScreen } from '@/components/AuthScreen';
import { DotStudioPaperLogo } from '@/components/Logo';
import { AuthUser, getActiveSession, setAuthSession } from '@/lib/auth';
import { uploadFiles } from '@/lib/uploadthing';

const PRESETS: Record<string, [string, number][]> = {
  full: [['Full payment', 100]],
  dp: [
    ['DP', 50],
    ['Final payment', 50],
  ],
  t3: [
    ['DP', 30],
    ['Progress', 40],
    ['Final payment', 30],
  ],
  custom: [],
};

const PRESET_NAMES: Record<string, string> = {
  full: 'Full payment',
  dp: 'DP 50 / 50',
  t3: '3 installments',
  custom: 'Custom',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  Pending: 'Pending',
  Progress: 'In progress',
  Finished: 'Finished',
};

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [guestView, setGuestView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [authInitialEmail, setAuthInitialEmail] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [studioProfile, setStudioProfile] = useState<StudioProfile>(DEFAULT_STUDIO_PROFILE);
  const [profileDraft, setProfileDraft] = useState<StudioProfile>(DEFAULT_STUDIO_PROFILE);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'none' | 'unlock' | 'set' | 'change'>('none');
  const [pinInput, setPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Overview Chart & Stat Cards Filter state
  const [chartMode, setChartMode] = useState<ChartMode>('6m');
  const [chartSelectedMonth, setChartSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [chartCustomRange, setChartCustomRange] = useState<{ start: string; end: string }>({
    start: ago(30),
    end: today(),
  });
  const [chartCustomRangePreset, setChartCustomRangePreset] = useState<string | null>(null);

  // Navigation & filtering state
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState<'name' | 'due' | 'pg' | 'v'>('due');
  const [sortDir, setSortDir] = useState<number>(1);
  const [docState, setDocState] = useState<DocState | null>(null);
  const [collapsedInvoiceGroups, setCollapsedInvoiceGroups] = useState<Record<string, boolean>>({});
  const [collapsedQuoteGroups, setCollapsedQuoteGroups] = useState<Record<string, boolean>>({});

  // Drawers
  const [activeProjectDrawerId, setActiveProjectDrawerId] = useState<number | null>(null);
  const [activeClientDrawerId, setActiveClientDrawerId] = useState<number | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);

  // Sidebar & Theme
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Form states
  const [projectClientMode, setProjectClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedProjectClientId, setSelectedProjectClientId] = useState<number | ''>('');
  const [quoteClientMode, setQuoteClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedQuoteClientId, setSelectedQuoteClientId] = useState<number | ''>('');

  const [newProjectData, setNewProjectData] = useState({
    name: '',
    v: '',
    billingType: 'One-time',
    items: [{ d: '', type: 'One-time', p: '' as number | string }],
    due: '',
    desc: '',
    cn: '',
    co: '',
    mail: '',
    tel: '',
    pre: 'dp',
    plan: PRESETS.dp.map(([l, pct]) => ({ l, pct, due: '' })),
  });

  const [newQuoteData, setNewQuoteData] = useState({
    cn: '',
    co: '',
    mail: '',
    tel: '',
    title: '',
    date: today(),
    valid: ago(-7),
    validDays: 7,
    scope: [''],
    items: [{ d: '', type: 'One-time', q: 1, p: '' as number | string }],
    services: [''],
    paymentTerms: '',
    note: '',
    senderName: '',
    senderTagline: '',
    senderEmail: '',
    senderPhone: '',
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const isDataInitializedRef = useRef(false);

  // Load and sync data from LocalStorage & Supabase
  const loadData = useCallback(async (email?: string) => {
    isDataInitializedRef.current = false;
    const userEmail = email || authUser?.email;
    const data = loadStoredData(userEmail);
    const profile = loadStudioProfile(userEmail);
    setStudioProfile(profile);
    setProfileDraft(profile);

    const prefix = getBrandInitials(profile.studioName);
    const todayParts = today().split('-');
    const mm = todayParts[1] || '10';
    const dd = todayParts[2] || '08';

    if (data.clients.length > 0 || data.projects.length > 0 || data.quotes.length > 0) {
      setClients(data.clients);
      setProjects(data.projects);
      setQuotes(data.quotes);
    }

    try {
      const remote = await fetchFromSupabase(userEmail);
      if (remote) {
        let invSeq = 0;
        const normProjects = remote.projects.map((p) => ({
          ...p,
          plan: p.plan.map((item) => {
            if (item.inv && item.inv.no) {
              invSeq++;
              if (!item.inv.no.startsWith('INV/')) {
                const seqMatch = item.inv.no.match(/\d+$/);
                const seq = seqMatch ? pad(seqMatch[0]) : pad(invSeq);
                const invDate = item.inv.date || today();
                const invParts = invDate.split('-');
                const invMm = invParts[1] || mm;
                const invDd = invParts[2] || dd;
                return {
                  ...item,
                  inv: {
                    ...item.inv,
                    no: `INV/${prefix}/${invMm}/${invDd}/${seq}`,
                  },
                };
              }
            }
            return item;
          }),
        }));

        const normQuotes = remote.quotes.map((q, idx) => {
          if (q.no && !q.no.startsWith('QT/')) {
            const seqMatch = q.no.match(/\d+$/);
            const seq = seqMatch ? pad(seqMatch[0]) : pad(idx + 1);
            const qDate = q.date || today();
            const qParts = qDate.split('-');
            const qMm = qParts[1] || mm;
            const qDd = qParts[2] || dd;
            return {
              ...q,
              no: `QT/${prefix}/${qMm}/${qDd}/${seq}`,
            };
          }
          return q;
        });

        setClients(remote.clients);
        setProjects(normProjects);
        setQuotes(normQuotes);
      }
    } catch (e) {
      console.error('Failed to load from Supabase', e);
    } finally {
      setTimeout(() => {
        isDataInitializedRef.current = true;
      }, 500);
    }
  }, [authUser?.email]);

  // Initialize data on mount
  useEffect(() => {
    setIsMounted(true);
    const session = getActiveSession();
    if (session) {
      setAuthUser(session);
      loadData(session.email);
    } else {
      loadData();
    }

    try {
      const savedSb = localStorage.getItem('studio-sb');
      if (savedSb === '1') setIsSidebarCollapsed(true);

      const savedTheme = localStorage.getItem('studio-theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  // Persist and sync whenever projects, clients, or quotes change
  useEffect(() => {
    if (!isMounted || !isDataInitializedRef.current) return;
    saveStoredData({ clients, projects, quotes }, authUser?.email);
  }, [clients, projects, quotes, isMounted, authUser?.email]);

  const handleStartEditSettings = () => {
    setPinError('');
    setPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    if (!studioProfile.securityPin) {
      setPinModalMode('set');
    } else {
      setPinModalMode('unlock');
    }
  };

  const handleVerifyUnlockPin = () => {
    if (!pinInput.trim()) {
      setPinError('Masukkan PIN Anda.');
      return;
    }
    if (pinInput === studioProfile.securityPin) {
      setIsSettingsUnlocked(true);
      setProfileDraft({ ...studioProfile });
      setPinModalMode('none');
      setPinInput('');
      setPinError('');
    } else {
      setPinError('PIN salah. Silakan coba lagi.');
    }
  };

  const handleSetNewPin = () => {
    if (newPinInput.length < 4) {
      setPinError('PIN minimal 4 karakter/angka.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError('Konfirmasi PIN tidak cocok.');
      return;
    }
    const updated = { ...studioProfile, securityPin: newPinInput };
    setStudioProfile(updated);
    saveStudioProfile(updated);
    setProfileDraft(updated);
    setIsSettingsUnlocked(true);
    setPinModalMode('none');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinError('');
  };

  const handleChangePin = () => {
    if (pinInput !== studioProfile.securityPin) {
      setPinError('PIN saat ini salah.');
      return;
    }
    if (newPinInput.length < 4) {
      setPinError('PIN baru minimal 4 karakter/angka.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError('Konfirmasi PIN baru tidak cocok.');
      return;
    }
    const updated = { ...studioProfile, securityPin: newPinInput };
    setStudioProfile(updated);
    saveStudioProfile(updated);
    setProfileDraft(updated);
    setPinModalMode('none');
    setPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinError('');
  };

  const handleSaveUnlockedSettings = () => {
    setStudioProfile(profileDraft);
    saveStudioProfile(profileDraft);
    setIsSettingsUnlocked(false);
    setProfileSavedFeedback(true);
    setTimeout(() => {
      setProfileSavedFeedback(false);
    }, 2500);
  };

  const handleCancelEditSettings = () => {
    setProfileDraft({ ...studioProfile });
    setIsSettingsUnlocked(false);
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: studioProfile,
      clients,
      projects,
      quotes,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save changes to localStorage
  useEffect(() => {
    if (!isMounted) return;
    saveStoredData({ clients, projects, quotes });
  }, [clients, projects, quotes, isMounted]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
      const target = document.activeElement as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');
      if (e.key === '/' && !isInput && searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    try {
      localStorage.setItem('studio-sb', next ? '1' : '0');
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('studio-theme', nextTheme);
    } catch (e) {
      console.error(e);
    }
  };

  const closeDrawer = () => {
    setActiveProjectDrawerId(null);
    setActiveClientDrawerId(null);
    setDeleteArmed(false);
  };

  // Helper functions
  const getClient = (id: number): Client => {
    return (
      clients.find((c) => c.id === id) || {
        id: 0,
        name: '—',
        co: '',
        mail: '',
        tel: '',
        n: '',
      }
    );
  };

  const allPayments = useMemo(() => {
    return projects.flatMap((p) => p.plan.map((i) => ({ i, p })));
  }, [projects]);

  const paidPayments = useMemo(() => {
    return allPayments.filter((x) => x.i.paid);
  }, [allPayments]);

  const getProjectPaidAmount = (p: Project): number => {
    return p.plan
      .filter((i) => i.paid)
      .reduce((acc, curr) => acc + curr.a, 0);
  };

  const getProjectPct = (p: Project): number => {
    if (!p.v) return 0;
    return Math.min(100, Math.round((getProjectPaidAmount(p) / p.v) * 100));
  };

  const getProjectStatus = (p: Project): ProjectStatus => {
    const paidCount = p.plan.filter((i) => i.paid).length;
    if (p.plan.length > 0 && paidCount === p.plan.length) return 'Finished';
    if (paidCount > 0) return 'Progress';
    return 'Pending';
  };

  const getBrandInitials = (name?: string): string => {
    const raw = name || studioProfile.studioName || 'Zyf.Space';
    const clean = raw.trim().replace(/[^a-zA-Z0-9\s.-]/g, '');
    const parts = clean.split(/[\s.-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0]?.[0] || 'Z') + 'S';
  };

  const getNextInvoiceNo = (targetDate?: string): string => {
    const d = targetDate ? new Date(targetDate + 'T00:00:00') : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const prefix = getBrandInitials(studioProfile.studioName);
    const count = allPayments.filter((x) => x.i.inv).length;
    return `INV/${prefix}/${mm}/${dd}/${pad(count + 1)}`;
  };

  const formatInvoiceNo = (rawNo?: string, invDate?: string): string => {
    if (!rawNo) return '';
    const prefix = getBrandInitials(studioProfile.studioName);
    const d = invDate ? new Date(invDate + 'T00:00:00') : new Date();
    const validDate = !isNaN(d.getTime());
    const mm = validDate ? String(d.getMonth() + 1).padStart(2, '0') : '10';
    const dd = validDate ? String(d.getDate()).padStart(2, '0') : '08';

    const parts = rawNo.split('/');
    if (parts.length === 5 && parts[0] === 'INV') {
      const pMm = parts[2] || mm;
      const pDd = parts[3] || dd;
      const pSeq = pad(parts[4]);
      return `INV/${prefix}/${pMm}/${pDd}/${pSeq}`;
    }

    const seqMatch = rawNo.match(/\d+$/);
    const seq = seqMatch ? pad(seqMatch[0]) : '001';
    return `INV/${prefix}/${mm}/${dd}/${seq}`;
  };

  const getNextQuoteNo = (targetDate?: string): string => {
    const d = targetDate ? new Date(targetDate + 'T00:00:00') : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const prefix = getBrandInitials(newQuoteData.senderName || studioProfile.studioName);
    return `QT/${prefix}/${mm}/${dd}/${pad(quotes.length + 1)}`;
  };

  const formatQuoteNo = (rawNo?: string, qDate?: string, senderName?: string): string => {
    if (!rawNo) return '';
    const prefix = getBrandInitials(senderName || studioProfile.studioName);
    const d = qDate ? new Date(qDate + 'T00:00:00') : new Date();
    const validDate = !isNaN(d.getTime());
    const mm = validDate ? String(d.getMonth() + 1).padStart(2, '0') : '10';
    const dd = validDate ? String(d.getDate()).padStart(2, '0') : '08';

    const parts = rawNo.split('/');
    if (parts.length === 5 && (parts[0] === 'QT' || parts[0] === 'QUO')) {
      const pMm = parts[2] || mm;
      const pDd = parts[3] || dd;
      const pSeq = pad(parts[4]);
      return `QT/${prefix}/${pMm}/${pDd}/${pSeq}`;
    }

    const seqMatch = rawNo.match(/\d+$/);
    const seq = seqMatch ? pad(seqMatch[0]) : '001';
    return `QT/${prefix}/${mm}/${dd}/${seq}`;
  };

  const openDoc = (t: 'inv' | 'quo', a: number, b?: number) => {
    setDocState({ t, a, b });
    setCurrentView('doc');
    closeDrawer();
  };

  const ensureClient = (info: { cn: string; co: string; mail: string; tel: string }): Client | null => {
    const name = info.cn.trim();
    if (!name) return null;
    const existing = clients.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;
    const newClient: Client = {
      id: Date.now(),
      name,
      co: info.co,
      mail: info.mail,
      tel: info.tel,
      n: '',
    };
    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  // Switch navigation view
  const navigateTo = (v: ViewMode) => {
    setCurrentView(v);
    setFilterStatus('All');
    setSearchQuery('');
    closeDrawer();
  };

  // Start creating new project
  const handleStartNewProject = () => {
    const defaultMode = clients.length > 0 ? 'existing' : 'new';
    const firstClient = clients[0];
    setProjectClientMode(defaultMode);
    setSelectedProjectClientId(firstClient ? firstClient.id : '');
    setNewProjectData({
      name: '',
      v: '',
      billingType: 'One-time',
      items: [{ d: '', type: 'One-time', p: '' }],
      due: '',
      desc: '',
      cn: firstClient ? firstClient.name : '',
      co: firstClient ? firstClient.co : '',
      mail: firstClient ? firstClient.mail : '',
      tel: firstClient ? firstClient.tel : '',
      pre: 'dp',
      plan: PRESETS.dp.map(([l, pct]) => ({ l, pct, due: '' })),
    });
    setCurrentView('new');
  };

  // Start creating new quotation
  const handleStartNewQuote = () => {
    const defaultMode = clients.length > 0 ? 'existing' : 'new';
    const firstClient = clients[0];
    setQuoteClientMode(defaultMode);
    setSelectedQuoteClientId(firstClient ? firstClient.id : '');
    setNewQuoteData({
      cn: firstClient ? firstClient.name : '',
      co: firstClient ? firstClient.co : '',
      mail: firstClient ? firstClient.mail : '',
      tel: firstClient ? firstClient.tel : '',
      title: '',
      date: today(),
      valid: ago(-7),
      validDays: 7,
      scope: [''],
      items: [{ d: '', type: 'One-time', q: 1, p: '' }],
      services: [''],
      paymentTerms: studioProfile.defaultPaymentTerms || '',
      note: studioProfile.defaultNotes || '',
      senderName: studioProfile.studioName || '',
      senderTagline: studioProfile.tagline || '',
      senderEmail: studioProfile.email || '',
      senderPhone: studioProfile.phone || '',
    });
    setCurrentView('quote');
  };

  // Plan creation logic
  const handlePlanPresetChange = (presetKey: string) => {
    if (presetKey !== 'custom') {
      setNewProjectData((prev) => ({
        ...prev,
        pre: presetKey,
        plan: PRESETS[presetKey].map(([l, pct]) => ({ l, pct, due: '' })),
      }));
    } else {
      setNewProjectData((prev) => ({
        ...prev,
        pre: 'custom',
        plan: prev.plan.length ? prev.plan : [{ l: '', pct: 100, due: '' }],
      }));
    }
  };

  const handleCreateProjectSubmit = () => {
    const val = +newProjectData.v;
    if (!newProjectData.name.trim()) return;
    if (!val || val <= 0) return;
    const totalPct = newProjectData.plan.reduce((acc, r) => acc + (+r.pct || 0), 0);
    if (!newProjectData.plan.length || totalPct !== 100) return;

    const c = ensureClient(newProjectData);
    const id = Date.now();
    let rem = val;
    let currentInvCount = allPayments.filter((x) => x.i.inv).length;
    const plan: PlanItem[] = newProjectData.plan.map((r, i) => {
      const a =
        i === newProjectData.plan.length - 1
          ? rem
          : Math.round((val * +r.pct) / 100);
      rem -= a;
      currentInvCount += 1;
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const dd = String(new Date().getDate()).padStart(2, '0');
      const prefix = getBrandInitials(studioProfile.studioName);
      const invNo = `INV/${prefix}/${mm}/${dd}/${pad(currentInvCount)}`;
      return {
        id: id * 10 + i,
        l: r.l || `Payment ${i + 1}`,
        pct: +r.pct,
        a,
        due: r.due,
        paid: false,
        pd: '',
        proof: null,
        inv: { no: invNo, date: today() },
      };
    });

    const validItems = newProjectData.items
      .filter((i) => i.d.trim() || +i.p > 0)
      .map((i) => ({
        d: i.d.trim() || newProjectData.name.trim(),
        type: i.type || 'One-time',
        p: +i.p || 0,
      }));

    const createdProj: Project = {
      id,
      name: newProjectData.name.trim(),
      c: c ? c.id : 0,
      v: val,
      billingType: newProjectData.billingType || (validItems[0]?.type || 'One-time'),
      items: validItems.length > 0 ? validItems : [{ d: newProjectData.name.trim(), type: newProjectData.billingType || 'One-time', p: val }],
      due: newProjectData.due,
      desc: newProjectData.desc,
      n: '',
      plan,
    };

    setProjects((prev) => [...prev, createdProj]);
    setCurrentView('projects');
    setFilterStatus('All');
    setSearchQuery('');
    setActiveProjectDrawerId(id);
  };

  const handleSaveQuotationSubmit = () => {
    if (!newQuoteData.cn.trim() || !newQuoteData.title.trim()) return;
    const c = ensureClient(newQuoteData);
    const validItems = newQuoteData.items
      .filter((i) => i.d || +i.p)
      .map((i) => ({
        d: i.d.trim(),
        type: i.type || 'One-time',
        q: +i.q || 1,
        p: +i.p || 0,
      }));

    const validScope = newQuoteData.scope
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const validServices = newQuoteData.services
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const qId = Date.now();
    const newQuote: Quotation = {
      id: qId,
      no: getNextQuoteNo(newQuoteData.date),
      cn: newQuoteData.cn.trim(),
      co: newQuoteData.co.trim(),
      mail: newQuoteData.mail.trim(),
      tel: newQuoteData.tel.trim(),
      title: newQuoteData.title.trim(),
      date: newQuoteData.date,
      valid: newQuoteData.valid,
      validDays: newQuoteData.validDays || 7,
      scope: validScope.length ? validScope : (validItems.length ? validItems.map(i => i.d) : ['Lingkup pekerjaan sesuai kesepakatan']),
      items: validItems.length ? validItems : [{ d: 'Service Deliverable', type: 'One-time', q: 1, p: 0 }],
      services: validServices,
      paymentTerms: newQuoteData.paymentTerms.trim(),
      note: newQuoteData.note.trim(),
      senderName: newQuoteData.senderName.trim(),
      senderTagline: newQuoteData.senderTagline.trim(),
      senderEmail: newQuoteData.senderEmail.trim(),
      senderPhone: newQuoteData.senderPhone.trim(),
      s: 'Draft',
      pid: 0,
    };

    setQuotes((prev) => [...prev, newQuote]);
    openDoc('quo', qId);
  };

  // Convert quote to project
  const handleConvertQuoteToProject = (q: Quotation) => {
    const c = ensureClient({
      cn: q.cn,
      co: q.co,
      mail: q.mail,
      tel: q.tel,
    });
    const id = Date.now();
    const tot = q.items.reduce((acc, curr) => acc + curr.q * curr.p, 0);
    const dpPlan = PRESETS.dp;
    let rem = tot;
    const plan: PlanItem[] = dpPlan.map(([l, pct], i) => {
      const a =
        i === dpPlan.length - 1 ? rem : Math.round((tot * pct) / 100);
      rem -= a;
      return {
        id: id * 10 + i,
        l,
        pct,
        a,
        due: '',
        paid: false,
        pd: '',
        proof: null,
        inv: null,
      };
    });

    const newProj: Project = {
      id,
      name: q.title,
      c: c ? c.id : 0,
      v: tot,
      billingType: q.items[0]?.type || 'One-time',
      items: q.items.map((it) => ({
        d: it.d || q.title,
        type: it.type || 'One-time',
        p: (it.q || 1) * it.p,
      })),
      due: '',
      desc: q.scope && q.scope.length ? q.scope.join('\n') : q.items.map((l) => l.d).join('\n'),
      n: `From ${q.no}`,
      plan,
    };

    setProjects((prev) => [...prev, newProj]);
    setQuotes((prev) =>
      prev.map((item) =>
        item.id === q.id ? { ...item, s: 'Accepted', pid: id } : item
      )
    );
    setCurrentView('projects');
    setActiveProjectDrawerId(id);
  };

  // Mark / undo payment
  const handleTogglePaymentPaid = (
    projectId: number,
    planItemId: number,
    markPaid: boolean,
    proofData?: { n: string; d: string } | null
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          plan: p.plan.map((item) => {
            if (item.id !== planItemId) return item;
            return {
              ...item,
              paid: markPaid,
              pd: markPaid ? (item.pd || today()) : '',
              proof: proofData !== undefined ? proofData : markPaid ? item.proof : null,
            };
          }),
        };
      })
    );
  };

  // UploadThing Proof Upload
  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);

  const handleProofUpload = async (
    projectId: number,
    planItemId: number,
    file: File
  ) => {
    setUploadingItemId(planItemId);
    try {
      const res = await uploadFiles('paymentProof', {
        files: [file],
      });
      if (res && res[0]) {
        const uploadedFile = res[0];
        const fileUrl = (uploadedFile as any).ufsUrl || uploadedFile.url;
        handleTogglePaymentPaid(projectId, planItemId, true, {
          n: uploadedFile.name,
          d: fileUrl,
        });
      } else {
        handleTogglePaymentPaid(projectId, planItemId, true, {
          n: file.name,
          d: '',
        });
      }
    } catch (err) {
      console.error('UploadThing error:', err);
      const reader = new FileReader();
      reader.onload = () => {
        handleTogglePaymentPaid(projectId, planItemId, true, {
          n: file.name,
          d: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleUpdatePaymentDate = (
    projectId: number,
    planItemId: number,
    newDate: string
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          plan: p.plan.map((item) => {
            if (item.id !== planItemId) return item;
            return {
              ...item,
              pd: newDate,
            };
          }),
        };
      })
    );
  };

  const handleUpdateDueDate = (
    projectId: number,
    planItemId: number,
    newDate: string
  ) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          plan: p.plan.map((item) => {
            if (item.id !== planItemId) return item;
            return {
              ...item,
              due: newDate,
            };
          }),
        };
      })
    );
  };

  // Invoice creation / view
  const handleCreateOrViewInvoice = (projectId: number, planItemId: number) => {
    let invNo = '';
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          plan: p.plan.map((item) => {
            if (item.id !== planItemId) return item;
            if (item.inv) {
              invNo = item.inv.no;
              return item;
            }
            const generatedNo = getNextInvoiceNo();
            invNo = generatedNo;
            return {
              ...item,
              inv: { no: generatedNo, date: today() },
            };
          }),
        };
      })
    );
    openDoc('inv', projectId, planItemId);
  };

  // Delete project
  const handleDeleteProject = (projectId: number) => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    closeDrawer();
  };

  // Delete client
  const handleDeleteClient = (clientId: number) => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    closeDrawer();
  };

  // Delete quote
  const handleDeleteQuote = (quoteId: number) => {
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    setCurrentView('quotations');
  };

  // Date range calculated from current chart filter
  const filterDateRange = useMemo(() => {
    if (chartMode === '6m') {
      const d = new Date();
      const refY = d.getFullYear();
      const refM = d.getMonth() + 1;
      const startD = new Date(refY, refM - 6, 1);
      const endD = new Date(refY, refM, 0);
      const start = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-01`;
      const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
      return { start, end, label: '6 bulan terakhir' };
    }
    if (chartMode === 'month') {
      const [y, m] = chartSelectedMonth.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const start = `${chartSelectedMonth}-01`;
      const end = `${chartSelectedMonth}-${String(daysInMonth).padStart(2, '0')}`;
      return { start, end, label: `${m}/${y}` };
    }
    const start = chartCustomRange.start || ago(30);
    const end = chartCustomRange.end || today();
    return { start, end, label: `${start} - ${end}` };
  }, [chartMode, chartSelectedMonth, chartCustomRange]);

  // Calculations for Overview (fully synchronized with chart period)
  const overviewMetrics = useMemo(() => {
    const { start: startDate, end: endDate } = filterDateRange;

    // Payments paid strictly within this filtered period
    const periodPaidPayments = paidPayments.filter(
      (x) => x.i.pd && x.i.pd >= startDate && x.i.pd <= endDate
    );
    const totalReceived = periodPaidPayments.reduce((acc, x) => acc + x.i.a, 0);

    // Projects active/relevant in this period
    const activeProjectsInPeriod = projects.filter((p) => {
      const hasPaid = p.plan.some((item) => item.paid && item.pd && item.pd >= startDate && item.pd <= endDate);
      const hasDue = p.plan.some((item) => item.due && item.due >= startDate && item.due <= endDate);
      const projectDue = p.due && p.due >= startDate && p.due <= endDate;
      return hasPaid || hasDue || projectDue;
    });

    const totalProjects = chartMode === '6m'
      ? projects.length
      : activeProjectsInPeriod.length;

    let totalOutstanding = 0;
    if (chartMode === '6m') {
      const totalContract = projects.reduce((acc, p) => acc + p.v, 0);
      const allTimeReceived = paidPayments.reduce((acc, x) => acc + x.i.a, 0);
      totalOutstanding = Math.max(0, totalContract - allTimeReceived);
    } else {
      const unpaidInPeriod = allPayments
        .filter((x) => !x.i.paid && x.i.due && x.i.due >= startDate && x.i.due <= endDate)
        .reduce((sum, x) => sum + x.i.a, 0);

      if (unpaidInPeriod > 0) {
        totalOutstanding = unpaidInPeriod;
      } else {
        totalOutstanding = activeProjectsInPeriod.reduce((sum, p) => {
          return sum + p.plan.filter((i) => !i.paid).reduce((s, i) => s + i.a, 0);
        }, 0);
      }
    }

    const currentYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const thisMonthVal = paidPayments
      .filter((x) => x.i.pd && x.i.pd.startsWith(currentYm))
      .reduce((sum, x) => sum + x.i.a, 0);

    const periodTxCount = periodPaidPayments.length;

    const upcoming = allPayments
      .filter((x) => !x.i.paid)
      .sort((a, b) => (a.i.due || '9') > (b.i.due || '9') ? 1 : -1)
      .slice(0, 5);

    const activeProjs = projects
      .filter((p) => getProjectStatus(p) !== 'Finished')
      .map((p) => {
        const nextDueItem = p.plan
          .filter((i) => !i.paid)
          .sort((a, b) => (a.due || '9') > (b.due || '9') ? 1 : -1)[0];
        return { p, n: nextDueItem };
      })
      .sort((a, b) =>
        ((a.n && a.n.due) || '9') > ((b.n && b.n.due) || '9') ? 1 : -1
      )
      .slice(0, 5);

    const openQuotes = quotes
      .filter((x) => x.s !== 'Accepted')
      .sort((a, b) => (a.valid > b.valid ? 1 : -1))
      .slice(0, 5);

    return {
      totalProjects,
      totalReceived,
      totalOutstanding,
      thisMonthVal,
      periodTxCount,
      upcoming,
      activeProjs,
      openQuotes,
    };
  }, [projects, paidPayments, allPayments, quotes, filterDateRange, chartMode]);

  // Render project drawer if active
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectDrawerId);
  }, [projects, activeProjectDrawerId]);

  // Render client drawer if active
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === activeClientDrawerId);
  }, [clients, activeClientDrawerId]);

  // Determine active nav key
  const activeNavKey =
    currentView === 'new'
      ? 'projects'
      : currentView === 'quote'
      ? 'quotations'
      : currentView === 'doc'
      ? docState?.t === 'inv'
        ? 'invoices'
        : 'quotations'
      : currentView;

  if (!isMounted) return null;

  if (!authUser) {
    if (guestView === 'landing') {
      return (
        <LandingPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAuth={(mode, email) => {
            setAuthInitialMode(mode);
            if (email) setAuthInitialEmail(email);
            setGuestView('auth');
          }}
        />
      );
    }

    return (
      <AuthScreen
        onSuccess={(user) => {
          setAuthUser(user);
          loadData(user.email);
          if (user.studioName || user.name) {
            const currentProfile = loadStudioProfile(user.email);
            const updatedProfile = {
              ...currentProfile,
              ownerName: user.name || currentProfile.ownerName,
              studioName: user.studioName || currentProfile.studioName,
              email: user.email || currentProfile.email,
            };
            setStudioProfile(updatedProfile);
            setProfileDraft(updatedProfile);
            saveStudioProfile(updatedProfile, user.email);
          }
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        initialMode={authInitialMode}
        initialEmail={authInitialEmail}
        onBackToLanding={() => setGuestView('landing')}
      />
    );
  }

  return (
    <div className={`app ${isSidebarCollapsed ? 'c' : ''}`}>
      {/* Sidebar */}
      <aside>
        <div className="brand">
          <DotStudioPaperLogo height={20} />
          <button
            className="ib"
            id="tg"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Icon name="side" size={17} />
            <span className="sidebar-tooltip">Expand sidebar</span>
          </button>
        </div>

        <button
          className={`nav ${activeNavKey === 'overview' ? 'on' : ''}`}
          onClick={() => navigateTo('overview')}
        >
          <Icon name="home" size={17} />
          <span className="lb">Overview</span>
          <span className="sidebar-tooltip">Overview</span>
        </button>

        <button
          className={`nav ${activeNavKey === 'projects' ? 'on' : ''}`}
          onClick={() => navigateTo('projects')}
        >
          <Icon name="folder" size={17} />
          <span className="lb">Projects</span>
          <em>{projects.length}</em>
          <span className="sidebar-tooltip">Projects</span>
        </button>

        <button
          className={`nav ${activeNavKey === 'clients' ? 'on' : ''}`}
          onClick={() => navigateTo('clients')}
        >
          <Icon name="users" size={17} />
          <span className="lb">Clients</span>
          <em>{clients.length}</em>
          <span className="sidebar-tooltip">Clients</span>
        </button>

        <button
          className={`nav ${activeNavKey === 'payments' ? 'on' : ''}`}
          onClick={() => navigateTo('payments')}
        >
          <Icon name="wallet" size={17} />
          <span className="lb">Payments</span>
          <span className="sidebar-tooltip">Payments</span>
        </button>

        <button
          className={`nav ${activeNavKey === 'invoices' ? 'on' : ''}`}
          onClick={() => navigateTo('invoices')}
        >
          <Icon name="file" size={17} />
          <span className="lb">Invoices</span>
          <span className="sidebar-tooltip">Invoices</span>
        </button>

        <button
          className={`nav ${activeNavKey === 'quotations' ? 'on' : ''}`}
          onClick={() => navigateTo('quotations')}
        >
          <Icon name="file" size={17} />
          <span className="lb">Quotations</span>
          <em>{quotes.length}</em>
          <span className="sidebar-tooltip">Quotations</span>
        </button>

        <button
          className={`nav ${activeNavKey === 'settings' ? 'on' : ''}`}
          onClick={() => navigateTo('settings')}
        >
          <Icon name="settings" size={17} />
          <span className="lb">Settings</span>
          <span className="sidebar-tooltip">Settings</span>
        </button>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            className="nav"
            id="th"
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            <span className="lb">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            <span className="sidebar-tooltip">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          <button
            className="nav"
            onClick={() => {
              setAuthSession(null);
              setAuthUser(null);
              setGuestView('landing');
            }}
            title="Log out"
          >
            <Icon name="logout" size={17} />
            <span className="lb">Log out</span>
            <span className="sidebar-tooltip">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main id="main">
        {/* NEW PROJECT VIEW */}
        {currentView === 'new' && (
          <div>
            <div className="top">
              <button
                className="ib"
                id="bk"
                onClick={() => setCurrentView('projects')}
                aria-label="Back to projects"
              >
                <Icon name="back" size={18} />
              </button>
              <h1>New project</h1>
            </div>

            <div className="project-split-layout">
              {/* Left Column: Form Details */}
              <div className="project-form-col">
                {/* Project Details Panel */}
                <div className="panel">
                  <h3>Project</h3>
                  <div className="f">
                    <label htmlFor="nn">Project name</label>
                    <input
                      id="nn"
                      type="text"
                      placeholder="Nama project / pekerjaan"
                      value={newProjectData.name}
                      onChange={(e) =>
                        setNewProjectData((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="f">
                    <label htmlFor="nd">Deadline</label>
                    <DatePicker
                      id="nd"
                      value={newProjectData.due}
                      onChange={(val) =>
                        setNewProjectData((prev) => ({ ...prev, due: val }))
                      }
                      placeholder="Select deadline"
                    />
                  </div>
                  <div className="f" style={{ margin: 0 }}>
                    <label htmlFor="ne">Scope / description</label>
                    <AutoTextarea
                      id="ne"
                      placeholder="Detail ruang lingkup / deliverables (1 baris = 1 poin)..."
                      value={newProjectData.desc}
                      onChange={(e) =>
                        setNewProjectData((prev) => ({ ...prev, desc: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Rincian Biaya Panel */}
                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>Rincian Biaya</h3>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        setNewProjectData((prev) => {
                          const nextItems = [...prev.items, { d: '', type: prev.billingType || 'One-time', p: '' }];
                          return { ...prev, items: nextItems };
                        });
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add item
                    </button>
                  </div>

                  <div id="project-items-table">
                    <div
                      className="pl hd"
                      style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 30px' }}
                    >
                      <span>Item</span>
                      <span>Jenis Biaya</span>
                      <span>Biaya (Rp)</span>
                      <span />
                    </div>
                    {newProjectData.items.map((r, i) => (
                      <div
                        key={i}
                        className="pl"
                        style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 30px' }}
                      >
                        <input
                          className="in"
                          placeholder="Nama item / layanan"
                          value={r.d}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewProjectData((prev) => {
                              const nextItems = [...prev.items];
                              nextItems[i] = { ...nextItems[i], d: val };
                              return { ...prev, items: nextItems };
                            });
                          }}
                        />
                        <select
                          className="in"
                          value={r.type || 'One-time'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewProjectData((prev) => {
                              const nextItems = [...prev.items];
                              nextItems[i] = { ...nextItems[i], type: val };
                              return { ...prev, items: nextItems };
                            });
                          }}
                        >
                          <option value="One-time">One-time</option>
                          <option value="Bulanan">Bulanan (Monthly)</option>
                          <option value="Per Project">Per Project</option>
                          <option value="Retainer">Retainer</option>
                          <option value="Hourly">Hourly</option>
                        </select>
                        <input
                          className="in"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={r.p}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewProjectData((prev) => {
                              const nextItems = [...prev.items];
                              nextItems[i] = { ...nextItems[i], p: val };
                              const sumVal = nextItems.reduce((acc, curr) => acc + (+curr.p || 0), 0);
                              return {
                                ...prev,
                                items: nextItems,
                                v: sumVal > 0 ? String(sumVal) : prev.v,
                              };
                            });
                          }}
                        />
                        <button
                          type="button"
                          className="ib"
                          onClick={() => {
                            setNewProjectData((prev) => {
                              const nextItems = prev.items.filter((_, idx) => idx !== i);
                              const fallback = nextItems.length ? nextItems : [{ d: '', type: 'One-time', p: '' }];
                              const sumVal = fallback.reduce((acc, curr) => acc + (+curr.p || 0), 0);
                              return {
                                ...prev,
                                items: fallback,
                                v: sumVal > 0 ? String(sumVal) : prev.v,
                              };
                            });
                          }}
                          aria-label="Remove item"
                        >
                          <Icon name="x" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="row" style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                    <span className="mut" style={{ fontSize: '13px' }}>Total Project Value</span>
                    <b style={{ fontSize: '15px' }}>
                      {rp(
                        newProjectData.items.reduce(
                          (acc, curr) => acc + (+curr.p || 0),
                          0
                        ) || (+newProjectData.v || 0)
                      )}
                    </b>
                  </div>
                </div>

                {/* Client Details Panel */}
                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>Client</h3>
                    {clients.length > 0 && (
                      <div className="chips" style={{ margin: 0 }}>
                        <button
                          type="button"
                          className={`chip ${projectClientMode === 'existing' ? 'on' : ''}`}
                          onClick={() => {
                            setProjectClientMode('existing');
                            const targetClient = clients.find((c) => c.id === selectedProjectClientId) || clients[0];
                            if (targetClient) {
                              setSelectedProjectClientId(targetClient.id);
                              setNewProjectData((prev) => ({
                                ...prev,
                                cn: targetClient.name,
                                co: targetClient.co,
                                mail: targetClient.mail,
                                tel: targetClient.tel,
                              }));
                            }
                          }}
                        >
                          Existing client
                        </button>
                        <button
                          type="button"
                          className={`chip ${projectClientMode === 'new' ? 'on' : ''}`}
                          onClick={() => {
                            setProjectClientMode('new');
                            setNewProjectData((prev) => ({
                              ...prev,
                              cn: '',
                              co: '',
                              mail: '',
                              tel: '',
                            }));
                          }}
                        >
                          New client
                        </button>
                      </div>
                    )}
                  </div>

                  {projectClientMode === 'existing' && clients.length > 0 ? (
                    <div>
                      <div className="f">
                        <label htmlFor="select-project-client">Select client</label>
                        <select
                          id="select-project-client"
                          className="in"
                          value={selectedProjectClientId}
                          onChange={(e) => {
                            const chosenId = +e.target.value;
                            setSelectedProjectClientId(chosenId);
                            const found = clients.find((c) => c.id === chosenId);
                            if (found) {
                              setNewProjectData((prev) => ({
                                ...prev,
                                cn: found.name,
                                co: found.co,
                                mail: found.mail,
                                tel: found.tel,
                              }));
                            }
                          }}
                        >
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.co ? `· ${c.co}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const activeSelectedClient = clients.find((c) => c.id === selectedProjectClientId) || clients[0];
                        if (!activeSelectedClient) return null;
                        return (
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: '1px solid var(--line)',
                              background: 'var(--soft)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              fontSize: '13px',
                              marginTop: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="mut" style={{ fontSize: '12px' }}>Company</span>
                              <span style={{ fontWeight: 500 }}>{activeSelectedClient.co || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="mut" style={{ fontSize: '12px' }}>Email</span>
                              <span>{activeSelectedClient.mail || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="mut" style={{ fontSize: '12px' }}>Phone</span>
                              <span>{activeSelectedClient.tel || '—'}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      <div className="f">
                        <label htmlFor="nc">Name</label>
                        <input
                          id="nc"
                          type="text"
                          placeholder="e.g. Maya Lestari"
                          value={newProjectData.cn}
                          onChange={(e) =>
                            setNewProjectData((prev) => ({ ...prev, cn: e.target.value }))
                          }
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="no">Company</label>
                        <input
                          id="no"
                          type="text"
                          placeholder="e.g. PT Digital Nusantara"
                          value={newProjectData.co}
                          onChange={(e) =>
                            setNewProjectData((prev) => ({ ...prev, co: e.target.value }))
                          }
                        />
                      </div>
                      <div className="two">
                        <div className="f">
                          <label htmlFor="nm">Email</label>
                          <input
                            id="nm"
                            type="email"
                            placeholder="client@company.com"
                            value={newProjectData.mail}
                            onChange={(e) =>
                              setNewProjectData((prev) => ({ ...prev, mail: e.target.value }))
                            }
                          />
                        </div>
                        <div className="f">
                          <label htmlFor="nt">Phone</label>
                          <input
                            id="nt"
                            type="tel"
                            placeholder="+62 812..."
                            value={newProjectData.tel}
                            onChange={(e) =>
                              setNewProjectData((prev) => ({ ...prev, tel: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Scheme Panel */}
                <div className="panel">
                  <h3>Payment scheme</h3>
                  <div className="chips" style={{ marginTop: 0 }}>
                    {Object.keys(PRESET_NAMES).map((k) => (
                      <button
                        key={k}
                        className={`chip ${newProjectData.pre === k ? 'on' : ''}`}
                        onClick={() => handlePlanPresetChange(k)}
                      >
                        {PRESET_NAMES[k]}
                      </button>
                    ))}
                  </div>

                  <div id="plan">
                    <div className="pl hd">
                      <span>Label</span>
                      <span>%</span>
                      <span>Amount</span>
                      <span>Due date</span>
                      <span />
                    </div>
                    {newProjectData.plan.map((r, i) => {
                      const totalVal = +newProjectData.v || 0;
                      const calculatedAmount = Math.round(
                        (totalVal * (+r.pct || 0)) / 100
                      );
                      return (
                        <div key={i} className="pl">
                          <input
                            className="in"
                            value={r.l}
                            placeholder="e.g. DP"
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewProjectData((prev) => {
                                const nextPlan = [...prev.plan];
                                nextPlan[i] = { ...nextPlan[i], l: val };
                                return { ...prev, pre: 'custom', plan: nextPlan };
                              });
                            }}
                          />
                          <input
                            className="in"
                            type="number"
                            min="0"
                            max="100"
                            value={r.pct}
                            onChange={(e) => {
                              const val = +e.target.value;
                              setNewProjectData((prev) => {
                                const nextPlan = [...prev.plan];
                                nextPlan[i] = { ...nextPlan[i], pct: val };
                                return { ...prev, pre: 'custom', plan: nextPlan };
                              });
                            }}
                          />
                          <span className="amt">{rp(calculatedAmount)}</span>
                          <DatePicker
                            value={r.due}
                            onChange={(val) => {
                              setNewProjectData((prev) => {
                                const nextPlan = [...prev.plan];
                                nextPlan[i] = { ...nextPlan[i], due: val };
                                return { ...prev, plan: nextPlan };
                              });
                            }}
                            placeholder="Due date"
                            className="plan-row-datepicker"
                          />
                          <button
                            className="ib"
                            onClick={() => {
                              setNewProjectData((prev) => {
                                const nextPlan = prev.plan.filter((_, idx) => idx !== i);
                                return { ...prev, pre: 'custom', plan: nextPlan };
                              });
                            }}
                            aria-label="Remove installment"
                          >
                            <Icon name="x" />
                          </button>
                        </div>
                      );
                    })}

                    <button
                      className="btn sm"
                      id="ar"
                      onClick={() => {
                        setNewProjectData((prev) => ({
                          ...prev,
                          pre: 'custom',
                          plan: [...prev.plan, { l: '', pct: 0, due: '' }],
                        }));
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add installment
                    </button>
                  </div>
                </div>

                {/* Submit Panel */}
                <div className="panel">
                  <div className="row" style={{ marginBottom: '8px' }}>
                    <span className="mut">Total Scheme</span>
                    {(() => {
                      const sumPct = newProjectData.plan.reduce(
                        (acc, r) => acc + (+r.pct || 0),
                        0
                      );
                      return <b className={sumPct === 100 ? '' : 'od'}>{sumPct}%</b>;
                    })()}
                  </div>
                  {(() => {
                    const sumPct = newProjectData.plan.reduce(
                      (acc, r) => acc + (+r.pct || 0),
                      0
                    );
                    return sumPct !== 100 ? (
                      <div className="od" style={{ fontSize: '12px', marginBottom: '10px' }}>
                        Installments must add up to 100%.
                      </div>
                    ) : null;
                  })()}
                  <p className="note" style={{ margin: '0 0 12px' }}>
                    Status updates automatically: Pending → In progress → Finished as each payment is confirmed.
                  </p>
                  <button
                    className="btn pri"
                    id="mk"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleCreateProjectSubmit}
                  >
                    Create project
                  </button>
                </div>
              </div>

              {/* Right Column: Live Invoice Preview */}
              <div className="project-preview-col">
                <div className="project-preview-sticky-wrap">
                  <div className="docx-paper">
                    <div className="docx-body-content">
                      {/* Header */}
                      <div className="docx-header-grid">
                        <div>
                          <div className="docx-h-title">Invoice</div>
                          <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                            No. Invoice {getNextInvoiceNo()} (Draft)
                          </div>
                          <div className="docx-h-sub">Invoice Date: {dt(today())}</div>
                          <div className="docx-h-sub">
                            Due Date: {newProjectData.plan[0]?.due ? dt(newProjectData.plan[0].due) : (newProjectData.due ? dt(newProjectData.due) : '—')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="docx-h-title">{studioProfile.studioName || 'Studio'}</div>
                          {studioProfile.tagline && <div className="docx-h-sub" style={{ marginTop: '4px' }}>{studioProfile.tagline}</div>}
                          {(studioProfile.email || studioProfile.phone) && (
                            <div className="docx-h-sub">
                              {studioProfile.email}
                              {studioProfile.phone ? (studioProfile.email ? ` · ${studioProfile.phone}` : studioProfile.phone) : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recipient & Sender Meta Box */}
                      <div className="docx-meta-grid">
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            <b>Kepada:</b> {newProjectData.cn || 'Nama Klien'} {newProjectData.co ? `(${newProjectData.co})` : ''}
                          </div>
                          <div>
                            <b>Subject:</b> Invoice {newProjectData.name || 'Layanan Project'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div>
                            <b>Dari:</b> {studioProfile.studioName || 'Studio'}
                          </div>
                        </div>
                      </div>

                      {/* Section 1: Ruang Lingkup Pekerjaan (Scope of Work) */}
                      <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
                      <ol className="docx-list">
                        {(() => {
                          const rawLines = newProjectData.desc
                            ? newProjectData.desc
                                .split('\n')
                                .map((s) => s.trim().replace(/^[-*•\d.]+\s*/, ''))
                                .filter(Boolean)
                            : [];
                          const scopeItems = rawLines.length > 0 ? rawLines : [newProjectData.name || 'Lingkup pekerjaan sesuai kesepakatan'];
                          return scopeItems.map((sc, idx) => (
                            <li key={idx}>{sc}</li>
                          ));
                        })()}
                      </ol>

                      {/* Section 2: Rincian Biaya */}
                      <div className="docx-sec-title bold">Rincian Biaya</div>
                      <table className="docx-cost-table">
                        <thead>
                          <tr>
                            <th style={{ width: '52%' }}>Item</th>
                            <th className="c" style={{ width: '24%' }}>Jenis Biaya</th>
                            <th className="c" style={{ width: '24%' }}>Biaya</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const activeItems = newProjectData.items.filter((it) => it.d.trim() || +it.p > 0);
                            const displayItems = activeItems.length > 0
                              ? activeItems
                              : [{ d: newProjectData.name || 'Layanan Project', type: newProjectData.billingType || 'One-time', p: +newProjectData.v || 0 }];

                            return displayItems.map((it, idx) => (
                              <tr key={idx}>
                                <td>{it.d || newProjectData.name || `Item Layanan ${idx + 1}`}</td>
                                <td className="c">{it.type || 'One-time'}</td>
                                <td className="c" style={{ fontWeight: 700 }}>
                                  Rp{(+it.p || 0).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>

                      {/* Payment Method & Summary Grid */}
                      <div className="docx-payment-summary-grid">
                        <div className="docx-payment-method-box">
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>Payment Method</div>
                          <div><b>Bank:</b> {studioProfile.bankName || 'BCA / Mandiri Transfer'}</div>
                          <div><b>Account Number:</b> {studioProfile.accountNumber || '123-456-7890'}</div>
                          <div><b>Account Holder:</b> {studioProfile.accountHolder || studioProfile.ownerName || studioProfile.studioName || 'Faiz Dawami'}</div>
                        </div>
                        <div className="docx-calc-box">
                          <div className="docx-calc-row">
                            <span>Sub-total</span>
                            <span>Rp{(+newProjectData.v || 0).toLocaleString('id-ID')}</span>
                          </div>
                          {newProjectData.plan.length > 1 && (+newProjectData.plan[0]?.pct || 0) < 100 && (
                            <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                              <span>{newProjectData.plan[0]?.l || 'Down Payment'} ({newProjectData.plan[0]?.pct || 50}%)</span>
                              <span>
                                Rp{Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 50)) / 100).toLocaleString('id-ID')}
                              </span>
                            </div>
                          )}
                          <div className="docx-calc-total">
                            <span>Amount Due</span>
                            <span>
                              Rp{Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 100)) / 100).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Catatan dan Ketentuan */}
                      <div className="docx-sec-title">Catatan dan Ketentuan</div>
                      <ol className="docx-list">
                        <li>
                          Pembayaran saat ini adalah <b>{newProjectData.plan[0]?.l || 'Termin 1'} ({newProjectData.plan[0]?.pct || 100}%)</b> sebesar <b>Rp{Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 100)) / 100).toLocaleString('id-ID')}</b> untuk layanan <b>{newProjectData.name || 'Project'}</b>.
                        </li>
                        <li>
                          Jatuh tempo pembayaran pada {newProjectData.plan[0]?.due ? dt(newProjectData.plan[0].due) : (newProjectData.due ? dt(newProjectData.due) : 'sesuai kesepakatan')}.
                        </li>
                      </ol>
                    </div>

                    {/* Footer Wrap at bottom of page */}
                    <div className="docx-footer-wrap">
                      <div className="docx-footer">
                        <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
                        <div>Hormat Kami</div>
                        <div style={{ height: '36px' }} />
                        <div style={{ fontWeight: 700 }}>{studioProfile.studioName || 'Studio'}</div>
                        {studioProfile.tagline && <div style={{ fontSize: '13px' }}>{studioProfile.tagline}</div>}
                      </div>

                      {/* Subtle Watermark */}
                      <DocumentWatermark />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NEW QUOTATION VIEW */}
        {currentView === 'quote' && (
          <div>
            <div className="top">
              <button
                className="ib"
                id="bk"
                onClick={() => setCurrentView('quotations')}
                aria-label="Back to quotations"
              >
                <Icon name="back" size={18} />
              </button>
              <h1>New quotation</h1>
            </div>

            <div className="project-split-layout">
              <div className="project-form-col">
                {/* Client info */}
                <div className="panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0 }}>Client</h3>
                    {clients.length > 0 && (
                      <div className="chips" style={{ margin: 0 }}>
                        <button
                          type="button"
                          className={`chip ${quoteClientMode === 'existing' ? 'on' : ''}`}
                          onClick={() => {
                            setQuoteClientMode('existing');
                            const targetClient = clients.find((c) => c.id === selectedQuoteClientId) || clients[0];
                            if (targetClient) {
                              setSelectedQuoteClientId(targetClient.id);
                              setNewQuoteData((prev) => ({
                                ...prev,
                                cn: targetClient.name,
                                co: targetClient.co,
                                mail: targetClient.mail,
                                tel: targetClient.tel,
                              }));
                            }
                          }}
                        >
                          Existing client
                        </button>
                        <button
                          type="button"
                          className={`chip ${quoteClientMode === 'new' ? 'on' : ''}`}
                          onClick={() => {
                            setQuoteClientMode('new');
                            setNewQuoteData((prev) => ({
                              ...prev,
                              cn: '',
                              co: '',
                              mail: '',
                              tel: '',
                            }));
                          }}
                        >
                          New client
                        </button>
                      </div>
                    )}
                  </div>

                  {quoteClientMode === 'existing' && clients.length > 0 ? (
                    <div>
                      <div className="f">
                        <label htmlFor="select-quote-client">Select client</label>
                        <select
                          id="select-quote-client"
                          className="in"
                          value={selectedQuoteClientId}
                          onChange={(e) => {
                            const chosenId = +e.target.value;
                            setSelectedQuoteClientId(chosenId);
                            const found = clients.find((c) => c.id === chosenId);
                            if (found) {
                              setNewQuoteData((prev) => ({
                                ...prev,
                                cn: found.name,
                                co: found.co,
                                mail: found.mail,
                                tel: found.tel,
                              }));
                            }
                          }}
                        >
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.co ? `· ${c.co}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const activeSelectedClient = clients.find((c) => c.id === selectedQuoteClientId) || clients[0];
                        if (!activeSelectedClient) return null;
                        return (
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              border: '1px solid var(--line)',
                              background: 'var(--soft)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              fontSize: '13px',
                              marginTop: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="mut" style={{ fontSize: '12px' }}>Company</span>
                              <span style={{ fontWeight: 500 }}>{activeSelectedClient.co || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="mut" style={{ fontSize: '12px' }}>Email</span>
                              <span>{activeSelectedClient.mail || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span className="mut" style={{ fontSize: '12px' }}>Phone</span>
                              <span>{activeSelectedClient.tel || '—'}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      <div className="f">
                        <label htmlFor="qc">Name</label>
                        <input
                          id="qc"
                          type="text"
                          placeholder="e.g. Maya Lestari"
                          value={newQuoteData.cn}
                          onChange={(e) =>
                            setNewQuoteData((prev) => ({ ...prev, cn: e.target.value }))
                          }
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="qo">Company</label>
                        <input
                          id="qo"
                          type="text"
                          placeholder="e.g. PT Digital Nusantara"
                          value={newQuoteData.co}
                          onChange={(e) =>
                            setNewQuoteData((prev) => ({ ...prev, co: e.target.value }))
                          }
                        />
                      </div>
                      <div className="two">
                        <div className="f">
                          <label htmlFor="qm">Email</label>
                          <input
                            id="qm"
                            type="email"
                            placeholder="client@company.com"
                            value={newQuoteData.mail}
                            onChange={(e) =>
                              setNewQuoteData((prev) => ({ ...prev, mail: e.target.value }))
                            }
                          />
                        </div>
                        <div className="f">
                          <label htmlFor="qt">Phone</label>
                          <input
                            id="qt"
                            type="tel"
                            placeholder="+62 812..."
                            value={newQuoteData.tel}
                            onChange={(e) =>
                              setNewQuoteData((prev) => ({ ...prev, tel: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quotation Details */}
                <div className="panel">
                  <h3>Quotation</h3>
                  <div className="f">
                    <label htmlFor="qn">Subject / Project Title</label>
                    <input
                      id="qn"
                      type="text"
                      placeholder="Nama quotation / project"
                      value={newQuoteData.title}
                      onChange={(e) =>
                        setNewQuoteData((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="two">
                    <div className="f">
                      <label htmlFor="qd">Date</label>
                      <DatePicker
                        id="qd"
                        value={newQuoteData.date}
                        onChange={(val) =>
                          setNewQuoteData((prev) => ({ ...prev, date: val }))
                        }
                      />
                    </div>
                    <div className="two">
                      <div className="f">
                        <label htmlFor="qvd">Valid (Days)</label>
                        <input
                          id="qvd"
                          type="number"
                          min="1"
                          max="90"
                          value={newQuoteData.validDays}
                          onChange={(e) => {
                            const days = +e.target.value || 7;
                            setNewQuoteData((prev) => ({
                              ...prev,
                              validDays: days,
                              valid: ago(-days),
                            }));
                          }}
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="qv">Valid Until</label>
                        <DatePicker
                          id="qv"
                          value={newQuoteData.valid}
                          onChange={(val) =>
                            setNewQuoteData((prev) => ({ ...prev, valid: val }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scope of Work */}
                <div className="panel">
                  <div className="row" style={{ marginBottom: '10px' }}>
                    <h3>Ruang Lingkup Pekerjaan (Scope of Work)</h3>
                    <button
                      className="btn sm"
                      onClick={() => {
                        setNewQuoteData((prev) => ({
                          ...prev,
                          scope: [...prev.scope, ''],
                        }));
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add scope
                    </button>
                  </div>
                  {newQuoteData.scope.map((sc, i) => (
                    <div key={i} className="row" style={{ marginBottom: '8px' }}>
                      <span className="mut" style={{ width: '22px', fontSize: '13px' }}>
                        {i + 1}.
                      </span>
                      <input
                        className="in"
                        placeholder={`Scope item ${i + 1}`}
                        value={sc}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewQuoteData((prev) => {
                            const next = [...prev.scope];
                            next[i] = val;
                            return { ...prev, scope: next };
                          });
                        }}
                      />
                      <button
                        className="ib"
                        onClick={() => {
                          setNewQuoteData((prev) => {
                            const next = prev.scope.filter((_, idx) => idx !== i);
                            return {
                              ...prev,
                              scope: next.length ? next : [''],
                            };
                          });
                        }}
                        aria-label="Remove scope item"
                      >
                        <Icon name="x" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cost Breakdown Items */}
                <div className="panel">
                  <div className="row" style={{ marginBottom: '10px' }}>
                    <h3>Rincian Biaya</h3>
                    <button
                      className="btn sm"
                      id="ai"
                      onClick={() => {
                        setNewQuoteData((prev) => ({
                          ...prev,
                          items: [...prev.items, { d: '', type: 'One-time', q: 1, p: '' }],
                        }));
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add cost item
                    </button>
                  </div>
                  <div id="its">
                    <div
                      className="pl hd"
                      style={{ gridTemplateColumns: '2fr 1.1fr 60px 1.2fr 1fr 30px' }}
                    >
                      <span>Item</span>
                      <span>Jenis Biaya</span>
                      <span>Qty</span>
                      <span>Biaya (Rp)</span>
                      <span>Total</span>
                      <span />
                    </div>
                    {newQuoteData.items.map((r, i) => {
                      const amount = (+r.q || 0) * (+r.p || 0);
                      return (
                        <div
                          key={i}
                          className="pl"
                          style={{ gridTemplateColumns: '2fr 1.1fr 60px 1.2fr 1fr 30px' }}
                        >
                          <input
                            className="in"
                            placeholder="Nama item / layanan"
                            value={r.d}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewQuoteData((prev) => {
                                const next = [...prev.items];
                                next[i] = { ...next[i], d: val };
                                return { ...prev, items: next };
                              });
                            }}
                          />
                          <input
                            className="in"
                            placeholder="Jenis (One-time, Bulanan, etc.)"
                            value={r.type || 'One-time'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewQuoteData((prev) => {
                                const next = [...prev.items];
                                next[i] = { ...next[i], type: val };
                                return { ...prev, items: next };
                              });
                            }}
                          />
                          <input
                            className="in"
                            type="number"
                            min="0"
                            value={r.q}
                            onChange={(e) => {
                              const val = +e.target.value;
                              setNewQuoteData((prev) => {
                                const next = [...prev.items];
                                next[i] = { ...next[i], q: val };
                                return { ...prev, items: next };
                              });
                            }}
                          />
                          <input
                            className="in"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={r.p}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewQuoteData((prev) => {
                                const next = [...prev.items];
                                next[i] = { ...next[i], p: val };
                                return { ...prev, items: next };
                              });
                            }}
                          />
                          <span className="amt">{rp(amount)}</span>
                          <button
                            className="ib"
                            onClick={() => {
                              setNewQuoteData((prev) => {
                                const next = prev.items.filter((_, idx) => idx !== i);
                                return {
                                  ...prev,
                                  items: next.length ? next : [{ d: '', type: 'One-time', q: 1, p: '' }],
                                };
                              });
                            }}
                            aria-label="Remove item"
                          >
                            <Icon name="x" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cakupan/Services */}
                <div className="panel">
                  <div className="row" style={{ marginBottom: '10px' }}>
                    <h3>Cakupan / Services</h3>
                    <button
                      className="btn sm"
                      onClick={() => {
                        setNewQuoteData((prev) => ({
                          ...prev,
                          services: [...prev.services, ''],
                        }));
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add service
                    </button>
                  </div>
                  {newQuoteData.services.map((sv, i) => (
                    <div key={i} className="row" style={{ marginBottom: '8px' }}>
                      <span className="mut" style={{ width: '22px', fontSize: '13px' }}>
                        {i + 1}.
                      </span>
                      <input
                        className="in"
                        placeholder={`Deliverable item ${i + 1}`}
                        value={sv}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewQuoteData((prev) => {
                            const next = [...prev.services];
                            next[i] = val;
                            return { ...prev, services: next };
                          });
                        }}
                      />
                      <button
                        className="ib"
                        onClick={() => {
                          setNewQuoteData((prev) => {
                            const next = prev.services.filter((_, idx) => idx !== i);
                            return {
                              ...prev,
                              services: next.length ? next : [''],
                            };
                          });
                        }}
                        aria-label="Remove service item"
                      >
                        <Icon name="x" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Syarat & Ketentuan */}
                <div className="panel">
                  <h3>Syarat & Ketentuan</h3>
                  <div className="f">
                    <label htmlFor="qpt">Syarat Pembayaran</label>
                    <input
                      id="qpt"
                      type="text"
                      placeholder="e.g. 50% di awal sebelum pengerjaan, pelunasan saat selesai"
                      value={newQuoteData.paymentTerms}
                      onChange={(e) =>
                        setNewQuoteData((prev) => ({ ...prev, paymentTerms: e.target.value }))
                      }
                    />
                  </div>
                  <div className="f" style={{ margin: 0 }}>
                    <label htmlFor="qo">Catatan Tambahan</label>
                    <AutoTextarea
                      id="qo"
                      placeholder="Catatan khusus, batasan revisi, atau syarat lainnya…"
                      value={newQuoteData.note}
                      onChange={(e) =>
                        setNewQuoteData((prev) => ({ ...prev, note: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Freelancer / Sender Profile */}
                <div className="panel">
                  <h3>Freelancer / Sender</h3>
                  <div className="two">
                    <div className="f">
                      <label htmlFor="qsn">Name / Studio</label>
                      <input
                        id="qsn"
                        type="text"
                        placeholder="e.g. Nama Studio / Freelancer"
                        value={newQuoteData.senderName}
                        onChange={(e) =>
                          setNewQuoteData((prev) => ({ ...prev, senderName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="f">
                      <label htmlFor="qst">Tagline</label>
                      <input
                        id="qst"
                        type="text"
                        placeholder="e.g. Digital Partner Solution"
                        value={newQuoteData.senderTagline}
                        onChange={(e) =>
                          setNewQuoteData((prev) => ({ ...prev, senderTagline: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="two">
                    <div className="f" style={{ margin: 0 }}>
                      <label htmlFor="qse">Email</label>
                      <input
                        id="qse"
                        type="email"
                        placeholder="e.g. contact@studio.com"
                        value={newQuoteData.senderEmail}
                        onChange={(e) =>
                          setNewQuoteData((prev) => ({ ...prev, senderEmail: e.target.value }))
                        }
                      />
                    </div>
                    <div className="f" style={{ margin: 0 }}>
                      <label htmlFor="qsp">Phone</label>
                      <input
                        id="qsp"
                        type="tel"
                        placeholder="e.g. 0812-3456-7890"
                        value={newQuoteData.senderPhone}
                        onChange={(e) =>
                          setNewQuoteData((prev) => ({ ...prev, senderPhone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Panel */}
                <div className="panel">
                  <div className="row" style={{ marginBottom: '8px' }}>
                    <span className="mut">Total Quotation</span>
                    <b>
                      {rp(
                        newQuoteData.items.reduce(
                          (acc, curr) => acc + (+curr.q || 0) * (+curr.p || 0),
                          0
                        )
                      )}
                    </b>
                  </div>
                  <p className="note" style={{ margin: '0 0 12px' }}>
                    When the client accepts, convert it to a project in one click.
                  </p>
                  <button
                    className="btn pri"
                    id="mk"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleSaveQuotationSubmit}
                  >
                    Save quotation
                  </button>
                </div>
              </div>

              {/* Right Column: Live Quotation Preview */}
              <div className="project-preview-col">
                <div className="project-preview-sticky-wrap">
                  <div className="docx-paper">
                    <div className="docx-body-content">
                      {/* Header */}
                      <div className="docx-header-grid">
                        <div>
                          <div className="docx-h-title">Quotation</div>
                          <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                            No. Quotation {getNextQuoteNo(newQuoteData.date)} (Draft)
                          </div>
                          <div className="docx-h-sub">Valid until {newQuoteData.valid ? dt(newQuoteData.valid) : '—'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="docx-h-title">{newQuoteData.senderName || studioProfile.studioName || 'Studio'}</div>
                          {(newQuoteData.senderTagline || studioProfile.tagline) && (
                            <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                              {newQuoteData.senderTagline || studioProfile.tagline}
                            </div>
                          )}
                          {(newQuoteData.senderEmail || studioProfile.email || newQuoteData.senderPhone || studioProfile.phone) && (
                            <div className="docx-h-sub">
                              {newQuoteData.senderEmail || studioProfile.email}
                              {(newQuoteData.senderPhone || studioProfile.phone) ? ` · ${newQuoteData.senderPhone || studioProfile.phone}` : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recipient & Sender Meta Box */}
                      <div className="docx-meta-grid">
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            <b>Kepada:</b> {newQuoteData.cn || 'Nama Klien'} {newQuoteData.co ? `(${newQuoteData.co})` : ''}
                          </div>
                          <div>
                            <b>Subject:</b> Quotation {newQuoteData.title || 'Layanan Project'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div>
                            <b>Dari:</b> {newQuoteData.senderName || studioProfile.studioName || 'Studio'}
                          </div>
                        </div>
                      </div>

                      {/* Section 1: Scope */}
                      <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
                      <ol className="docx-list">
                        {(newQuoteData.scope.filter(s => s.trim()).length > 0
                          ? newQuoteData.scope.filter(s => s.trim())
                          : newQuoteData.items.map(i => i.d).filter(d => d.trim()).length > 0
                          ? newQuoteData.items.map(i => i.d).filter(d => d.trim())
                          : ['Lingkup pekerjaan sesuai kesepakatan']
                        ).map((sc, idx) => (
                          <li key={idx}>{sc}</li>
                        ))}
                      </ol>

                      {/* Section 2: Rincian Biaya */}
                      <div className="docx-sec-title bold">Rincian Biaya</div>
                      <table className="docx-cost-table">
                        <thead>
                          <tr>
                            <th style={{ width: '52%' }}>Item</th>
                            <th className="c" style={{ width: '24%' }}>Jenis Biaya</th>
                            <th className="c" style={{ width: '24%' }}>Biaya</th>
                          </tr>
                        </thead>
                        <tbody>
                          {newQuoteData.items.map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.d || `Item Layanan ${idx + 1}`}</td>
                              <td className="c">{it.type || 'One-time'}</td>
                              <td className="c" style={{ fontWeight: 700 }}>
                                Rp{(+it.p || 0).toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Section 3: Cakupan/Services */}
                      {newQuoteData.services.filter(s => s.trim()).length > 0 && (
                        <>
                          <div className="docx-sec-title">Cakupan/Services</div>
                          <ol className="docx-list">
                            {newQuoteData.services.filter(s => s.trim()).map((sv, idx) => (
                              <li key={idx}>{sv}</li>
                            ))}
                          </ol>
                        </>
                      )}

                      {/* Section 4: Syarat & Ketentuan */}
                      <div className="docx-sec-title">Syarat &amp; Ketentuan</div>
                      <ol className="docx-list">
                        {newQuoteData.note && <li>{newQuoteData.note}</li>}
                        {newQuoteData.paymentTerms && (
                          <li>
                            <b>Syarat pembayaran: {newQuoteData.paymentTerms}</b>
                          </li>
                        )}
                        <li>
                          Quotation ini berlaku {newQuoteData.validDays || 7} hari dari tanggal dikirimkan.
                        </li>
                      </ol>
                    </div>

                    {/* Footer Wrap at bottom of page */}
                    <div className="docx-footer-wrap">
                      <div className="docx-footer">
                        <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
                        <div>Hormat Kami</div>
                        <div style={{ height: '36px' }} />
                        <div style={{ fontWeight: 700 }}>{newQuoteData.senderName || studioProfile.studioName || 'Studio'}</div>
                        {(newQuoteData.senderTagline || studioProfile.tagline) && (
                          <div style={{ fontSize: '13px' }}>{newQuoteData.senderTagline || studioProfile.tagline}</div>
                        )}
                      </div>

                      {/* Studio Subtle Bottom Watermark */}
                      <DocumentWatermark />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENT VIEW (INVOICE / QUOTATION) */}
        {currentView === 'doc' && docState && (
          <div>
            {(() => {
              const isInvoice = docState.t === 'inv';

              if (isInvoice) {
                const p = projects.find((x) => x.id === docState.a);
                const i = p?.plan.find((x) => x.id === docState.b);
                if (!p || !i || !i.inv) return null;
                const c = getClient(p.c);
                const paidToDate = getProjectPaidAmount(p);
                const remaining = Math.max(
                  0,
                  p.v - paidToDate - (i.paid ? 0 : i.a)
                );
                const relatedQuote = quotes.find(
                  (x) => x.pid === p.id || (x.cn && x.cn === c.name) || (x.title && x.title === p.name)
                );
                const brandName = relatedQuote?.senderName || studioProfile.studioName || 'Studio';
                const brandTagline = relatedQuote?.senderTagline || studioProfile.tagline || '';
                const brandEmail = relatedQuote?.senderEmail || studioProfile.email || '';
                const brandPhone = relatedQuote?.senderPhone || studioProfile.phone || '';

                return (
                  <>
                    <div className="top noprint">
                      <button
                        className="ib"
                        id="bk"
                        onClick={() => setCurrentView('invoices')}
                        aria-label="Back"
                      >
                        <Icon name="back" size={18} />
                      </button>
                      <h1>Invoice {formatInvoiceNo(i.inv.no, i.inv.date)}</h1>
                      <button
                        className="btn pri"
                        id="pt"
                        onClick={() => window.print()}
                      >
                        <Icon name="print" />
                        Print / PDF
                      </button>
                    </div>

                    <div className="docx-paper">
                      <div className="docx-body-content">
                        {/* Header (No outline borders) */}
                        <div className="docx-header-grid">
                          <div>
                            <div className="docx-h-title">Invoice</div>
                            <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                              No. Invoice {formatInvoiceNo(i.inv.no, i.inv.date)}
                            </div>
                            <div className="docx-h-sub">Invoice Date: {dt(i.inv.date)}</div>
                            <div className="docx-h-sub">Due Date: {dt(i.due)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="docx-h-title">{brandName}</div>
                            {brandTagline && <div className="docx-h-sub" style={{ marginTop: '4px' }}>{brandTagline}</div>}
                            {(brandEmail || brandPhone) && (
                              <div className="docx-h-sub">
                                {brandEmail}
                                {brandPhone ? (brandEmail ? ` · ${brandPhone}` : brandPhone) : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recipient & Sender Meta Box (No outline borders, bold labels) */}
                        <div className="docx-meta-grid">
                          <div>
                            <div style={{ marginBottom: '4px' }}>
                              <b>Kepada:</b> {c.name} {c.co ? `(${c.co})` : ''}
                            </div>
                            <div>
                              <b>Subject:</b> Invoice {p.name}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div>
                              <b>Dari:</b> {brandName}
                            </div>
                          </div>
                        </div>

                        {/* Section 1: Ruang Lingkup Pekerjaan (Scope of Work) */}
                        <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
                        <ol className="docx-list">
                          {(() => {
                            const rawLines = p.desc
                              ? p.desc
                                  .split('\n')
                                  .map((s) => s.trim().replace(/^[-*•\d.]+\s*/, ''))
                                  .filter(Boolean)
                              : [];
                            const scopeItems = rawLines.length > 0 ? rawLines : [p.name || 'Lingkup pekerjaan sesuai kesepakatan'];
                            return scopeItems.map((sc, idx) => (
                              <li key={idx}>{sc}</li>
                            ));
                          })()}
                        </ol>

                        {/* Section 2: Rincian Biaya */}
                        <div className="docx-sec-title bold">Rincian Biaya</div>
                        <table className="docx-cost-table">
                          <thead>
                            <tr>
                              <th style={{ width: '52%' }}>Item</th>
                              <th className="c" style={{ width: '24%' }}>Jenis Biaya</th>
                              <th className="c" style={{ width: '24%' }}>Biaya</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const activeItems = (p.items && p.items.length > 0)
                                ? p.items
                                : [{ d: p.name, type: p.billingType || 'One-time', p: p.v }];

                              return activeItems.map((it, idx) => (
                                <tr key={idx}>
                                  <td>{it.d || p.name || `Item Layanan ${idx + 1}`}</td>
                                  <td className="c">{it.type || 'One-time'}</td>
                                  <td className="c" style={{ fontWeight: 700 }}>
                                    Rp{(+it.p || 0).toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>

                        {/* Payment Method & Calculation Summary Box */}
                        <div className="docx-payment-summary-grid">
                          <div className="docx-payment-method-box">
                            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Payment Method</div>
                            <div><b>Bank:</b> {studioProfile.bankName || 'BCA / Mandiri Transfer'}</div>
                            <div><b>Account Number:</b> {studioProfile.accountNumber || '123-456-7890'}</div>
                            <div><b>Account Holder:</b> {studioProfile.accountHolder || studioProfile.ownerName || brandName || 'Faiz Dawami'}</div>
                          </div>
                          {(() => {
                            const itemIndex = p.plan.findIndex((x) => x.id === i.id);
                            const priorInstallments = p.plan.slice(0, itemIndex > 0 ? itemIndex : 0);
                            const priorAmount = priorInstallments.reduce((acc, curr) => acc + curr.a, 0);

                            return (
                              <div className="docx-calc-box">
                                <div className="docx-calc-row">
                                  <span>Sub-total</span>
                                  <span>Rp{p.v.toLocaleString('id-ID')}</span>
                                </div>
                                {itemIndex === 0 && i.pct < 100 && (
                                  <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                                    <span>{i.l || 'Down Payment'} ({i.pct}%)</span>
                                    <span>Rp{i.a.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {itemIndex > 0 && priorAmount > 0 && (
                                  <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                                    <span>Sudah Dibayar / DP</span>
                                    <span>-Rp{priorAmount.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                <div className="docx-calc-total">
                                  <span>Amount Due</span>
                                  <span>Rp{i.a.toLocaleString('id-ID')}</span>
                                </div>
                                {i.paid && (
                                  <div style={{ marginTop: '4px', textAlign: 'right', color: '#16a34a', fontWeight: 600, fontSize: '12px' }}>
                                    ✓ PAID (LUNAS) — {dt(i.pd)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Section: Catatan dan Ketentuan */}
                        <div className="docx-sec-title">Catatan dan Ketentuan</div>
                        <ol className="docx-list">
                          <li>
                            Pembayaran saat ini adalah <b>{i.l} ({i.pct}%)</b> sebesar <b>Rp{i.a.toLocaleString('id-ID')}</b> untuk layanan <b>{p.name}</b>.
                          </li>
                          <li>
                            Jatuh tempo pembayaran pada {dt(i.due)}.
                          </li>
                        </ol>
                      </div>

                      {/* Footer Wrap at bottom of page */}
                      <div className="docx-footer-wrap">
                        <div className="docx-footer">
                          <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
                          <div>Hormat Kami</div>
                          <div style={{ height: '36px' }} />
                          <div style={{ fontWeight: 700 }}>{brandName}</div>
                          {brandTagline && <div style={{ fontSize: '13px' }}>{brandTagline}</div>}
                        </div>

                        {/* Studio Subtle Bottom Watermark */}
                        <DocumentWatermark />
                      </div>
                    </div>
                  </>
                );
              }

              // Quotation View (Zyf.Space Template)
              const q = quotes.find((x) => x.id === docState.a);
              if (!q) return null;

              const totalAmount = q.items.reduce(
                (acc, l) => acc + (l.q || 1) * l.p,
                0
              );
              const qSenderName = q.senderName ? q.senderName.split('(')[0]?.trim() : (studioProfile.studioName || 'Studio');
              const qSenderTagline = q.senderTagline || studioProfile.tagline || '';
              const qSenderEmail = q.senderEmail || studioProfile.email || '';
              const qSenderPhone = q.senderPhone || studioProfile.phone || '';

              return (
                <>
                  <div className="top noprint">
                    <button
                      className="ib"
                      id="bk"
                      onClick={() => setCurrentView('quotations')}
                      aria-label="Back"
                    >
                      <Icon name="back" size={18} />
                    </button>
                    <h1>Quotation {formatQuoteNo(q.no, q.date, qSenderName)}</h1>

                    {q.s !== 'Accepted' && (
                      <button
                        className="btn"
                        id="cv"
                        onClick={() => handleConvertQuoteToProject(q)}
                      >
                        Convert to project
                      </button>
                    )}

                    {q.s === 'Draft' && (
                      <button
                        className="btn"
                        id="sn"
                        onClick={() => {
                          setQuotes((prev) =>
                            prev.map((item) =>
                              item.id === q.id ? { ...item, s: 'Sent' } : item
                            )
                          );
                        }}
                      >
                        Mark as sent
                      </button>
                    )}

                    <button
                      className="btn pri"
                      id="pt"
                      onClick={() => window.print()}
                    >
                      <Icon name="print" />
                      Print / PDF
                    </button>

                    <button
                      className="btn danger"
                      id="del-quote"
                      onClick={() => handleDeleteQuote(q.id)}
                      title="Delete quotation"
                    >
                      <Icon name="trash" />
                      Delete
                    </button>
                  </div>

                  <div className="docx-paper">
                    <div className="docx-body-content">
                      {/* Header (No outline borders) */}
                      <div className="docx-header-grid">
                        <div>
                          <div className="docx-h-title">Quotation</div>
                          <div className="docx-h-sub" style={{ marginTop: '4px' }}>No. Quotation {formatQuoteNo(q.no, q.date, qSenderName)}</div>
                          <div className="docx-h-sub">Valid until {dt(q.valid)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="docx-h-title">{qSenderName}</div>
                          {qSenderTagline && <div className="docx-h-sub" style={{ marginTop: '4px' }}>{qSenderTagline}</div>}
                          {(qSenderEmail || qSenderPhone) && (
                            <div className="docx-h-sub">
                              {qSenderEmail}
                              {qSenderPhone ? (qSenderEmail ? ` · ${qSenderPhone}` : qSenderPhone) : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recipient & Sender Meta Box (No outline borders, bold labels) */}
                      <div className="docx-meta-grid">
                        <div>
                          <div style={{ marginBottom: '4px' }}>
                            <b>Kepada:</b> {q.cn} {q.co ? `(${q.co})` : ''}
                          </div>
                          <div>
                            <b>Subject:</b> Quotation {q.title}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div>
                            <b>Dari:</b> {qSenderName}
                          </div>
                        </div>
                      </div>

                      {/* Section 1: Ruang Lingkup Pekerjaan (Scope of Work) */}
                      <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
                      <ol className="docx-list">
                        {(q.scope && q.scope.length > 0
                          ? q.scope
                          : q.items.map((i) => i.d)
                        ).map((sc, idx) => (
                          <li key={idx}>{sc}</li>
                        ))}
                      </ol>

                      {/* Section 2: Rincian Biaya */}
                      <div className="docx-sec-title bold">Rincian Biaya</div>
                      <table className="docx-cost-table">
                        <thead>
                          <tr>
                            <th style={{ width: '52%' }}>Item</th>
                            <th className="c" style={{ width: '24%' }}>Jenis Biaya</th>
                            <th className="c" style={{ width: '24%' }}>Biaya</th>
                          </tr>
                        </thead>
                        <tbody>
                          {q.items.map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.d}</td>
                              <td className="c">{it.type || 'One-time'}</td>
                              <td className="c" style={{ fontWeight: 700 }}>
                                Rp{it.p.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Section 3: Cakupan/Services */}
                      {q.services && q.services.length > 0 && (
                        <>
                          <div className="docx-sec-title">Cakupan/Services</div>
                          <ol className="docx-list">
                            {q.services.map((sv, idx) => (
                              <li key={idx}>{sv}</li>
                            ))}
                          </ol>
                        </>
                      )}

                      {/* Section 4: Syarat & Ketentuan */}
                      <div className="docx-sec-title">Syarat &amp; Ketentuan</div>
                      <ol className="docx-list">
                        {q.note && <li>{q.note}</li>}
                        {q.paymentTerms && (
                          <li>
                            <b>Syarat pembayaran: {q.paymentTerms}</b>
                          </li>
                        )}
                        <li>
                          Quotation ini berlaku {q.validDays || 7} hari dari tanggal dikirimkan.
                        </li>
                      </ol>
                    </div>

                    {/* Footer Wrap at bottom of page */}
                    <div className="docx-footer-wrap">
                      <div className="docx-footer">
                        <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
                        <div>Hormat Kami</div>
                        <div style={{ height: '36px' }} />
                        <div style={{ fontWeight: 700 }}>{qSenderName}</div>
                        {qSenderTagline && <div style={{ fontSize: '13px' }}>{qSenderTagline}</div>}
                      </div>

                      {/* Studio Subtle Bottom Watermark */}
                      <DocumentWatermark />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* OVERVIEW / PROJECTS / CLIENTS / PAYMENTS / INVOICES / QUOTATIONS VIEWS */}
        {currentView !== 'new' && currentView !== 'quote' && currentView !== 'doc' && (
          <div>
            <div className="top">
              <h1>
                {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h1>

              {currentView !== 'overview' && currentView !== 'settings' && (
                <label className="search">
                  <Icon name="search" />
                  <input
                    ref={searchInputRef}
                    id="q"
                    placeholder="Search…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  <kbd>/</kbd>
                </label>
              )}

              {currentView !== 'invoices' && currentView !== 'settings' && (
                <button
                  className="btn pri"
                  id="add"
                  onClick={
                    currentView === 'quotations'
                      ? handleStartNewQuote
                      : handleStartNewProject
                  }
                >
                  <Icon name="plus" />
                  {currentView === 'quotations' ? 'New quotation' : 'New project'}
                </button>
              )}
            </div>

            {/* OVERVIEW CONTENT */}
            {currentView === 'overview' && (
              <div>
                {/* Stats 4-cols */}
                <div className="stats">
                  <div className="stat">
                    <div className="stat-info">
                      <span>Total projects</span>
                      <b>{overviewMetrics.totalProjects}</b>
                    </div>
                    <div className="stat-icon">
                      <Icon name="briefcase" size={18} />
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-info">
                      <span>Total revenue</span>
                      <b>{sh(overviewMetrics.totalReceived)}</b>
                    </div>
                    <div className="stat-icon">
                      <Icon name="coins" size={18} />
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-info">
                      <span>Outstanding</span>
                      <b>{sh(overviewMetrics.totalOutstanding)}</b>
                    </div>
                    <div className="stat-icon">
                      <Icon name="clock" size={18} />
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-info">
                      <span>{chartMode === '6m' ? 'This month' : 'Transactions'}</span>
                      <b>
                        {chartMode === '6m'
                          ? sh(overviewMetrics.thisMonthVal)
                          : `${overviewMetrics.periodTxCount} paid`}
                      </b>
                    </div>
                    <div className="stat-icon">
                      <Icon name="cal" size={18} />
                    </div>
                  </div>
                </div>

                {/* Middle Cols */}
                <div className="cols">
                  {/* Income chart */}
                  <IncomeChart
                    paidPayments={paidPayments}
                    mode={chartMode}
                    onModeChange={setChartMode}
                    selectedMonth={chartSelectedMonth}
                    onSelectedMonthChange={setChartSelectedMonth}
                    customRange={chartCustomRange}
                    onCustomRangeChange={setChartCustomRange}
                    customRangePreset={chartCustomRangePreset}
                    onCustomRangePresetChange={setChartCustomRangePreset}
                  />

                  {/* Upcoming payments */}
                  <div className="panel">
                    <h3>Upcoming payments</h3>
                    {overviewMetrics.upcoming.length > 0 ? (
                      overviewMetrics.upcoming.map((x) => {
                        const c = getClient(x.p.c);
                        const overdue = isOverdue(x.i.due, x.i.paid);
                        return (
                          <div
                            key={x.i.id}
                            className="lr"
                            onClick={() => setActiveProjectDrawerId(x.p.id)}
                          >
                            <div>
                              <div>{x.p.name}</div>
                              <div className={overdue ? 'od' : 'mut'}>
                                {c.name} ·{' '}
                                {overdue ? 'overdue ' : 'due '}
                                {dt(x.i.due)}
                              </div>
                            </div>
                            <b>{sh(x.i.a)}</b>
                          </div>
                        );
                      })
                    ) : (
                      <div className="mut">All settled.</div>
                    )}
                  </div>
                </div>

                {/* Bottom Cols */}
                <div className="cols">
                  {/* Active projects */}
                  <div className="panel">
                    <h3>Active projects</h3>
                    {overviewMetrics.activeProjs.length > 0 ? (
                      overviewMetrics.activeProjs.map((x) => {
                        const { p, n } = x;
                        const c = getClient(p.c);
                        const progress = getProjectPct(p);
                        const overdue = n ? isOverdue(n.due, n.paid) : false;
                        return (
                          <div
                            key={p.id}
                            className="lr"
                            onClick={() => setActiveProjectDrawerId(p.id)}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 500 }}>{p.name}</span>
                                {c.name && <span className="mut" style={{ fontSize: '13px' }}>· {c.name}</span>}
                              </div>
                              <div className="pg" style={{ marginTop: '7px' }}>
                                <div className="prog">
                                  <i style={{ width: `${progress}%` }} />
                                </div>
                                <span className="mut">{progress}%</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <b>{sh(p.v)}</b>
                              {n && (
                                <div className={overdue ? 'od' : 'mut'}>
                                  {n.l} ·{' '}
                                  {overdue ? 'overdue ' : 'due '}
                                  {dt(n.due).replace(/ \d{4}$/, '')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="mut">No active projects.</div>
                    )}
                  </div>

                  {/* Open quotations */}
                  <div className="panel">
                    <h3>Open quotations</h3>
                    {overviewMetrics.openQuotes.length > 0 ? (
                      overviewMetrics.openQuotes.map((x) => {
                        const expired = x.valid && x.valid < today();
                        const quoteTotal = x.items.reduce(
                          (acc, curr) => acc + curr.q * curr.p,
                          0
                        );
                        return (
                          <div
                            key={x.id}
                            className="lr"
                            onClick={() => openDoc('quo', x.id)}
                          >
                            <div>
                              {x.title}
                              <div className="mut">
                                {x.cn} · {x.s}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <b>{sh(quoteTotal)}</b>
                              <div className={expired ? 'od' : 'mut'}>
                                {expired ? 'expired ' : 'until '}
                                {dt(x.valid).replace(/ \d{4}$/, '')}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="mut">No open quotations.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PROJECTS CONTENT */}
            {currentView === 'projects' && (
              <div>
                {/* Filter chips */}
                <div style={{ margin: '0 0 14px' }}>
                  <div className="chips" style={{ marginTop: 0 }}>
                    {(['All', 'Pending', 'Progress', 'Finished'] as const).map(
                      (s) => {
                        const count =
                          s === 'All'
                            ? projects.length
                            : projects.filter(
                                (p) => getProjectStatus(p) === s
                              ).length;
                        const label =
                          s === 'Progress'
                            ? 'In progress'
                            : s;
                        return (
                          <button
                            key={s}
                            className={`chip ${filterStatus === s ? 'on' : ''}`}
                            onClick={() => setFilterStatus(s)}
                          >
                            {label} · {count}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Table */}
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = projects.filter((p) => {
                    const c = getClient(p.c);
                    const status = getProjectStatus(p);
                    const matchesFilter =
                      filterStatus === 'All' || status === filterStatus;
                    const matchesSearch =
                      (p.name + c.name + c.co).toLowerCase().indexOf(q) > -1;
                    return matchesFilter && matchesSearch;
                  });

                  filtered.sort((a, b) => {
                    const f =
                      sortKey === 'v'
                        ? (p: Project) => p.v
                        : sortKey === 'name'
                        ? (p: Project) => p.name
                        : sortKey === 'pg'
                        ? getProjectPct
                        : (p: Project) => p.due || '9';
                    const x = f(a);
                    const y = f(b);
                    return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
                  });

                  const toggleSort = (k: 'name' | 'due' | 'pg' | 'v') => {
                    if (sortKey === k) {
                      setSortDir((d) => -d);
                    } else {
                      setSortKey(k);
                      setSortDir(1);
                    }
                  };

                  if (!filtered.length) {
                    return <div className="empty">No projects found</div>;
                  }

                  return (
                    <div className="tw">
                      <table>
                        <thead>
                          <tr>
                            <th className="s" onClick={() => toggleSort('name')}>
                              Project {sortKey === 'name' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th>Client</th>
                            <th>Status</th>
                            <th className="s" onClick={() => toggleSort('due')}>
                              Due {sortKey === 'due' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th className="s" onClick={() => toggleSort('pg')}>
                              Received {sortKey === 'pg' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th className="s r" onClick={() => toggleSort('v')}>
                              Value {sortKey === 'v' ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((p) => {
                            const c = getClient(p.c);
                            const st = getProjectStatus(p);
                            const pctVal = getProjectPct(p);
                            return (
                              <tr
                                key={p.id}
                                onClick={() => setActiveProjectDrawerId(p.id)}
                              >
                                <td>{p.name}</td>
                                <td>
                                  <span>{c.name}</span>
                                  {c.co && <span className="mut"> · {c.co}</span>}
                                </td>
                                <td>
                                  <span className={`st ${st}`}>
                                    {STATUS_LABELS[st]}
                                  </span>
                                </td>
                                <td className="mut">{dt(p.due)}</td>
                                <td>
                                  <div className="pg">
                                    <div className="prog">
                                      <i style={{ width: `${pctVal}%` }} />
                                    </div>
                                    <span className="mut">{pctVal}%</span>
                                  </div>
                                </td>
                                <td className="r">{rp(p.v)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* CLIENTS CONTENT */}
            {currentView === 'clients' && (
              <div>
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = clients.filter(
                    (c) =>
                      (c.name + c.co + c.mail).toLowerCase().indexOf(q) > -1
                  );

                  if (!filtered.length) {
                    return <div className="empty">No clients found</div>;
                  }

                  return (
                    <div className="grid">
                      {filtered.map((c) => {
                        const ps = projects.filter((p) => p.c === c.id);
                        const v = ps.reduce((acc, p) => acc + p.v, 0);
                        const g = ps.reduce(
                          (acc, p) => acc + getProjectPaidAmount(p),
                          0
                        );
                        const progress = v ? Math.round((g / v) * 100) : 0;
                        return (
                          <div
                            key={c.id}
                            className="card"
                            onClick={() => setActiveClientDrawerId(c.id)}
                          >
                            <div style={{ minWidth: 0 }}>
                              <b style={{ fontSize: '15px', fontWeight: 600, display: 'block' }}>{c.name}</b>
                              {c.co && (
                                <div className="mut" style={{ fontSize: '13px', marginTop: '3px' }}>
                                  {c.co}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {c.mail && (
                                <div className="mut kv" style={{ padding: 0, fontSize: '13px' }}>
                                  <Icon name="mail" />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.mail}
                                  </span>
                                </div>
                              )}
                              {c.tel && (
                                <div className="mut kv" style={{ padding: 0, fontSize: '13px' }}>
                                  <Icon name="phone" />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.tel}
                                  </span>
                                </div>
                              )}
                              {!c.mail && !c.tel && (
                                <div className="mut" style={{ fontSize: '13px' }}>—</div>
                              )}
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div className="pg" style={{ gap: '8px' }}>
                                <div className="prog" style={{ flex: 1, margin: 0 }}>
                                  <i style={{ width: `${progress}%` }} />
                                </div>
                                <span className="mut" style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                  {progress}%
                                </span>
                              </div>

                              <div className="row" style={{ alignItems: 'baseline', whiteSpace: 'nowrap', gap: '12px' }}>
                                <span className="mut" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                                  {ps.length} {ps.length === 1 ? 'project' : 'projects'} · <span style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{sh(g)}</span> paid
                                </span>
                                <b style={{ fontSize: '14px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                  {sh(v)}
                                </b>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* PAYMENTS CONTENT */}
            {currentView === 'payments' && (
              <div>
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = paidPayments
                    .filter((x) => {
                      const c = getClient(x.p.c);
                      return (
                        (x.p.name + c.name + x.i.l)
                          .toLowerCase()
                          .indexOf(q) > -1
                      );
                    })
                    .sort((a, b) => (a.i.pd < b.i.pd ? 1 : -1));

                  if (!filtered.length) {
                    return (
                      <div className="empty">No payments recorded yet</div>
                    );
                  }

                  const totalPaymentsAmount = filtered.reduce(
                    (acc, x) => acc + x.i.a,
                    0
                  );

                  return (
                    <div className="tw">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Client</th>
                            <th>Type</th>
                            <th>Proof</th>
                            <th className="r">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((x) => {
                            const c = getClient(x.p.c);
                            return (
                              <tr
                                key={x.i.id}
                                onClick={() => setActiveProjectDrawerId(x.p.id)}
                              >
                                <td className="mut">{dt(x.i.pd)}</td>
                                <td>{x.p.name}</td>
                                <td>{c.name}</td>
                                <td>
                                  {x.i.l}{' '}
                                  <span className="mut">{x.i.pct}%</span>
                                </td>
                                <td className="mut">
                                  {x.i.proof && x.i.proof.n
                                    ? x.i.proof.n
                                    : '—'}
                                </td>
                                <td className="r">{rp(x.i.a)}</td>
                              </tr>
                            );
                          })}
                          <tr>
                            <td colSpan={5} className="mut">
                              Total · {filtered.length} payments
                            </td>
                            <td className="r">
                              <b>{rp(totalPaymentsAmount)}</b>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* INVOICES CONTENT */}
            {currentView === 'invoices' && (
              <div>
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const invoicesList = allPayments
                    .filter((x) => {
                      if (!x.i.inv) return false;
                      const c = getClient(x.p.c);
                      const invFormattedNo = formatInvoiceNo(x.i.inv.no, x.i.inv.date);
                      return (
                        (invFormattedNo + x.p.name + c.name + (c.co || ''))
                          .toLowerCase()
                          .indexOf(q) > -1
                      );
                    })
                    .sort((a, b) =>
                      a.i.inv!.date < b.i.inv!.date ? 1 : -1
                    );

                  if (!invoicesList.length) {
                    return (
                      <div className="empty">
                        No invoices found.
                      </div>
                    );
                  }

                  // Group by Company / Business Name
                  const grouped: { company: string; items: typeof invoicesList }[] = [];
                  const companyMap = new Map<string, typeof invoicesList>();

                  invoicesList.forEach((item) => {
                    const c = getClient(item.p.c);
                    const comp = (c.co && c.co.trim()) ? c.co.trim() : (c.name && c.name.trim() ? `${c.name} (Individual)` : 'General / Unassigned');
                    if (!companyMap.has(comp)) {
                      companyMap.set(comp, []);
                    }
                    companyMap.get(comp)!.push(item);
                  });

                  companyMap.forEach((items, company) => {
                    grouped.push({ company, items });
                  });

                  return (
                    <div>
                      {grouped.map(({ company, items }) => {
                        const isCollapsed = !!collapsedInvoiceGroups[company];
                        const totalGroupAmount = items.reduce((acc, curr) => acc + curr.i.a, 0);

                        return (
                          <div key={company} className="accordion-group">
                            <div
                              className="accordion-header"
                              onClick={() =>
                                setCollapsedInvoiceGroups((prev) => ({
                                  ...prev,
                                  [company]: !prev[company],
                                }))
                              }
                            >
                              <div className="accordion-title-box">
                                <div className="accordion-company-icon">
                                  <Icon name="bld" size={15} />
                                </div>
                                <span className="accordion-company-name">{company}</span>
                                <span className="accordion-count-badge">
                                  {items.length} {items.length === 1 ? 'invoice' : 'invoices'}
                                </span>
                              </div>
                              <div className="accordion-meta-box">
                                <span className="accordion-total-amount">
                                  {rp(totalGroupAmount)}
                                </span>
                                <span className={`accordion-chevron ${isCollapsed ? '' : 'expanded'}`}>
                                  <Icon name="chevron" size={15} />
                                </span>
                              </div>
                            </div>

                            {!isCollapsed && (
                              <div className="accordion-body">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>No.</th>
                                      <th>Date</th>
                                      <th>Project</th>
                                      <th>Client</th>
                                      <th>Status</th>
                                      <th className="r">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((x) => {
                                      const c = getClient(x.p.c);
                                      const overdue = isOverdue(x.i.due, x.i.paid);
                                      return (
                                        <tr
                                          key={x.i.id}
                                          onClick={() =>
                                            openDoc('inv', x.p.id, x.i.id)
                                          }
                                        >
                                          <td>{formatInvoiceNo(x.i.inv!.no, x.i.inv!.date)}</td>
                                          <td className="mut">{dt(x.i.inv!.date)}</td>
                                          <td>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                              <span>{x.p.name}</span>
                                              {x.i.l && (
                                                <>
                                                  <span className="mut" style={{ opacity: 0.45, userSelect: 'none' }}>·</span>
                                                  <span className="mut" style={{ fontSize: '13px' }}>{x.i.l}</span>
                                                </>
                                              )}
                                            </div>
                                          </td>
                                          <td>{c.name}</td>
                                          <td>
                                            {x.i.paid ? (
                                              <span
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  color: '#10b981',
                                                  fontSize: '13px',
                                                  fontWeight: 500,
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    width: '15px',
                                                    height: '15px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(16, 185, 129, 0.15)',
                                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  <svg
                                                    width="9"
                                                    height="9"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  >
                                                    <polyline points="20 6 9 17 4 12" />
                                                  </svg>
                                                </span>
                                                Paid
                                              </span>
                                            ) : overdue ? (
                                              <span
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  color: '#ef4444',
                                                  fontSize: '13px',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    width: '7px',
                                                    height: '7px',
                                                    borderRadius: '50%',
                                                    background: '#ef4444',
                                                    display: 'inline-block',
                                                    flexShrink: 0,
                                                  }}
                                                />
                                                Overdue
                                              </span>
                                            ) : (
                                              <span
                                                style={{
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  color: 'var(--mut)',
                                                  fontSize: '13px',
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    width: '7px',
                                                    height: '7px',
                                                    borderRadius: '50%',
                                                    border: '1.5px solid var(--mut)',
                                                    background: 'transparent',
                                                    display: 'inline-block',
                                                    flexShrink: 0,
                                                  }}
                                                />
                                                Unpaid
                                              </span>
                                            )}
                                          </td>
                                          <td className="r">{rp(x.i.a)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* QUOTATIONS CONTENT */}
            {currentView === 'quotations' && (
              <div>
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const filtered = quotes
                    .filter((x) => {
                      const qFormattedNo = formatQuoteNo(x.no, x.date, x.senderName);
                      return (
                        (qFormattedNo + x.title + x.cn + (x.co || '')).toLowerCase().indexOf(q) > -1
                      );
                    })
                    .sort((a, b) => (a.date < b.date ? 1 : -1));

                  if (!filtered.length) {
                    return <div className="empty">No quotations yet</div>;
                  }

                  const QS: Record<string, string> = {
                    Draft: 'Pending',
                    Sent: 'Progress',
                    Accepted: 'Finished',
                  };

                  // Group by Company / Business Name
                  const grouped: { company: string; items: typeof filtered }[] = [];
                  const companyMap = new Map<string, typeof filtered>();

                  filtered.forEach((item) => {
                    const comp = (item.co && item.co.trim()) ? item.co.trim() : (item.cn && item.cn.trim() ? `${item.cn} (Individual)` : 'General / Unassigned');
                    if (!companyMap.has(comp)) {
                      companyMap.set(comp, []);
                    }
                    companyMap.get(comp)!.push(item);
                  });

                  companyMap.forEach((items, company) => {
                    grouped.push({ company, items });
                  });

                  return (
                    <div>
                      {grouped.map(({ company, items }) => {
                        const isCollapsed = !!collapsedQuoteGroups[company];
                        const totalGroupAmount = items.reduce((acc, curr) => {
                          const val = curr.items.reduce((a, it) => a + (it.q * it.p), 0);
                          return acc + val;
                        }, 0);

                        return (
                          <div key={company} className="accordion-group">
                            <div
                              className="accordion-header"
                              onClick={() =>
                                setCollapsedQuoteGroups((prev) => ({
                                  ...prev,
                                  [company]: !prev[company],
                                }))
                              }
                            >
                              <div className="accordion-title-box">
                                <div className="accordion-company-icon">
                                  <Icon name="bld" size={15} />
                                </div>
                                <span className="accordion-company-name">{company}</span>
                                <span className="accordion-count-badge">
                                  {items.length} {items.length === 1 ? 'quotation' : 'quotations'}
                                </span>
                              </div>
                              <div className="accordion-meta-box">
                                <span className="accordion-total-amount">
                                  {rp(totalGroupAmount)}
                                </span>
                                <span className={`accordion-chevron ${isCollapsed ? '' : 'expanded'}`}>
                                  <Icon name="chevron" size={15} />
                                </span>
                              </div>
                            </div>

                            {!isCollapsed && (
                              <div className="accordion-body">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>No.</th>
                                      <th>Date</th>
                                      <th>Client</th>
                                      <th>Title</th>
                                      <th>Valid until</th>
                                      <th>Status</th>
                                      <th className="r">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((x) => {
                                      const totalVal = x.items.reduce(
                                        (acc, curr) => acc + curr.q * curr.p,
                                        0
                                      );
                                      return (
                                        <tr
                                          key={x.id}
                                          onClick={() => openDoc('quo', x.id)}
                                        >
                                          <td>{formatQuoteNo(x.no, x.date, x.senderName)}</td>
                                          <td className="mut">{dt(x.date)}</td>
                                          <td>{x.cn}</td>
                                          <td>{x.title}</td>
                                          <td className="mut">{dt(x.valid)}</td>
                                          <td>
                                            <span className={`st ${QS[x.s]}`}>
                                              {x.s}
                                            </span>
                                          </td>
                                          <td className="r">{rp(totalVal)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SETTINGS CONTENT */}
            {currentView === 'settings' && (
              <div style={{ maxWidth: '780px', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Security Lock Banner */}
                  {!isSettingsUnlocked ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--soft)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'var(--bg)',
                            border: '1px solid var(--line)',
                            display: 'grid',
                            placeItems: 'center',
                            color: 'var(--mut)',
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="lock" size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                            Pengaturan Terkunci
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--mut)' }}>
                            Data rekening dan branding dilindungi PIN untuk mencegah perubahan tidak disengaja.
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn pri"
                        onClick={handleStartEditSettings}
                        style={{ height: '32px', fontSize: '13px', padding: '0 14px', flexShrink: 0 }}
                      >
                        <Icon name="lock-open" size={13} style={{ marginRight: '6px' }} />
                        Edit settings
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(22, 163, 74, 0.08)',
                        border: '1px solid rgba(22, 163, 74, 0.25)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'var(--bg)',
                            border: '1px solid rgba(22, 163, 74, 0.3)',
                            display: 'grid',
                            placeItems: 'center',
                            color: '#16a34a',
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="lock-open" size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                            Mode Edit Aktif
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--mut)' }}>
                            Silakan ubah informasi branding atau rekening, lalu klik Simpan.
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn out"
                        onClick={() => {
                          setPinError('');
                          setPinInput('');
                          setNewPinInput('');
                          setConfirmPinInput('');
                          setPinModalMode('change');
                        }}
                        style={{ height: '32px', fontSize: '12.5px', padding: '0 12px', flexShrink: 0 }}
                      >
                        <Icon name="key" size={13} style={{ marginRight: '6px' }} />
                        Ganti PIN
                      </button>
                    </div>
                  )}

                  {/* Studio / Agency Branding */}
                  <div className="panel">
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>
                      Studio / Agency Branding
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                      Identitas brand atau agency yang ditampilkan pada kop dokumen invoice, quotation, dan tanda tangan dokumen.
                    </p>

                    <div className="two">
                      <div className="f">
                        <label htmlFor="st-name">Nama Brand / Agency</label>
                        <input
                          id="st-name"
                          type="text"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. Zyf.Space"
                          value={profileDraft.studioName}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, studioName: e.target.value }))
                          }
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="st-tagline">Tagline / Slogan</label>
                        <input
                          id="st-tagline"
                          type="text"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. Your digital partner solution."
                          value={profileDraft.tagline}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, tagline: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="two">
                      <div className="f">
                        <label htmlFor="st-mail">Email Kontak Brand</label>
                        <input
                          id="st-mail"
                          type="email"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. zyfxspace@gmail.com"
                          value={profileDraft.email}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="st-phone">Nomor Telepon / WhatsApp</label>
                        <input
                          id="st-phone"
                          type="tel"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. 0851-5637-9510"
                          value={profileDraft.phone}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rekening & Detail Pembayaran Freelancer */}
                  <div className="panel">
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>
                      Rekening &amp; Detail Pembayaran Freelancer
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                      Data penerima transfer untuk pembayaran invoice. Nama pemilik rekening menggunakan nama asli pribadi (personal), terpisah dari nama branding agency di atas.
                    </p>

                    <div className="two">
                      <div className="f">
                        <label htmlFor="st-holder">Nama Pemilik Rekening (Nama Asli)</label>
                        <input
                          id="st-holder"
                          type="text"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. Faiz Dawami"
                          value={profileDraft.accountHolder}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, accountHolder: e.target.value }))
                          }
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="st-bank">Nama Bank / Metode Pembayaran</label>
                        <input
                          id="st-bank"
                          type="text"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. BCA / Mandiri Transfer"
                          value={profileDraft.bankName}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, bankName: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="two">
                      <div className="f">
                        <label htmlFor="st-num">Nomor Rekening</label>
                        <input
                          id="st-num"
                          type="text"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. 123-456-7890"
                          value={profileDraft.accountNumber}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, accountNumber: e.target.value }))
                          }
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="st-owner">Nama Lengkap Pemilik (Opsional)</label>
                        <input
                          id="st-owner"
                          type="text"
                          disabled={!isSettingsUnlocked}
                          className="settings-input"
                          placeholder="e.g. Faiz Dawami"
                          value={profileDraft.ownerName}
                          onChange={(e) =>
                            setProfileDraft((prev) => ({ ...prev, ownerName: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="f">
                      <label htmlFor="st-terms">Default Syarat Pembayaran (Quotation/Invoice)</label>
                      <AutoTextarea
                        id="st-terms"
                        disabled={!isSettingsUnlocked}
                        className="settings-input"
                        placeholder="e.g. 50% di awal sebelum pengerjaan, pelunasan saat selesai"
                        value={profileDraft.defaultPaymentTerms}
                        onChange={(e) =>
                          setProfileDraft((prev) => ({ ...prev, defaultPaymentTerms: e.target.value }))
                        }
                      />
                    </div>

                    <div className="f" style={{ margin: 0 }}>
                      <label htmlFor="st-notes">Default Catatan / Ketentuan</label>
                      <AutoTextarea
                        id="st-notes"
                        disabled={!isSettingsUnlocked}
                        className="settings-input"
                        placeholder="e.g. Quotation berlaku sesuai tanggal yang tertera."
                        value={profileDraft.defaultNotes}
                        onChange={(e) =>
                          setProfileDraft((prev) => ({ ...prev, defaultNotes: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Action Buttons & Feedback */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    {isSettingsUnlocked ? (
                      <>
                        <button
                          className="btn pri"
                          onClick={handleSaveUnlockedSettings}
                        >
                          Save settings
                        </button>
                        <button
                          className="btn out"
                          onClick={handleCancelEditSettings}
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn pri"
                        onClick={handleStartEditSettings}
                      >
                        <Icon name="edit" size={14} style={{ marginRight: '6px' }} />
                        Edit settings
                      </button>
                    )}
                    {profileSavedFeedback && (
                      <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="check" size={14} /> Settings tersimpan &amp; terkunci kembali
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Overlay for Drawers */}
      <div
        className={`ov ${activeProjectDrawerId || activeClientDrawerId ? 'on' : ''}`}
        id="ov"
        onClick={closeDrawer}
      />

      {/* Project Drawer */}
      <div className={`dr ${activeProjectDrawerId ? 'on' : ''}`} id="dr">
        {activeProject && (
          <div>
            {(() => {
              const c = getClient(activeProject.c);
              const g = getProjectPaidAmount(activeProject);
              const b = activeProject.v - g;
              const k = getProjectStatus(activeProject);
              const progress = getProjectPct(activeProject);

              return (
                <>
                  <div className="dh">
                    <div>
                      <h2>{activeProject.name}</h2>
                      <div className="mut">
                        {c.name}
                        {c.co ? ` · ${c.co}` : ''}
                      </div>
                    </div>
                    <button
                      className="ib"
                      id="x"
                      onClick={closeDrawer}
                      aria-label="Close drawer"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <span className={`st ${k}`}>{STATUS_LABELS[k]}</span>

                  <div className="big" style={{ marginTop: '14px' }}>
                    {rp(g)}{' '}
                    <span className="mut" style={{ fontSize: '14px' }}>
                      of {rp(activeProject.v)}
                    </span>
                  </div>

                  <div
                    className="prog"
                    style={{ margin: '12px 0 8px', height: '6px' }}
                  >
                    <i style={{ width: `${progress}%` }} />
                  </div>

                  <div className="mut">
                    {b > 0 ? `Remaining ${rp(b)}` : 'All payments received'}
                  </div>

                  {/* Payment schedule */}
                  {/* Payment schedule */}
                  <div className="sec" style={{ marginTop: '18px' }}>
                    <small>Payment schedule</small>
                    {activeProject.plan.map((item) => {
                      const overdue = isOverdue(item.due, item.paid);
                      return (
                        <div key={item.id} className="ins">
                          <div className="ih">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="ins-title">
                                {item.l}{' '}
                                <span className="mut" style={{ fontWeight: 400, fontSize: '12.5px' }}>
                                  ({item.pct}%)
                                </span>
                              </div>
                              <div className="ins-date-pill">
                                <span className={overdue ? 'od' : 'mut'} style={{ fontSize: '12px' }}>
                                  {item.paid ? 'Paid date:' : overdue ? 'Overdue:' : 'Due date:'}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 500, color: overdue ? 'var(--red, #ef4444)' : 'inherit' }}>
                                  {item.paid ? (item.pd ? dt(item.pd) : '—') : (item.due ? dt(item.due) : '—')}
                                </span>
                              </div>
                            </div>
                            <span className={`ins-amount ${item.paid ? 'mut' : ''}`}>
                              {rp(item.a)}
                            </span>
                          </div>

                          <div className="ia">
                            {item.paid ? (
                              <>
                                {item.proof && item.proof.n ? (
                                  item.proof.d ? (
                                    <a
                                      className="btn sm"
                                      href={item.proof.d}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={item.proof.n}
                                    >
                                      <Icon name="file" size={14} />
                                      Proof
                                    </a>
                                  ) : (
                                    <span className="mut" style={{ fontSize: '12px' }}>{item.proof.n}</span>
                                  )
                                ) : (
                                  <span className="mut" style={{ fontSize: '12px' }}>No proof</span>
                                )}
                              </>
                            ) : (
                              <label
                                className="btn sm pri"
                                style={{
                                  cursor: uploadingItemId === item.id ? 'wait' : 'pointer',
                                  opacity: uploadingItemId === item.id ? 0.7 : 1,
                                }}
                              >
                                <Icon name="upload" size={14} />
                                {uploadingItemId === item.id ? 'Uploading…' : 'Add Payment Proof'}
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  disabled={uploadingItemId === item.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) {
                                      handleProofUpload(activeProject.id, item.id, f);
                                    }
                                  }}
                                />
                              </label>
                            )}

                            <button
                              className="btn sm"
                              onClick={() =>
                                handleCreateOrViewInvoice(
                                  activeProject.id,
                                  item.id
                                )
                              }
                            >
                              <Icon name="file" size={14} />
                              {item.inv ? 'View invoice' : 'Create invoice'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Project Details (Read-only) */}
                  <div className="sec">
                    <small>Details</small>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                      <div>
                        <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Project name</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
                          {activeProject.name}
                        </div>
                      </div>

                      <div className="two" style={{ gap: '12px' }}>
                        <div>
                          <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Value (Rp)</div>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
                            {rp(activeProject.v)}
                          </div>
                        </div>
                        <div>
                          <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Jenis Biaya</div>
                          <div style={{ fontSize: '13.5px', color: 'var(--fg)' }}>
                            {activeProject.billingType || 'One-time'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mut" style={{ fontSize: '11.5px', marginBottom: '2px' }}>Deadline</div>
                        <div style={{ fontSize: '13px', color: 'var(--fg)' }}>
                          {activeProject.due ? dt(activeProject.due) : '—'}
                        </div>
                      </div>

                      {activeProject.desc && (
                        <div>
                          <div className="mut" style={{ fontSize: '11.5px', marginBottom: '4px' }}>Scope</div>
                          <div
                            style={{
                              fontSize: '12.5px',
                              lineHeight: '1.55',
                              color: 'var(--fg)',
                              whiteSpace: 'pre-wrap',
                              background: 'var(--panel)',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: '1px solid var(--line)',
                            }}
                          >
                            {activeProject.desc}
                          </div>
                        </div>
                      )}

                      {activeProject.items && activeProject.items.length > 0 && (
                        <div>
                          <div className="mut" style={{ fontSize: '11.5px', marginBottom: '6px' }}>Rincian Biaya (Items)</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {activeProject.items.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '12.5px',
                                  padding: '8px 10px',
                                  background: 'var(--panel)',
                                  borderRadius: '6px',
                                  border: '1px solid var(--line)',
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1, paddingRight: '10px' }}>
                                  <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{it.d || activeProject.name}</span>
                                  {it.type && <span className="mut" style={{ fontSize: '11px' }}>{it.type}</span>}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap' }}>
                                  {rp(+it.p || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client info in drawer */}
                  <div className="sec">
                    <small>Client</small>
                    <div className="drawer-client-box">
                      <div className="kv">
                        <Icon name="users" />
                        <b>{c.name}</b>
                      </div>
                      {c.co && (
                        <div className="kv">
                          <Icon name="bld" />
                          <span>{c.co}</span>
                        </div>
                      )}
                      {c.mail && (
                        <div className="kv">
                          <Icon name="mail" />
                          <span>{c.mail}</span>
                        </div>
                      )}
                      {c.tel && (
                        <div className="kv">
                          <Icon name="phone" />
                          <span>{c.tel}</span>
                        </div>
                      )}
                      <button
                        className="btn sm"
                        id="vc"
                        style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        onClick={() => {
                          setActiveClientDrawerId(activeProject.c);
                          setActiveProjectDrawerId(null);
                        }}
                      >
                        View client profile
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="sec">
                    <small>Notes</small>
                    <div className="f" style={{ margin: 0 }}>
                      <AutoTextarea
                        id="nt"
                        placeholder="Reminders, links…"
                        value={activeProject.n}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProjects((prev) =>
                            prev.map((p) =>
                              p.id === activeProject.id
                                ? { ...p, n: val }
                                : p
                            )
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    className={`btn danger ${deleteArmed ? 'arm' : ''}`}
                    id="del"
                    onClick={() => handleDeleteProject(activeProject.id)}
                  >
                    <Icon name="trash" />
                    {deleteArmed ? 'Click again to confirm' : 'Delete project'}
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Client Drawer */}
      <div className={`dr ${activeClientDrawerId ? 'on' : ''}`}>
        {activeClient && (
          <div>
            {(() => {
              const clientProjs = projects.filter(
                (p) => p.c === activeClient.id
              );
              const totalVal = clientProjs.reduce(
                (acc, p) => acc + p.v,
                0
              );
              const totalPaid = clientProjs.reduce(
                (acc, p) => acc + getProjectPaidAmount(p),
                0
              );
              const balance = totalVal - totalPaid;

              return (
                <>
                  <div className="dh">
                    <div>
                      <h2>{activeClient.name}</h2>
                      {activeClient.co && <div className="mut">{activeClient.co}</div>}
                    </div>
                    <button
                      className="ib"
                      id="x"
                      onClick={closeDrawer}
                      aria-label="Close drawer"
                    >
                      <Icon name="x" size={18} />
                    </button>
                  </div>

                  <div className="drawer-stats">
                    <div className="drawer-stat">
                      <span>Total Value</span>
                      <b>{sh(totalVal)}</b>
                    </div>
                    <div className="drawer-stat">
                      <span>Paid</span>
                      <b>{sh(totalPaid)}</b>
                    </div>
                    <div className="drawer-stat">
                      <span>Balance</span>
                      <b>{sh(balance)}</b>
                    </div>
                  </div>

                  {/* Contact Editor */}
                  <div className="sec">
                    <small>Contact Details</small>
                    <div className="f">
                      <label htmlFor="cn">Name</label>
                      <input
                        id="cn"
                        type="text"
                        value={activeClient.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClients((prev) =>
                            prev.map((c) =>
                              c.id === activeClient.id
                                ? { ...c, name: val }
                                : c
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="f">
                      <label htmlFor="cc">Company</label>
                      <input
                        id="cc"
                        type="text"
                        value={activeClient.co}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClients((prev) =>
                            prev.map((c) =>
                              c.id === activeClient.id
                                ? { ...c, co: val }
                                : c
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="two">
                      <div className="f">
                        <label htmlFor="cm">Email</label>
                        <input
                          id="cm"
                          type="email"
                          value={activeClient.mail}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClients((prev) =>
                              prev.map((c) =>
                                c.id === activeClient.id
                                  ? { ...c, mail: val }
                                  : c
                              )
                            );
                          }}
                        />
                      </div>
                      <div className="f">
                        <label htmlFor="ct">Phone</label>
                        <input
                          id="ct"
                          type="tel"
                          value={activeClient.tel}
                          onChange={(e) => {
                            const val = e.target.value;
                            setClients((prev) =>
                              prev.map((c) =>
                                c.id === activeClient.id
                                  ? { ...c, tel: val }
                                  : c
                              )
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="f" style={{ margin: 0 }}>
                      <label htmlFor="cx">Notes</label>
                      <AutoTextarea
                        id="cx"
                        placeholder="Preferences, billing info…"
                        value={activeClient.n}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClients((prev) =>
                            prev.map((c) =>
                              c.id === activeClient.id
                                ? { ...c, n: val }
                                : c
                            )
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Projects List */}
                  <div className="sec">
                    <small>Projects ({clientProjs.length})</small>
                    {clientProjs.length > 0 ? (
                      clientProjs.map((p) => {
                        const st = getProjectStatus(p);
                        const progress = getProjectPct(p);
                        return (
                          <div
                            key={p.id}
                            className="client-project-item"
                            onClick={() => {
                              setActiveProjectDrawerId(p.id);
                              setActiveClientDrawerId(null);
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{p.name}</div>
                              <div className="mut" style={{ fontSize: '12px', marginTop: '2px' }}>
                                {STATUS_LABELS[st]} · {progress}% paid
                              </div>
                            </div>
                            <b>{sh(p.v)}</b>
                          </div>
                        );
                      })
                    ) : (
                      <div className="mut" style={{ fontSize: '13px' }}>No projects yet.</div>
                    )}
                  </div>

                  {/* Delete client button */}
                  <button
                    className={`btn danger ${deleteArmed ? 'arm' : ''}`}
                    id="del-client"
                    style={{ marginTop: '18px' }}
                    onClick={() => handleDeleteClient(activeClient.id)}
                  >
                    <Icon name="trash" />
                    {deleteArmed ? 'Click again to confirm' : 'Delete client'}
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* PIN Security Modal */}
      {pinModalMode !== 'none' && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPinModalMode('none');
              setPinError('');
            }
          }}
        >
          <div className="pin-modal-card" role="dialog" aria-modal="true">
            {pinModalMode === 'unlock' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyUnlockPin();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--fg)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="lock" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Masukkan Security PIN
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '2px 0 0' }}>
                      Masukkan PIN untuk membuka pengaturan.
                    </p>
                  </div>
                </div>

                <div className="f" style={{ margin: '6px 0 0' }}>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    maxLength={12}
                    placeholder="••••"
                    className="pin-input-field"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                  />
                  {pinError && (
                    <span style={{ fontSize: '12px', color: 'var(--ac)', marginTop: '4px' }}>
                      {pinError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn out"
                    onClick={() => {
                      setPinModalMode('none');
                      setPinError('');
                    }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn pri">
                    Buka Kunci
                  </button>
                </div>
              </form>
            )}

            {pinModalMode === 'set' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSetNewPin();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--fg)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="key" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Buat Security PIN
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '2px 0 0' }}>
                      Buat PIN minimal 4 angka untuk keamanan.
                    </p>
                  </div>
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label htmlFor="new-pin">PIN Baru</label>
                  <input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    maxLength={12}
                    placeholder="Minimal 4 digit"
                    className="pin-input-field"
                    value={newPinInput}
                    onChange={(e) => {
                      setNewPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                  />
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label htmlFor="confirm-pin">Konfirmasi PIN</label>
                  <input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="Ulangi PIN baru"
                    className="pin-input-field"
                    value={confirmPinInput}
                    onChange={(e) => {
                      setConfirmPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                  />
                  {pinError && (
                    <span style={{ fontSize: '12px', color: 'var(--ac)', marginTop: '4px' }}>
                      {pinError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn out"
                    onClick={() => {
                      setPinModalMode('none');
                      setPinError('');
                    }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn pri">
                    Simpan PIN
                  </button>
                </div>
              </form>
            )}

            {pinModalMode === 'change' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleChangePin();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--fg)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="key" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Ganti Security PIN
                    </h3>
                    <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '2px 0 0' }}>
                      Masukkan PIN lama dan tentukan PIN baru.
                    </p>
                  </div>
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label htmlFor="old-pin">PIN Lama</label>
                  <input
                    id="old-pin"
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    maxLength={12}
                    placeholder="••••"
                    className="pin-input-field"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                  />
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label htmlFor="chg-new-pin">PIN Baru</label>
                  <input
                    id="chg-new-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="Minimal 4 digit"
                    className="pin-input-field"
                    value={newPinInput}
                    onChange={(e) => {
                      setNewPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                  />
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label htmlFor="chg-confirm-pin">Konfirmasi PIN Baru</label>
                  <input
                    id="chg-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={12}
                    placeholder="Ulangi PIN baru"
                    className="pin-input-field"
                    value={confirmPinInput}
                    onChange={(e) => {
                      setConfirmPinInput(e.target.value);
                      if (pinError) setPinError('');
                    }}
                  />
                  {pinError && (
                    <span style={{ fontSize: '12px', color: 'var(--ac)', marginTop: '4px' }}>
                      {pinError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn out"
                    onClick={() => {
                      setPinModalMode('none');
                      setPinError('');
                    }}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn pri">
                    Update PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
