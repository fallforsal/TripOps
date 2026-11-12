import type { BookingPassenger } from "../types/index.ts";

export function passengerExportRows(passengers: BookingPassenger[], stageName: (p: BookingPassenger) => string) {
  return passengers.map((p, index) => ({
    "STT": index + 1,
    "Họ và tên": p.fullName,
    "Số điện thoại": p.phone || "",
    "CCCD / Hộ chiếu": String(p.idNumber || ""),
    "Ngày sinh": p.dateOfBirth?.slice(0, 10).split("-").reverse().join("/") || "",
    "Chặng tham gia": stageName(p),
    "Nguyện vọng xếp phòng": p.roommateNote || "",
    "Ăn uống / Dị ứng": p.dietaryNote || "",
    "Ghi chú": p.notes || "",
    "Giá vé": p.price || 0,
  }));
}
