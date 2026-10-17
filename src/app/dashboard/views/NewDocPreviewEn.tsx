'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { dt, today, isRecurringBilling, getBillingTypeDocLabel } from '@/lib/formatters';

/**
 * English live previews for +New Project (invoice) and +New Quotation. They
 * mirror the Indonesian previews in NewProjectView / NewQuoteView and the saved
 * document in DocViewEn, so keep them in step when the layout changes.
 */

const money = (n: number) => `Rp${n.toLocaleString('en-US')}`;

const billingLabelEn = (type?: string) =>
  getBillingTypeDocLabel(type)
    .replace(/Tahunan/i, 'Yearly')
    .replace(/Mingguan/i, 'Weekly')
    .replace(/Bulanan/i, 'Monthly')
    .replace(/Kuartal/i, 'Quarterly');

const termEn = (t: string) => t.replace(/^Syarat pembayaran:/i, 'Payment terms:');

export function NewInvoicePreviewEn() {
  const { newProjectData, studioProfile, getNextInvoiceNo } = useDashboard();

  const firstPay = Math.round(
    ((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 100)) / 100
  );

  return (
    <div className="docx-paper docx-a4">
      <div className="docx-body-content">
        {/* Header */}
        <div className="docx-header-grid">
          <div>
            <div className="docx-h-title">Invoice</div>
            <div className="docx-h-sub" style={{ marginTop: '4px' }}>
              Invoice No. {getNextInvoiceNo(newProjectData.invoiceDate || today())} (Draft)
            </div>
            <div className="docx-h-sub">Invoice Date: {dt(newProjectData.invoiceDate || today())}</div>
            <div className="docx-h-sub">
              Due Date: {newProjectData.plan[0]?.due ? dt(newProjectData.plan[0].due) : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="docx-h-title">
              {studioProfile.studioName || <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>[Studio Name Not Set]</span>}
            </div>
            {studioProfile.tagline && <div className="docx-h-sub" style={{ marginTop: '4px' }}>{studioProfile.tagline}</div>}
            {(studioProfile.email || studioProfile.phone) && (
              <div className="docx-h-sub">
                {studioProfile.email}
                {studioProfile.phone ? (studioProfile.email ? ` · ${studioProfile.phone}` : studioProfile.phone) : ''}
              </div>
            )}
          </div>
        </div>

        {/* Recipient & Sender Meta Box */}
        <div className="docx-meta-grid">
          <div>
            <div style={{ marginBottom: '4px' }}>
              <b>To:</b> {newProjectData.cn || 'Client Name'} {newProjectData.co ? `(${newProjectData.co})` : ''}
            </div>
            <div>
              <b>Subject:</b> Invoice {newProjectData.name || 'Project Service'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>
              <b>From:</b> {studioProfile.studioName || <span style={{ color: '#888', fontStyle: 'italic' }}>[Set in Settings]</span>}
            </div>
          </div>
        </div>

        {/* Section 1: Scope of Work */}
        <div className="docx-sec-title">Scope of Work</div>
        <ol className="docx-list">
          {(() => {
            const rawLines = newProjectData.desc
              ? newProjectData.desc
                .split('\n')
                .map((s) => s.trim().replace(/^[-*•\d.]+\s*/, ''))
                .filter(Boolean)
              : [];
            const namedItems = newProjectData.items.filter((it) => it.d.trim()).map((it) => it.d.trim());
            const scopeItems = rawLines.length > 0
              ? rawLines
              : namedItems.length > 0
                ? namedItems
                : ['Scope of work as agreed'];
            return scopeItems.map((sc, idx) => (
              <li key={idx}>{sc}</li>
            ));
          })()}
        </ol>

        {/* Section 2: Cost Breakdown */}
        <div className="docx-sec-title bold">Cost Breakdown</div>
        <table className="docx-cost-table">
          <thead>
            <tr>
              <th style={{ width: '52%' }}>Item</th>
              <th className="c" style={{ width: '24%' }}>Billing Type</th>
              <th className="c" style={{ width: '24%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {newProjectData.items.map((it, idx) => (
              <tr key={idx}>
                <td>{it.d.trim() || (newProjectData.items.length > 1 ? `Service Item ${idx + 1}` : 'Service Item')}</td>
                <td className="c">{billingLabelEn(it.type || 'One-time')}</td>
                <td className="c" style={{ fontWeight: 700 }}>
                  {money(+it.p || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Payment Method & Summary Grid */}
        <div className="docx-payment-summary-grid">
          <div className="docx-payment-method-box">
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Payment Method</div>
            {studioProfile.bankName || studioProfile.accountNumber ? (
              <>
                <div><b>Bank:</b> {studioProfile.bankName || '—'}</div>
                <div><b>Account Number:</b> {studioProfile.accountNumber || '—'}</div>
                <div><b>Account Holder:</b> {studioProfile.accountHolder || studioProfile.ownerName || studioProfile.studioName || '—'}</div>
              </>
            ) : (
              <div style={{ color: '#71717a', fontSize: '12px', fontStyle: 'italic', lineHeight: 1.4, marginTop: '4px' }}>
                Payment method not set in Settings.
              </div>
            )}
          </div>
          <div className="docx-calc-box">
            <div className="docx-calc-row">
              <span>Sub-total</span>
              <span>{money(+newProjectData.v || 0)}</span>
            </div>
            {newProjectData.plan.length > 1 && (+newProjectData.plan[0]?.pct || 0) < 100 && (
              <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                <span>{newProjectData.plan[0]?.l || 'Down Payment'} ({newProjectData.plan[0]?.pct || 50}%)</span>
                <span>
                  {money(Math.round(((+newProjectData.v || 0) * (+newProjectData.plan[0]?.pct || 50)) / 100))}
                </span>
              </div>
            )}
            <div className="docx-calc-total">
              <span>Amount Due</span>
              <span>{money(firstPay)}</span>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        <div className="docx-sec-title">Notes and Terms</div>
        <ol className="docx-list">
          <li>
            The current payment is <b>{newProjectData.plan[0]?.l || 'Installment 1'} ({newProjectData.plan[0]?.pct || 100}%)</b> in the amount of <b>{money(firstPay)}</b> for the <b>{newProjectData.name || 'Project'}</b> service.
          </li>
          <li>
            Payment is due on {newProjectData.plan[0]?.due ? dt(newProjectData.plan[0].due) : (newProjectData.due ? dt(newProjectData.due) : 'as agreed')}.
          </li>
        </ol>
      </div>

      {/* Footer Wrap at bottom of page */}
      <div className="docx-footer-wrap">
        <div className="docx-footer">
          <div style={{ marginBottom: '16px' }}>Thank you for your trust.</div>
          <div>Sincerely,</div>
          <div style={{ height: '36px' }} />
          <div style={{ fontWeight: 700 }}>
            {studioProfile.studioName || <span style={{ color: '#888', fontStyle: 'italic' }}>[Studio Name / Brand]</span>}
          </div>
          {studioProfile.tagline && <div style={{ fontSize: '13px' }}>{studioProfile.tagline}</div>}
        </div>

        {/* Subtle Watermark */}
        <DocumentWatermark />
      </div>
    </div>
  );
}

export function NewQuotePreviewEn() {
  const { newQuoteData, studioProfile, quotes, editingQuoteId, getNextQuoteNo, formatQuoteNo } =
    useDashboard();
  const existingQuote = editingQuoteId ? quotes.find((q) => q.id === editingQuoteId) : null;

  return (
    <div className="docx-paper docx-a4">
      <div className="docx-body-content">
        {/* Header */}
        <div className="docx-header-grid">
          <div>
            <div className="docx-h-title">Quotation</div>
            <div className="docx-h-sub" style={{ marginTop: '4px' }}>
              Quotation No. {existingQuote ? formatQuoteNo(existingQuote.no, newQuoteData.date, newQuoteData.senderName) : getNextQuoteNo(newQuoteData.date)} (Draft)
            </div>
            <div className="docx-h-sub">
              Valid until {newQuoteData.valid ? dt(newQuoteData.valid) : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="docx-h-title">
              {newQuoteData.senderName || studioProfile.studioName || (
                <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>
                  [Studio Name Not Set]
                </span>
              )}
            </div>
            {(newQuoteData.senderTagline || studioProfile.tagline) && (
              <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                {newQuoteData.senderTagline || studioProfile.tagline}
              </div>
            )}
            {(newQuoteData.senderEmail ||
              studioProfile.email ||
              newQuoteData.senderPhone ||
              studioProfile.phone) && (
              <div className="docx-h-sub">
                {newQuoteData.senderEmail || studioProfile.email}
                {newQuoteData.senderPhone || studioProfile.phone
                  ? ` · ${newQuoteData.senderPhone || studioProfile.phone}`
                  : ''}
              </div>
            )}
          </div>
        </div>

        {/* Recipient & Sender Meta Box */}
        <div className="docx-meta-grid">
          <div>
            <div style={{ marginBottom: '4px' }}>
              <b>To:</b> {newQuoteData.cn || 'Client Name'}{' '}
              {newQuoteData.co ? `(${newQuoteData.co})` : ''}
            </div>
            <div>
              <b>Subject:</b> Quotation {newQuoteData.title || 'Project Service'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>
              <b>From:</b>{' '}
              {newQuoteData.senderName || studioProfile.studioName || (
                <span style={{ color: '#888', fontStyle: 'italic' }}>
                  [Set in Settings]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Scope */}
        <div className="docx-sec-title">Scope of Work</div>
        <ol className="docx-list">
          {(newQuoteData.scope.filter((s) => s.trim()).length > 0
            ? newQuoteData.scope.filter((s) => s.trim())
            : ['Scope of work as agreed']
          ).map((sc, idx) => (
            <li key={idx}>{sc}</li>
          ))}
        </ol>

        {/* Section 2: Cost Breakdown */}
        <div className="docx-sec-title bold">Cost Breakdown</div>
        <table className="docx-cost-table">
          <thead>
            <tr>
              <th style={{ width: '46%' }}>Item</th>
              <th className="c" style={{ width: '30%' }}>
                Billing Type
              </th>
              <th className="c" style={{ width: '24%' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {newQuoteData.items.map((it, idx) => (
              <tr key={idx}>
                <td>
                  {it.d || `Service Item ${idx + 1}`}
                  {+it.q > 1 ? ` (${it.q}x)` : ''}
                </td>
                <td className="c">
                  {billingLabelEn(it.type)}
                </td>
                <td className="c" style={{ fontWeight: 700 }}>
                  {money((+it.q || 1) * (+it.p || 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {(() => {
              const oneTimeItems = newQuoteData.items.filter((it) => !isRecurringBilling(it.type));
              const recurringItems = newQuoteData.items.filter((it) => isRecurringBilling(it.type));
              const oneTimeTot = oneTimeItems.reduce(
                (acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0),
                0
              );
              const recurringTot = recurringItems.reduce(
                (acc, curr) => acc + (+curr.q || 1) * (+curr.p || 0),
                0
              );

              if (recurringItems.length > 0 && oneTimeItems.length > 0) {
                return (
                  <>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>
                        Total
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {money(oneTimeTot)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700, color: '#475569' }}>
                        Recurring
                      </td>
                      <td style={{ fontWeight: 700, color: '#475569' }}>
                        {money(recurringTot)} / month
                      </td>
                    </tr>
                  </>
                );
              }

              if (recurringItems.length > 0) {
                return (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>
                      Recurring
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {money(recurringTot)} / month
                    </td>
                  </tr>
                );
              }

              return (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'left', fontWeight: 700 }}>
                    Total
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {money(oneTimeTot)}
                  </td>
                </tr>
              );
            })()}
          </tfoot>
        </table>

        {/* Section 3: Services Included */}
        {newQuoteData.services.filter((s) => s.trim()).length > 0 && (
          <>
            <div className="docx-sec-title">Services Included</div>
            <ol className="docx-list">
              {newQuoteData.services
                .filter((s) => s.trim())
                .map((sv, idx) => (
                  <li key={idx}>{sv}</li>
                ))}
            </ol>
          </>
        )}

        {/* Section 4: Terms & Conditions */}
        <div className="docx-sec-title">Terms &amp; Conditions</div>
        <ol className="docx-list">
          {(() => {
            const activeTerms = (newQuoteData.terms || []).filter((t) => t.trim());
            const hasValidity = activeTerms.some((t) => /berlaku|valid/i.test(t));
            if (activeTerms.length > 0) {
              return (
                <>
                  {activeTerms.map((t, idx) => (
                    <li key={idx}>{termEn(t)}</li>
                  ))}
                  {!hasValidity && (
                    <li>
                      This quotation is valid for {newQuoteData.validDays || 7} days from the date it is sent.
                    </li>
                  )}
                </>
              );
            }
            return (
              <>
                {newQuoteData.paymentTerms && (
                  <li>
                    <b>Payment terms: {newQuoteData.paymentTerms}</b>
                  </li>
                )}
                {newQuoteData.note && <li>{newQuoteData.note}</li>}
                <li>
                  This quotation is valid for {newQuoteData.validDays || 7} days from the date it is sent.
                </li>
              </>
            );
          })()}
        </ol>
      </div>

      {/* Footer Wrap at bottom of page */}
      <div className="docx-footer-wrap">
        <div className="docx-footer">
          <div style={{ marginBottom: '16px' }}>Thank you for your trust.</div>
          <div>Sincerely,</div>
          <div style={{ height: '36px' }} />
          <div style={{ fontWeight: 700 }}>
            {newQuoteData.senderName || studioProfile.studioName || 'Studio'}
          </div>
          {(newQuoteData.senderTagline || studioProfile.tagline) && (
            <div style={{ fontSize: '13px' }}>
              {newQuoteData.senderTagline || studioProfile.tagline}
            </div>
          )}
        </div>

        {/* Studio Subtle Bottom Watermark */}
        <DocumentWatermark />
      </div>
    </div>
  );
}
