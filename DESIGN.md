# Studio Dashboard — Design System & Tokens

Source of truth for styling, tokens, and components for Studio Dashboard.

## Typography
- **Primary Font**: Geist Sans (`font-family: var(--font-geist-sans), 'Geist', system-ui, -apple-system, sans-serif`)
- **Weights**: 400 (Regular body, inputs, metadata), 500 (Headings, bold text, buttons, table headers)
- **Scale**:
  - H1: 20px, letter-spacing: -0.01em
  - H2: 18px (drawers) / 26px (document paper)
  - H3: 13px, color: muted
  - Body: 14px, line-height: 1.5
  - Small / Badges / Kbd: 11px - 12px
  - Big stats / Numbers: 22px - 28px, letter-spacing: -0.02em

## Color Tokens
Defined via CSS variables and dynamic `color-mix`:
- `--bg`: `#ffffff` (light mode) / `#0a0a0a` (dark mode)
- `--fg`: `#0a0a0a` (light mode) / `#ffffff` (dark mode)
- `--ac`: `#f16818` (Warm studio orange accent)
- `--mut`: `color-mix(in srgb, var(--fg) 52%, var(--bg))`
- `--line`: `color-mix(in srgb, var(--fg) 11%, var(--bg))`
- `--soft`: `color-mix(in srgb, var(--fg) 4%, var(--bg))`

## Radii
- Buttons, inputs, search, nav items: `8px`
- Segmented controls: `9px` (inner button `6px`)
- Cards, panels, table wrappers, paper sheets: `12px`
- Chips / Badges: `99px`
- Kbd: `5px`

## Iconography
- SVG stroked icons, `stroke-width: 1.75`, `stroke-linecap: round`, `stroke-linejoin: round`.
- ViewBox: `0 0 24 24`.
- Standard size: 16px - 18px (small: 14px).

## Motion & Transitions
- Transition speeds: 150ms for hover states, 250ms for drawer slides (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
- `prefers-reduced-motion` respected.

## Antislop Dials
- **ENERGY**: 1 (Calm, highly focused studio management tool)
- **RHYTHM**: 2 (Structured tables, modular detail drawers, clean invoice/quotation printable sheets)
- **MOTION**: 1 (Fast transitions, strictly functional feedback)
