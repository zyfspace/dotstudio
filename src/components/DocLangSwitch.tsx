'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Header button that flips the document page between the default (Indonesian) and English version */
export function DocLangSwitch({ lang }: { lang: 'id' | 'en' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const toggle = () => {
    const query = new URLSearchParams(searchParams?.toString());
    if (lang === 'id') query.set('lang', 'en');
    else query.delete('lang');
    router.replace(`/dashboard/doc?${query.toString()}`);
  };

  return (
    <button
      className="btn"
      id="doc-lang"
      onClick={toggle}
      aria-label={lang === 'id' ? 'Switch to English version' : 'Switch to Indonesian version'}
    >
      {lang === 'id' ? 'English' : 'Indonesia'}
    </button>
  );
}

export default DocLangSwitch;
