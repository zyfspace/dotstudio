/**
 * Output actions for quotation / invoice pages. Each action takes the A4 page
 * element; add new ones (e.g. a print preview) to `documentActions` and the
 * header picks them up through `runDocumentAction`.
 */

const A4_PX = { w: 794, h: 1123 };
const A4_MM = { w: 210, h: 297 };

export type DocumentActionName = 'download' | 'print';

export type DocumentActionOptions = {
  /** File name without extension */
  filename: string;
};

type DocumentAction = (page: HTMLElement, opts: DocumentActionOptions) => Promise<void>;

export function safeFilename(name: string) {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'document'
  );
}

/** Renders the page at A4 size (ignoring any fit-to-screen zoom) into a PDF and saves it */
const download: DocumentAction = async (page, { filename }) => {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = await html2canvas(page, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    width: A4_PX.w,
    windowWidth: A4_PX.w,
    onclone: (_doc, clone) => {
      clone.style.setProperty('zoom', '1');
      clone.style.setProperty('width', `${A4_PX.w}px`);
      clone.style.setProperty('box-shadow', 'none');
      clone.style.setProperty('margin', '0');
    },
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageH = Math.round((canvas.width * A4_MM.h) / A4_MM.w);
  const pages = Math.max(1, Math.ceil((canvas.height - 2) / pageH));

  for (let n = 0; n < pages; n++) {
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = pageH;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, -n * pageH);
    if (n > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_MM.w, A4_MM.h);
  }

  pdf.save(`${safeFilename(filename)}.pdf`);
};

/** Browser print dialog; not exposed in the UI yet */
const print: DocumentAction = async () => {
  window.print();
};

export const documentActions: Record<DocumentActionName, DocumentAction> = {
  download,
  print,
};

export function runDocumentAction(
  name: DocumentActionName,
  page: HTMLElement,
  opts: DocumentActionOptions
) {
  return documentActions[name](page, opts);
}
