'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  syncToSupabase,
  deleteProjectFromSupabase,
  deleteClientFromSupabase,
  deleteQuoteFromSupabase,
  DEFAULT_STUDIO_PROFILE,
  loadStudioProfile,
  saveStudioProfile,
  syncProfileToSupabase,
} from '@/lib/storage';
import {
  Y,
  ago,
  today,
  addDays,
  rp,
  sh,
  dt,
  pad,
} from '@/lib/formatters';
import { ChartMode } from '@/components/IncomeChart';
import { AuthUser, getActiveSession, setAuthSession, touchSession, clearAuthSession } from '@/lib/auth';
import { uploadFiles } from '@/lib/uploadthing';



export const PRESETS: Record<string, [string, number][]> = {
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

export const PRESET_NAMES: Record<string, string> = {
  full: 'Full payment',
  dp: 'DP 50 / 50',
  t3: '3 installments',
  custom: 'Custom',
};

export const generatePlanFromPreset = (
  presetKey: string,
  projectDeadline?: string,
  currentPlan?: { l: string; pct: number; due: string }[]
): { l: string; pct: number; due: string }[] => {
  const t = today();
  if (presetKey === 'custom') {
    return currentPlan && currentPlan.length ? currentPlan : [{ l: '', pct: 100, due: t }];
  }
  const presetConfig = PRESETS[presetKey];
  if (!presetConfig || !presetConfig.length) {
    return [{ l: '', pct: 100, due: t }];
  }

  if (presetKey === 'full') {
    return [{ l: 'Full payment', pct: 100, due: t }];
  }

  if (presetKey === 'dp') {
    return [
      { l: 'DP', pct: 50, due: t },
      { l: 'Final payment', pct: 50, due: projectDeadline || '' },
    ];
  }

  if (presetKey === 't3') {
    let midDate = '';
    if (projectDeadline) {
      const d1 = new Date(t + 'T00:00');
      const d2 = new Date(projectDeadline + 'T00:00');
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 > d1) {
        const midTime = d1.getTime() + (d2.getTime() - d1.getTime()) / 2;
        const mid = new Date(midTime);
        const y = mid.getFullYear();
        const m = String(mid.getMonth() + 1).padStart(2, '0');
        const d = String(mid.getDate()).padStart(2, '0');
        midDate = `${y}-${m}-${d}`;
      }
    }
    return [
      { l: 'DP', pct: 30, due: t },
      { l: 'Progress', pct: 40, due: midDate },
      { l: 'Final payment', pct: 30, due: projectDeadline || '' },
    ];
  }

  return presetConfig.map(([l, pct], i) => ({
    l,
    pct,
    due: i === 0 ? t : (i === presetConfig.length - 1 ? (projectDeadline || '') : ''),
  }));
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  Pending: 'Pending',
  Progress: 'In progress',
  Finished: 'Finished',
};

interface DashboardContextType {
  isMounted: boolean;
  authUser: AuthUser | null;
  setAuthUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  authInitialMode: 'login' | 'signup';
  setAuthInitialMode: React.Dispatch<React.SetStateAction<'login' | 'signup'>>;
  authInitialEmail: string;
  setAuthInitialEmail: React.Dispatch<React.SetStateAction<string>>;
  loadData: (email?: string) => Promise<void>;

  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  quotes: Quotation[];
  setQuotes: React.Dispatch<React.SetStateAction<Quotation[]>>;

  studioProfile: StudioProfile;
  setStudioProfile: React.Dispatch<React.SetStateAction<StudioProfile>>;
  profileDraft: StudioProfile;
  setProfileDraft: React.Dispatch<React.SetStateAction<StudioProfile>>;
  isProfileComplete: boolean;

  isSettingsUnlocked: boolean;
  setIsSettingsUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  pinModalMode: 'none' | 'unlock' | 'set' | 'change';
  setPinModalMode: React.Dispatch<React.SetStateAction<'none' | 'unlock' | 'set' | 'change'>>;
  pinInput: string;
  setPinInput: React.Dispatch<React.SetStateAction<string>>;
  newPinInput: string;
  setNewPinInput: React.Dispatch<React.SetStateAction<string>>;
  confirmPinInput: string;
  setConfirmPinInput: React.Dispatch<React.SetStateAction<string>>;
  pinError: string;
  setPinError: React.Dispatch<React.SetStateAction<string>>;
  profileSavedFeedback: boolean;

  previewProof: { name: string; url: string } | null;
  setPreviewProof: React.Dispatch<React.SetStateAction<{ name: string; url: string } | null>>;
  profileRequiredModal: 'project' | 'invoice' | 'quote' | null;
  setProfileRequiredModal: React.Dispatch<React.SetStateAction<'project' | 'invoice' | 'quote' | null>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncingCloud: boolean;
  syncFeedback: string | null;
  showSchemaModal: boolean;
  setShowSchemaModal: React.Dispatch<React.SetStateAction<boolean>>;
  schemaCopied: boolean;
  setSchemaCopied: React.Dispatch<React.SetStateAction<boolean>>;

