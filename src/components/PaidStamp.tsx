import React from 'react';

/**
 * "Paid" stamp for settled invoices: the DotStudio wordmark with the paid
 * date under it. Laid out on a 684×178 grid (from the Paper design)
 * and sized through the --s scale in globals.css.
 */
export function PaidStamp({ date }: { date?: string }) {
  const line = date ? `This invoice was PAID - ${date}` : 'This invoice was PAID';
  return (
    <div className="paid-stamp" role="img" aria-label={line}>
      <div className="paid-stamp-logo">
        <div className="paid-stamp-dot" />
        <div className="paid-stamp-word">DotStudio</div>
      </div>
      <div className="paid-stamp-text">{line}</div>
    </div>
  );
}

export default PaidStamp;
