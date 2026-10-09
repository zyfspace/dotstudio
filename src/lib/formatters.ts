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
  if (Math.abs(val) >= 1_000_000_000) {
    const formatted = (val / 1_000_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${formatted}M`;
  }
  if (Math.abs(val) >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${formatted}jt`;
  }
  if (Math.abs(val) >= 1_000) {
    const formatted = (val / 1_000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${formatted}rb`;
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
