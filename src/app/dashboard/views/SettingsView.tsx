'use client';

import React from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { AutoTextarea } from '@/components/AutoTextarea';

export function SettingsView() {
  const {
    isSettingsUnlocked,
    handleStartEditSettings,
    handleSaveUnlockedSettings,
    handleCancelEditSettings,
    setPinModalMode,
    setPinError,
    setPinInput,
    setNewPinInput,
    setConfirmPinInput,
    profileDraft,
    setProfileDraft,
    profileSavedFeedback,
  } = useDashboard();

  return (
    <div>
      <div className="top">
        <h1>Settings</h1>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Security Lock Banner */}
          {!isSettingsUnlocked ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--soft)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '12px 16px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', flex: 1 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--mut)',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="lock" size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
                    Settings Locked
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', lineHeight: 1.4 }}>
                    Studio profile and payment details are PIN-protected to prevent accidental changes.
                  </div>
                </div>
              </div>
              <button
                className="btn pri"
                onClick={handleStartEditSettings}
                style={{ height: '32px', fontSize: '12.5px', padding: '0 14px', flexShrink: 0 }}
              >
                <Icon name="lock-open" size={13} style={{ marginRight: '6px' }} />
                Unlock
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(22, 163, 74, 0.08)',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px', flex: 1 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    border: '1px solid rgba(22, 163, 74, 0.3)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#16a34a',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="lock-open" size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>
                    Editing Mode Active
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', lineHeight: 1.4 }}>
                    Update your studio profile or payment details below, then click Save Changes.
                  </div>
                </div>
              </div>
              <button
                className="btn out"
                onClick={() => {
                  setPinError('');
                  setPinInput('');
                  setNewPinInput('');
                  setConfirmPinInput('');
                  setPinModalMode('change');
                }}
                style={{ height: '32px', fontSize: '12px', padding: '0 12px', flexShrink: 0 }}
              >
                <Icon name="key" size={13} style={{ marginRight: '6px' }} />
                Change PIN
              </button>
            </div>
          )}

          {/* Studio / Agency Branding */}
          <div className="panel">
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--fg)', marginBottom: '3px' }}>
              Studio Profile &amp; Branding
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Business identity displayed on invoices, quotations, and official documents.
            </p>

            <div className="two">
              <div className="f">
                <label htmlFor="st-name">Studio / Brand Name</label>
                <input
                  id="st-name"
                  type="text"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="Your studio or brand name"
                  value={profileDraft.studioName}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, studioName: e.target.value }))
                  }
                />
              </div>
              <div className="f">
                <label htmlFor="st-tagline">Tagline / Slogan</label>
                <input
                  id="st-tagline"
                  type="text"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="A short line about what you do"
                  value={profileDraft.tagline}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="two">
              <div className="f">
                <label htmlFor="st-mail">Official Contact Email</label>
                <input
                  id="st-mail"
                  type="email"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="name@yourstudio.com"
                  value={profileDraft.email}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="f">
                <label htmlFor="st-phone">WhatsApp / Phone Number</label>
                <input
                  id="st-phone"
                  type="tel"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="Phone or WhatsApp number"
                  value={profileDraft.phone}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Rekening & Detail Pembayaran Freelancer */}
          <div className="panel">
            <h3 style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--fg)', marginBottom: '3px' }}>
              Bank Account &amp; Payment Terms
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Destination account for invoice payments and default quotation notes.
            </p>

            <div className="two">
              <div className="f">
                <label htmlFor="st-holder">Account Holder Name</label>
                <input
                  id="st-holder"
                  type="text"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="Name on the bank account"
                  value={profileDraft.accountHolder}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, accountHolder: e.target.value }))
                  }
                />
              </div>
              <div className="f">
                <label htmlFor="st-bank">Bank / Payment Method</label>
                <input
                  id="st-bank"
                  type="text"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="Bank name or payment method"
                  value={profileDraft.bankName}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="two">
              <div className="f">
                <label htmlFor="st-num">Account Number</label>
                <input
                  id="st-num"
                  type="text"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="Bank account number"
                  value={profileDraft.accountNumber}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, accountNumber: e.target.value }))
                  }
                />
              </div>
              <div className="f">
                <label htmlFor="st-owner">Owner Full Name (Optional)</label>
                <input
                  id="st-owner"
                  type="text"
                  disabled={!isSettingsUnlocked}
                  className="settings-input"
                  placeholder="Your full name"
                  value={profileDraft.ownerName}
                  onChange={(e) =>
                    setProfileDraft((prev) => ({ ...prev, ownerName: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="f">
              <label htmlFor="st-term-days">Invoice Due (days after invoice date)</label>
              <input
                id="st-term-days"
                type="number"
                min="0"
                disabled={!isSettingsUnlocked}
                className="settings-input"
                placeholder="7"
                value={profileDraft.paymentTermDays ?? 7}
                onWheel={(e) => e.currentTarget.blur()}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.max(0, Math.floor(+e.target.value || 0));
                  setProfileDraft((prev) => ({ ...prev, paymentTermDays: val }));
                }}
              />
            </div>

            <div className="f">
              <label htmlFor="st-terms">Default Payment Terms (Invoice / Quotation)</label>
              <AutoTextarea
                id="st-terms"
                disabled={!isSettingsUnlocked}
                className="settings-input"
                placeholder="e.g. 50% upfront, 50% on completion"
                value={profileDraft.defaultPaymentTerms}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, defaultPaymentTerms: e.target.value }))
                }
              />
            </div>

            <div className="f" style={{ margin: 0 }}>
              <label htmlFor="st-notes">Default Additional Notes</label>
              <AutoTextarea
                id="st-notes"
                disabled={!isSettingsUnlocked}
                className="settings-input"
                placeholder="e.g. This quotation is valid for 14 days"
                value={profileDraft.defaultNotes}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, defaultNotes: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Action Buttons & Feedback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            {isSettingsUnlocked ? (
              <>
                <button
                  className="btn pri"
                  onClick={handleSaveUnlockedSettings}
                >
                  Save Changes
                </button>
                <button
                  className="btn out"
                  onClick={handleCancelEditSettings}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn pri"
                onClick={handleStartEditSettings}
              >
                <Icon name="edit" size={14} style={{ marginRight: '6px' }} />
                Edit Settings
              </button>
            )}
            {profileSavedFeedback && (
              <span style={{ fontSize: '12.5px', color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="check" size={14} /> Settings saved and locked successfully
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
