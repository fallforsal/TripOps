// Hỗ trợ ô chọn khách sạn / nhà hàng đối tác: rút gọn tên, nhận tỉnh/thành của điểm đến, gom nhóm theo tỉnh.

/** Bỏ tiền tố hành chính để so khớp "TP. Đồng Nai" với "Đồng Nai". */
export function normalizeProvince(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/^(tp\.?|thành phố|tỉnh)\s+/u, "")
    .trim();
}

/** Tỉnh/thành trong danh sách khớp với điểm đến (ví dụ "Đà Lạt" không khớp tỉnh nào thì trả về undefined). */
export function matchProvince(destination: string, provinces: string[]): string | undefined {
  const target = normalizeProvince(destination);
  if (!target) return undefined;
  return provinces.find((p) => {
    const name = normalizeProvince(p);
    return name === target || name.includes(target) || target.includes(name);
  });
}

/** Tên hiển thị gọn: bỏ "[Mẫu]" ở đầu. */
export function cleanServiceName(name: string): string {
  return name.replace(/^\s*\[[^\]]+\]\s*/u, "").trim() || name;
}

/** Gom dịch vụ theo tỉnh; tỉnh của điểm đến đứng đầu, còn lại theo bảng chữ cái. */
export function groupByProvince<T>(items: T[], provinceOf: (item: T) => string, preferred?: string): { province: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = provinceOf(item) || "Khác";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === preferred ? -1 : b === preferred ? 1 : a.localeCompare(b, "vi")))
    .map(([province, list]) => ({ province, items: list }));
}
