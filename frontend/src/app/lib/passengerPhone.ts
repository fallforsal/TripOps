/** Optional phone numbers remain strings so Excel and JSON retain leading zeroes. */
export function isValidPassengerPhone(value?: string | null): boolean {
  const phone = value?.trim() || "";
  return !phone || (phone.length <= 30 && /^\+?[0-9\s().-]+$/.test(phone) && /[0-9]/.test(phone));
}

export function phoneFromSpreadsheet(row: Record<string, unknown>): string {
  const key = Object.keys(row).find(key => {
    const normalized = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
    return /so dien thoai|dien thoai|phone|sdt/.test(normalized);
  });
  const raw = key ? row[key] : "";
  const phone = String(raw ?? "").trim();
  // Excel may coerce a Vietnamese mobile number into a nine-digit numeric cell.
  return typeof raw === "number" && /^\d{9}$/.test(phone) ? `0${phone}` : phone;
}