  chartMode: ChartMode;
  setChartMode: React.Dispatch<React.SetStateAction<ChartMode>>;
  chartSelectedMonth: string;
  setChartSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  chartCustomRange: { start: string; end: string };
  setChartCustomRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
  chartCustomRangePreset: string | null;
  setChartCustomRangePreset: React.Dispatch<React.SetStateAction<string | null>>;

  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filterStatus: string;
  setFilterStatus: React.Dispatch<React.SetStateAction<string>>;
  sortKey: 'name' | 'due' | 'pg' | 'v';
  setSortKey: React.Dispatch<React.SetStateAction<'name' | 'due' | 'pg' | 'v'>>;
  sortDir: number;
  setSortDir: React.Dispatch<React.SetStateAction<number>>;

  docState: DocState | null;
  setDocState: React.Dispatch<React.SetStateAction<DocState | null>>;
  collapsedInvoiceGroups: Record<string, boolean>;
  setCollapsedInvoiceGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  collapsedQuoteGroups: Record<string, boolean>;
  setCollapsedQuoteGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  activeProjectDrawerId: number | null;
  setActiveProjectDrawerId: React.Dispatch<React.SetStateAction<number | null>>;
  activeClientDrawerId: number | null;
  setActiveClientDrawerId: React.Dispatch<React.SetStateAction<number | null>>;
  deleteArmed: boolean;
  setDeleteArmed: React.Dispatch<React.SetStateAction<boolean>>;

  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  projectClientMode: 'existing' | 'new';
  setProjectClientMode: React.Dispatch<React.SetStateAction<'existing' | 'new'>>;
  selectedProjectClientId: number | '';
  setSelectedProjectClientId: React.Dispatch<React.SetStateAction<number | ''>>;
  selectedProjectQuoteId: number;
  setSelectedProjectQuoteId: React.Dispatch<React.SetStateAction<number>>;
  quoteClientMode: 'existing' | 'new';
  setQuoteClientMode: React.Dispatch<React.SetStateAction<'existing' | 'new'>>;
  selectedQuoteClientId: number | '';
  setSelectedQuoteClientId: React.Dispatch<React.SetStateAction<number | ''>>;
  selectedQuoteProjectId: number;
  setSelectedQuoteProjectId: React.Dispatch<React.SetStateAction<number>>;

  newProjectData: {
    name: string;
    v: string;
    billingType: string;
    items: { d: string; type: string; p: number | string }[];
    invoiceDate: string;
    due: string;
    desc: string;
    cn: string;
    co: string;
    mail: string;
    tel: string;
    pre: string;
    plan: { l: string; pct: number; due: string }[];
  };
  setNewProjectData: React.Dispatch<React.SetStateAction<{
    name: string;
    v: string;
    billingType: string;
    items: { d: string; type: string; p: number | string }[];
    invoiceDate: string;
    due: string;
    desc: string;
    cn: string;
    co: string;
    mail: string;
    tel: string;
    pre: string;
    plan: { l: string; pct: number; due: string }[];
  }>>;

  newQuoteData: {
    cn: string;
    co: string;
    mail: string;
    tel: string;
    title: string;
    date: string;
    valid: string;
    validDays: number;
    scope: string[];
    items: { d: string; type: string; q: number | string; p: number | string }[];
    services: string[];
    paymentTerms: string;
    note: string;
    senderName: string;
    senderTagline: string;
    senderEmail: string;
    senderPhone: string;
  };
  setNewQuoteData: React.Dispatch<React.SetStateAction<{
    cn: string;
    co: string;
    mail: string;
    tel: string;
    title: string;
    date: string;
    valid: string;
    validDays: number;
    scope: string[];
    items: { d: string; type: string; q: number | string; p: number | string }[];
    services: string[];
    paymentTerms: string;
    note: string;
    senderName: string;
    senderTagline: string;
    senderEmail: string;
    senderPhone: string;
  }>>;

  uploadingItemId: number | null;
  searchInputRef: React.RefObject<HTMLInputElement | null>;

  allPayments: { i: PlanItem; p: Project }[];
  paidPayments: { i: PlanItem; p: Project }[];
  activeProject: Project | undefined;
  activeClient: Client | undefined;

  getClient: (id: number) => Client;
  getProjectPaidAmount: (p: Project) => number;
  getProjectPct: (p: Project) => number;
  getProjectStatus: (p: Project) => ProjectStatus;
  getBrandInitials: (name?: string) => string;
  getNextInvoiceNo: (targetDate?: string) => string;
  formatInvoiceNo: (rawNo?: string, invDate?: string) => string;
  getNextQuoteNo: (targetDate?: string) => string;
  formatQuoteNo: (rawNo?: string, qDate?: string, senderName?: string) => string;
  ensureClient: (info: { cn: string; co: string; mail: string; tel: string }) => Client | null;

  navigateTo: (v: ViewMode) => void;
  openDoc: (t: 'inv' | 'quo', a: number, b?: number) => void;
  openProjectDrawer: (projectId: number) => void;
  openClientDrawer: (clientId: number) => void;
  closeDrawer: () => void;

