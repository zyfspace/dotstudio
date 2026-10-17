'use client';

import { Suspense } from 'react';
import { NewProjectView } from '../views/NewProjectView';

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mut)' }}>
          Loading project...
        </div>
      }
    >
      <NewProjectView />
    </Suspense>
  );
}
