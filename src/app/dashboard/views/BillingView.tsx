'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { InvoicesPanel } from './InvoicesView';
import { QuotationsPanel } from './QuotationsView';

export function BillingView() {
  const { searchQuery, setSearchQuery, searchInputRef, handleStartNewQuote } = useDashboard();

  return (
    <div>
      <div className="top">
        <h1>Invoices &amp; Quotations</h1>
        <label className="search">
          <Icon name="search" />
          <input
            ref={searchInputRef}
            id="q"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          <kbd>/</kbd>
        </label>
        <button
          className="btn pri"
          id="add"
          onClick={() => handleStartNewQuote()}
        >
          <Icon name="plus" />
          New quotation
        </button>
      </div>

      <div className="doc-split">
        <InvoicesPanel />
        <QuotationsPanel />
      </div>
    </div>
  );
}
