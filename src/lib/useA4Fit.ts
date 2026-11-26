import { useCallback, useLayoutEffect, useState } from 'react';

// Size of an A4 page at 96dpi; the page keeps this layout on every screen
export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;

// Pieces that never split across two pages; tables and lists split per row/item
const SPLIT = 'table, thead, tbody, tfoot, ol, ul, .docx-body-content';
// Pieces that move to the next page together with the piece after them
// (a heading with its content, the last table row with the totals)
const KEEP_WITH_NEXT = '.docx-sec-title, thead tr, tbody tr:last-child';

type Pushed = { el: HTMLElement; prop: string };

function collect(root: Element, out: HTMLElement[]) {
  for (const el of Array.from(root.children) as HTMLElement[]) {
    if (el.matches(SPLIT)) collect(el, out);
    else out.push(el);
  }
}

/**
 * Lays a long document out on as many A4 pages as it needs: anything that
 * would cross a page edge (a table row, list item, section) moves to the top
 * of the next page, and the footer sits at the bottom of the last page.
 * Returns the page count; the PDF export slices the page at these edges.
 */
function paginate(paper: HTMLElement, pushed: Pushed[]): number {
  for (const { el, prop } of pushed.splice(0)) el.style.removeProperty(prop);
  paper.querySelectorAll(':scope > .docx-repeat-head').forEach((el) => el.remove());
  paper.classList.remove('docx-a4-fit');
  paper.style.setProperty('min-height', '0px', 'important');

  const scale = paper.getBoundingClientRect().width / A4_WIDTH || 1;
  const origin = () => paper.getBoundingClientRect().top;
  const height = () => paper.getBoundingClientRect().height / scale;

  // Slightly too long for one page: tighten the margins first (same as before)
  if (height() > A4_HEIGHT && height() <= A4_HEIGHT * 1.15) {
    paper.classList.add('docx-a4-fit');
    if (height() > A4_HEIGHT) paper.classList.remove('docx-a4-fit');
  }

  let pages = 1;
  if (height() > A4_HEIGHT) {
    const cs = getComputedStyle(paper);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const room = A4_HEIGHT - padTop - padBottom;

    const pieces: HTMLElement[] = [];
    collect(paper, pieces);
    const footer = paper.querySelector<HTMLElement>(':scope > .docx-footer-wrap');
    const y0 = origin();
    const top = (el: HTMLElement) => (el.getBoundingClientRect().top - y0) / scale;
    const bottom = (el: HTMLElement) => (el.getBoundingClientRect().bottom - y0) / scale;

    // A table that continues on a new page repeats its header row there,
    // drawn over the gap left above the first row moved to that page
    const repeatHead = (el: HTMLElement, by: number) => {
      const table = el.closest('table');
      const head = el.parentElement?.tagName === 'TBODY' ? table?.querySelector('thead') : null;
      if (!table || !head) return by;
      const headH = head.getBoundingClientRect().height / scale;
      const box = table.getBoundingClientRect();
      const paperBox = paper.getBoundingClientRect();
      const copy = table.cloneNode(false) as HTMLElement;
      copy.appendChild(head.cloneNode(true));
      copy.classList.add('docx-repeat-head');
      copy.setAttribute('aria-hidden', 'true');
      const place = {
        position: 'absolute',
        margin: '0',
        left: `${(box.left - paperBox.left) / scale - paper.clientLeft}px`,
        top: `${top(el) + by - paper.clientTop}px`,
        width: `${box.width / scale}px`,
      };
      for (const [prop, value] of Object.entries(place)) copy.style.setProperty(prop, value, 'important');
      paper.appendChild(copy);
      return by + headH;
    };

    const push = (el: HTMLElement, by: number) => {
      if (el.tagName === 'TR') {
        by = repeatHead(el, by);
        for (const td of Array.from(el.children) as HTMLElement[]) {
          const pad = parseFloat(getComputedStyle(td).paddingTop) || 0;
          td.style.setProperty('padding-top', `${pad + by}px`, 'important');
          pushed.push({ el: td, prop: 'padding-top' });
        }
      } else {
        const margin = parseFloat(getComputedStyle(el).marginTop) || 0;
        el.style.setProperty('margin-top', `${margin + by}px`, 'important');
        pushed.push({ el, prop: 'margin-top' });
      }
    };

    // The closing section (last heading through the footer) stays on one page
    // when it fits there, so no single note is left on a page of its own
    const footerAt = footer ? pieces.indexOf(footer) : -1;
    let closing = -1;
    for (let n = footerAt - 1; n >= 0 && closing < 0; n--) {
      if (pieces[n].matches('.docx-sec-title')) closing = n;
    }

    for (let n = 0; n < pieces.length; n++) {
      const el = pieces[n];
      if (el === footer) break;
      const start = top(el);
      let end = bottom(el);
      for (let j = n; pieces[j].matches(KEEP_WITH_NEXT) && pieces[j + 1] && pieces[j + 1] !== footer; ) {
        end = bottom(pieces[++j]);
      }
      if (n === closing && footer && bottom(footer) - start <= room) end = bottom(footer);
      const page = Math.floor(start / A4_HEIGHT);
      const pageTop = page * A4_HEIGHT + padTop;
      if (page > 0 && start < pageTop) push(el, pageTop - start);
      else if (end > (page + 1) * A4_HEIGHT - padBottom && end - start <= room) {
        push(el, (page + 1) * A4_HEIGHT + padTop - start);
      }
    }

    // The footer stays whole; if it does not fit it opens one more page
    const last = footer ?? pieces[pieces.length - 1];
    const page = Math.floor(top(last) / A4_HEIGHT);
    const overflows = bottom(last) > (page + 1) * A4_HEIGHT - padBottom;
    pages = overflows ? page + 2 : page + 1;
  }

  paper.style.setProperty('min-height', `${pages * A4_HEIGHT}px`, 'important');
  paper.style.setProperty('--a4-pages', String(pages));
  return pages;
}

/**
 * Shrinks the A4 page to fit its container (like a PDF viewer), so narrow
 * screens and live previews show exactly the layout that prints, and splits
 * long documents into A4 pages. Print resets the zoom in CSS.
 */
export function useA4Fit() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pushed] = useState<Pushed[]>(() => []);

  useLayoutEffect(() => {
    const host = el?.parentElement;
    if (!host) return;
    const fit = () => setZoom(Math.min(1, host.clientWidth / A4_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [el]);

  // Content can change on any render; re-run the page split after each one
  useLayoutEffect(() => {
    if (!el) return;
    paginate(el, pushed);
    let live = true;
    document.fonts?.ready.then(() => live && paginate(el, pushed));
    return () => {
      live = false;
    };
  });

  const ref = useCallback((node: HTMLDivElement | null) => setEl(node), []);
  return { ref, style: zoom < 1 ? { zoom } : undefined };
}
