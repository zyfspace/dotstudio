'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

interface DatePickerProps {
  id?: string;
  value?: string; // YYYY-MM-DD
  onChange?: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value = '',
  onChange,
  placeholder = 'Select date',
  className = '',
  style,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = value ? new Date(value + 'T00:00:00') : null;
  const isValidDate = Boolean(parsedDate && !isNaN(parsedDate.getTime()));

  // View state (Year & Month shown in popup)
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => (isValidDate ? parsedDate!.getFullYear() : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (isValidDate ? parsedDate!.getMonth() : today.getMonth()));

  // Synchronize view month/year when value changes
  useEffect(() => {
    if (isValidDate) {
      setViewYear(parsedDate!.getFullYear());
      setViewMonth(parsedDate!.getMonth());
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const formatted = `${year}-${mm}-${dd}`;
    onChange?.(formatted);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const formatted = `${today.getFullYear()}-${mm}-${dd}`;
    onChange?.(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({
      day: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      isToday:
        today.getFullYear() === y &&
        today.getMonth() === m &&
        today.getDate() === d,
      isSelected:
        isValidDate &&
        parsedDate!.getFullYear() === y &&
        parsedDate!.getMonth() === m &&
        parsedDate!.getDate() === d,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday =
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === d;
    const isSelected =
      isValidDate &&
      parsedDate!.getFullYear() === viewYear &&
      parsedDate!.getMonth() === viewMonth &&
      parsedDate!.getDate() === d;
    calendarDays.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
      isToday,
      isSelected,
    });
  }

  // Next month leading days (to fill 35 or 42 cells)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({
      day: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      isToday:
        today.getFullYear() === y &&
        today.getMonth() === m &&
        today.getDate() === d,
      isSelected:
        isValidDate &&
        parsedDate!.getFullYear() === y &&
        parsedDate!.getMonth() === m &&
        parsedDate!.getDate() === d,
    });
  }

  // Format display text: DD/MM/YYYY
  const displayFormatted = isValidDate
    ? `${String(parsedDate!.getDate()).padStart(2, '0')}/${String(
        parsedDate!.getMonth() + 1
      ).padStart(2, '0')}/${parsedDate!.getFullYear()}`
    : '';

  return (
    <div
      ref={containerRef}
      className={`custom-datepicker-container ${className}`}
      style={style}
    >
      <div
        id={id}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`custom-datepicker-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'active' : ''}`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <span className={`custom-datepicker-val ${!displayFormatted ? 'placeholder' : ''}`}>
          {displayFormatted || placeholder}
        </span>
        <span className="custom-datepicker-icon" aria-hidden="true">
          <Icon name="cal" size={14} />
        </span>
      </div>

      {isOpen && (
        <div className="custom-datepicker-popover" role="dialog" aria-label="Calendar">
          {/* Header */}
          <div className="custom-datepicker-header">
            <div className="custom-datepicker-month-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <div className="custom-datepicker-nav-btns">
              <button
                type="button"
                className="custom-datepicker-nav-btn"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                <Icon name="back" size={13} />
              </button>
              <button
                type="button"
                className="custom-datepicker-nav-btn"
                onClick={handleNextMonth}
                aria-label="Next month"
                style={{ transform: 'rotate(180deg)' }}
              >
                <Icon name="back" size={13} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="custom-datepicker-weekdays">
            {DAY_NAMES.map((d) => (
              <div key={d} className="custom-datepicker-weekday">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="custom-datepicker-grid">
            {calendarDays.map((item, idx) => {
              return (
                <button
                  key={idx}
                  type="button"
                  className={`custom-datepicker-day-cell ${
                    !item.isCurrentMonth ? 'other-month' : ''
                  } ${item.isToday ? 'today' : ''} ${
                    item.isSelected ? 'selected' : ''
                  }`}
                  onClick={() => handleSelectDay(item.year, item.month, item.day)}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="custom-datepicker-footer">
            <button
              type="button"
              className="custom-datepicker-footer-btn"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className="custom-datepicker-footer-btn pri"
              onClick={handleSelectToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
