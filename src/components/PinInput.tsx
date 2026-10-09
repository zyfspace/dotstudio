'use client';

import React, { useRef } from 'react';

interface PinInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
}

export function PinInput({
  id,
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  hasError = false,
}: PinInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanValue = (value || '').replace(/\D/g, '').slice(0, 4);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    onChange(val);
  };

  return (
    <div
      className={`pin-boxes-container ${hasError ? 'error' : ''}`}
      onClick={handleContainerClick}
    >
      <input
        ref={inputRef}
        id={id}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={cleanValue}
        onChange={handleInputChange}
        autoFocus={autoFocus}
        disabled={disabled}
        className="pin-hidden-native-input"
        autoComplete="one-time-code"
      />

      <div className="pin-digit-boxes" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => {
          const char = cleanValue[index];
          const isFilled = Boolean(char);
          const isCurrent = cleanValue.length === index;

          return (
            <div
              key={index}
              className={`pin-digit-box ${isFilled ? 'filled' : ''} ${isCurrent ? 'active' : ''} ${hasError ? 'error' : ''}`}
            >
              {isFilled ? <span className="pin-dot" /> : <span className="pin-empty-dot" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
