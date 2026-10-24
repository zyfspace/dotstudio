import React from 'react';
import { rp } from '@/lib/formatters';

// Rupiah amount that blurs when dashboard privacy mode is on
export function Money({ v }: { v?: number }) {
  return <span className="pv num">{rp(v)}</span>;
}
