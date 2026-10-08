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

export const pad = (n: number | string): string => String(n).padStart(3, '0');

export const isOverdue = (due?: string, paid?: boolean): boolean => {
  return !paid && !!due && due < today();
};
