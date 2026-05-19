# Venture Deal Math Dashboards

Static HTML/CSS/JS calculator suite for venture deal math.

## Dashboards

1. **Instructions** — Explains what each dashboard does, how reset/export/print work, and how to interpret the outputs.
2. **Secondary Deals** — The original secondary deal economics dashboard, preserved as a standalone calculator.
3. **Primary Deals** — Standalone calculator for pre-seed, seed, and Series A primary rounds. Supports priced equity, post-money SAFE, and convertible note / pre-money SAFE approximations.
4. **Fund Math** — Standalone calculator for emerging-manager fund construction, including fund size, fees, GP commit, investable capital, stage allocation, check sizing, reserves, graduation assumptions, DPI placeholder, and power-law return requirement.

## Behavior

- Each dashboard is separate and has its own browser-saved assumptions.
- Global buttons operate on the active dashboard only.
- Inputs are editable and recalculations happen live.
- Current tab can be exported to CSV.
- Current tab can be printed / saved as PDF from the browser.
- No build system or dependency install is required.

## Deployment

Upload the repo root to any static host such as Cloudflare Pages, Netlify, Vercel static output, or GitHub Pages.

## Important note

The calculators are decision-support tools. They are not legal, tax, accounting, valuation, or investment advice. Legal docs and fund governing documents control the actual economics.
