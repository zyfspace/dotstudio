'use client';

import React, { useRef } from 'react';

interface OtpInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  id,
  value,
  onChange,
  autoFocus = true,
  disabled = false,
  hasError = false,
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanValue = (value || '').replace(/\D/g, '').slice(0, 6);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(val);
  };

  return (
    <div
      className={`otp-boxes-container ${hasError ? 'error' : ''}`}
      onClick={handleContainerClick}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={cleanValue}
        onChange={handleInputChange}
        autoFocus={autoFocus}
        disabled={disabled}
        className="otp-hidden-native-input"
        autoComplete="one-time-code"
      />

      <div className="otp-digit-boxes" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const char = cleanValue[index];
          const isFilled = Boolean(char);
          const isCurrent = cleanValue.length === index;

          return (
            <div
              key={index}
              className={`otp-digit-box ${isFilled ? 'filled' : ''} ${isCurrent ? 'active' : ''} ${hasError ? 'error' : ''}`}
            >
              {char || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
