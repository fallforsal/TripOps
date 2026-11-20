/**
 * Mã tour gợi ý theo điểm đến và thời lượng: "Đà Lạt" 4 ngày → "DL4N3D".
 * Cùng quy tắc với backend (TourCodes.Suggest); để trống ô mã thì máy chủ tự tạo và tự thêm "-2", "-3" khi trùng.
 */
const SKIP = new Set(["TP", "THANH", "PHO", "TINH", "TOUR", "DU", "LICH"]);

export function suggestTourCode(destination: string | undefined | null, days: number | undefined | null): string {
  const first = (destination || "").split(/[,;/\-–&|(]/).map((p) => p.trim()).find((p) => p.length > 0) || "";
  const folded = first.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "D").toUpperCase().replace(/[^A-Z0-9]+/g, " ");
  const letters = folded.split(" ").filter((w) => w && !SKIP.has(w)).map((w) => w[0]).filter((c) => /[A-Z]/.test(c)).slice(0, 4).join("") || "TOUR";
  const d = days && days > 0 && days < 100 ? Math.floor(days) : 1;
  const n = Math.max(0, d - 1);
  return n > 0 ? `${letters}${d}N${n}D` : `${letters}${d}N`;
}
