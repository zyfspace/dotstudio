'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { DocumentWatermark } from '@/components/DocumentWatermark';
import { dt } from '@/lib/formatters';

export function DocView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    docState,
    setDocState,
    projects,
    quotes,
    setQuotes,
    getClient,
    getProjectPaidAmount,
    studioProfile,
    formatInvoiceNo,
    formatQuoteNo,
    handleConvertQuoteToProject,
    handleDeleteQuote,
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
        <div className="top noprint">
          <button
            className="ib"
            id="bk"
            onClick={() => router.push('/dashboard/invoices')}
            aria-label="Back"
          >
            <Icon name="back" size={18} />
          </button>
          <h1>Invoice {formatInvoiceNo(i.inv.no, i.inv.date)}</h1>
          <button className="btn pri" id="pt" onClick={() => window.print()}>
            <Icon name="print" />
            Print / PDF
          </button>
        </div>

        <div className="docx-paper">
          <div className="docx-body-content">
            {/* Header */}
            <div className="docx-header-grid">
              <div>
                <div className="docx-h-title">Invoice</div>
                <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                  No. Invoice {formatInvoiceNo(i.inv.no, i.inv.date)}
                </div>
                <div className="docx-h-sub">Invoice Date: {dt(i.inv.date)}</div>
                <div className="docx-h-sub">Due Date: {i.due ? dt(i.due) : '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="docx-h-title">
                  {brandName || (
                    <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>
                      [Nama Studio Belum Diatur]
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
                  <b>Kepada:</b> {c.name} {c.co ? `(${c.co})` : ''}
                </div>
                <div>
                  <b>Subject:</b> Invoice {p.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div>
                  <b>Dari:</b>{' '}
                  {brandName || (
                    <span style={{ color: '#888', fontStyle: 'italic' }}>
                      [Atur di Settings]
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 1: Ruang Lingkup Pekerjaan */}
            <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
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
                    : ['Lingkup pekerjaan sesuai kesepakatan'];
                return scopeItems.map((sc, idx) => <li key={idx}>{sc}</li>);
              })()}
            </ol>

            {/* Section 2: Rincian Biaya */}
            <div className="docx-sec-title bold">Rincian Biaya</div>
            <table className="docx-cost-table">
              <thead>
                <tr>
                  <th style={{ width: '52%' }}>Item</th>
                  <th className="c" style={{ width: '24%' }}>
                    Jenis Biaya
                  </th>
                  <th className="c" style={{ width: '24%' }}>
                    Biaya
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeItems =
                    p.items && p.items.length > 0
                      ? p.items
                      : [{ d: 'Item Layanan', type: p.billingType || 'One-time', p: p.v }];

                  return activeItems.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                        {it.d?.trim() ||
                          (activeItems.length > 1 ? `Item Layanan ${idx + 1}` : 'Item Layanan')}
                      </td>
                      <td className="c">{it.type || 'One-time'}</td>
                      <td className="c" style={{ fontWeight: 700 }}>
                        Rp{(+it.p || 0).toLocaleString('id-ID')}
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
                      <span>Rp{p.v.toLocaleString('id-ID')}</span>
                    </div>
                    {itemIndex === 0 && i.pct < 100 && (
                      <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                        <span>
                          {i.l || 'Down Payment'} ({i.pct}%)
                        </span>
                        <span>Rp{i.a.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {itemIndex > 0 && priorAmount > 0 && (
                      <div className="docx-calc-row" style={{ color: '#4b5563' }}>
                        <span>Sudah Dibayar / DP</span>
                        <span>-Rp{priorAmount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="docx-calc-total">
                      <span>Amount Due</span>
                      <span>Rp{i.a.toLocaleString('id-ID')}</span>
                    </div>
                    {i.paid && (
                      <div
                        style={{
                          marginTop: '4px',
                          textAlign: 'right',
                          color: '#16a34a',
                          fontWeight: 600,
                          fontSize: '12px',
                        }}
                      >
                        ✓ PAID (LUNAS) — {dt(i.pd)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Section: Catatan dan Ketentuan */}
            <div className="docx-sec-title">Catatan dan Ketentuan</div>
            <ol className="docx-list">
              <li>
                Pembayaran saat ini adalah{' '}
                <b>
                  {i.l}
                  {i.pct > 0 ? ` (${i.pct}%)` : ''}
                </b>{' '}
                sebesar <b>Rp{i.a.toLocaleString('id-ID')}</b> untuk layanan <b>{p.name}</b>.
              </li>
              <li>Jatuh tempo pembayaran pada {dt(i.due)}.</li>
            </ol>
          </div>

          {/* Footer Wrap at bottom of page */}
          <div className="docx-footer-wrap">
            <div className="docx-footer">
              <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
              <div>Hormat Kami</div>
              <div style={{ height: '36px' }} />
              <div style={{ fontWeight: 700 }}>
                {brandName || (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>
                    [Nama Studio / Brand]
                  </span>
                )}
              </div>
              {brandTagline && <div style={{ fontSize: '13px' }}>{brandTagline}</div>}
            </div>

            {/* Studio Subtle Bottom Watermark */}
            <DocumentWatermark />
          </div>
        </div>
      </div>
    );
  }

  // Quotation View (Zyf.Space Template)
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
        <button className="btn pri" onClick={() => router.push('/dashboard/quotations')}>
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
      <div className="top noprint">
        <button
          className="ib"
          id="bk"
          onClick={() => router.push('/dashboard/quotations')}
          aria-label="Back"
        >
          <Icon name="back" size={18} />
        </button>
        <h1>Quotation {formatQuoteNo(q.no, q.date, qSenderName)}</h1>

        {q.pid > 0 && projects.some((p) => p.id === q.pid) ? (
          <button
            className="btn"
            id="view-proj"
            onClick={() => {
              setActiveProjectDrawerId(q.pid);
              router.push('/dashboard/projects');
            }}
          >
            <Icon name="folder" size={14} style={{ marginRight: '6px' }} />
            Project: {projects.find((p) => p.id === q.pid)?.name}
          </button>
        ) : (
          q.s !== 'Accepted' && (
            <button
              className="btn"
              id="cv"
              onClick={() => handleConvertQuoteToProject(q)}
            >
              Convert to project
            </button>
          )
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
            Mark as sent
          </button>
        )}

        <button className="btn pri" id="pt" onClick={() => window.print()}>
          <Icon name="print" />
          Print / PDF
        </button>

        <button
          className="btn danger"
          id="del-quote"
          onClick={() => {
            handleDeleteQuote(q.id);
            router.push('/dashboard/quotations');
          }}
          title="Delete quotation"
        >
          <Icon name="trash" />
          Delete
        </button>
      </div>

      <div className="docx-paper">
        <div className="docx-body-content">
          {/* Header */}
          <div className="docx-header-grid">
            <div>
              <div className="docx-h-title">Quotation</div>
              <div className="docx-h-sub" style={{ marginTop: '4px' }}>
                No. Quotation {formatQuoteNo(q.no, q.date, qSenderName)}
              </div>
              <div className="docx-h-sub">Valid until {dt(q.valid)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="docx-h-title">
                {qSenderName || (
                  <span style={{ color: '#888', fontStyle: 'italic', fontWeight: 400 }}>
                    [Nama Studio Belum Diatur]
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
                <b>Kepada:</b> {q.cn} {q.co ? `(${q.co})` : ''}
              </div>
              <div>
                <b>Subject:</b> Quotation {q.title}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>
                <b>Dari:</b>{' '}
                {qSenderName || (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>
                    [Atur di Settings]
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Ruang Lingkup Pekerjaan */}
          <div className="docx-sec-title">Ruang Lingkup Pekerjaan (Scope of Work)</div>
          <ol className="docx-list">
            {(q.scope && q.scope.filter((s) => s?.trim()).length > 0
              ? q.scope.filter((s) => s?.trim())
              : ['Lingkup pekerjaan sesuai kesepakatan']
            ).map((sc, idx) => (
              <li key={idx}>{sc}</li>
            ))}
          </ol>

          {/* Section 2: Rincian Biaya */}
          <div className="docx-sec-title bold">Rincian Biaya</div>
          <table className="docx-cost-table">
            <thead>
              <tr>
                <th style={{ width: '52%' }}>Item</th>
                <th className="c" style={{ width: '24%' }}>
                  Jenis Biaya
                </th>
                <th className="c" style={{ width: '24%' }}>
                  Biaya
                </th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.d}</td>
                  <td className="c">{it.type || 'One-time'}</td>
                  <td className="c" style={{ fontWeight: 700 }}>
                    Rp{it.p.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Section 3: Cakupan/Services */}
          {q.services && q.services.length > 0 && (
            <>
              <div className="docx-sec-title">Cakupan/Services</div>
              <ol className="docx-list">
                {q.services.map((sv, idx) => (
                  <li key={idx}>{sv}</li>
                ))}
              </ol>
            </>
          )}

          {/* Section 4: Syarat & Ketentuan */}
          <div className="docx-sec-title">Syarat &amp; Ketentuan</div>
          <ol className="docx-list">
            {q.note && <li>{q.note}</li>}
            {q.paymentTerms && (
              <li>
                <b>Syarat pembayaran: {q.paymentTerms}</b>
              </li>
            )}
            <li>
              Quotation ini berlaku {q.validDays || 7} hari dari tanggal dikirimkan.
            </li>
          </ol>
        </div>

        {/* Footer Wrap at bottom of page */}
        <div className="docx-footer-wrap">
          <div className="docx-footer">
            <div style={{ marginBottom: '16px' }}>Terima kasih atas kepercayaannya.</div>
            <div>Hormat Kami</div>
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
