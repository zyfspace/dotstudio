'use client';

import React, { useRef, useEffect } from 'react';

interface AutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
}

export const AutoTextarea: React.FC<AutoTextareaProps> = ({
  value,
  onChange,
  className = '',
  style,
  rows = 1,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(44, el.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        adjustHeight();
        onChange?.(e);
      }}
      className={`auto-textarea ${className}`}
      style={{
        resize: 'none',
        overflow: 'hidden',
        minHeight: '44px',
        ...style,
      }}
      rows={rows}
      {...props}
    />
  );
};
