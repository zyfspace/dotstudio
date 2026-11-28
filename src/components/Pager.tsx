'use client';

import React, { useState } from 'react';

export const PAGE_SIZE = 10;

// Slices a list into pages. Goes back to page 1 whenever resetKey changes
// (search, filter, sort) and clamps when the list shrinks.
export function usePagination<T>(items: T[], resetKey: string, size = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const page = state.key === resetKey ? Math.min(state.page, pageCount) : 1;
  const start = (page - 1) * size;

  return {
    page,
    pageCount,
    pageItems: items.slice(start, start + size),
    from: items.length ? start + 1 : 0,
    to: Math.min(start + size, items.length),
    total: items.length,
    setPage: (next: number) => setState({ key: resetKey, page: next }),
  };
}

type PagerProps = Omit<ReturnType<typeof usePagination>, 'pageItems'>;

export function Pager({ page, pageCount, from, to, total, setPage }: PagerProps) {
  if (pageCount <= 1) return null;

  // First, last, and the pages around the current one; gaps become "…"
  const pages: (number | string)[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (n === 1 || n === pageCount || Math.abs(n - page) <= 1) pages.push(n);
    else if (typeof pages[pages.length - 1] === 'number') pages.push(`gap-${n}`);
  }

  return (
    <nav className="pager" aria-label="Pagination">
      <span className="mut">
        {from}–{to} of {total}
      </span>
      <div className="pager-btns">
        <button type="button" className="btn sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        {pages.map((n) =>
          typeof n === 'number' ? (
            <button
              key={n}
              type="button"
              className={`btn sm ${n === page ? 'pri' : ''}`}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ) : (
            <span key={n} className="mut">…</span>
          )
        )}
        <button type="button" className="btn sm" disabled={page === pageCount} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
