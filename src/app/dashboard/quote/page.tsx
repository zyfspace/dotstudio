'use client';

import { Suspense } from 'react';
import { NewQuoteView } from '../views/NewQuoteView';

export default function NewQuotePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mut)' }}>
          Loading quotation...
        </div>
      }
    >
      <NewQuoteView />
    </Suspense>
  );
}
