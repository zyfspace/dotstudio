'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { num, rp, dt, today, ago } from '@/lib/formatters';
import { Icon } from '@/components/Icons';
import { PlanItem, Project } from '@/types';

export type ChartMode = '6m' | 'month' | 'range';

export interface ChartBucket {
  k: string; // "YYYY-MM-DD" or "YYYY-MM"
  l: string; // short label
  fullLabel: string;
  t: number;
  count: number;
  isCurrent?: boolean;
}

interface IncomeChartProps {
  paidPayments: { i: PlanItem; p: Project }[];
  mode?: ChartMode;
  onModeChange?: (m: ChartMode) => void;
  selectedMonth?: string;
  onSelectedMonthChange?: (ym: string) => void;
  customRange?: { start: string; end: string };
  onCustomRangeChange?: (range: { start: string; end: string }) => void;
  customRangePreset?: string | null;
  onCustomRangePresetChange?: (preset: string | null) => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAY_NAMES_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateYM(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export const IncomeChart: React.FC<IncomeChartProps> = ({
  paidPayments,
  mode: propMode,
  onModeChange,
  selectedMonth: propSelectedMonth,
  onSelectedMonthChange,
  customRange: propCustomRange,
  onCustomRangeChange,
  customRangePreset: propCustomRangePreset,
  onCustomRangePresetChange,
}) => {
  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return formatDateYM(d);
  }, []);

  const [internalMode, setInternalMode] = useState<ChartMode>('6m');
  const mode = propMode !== undefined ? propMode : internalMode;
  const setMode = (m: ChartMode) => {
    if (onModeChange) onModeChange(m);
    setInternalMode(m);
  };

  const [internalSelectedMonth, setInternalSelectedMonth] = useState<string>(currentYearMonth);
  const selectedMonth = propSelectedMonth !== undefined ? propSelectedMonth : internalSelectedMonth;
  const setSelectedMonth = (ym: string) => {
    if (onSelectedMonthChange) onSelectedMonthChange(ym);
    setInternalSelectedMonth(ym);
  };

