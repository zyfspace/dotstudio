import React from 'react';

export function DocumentWatermark({ className = '' }: { className?: string }) {
  return (
    <div className={`docx-watermark-wrap ${className}`} aria-hidden="true">
      <div className="docx-watermark-paper">
        <div className="docx-watermark-dot-orange" />
        <div className="docx-watermark-sub">made by</div>
        <div className="docx-watermark-title">DotStd</div>
        <div className="docx-watermark-dot-black" />
      </div>
    </div>
  );
}

export default DocumentWatermark;
