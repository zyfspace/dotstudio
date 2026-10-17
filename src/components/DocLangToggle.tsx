'use client';

import React from 'react';
import type { DocLang } from '@/types';

/** Language switch above the live invoice / quotation preview; the choice is saved with the document */
export function DocLangToggle({
  value,
  onChange,
}: {
  value: DocLang;
  onChange: (lang: DocLang) => void;
}) {
  return (
    <div
      className="seg"
      role="group"
      aria-label="Document language"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)', width: '168px', marginBottom: '12px' }}
    >
      <button
        type="button"
        className={value === 'id' ? 'on' : ''}
        aria-pressed={value === 'id'}
        onClick={() => onChange('id')}
      >
        Indonesia
      </button>
      <button
        type="button"
        className={value === 'en' ? 'on' : ''}
        aria-pressed={value === 'en'}
        onClick={() => onChange('en')}
      >
        English
      </button>
    </div>
  );
}

export default DocLangToggle;
