# Studio Dashboard — Design System & Tokens

Source of truth for styling, tokens, and components for Studio Dashboard.

## Typography Hierarchy & Scale
- **Primary Font**: Geist Sans (`font-family: var(--font-geist-sans), 'Geist', system-ui, -apple-system, sans-serif`)
- **Mono Font**: Geist Mono (`font-family: var(--font-geist-mono), monospace`) for tabular data, code, IDs.
- **Weights**: 400 (Regular body, metadata, date strings), 450 (Sidebar navigation items), 500 (Medium item titles, table headers, buttons, active items), 600 (Headings, stat numbers, brand titles, bold amounts).
- **Scale Reference**:
  - **H1 (Page Title)**: `20px` (desktop) / `18px` (mobile), weight 600, `tracking: -0.02em`, `color: var(--fg)`
  - **H2 (Drawer & Modal Titles)**: `16px`, weight 600, `tracking: -0.015em`, `color: var(--fg)`
  - **H3 (Panel & Section Titles)**: `13.5px`, weight 600, `tracking: -0.01em`, `color: var(--fg)`
  - **Stat Card Value**: `20px` (desktop) / `17px` (mobile), weight 600, `tracking: -0.025em`, `tabular-nums`, `color: var(--fg)`
  - **Stat Card Label**: `12px`, weight 400, `color: var(--mut)`
  - **Primary Item / Row Title**: `13px` - `13.5px`, weight 500, `color: var(--fg)`
  - **Amounts / Values**: `13px`, weight 600, `tabular-nums`, `color: var(--fg)`
  - **Secondary Subtext / Metadata**: `11.5px` - `12px`, weight 400, `color: var(--mut)`
  - **Table Headers `th`**: `11.5px`, weight 500, `tracking: 0.02em`, `color: var(--mut)`
  - **Table Cells `td`**: `13px`, weight 400/500, `color: var(--fg)`
  - **Sidebar Nav Items**: `13px`, weight 450 (active: 500), `color: var(--mut)` (active: `var(--fg)`)
  - **Badges / Tooltips / Kbd**: `10.5px` - `11px`, weight 450-500
  - **Mobile Bottom Nav**: `10.5px`, weight 400 (active: 500)
  - **Document / Printable Sheets**: H1 `26px`, H2 `18px`, H3 `14px`, cost table `12.5px`

## Color Tokens
Defined via CSS variables and dynamic `color-mix`:
- `--bg`: `#ffffff` (light mode) / `#0a0a0a` (dark mode)
- `--fg`: `#0a0a0a` (light mode) / `#ffffff` (dark mode)
- `--ac`: `#f16818` (Warm studio orange accent)
- `--mut`: `color-mix(in srgb, var(--fg) 52%, var(--bg))`
- `--line`: `color-mix(in srgb, var(--fg) 11%, var(--bg))`
- `--soft`: `color-mix(in srgb, var(--fg) 4%, var(--bg))`

## Radii
- Buttons, inputs, search, nav items: `7px` - `8px`
- Segmented controls: `9px` (inner button `6px`)
- Cards, panels, table wrappers, paper sheets: `12px`
- Chips / Badges: `99px`
- Kbd: `4px` - `5px`

## Iconography
- SVG stroked icons, `stroke-width: 1.75`, `stroke-linecap: round`, `stroke-linejoin: round`.
- ViewBox: `0 0 24 24`.
- Standard size: 16px - 18px (small: 13px - 14px).

## Motion & Transitions
- Page & View Transitions: 240ms cubic-bezier(0.16, 1, 0.3, 1) (`pageFadeIn`) for page switches, 200ms cubic-bezier(0.16, 1, 0.3, 1) (`dashViewIn`) for in-dashboard tab switching.
- Modal & Overlay: 180ms ease-out backdrop fade, 220ms cubic-bezier(0.16, 1, 0.3, 1) scale & translateY entrance.
- Micro-interactions & Buttons: 150ms for hover states.
- Drawer slides: 250ms (`cubic-bezier(0.2, 0.8, 0.2, 1)`).
- `prefers-reduced-motion` strictly respected across all views and modals.

## Antislop Dials
- **ENERGY**: 1 (Calm, highly focused studio management tool)
- **RHYTHM**: 2 (Structured tables, modular detail drawers, clean invoice/quotation printable sheets)
- **MOTION**: 1 (Fast transitions, strictly functional feedback)

## Quotation & Project Relational Architecture
- **Standalone Quotations**: Quotations can exist independently for proposals / inquiries without requiring an existing project.
- **Relational Linking**:
  - `New Quotation`: Optional relation selector to link with an existing project.
  - `New Project`: Optional reference selector to import title, value, cost items, and scope directly from any quotation.
  - `Project Drawer`: Dedicated "Quotations & Proposals" section with document viewer, status indicators, "+ New quote" trigger, unlink, and quick attach for client's standalone quotes.
  - `Quotations List`: Shows linked project badge with one-click trigger to the project detail drawer, or "Standalone" indicator.
