'use client';

import React, { useEffect, useState } from 'react';
import { useDashboard } from '../DashboardContext';
import { Icon } from '@/components/Icons';
import { IncomeChart } from '@/components/IncomeChart';
import { CountUp } from '@/components/CountUp';
import { sh, dt, isOverdue, today } from '@/lib/formatters';

// Panel whose body folds open/closed; state is remembered per panel
function CollapsiblePanel({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const storageKey = `ov-panel-${id}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === '1') setOpen(true);
    } catch {}
  }, [storageKey]);

  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(storageKey, o ? '0' : '1');
      } catch {}
      return !o;
    });
  };

  return (
    <div className={`panel panel-collapsible${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="panel-toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`${storageKey}-body`}
      >
        <h3>{title}</h3>
        <Icon name="chevron" size={16} className="panel-chevron" />
      </button>
      <div className="panel-body" id={`${storageKey}-body`} inert={!open}>
        <div className="panel-body-inner">{children}</div>
      </div>
    </div>
  );
}

export function OverviewView() {
  const {
    isProfileComplete,
    handleOpenSettingsToCompleteProfile,
    overviewMetrics,
    chartMode,
    projects,
    paidPayments,
    setChartMode,
    chartSelectedMonth,
    setChartSelectedMonth,
    chartCustomRange,
    setChartCustomRange,
    chartCustomRangePreset,
    setChartCustomRangePreset,
    getClient,
    setActiveProjectDrawerId,
    getProjectPct,
    openDoc,
    handleStartNewProject,
    isPrivacyOn,
    togglePrivacy,
  } = useDashboard();

  // Bumped by the chart's refresh button to replay the stat count-up
  const [statReplay, setStatReplay] = useState(0);

  return (
    <div>
      <div className="top">
        <h1>Overview</h1>
        <button
          type="button"
          className="ib"
          onClick={togglePrivacy}
          aria-pressed={isPrivacyOn}
          aria-label={isPrivacyOn ? 'Show sensitive data' : 'Hide sensitive data'}
          title={isPrivacyOn ? 'Show sensitive data' : 'Hide sensitive data'}
        >
          <Icon name={isPrivacyOn ? 'eyeoff' : 'eye'} size={16} />
        </button>
        <button
          className="btn pri"
          id="add"
          onClick={() => handleStartNewProject()}
        >
          <Icon name="plus" />
          New project
        </button>
      </div>

      {!isProfileComplete && (
        <div className="profile-setup-banner">
          <div className="profile-setup-icon">
            <Icon name="settings" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--fg)' }}>
              Complete Studio Profile &amp; Bank Details
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--mut)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Set up your studio name, contact info, and bank account in Settings to generate official invoices and quotations.
            </p>
          </div>
          <button
            className="btn sm pri"
            onClick={handleOpenSettingsToCompleteProfile}
          >
            <Icon name="settings" size={14} style={{ marginRight: '4px' }} />
            Set up now
          </button>
        </div>
      )}

      {/* Stats 4-cols */}
      <div className="stats">
        <div className="stat">
          <div className="stat-info">
            <span>Total projects</span>
            <b><CountUp value={overviewMetrics.totalProjects} replayKey={statReplay} /></b>
          </div>
          <div className="stat-icon">
            <Icon name="briefcase" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-info">
            <span>Total revenue</span>
            <b className="pv"><CountUp value={overviewMetrics.totalReceived} format={sh} replayKey={statReplay} /></b>
          </div>
          <div className="stat-icon">
            <Icon name="coins" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-info">
            <span>Outstanding</span>
            <b className="pv"><CountUp value={overviewMetrics.totalOutstanding} format={sh} replayKey={statReplay} /></b>
          </div>
          <div className="stat-icon">
            <Icon name="clock" size={18} />
          </div>
        </div>
        <div className="stat">
          <div className="stat-info">
            <div className="stat-label-wrap">
              <span>
                {chartMode === '6m'
                  ? '6 months'
                  : chartMode === 'month'
                    ? (chartSelectedMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
                        ? 'This month'
                        : 'Selected month')
                    : 'Period value'}
              </span>
              <div className="stat-help-btn" tabIndex={0} role="note" aria-label="Deal value">
                <Icon name="help" size={13} />
                <div className="stat-tooltip">
                  {chartMode === '6m'
                    ? 'Total contract deal value across the last 6 months.'
                    : 'Total deal value for the selected period.'}
                </div>
              </div>
            </div>
            <b className="pv"><CountUp value={overviewMetrics.thisMonthVal} format={sh} replayKey={statReplay} /></b>
          </div>
          <div className="stat-icon">
            <Icon name="cal" size={18} />
          </div>
        </div>
      </div>

      {/* Middle Cols */}
      <div className="cols">
        {/* Income chart */}
        <IncomeChart
          projects={projects}
          paidPayments={paidPayments}
          mode={chartMode}
          onModeChange={setChartMode}
          selectedMonth={chartSelectedMonth}
          onSelectedMonthChange={setChartSelectedMonth}
          customRange={chartCustomRange}
          onCustomRangeChange={setChartCustomRange}
          customRangePreset={chartCustomRangePreset}
          onCustomRangePresetChange={setChartCustomRangePreset}
          onRefresh={() => setStatReplay((k) => k + 1)}
        />

        {/* Upcoming payments */}
        <div className="panel">
          <h3>Upcoming payments</h3>
          {overviewMetrics.upcoming.length > 0 ? (
            overviewMetrics.upcoming.map((x) => {
              const c = getClient(x.p.c);
              const overdue = isOverdue(x.i.due, x.i.paid);
              return (
                <div
                  key={x.i.id}
                  className="lr"
                  onClick={() => setActiveProjectDrawerId(x.p.id)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span className="pv" style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '13.5px' }}>{x.p.name}</span>
                    <b className="pv" style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: 'var(--fg)', flexShrink: 0 }}>{sh(x.i.a)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span className="mut pv">{c.name || '—'}</span>
                    <span className={overdue ? 'od' : 'mut'} style={{ flexShrink: 0 }}>
                      {overdue ? 'overdue ' : 'due '}
                      {dt(x.i.due)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="mut">All settled.</div>
          )}
        </div>
      </div>

      {/* Bottom Cols */}
      <div className="cols cols-collapsible">
        {/* Active projects */}
        <CollapsiblePanel id="active-projects" title="Active projects">
          {overviewMetrics.activeProjs.length > 0 ? (
            overviewMetrics.activeProjs.map((x) => {
              const { p, n } = x;
              const c = getClient(p.c);
              const progress = getProjectPct(p);
              const overdue = n ? isOverdue(n.due, n.paid) : false;
              return (
                <div
                  key={p.id}
                  className="lr project-lr-item"
                  onClick={() => setActiveProjectDrawerId(p.id)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}
                >
                  {/* Line 1: Title and Value */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span className="pv" style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '13.5px' }}>{p.name}</span>
                    <b className="pv" style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: 'var(--fg)', flexShrink: 0 }}>{sh(p.v)}</b>
                  </div>

                  {/* Line 2: Client name on left, Next due date on right */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span className="mut pv" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name || '—'}
                    </span>
                    {n && (
                      <span className={overdue ? 'od' : 'mut'} style={{ flexShrink: 0 }}>
                        {n.l} · {overdue ? 'overdue ' : 'due '}
                        {dt(n.due).replace(/ \d{4}$/, '')}
                      </span>
                    )}
                  </div>

                  {/* Line 3: Full-width progress track */}
                  <div className="pg" style={{ marginTop: '2px' }}>
                    <div className="prog" style={{ height: '4px' }}>
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span className="mut" style={{ fontSize: '11.5px', fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="mut">No active projects.</div>
          )}
        </CollapsiblePanel>

        {/* Open quotations */}
        <CollapsiblePanel id="open-quotations" title="Open quotations">
          {overviewMetrics.openQuotes.length > 0 ? (
            overviewMetrics.openQuotes.map((x) => {
              const expired = x.valid && x.valid < today();
              const quoteTotal = x.items.reduce(
                (acc, curr) => acc + curr.q * curr.p,
                0
              );
              return (
                <div
                  key={x.id}
                  className="lr"
                  onClick={() => openDoc('quo', x.id)}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'stretch' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span className="pv" style={{ fontWeight: 500, color: 'var(--fg)', fontSize: '13.5px' }}>{x.title}</span>
                    <b className="pv" style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13.5px', color: 'var(--fg)', flexShrink: 0 }}>{sh(quoteTotal)}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span className="mut">
                      <span className="pv">{x.cn || '—'}</span> · <span style={{ textTransform: 'capitalize' }}>{x.s}</span>
                    </span>
                    <span className={expired ? 'od' : 'mut'} style={{ flexShrink: 0 }}>
                      {expired ? 'expired ' : 'until '}
                      {dt(x.valid).replace(/ \d{4}$/, '')}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="mut">No open quotations.</div>
          )}
        </CollapsiblePanel>
      </div>
    </div>
  );
}
