# TripOps Design System & Color Tokens

## 1. Core Brand Palette
TripOps is a modern travel management and booking platform. Always adhere to these semantic color tokens for interface consistency:

- **Primary Colors (Sky Blue Suite):**
  - Base (`--primary`): `#0EA5E9` (Main brand color, active navigation, key buttons, links)
  - Hover (`--primary-hover`): `#0284C7` (Interactive hover/focus states)
  - Dark (`--primary-dark`): `#075985` (Headers, deep emphasis, high-contrast borders)
  - Light (`--primary-light`): `#E0F2FE` (Active tabs, subtle tag backgrounds, badge tints)

- **Accent (Tangerine Coral):**
  - Base (`--accent`): `#F97316` (High-priority CTA buttons: "Book Now", "Search", "Deposit", discount badges)

- **Layout & Surfaces:**
  - Background (`--background`): `#F0F9FF` (App/Page backdrop, subtle cool atmosphere)
  - Surface (`--surface`): `#FFFFFF` (Cards, modals, dropdowns, sticky navbar backdrops)
  - Border (`--border`): `#CBD5E1` (Dividers, input outlines, card borders)

- **Typography & Text:**
  - Text Primary (`--text-primary`): `#0F172A` (Headings, primary body text, titles)
  - Text Secondary (`--text-secondary`): `#475569` (Subtitles, metadata, captions, helper text)

---

## 2. Color Application Guidelines
- **Main Surfaces & Spacing:** Use `bg-[#F0F9FF]` for the canvas and `bg-[#FFFFFF]` for cards/panels with `border-[#CBD5E1]`.
- **Primary Elements:** Use `#0EA5E9` for standard actions, active filters, and branding; apply `#E0F2FE` for light badge/tag highlights.
- **Conversion Touchpoints:** Reserve `#F97316` strictly for top-level call-to-actions (CTAs) and urgent conversion items. Do not dilute its impact by using it on non-clickable decorative containers.

---

## 3. CSS Variables Setup (`:root`)
```css
:root {
  --primary: #0EA5E9;
  --primary-hover: #0284C7;
  --primary-dark: #075985;
  --primary-light: #E0F2FE;

  --background: #F0F9FF;
  --surface: #FFFFFF;

  --text-primary: #0F172A;
  --text-secondary: #475569;

  --accent: #F97316;
  --border: #CBD5E1;
}