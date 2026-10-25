import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTourCode(code?: string): string {
  if (!code) return "";
  const trimmed = code.trim();
  // Shorten ugly long GUIDs (e.g. TOUR-1a83407545b742748e9b62b1d23492b1 -> TOUR-1A834075)
  if (trimmed.toUpperCase().startsWith("TOUR-") && trimmed.length > 15) {
    const raw = trimmed.slice(5).replace(/-/g, "");
    return `TOUR-${raw.slice(0, 8).toUpperCase()}`;
  }
  return trimmed;
}