  const [internalCustomRange, setInternalCustomRange] = useState<{ start: string; end: string }>({
    start: ago(30),
    end: today(),
  });
  const customRange = propCustomRange !== undefined ? propCustomRange : internalCustomRange;
  const setCustomRange = (
    r: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })
  ) => {
    const next = typeof r === 'function' ? r(customRange) : r;
    if (onCustomRangeChange) onCustomRangeChange(next);
    setInternalCustomRange(next);
  };

  const [internalCustomRangePreset, setInternalCustomRangePreset] = useState<string | null>(null);
  const customRangePreset = propCustomRangePreset !== undefined ? propCustomRangePreset : internalCustomRangePreset;
  const setCustomRangePreset = (p: string | null) => {
    if (onCustomRangePresetChange) onCustomRangePresetChange(p);
    setInternalCustomRangePreset(p);
  };

  // Popover state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'months'>('calendar');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calendar picker state
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [tempStart, setTempStart] = useState<string | null>(customRange.start);
  const [tempEnd, setTempEnd] = useState<string | null>(customRange.end);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Month picker year state
  const [monthPickerYear, setMonthPickerYear] = useState<number>(() => new Date().getFullYear());

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Sync temp dates when opening popover
  const openDropdown = () => {
    if (mode === 'range') {
      setTempStart(customRange.start);
      setTempEnd(customRange.end);
      const [y, m] = customRange.end.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCalendarDate(new Date(y, m - 1, 1));
      }
    } else if (mode === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setMonthPickerYear(y);
        setCalendarDate(new Date(y, m - 1, 1));
      }
    }
    setDropdownOpen(true);
  };

  // Compute chart buckets based on selected mode
  const { buckets, periodLabel, filterButtonLabel, totalInPeriod, countInPeriod } = useMemo(() => {
    let resultBuckets: ChartBucket[] = [];
    let pLabel = '';
    let btnLabel = '';

    if (mode === '6m') {
      const d = new Date();
      const refY = d.getFullYear();
      const refM = d.getMonth() + 1;
      const monthsList: ChartBucket[] = [];

      for (let n = 5; n >= 0; n--) {
        const itemDate = new Date(refY, refM - 1 - n, 1);
        const ym = formatDateYM(itemDate);
        const isCurrent = ym === currentYearMonth;
        const monthIdx = itemDate.getMonth();
        monthsList.push({
          k: ym,
          l: MONTH_SHORT_ID[monthIdx],
          fullLabel: `${MONTH_NAMES_ID[monthIdx]} ${itemDate.getFullYear()}`,
          t: 0,
          count: 0,
          isCurrent,
        });
      }

      paidPayments.forEach((x) => {
        const pdMonth = x.i.pd ? x.i.pd.slice(0, 7) : '';
        const match = monthsList.find((b) => b.k === pdMonth);
        if (match) {
          match.t += x.i.a;
          match.count += 1;
        }
      });

      resultBuckets = monthsList;
      pLabel = `${monthsList[0].fullLabel} – ${monthsList[5].fullLabel}`;
      btnLabel = 'Filter Periode';
    } else if (mode === 'month') {
      const [refY, refM] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(refY, refM, 0).getDate();
      const daysList: ChartBucket[] = [];
      const mName = MONTH_NAMES_ID[refM - 1];

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(refY, refM - 1, day);
        const ymd = `${refY}-${pad2(refM)}-${pad2(day)}`;
        const isToday = ymd === today();

        daysList.push({
          k: ymd,
          l: `${day}`,
          fullLabel: `${day} ${mName} ${refY}`,
          t: 0,
          count: 0,
          isCurrent: isToday,
        });
      }

      paidPayments.forEach((x) => {
        if (x.i.pd && x.i.pd.startsWith(selectedMonth)) {
          const match = daysList.find((b) => b.k === x.i.pd);
          if (match) {
            match.t += x.i.a;
            match.count += 1;
          }
        }
      });

      resultBuckets = daysList;
      pLabel = `${mName} ${refY}`;
      btnLabel = `${mName} ${refY}`;
    } else if (mode === 'range') {
      const start = customRange.start || ago(30);
      const end = customRange.end || today();
      const sDate = new Date(start + 'T00:00:00');
      const eDate = new Date(end + 'T00:00:00');

      const diffTime = Math.max(0, eDate.getTime() - sDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays <= 45) {
        const daysList: ChartBucket[] = [];
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(sDate);
          d.setDate(d.getDate() + i);
          const ymd = formatDateYMD(d);
          const isToday = ymd === today();
          const monthIdx = d.getMonth();

          daysList.push({
            k: ymd,
            l: diffDays <= 14 ? `${d.getDate()} ${MONTH_SHORT_ID[monthIdx]}` : `${d.getDate()}`,
            fullLabel: `${d.getDate()} ${MONTH_NAMES_ID[monthIdx]} ${d.getFullYear()}`,
            t: 0,
            count: 0,
            isCurrent: isToday,
          });
        }

        paidPayments.forEach((x) => {
          const pdDate = x.i.pd || '';
          const match = daysList.find((b) => b.k === pdDate);
          if (match) {
            match.t += x.i.a;
            match.count += 1;
          }
        });

        resultBuckets = daysList;
      } else {
        const monthsMap = new Map<string, ChartBucket>();
        const curr = new Date(sDate.getFullYear(), sDate.getMonth(), 1);
        const endMonth = new Date(eDate.getFullYear(), eDate.getMonth(), 1);

        while (curr <= endMonth) {
          const ym = formatDateYM(curr);
          const monthIdx = curr.getMonth();
          monthsMap.set(ym, {
            k: ym,
            l: MONTH_SHORT_ID[monthIdx],
            fullLabel: `${MONTH_NAMES_ID[monthIdx]} ${curr.getFullYear()}`,
            t: 0,
            count: 0,
            isCurrent: ym === currentYearMonth,
          });
          curr.setMonth(curr.getMonth() + 1);
        }

        paidPayments.forEach((x) => {
          if (x.i.pd && x.i.pd >= start && x.i.pd <= end) {
            const ym = x.i.pd.slice(0, 7);
            const match = monthsMap.get(ym);
            if (match) {
              match.t += x.i.a;
              match.count += 1;
            }
          }
        });

        resultBuckets = Array.from(monthsMap.values());
      }

      pLabel = `${dt(start)} – ${dt(end)}`;
      btnLabel = customRangePreset || `${dt(start)} – ${dt(end)}`;
    }

    const totalInPeriod = resultBuckets.reduce((sum, b) => sum + b.t, 0);
    const countInPeriod = resultBuckets.reduce((sum, b) => sum + b.count, 0);

    return { buckets: resultBuckets, periodLabel: pLabel, filterButtonLabel: btnLabel, totalInPeriod, countInPeriod };
  }, [mode, selectedMonth, customRange, customRangePreset, paidPayments, currentYearMonth]);

  const rawMax = Math.max(...buckets.map((m) => m.t), 1);

  // Clean, round Y-axis ticks
  const { yMax, yTicks } = useMemo(() => {
    if (rawMax <= 0) {
      return {
        yMax: 15000000,
        yTicks: [
          { pct: 100, val: 15000000 },
          { pct: 66.666, val: 10000000 },
          { pct: 33.333, val: 5000000 },
          { pct: 0, val: 0 },
        ],
      };
    }

    const exponent = Math.floor(Math.log10(rawMax));
    const power = Math.pow(10, exponent);
    const fraction = rawMax / power;

    let step: number;
    if (fraction <= 1.5) {
      step = 0.5 * power;
    } else if (fraction <= 3) {
      step = 1 * power;
    } else if (fraction <= 7) {
      step = 2 * power;
    } else {
      step = 5 * power;
    }

    if (rawMax >= 1000000 && step < 1000000) {
      step = 1000000;
    }

    const numSteps = Math.max(2, Math.ceil(rawMax / step));
    const computedMax = numSteps * step;

    const ticks: { pct: number; val: number }[] = [];
    for (let i = numSteps; i >= 0; i--) {
      ticks.push({
        pct: (i / numSteps) * 100,
        val: i * step,
      });
    }

    return { yMax: computedMax, yTicks: ticks };
  }, [rawMax]);

  // Month navigation in Single Month mode
  const shiftSingleMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(formatDateYM(d));
  };

  // Reset to default (6 months)
  const resetToDefault = () => {
    setMode('6m');
    setCustomRangePreset(null);
    setHoveredIdx(null);
    setDropdownOpen(false);
  };

  // Select a specific single month
  const handleSelectMonth = (ym: string) => {
    setSelectedMonth(ym);
    setMode('month');
    setCustomRangePreset(null);
    setHoveredIdx(null);
    setDropdownOpen(false);
  };

  // Drill down from 6-month bar
  const handleBarClick = (bucketKey: string) => {
    if (mode === '6m') {
      setSelectedMonth(bucketKey);
      setMode('month');
      setHoveredIdx(null);
    }
  };

  // Preset handlers
  const applyPreset = (presetKey: '7d' | '30d' | 'this_month' | 'last_month') => {
    if (presetKey === 'this_month') {
      handleSelectMonth(currentYearMonth);
      return;
    }
    if (presetKey === 'last_month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      handleSelectMonth(formatDateYM(d));
      return;
    }
    if (presetKey === '7d') {
      setCustomRange({ start: ago(7), end: today() });
      setCustomRangePreset('7 Hari Terakhir');
      setMode('range');
      setDropdownOpen(false);
      return;
    }
    if (presetKey === '30d') {
      setCustomRange({ start: ago(30), end: today() });
      setCustomRangePreset('30 Hari Terakhir');
      setMode('range');
      setDropdownOpen(false);
      return;
    }
  };

  // Calendar date range picker logic
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; dayNum: number }[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        dateStr: formatDateYMD(d),
        isCurrentMonth: false,
        dayNum: prevMonthLastDay - i,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const currDate = new Date(year, month, d);
      days.push({
        date: currDate,
        dateStr: formatDateYMD(currDate),
        isCurrentMonth: true,
        dayNum: d,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: formatDateYMD(d),
        isCurrentMonth: false,
        dayNum: i,
      });
    }

    return days;
  }, [calendarDate]);

  const handleCalendarDayClick = (dateStr: string) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
      setHoverDate(null);
    } else if (tempStart && !tempEnd) {
      if (dateStr < tempStart) {
        setTempStart(dateStr);
        setTempEnd(null);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const applyCustomRange = () => {
    if (!tempStart) return;
    const start = tempStart;
    const end = tempEnd || tempStart;
    setCustomRange({ start, end });
    setCustomRangePreset(null);
    setMode('range');
    setDropdownOpen(false);
  };

  const isDaySelectedStart = (dateStr: string) => tempStart === dateStr;
  const isDaySelectedEnd = (dateStr: string) => (tempEnd ? tempEnd === dateStr : !tempEnd && tempStart === dateStr);
  const isDayInRange = (dateStr: string) => {
    if (tempStart && tempEnd) {
      return dateStr > tempStart && dateStr < tempEnd;
    }
    if (tempStart && !tempEnd && hoverDate && hoverDate > tempStart) {
      return dateStr > tempStart && dateStr <= hoverDate;
    }
    return false;
  };

  const isDefaultView = mode === '6m';

  return (
    <div className="panel income-panel">
      {/* Header: Title, Stats summary, and Dropdown Filter Button */}
      <div className="income-header">
        <div className="income-title-group">
          <h3>Income</h3>
          <span className="income-period-summary">
            {rp(totalInPeriod)} · {countInPeriod} transaksi
          </span>
        </div>

        {/* Filter Dropdown Controls */}
        <div className="income-filter-container" ref={dropdownRef}>
          <div className="income-filter-trigger-group">
            {!isDefaultView && (
              <button
                className="btn sm income-reset-btn"
                onClick={resetToDefault}
                type="button"
                title="Reset ke 6 Bulan Terakhir"
              >
                <Icon name="refresh" size={13} />
                <span>Default</span>
              </button>
            )}

            <button
              className={`btn sm income-dropdown-trigger ${!isDefaultView ? 'active' : ''}`}
              onClick={() => {
                if (dropdownOpen) {
                  setDropdownOpen(false);
                } else {
                  openDropdown();
                }
              }}
              type="button"
              aria-expanded={dropdownOpen}
            >
              <Icon name="cal" size={13} />
              <span className="income-filter-label">
                {isDefaultView ? 'Pilih Periode' : filterButtonLabel}
              </span>
              <Icon name="chevron" size={12} className={`income-dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
            </button>
          </div>

          {/* Interactive Filter Dropdown Popover */}
          {dropdownOpen && (
            <div className="income-filter-popover">
              {/* Quick Presets Bar */}
              <div className="income-presets-row">
                <button
                  type="button"
                  className="income-preset-chip"
                  onClick={() => applyPreset('this_month')}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  className="income-preset-chip"
                  onClick={() => applyPreset('7d')}
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  className="income-preset-chip"
                  onClick={() => applyPreset('30d')}
                >
                  30 Hari
                </button>
                <button
                  type="button"
                  className="income-preset-chip"
                  onClick={() => applyPreset('last_month')}
                >
                  Bulan Lalu
                </button>
              </div>

              {/* Mode Tabs inside Popover: Rentang Tanggal vs Pilih Bulan */}
              <div className="income-popover-tabs">
                <button
                  type="button"
                  className={`income-popover-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                  onClick={() => setActiveTab('calendar')}
                >
                  <Icon name="cal" size={13} />
                  <span>Rentang Tanggal</span>
                </button>
                <button
                  type="button"
                  className={`income-popover-tab ${activeTab === 'months' ? 'active' : ''}`}
                  onClick={() => setActiveTab('months')}
                >
                  <Icon name="filter" size={13} />
                  <span>Pilih Bulan</span>
                </button>
              </div>

              {/* Tab 1: Interactive Calendar Range Picker */}
              {activeTab === 'calendar' && (
                <div className="income-calendar-view">
                  {/* Calendar Month Navigation */}
                  <div className="calendar-nav-header">
                    <button
                      type="button"
                      className="ib sm-ib"
                      onClick={() => {
                        const d = new Date(calendarDate);
                        d.setMonth(d.getMonth() - 1);
                        setCalendarDate(d);
                      }}
                      title="Bulan sebelumnya"
                    >
                      <Icon name="chevron-left" size={14} />
                    </button>
                    <span className="calendar-month-title">
                      {MONTH_NAMES_ID[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      className="ib sm-ib"
                      onClick={() => {
                        const d = new Date(calendarDate);
                        d.setMonth(d.getMonth() + 1);
                        setCalendarDate(d);
                      }}
                      title="Bulan berikutnya"
                    >
                      <Icon name="chevron-right" size={14} />
                    </button>
                  </div>

                  {/* Day Names Header */}
                  <div className="calendar-day-names">
                    {DAY_NAMES_ID.map((dName) => (
                      <span key={dName} className="calendar-day-name-cell">
                        {dName}
                      </span>
                    ))}
                  </div>

                  {/* Days Grid */}
                  <div className="calendar-grid">
                    {calendarDays.map((item) => {
                      const isStart = isDaySelectedStart(item.dateStr);
                      const isEnd = isDaySelectedEnd(item.dateStr);
                      const inRange = isDayInRange(item.dateStr);
                      const isToday = item.dateStr === today();

                      let cellClass = 'calendar-day-cell';
                      if (!item.isCurrentMonth) cellClass += ' outside-month';
                      if (isStart) cellClass += ' range-start';
                      if (isEnd) cellClass += ' range-end';
                      if (inRange) cellClass += ' in-range';
                      if (isToday) cellClass += ' is-today';

                      return (
                        <button
                          key={item.dateStr}
                          type="button"
                          className={cellClass}
                          onClick={() => handleCalendarDayClick(item.dateStr)}
                          onMouseEnter={() => {
                            if (tempStart && !tempEnd) {
                              setHoverDate(item.dateStr);
                            }
                          }}
                        >
                          <span>{item.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Range Footer & Apply */}
                  <div className="calendar-popover-footer">
                    <div className="calendar-selected-text">
                      {tempStart ? (
                        <span>
                          {dt(tempStart)} {tempEnd ? `– ${dt(tempEnd)}` : '(Pilih tanggal akhir)'}
                        </span>
                      ) : (
                        <span className="mut">Klik tanggal awal & akhir</span>
                      )}
                    </div>
                    <div className="calendar-actions">
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => {
                          setTempStart(null);
                          setTempEnd(null);
                        }}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="btn sm pri"
                        disabled={!tempStart}
                        onClick={applyCustomRange}
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Single Month Grid Selector */}
              {activeTab === 'months' && (
                <div className="income-month-selector-view">
                  <div className="calendar-nav-header">
                    <button
                      type="button"
                      className="ib sm-ib"
                      onClick={() => setMonthPickerYear((y) => y - 1)}
                      title="Tahun sebelumnya"
                    >
                      <Icon name="chevron-left" size={14} />
                    </button>
                    <span className="calendar-month-title">{monthPickerYear}</span>
                    <button
                      type="button"
                      className="ib sm-ib"
                      onClick={() => setMonthPickerYear((y) => y + 1)}
                      title="Tahun berikutnya"
                    >
                      <Icon name="chevron-right" size={14} />
                    </button>
                  </div>

                  <div className="month-grid">
                    {MONTH_NAMES_ID.map((name, idx) => {
                      const ym = `${monthPickerYear}-${pad2(idx + 1)}`;
                      const isSelected = mode === 'month' && selectedMonth === ym;
                      const isCurrent = ym === currentYearMonth;

                      return (
                        <button
                          key={ym}
                          type="button"
                          className={`month-grid-cell ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                          onClick={() => handleSelectMonth(ym)}
                        >
                          <span className="month-grid-name">{MONTH_SHORT_ID[idx]}</span>
                          {isCurrent && <span className="month-grid-dot" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-bar: Active period label & stepper when month is selected */}
      <div className="income-sub-controls">
        <span className="income-period-text">{periodLabel}</span>

        <div className="income-date-actions">
          {mode === 'month' && (
            <>
              <button
                className="ib sm-ib"
                onClick={() => shiftSingleMonth(-1)}
                title="Bulan sebelumnya"
                type="button"
              >
                <Icon name="chevron-left" size={13} />
              </button>
              <button
                className="ib sm-ib"
                onClick={() => shiftSingleMonth(1)}
                title="Bulan berikutnya"
                type="button"
              >
                <Icon name="chevron-right" size={13} />
              </button>
            </>
          )}

          {!isDefaultView && (
            <button
              className="income-back-overview-btn"
              onClick={resetToDefault}
              type="button"
            >
              Kembali ke 6 Bulan
            </button>
          )}
        </div>
      </div>

      {/* Main Chart Wrapper */}
      <div className="chart-wrapper">
        {/* Y-Axis on LEFT */}
        <div className="y-axis-left">
          {yTicks.map((tick, idx) => (
            <div
              key={idx}
              className="y-tick-left"
              style={{ bottom: `${tick.pct}%` }}
            >
              <span>{num(tick.val)}</span>
            </div>
          ))}
        </div>

        {/* Plot Area */}
        <div className="plot-container">
          {/* Gridlines */}
          <div className="gridlines">
            {yTicks.map((tick, idx) => (
              <div
                key={idx}
                className="gridline"
                style={{ bottom: `${tick.pct}%` }}
              />
            ))}
          </div>

          {/* Bars */}
          <div
            className="bars-area"
            style={buckets.length > 20 ? { gap: '4px' } : undefined}
          >
            {buckets.map((b, i) => {
              const isHovered = hoveredIdx === i;
              const heightPct = yMax > 0 ? (b.t / yMax) * 85 : 0;
              const safeHeight = b.t > 0 ? Math.max(heightPct, 4) : 1.5;

              return (
                <div
                  key={b.k}
                  className={`bar-col ${b.isCurrent ? 'current' : ''} ${isHovered ? 'hovered' : ''}`}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => handleBarClick(b.k)}
                  style={{ cursor: mode === '6m' ? 'pointer' : 'default' }}
                >
                  {/* Full number above bar only on hover */}
                  <span className={`bar-value-label ${isHovered ? 'active' : ''}`}>
                    {b.t ? num(b.t) : ''}
                  </span>

                  {/* Pillar */}
                  <div
                    className="bar-pillar"
                    style={{
                      height: `${safeHeight}%`,
                      ...(buckets.length > 20 ? { borderRadius: '3px 3px 0 0' } : {}),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-Axis Month / Date Labels below baseline */}
      <div className="x-axis-wrapper">
        <div className="x-axis-spacer-left" />
        <div
          className="x-axis-months"
          style={buckets.length > 20 ? { gap: '4px' } : undefined}
        >
          {buckets.map((b, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <button
                key={b.k}
                className={`x-month-label ${b.isCurrent ? 'current' : ''} ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleBarClick(b.k)}
                type="button"
                style={{
                  fontSize: buckets.length > 20 ? '10px' : '11px',
                  padding: buckets.length > 20 ? '2px 0' : '4px 0',
                  cursor: mode === '6m' ? 'pointer' : 'default',
                }}
              >
                {b.l}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
