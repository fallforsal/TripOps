/**
 * TripOps Official Brand Logo Assets
 * Robust path resolver for GitHub Pages, local dev, and custom domains.
 */
const getBaseUrl = (): string => {
  // If Vite injected BASE_URL (e.g., '/TripOps/' on GitHub Pages or './' locally)
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? base : `${base}/`;
};

const BASE = getBaseUrl();

export const TRIPOPS_LOGO = `${BASE}images/Logo/TripOps_logo_transparent.png`;
export const TRIPOPS_LOGO_WHITE = `${BASE}images/Logo/TripOps_logo_white.png`;
export const TRIPOPS_ICON = `${BASE}images/Logo/TripOps_icon_transparent.png`;