  handleStartNewProject: (targetClientId?: number, fromQuote?: Quotation | null) => void;
  handleStartNewQuote: (targetProjectId?: number, targetClientId?: number) => void;
  handlePlanPresetChange: (presetKey: string) => void;
  handleCreateProjectSubmit: () => void;
  handleSaveQuotationSubmit: () => void;
  handleLinkQuoteToProject: (quoteId: number, projectId: number) => void;
  handleUnlinkQuoteFromProject: (quoteId: number) => void;
  handleConvertQuoteToProject: (q: Quotation) => void;
  handleTogglePaymentPaid: (
    projectId: number,
    planItemId: number,
    markPaid: boolean,
    proofData?: { n: string; d: string } | null,
    paidDate?: string
  ) => void;
  handleProofUpload: (projectId: number, planItemId: number, file: File, paidDate?: string) => Promise<void>;
  handleUpdateDueDate: (projectId: number, planItemId: number, newDate: string) => void;
  handleCreateOrViewInvoice: (projectId: number, planItemId: number) => void;
  handleAddAdditionalService: (projectId: number, label: string, cost: number, paidAt: string) => number | null;
  handleDeleteProject: (projectId: number) => void;
  handleDeleteClient: (clientId: number) => void;
  handleDeleteQuote: (quoteId: number) => void;
  handleManualCloudSync: () => Promise<void>;

  handleStartEditSettings: () => void;
  handleVerifyUnlockPin: () => void;
  handleSetNewPin: () => void;
  handleChangePin: () => void;
  handleSaveUnlockedSettings: () => void;
  handleCancelEditSettings: () => void;
  handleExportBackup: () => void;
  handleOpenSettingsToCompleteProfile: () => void;

  filterDateRange: { start: string; end: string; label: string };
  overviewMetrics: {
    totalProjects: number;
    totalReceived: number;
    totalOutstanding: number;
    thisMonthVal: number;
    periodTxCount: number;
    upcoming: { i: PlanItem; p: Project }[];
    activeProjs: { p: Project; n: PlanItem | undefined }[];
    openQuotes: Quotation[];
  };
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
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
  const [previewProof, setPreviewProof] = useState<{ name: string; url: string } | null>(null);
  const [profileRequiredModal, setProfileRequiredModal] = useState<'project' | 'invoice' | 'quote' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [schemaCopied, setSchemaCopied] = useState(false);

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
  const [selectedProjectQuoteId, setSelectedProjectQuoteId] = useState<number>(0);
  const [quoteClientMode, setQuoteClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedQuoteClientId, setSelectedQuoteClientId] = useState<number | ''>('');
  const [selectedQuoteProjectId, setSelectedQuoteProjectId] = useState<number>(0);

  const [newProjectData, setNewProjectData] = useState({
    name: '',
    v: '',
    billingType: 'One-time',
    items: [{ d: '', type: 'One-time', p: '' as number | string }],
    invoiceDate: today(),
    due: '',
    desc: '',
    cn: '',
    co: '',
    mail: '',
    tel: '',
    pre: 'dp',
    plan: generatePlanFromPreset('dp', ''),
  });

  const [newQuoteData, setNewQuoteData] = useState({
    cn: '',
    co: '',
    mail: '',
    tel: '',
    title: '',
    date: today(),
    valid: addDays(today(), 7),
    validDays: 7,
    scope: [''],
    items: [{ d: '', type: 'One-time', q: 1 as number | string, p: '' as number | string }],
    services: [''],
    paymentTerms: '',
    note: '',
    senderName: '',
    senderTagline: '',
    senderEmail: '',
    senderPhone: '',
  });

  const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDataInitializedRef = useRef(false);

  const isProfileComplete = Boolean(
    studioProfile.studioName?.trim() &&
    studioProfile.bankName?.trim() &&
    studioProfile.accountNumber?.trim()
  );

  const closeDrawer = useCallback(() => {
    setActiveProjectDrawerId(null);
    setActiveClientDrawerId(null);
    setDeleteArmed(false);
  }, []);

  const openProjectDrawer = useCallback((projectId: number) => {
    setActiveClientDrawerId(null);
    setActiveProjectDrawerId(projectId);
    setDeleteArmed(false);
  }, []);

  const openClientDrawer = useCallback((clientId: number) => {
    setActiveProjectDrawerId(null);
    setActiveClientDrawerId(clientId);
    setDeleteArmed(false);
  }, []);

  const navigateTo = useCallback((v: ViewMode) => {
    setFilterStatus('All');
    setSearchQuery('');
    closeDrawer();
    if (v === 'overview') {
      router.push('/dashboard');
    } else {
      router.push(`/dashboard/${v}`);
    }
  }, [router, closeDrawer]);

  const openDoc = useCallback((t: 'inv' | 'quo', a: number, b?: number) => {
    setDocState({ t, a, b });
    closeDrawer();
    const query = new URLSearchParams({ t, a: String(a) });
    if (b !== undefined) query.set('b', String(b));
    router.push(`/dashboard/doc?${query.toString()}`);
  }, [router, closeDrawer]);

  const handleOpenSettingsToCompleteProfile = useCallback(() => {
    setProfileRequiredModal(null);
    router.push('/dashboard/settings');
    if (!studioProfile.securityPin) {
      setPinModalMode('set');
    } else if (!isSettingsUnlocked) {
      setPinModalMode('unlock');
    }
  }, [router, studioProfile.securityPin, isSettingsUnlocked]);

