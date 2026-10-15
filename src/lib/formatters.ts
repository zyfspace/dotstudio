export const Y = new Date().getFullYear();

export const ago = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const today = (): string => ago(0);

export const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const num = (n?: number): string => {
  return new Intl.NumberFormat('id-ID').format(n || 0);
};

export const rp = (n?: number): string => {
  return 'Rp ' + num(n);
};

export const sh = (n?: number): string => {
  return rp(n);
};

export const dt = (s?: string): string => {
  if (!s) return 'No date';
  const parsed = new Date(s + 'T00:00');
  if (isNaN(parsed.getTime())) return 'No date';
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const numShort = (n?: number): string => {
  const val = n || 0;
  if (val === 0) return '0';
  const units: [number, string][] = [[1_000_000_000, 'B'], [1_000_000, 'M'], [1_000, 'K']];
  for (const [size, unit] of units) {
    if (Math.abs(val) >= size) return `${(val / size).toFixed(1).replace(/\.0$/, '')}${unit}`;
  }
  return String(val);
};

export const rpShort = (n?: number): string => {
  return 'Rp ' + numShort(n);
};

export const pad = (n: number | string): string => String(n).padStart(3, '0');

export const isOverdue = (due?: string, paid?: boolean): boolean => {
  return !paid && !!due && due < today();
};

export const isRecurringBilling = (type?: string): boolean => {
  if (!type) return false;
  return /recurring|monthly|bulanan|yearly|tahunan|quarterly|kuartal|3 bulan|weekly|mingguan|retainer/i.test(type);
};

export const normalizeBillingType = (type?: string): string => {
  if (!type) return 'One-time';
  const clean = type.trim();
  if (/^monthly$|^bulanan$/i.test(clean)) return 'Monthly (Recurring)';
  if (/^tahunan$|^yearly$/i.test(clean)) return 'Tahunan (Recurring)';
  if (/^mingguan$|^weekly$/i.test(clean)) return 'Mingguan (Recurring)';
  if (/^quarterly$|^per 3 bulan$|^kuartal$/i.test(clean)) return 'Quarterly (Recurring)';
  if (/^retainer$/i.test(clean)) return 'Retainer (Recurring)';
  return clean;
};

export const getBillingTypeDocLabel = (type?: string): string => {
  return normalizeBillingType(type);
};

export const getRecurringIntervalLabel = (type?: string): string => {
  const t = (type || '').toLowerCase();
  if (t.includes('year') || t.includes('tahun')) return '/ tahun';
  if (t.includes('quarter') || t.includes('kuartal') || t.includes('3 bulan')) return '/ 3 bln';
  if (t.includes('week') || t.includes('minggu')) return '/ minggu';
  return '/ bulan';
};
