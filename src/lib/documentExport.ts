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

      // Auto-fit to 1 page if document slightly overflows (up to 12% over 1 page)
      const targetH = A4_PX.h;
      if (clone.scrollHeight > targetH && clone.scrollHeight <= targetH * 1.15) {
        clone.style.setProperty('padding', '13mm 16mm 10mm', 'important');
        const footerWrap = clone.querySelector('.docx-footer-wrap') as HTMLElement;
        if (footerWrap) {
          footerWrap.style.setProperty('padding-top', '8px', 'important');
        }
        const watermark = clone.querySelector('.docx-watermark-wrap') as HTMLElement;
        if (watermark) {
          watermark.style.setProperty('margin-top', '6px', 'important');
        }
      }
    },
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageH = Math.round((canvas.width * A4_MM.h) / A4_MM.w);
  const scale = canvas.width / A4_PX.w;
  // If the canvas only overflows by a small margin (<= 50px at 1x), keep it as 1 page
  const singlePageThreshold = pageH + Math.round(50 * scale);
  const effectiveHeight =
    canvas.height > pageH && canvas.height <= singlePageThreshold ? pageH : canvas.height;
  const pages = Math.max(1, Math.ceil((effectiveHeight - 2) / pageH));

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
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, A4_MM.w, A4_MM.h);
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
