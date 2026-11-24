/** Phong cách du lịch của tour (cột tours.travel_style) — khớp TravelStyles ở backend. */
export const TRAVEL_STYLES = [
  { code: "BEACH_RESORT", label: "Biển đảo & Nghỉ dưỡng" },
  { code: "HERITAGE_CULTURE", label: "Di sản văn hóa & Cố đô" },
  { code: "MOUNTAIN_ADVENTURE", label: "Núi rừng & Chinh phục" },
  { code: "TEAM_BUILDING", label: "Team Building doanh nghiệp" },
] as const;

export type TravelStyle = (typeof TRAVEL_STYLES)[number]["code"];

export function isTravelStyle(value: unknown): value is TravelStyle {
  return TRAVEL_STYLES.some((s) => s.code === value);
}

export function getTravelStyleLabel(code?: string | null): string {
  return TRAVEL_STYLES.find((s) => s.code === code)?.label ?? "";
}
