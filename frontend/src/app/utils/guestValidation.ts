import { Tour, BookingPassenger } from "@/app/types";

export type PassengerTierStatus = "paying" | "free" | "undetermined";

export interface EvaluatedPassenger {
  passenger: BookingPassenger;
  age: number | null;
  tierStatus: PassengerTierStatus;
  tierLabel: string;
  matchedPrice: number | null;
  reason?: string;
}

export interface GuestValidationResult {
  totalGuests: number; // Tổng số người thực tế tham gia (kể cả miễn phí)
  payingGuestsCount: number; // Số khách có vé tính tiền (được tính vào mức tối thiểu)
  freeGuestsCount: number; // Số khách có vé miễn phí hợp lệ (0đ theo chính sách tour)
  undeterminedCount: number; // Số khách chưa đủ thông tin để xác định hạng vé

  minGuests: number;
  maxGuests: number;

  isBelowMin: boolean; // payingGuestsCount < minGuests
  isAboveMax: boolean; // totalGuests > maxGuests
  hasUndetermined: boolean; // undeterminedCount > 0
  isValid: boolean; // !isBelowMin && !isAboveMax && !hasUndetermined

  missingPayingCount: number; // Số khách tính tiền cần bổ sung thêm
  excessGuestsCount: number; // Số khách vượt quá mức tối đa

  freeTiersSummary: string; // VD: "1 trẻ em miễn phí" hoặc "1 em bé (dưới 2 tuổi) miễn phí"
  freeTiersList: string[];
  warningMessage: string | null;
  evaluatedPassengers: EvaluatedPassenger[];
}

/**
 * Chuẩn hóa chuỗi ngày sinh về YYYY-MM-DD
 */
export function parseDateString(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;

  // DD/MM/YYYY hoặc D/M/YYYY
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2];
      if (y.length === 4) return `${y}-${m}-${d}`;
    }
  }

  // DD-MM-YYYY hoặc YYYY-MM-DD
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return trimmed;
      }
      if (parts[2].length === 4) {
        const d = parts[0].padStart(2, "0");
        const m = parts[1].padStart(2, "0");
        const y = parts[2];
        return `${y}-${m}-${d}`;
      }
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

/**
 * Tính số tuổi chính xác tại ngày khởi hành (hoặc hôm nay)
 */
