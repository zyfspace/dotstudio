export interface Client {
  id: number;
  name: string;
  co: string;
  mail: string;
  tel: string;
  n: string;
}

export interface Proof {
  n: string;
  d: string;
}

export interface InvoiceMeta {
  no: string;
  date: string;
}

export interface PlanItem {
  id: number;
  l: string;
  pct: number;
  a: number;
  due: string;
  paid: boolean;
  pd: string;
  proof: Proof | null;
  inv: InvoiceMeta | null;
}

export interface ProjectCostItem {
  d: string;
  type: string;
  p: number;
}

export interface Project {
  id: number;
  name: string;
  c: number;
  v: number;
  due: string;
  desc: string;
  billingType?: string;
  items?: ProjectCostItem[];
  n: string;
  plan: PlanItem[];
}

export interface QuotationItem {
  d: string;
  type?: string;
  q: number;
  p: number;
}

export interface Quotation {
  id: number;
  no: string;
  cn: string;
  co: string;
  mail: string;
  tel: string;
  title: string;
  date: string;
  valid: string;
  validDays?: number;
  items: QuotationItem[];
  scope?: string[];
  services?: string[];
  terms?: string[];
  paymentTerms?: string;
  note: string;
  senderName?: string;
  senderTagline?: string;
  senderEmail?: string;
  senderPhone?: string;
  s: 'Draft' | 'Sent' | 'Accepted';
  pid: number;
}

export interface StudioProfile {
  studioName: string;
  ownerName: string;
  tagline: string;
  email: string;
  phone: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  defaultPaymentTerms?: string;
  defaultNotes?: string;
  securityPin?: string;
}

export type ViewMode =
  | 'overview'
  | 'projects'
  | 'clients'
  | 'payments'
  | 'invoices'
  | 'quotations'
  | 'settings'
  | 'new'
  | 'quote'
  | 'doc';

export interface DocState {
  t: 'inv' | 'quo';
  a: number; // project id or quote id
  b?: number; // plan item id (for invoice)
}

export type ProjectStatus = 'Pending' | 'Progress' | 'Finished';
