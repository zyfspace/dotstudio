'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { DocActionButton } from '@/components/DocActionButton';
import { PaidStamp } from '@/components/PaidStamp';
import { dt, isRecurringBilling, getBillingTypeDocLabel, invoiceFilename } from '@/lib/formatters';
import { useA4Fit } from '@/lib/useA4Fit';

/**
 * English version of DocView (invoice + quotation), shown when the project or
 * quotation was created with lang 'en'. Same layout and data as the default
 * Indonesian document; only the static copy, number grouping and the stored
 * "Syarat pembayaran" prefix differ. Keep both files in step when the layout
 * changes.
 */

const money = (n: number) => `Rp${n.toLocaleString('en-US')}`;

const billingLabelEn = (type?: string) =>
  getBillingTypeDocLabel(type)
    .replace(/Tahunan/i, 'Yearly')
    .replace(/Mingguan/i, 'Weekly')
    .replace(/Bulanan/i, 'Monthly')
    .replace(/Kuartal/i, 'Quarterly');

const termEn = (t: string) => t.replace(/^Syarat pembayaran:/i, 'Payment terms:');

export function DocViewEn() {
  const page = useA4Fit();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    docState,
    setDocState,
    projects,
    quotes,
    setQuotes,
    getClient,
    studioProfile,
    formatInvoiceNo,
    formatQuoteNo,
    handleConvertQuoteToProject,
    handleDeleteQuote,
    handleStartEditQuote,
    handleStartEditProject,
    setActiveProjectDrawerId,
  } = useDashboard();

  // Read URL search params for direct links or refreshes
  const tParam = searchParams?.get('t') as 'inv' | 'quo' | null;
  const aParam = searchParams?.get('a') ? Number(searchParams.get('a')) : null;
  const bParam = searchParams?.get('b') ? Number(searchParams.get('b')) : undefined;

  const currentDoc =
    docState || (tParam && aParam ? { t: tParam, a: aParam, b: bParam } : null);

  useEffect(() => {
    if (!docState && tParam && aParam) {
      setDocState({ t: tParam, a: aParam, b: bParam });
    }
  }, [docState, tParam, aParam, bParam, setDocState]);

  if (!currentDoc) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          No document selected
        </h2>
        <p style={{ color: 'var(--mut)', marginBottom: '20px', fontSize: '14px' }}>
          Please select an invoice or quotation from the dashboard.
        </p>
        <button className="btn pri" onClick={() => router.push('/dashboard')}>
          Back to Overview
        </button>
      </div>
    );
  }

  const isInvoice = currentDoc.t === 'inv';

  if (isInvoice) {
    const p = projects.find((x) => x.id === currentDoc.a);
    const i = p?.plan.find((x) => x.id === currentDoc.b);
    if (!p || !i || !i.inv) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            Invoice not found
          </h2>
          <p style={{ color: 'var(--mut)', marginBottom: '20px', fontSize: '14px' }}>
            The requested invoice could not be found or has been removed.
          </p>
          <button className="btn pri" onClick={() => router.push('/dashboard/invoices')}>
            Back to Invoices
          </button>
        </div>
      );
    }

    const c = getClient(p.c);
    const relatedQuote = quotes.find(
      (x) => x.pid === p.id || (x.cn && x.cn === c.name) || (x.title && x.title === p.name)
    );
    const brandName = relatedQuote?.senderName || studioProfile.studioName || 'Studio';
    const brandTagline = relatedQuote?.senderTagline || studioProfile.tagline || '';
    const brandEmail = relatedQuote?.senderEmail || studioProfile.email || '';
    const brandPhone = relatedQuote?.senderPhone || studioProfile.phone || '';

    return (
      <div>
        <div className="top doc-top noprint">
          <button
            className="ib"
            id="bk"
            onClick={() => router.push('/dashboard/invoices')}
            aria-label="Back"
          >
            <Icon name="back" size={18} />
          </button>
          <h1><span className="doc-kind">Invoice </span>{formatInvoiceNo(i.inv.no, i.inv.date)}</h1>
          <span className="doc-top-break" aria-hidden="true" />
          {!i.paid && (
            <button
              className="btn doc-icon-btn"
              id="edit-invoice"
              onClick={() => handleStartEditProject(p.id)}
              title="Edit invoice"
              aria-label="Edit invoice"
            >
              <Icon name="edit" size={14} />
              <span className="btn-label">Edit invoice</span>
            </button>
          )}
          <DocActionButton
            filename={invoiceFilename(
              c.co || c.name || '',
              formatInvoiceNo(i.inv.no, i.inv.date),
              p.plan.map((x) => x.l),
              p.plan.findIndex((x) => x.id === i.id)
            )}
          />
        </div>

        <div className="docx-paper docx-a4" ref={page.ref} style={page.style}>
          <div className="docx-body-content">
            {/* Header */}
            <div className="docx-header-grid">
              <div>
                <div className="docx-h-title">Invoice</div>
                <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                  Invoice No. {formatInvoiceNo(i.inv.no, i.inv.date)}
                </div>
                <div className="docx-h-sub">Invoice Date: {dt(i.inv.date)}</div>
                <div className="docx-h-sub">Due Date: {i.due ? dt(i.due) : '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="docx-h-title">
                  {brandName || (
                    <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>
                      [Studio Name Not Set]
                    </span>
                  )}
                </div>
                {brandTagline && (
                  <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                    {brandTagline}
                  </div>
                )}
                {(brandEmail || brandPhone) && (
                  <div className="docx-h-sub">
                    {brandEmail}
                    {brandPhone ? (brandEmail ? ` · ${brandPhone}` : brandPhone) : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Recipient & Sender Meta Box */}
            <div className="docx-meta-grid">
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <b>To:</b> {c.name} {c.co ? `(${c.co})` : ''}
                </div>
                <div>
                  <b>Subject:</b> Invoice {p.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>
                  <b>From:</b>{' '}
                  {brandName || (
                    <span style={{ color: '#888', fontStyle: 'italic' }}>
                      [Set in Settings]
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 1: Scope of Work */}
            <div className="docx-sec-title">Scope of Work</div>
            <ol className="docx-list">
              {(() => {
                const rawLines = p.desc
                  ? p.desc
                      .split('\n')
                      .map((s) => s.trim().replace(/^[-*•\d.]+\s*/, ''))
                      .filter(Boolean)
                  : [];
                const namedItems = (p.items || [])
                  .filter((it) => it.d?.trim())
                  .map((it) => it.d.trim());
                const scopeItems =
                  rawLines.length > 0
                    ? rawLines
                    : namedItems.length > 0
                    ? namedItems
                    : ['Scope of work as agreed'];
                return scopeItems.map((sc, idx) => <li key={idx}>{sc}</li>);
              })()}
            </ol>

            {/* Section 2: Cost Breakdown */}
            <div className="docx-sec-title bold">Cost Breakdown</div>
            <table className="docx-cost-table">
              <thead>
                <tr>
                  <th style={{ width: '52%' }}>Item</th>
                  <th className="c" style={{ width: '24%' }}>
                    Billing Type
                  </th>
                  <th className="c" style={{ width: '24%' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeItems =
                    p.items && p.items.length > 0
                      ? p.items
                      : [{ d: 'Service Item', type: p.billingType || 'One-time', p: p.v }];

                  return activeItems.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        {it.d?.trim() ||
                          (activeItems.length > 1 ? `Service Item ${idx + 1}` : 'Service Item')}
                      </td>
                      <td className="c">{billingLabelEn(it.type || 'One-time')}</td>
                      <td className="c" style={{ fontWeight: 700 }}>
                        {money(+it.p || 0)}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            {/* Payment Method & Calculation Summary Box */}
            <div className="docx-payment-summary-grid">
              <div className="docx-payment-method-box">
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Payment Method</div>
                {studioProfile.bankName || studioProfile.accountNumber ? (
                  <>
                    <div>
                      <b>Bank:</b> {studioProfile.bankName || '—'}
                    </div>
                    <div>
                      <b>Account Number:</b> {studioProfile.accountNumber || '—'}
                    </div>
                    <div>
                      <b>Account Holder:</b>{' '}
                      {studioProfile.accountHolder ||
                        studioProfile.ownerName ||
                        brandName ||
                        '—'}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      color: '#71717a',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      lineHeight: 1.4,
                      marginTop: '4px',
                    }}
                  >
                    Payment method not yet set in Settings.
                  </div>
                )}
              </div>
              {(() => {
                const itemIndex = p.plan.findIndex((x) => x.id === i.id);
                const priorInstallments = p.plan.slice(0, itemIndex > 0 ? itemIndex : 0);
                const priorAmount = priorInstallments.reduce((acc, curr) => acc + curr.a, 0);

                return (
                  <div className="docx-calc-box">
                    <div className="docx-calc-row">
                      <span>Sub-total</span>
                      <span>{money(p.v)}</span>
                    </div>
                    {itemIndex === 0 && i.pct < 100 && (
                      <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                        <span>
                          {i.l || 'Down Payment'} ({i.pct}%)
                        </span>
                        <span>{money(i.a)}</span>
                      </div>
                    )}
                    {itemIndex > 0 && priorAmount > 0 && (
                      <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                        <span>Paid / Down Payment</span>
                        <span>-{money(priorAmount)}</span>
                      </div>
                    )}
                    <div className="docx-calc-total">
                      <span>Amount Due</span>
                      <span>{money(i.a)}</span>
                    </div>
                    {i.paid && <PaidStamp date={i.pd ? dt(i.pd) : undefined} />}
                  </div>
                );
              })()}
            </div>

            {/* Section: Notes and Terms */}
            <div className="docx-sec-title">Notes and Terms</div>
            <ol className="docx-list">
              <li>
                The current payment is{' '}
                <b>
                  {i.l}
                  {i.pct > 0 ? ` (${i.pct}%)` : ''}
                </b>{' '}
                in the amount of <b>{money(i.a)}</b> for the <b>{p.name}</b> service.
              </li>
              <li>Payment is due on {dt(i.due)}.</li>
            </ol>
          </div>

          {/* Footer Wrap at bottom of page */}
          <div className="docx-footer-wrap">
            <div className="docx-footer">
              <div style={{ marginBottom: '16px' }}>Thank you for your trust.</div>
              <div>Sincerely,</div>
              <div style={{ height: '36px' }} />
              <div style={{ fontWeight: 700 }}>
                {brandName || (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>
                    [Studio Name / Brand]
                  </span>
                )}
              </div>
              {brandTagline && <div style={{ fontSize: '13px' }}>{brandTagline}</div>}
            </div>

            {/* Studio watermark; a paid invoice carries the paid stamp instead */}
            {!i.paid && <DocumentWatermark />}
          </div>
        </div>
      </div>
    );
  }

  // Quotation View
  const q = quotes.find((x) => x.id === currentDoc.a);
  if (!q) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          Quotation not found
        </h2>
        <p style={{ color: 'var(--mut)', marginBottom: '20px', fontSize: '14px' }}>
          The requested quotation could not be found or has been removed.
        </p>
        <button className="btn pri" onClick={() => router.push('/dashboard/invoices')}>
          Back to Quotations
        </button>
      </div>
    );
  }

  const qSenderName = q.senderName
    ? q.senderName.split('(')[0]?.trim()
    : studioProfile.studioName || 'Studio';
  const qSenderTagline = q.senderTagline || studioProfile.tagline || '';
  const qSenderEmail = q.senderEmail || studioProfile.email || '';
  const qSenderPhone = q.senderPhone || studioProfile.phone || '';

  return (
    <div>
      <div className="top doc-top noprint">
        <button
          className="ib"
          id="bk"
          onClick={() => router.push('/dashboard/invoices')}
          aria-label="Back"
        >
          <Icon name="back" size={18} />
        </button>
        <h1><span className="doc-kind">Quotation </span>{formatQuoteNo(q.no, q.date, qSenderName)}</h1>
        <span className="doc-top-break" aria-hidden="true" />

        {q.pid > 0 && projects.some((p) => p.id === q.pid) ? (
          <button
            className="btn"
            id="view-proj"
            onClick={() => {
              setActiveProjectDrawerId(q.pid);
              router.push('/dashboard/projects');
            }}
          >
            <Icon name="folder" size={14} />
            <span className="btn-label">Project: {projects.find((p) => p.id === q.pid)?.name}</span>
          </button>
        ) : (
          q.s !== 'Accepted' && (
            <button
              className="btn"
              id="cv"
              onClick={() => handleConvertQuoteToProject(q)}
            >
              <span className="pt-long">Convert to project</span>
              <span className="pt-short">To project</span>
            </button>
          )
        )}

        {q.s === 'Draft' && !q.pid && (
          <button
            className="btn doc-icon-btn"
            id="edit-quote"
            onClick={() => handleStartEditQuote(q.id)}
            title="Edit quotation"
            aria-label="Edit quotation"
          >
            <Icon name="edit" size={14} />
            <span className="btn-label">Edit quotation</span>
          </button>
        )}

        {q.s === 'Draft' && (
          <button
            className="btn"
            id="sn"
            onClick={() => {
              setQuotes((prev) =>
                prev.map((item) => (item.id === q.id ? { ...item, s: 'Sent' } : item))
              );
            }}
          >
            <span className="pt-long">Mark as sent</span>
            <span className="pt-short">Mark sent</span>
          </button>
        )}

        <DocActionButton filename={`Quotation ${formatQuoteNo(q.no, q.date, qSenderName)}`} />

        <button
          className="btn danger doc-icon-btn"
          id="del-quote"
          onClick={() => {
            handleDeleteQuote(q.id);
            router.push('/dashboard/invoices');
          }}
          title="Delete quotation"
          aria-label="Delete quotation"
        >
          <Icon name="trash" />
          <span className="btn-label">Delete</span>
        </button>
      </div>

      <div className="docx-paper docx-a4" ref={page.ref} style={page.style}>
        <div className="docx-body-content">
          {/* Header */}
          <div className="docx-header-grid">
            <div>
              <div className="docx-h-title">Quotation</div>
              <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                Quotation No. {formatQuoteNo(q.no, q.date, qSenderName)}
              </div>
              <div className="docx-h-sub">Valid until {dt(q.valid)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="docx-h-title">
                {qSenderName || (
                  <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>
                    [Studio Name Not Set]
                  </span>
                )}
              </div>
              {qSenderTagline && (
                <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                  {qSenderTagline}
                </div>
              )}
              {(qSenderEmail || qSenderPhone) && (
                <div className="docx-h-sub">
                  {qSenderEmail}
                  {qSenderPhone ? (qSenderEmail ? ` · ${qSenderPhone}` : qSenderPhone) : ''}
                </div>
              )}
            </div>
          </div>

          {/* Recipient & Sender Meta Box */}
          <div className="docx-meta-grid">
            <div>
              <div style={{ marginBottom: '4px' }}>
                <b>To:</b> {q.cn} {q.co ? `(${q.co})` : ''}
              </div>
              <div>
                <b>Subject:</b> Quotation {q.title}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>
                <b>From:</b>{' '}
                {qSenderName || (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>
                    [Set in Settings]
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Scope of Work */}
          <div className="docx-sec-title">Scope of Work</div>
          <ol className="docx-list">
            {(q.scope && q.scope.filter((s) => s?.trim()).length > 0
              ? q.scope.filter((s) => s?.trim())
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
              {(q.items || []).map((it, idx) => (
                <tr key={idx}>
                  <td>
                    {it.d}
                    {it.q && it.q > 1 ? ` (${it.q}x)` : ''}
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
                const oneTimeItems = (q.items || []).filter((it) => !isRecurringBilling(it.type));
                const recurringItems = (q.items || []).filter((it) => isRecurringBilling(it.type));
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
          {q.services && q.services.length > 0 && (
            <>
              <div className="docx-sec-title">Services Included</div>
              <ol className="docx-list">
                {q.services.map((sv, idx) => (
                  <li key={idx}>{sv}</li>
                ))}
              </ol>
            </>
          )}

          {/* Section 4: Terms & Conditions */}
          <div className="docx-sec-title">Terms &amp; Conditions</div>
          <ol className="docx-list">
            {(() => {
              const activeTerms = (q.terms || []).filter((t) => t?.trim());
              const hasValidity = activeTerms.some((t) => /berlaku|valid/i.test(t));
              if (activeTerms.length > 0) {
                return (
                  <>
                    {activeTerms.map((t, idx) => (
                      <li key={idx}>{termEn(t)}</li>
                    ))}
                    {!hasValidity && (
                      <li>
                        This quotation is valid for {q.validDays || 7} days from the date it is sent.
                      </li>
                    )}
                  </>
                );
              }
              return (
                <>
                  {q.note && <li>{q.note}</li>}
                  {q.paymentTerms && (
                    <li>
                      <b>Payment terms: {q.paymentTerms}</b>
                    </li>
                  )}
                  <li>
                    This quotation is valid for {q.validDays || 7} days from the date it is sent.
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
            <div style={{ fontWeight: 700 }}>{qSenderName}</div>
            {qSenderTagline && <div style={{ fontSize: '13px' }}>{qSenderTagline}</div>}
          </div>

          {/* Studio Subtle Bottom Watermark */}
          <DocumentWatermark />
        </div>
      </div>
    </div>
  );
}
