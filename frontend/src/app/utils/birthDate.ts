/** Accept a compact date, a Vietnamese date, or an ISO date pasted from elsewhere. */
export function formatBirthDateInput(raw: string): string {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const separated = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (separated) return `${separated[1].padStart(2, "0")}/${separated[2].padStart(2, "0")}/${separated[3]}`;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

/** Invalid/partial dates must not leave a previous valid birthday in the booking payload. */
export function birthDateToIso(text: string, today = new Date()): string {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, dd, mm, yyyy] = match;
  const day = Number(dd), month = Number(mm), year = Number(yyyy);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  if (date > new Date(today.getFullYear(), today.getMonth(), today.getDate())) return "";
  return `${yyyy}-${mm}-${dd}`;
}
