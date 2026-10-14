'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/Icons';
import { runDocumentAction, type DocumentActionName } from '@/lib/documentExport';

const LABELS: Record<DocumentActionName, { long: string; short: string; icon: string }> = {
  download: { long: 'Download', short: 'Download', icon: 'download' },
  print: { long: 'Print / PDF', short: 'Print', icon: 'print' },
};

/** Header button that runs a document action on the A4 page (`.docx-a4`) */
export function DocActionButton({
  action = 'download',
  filename,
}: {
  action?: DocumentActionName;
  filename: string;
}) {
  const [busy, setBusy] = useState(false);
  const label = LABELS[action];

  const run = async () => {
    const page = document.querySelector<HTMLElement>('.docx-a4');
    if (!page || busy) return;
    setBusy(true);
    try {
      await runDocumentAction(action, page, { filename });
    } catch (err) {
      console.error('Document export failed', err);
      window.alert('Could not create the file. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="btn pri"
      id="pt"
      onClick={run}
      disabled={busy}
      aria-label={label.long}
      aria-busy={busy}
    >
      <Icon name={label.icon} />
      <span className="pt-long">{busy ? 'Preparing…' : label.long}</span>
      <span className="pt-short">{busy ? '…' : label.short}</span>
    </button>
  );
}
