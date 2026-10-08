import React from 'react';

export interface LogoProps {
  height?: number | string;
  scale?: number;
  className?: string;
  color?: string;
  dotColor?: string;
}

/**
 * Exact CSS / React DOM version from Paper.design
 * Automatically adapts text color to light (#000000 / var(--fg)) & dark mode (#ffffff / var(--fg))
 */
export function DotStudioPaperLogo({
  height = 24,
  scale,
  className = '',
  color = 'var(--fg)',
  dotColor = '#F16818',
}: LogoProps) {
  const numericHeight = typeof height === 'number' ? height : parseFloat(String(height)) || 24;
  const finalScale = scale !== undefined ? scale : numericHeight / 154;
  const width = 684 * finalScale;
  const actualHeight = 154 * finalScale;

  return (
    <div
      className={`dotstudio-paper-logo ${className}`}
      style={{
        boxSizing: 'border-box',
        fontSynthesis: 'none',
        height: `${actualHeight}px`,
        width: `${width}px`,
        MozOsxFontSmoothing: 'grayscale',
        WebkitFontSmoothing: 'antialiased',
        position: 'relative',
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
      }}
      aria-label="DotStudio"
    >
      <div
        style={{
          backgroundColor: dotColor,
          borderRadius: '9999px',
          boxSizing: 'border-box',
          height: `${98 * finalScale}px`,
          width: `${98 * finalScale}px`,
          left: 0,
          position: 'absolute',
          top: `${28 * finalScale}px`,
        }}
      />
      <div
        style={{
          boxSizing: 'border-box',
          color: color,
          fontFamily: "'Geist', var(--font-geist-sans), system-ui, -apple-system, sans-serif",
          fontSize: `${128 * finalScale}px`,
          fontWeight: 500,
          left: `${149 * finalScale}px`,
          letterSpacing: '-0.06em',
          lineHeight: `${154 * finalScale}px`,
          position: 'absolute',
          top: 0,
          whiteSpace: 'nowrap',
        }}
      >
        DotStudio
      </div>
    </div>
  );
}

export function Logo({
  height = 24,
  className = '',
  color = 'var(--fg)',
  dotColor = '#F16818',
}: LogoProps) {
  return (
    <svg
      viewBox="0 0 684 154"
      height={height}
      style={{
        height,
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      className={`dot-studio-logo ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="DotStudio"
    >
      {/* Orange Dot from Paper specs (98px circle, left 0, top 28) */}
      <circle cx="49" cy="77" r="49" fill={dotColor} />
      
      {/* DotStudio Text with Geist font, 500 weight, -0.06em letter spacing */}
      <text
        x="149"
        y="117"
        fill={color}
        style={{
          fontFamily: "'Geist', var(--font-geist-sans), system-ui, -apple-system, sans-serif",
          fontSize: '128px',
          fontWeight: 500,
          letterSpacing: '-0.06em',
        }}
      >
        DotStudio
      </text>
    </svg>
  );
}

export default DotStudioPaperLogo;
