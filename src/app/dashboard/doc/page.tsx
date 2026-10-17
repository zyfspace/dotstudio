'use client';

import { Suspense } from 'react';
import { DocView } from '../views/DocView';

export default function DocPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mut)' }}>
          Loading document...
        </div>
      }
    >
      <DocView />
    </Suspense>
  );
}
