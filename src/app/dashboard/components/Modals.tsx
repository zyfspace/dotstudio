'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { PinInput } from '@/components/PinInput';

export function Modals() {
  const {
    pinModalMode,
    setPinModalMode,
    pinInput,
    setPinInput,
    newPinInput,
    setNewPinInput,
    confirmPinInput,
    setConfirmPinInput,
    pinError,
    setPinError,
    handleVerifyUnlockPin,
    handleSetNewPin,
    handleChangePin,

    previewProof,
    setPreviewProof,

    profileRequiredModal,
    setProfileRequiredModal,
    handleOpenSettingsToCompleteProfile,

    showSchemaModal,
    setShowSchemaModal,
    schemaCopied,
    setSchemaCopied,
  } = useDashboard();

  return (
    <>
      {/* PIN Security Modal */}
      {pinModalMode !== 'none' && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPinModalMode('none');
              setPinError('');
            }
          }}
        >
          <div className="pin-modal-card" role="dialog" aria-modal="true">
            {pinModalMode === 'unlock' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyUnlockPin();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--fg)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="lock" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Enter Security PIN
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0' }}>
                      Enter your 4-digit PIN to unlock settings.
                    </p>
                  </div>
                </div>

                <div className="f" style={{ margin: '4px 0 0' }}>
                  <PinInput
                    value={pinInput}
                    onChange={(val) => {
                      setPinInput(val);
                      if (pinError) setPinError('');
                    }}
                    autoFocus
                    hasError={Boolean(pinError)}
                  />
                  {pinError && (
                    <span style={{ fontSize: '12px', color: 'var(--ac)', marginTop: '6px', textAlign: 'center', display: 'block' }}>
                      {pinError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn out"
                    onClick={() => {
                      setPinModalMode('none');
                      setPinError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn pri">
                    Unlock
                  </button>
                </div>
              </form>
            )}

            {pinModalMode === 'set' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSetNewPin();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--fg)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="key" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Create Security PIN
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0' }}>
                      Set a 4-digit PIN to protect your bank and studio profile.
                    </p>
                  </div>
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '4px', display: 'block' }}>
                    New PIN (4 digits)
                  </label>
                  <PinInput
                    value={newPinInput}
                    onChange={(val) => {
                      setNewPinInput(val);
                      if (pinError) setPinError('');
                    }}
                    autoFocus
                    hasError={Boolean(pinError && newPinInput.length !== 4)}
                  />
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '4px', display: 'block' }}>
                    Confirm New PIN (4 digits)
                  </label>
                  <PinInput
                    value={confirmPinInput}
                    onChange={(val) => {
                      setConfirmPinInput(val);
                      if (pinError) setPinError('');
                    }}
                    hasError={Boolean(pinError)}
                  />
                  {pinError && (
                    <span style={{ fontSize: '12px', color: 'var(--ac)', marginTop: '6px', textAlign: 'center', display: 'block' }}>
                      {pinError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn out"
                    onClick={() => {
                      setPinModalMode('none');
                      setPinError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn pri">
                    Save PIN
                  </button>
                </div>
              </form>
            )}

            {pinModalMode === 'change' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleChangePin();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--soft)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--fg)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="key" size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                      Change Security PIN
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0' }}>
                      Enter your current PIN, then choose a new 4-digit PIN.
                    </p>
                  </div>
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '4px', display: 'block' }}>
                    Current PIN
                  </label>
                  <PinInput
                    value={pinInput}
                    onChange={(val) => {
                      setPinInput(val);
                      if (pinError) setPinError('');
                    }}
                    autoFocus
                    hasError={Boolean(pinError && pinInput.length !== 4)}
                  />
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '4px', display: 'block' }}>
                    New PIN (4 digits)
                  </label>
                  <PinInput
                    value={newPinInput}
                    onChange={(val) => {
                      setNewPinInput(val);
                      if (pinError) setPinError('');
                    }}
                    hasError={Boolean(pinError && newPinInput.length !== 4)}
                  />
                </div>

                <div className="f" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--mut)', marginBottom: '4px', display: 'block' }}>
                    Confirm New PIN
                  </label>
                  <PinInput
                    value={confirmPinInput}
                    onChange={(val) => {
                      setConfirmPinInput(val);
                      if (pinError) setPinError('');
                    }}
                    hasError={Boolean(pinError)}
                  />
                  {pinError && (
                    <span style={{ fontSize: '12px', color: 'var(--ac)', marginTop: '6px', textAlign: 'center', display: 'block' }}>
                      {pinError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn out"
                    onClick={() => {
                      setPinModalMode('none');
                      setPinError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn pri">
                    Update PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Proof Preview Modal */}
      {previewProof && (
        <div
          className="proof-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewProof(null);
            }
          }}
        >
          <div className="proof-modal-card" role="dialog" aria-modal="true" aria-labelledby="proof-modal-title">
            <div className="proof-modal-header">
              <div className="proof-modal-title-wrap">
                <div className="proof-modal-icon">
                  <Icon name="file" size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 id="proof-modal-title" className="proof-modal-title">
                    Payment receipt
                  </h3>
                  <p className="proof-modal-filename" title={previewProof.name}>
                    {previewProof.name}
                  </p>
                </div>
              </div>

              <div className="proof-modal-actions">
                <a
                  href={previewProof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn sm out"
                  title="Open in new tab"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Icon name="external" size={14} />
                  <span className="hide-mobile">New tab</span>
                </a>
                <button
                  type="button"
                  className="btn sm out icon-only"
                  onClick={() => setPreviewProof(null)}
                  aria-label="Close preview"
                  title="Close (Esc)"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>

            <div className="proof-modal-body">
              {(() => {
                const isPdf =
                  previewProof.name.toLowerCase().endsWith('.pdf') ||
                  previewProof.url.toLowerCase().includes('.pdf') ||
                  previewProof.url.startsWith('data:application/pdf');

                if (isPdf) {
                  return (
                    <div className="proof-modal-pdf-container">
                      <iframe
                        src={previewProof.url}
                        title={previewProof.name}
                        className="proof-modal-iframe"
                      />
                    </div>
                  );
                }

                return (
                  <div className="proof-modal-img-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewProof.url}
                      alt={previewProof.name || 'Payment Receipt'}
                      className="proof-modal-img"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="proof-modal-footer">
              <span className="mut" style={{ fontSize: '12px' }}>
                Press Esc or click outside to close
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={previewProof.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewProof.name || 'payment-receipt'}
                  className="btn sm out"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Icon name="download" size={14} />
                  Download
                </a>
                <button
                  type="button"
                  className="btn sm pri"
                  onClick={() => setPreviewProof(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Required Modal */}
      {profileRequiredModal && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setProfileRequiredModal(null);
            }
          }}
        >
          <div className="pin-modal-card" role="dialog" aria-modal="true" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'color-mix(in srgb, var(--ac) 12%, transparent)',
                  border: '1px solid var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--ac)',
                  flexShrink: 0,
                }}
              >
                <Icon name="settings" size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                  Complete studio profile &amp; bank details
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '4px 0 0', lineHeight: 1.45 }}>
                  {profileRequiredModal === 'project'
                    ? 'Before creating a new project, complete your studio profile and bank details in Settings so invoices and documents populate automatically.'
                    : profileRequiredModal === 'invoice'
                      ? 'Before creating an invoice, complete your studio profile and payment bank details in Settings so they appear on the document.'
                      : 'Before creating a quotation, complete your studio profile in Settings so sender details appear on documents.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn out"
                onClick={() => setProfileRequiredModal(null)}
              >
                Maybe later
              </button>
              <button
                type="button"
                className="btn pri"
                onClick={handleOpenSettingsToCompleteProfile}
              >
                <Icon name="settings" size={14} style={{ marginRight: '4px' }} />
                Open settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Schema Modal for 1-Click Database Setup */}
      {showSchemaModal && (
        <div
          className="pin-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSchemaModal(false);
            }
          }}
        >
          <div className="pin-modal-card" role="dialog" aria-modal="true" style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--fg)' }}>
                  Supabase Cloud Setup
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '4px 0 0', lineHeight: 1.45 }}>
                  Run this SQL query once in your Supabase SQL Editor to sync data to the Cloud across all devices.
                </p>
              </div>
              <button
                type="button"
                className="ib"
                onClick={() => setShowSchemaModal(false)}
                aria-label="Close"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div style={{ position: 'relative', background: 'var(--soft)', border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', maxHeight: '220px', overflowY: 'auto', fontSize: '11.5px', fontFamily: 'var(--mono)', lineHeight: 1.5, color: 'var(--fg)' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {`-- Run this in Supabase Dashboard -> SQL Editor -> New Query
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  owner_email TEXT
);

CREATE TABLE IF NOT EXISTS public.projects (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id BIGINT,
  client_name TEXT,
  client_company TEXT,
  value BIGINT NOT NULL,
  billing_type TEXT,
  items JSONB,
  deadline TEXT,
  notes TEXT,
  plan JSONB,
  owner_email TEXT
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id BIGINT PRIMARY KEY,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  client_id BIGINT,
  client_name TEXT,
  client_company TEXT,
  scope JSONB,
  items JSONB,
  services JSONB,
  payment_terms TEXT,
  note TEXT,
  total BIGINT,
  status TEXT,
  valid_until TEXT,
  date TEXT,
  sender_name TEXT,
  sender_tagline TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  owner_email TEXT
);

CREATE TABLE IF NOT EXISTS public.studio_profiles (
  owner_email TEXT PRIMARY KEY,
  profile JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
              <span style={{ fontSize: '12px', color: schemaCopied ? '#16a34a' : 'var(--mut)' }}>
                {schemaCopied ? 'Copied to clipboard!' : 'Open Supabase -> SQL Editor -> Run'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn out sm"
                  onClick={() => {
                    const sql = `-- Supabase Table Setup for Zyf Studio Dashboard
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  owner_email TEXT
);

CREATE TABLE IF NOT EXISTS public.projects (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id BIGINT,
  client_name TEXT,
  client_company TEXT,
  value BIGINT NOT NULL,
  billing_type TEXT,
  items JSONB,
  deadline TEXT,
  notes TEXT,
  plan JSONB,
  owner_email TEXT
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id BIGINT PRIMARY KEY,
  number TEXT NOT NULL,
  title TEXT NOT NULL,
  client_id BIGINT,
  client_name TEXT,
  client_company TEXT,
  scope JSONB,
  items JSONB,
  services JSONB,
  payment_terms TEXT,
  note TEXT,
  total BIGINT,
  status TEXT,
  valid_until TEXT,
  date TEXT,
  sender_name TEXT,
  sender_tagline TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  owner_email TEXT
);

CREATE TABLE IF NOT EXISTS public.studio_profiles (
  owner_email TEXT PRIMARY KEY,
  profile JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);`;
                    navigator.clipboard.writeText(sql);
                    setSchemaCopied(true);
                    setTimeout(() => setSchemaCopied(false), 3000);
                  }}
                >
                  <Icon name="copy" size={13} style={{ marginRight: '4px' }} />
                  {schemaCopied ? 'Copied' : 'Copy SQL'}
                </button>
                <button
                  type="button"
                  className="btn pri sm"
                  onClick={() => setShowSchemaModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
