'use client';

import React from 'react';
import {
  gojek,
  xendit,
  blibli,
  shopee,
  stripe,
  spotify,
  figma,
  notion,
  slack,
  nextdotjs,
  react,
  typescript,
  supabase,
  vercel,
  tailwindcss,
  brevo,
  resend,
  prisma,
} from 'thesvg';

// 9 Company Logos: 4 Indonesian + 5 Global
const COMPANY_LOGOS = [
  gojek,
  xendit,
  blibli,
  shopee,
  stripe,
  spotify,
  figma,
  notion,
  slack,
];

// 9 Tech Stack Logos
const TECH_LOGOS = [
  nextdotjs,
  react,
  typescript,
  supabase,
  vercel,
  tailwindcss,
  brevo,
  resend,
  prisma,
];

interface BrandAndTechStackProps {
  theme?: 'light' | 'dark';
}

function getLogoSvg(item: any, isLight: boolean) {
  if (isLight && item.variants?.light) {
    return item.variants.light;
  }
  if (!isLight && item.variants?.dark) {
    return item.variants.dark;
  }
  return item.svg;
}

export function BrandAndTechStack({ theme }: BrandAndTechStackProps) {
  const isLight = theme === 'light';

  return (
    <section className="lp-marquee-section">
      <div className="lp-wrap">
        <div className="lp-marquee-split-grid">
          {/* LEFT COLUMN: Trusted by Studios & Businesses (4 Indo + 5 Global in 1 Line) */}
          <div className="lp-marquee-col">
            <div className="lp-marquee-col-header">
              <span className="lp-marquee-col-title">Trusted by Leading Companies</span>
              <span className="lp-marquee-col-sub">Powering client workflows across modern creative teams</span>
            </div>

            <div className="lp-marquee-stream-box">
              <div className="lp-marquee-track">
                {COMPANY_LOGOS.map((item, idx) => (
                  <div
                    key={`c1-${idx}-${item.slug}`}
                    className="lp-marquee-item"
                    data-slug={item.slug}
                    title={item.title}
                    dangerouslySetInnerHTML={{ __html: getLogoSvg(item, isLight) }}
                  />
                ))}
                {COMPANY_LOGOS.map((item, idx) => (
                  <div
                    key={`c2-${idx}-${item.slug}`}
                    className="lp-marquee-item"
                    data-slug={item.slug}
                    title={item.title}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: getLogoSvg(item, isLight) }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE VERTICAL DIVIDER */}
          <div className="lp-marquee-divider" aria-hidden="true" />

          {/* RIGHT COLUMN: Stack We Use (9 Tech Logos in 1 Line) */}
          <div className="lp-marquee-col">
            <div className="lp-marquee-col-header">
              <span className="lp-marquee-col-title">Engineered with the right stack</span>
              <span className="lp-marquee-col-sub">Built on battle-tested infrastructure, security & speed</span>
            </div>

            <div className="lp-marquee-stream-box">
              <div className="lp-marquee-track lp-reverse">
                {TECH_LOGOS.map((item, idx) => (
                  <div
                    key={`t1-${idx}-${item.slug}`}
                    className="lp-marquee-item"
                    data-slug={item.slug}
                    title={item.title}
                    dangerouslySetInnerHTML={{ __html: getLogoSvg(item, isLight) }}
                  />
                ))}
                {TECH_LOGOS.map((item, idx) => (
                  <div
                    key={`t2-${idx}-${item.slug}`}
                    className="lp-marquee-item"
                    data-slug={item.slug}
                    title={item.title}
                    aria-hidden="true"
                    dangerouslySetInnerHTML={{ __html: getLogoSvg(item, isLight) }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