  // Preview Proof Esc listener
  useEffect(() => {
    if (!previewProof) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewProof(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewProof]);

  // Load and sync data from LocalStorage & Supabase
  const loadData = useCallback(async (email?: string) => {
    isDataInitializedRef.current = false;
    const userEmail = email || authUser?.email;
    const data = loadStoredData(userEmail);
    const profile = loadStudioProfile(userEmail);
    setStudioProfile(profile);
    setProfileDraft(profile);

    const rawPrefix = profile.studioName || 'ST';
    const cleanPrefix = rawPrefix.trim().replace(/[^a-zA-Z0-9\s.-]/g, '');
    const parts = cleanPrefix.split(/[\s.-]+/).filter(Boolean);
    const prefix = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts.length === 1 && parts[0].length >= 2
        ? parts[0].substring(0, 2).toUpperCase()
        : ((parts[0]?.[0] || 'S') + 'T').toUpperCase();

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
        if (remote.profile) {
          setStudioProfile(remote.profile);
          setProfileDraft(remote.profile);
        }

        let invSeq = 0;
        const normProjects = remote.data.projects.map((p) => ({
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

        const normQuotes = remote.data.quotes.map((q, idx) => {
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

        if (remote.data.clients.length > 0 || remote.data.projects.length > 0 || remote.data.quotes.length > 0) {
          setClients(remote.data.clients);
          setProjects(normProjects);
          setQuotes(normQuotes);
        }
      }
    } catch (e) {
      console.error('Failed to load from Supabase', e);
    } finally {
      setTimeout(() => {
        isDataInitializedRef.current = true;
      }, 500);
    }
  }, [authUser?.email]);

  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    setSyncFeedback(null);
    try {
      const email = authUser?.email;
      await syncToSupabase({ clients, projects, quotes }, email);
      await syncProfileToSupabase(studioProfile, email);
      const remote = await fetchFromSupabase(email);
      if (remote) {
        if (remote.profile) {
          setStudioProfile(remote.profile);
          setProfileDraft(remote.profile);
        }
        if (remote.data.clients.length > 0 || remote.data.projects.length > 0 || remote.data.quotes.length > 0) {
          setClients(remote.data.clients);
          setProjects(remote.data.projects);
          setQuotes(remote.data.quotes);
        }
        setSyncFeedback('Data synced successfully.');
      } else {
        setSyncFeedback('Saved locally.');
      }
    } catch (e: any) {
      setSyncFeedback(e?.message || 'Sync failed.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    setIsMounted(true);
    const session = getActiveSession();
    if (session) {
      setAuthUser(session);
      loadData(session.email);
    } else {
      clearAuthSession();
      setAuthUser(null);
      loadData();
    }

    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        // If 24-hour local session is expired or absent, ensure Supabase signs out
        const activeSession = getActiveSession();
        if (!activeSession) {
          if (sbSession) {
            supabase.auth.signOut().catch(() => {});
          }
          setAuthUser(null);
          return;
        }

        if (sbSession?.user) {
          const userEmail = sbSession.user.email || '';
          const userName =
            sbSession.user.user_metadata?.full_name ||
            sbSession.user.user_metadata?.name ||
            'Studio Owner';
          const userStudio = sbSession.user.user_metadata?.studio_name || '';
          const userObj: AuthUser = {
            id: sbSession.user.id,
            name: userName,
            studioName: userStudio,
            email: userEmail,
            createdAt: sbSession.user.created_at || new Date().toISOString(),
          };
          setAuthSession(userObj);
          setAuthUser(userObj);
          loadData(userEmail);
        }
      });
    });

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


  // Strict 24-hour inactivity session heartbeat & auto-lock
  useEffect(() => {
    if (!authUser) return;

    // Periodically verify session validity every minute
    const interval = setInterval(() => {
      const active = getActiveSession();
      if (!active) {
        clearAuthSession();
        setAuthUser(null);
      }
    }, 60 * 1000);

    // Re-check when user wakes device or switches back to tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const active = getActiveSession();
        if (!active) {
          clearAuthSession();
          setAuthUser(null);
        }
      }
    };

    // User interaction heartbeat (throttled to once every 2 minutes)
    let lastTouch = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastTouch > 2 * 60 * 1000) {
        lastTouch = now;
        touchSession();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [authUser]);

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
    const clean = pinInput.replace(/\D/g, '').slice(0, 4);
    if (clean.length !== 4) {
      setPinError('Please enter a 4-digit PIN.');
      return;
    }
    if (clean === studioProfile.securityPin) {
      setIsSettingsUnlocked(true);
      setProfileDraft({ ...studioProfile });
      setPinModalMode('none');
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  const handleSetNewPin = () => {
    const cleanNew = newPinInput.replace(/\D/g, '').slice(0, 4);
    const cleanConfirm = confirmPinInput.replace(/\D/g, '').slice(0, 4);
    if (cleanNew.length !== 4) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPinError('PIN confirmation does not match.');
      return;
    }
    const updated = { ...studioProfile, securityPin: cleanNew };
    setStudioProfile(updated);
    saveStudioProfile(updated, authUser?.email);
    setProfileDraft(updated);
    setIsSettingsUnlocked(true);
    setPinModalMode('none');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinError('');
  };

  const handleChangePin = () => {
    const cleanOld = pinInput.replace(/\D/g, '').slice(0, 4);
    const cleanNew = newPinInput.replace(/\D/g, '').slice(0, 4);
    const cleanConfirm = confirmPinInput.replace(/\D/g, '').slice(0, 4);
    if (cleanOld !== studioProfile.securityPin) {
      setPinError('Current PIN is incorrect.');
      return;
    }
    if (cleanNew.length !== 4) {
      setPinError('New PIN must be exactly 4 digits.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPinError('New PIN confirmation does not match.');
      return;
    }
    const updated = { ...studioProfile, securityPin: cleanNew };
    setStudioProfile(updated);
    saveStudioProfile(updated, authUser?.email);
    setProfileDraft(updated);
    setPinModalMode('none');
    setPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinError('');
  };

  const handleSaveUnlockedSettings = () => {
    setStudioProfile(profileDraft);
    saveStudioProfile(profileDraft, authUser?.email);
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
  }, [closeDrawer]);

  useEffect(() => {
    const mainEl = document.getElementById('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [pathname, docState]);

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

  // Helper functions
  const getClient = useCallback((id: number): Client => {
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
  }, [clients]);

  const allPayments = useMemo(() => {
    return projects.flatMap((p) => p.plan.map((i) => ({ i, p })));
  }, [projects]);

  const paidPayments = useMemo(() => {
    return allPayments.filter((x) => x.i.paid);
  }, [allPayments]);

  const getProjectPaidAmount = useCallback((p: Project): number => {
    return p.plan
      .filter((i) => i.paid)
      .reduce((acc, curr) => acc + curr.a, 0);
  }, []);

  const getProjectPct = useCallback((p: Project): number => {
    if (!p.v) return 0;
    return Math.min(100, Math.round((getProjectPaidAmount(p) / p.v) * 100));
  }, [getProjectPaidAmount]);

  const getProjectStatus = useCallback((p: Project): ProjectStatus => {
    const paidCount = p.plan.filter((i) => i.paid).length;
    if (p.plan.length > 0 && paidCount === p.plan.length) return 'Finished';
    if (paidCount > 0) return 'Progress';
    return 'Pending';
  }, []);

  const getBrandInitials = useCallback((name?: string): string => {
    const raw = name || studioProfile.studioName || 'ST';
    const clean = raw.trim().replace(/[^a-zA-Z0-9\s.-]/g, '');
    const parts = clean.split(/[\s.-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return ((parts[0]?.[0] || 'S') + 'T').toUpperCase();
  }, [studioProfile.studioName]);

  const getNextInvoiceNo = useCallback((targetDate?: string): string => {
    const d = targetDate ? new Date(targetDate + 'T00:00:00') : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const prefix = getBrandInitials(studioProfile.studioName);
    const count = allPayments.filter((x) => x.i.inv).length;
    return `INV/${prefix}/${mm}/${dd}/${pad(count + 1)}`;
  }, [allPayments, getBrandInitials, studioProfile.studioName]);

  const formatInvoiceNo = useCallback((rawNo?: string, invDate?: string): string => {
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
  }, [getBrandInitials, studioProfile.studioName]);

  const getNextQuoteNo = useCallback((targetDate?: string): string => {
    const d = targetDate ? new Date(targetDate + 'T00:00:00') : new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const prefix = getBrandInitials(newQuoteData.senderName || studioProfile.studioName);
    return `QT/${prefix}/${mm}/${dd}/${pad(quotes.length + 1)}`;
  }, [getBrandInitials, newQuoteData.senderName, studioProfile.studioName, quotes.length]);

  const formatQuoteNo = useCallback((rawNo?: string, qDate?: string, senderName?: string): string => {
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
  }, [getBrandInitials, studioProfile.studioName]);

  const ensureClient = useCallback((info: { cn: string; co: string; mail: string; tel: string }): Client | null => {
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
  }, [clients]);

  // Start creating new project
  const handleStartNewProject = useCallback((targetClientId?: number, fromQuote?: Quotation | null) => {
    if (!isProfileComplete) {
      setProfileRequiredModal('project');
      return;
    }
    const defaultMode = clients.length > 0 ? 'existing' : 'new';
    let targetClient = clients.find((c) => c.id === targetClientId) || clients[0];

    if (fromQuote) {
      const matchedClient = clients.find(
        (c) =>
          c.name.toLowerCase() === fromQuote.cn.toLowerCase() ||
          (fromQuote.mail && c.mail && c.mail.toLowerCase() === fromQuote.mail.toLowerCase())
      );
      if (matchedClient) {
        targetClient = matchedClient;
      }
    }

    setProjectClientMode(targetClient ? 'existing' : defaultMode);
    setSelectedProjectClientId(targetClient ? targetClient.id : '');
    setSelectedProjectQuoteId(fromQuote ? fromQuote.id : 0);

    const quoteTotal = fromQuote
      ? fromQuote.items.reduce((acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0), 0)
      : '';

    const quoteItems = fromQuote && fromQuote.items.length > 0
      ? fromQuote.items.map((it) => ({
        d: it.d,
        type: it.type || 'One-time',
        p: it.p,
      }))
      : [{ d: '', type: 'One-time', p: '' }];

    const quoteScopeDesc = fromQuote
      ? (fromQuote.scope && fromQuote.scope.filter((s) => s.trim()).length
        ? fromQuote.scope.filter((s) => s.trim()).join('\n')
        : '')
      : '';

    setNewProjectData({
      name: fromQuote ? fromQuote.title : '',
      v: quoteTotal ? String(quoteTotal) : '',
      billingType: fromQuote?.items[0]?.type || 'One-time',
      items: quoteItems,
      invoiceDate: today(),
      due: '',
      desc: quoteScopeDesc,
      cn: fromQuote ? fromQuote.cn : targetClient ? targetClient.name : '',
      co: fromQuote ? fromQuote.co : targetClient ? targetClient.co : '',
      mail: fromQuote ? fromQuote.mail : targetClient ? targetClient.mail : '',
      tel: fromQuote ? fromQuote.tel : targetClient ? targetClient.tel : '',
      pre: 'dp',
      plan: generatePlanFromPreset('dp', ''),
    });
    router.push('/dashboard/new');
  }, [clients, isProfileComplete, router]);

  // Start creating new quotation
  const handleStartNewQuote = useCallback((targetProjectId?: number, targetClientId?: number) => {
    if (!isProfileComplete) {
      setProfileRequiredModal('quote');
      return;
    }
    const defaultMode = clients.length > 0 ? 'existing' : 'new';
    let targetClient: Client | undefined;
    let targetProject: Project | undefined;

    if (targetProjectId) {
      targetProject = projects.find((p) => p.id === targetProjectId);
      if (targetProject) {
        targetClient = clients.find((c) => c.id === targetProject!.c);
      }
    } else if (targetClientId) {
      targetClient = clients.find((c) => c.id === targetClientId);
    } else {
      targetClient = clients[0];
    }

    setQuoteClientMode(targetClient ? 'existing' : defaultMode);
    setSelectedQuoteClientId(targetClient ? targetClient.id : '');
    setSelectedQuoteProjectId(targetProjectId || 0);

    setNewQuoteData({
      cn: targetClient ? targetClient.name : '',
      co: targetClient ? targetClient.co : '',
      mail: targetClient ? targetClient.mail : '',
      tel: targetClient ? targetClient.tel : '',
      title: targetProject ? targetProject.name : '',
      date: today(),
      valid: addDays(today(), 7),
      validDays: 7,
      scope: targetProject && targetProject.desc ? targetProject.desc.split('\n').filter(Boolean) : [''],
      items: targetProject && targetProject.items && targetProject.items.length
        ? targetProject.items.map((it) => ({ d: it.d, type: it.type || 'One-time', q: 1, p: it.p }))
        : [{ d: '', type: 'One-time', q: 1, p: '' }],
      services: [''],
      paymentTerms: studioProfile.defaultPaymentTerms || '',
      note: studioProfile.defaultNotes || '',
      senderName: studioProfile.studioName || '',
      senderTagline: studioProfile.tagline || '',
      senderEmail: studioProfile.email || '',
      senderPhone: studioProfile.phone || '',
    });
    router.push('/dashboard/quote');
  }, [clients, isProfileComplete, projects, studioProfile, router]);

  const handlePlanPresetChange = (presetKey: string) => {
    setNewProjectData((prev) => ({
      ...prev,
      pre: presetKey,
      plan: generatePlanFromPreset(presetKey, prev.due, prev.plan),
    }));
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
      const invDate = newProjectData.invoiceDate || today();
      const d = new Date(invDate + 'T00:00:00');
      const validDate = !isNaN(d.getTime());
      const mm = validDate ? String(d.getMonth() + 1).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
      const dd = validDate ? String(d.getDate()).padStart(2, '0') : String(new Date().getDate()).padStart(2, '0');
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
        inv: { no: invNo, date: invDate },
      };
    });

    const validItems = newProjectData.items
      .filter((i) => i.d.trim() || +i.p > 0)
      .map((i, idx) => ({
        d: i.d.trim() || `Item Layanan ${idx + 1}`,
        type: i.type || 'One-time',
        p: +i.p || 0,
      }));

    const createdProj: Project = {
      id,
      name: newProjectData.name.trim(),
      c: c ? c.id : 0,
      v: val,
      billingType: newProjectData.billingType || (validItems[0]?.type || 'One-time'),
      items: validItems.length > 0 ? validItems : [{ d: 'Item Layanan 1', type: newProjectData.billingType || 'One-time', p: val }],
      due: newProjectData.due,
      desc: newProjectData.desc,
      n: selectedProjectQuoteId ? `From Quotation` : '',
      plan,
    };

    setProjects((prev) => [...prev, createdProj]);

    if (selectedProjectQuoteId) {
      setQuotes((prev) =>
        prev.map((item) =>
          item.id === selectedProjectQuoteId
            ? { ...item, s: 'Accepted', pid: id }
            : item
        )
      );
    }

    setFilterStatus('All');
    setSearchQuery('');
    setActiveProjectDrawerId(id);
    router.push('/dashboard/projects');
  };

  const handleSaveQuotationSubmit = () => {
    if (!newQuoteData.cn.trim() || !newQuoteData.title.trim()) return;
    ensureClient(newQuoteData);
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
      scope: validScope.length ? validScope : ['Lingkup pekerjaan sesuai kesepakatan'],
      items: validItems.length ? validItems : [{ d: 'Service Deliverable', type: 'One-time', q: 1, p: 0 }],
      services: validServices,
      paymentTerms: newQuoteData.paymentTerms.trim(),
      note: newQuoteData.note.trim(),
      senderName: newQuoteData.senderName.trim(),
      senderTagline: newQuoteData.senderTagline.trim(),
      senderEmail: newQuoteData.senderEmail.trim(),
      senderPhone: newQuoteData.senderPhone.trim(),
      s: selectedQuoteProjectId ? 'Accepted' : 'Draft',
      pid: selectedQuoteProjectId || 0,
    };

    setQuotes((prev) => [...prev, newQuote]);
    openDoc('quo', qId);
  };

  const handleLinkQuoteToProject = (quoteId: number, projectId: number) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, pid: projectId } : q))
    );
  };

  const handleUnlinkQuoteFromProject = (quoteId: number) => {
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, pid: 0 } : q))
    );
  };

  const handleConvertQuoteToProject = (q: Quotation) => {
    if (!isProfileComplete) {
      setProfileRequiredModal('project');
      return;
    }
    const c = ensureClient({
      cn: q.cn,
      co: q.co,
      mail: q.mail,
      tel: q.tel,
    });
    const id = Date.now();
    const tot = q.items.reduce((acc, curr) => acc + curr.q * curr.p, 0);
    const planItems = generatePlanFromPreset('dp', '');
    let rem = tot;
    const plan: PlanItem[] = planItems.map((pi, i) => {
      const a =
        i === planItems.length - 1 ? rem : Math.round((tot * pi.pct) / 100);
      rem -= a;
      return {
        id: id * 10 + i,
        l: pi.l,
        pct: pi.pct,
        a,
        due: pi.due,
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
      desc: q.scope && q.scope.filter((s) => s.trim()).length ? q.scope.filter((s) => s.trim()).join('\n') : '',
      n: `From ${q.no}`,
      plan,
    };

    setProjects((prev) => [...prev, newProj]);
    setQuotes((prev) =>
      prev.map((item) =>
        item.id === q.id ? { ...item, s: 'Accepted', pid: id } : item
      )
    );
    setActiveProjectDrawerId(id);
    router.push('/dashboard/projects');
  };

  const handleTogglePaymentPaid = (
    projectId: number,
    planItemId: number,
    markPaid: boolean,
    proofData?: { n: string; d: string } | null,
    paidDate?: string
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
              pd: markPaid ? (paidDate || item.pd || today()) : '',
              proof: proofData !== undefined ? proofData : markPaid ? item.proof : null,
            };
          }),
        };
      })
    );
  };

  const handleProofUpload = async (
    projectId: number,
    planItemId: number,
    file: File,
    paidDate?: string
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
        }, paidDate);
      } else {
        handleTogglePaymentPaid(projectId, planItemId, true, {
          n: file.name,
          d: '',
        }, paidDate);
      }
    } catch (err) {
      console.error('UploadThing error:', err);
      const reader = new FileReader();
      reader.onload = () => {
        handleTogglePaymentPaid(projectId, planItemId, true, {
          n: file.name,
          d: reader.result as string,
        }, paidDate);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingItemId(null);
    }
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

  const handleAddAdditionalService = (projectId: number, label: string, cost: number, paidAt: string) => {
    const targetProject = projects.find((p) => p.id === projectId);
    if (!targetProject) return null;

    const newItemId = Date.now() * 10 + targetProject.plan.length;
    const currentInvCount = allPayments.filter((x) => x.i.inv).length + 1;
    const invDate = paidAt || today();
    const d = new Date(invDate + 'T00:00:00');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const prefix = getBrandInitials(studioProfile.studioName);
    const invNo = `INV/${prefix}/${mm}/${dd}/${pad(currentInvCount)}`;

    const newPlanItem: PlanItem = {
      id: newItemId,
      l: label,
      pct: 0,
      a: cost,
      due: paidAt,
      paid: false,
      pd: '',
      proof: null,
      inv: { no: invNo, date: invDate },
    };

    const newCostItem = {
      d: label,
      type: 'Additional' as const,
      p: cost,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          v: p.v + cost,
          items: [...(p.items || []), newCostItem],
          plan: [...p.plan, newPlanItem],
        };
      })
    );
    return newItemId;
  };

  const handleCreateOrViewInvoice = (projectId: number, planItemId: number) => {
    const targetProject = projects.find((p) => p.id === projectId);
    const targetItem = targetProject?.plan.find((it) => it.id === planItemId);
    if (!targetItem?.inv && !isProfileComplete) {
      setProfileRequiredModal('invoice');
      return;
    }
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          plan: p.plan.map((item) => {
            if (item.id !== planItemId) return item;
            if (item.inv) {
              return item;
            }
            const generatedNo = getNextInvoiceNo();
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

  const handleDeleteProject = (projectId: number) => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    deleteProjectFromSupabase(projectId, authUser?.email);
    closeDrawer();
  };

  const handleDeleteClient = (clientId: number) => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    deleteClientFromSupabase(clientId, authUser?.email);
    closeDrawer();
  };

  const handleDeleteQuote = (quoteId: number) => {
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    deleteQuoteFromSupabase(quoteId, authUser?.email);
    router.push('/dashboard/quotations');
  };

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

  const overviewMetrics = useMemo(() => {
    const { start: startDate, end: endDate } = filterDateRange;

    const periodPaidPayments = paidPayments.filter(
      (x) => x.i.pd && x.i.pd >= startDate && x.i.pd <= endDate
    );
    const totalReceived = periodPaidPayments.reduce((acc, x) => acc + x.i.a, 0);

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
      totalOutstanding = activeProjectsInPeriod.reduce((acc, p) => {
        const remaining = p.plan
          .filter((item) => !item.paid && item.due && item.due >= startDate && item.due <= endDate)
          .reduce((sum, item) => sum + item.a, 0);
        return acc + remaining;
      }, 0);
    }

    const currentYm = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    let thisMonthVal = 0;
    if (chartMode === '6m') {
      thisMonthVal = projects.reduce((sum, p) => sum + (+p.v || 0), 0);
    } else if (chartMode === 'month') {
      const targetMonth = chartSelectedMonth || currentYm;
      const monthProjects = projects.filter((p) => {
        const hasPaidInMonth = p.plan.some((item) => item.paid && item.pd && item.pd.startsWith(targetMonth));
        const hasDueInMonth = p.plan.some((item) => item.due && item.due.startsWith(targetMonth));
        const hasProjectDue = p.due && p.due.startsWith(targetMonth);
        return hasPaidInMonth || hasDueInMonth || hasProjectDue;
      });
      thisMonthVal = monthProjects.reduce((sum, p) => sum + (+p.v || 0), 0);
    } else {
      thisMonthVal = activeProjectsInPeriod.reduce((sum, p) => sum + (+p.v || 0), 0);
    }
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
  }, [projects, paidPayments, allPayments, quotes, filterDateRange, chartMode, getProjectStatus]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectDrawerId);
  }, [projects, activeProjectDrawerId]);

  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === activeClientDrawerId);
  }, [clients, activeClientDrawerId]);

  const value = {
    isMounted,
    authUser,
    setAuthUser,
    authInitialMode,
    setAuthInitialMode,
    authInitialEmail,
    setAuthInitialEmail,
    loadData,

    clients,
    setClients,
    projects,
    setProjects,
    quotes,
    setQuotes,

    studioProfile,
    setStudioProfile,
    profileDraft,
    setProfileDraft,
    isProfileComplete,

    isSettingsUnlocked,
    setIsSettingsUnlocked,
    pinModalMode,
    setPinModalMode,
    pinInput,
    setPinInput,
    newPinInput,
    setNewPinInput,
    confirmPinInput,
    setConfirmPinInput,
    pinError,
    setPinError,
    profileSavedFeedback,

    previewProof,
    setPreviewProof,
    profileRequiredModal,
    setProfileRequiredModal,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSyncingCloud,
    syncFeedback,
    showSchemaModal,
    setShowSchemaModal,
    schemaCopied,
    setSchemaCopied,

    chartMode,
    setChartMode,
    chartSelectedMonth,
    setChartSelectedMonth,
    chartCustomRange,
    setChartCustomRange,
    chartCustomRangePreset,
    setChartCustomRangePreset,

    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,

    docState,
    setDocState,
    collapsedInvoiceGroups,
    setCollapsedInvoiceGroups,
    collapsedQuoteGroups,
    setCollapsedQuoteGroups,

    activeProjectDrawerId,
    setActiveProjectDrawerId,
    activeClientDrawerId,
    setActiveClientDrawerId,
    deleteArmed,
    setDeleteArmed,

    isSidebarCollapsed,
    toggleSidebar,
    theme,
    toggleTheme,

    projectClientMode,
    setProjectClientMode,
    selectedProjectClientId,
    setSelectedProjectClientId,
    selectedProjectQuoteId,
    setSelectedProjectQuoteId,
    quoteClientMode,
    setQuoteClientMode,
    selectedQuoteClientId,
    setSelectedQuoteClientId,
    selectedQuoteProjectId,
    setSelectedQuoteProjectId,

    newProjectData,
    setNewProjectData,
    newQuoteData,
    setNewQuoteData,

    uploadingItemId,
    searchInputRef,

    allPayments,
    paidPayments,
    activeProject,
    activeClient,

    getClient,
    getProjectPaidAmount,
    getProjectPct,
    getProjectStatus,
    getBrandInitials,
    getNextInvoiceNo,
    formatInvoiceNo,
    getNextQuoteNo,
    formatQuoteNo,
    ensureClient,

    navigateTo,
    openDoc,
    openProjectDrawer,
    openClientDrawer,
    closeDrawer,

    handleStartNewProject,
    handleStartNewQuote,
    handlePlanPresetChange,
    handleCreateProjectSubmit,
    handleSaveQuotationSubmit,
    handleLinkQuoteToProject,
    handleUnlinkQuoteFromProject,
    handleConvertQuoteToProject,
    handleTogglePaymentPaid,
    handleProofUpload,
    handleUpdateDueDate,
    handleCreateOrViewInvoice,
    handleAddAdditionalService,
    handleDeleteProject,
    handleDeleteClient,
    handleDeleteQuote,
    handleManualCloudSync,

    handleStartEditSettings,
    handleVerifyUnlockPin,
    handleSetNewPin,
    handleChangePin,
    handleSaveUnlockedSettings,
    handleCancelEditSettings,
    handleExportBackup,
    handleOpenSettingsToCompleteProfile,

    filterDateRange,
    overviewMetrics,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
