'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocView } from '../views/DocView';
import { DocViewEn } from '../views/DocViewEn';

// Indonesian is the default; `?lang=en` opens the English version
function DocByLang() {
  const lang = useSearchParams()?.get('lang');
  return lang === 'en' ? <DocViewEn /> : <DocView />;
}

export default function DocPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mut)' }}>
          Loading document...
        </div>
      }
    >
      <DocByLang />
    </Suspense>
  );
}