export function calculateAge(dateOfBirth: string, refDateStr?: string): number | null {
  const normalizedDob = parseDateString(dateOfBirth);
  if (!normalizedDob) return null;

  const birthDate = new Date(normalizedDob);
  if (isNaN(birthDate.getTime())) return null;

  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  if (isNaN(refDate.getTime())) return null;

  let age = refDate.getFullYear() - birthDate.getFullYear();
  const m = refDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Xác định nhóm tuổi cơ bản (adult / child_2_11 / child_under_2)
 */
export function determineAgeGroup(dateOfBirth: string, refDateStr?: string): BookingPassenger["ageGroup"] {
  const age = calculateAge(dateOfBirth, refDateStr);
  if (age === null) return "adult";
  if (age < 2) return "child_under_2";
  if (age <= 11) return "child_2_11";
  return "adult";
}

/**
 * Đánh giá hạng vé cho từng hành khách dựa trên chính sách giá thực tế của tour:
 * - Trả về paying: vé tính tiền (> 0đ)
 * - Trả về free: vé miễn phí (chính sách tour quy định 0đ)
 * - Trả về undetermined: chưa nhập ngày sinh, ngày sinh lỗi, hoặc không khớp chính sách giá
 */
export function evaluatePassengerTier(
  tour: Tour,
  passenger: BookingPassenger,
  tourStartDate?: string
): EvaluatedPassenger {
  const dob = passenger.dateOfBirth?.trim();
  if (!dob) {
    return {
      passenger,
      age: null,
      tierStatus: "undetermined",
      tierLabel: "Chưa xác định",
      matchedPrice: null,
      reason: "Chưa nhập ngày sinh",
    };
  }

  const normalizedDob = parseDateString(dob);
  if (!normalizedDob) {
    return {
      passenger,
      age: null,
      tierStatus: "undetermined",
      tierLabel: "Chưa xác định",
      matchedPrice: null,
      reason: "Ngày sinh không hợp lệ",
    };
  }

  const age = calculateAge(normalizedDob, tourStartDate);
  if (age === null || age < 0) {
    return {
      passenger,
      age: null,
      tierStatus: "undetermined",
      tierLabel: "Chưa xác định",
      matchedPrice: null,
      reason: "Không tính được độ tuổi từ ngày sinh",
    };
  }

  // 1. Khớp theo priceTable thực tế của tour
  if (tour.priceTable && tour.priceTable.length > 0) {
    // 1.1 Khớp theo minAge & maxAge
    const matchByMinMax = tour.priceTable.find((r) => {
      if (r.minAge !== undefined && r.maxAge !== undefined) {
        return age >= r.minAge && age <= r.maxAge;
      }
      if (r.minAge !== undefined) return age >= r.minAge;
      if (r.maxAge !== undefined) return age <= r.maxAge;
      return false;
    });

    if (matchByMinMax) {
      const price = matchByMinMax.price;
      const label = matchByMinMax.ageRange
        ? `${matchByMinMax.ageGroupLabel} (${matchByMinMax.ageRange})`
        : matchByMinMax.ageGroupLabel || (age < 2 ? "Em bé" : age <= 11 ? "Trẻ em" : "Người lớn");

      if (price === 0) {
        return {
          passenger,
          age,
          tierStatus: "free",
          tierLabel: label,
          matchedPrice: 0,
        };
      } else if (price > 0) {
        return {
          passenger,
          age,
          tierStatus: "paying",
          tierLabel: label,
          matchedPrice: price,
        };
      }
    }

    // 1.2 Khớp theo ageGroup key chính xác
    const expectedGroup = age < 2 ? "child_under_2" : age <= 11 ? "child_2_11" : "adult";
    const matchByGroup = tour.priceTable.find((r) => r.ageGroup === expectedGroup);
    if (matchByGroup) {
      const price = matchByGroup.price;
      const label = matchByGroup.ageRange
        ? `${matchByGroup.ageGroupLabel} (${matchByGroup.ageRange})`
        : matchByGroup.ageGroupLabel || (age < 2 ? "Em bé" : age <= 11 ? "Trẻ em" : "Người lớn");
      if (price === 0) {
        return {
          passenger,
          age,
          tierStatus: "free",
          tierLabel: label,
          matchedPrice: 0,
        };
      } else if (price > 0) {
        return {
          passenger,
          age,
          tierStatus: "paying",
          tierLabel: label,
          matchedPrice: price,
        };
      }
    }

    // 1.3 Khớp theo ngữ nghĩa chuỗi tuổi trong priceTable (khi ageGroup không đặt chuẩn)
    const matchByText = tour.priceTable.find((r) => {
      const range = (r.ageRange || "").toLowerCase();
      const label = (r.ageGroupLabel || "").toLowerCase();

      if (age < 2) {
        return (
          range.includes("dưới 2") ||
          range.includes("< 2") ||
          range.includes("<2") ||
          label.includes("em bé") ||
          label.includes("sơ sinh") ||
          r.ageGroup === "child_under_2"
        );
      }
      if (age >= 2 && age <= 11) {
        // Loại trừ nếu dòng này là của em bé dưới 2 tuổi
        if (range.includes("dưới 2") || range.includes("< 2") || range.includes("<2") || label.includes("em bé")) {
          return false;
        }
        return (
          range.includes("2 đến") ||
          range.includes("2 -") ||
          range.includes("2–11") ||
          range.includes("2-11") ||
          range.includes("từ 2") ||
          label.includes("trẻ em") ||
          r.ageGroup === "child_2_11"
        );
      }
      if (age >= 12) {
        if (range.includes("dưới") || label.includes("trẻ em") || label.includes("em bé")) {
          return false;
        }
        return (
          range.includes("11") ||
          range.includes("12") ||
          range.includes("trở lên") ||
          label.includes("người lớn") ||
          r.ageGroup === "adult"
        );
      }
      return false;
    });

    if (matchByText) {
      const price = matchByText.price;
      const label = matchByText.ageRange
        ? `${matchByText.ageGroupLabel} (${matchByText.ageRange})`
        : matchByText.ageGroupLabel || (age < 2 ? "Em bé" : age <= 11 ? "Trẻ em" : "Người lớn");

      if (price === 0) {
        return {
          passenger,
          age,
          tierStatus: "free",
          tierLabel: label,
          matchedPrice: 0,
        };
      } else if (price > 0) {
        return {
          passenger,
          age,
          tierStatus: "paying",
          tierLabel: label,
          matchedPrice: price,
        };
      }
    }

    // Nếu có priceTable nhưng không tìm thấy hạng vé khớp độ tuổi:
    return {
      passenger,
      age,
      tierStatus: "undetermined",
      tierLabel: "Chưa khớp chính sách",
      matchedPrice: null,
      reason: "Không tìm thấy hạng vé tương ứng trong chính sách giá tour",
    };
  }

  // 2. Fallback nếu tour chưa cấu hình priceTable riêng:
  if (typeof tour.price === "number" && tour.price > 0) {
    if (age >= 12) {
      return {
        passenger,
        age,
        tierStatus: "paying",
        tierLabel: "Người lớn",
        matchedPrice: tour.price,
      };
    }
    if (age >= 2 && age <= 11) {
      return {
        passenger,
        age,
        tierStatus: "paying",
        tierLabel: "Trẻ em (2–11 tuổi)",
        matchedPrice: Math.round(tour.price * 0.7),
      };
    }
    return {
      passenger,
      age,
      tierStatus: "undetermined",
      tierLabel: "Em bé (dưới 2 tuổi)",
      matchedPrice: null,
      reason: "Tour chưa công bố chính sách vé cho trẻ em dưới 2 tuổi",
    };
  }

  return {
    passenger,
    age,
    tierStatus: "undetermined",
    tierLabel: "Chưa xác định",
    matchedPrice: null,
    reason: "Tour chưa có chính sách giá hợp lệ",
  };
}

/**
 * Tính giá vé cho hành khách (đồng bộ với evaluatePassengerTier)
 */
export function getPassengerPrice(tour: Tour, ageGroup: BookingPassenger["ageGroup"], age?: number | null): number {
  if (tour.priceTable && tour.priceTable.length > 0) {
    if (typeof age === "number" && !isNaN(age)) {
      const matchByMinMaxAge = tour.priceTable.find((r) => {
        if (r.minAge !== undefined && r.maxAge !== undefined) {
          return age >= r.minAge && age <= r.maxAge;
        }
        if (r.minAge !== undefined) return age >= r.minAge;
        if (r.maxAge !== undefined) return age <= r.maxAge;
        return false;
      });
      if (matchByMinMaxAge) return matchByMinMaxAge.price;

      const expectedGroup = age < 2 ? "child_under_2" : age <= 11 ? "child_2_11" : "adult";
      const matchByGroup = tour.priceTable.find((r) => r.ageGroup === expectedGroup);
      if (matchByGroup) return matchByGroup.price;

      const matchByAge = tour.priceTable.find((r) => {
        const range = (r.ageRange || "").toLowerCase();
        const label = (r.ageGroupLabel || "").toLowerCase();
        if (age < 2) {
          return (
            range.includes("dưới 2") ||
            range.includes("< 2") ||
            range.includes("<2") ||
            label.includes("em bé") ||
            label.includes("sơ sinh") ||
            r.ageGroup === "child_under_2"
          );
        }
        if (age >= 2 && age <= 11) {
          if (range.includes("dưới 2") || range.includes("< 2") || range.includes("<2") || label.includes("em bé")) {
            return false;
          }
          return (
            range.includes("2 đến") ||
            range.includes("2 -") ||
            range.includes("2–11") ||
            range.includes("2-11") ||
            range.includes("từ 2") ||
            label.includes("trẻ em") ||
            r.ageGroup === "child_2_11"
          );
        }
        if (age >= 12) {
          if (range.includes("dưới") || label.includes("trẻ em") || label.includes("em bé")) {
            return false;
          }
          return (
            range.includes("11") ||
            range.includes("12") ||
            range.includes("trở lên") ||
            label.includes("người lớn") ||
            r.ageGroup === "adult"
          );
        }
        return false;
      });
      if (matchByAge) return matchByAge.price;
    }

    const matchByGroup = tour.priceTable.find((r) => r.ageGroup === ageGroup);
    if (matchByGroup) return matchByGroup.price;

    if (ageGroup === "child_under_2") {
      const row = tour.priceTable.find(
        (r) =>
          (r.ageGroupLabel || "").toLowerCase().includes("em bé") ||
          (r.ageGroupLabel || "").toLowerCase().includes("sơ sinh")
      );
      if (row) return row.price;
      return 0;
    }
    if (ageGroup === "child_2_11") {
      const row = tour.priceTable.find((r) => (r.ageGroupLabel || "").toLowerCase().includes("trẻ em"));
      if (row) return row.price;
      return Math.round(tour.price * 0.7);
    }
    const adultRow = tour.priceTable.find((r) => (r.ageGroupLabel || "").toLowerCase().includes("người lớn"));
    if (adultRow) return adultRow.price;
  }

  if (ageGroup === "child_under_2") return 0;
  if (ageGroup === "child_2_11") return Math.round(tour.price * 0.7);
  return tour.price;
}

/**
 * Kiểm tra đầy đủ quy tắc số khách tối thiểu / tối đa của đoàn:
 * - Điều kiện tối thiểu: Số khách có vé tính tiền hợp lệ >= tour.minGuests
 * - Giới hạn tối đa: Tổng số người thực tế (gồm cả vé miễn phí) <= tour.maxGuests
 * - Không cho phép khi còn khách chưa đủ thông tin ngày sinh / hạng vé
 */
export function validateTourGuests(
  tour: Tour,
  passengers: BookingPassenger[],
  tourStartDate?: string
): GuestValidationResult {
  const minGuests = typeof tour.minGuests === "number" && tour.minGuests > 0 ? tour.minGuests : 1;
  const maxGuests = typeof tour.maxGuests === "number" && tour.maxGuests > 0 ? tour.maxGuests : 999;

  const totalGuests = passengers.length;
  const evaluatedPassengers: EvaluatedPassenger[] = passengers.map((p) =>
    evaluatePassengerTier(tour, p, tourStartDate)
  );

  let payingGuestsCount = 0;
  let freeGuestsCount = 0;
  let undeterminedCount = 0;

  const freeLabelsMap = new Map<string, number>();

  evaluatedPassengers.forEach((ep) => {
    if (ep.tierStatus === "paying") {
      payingGuestsCount++;
    } else if (ep.tierStatus === "free") {
      freeGuestsCount++;
      const normLabel = ep.tierLabel.toLowerCase();
      const simpleLabel = normLabel.includes("em bé")
        ? "em bé miễn phí"
        : normLabel.includes("trẻ em")
        ? "trẻ em miễn phí"
        : `${ep.tierLabel.toLowerCase()} miễn phí`;
      freeLabelsMap.set(simpleLabel, (freeLabelsMap.get(simpleLabel) || 0) + 1);
    } else {
      undeterminedCount++;
    }
  });

  const freeTiersList: string[] = [];
  freeLabelsMap.forEach((cnt, lbl) => {
    freeTiersList.push(`${cnt} ${lbl}`);
  });
  const freeTiersSummary =
    freeTiersList.length > 0
      ? freeTiersList.join(", ")
      : freeGuestsCount > 0
      ? `${freeGuestsCount} khách miễn phí`
      : "";

  const isBelowMin = payingGuestsCount < minGuests;
  const isAboveMax = totalGuests > maxGuests;
  const hasUndetermined = undeterminedCount > 0;
  const isValid = !isBelowMin && !isAboveMax && !hasUndetermined && totalGuests > 0;

  const missingPayingCount = Math.max(0, minGuests - payingGuestsCount);
  const excessGuestsCount = Math.max(0, totalGuests - maxGuests);

  // Tạo thông điệp cảnh báo trực quan
  let warningMessage: string | null = null;

  if (hasUndetermined) {
    warningMessage = `Đoàn có ${undeterminedCount} hành khách chưa đủ thông tin ngày sinh để xác định hạng vé. Vui lòng hoàn tất ngày sinh của từng người.`;
  } else if (isBelowMin) {
    if (payingGuestsCount === 0 && freeGuestsCount > 0) {
      warningMessage = `Tour yêu cầu tối thiểu ${minGuests} khách có vé tính tiền. Đoàn hiện chỉ có ${freeTiersSummary}. Vui lòng thêm ít nhất ${minGuests} khách có vé tính tiền.`;
    } else if (freeGuestsCount > 0) {
      warningMessage = `Tour yêu cầu tối thiểu ${minGuests} khách có vé tính tiền. Đoàn hiện có ${payingGuestsCount} khách có vé tính tiền và ${freeTiersSummary}. Vui lòng thêm ${missingPayingCount} khách có vé tính tiền.`;
    } else {
      warningMessage = `Tour yêu cầu tối thiểu ${minGuests} khách có vé tính tiền. Đoàn hiện có ${payingGuestsCount} khách. Vui lòng thêm ${missingPayingCount} khách có vé tính tiền.`;
    }
  } else if (isAboveMax) {
    const freeNote = freeGuestsCount > 0 ? ` (bao gồm ${freeGuestsCount} khách miễn phí)` : "";
    warningMessage = `Đoàn hiện có ${totalGuests} người${freeNote}, vượt quá số lượng tối đa cho phép của tour (${maxGuests} người). Vui lòng giảm ${excessGuestsCount} khách.`;
  }

  return {
    totalGuests,
    payingGuestsCount,
    freeGuestsCount,
    undeterminedCount,
    minGuests,
    maxGuests,
    isBelowMin,
    isAboveMax,
    hasUndetermined,
    isValid,
    missingPayingCount,
    excessGuestsCount,
    freeTiersSummary,
    freeTiersList,
    warningMessage,
    evaluatedPassengers,
  };
}
