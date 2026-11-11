import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { toast } from "@/app/lib/notifications";
import { Textarea } from "@/app/components/ui/textarea";
import { useState, useRef, useMemo } from "react";
import {
  parseDateString,
  calculateAge,
  determineAgeGroup,
  getPassengerPrice,
  validateTourGuests,
  GuestValidationResult,
  EvaluatedPassenger,
} from "@/app/utils/guestValidation";

export {
  calculateAge,
  determineAgeGroup,
  getPassengerPrice,
  parseDateString,
} from "@/app/utils/guestValidation";
import * as XLSX from "xlsx";
import {
  Tour,
  BookingPassenger,
  TourPriceRow,
  CustomHotelChange,
  CustomLocationChange,
  CustomMealChange,
} from "@/app/types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  X,
  Plus,
  Trash2,
  User,
  Users,
  MapPin,
  Phone,
  Mail,
  FileText,
  Info,
  AlertTriangle,
  Building2,
  Utensils,
  Sun,
  UtensilsCrossed,
  ChevronDown,
  Clock,
  Calendar,
  Sparkles,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { VietnameseDatePicker } from "@/app/components/ui/VietnameseDatePicker";

interface BookingFormPageProps {
  tour: Tour;
  currentUser: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  hasLocationCustomization?: boolean;
  customHotelChanges?: CustomHotelChange[];
  customMealChanges?: CustomMealChange[];
  locationChanges?: CustomLocationChange[];
  onBack: () => void;
  onSubmit: (data: BookingSubmitData) => void | Promise<unknown>;
  onGoHome?: () => void;
  onViewMyBookings?: () => void;
}

export interface BookingSubmitData {
  tourId: string;
  tourStartDate: string;
  passengers: BookingPassenger[];
  contactName: string;
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  bookingNotes: string;
  totalPrice: number;
  depositAmount: number;
  hasLocationCustomization: boolean;
  requiresDepositNow: boolean;
  customHotelChanges?: CustomHotelChange[];
  customMealChanges?: CustomMealChange[];
  locationChanges?: CustomLocationChange[];
}

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, label: "Chọn tour" },
  { id: 2, label: "Đăng ký tour" },
  { id: 3, label: "Xác nhận thông tin" },
  { id: 4, label: "Hoàn thành" },
];

const AGE_GROUPS: Array<{
  value: BookingPassenger["ageGroup"];
  label: string;
  ageRange: string;
}> = [
  { value: "adult", label: "Người lớn", ageRange: "Từ 11 tuổi trở lên" },
  {
    value: "child_2_11",
    label: "Trẻ em (2–11 tuổi)",
    ageRange: "Từ 2 đến dưới 11 tuổi",
  },
  {
    value: "child_under_2",
    label: "Trẻ em (dưới 2 tuổi)",
    ageRange: "Dưới 2 tuổi",
  },
];

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

// Các hàm parseDateString, calculateAge, determineAgeGroup, getPassengerPrice đã chuyển vào @/app/utils/guestValidation

function newPassenger(
  id: string,
  tour: Tour,
  defaultDob = "",
): BookingPassenger {
  const age = calculateAge(defaultDob);
  const ageGroup = determineAgeGroup(defaultDob);
  return {
    id,
    fullName: "",
    dateOfBirth: defaultDob,
    gender: "male",
    ageGroup,
    price: getPassengerPrice(tour, ageGroup, age),
    idNumber: "",
    roommateNote: "",
    dietaryNote: "",
    notes: "",
  };
}

export function BookingFormPage({
  tour,
  currentUser,
  hasLocationCustomization = false,
  customHotelChanges = [],
  customMealChanges = [],
  locationChanges = [],
  onBack,
  onSubmit,
  onGoHome,
  onViewMyBookings,
}: BookingFormPageProps) {
  const [step, setStep] = useState<Step>(2);

  // Step 2 state
  const initialStartDate =
    tour.departureDates && tour.departureDates.length > 0
      ? tour.departureDates[0].date
      : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const [tourStartDate, setTourStartDate] = useState(initialStartDate);

  const [passengers, setPassengers] = useState<BookingPassenger[]>([
    newPassenger("p1", tour),
  ]);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<Set<string>>(
    new Set(),
  );

  // Guest validation: Tách riêng vé tính tiền và vé miễn phí theo chính sách tour
  const guestValidation = useMemo(
    () => validateTourGuests(tour, passengers, tourStartDate),
    [tour, passengers, tourStartDate],
  );

  const minGuests = guestValidation.minGuests;
  const maxGuests = guestValidation.maxGuests;
  const guestCount = guestValidation.totalGuests;
  const isBelowMin = guestValidation.isBelowMin;
  const isAboveMax = guestValidation.isAboveMax;
  const isGuestCountValid = guestValidation.isValid;

  // Passenger selection helpers
  const isAllSelected =
    passengers.length > 0 && selectedPassengerIds.size === passengers.length;
  const isPartiallySelected =
    selectedPassengerIds.size > 0 &&
    selectedPassengerIds.size < passengers.length;
  const selectAllState: boolean | "indeterminate" = isAllSelected
    ? true
    : isPartiallySelected
      ? "indeterminate"
      : false;

  const toggleSelectPassenger = (id: string, checked: boolean) => {
    setSelectedPassengerIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedPassengerIds(new Set(passengers.map((p) => p.id)));
    } else {
      setSelectedPassengerIds(new Set());
    }
  };

  const handleDeleteSelected = () => {
    if (selectedPassengerIds.size === 0) return;
    const remaining = passengers.filter((p) => !selectedPassengerIds.has(p.id));
    if (remaining.length === 0) {
      // Giữ lại ít nhất 1 khách trống như quy định
      const defaultOne = newPassenger(
        `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tour,
      );
      setPassengers([defaultOne]);
    } else {
      setPassengers(remaining);
    }
    setSelectedPassengerIds(new Set());
  };
  const [contactName, setContactName] = useState(currentUser?.name ?? "");
  const contactAddress = "";
  const [contactPhone, setContactPhone] = useState(currentUser?.phone ?? "");
  const [contactEmail, setContactEmail] = useState(currentUser?.email ?? "");
  const [bookingNotes, setBookingNotes] = useState("");

  const isCustomized =
    hasLocationCustomization ||
    (customHotelChanges &&
      customHotelChanges.some((h) => h.mode !== "system")) ||
    (customMealChanges && customMealChanges.some((m) => m.mode !== "system")) ||
    (locationChanges && locationChanges.length > 0);

  // Computed
  const cleanName = (s: string) => s.replace(/\s*\(\d+★\)\s*$/, "").trim();
  const extraPerGuest =
    (customHotelChanges || []).reduce((sum, h) => {
      const hotel = (tour.hotels || []).find(
        (x) => x.destination === h.destination,
      );
      const option = hotel?.alternativeHotels?.find((x) =>
        h.serviceId
          ? x.serviceId === h.serviceId
          : x.name === cleanName(h.newHotelName),
      );
      return sum + (option?.priceDifference || 0);
    }, 0) +
    (customMealChanges || []).reduce((sum, m) => {
      const meal = tour.itinerary
        .find((d) => d.day === m.dayNumber)
        ?.meals?.find((x) => x.type === m.mealType);
      const option = meal?.alternativeMeals?.find((x) =>
        m.serviceId
          ? x.serviceId === m.serviceId
          : x.restaurantName === cleanName(m.newMealName),
      );
      return sum + (option?.priceDifference || 0);
    }, 0);
  const totalPrice = passengers.reduce(
    (s, p) => s + p.price + extraPerGuest,
    0,
  );
  const depositAmount = 0;
  const requiresDepositNow = false;

  const addPassenger = () => {
    const newId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setPassengers((prev) => [...prev, newPassenger(newId, tour)]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((p) => p.id !== id));
    setSelectedPassengerIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleStartDateChange = (newDate: string) => {
    setTourStartDate(newDate);
    // Recalculate age & price for all passengers with the new tour departure date
    setPassengers((prev) =>
      prev.map((p) => {
        if (!p.dateOfBirth) return p;
        const age = calculateAge(p.dateOfBirth ?? "", newDate);
        if (age === null) return p;
        const autoGroup = determineAgeGroup(p.dateOfBirth, newDate);
        return {
          ...p,
          ageGroup: autoGroup,
          price: getPassengerPrice(tour, autoGroup, age),
        };
      }),
    );
  };

  const updatePassenger = (id: string, update: Partial<BookingPassenger>) => {
    setPassengers((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...update };

        // If dateOfBirth is entered or changed, automatically detect age, group & update price!
        if (update.dateOfBirth !== undefined) {
          const age = calculateAge(update.dateOfBirth, tourStartDate);
          if (age !== null) {
            updated.ageGroup = determineAgeGroup(
              update.dateOfBirth,
              tourStartDate,
            );
            updated.price = getPassengerPrice(tour, updated.ageGroup, age);
          }
        } else if (update.ageGroup !== undefined) {
          // If user manually altered the age group dropdown
          const age = calculateAge(updated.dateOfBirth ?? "", tourStartDate);
          updated.price = getPassengerPrice(tour, update.ageGroup, age);
        }

        return updated;
      }),
    );
  };

  // Excel template download & upload states & handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelSuccess, setExcelSuccess] = useState<string | null>(null);

  const handleDownloadExcelTemplate = () => {
    try {
      const templateRows = [
        {
          STT: 1,
          "Họ và tên (*)": "Nguyễn Văn An",
          "Số CCCD / Passport / Định danh": "001090012345",
          "Ngày sinh (YYYY-MM-DD) (*)": "1990-05-15",
          "Giới tính (Nam/Nữ)": "Nam",
          "Loại khách": "Người lớn",
          "Nguyện vọng xếp phòng / Muốn ở cùng ai":
            "Muốn ở cùng Trần Thị Bình (STT 2), ưu tiên hai giường đơn",
          "Yêu cầu ăn uống / Dị ứng thực phẩm": "Ăn chay nhẹ, không ăn cay",
          "Ghi chú cá nhân": "Người đại diện đoàn",
        },
        {
          STT: 2,
          "Họ và tên (*)": "Trần Thị Bình",
          "Số CCCD / Passport / Định danh": "001192005678",
          "Ngày sinh (YYYY-MM-DD) (*)": "1992-08-20",
          "Giới tính (Nam/Nữ)": "Nữ",
          "Loại khách": "Người lớn",
          "Nguyện vọng xếp phòng / Muốn ở cùng ai":
            "Muốn ở cùng Nguyễn Văn An (STT 1)",
          "Yêu cầu ăn uống / Dị ứng thực phẩm": "Không ăn thịt bò",
          "Ghi chú cá nhân": "Hay say xe ngồi đầu xe",
        },
        {
          STT: 3,
          "Họ và tên (*)": "Nguyễn Gia Hưng",
          "Số CCCD / Passport / Định danh": "001218009999",
          "Ngày sinh (YYYY-MM-DD) (*)": "2018-11-10",
          "Giới tính (Nam/Nữ)": "Nam",
          "Loại khách": "Trẻ em (2–11 tuổi)",
          "Nguyện vọng xếp phòng / Muốn ở cùng ai":
            "Ở cùng phòng bố mẹ (Nguyễn Văn An)",
          "Yêu cầu ăn uống / Dị ứng thực phẩm":
            "Dị ứng hải sản, tôm cua, kiêng đậu phộng",
          "Ghi chú cá nhân": "Trẻ nhỏ cần chú ý",
        },
        {
          STT: 4,
          "Họ và tên (*)": "Nguyễn Bảo Ngọc",
          "Số CCCD / Passport / Định danh": "",
          "Ngày sinh (YYYY-MM-DD) (*)": "2024-03-25",
          "Giới tính (Nam/Nữ)": "Nữ",
          "Loại khách": "Trẻ em (dưới 2 tuổi)",
          "Nguyện vọng xếp phòng / Muốn ở cùng ai":
            "Cần nôi trẻ em trong phòng",
          "Yêu cầu ăn uống / Dị ứng thực phẩm":
            "Dùng thức ăn mềm / cháo dinh dưỡng",
          "Ghi chú cá nhân": "Trẻ nhỏ cần hỗ trợ",
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateRows);

      // Định dạng kiểu text 's' và format '@' cho cột CCCD (Cột C) để không bị mất số 0 đầu
      Object.keys(ws).forEach((cellKey) => {
        if (/^C\d+$/.test(cellKey) && cellKey !== "C1") {
          if (ws[cellKey]) {
            ws[cellKey].t = "s";
            ws[cellKey].z = "@";
          }
        }
      });

      ws["!cols"] = [
        { wch: 6 }, // STT
        { wch: 25 }, // Họ và tên
        { wch: 30 }, // Số CCCD / Passport / Định danh
        { wch: 26 }, // Ngày sinh
        { wch: 16 }, // Giới tính
        { wch: 22 }, // Loại khách
        { wch: 45 }, // Nguyện vọng xếp phòng / Muốn ở cùng ai
        { wch: 40 }, // Yêu cầu ăn uống / Dị ứng thực phẩm
        { wch: 35 }, // Ghi chú cá nhân
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Khach");
      XLSX.writeFile(
        wb,
        `Mau_Danh_Sach_Khach_Tour_${tour.tourCode || "Tour"}.xlsx`,
      );
    } catch (err: any) {
      toast.error(
        "Không thể tải file mẫu: " + (err?.message || "Lỗi không xác định"),
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelError(null);
    setExcelSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error("File Excel không có sheet nào!");
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!rawRows || rawRows.length === 0) {
          throw new Error("File Excel không có dữ liệu hàng nào!");
        }

        const parsed: BookingPassenger[] = [];

        rawRows.forEach((row, i) => {
          const keys = Object.keys(row);
          const findVal = (keywords: string[], exclude: string[] = []) => {
            const k = keys.find((key) => {
              const lower = key.toLowerCase().trim();
              if (exclude.some((ex) => lower.includes(ex))) return false;
              return keywords.some((kw) => lower.includes(kw));
            });
            return k ? String(row[k]).trim() : "";
          };

          const fullName = findVal([
            "họ và tên",
            "họ tên",
            "tên",
            "fullname",
            "name",
          ]);
          if (!fullName) return;

          const rawDob = findVal(["ngày sinh", "ngaysinh", "dob", "birth"]);
          let dateOfBirth = parseDateString(rawDob) || rawDob;
          if (!dateOfBirth) {
            dateOfBirth = "1995-01-01";
          }

          const rawGender = findVal([
            "giới tính",
            "gioitinh",
            "gender",
          ]).toLowerCase();
          const gender: "male" | "female" =
            rawGender.includes("nữ") || rawGender.includes("female")
              ? "female"
              : "male";

          const rawId = findVal([
            "cccd",
            "cmnd",
            "passport",
            "hộ chiếu",
            "định danh",
            "dinhdanh",
            "idnumber",
            "so cccd",
          ]);
          const idNumber =
            rawId !== undefined && rawId !== null ? String(rawId).trim() : "";

          // Tách riêng nguyện vọng xếp phòng và ghi chú cá nhân
          // Tách riêng nguyện vọng xếp phòng, yêu cầu ăn uống và ghi chú cá nhân
          const dietaryNote = findVal(
            [
              "yêu cầu ăn uống",
              "dị ứng thực phẩm",
              "ăn uống",
              "dị ứng",
              "ăn kiêng",
              "chế độ ăn",
              "ăn chay",
              "dietary",
              "dietary_note",
              "dietarynote",
              "food",
              "allergy",
            ],
            ["xếp phòng", "ở cùng", "roommate"],
          );
          const roommateNote = findVal(
            [
              "nguyện vọng xếp phòng",
              "muốn ở cùng ai",
              "ở cùng ai",
              "xếp phòng",
              "ghép phòng",
              "roommate",
              "rooming",
              "room_preference",
              "room preference",
            ],
            ["ăn uống", "dị ứng", "thực phẩm"],
          );

          const notes = findVal(
            [
              "ghi chú cá nhân",
              "ghi chú riêng",
              "ghi chú",
              "ghichu",
              "note",
              "yêu cầu đặc biệt",
            ],
            [
              "ăn uống",
              "dị ứng",
              "thực phẩm",
              "xếp phòng",
              "ở cùng",
              "roommate",
            ],
          );

          // Calculate passenger age relative to tourStartDate
          const calculatedAge = calculateAge(dateOfBirth, tourStartDate);
          let ageGroup: BookingPassenger["ageGroup"] = "adult";

          if (calculatedAge !== null) {
            // Priority 1: Accurate age group directly from date of birth
            ageGroup = determineAgeGroup(dateOfBirth, tourStartDate);
          } else {
            // Priority 2: Fallback to text matching if date of birth was empty
            const rawAge = findVal([
              "loại khách",
              "loaikhach",
              "nhóm tuổi",
              "age",
            ]).toLowerCase();
            if (
              rawAge.includes("dưới 2") ||
              rawAge.includes("<2") ||
              rawAge.includes("em bé") ||
              rawAge.includes("infant")
            ) {
              ageGroup = "child_under_2";
            } else if (
              rawAge.includes("trẻ em") ||
              rawAge.includes("2-11") ||
              rawAge.includes("2–11") ||
              rawAge.includes("child")
            ) {
              ageGroup = "child_2_11";
            }
          }

          const price = getPassengerPrice(tour, ageGroup, calculatedAge);

          parsed.push({
            id: `p_excel_${Date.now()}_${i}`,
            fullName,
            dateOfBirth,
            gender,
            ageGroup,
            price,
            idNumber,
            roommateNote: roommateNote || "",
            dietaryNote: dietaryNote || "",
            notes: notes || "",
          });
        });

        if (parsed.length === 0) {
          throw new Error(
            "Không tìm thấy dòng thông tin khách hợp lệ. Vui lòng kiểm tra cột 'Họ và tên' trong file.",
          );
        }

        setSelectedPassengerIds(new Set());
        setPassengers(parsed);
        setExcelSuccess(
          `Đã nạp thành công ${parsed.length} khách từ file: ${file.name}`,
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } catch (err: any) {
        setExcelError(err?.message || "Lỗi khi đọc file Excel.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setExcelError("Không thể đọc file đã chọn.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const isStep2Valid =
    guestValidation.isValid &&
    tourStartDate.trim() &&
    passengers.every((p) => p.fullName.trim() && p.dateOfBirth) &&
    contactName.trim() &&
    contactPhone.trim() &&
    contactEmail.trim();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const handleConfirm = async () => {
    if (!guestValidation.isValid || !isStep2Valid) {
      toast.warning(
        guestValidation.warningMessage ||
          "Vui lòng kiểm tra lại điều kiện số lượng khách tối thiểu của tour.",
      );
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      await onSubmit({
        tourId: tour.id,
        tourStartDate,
        passengers,
        contactName,
        contactAddress: "",
        contactPhone,
        contactEmail,
        bookingNotes,
        totalPrice,
        depositAmount: 0,
        hasLocationCustomization: isCustomized,
        requiresDepositNow: false,
        customHotelChanges,
        customMealChanges,
        locationChanges,
      });
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Không thể đặt tour");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
      {/* Header */}
      <div className="bg-white border-b border-[#CBD5E1] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-[#F1F5F9] rounded-[6px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#475569]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">
              Đăng ký đặt tour theo đoàn
            </h1>
            <p className="text-xs text-[#475569]">{tour.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-0 bg-white border border-[#CBD5E1] rounded-[6px] p-2">
          {STEPS.map((s, idx) => {
            const done = s.id < step;
            const active = s.id === step;
            return (
              <div
                key={s.id}
                className="flex items-center flex-1 last:flex-none"
              >
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[4px] text-xs font-semibold transition-all ${
                    done
                      ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
                      : active
                        ? "bg-[#075985] text-white"
                        : "bg-transparent text-[#94A3B8]"
                  }`}
                >
                  {done ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center">
                      {s.id}
                    </span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${done ? "bg-[#15803D]" : "bg-[#CBD5E1]"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 2: Registration form */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Tour info */}
            <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6">
              <h2 className="text-base font-bold text-teal-700 border-b border-[#CBD5E1] pb-2 mb-4">
                Thông tin tour & Ngày khởi hành
              </h2>
              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <p className="font-semibold text-gray-900">{tour.name}</p>
                <p>
                  <span className="text-gray-400">Mã tour:</span>{" "}
                  {tour.tourCode}
                </p>
                <p>
                  <span className="text-gray-400">Thời gian:</span>{" "}
                  {tour.duration}
                </p>
                {tour.operationPeriod && (
                  <p>
                    <span className="text-gray-400">
                      Mùa tour / Thời gian hoạt động:
                    </span>{" "}
                    {tour.operationPeriod}
                  </p>
                )}
              </div>

              {/* Departure date selection */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <Label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Ngày khởi hành mong muốn{" "}
                  <span className="text-red-500">*</span>
                </Label>

                {/* Direct date picker allowing user to freely pick their desired departure date */}
                <div className="bg-[#E0F2FE]/60 border border-[#075985]/15 rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <Label
                        htmlFor="custom-start-date"
                        className="text-xs font-semibold text-[#075985] mb-1 block"
                      >
                        Chọn ngày khởi hành theo kế hoạch của bạn:
                      </Label>
                      <VietnameseDatePicker
                        id="custom-start-date"
                        value={tourStartDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(val) => handleStartDateChange(val)}
                        placeholder="Chọn ngày khởi hành..."
                        className="max-w-sm"
                      />
                    </div>
                    {tourStartDate && (
                      <div className="sm:self-end pb-1 text-xs text-[#075985]">
                        Ngày đã chọn:{" "}
                        <strong className="text-teal-950 font-bold">
                          {tourStartDate}
                        </strong>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-teal-700">
                    Bạn có thể chọn bất kỳ ngày nào thuận tiện cho chuyến đi.
                    Công ty du lịch sẽ tiếp nhận và sắp xếp lịch khởi hành theo
                    ngày này.
                  </p>
                </div>
              </div>
            </div>

            {/* Price table */}
            <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6">
              <h2 className="text-base font-bold text-teal-700 border-b border-[#CBD5E1] pb-2 mb-4">
                Giá tour
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#CBD5E1]">
                      <th className="text-left py-2 font-semibold text-gray-600">
                        Loại khách
                      </th>
                      <th className="text-right py-2 font-semibold text-gray-600">
                        Giá
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tour.priceTable ? (
                      tour.priceTable.map((row, i) => (
                        <tr key={i}>
                          <td className="py-2.5">
                            <p className="font-medium text-gray-800">
                              {row.ageGroupLabel ?? row.ageGroup}
                            </p>
                            {row.ageRange && (
                              <p className="text-xs text-gray-400">
                                {row.ageRange}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-[#075985]">
                            {row.price === 0
                              ? "Miễn phí"
                              : formatVND(row.price)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2.5 font-medium text-gray-800">
                          Người lớn
                        </td>
                        <td className="py-2.5 text-right font-semibold text-[#075985]">
                          {formatVND(tour.price)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contact info */}
            <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6">
              <h2 className="text-base font-bold text-teal-700 border-b border-[#CBD5E1] pb-2 mb-4">
                Thông tin liên lạc
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">
                    Họ &amp; Tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Điện thoại <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0901 234 567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium">Ghi chú</Label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Yêu cầu đặc biệt..."
                    className="mt-1 w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Passenger list */}
            <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#CBD5E1] pb-3 mb-4 gap-3">
                <div>
                  <h2 className="text-base font-bold text-teal-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    Danh sách khách hàng đi tour ({
                      guestValidation.totalGuests
                    }{" "}
                    người)
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                      Tổng số: <strong>{guestValidation.totalGuests}</strong>{" "}
                      người (Tối đa {guestValidation.maxGuests})
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        guestValidation.payingGuestsCount >=
                        guestValidation.minGuests
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                          : "bg-amber-50 text-amber-900 border border-amber-300"
                      }`}
                    >
                      Vé tính tiền:{" "}
                      <strong>{guestValidation.payingGuestsCount}</strong> / tối
                      thiểu {guestValidation.minGuests} khách
                    </span>
                    {guestValidation.freeGuestsCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-300">
                        Vé miễn phí:{" "}
                        <strong>{guestValidation.freeGuestsCount}</strong> (
                        {guestValidation.freeTiersSummary})
                      </span>
                    )}
                    {guestValidation.undeterminedCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
                        ⚠️ Chưa đủ ngày sinh:{" "}
                        <strong>{guestValidation.undeterminedCount}</strong>{" "}
                        người
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Nhập từng khách thủ công hoặc tải file Excel lên để tự động
                    điền danh sách nhanh chóng
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download Excel Template Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadExcelTemplate}
                    className="text-xs h-9 px-3 border-teal-300 text-[#075985] hover:bg-[#E0F2FE] font-semibold gap-1.5 shadow-2xs"
                    title="Tải file mẫu Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    Tải mẫu Excel
                  </Button>

                  {/* Upload Excel Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs h-9 px-3 border-[#CBD5E1] text-[#075985] hover:bg-[#F0F9FF] font-semibold gap-1.5 shadow-2xs"
                    title="Tải lên file danh sách khách (.xlsx, .xls, .csv)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#075985]" />
                    Upload file Excel
                  </Button>

                  {/* Add Passenger Button */}
                  <Button
                    type="button"
                    onClick={addPassenger}
                    className="text-xs h-9 px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm khách
                  </Button>
                </div>
              </div>

              {/* Excel Feedback Alerts */}
              {excelSuccess && <NotificationMessage tone="success" message={excelSuccess} />}

              {excelError && <NotificationMessage tone="error" message={excelError} />}

              {/* Fast Excel Guide Tip */}
              <div className="bg-[#E0F2FE]/60 border border-[#075985]/15/80 rounded-xl p-3 mb-4 flex items-center justify-between text-xs text-[#075985]">
                <div className="flex items-start sm:items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    <strong>Mẹo nhập nhanh danh sách đoàn:</strong> Nhấn{" "}
                    <strong>"Tải mẫu Excel"</strong> để nhận file mẫu ➔ Điền
                    tên, ngày sinh của đoàn ➔ Bấm{" "}
                    <strong>"Upload file Excel"</strong> để tự động nhập vào hệ
                    thống.
                  </span>
                </div>
              </div>

              {/* Guest Limit Warnings */}
              {!guestValidation.isValid && guestValidation.warningMessage && (
                <div
                  className={`rounded-xl p-3.5 flex items-start gap-3 text-xs mb-4 animate-in fade-in ${
                    guestValidation.isAboveMax ||
                    guestValidation.hasUndetermined
                      ? "bg-red-50 border border-red-300 text-red-900"
                      : "bg-amber-50 border border-amber-300 text-amber-900"
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      guestValidation.isAboveMax ||
                      guestValidation.hasUndetermined
                        ? "text-red-600"
                        : "text-amber-600"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">
                      {guestValidation.hasUndetermined
                        ? "Chưa đủ thông tin xác định hạng vé"
                        : guestValidation.isAboveMax
                          ? "Vượt quá số lượng khách tối đa"
                          : "Chưa đạt điều kiện số khách tối thiểu"}
                    </p>
                    <p className="mt-1 leading-relaxed font-medium">
                      {guestValidation.warningMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Batch action & Select all toolbar */}
              <div className="flex flex-wrap items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 mb-4 gap-3">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="select-all-passengers"
                    checked={selectAllState}
                    onCheckedChange={handleToggleSelectAll}
                  />
                  <Label
                    htmlFor="select-all-passengers"
                    className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    Chọn tất cả ({passengers.length})
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  {selectedPassengerIds.size > 0 && (
                    <span className="text-xs text-slate-600 font-medium">
                      Đã chọn{" "}
                      <strong className="text-teal-700 font-bold">
                        {selectedPassengerIds.size}
                      </strong>{" "}
                      khách
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedPassengerIds.size === 0}
                    onClick={handleDeleteSelected}
                    className={`text-xs h-8 px-3 gap-1.5 transition-colors ${
                      selectedPassengerIds.size > 0
                        ? "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                        : "border-slate-200 text-slate-400"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa khách đã chọn
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {passengers.map((p, idx) => (
                  <div
                    key={p.id}
                    className="border border-[#CBD5E1] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          id={`passenger-check-${p.id}`}
                          checked={selectedPassengerIds.has(p.id)}
                          onCheckedChange={(checked) =>
                            toggleSelectPassenger(p.id, !!checked)
                          }
                          aria-label={`Chọn khách ${idx + 1}`}
                        />
                        <Label
                          htmlFor={`passenger-check-${p.id}`}
                          className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <User className="w-4 h-4 text-teal-600" />
                          Khách {idx + 1}
                        </Label>
                      </div>
                      {passengers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePassenger(p.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Xóa khách này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-gray-500">
                          Họ tên <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={p.fullName}
                          onChange={(e) =>
                            updatePassenger(p.id, { fullName: e.target.value })
                          }
                          placeholder="Nguyễn Văn A"
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          Số CCCD / Passport / Định danh
                        </Label>
                        <Input
                          value={p.idNumber ?? ""}
                          onChange={(e) =>
                            updatePassenger(p.id, { idNumber: e.target.value })
                          }
                          placeholder="VD: 001090012345 hoặc B1234567"
                          className="mt-1 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          Ngày sinh <span className="text-red-500">*</span>
                        </Label>
                        <div className="mt-1">
                          <VietnameseDatePicker
                            value={p.dateOfBirth}
                            onChange={(val) =>
                              updatePassenger(p.id, { dateOfBirth: val })
                            }
                            isBirthDate={true}
                            max={new Date().toISOString().split("T")[0]}
                            placeholder="Chọn ngày sinh..."
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          Giới tính
                        </Label>
                        <select
                          value={p.gender}
                          onChange={(e) =>
                            updatePassenger(p.id, {
                              gender: e.target.value as "male" | "female",
                            })
                          }
                          className="mt-1 w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        >
                          <option value="male">Nam</option>
                          <option value="female">Nữ</option>
                        </select>
                      </div>
                      {/* Nguyện vọng xếp phòng / Muốn ở cùng ai */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">
                          Nguyện vọng xếp phòng / Muốn ở cùng ai{" "}
                          <span className="text-gray-400 font-normal">
                            (Tùy chọn)
                          </span>
                        </Label>
                        <Input
                          value={p.roommateNote ?? ""}
                          onChange={(e) =>
                            updatePassenger(p.id, {
                              roommateNote: e.target.value,
                            })
                          }
                          placeholder="VD: Muốn ở cùng Nguyễn Văn A, ưu tiên hai giường đơn…"
                          className="mt-1 text-sm"
                        />
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Đơn vị phụ trách sẽ xem xét theo tình trạng phòng.
                          (Nguyện vọng mang tính tham khảo, không tự động xác
                          nhận, phân phòng hoặc tính phụ thu).
                        </p>
                      </div>

                      {/* Yêu cầu ăn uống / Dị ứng thực phẩm (Tùy chọn) */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">
                          Yêu cầu ăn uống / Dị ứng thực phẩm{" "}
                          <span className="text-gray-400 font-normal">
                            (Tùy chọn)
                          </span>
                        </Label>
                        <Input
                          value={p.dietaryNote ?? ""}
                          onChange={(e) =>
                            updatePassenger(p.id, {
                              dietaryNote: e.target.value,
                            })
                          }
                          placeholder="VD: Ăn chay; dị ứng tôm, cua; không ăn thịt bò; kiêng đậu phộng; không ăn cay…"
                          className="mt-1 text-sm"
                        />
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          Ghi rõ món cần tránh, thực phẩm gây dị ứng hoặc chế độ
                          ăn riêng để nhà hàng phục vụ chuẩn bị phù hợp.
                        </p>
                      </div>

                      {/* Ghi chú cá nhân */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs font-semibold text-gray-700">
                          Ghi chú cá nhân{" "}
                          <span className="text-gray-400 font-normal">
                            (Tùy chọn)
                          </span>
                        </Label>
                        <Input
                          value={p.notes ?? ""}
                          onChange={(e) =>
                            updatePassenger(p.id, { notes: e.target.value })
                          }
                          placeholder="VD: Dễ say xe, người cao tuổi cần hỗ trợ di chuyển..."
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                    {(() => {
                      const ep = guestValidation.evaluatedPassengers.find(
                        (x) => x.passenger.id === p.id,
                      );
                      const age =
                        ep?.age ??
                        calculateAge(p.dateOfBirth ?? "", tourStartDate);
                      const grp = AGE_GROUPS.find(
                        (g) => g.value === p.ageGroup,
                      );
                      return (
                        <div className="flex flex-wrap items-center justify-between bg-[#F0F9FF]/80 border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {age !== null ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-white text-teal-700 font-semibold px-2 py-0.5 rounded border border-[#075985]/15 shadow-2xs">
                                🎂 {age} tuổi (tính đến ngày đi tour)
                              </span>
                            ) : (
                              <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 font-medium">
                                ⚠️ Vui lòng nhập ngày sinh để xác định hạng vé
                              </span>
                            )}
                            <span className="text-xs text-gray-600 font-medium">
                              • {grp?.label ?? p.ageGroup}
                            </span>

                            {ep?.tierStatus === "paying" && (
                              <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-300">
                                ✓ Vé tính tiền ({ep.tierLabel})
                              </span>
                            )}
                            {ep?.tierStatus === "free" && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded border border-blue-300">
                                🎁 Vé miễn phí ({ep.tierLabel}) · Không tính vào
                                tối thiểu
                              </span>
                            )}
                            {ep?.tierStatus === "undetermined" &&
                              p.dateOfBirth && (
                                <span className="inline-flex items-center gap-1 text-xs bg-rose-50 text-rose-800 font-semibold px-2 py-0.5 rounded border border-rose-300">
                                  ⚠️ {ep.reason || "Chưa xác định hạng vé"}
                                </span>
                              )}
                          </div>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="text-xs text-gray-500">
                              Giá vé:
                            </span>
                            <span className="font-bold text-[#075985]">
                              {p.price === 0
                                ? "Miễn phí (0đ)"
                                : formatVND(p.price + extraPerGuest)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* Total Price & Payment Policy */}
              <div className="mt-4 pt-4 border-t border-[#CBD5E1] space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-medium">
                    Tổng giá tour dự kiến ({passengers.length} khách):
                  </span>
                  <span className="font-bold text-[#075985] text-base">
                    {formatVND(totalPrice)}
                  </span>
                </div>

                <div className="bg-[#E0F2FE] border border-[#075985]/15 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#075985]">
                  <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-teal-950 mb-0.5">
                      Không cần thanh toán ngay khi đặt:
                    </span>
                    <span>
                      Sau khi đăng ký, công ty du lịch sẽ liên hệ với các đơn vị
                      cung cấp đối tác (khách sạn, nhà hàng, địa điểm) ngoài hệ
                      thống để đối soát và chốt giá chính thức cho bạn trước khi
                      thanh toán.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                {!guestValidation.isValid && guestValidation.warningMessage && (
                  <p className="text-xs text-red-600 font-semibold max-w-xl">
                    ⚠️ {guestValidation.warningMessage}
                  </p>
                )}
              </div>
              <Button
                disabled={!isStep2Valid || !guestValidation.isValid}
                onClick={() => {
                  if (!guestValidation.isValid || !isStep2Valid) {
                    toast.warning(
                      guestValidation.warningMessage ||
                        "Vui lòng kiểm tra lại điều kiện số lượng khách tối thiểu của tour.",
                    );
                    return;
                  }
                  setStep(3);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 px-8 shadow-2xs font-semibold"
              >
                Tiếp theo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#CBD5E1] p-6 space-y-5">
              <h2 className="text-lg font-bold text-gray-900">
                Xác nhận thông tin đăng ký
              </h2>

              {/* Tour summary */}
              <div className="bg-[#F0F9FF] rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{tour.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mã: {tour.tourCode}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tour.duration}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-teal-700 bg-[#E0F2FE] px-2 py-0.5 rounded">
                        <Calendar className="w-3.5 h-3.5" />
                        Khởi hành: {tourStartDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {tour.destination}
                      </span>
                      {tour.companyName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {tour.companyName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="bg-[#F0F9FF]/70 rounded-xl p-4 border border-[#CBD5E1] space-y-3">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  Người đại diện liên lạc
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>
                      Họ tên:{" "}
                      <strong className="text-gray-900">{contactName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>
                      SĐT:{" "}
                      <strong className="text-gray-900">{contactPhone}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>
                      Email:{" "}
                      <strong className="text-gray-900">{contactEmail}</strong>
                    </span>
                  </div>
                  {contactAddress && (
                    <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>
                        Địa chỉ:{" "}
                        <strong className="text-gray-900">
                          {contactAddress}
                        </strong>
                      </span>
                    </div>
                  )}
                  {bookingNotes && (
                    <div className="sm:col-span-2 pt-2.5 mt-1 border-t border-[#CBD5E1]">
                      <span className="text-xs font-semibold text-gray-600 block mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Ghi chú của bạn cho chuyến đi:
                      </span>
                      <p className="text-sm text-gray-800 bg-white rounded-lg p-2.5 border border-[#CBD5E1] italic leading-relaxed">
                        "{bookingNotes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Passenger list */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-2 mb-2">
                  <h3 className="text-sm font-bold text-gray-800">
                    Danh sách khách ({guestValidation.totalGuests} người)
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-semibold">
                      {guestValidation.payingGuestsCount} khách có vé tính tiền
                    </span>
                    {guestValidation.freeGuestsCount > 0 && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-300 rounded-full font-semibold">
                        {guestValidation.freeGuestsCount} khách miễn phí
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-full font-medium">
                      Quy mô tour: Tối thiểu {guestValidation.minGuests} vé tính
                      tiền / Tối đa {guestValidation.maxGuests} người
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-sm [&_td]:align-top">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-[11px] font-semibold uppercase tracking-wide">
                        <th className="w-8 px-3 py-2.5 text-left rounded-l-lg">#</th>
                        <th className="px-3 py-2.5 text-left">Hành khách</th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap">Ngày sinh</th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap">Giới tính</th>
                        <th className="px-3 py-2.5 text-left whitespace-nowrap">Loại khách</th>
                        <th className="px-3 py-2.5 text-left min-w-[160px]">Xếp phòng</th>
                        <th className="px-3 py-2.5 text-left min-w-[160px]">Ăn uống / Dị ứng</th>
                        <th className="px-3 py-2.5 text-left min-w-[150px]">Ghi chú</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap rounded-r-lg">Giá theo người</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {passengers.map((p, idx) => {
                        const age = calculateAge(p.dateOfBirth ?? "", tourStartDate);
                        const dob = p.dateOfBirth && /^\d{4}-\d{2}-\d{2}/.test(p.dateOfBirth)
                          ? p.dateOfBirth.slice(0, 10).split("-").reverse().join("/")
                          : p.dateOfBirth || "—";
                        const noteCell = (value?: string) =>
                          value ? <span className="text-gray-700 leading-relaxed break-words">{value}</span> : <span className="text-gray-300">—</span>;
                        return (
                          <tr key={p.id}>
                            <td className="px-3 py-3 text-gray-400 font-mono">{idx + 1}</td>
                            <td className="px-3 py-3 min-w-[170px]">
                              <p className="font-semibold text-gray-900">{p.fullName}</p>
                              {p.idNumber && <p className="mt-0.5 font-mono text-xs text-gray-500">{p.idNumber}</p>}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <p className="text-gray-800">{dob}</p>
                              {age !== null && <p className="text-xs text-gray-400">{age} tuổi</p>}
                            </td>
                            <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{p.gender === "male" ? "Nam" : "Nữ"}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                p.ageGroup === "adult"
                                  ? "bg-teal-50 text-teal-700"
                                  : p.ageGroup === "child_2_11"
                                  ? "bg-sky-50 text-[#075985]"
                                  : "bg-orange-50 text-orange-700"
                              }`}>
                                {p.ageGroup === "adult" ? "Người lớn" : p.ageGroup === "child_2_11" ? "Trẻ em" : "Em bé"}
                              </span>
                            </td>
                            <td className="px-3 py-3">{noteCell(p.roommateNote)}</td>
                            <td className="px-3 py-3">{noteCell(p.dietaryNote)}</td>
                            <td className="px-3 py-3">{noteCell(p.notes)}</td>
                            <td className="px-3 py-3 text-right font-semibold text-[#075985] whitespace-nowrap">
                              {p.price === 0 ? "Miễn phí" : formatVND(p.price + extraPerGuest)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#CBD5E1] bg-[#F0F9FF]">
                        <td colSpan={8} className="px-3 py-2.5 text-right font-bold text-gray-700">
                          Tổng cộng ({guestValidation.totalGuests} người — {guestValidation.payingGuestsCount} vé tính tiền
                          {guestValidation.freeGuestsCount > 0 ? `, ${guestValidation.freeGuestsCount} vé miễn phí` : ""}):
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-[#075985] text-base whitespace-nowrap">
                          {formatVND(totalPrice)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* CUSTOMIZATION HIGHLIGHTS (NẾU CÓ TÙY CHỈNH) */}
              {isCustomized && (
                <div className="bg-[#F0F9FF]/70 rounded-2xl border border-[#F97316]/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#EA580C]" />
                    <h4 className="font-bold text-xs text-purple-900 uppercase">
                      Các tùy chỉnh bạn đã chọn cho chuyến đi này
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {/* Hotel changes */}
                    {customHotelChanges && customHotelChanges.length > 0 && (
                      <div className="bg-white rounded-xl p-3 border border-[#F97316]/30 space-y-1">
                        <p className="font-bold text-purple-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#F97316]" />
                          Khách sạn lưu trú:
                        </p>
                        {customHotelChanges.map((hc, idx) => (
                          <div key={idx} className="pl-5 space-y-0.5">
                            <p className="font-bold text-gray-900">
                              {hc.destination}:{" "}
                              <span
                                className={
                                  hc.mode === "system"
                                    ? "text-emerald-700 font-bold"
                                    : "text-[#EA580C] font-bold"
                                }
                              >
                                {hc.newHotelName}
                              </span>
                              {hc.stars && ` (${hc.stars}★)`}{" "}
                              {hc.mode === "system" ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                                  Option từ tour (Đã tự động áp dụng)
                                </span>
                              ) : (
                                <span className="text-[10px] bg-[#F0F9FF] text-purple-800 px-1.5 py-0.2 rounded border border-[#F97316]/30 font-medium">
                                  Yêu cầu riêng (Cần công ty duyệt)
                                </span>
                              )}
                            </p>
                            {hc.originalHotelName && (
                              <p className="text-gray-400 line-through text-[11px]">
                                Tiêu chuẩn tour: {hc.originalHotelName}
                              </p>
                            )}
                            {hc.note && (
                              <p className="text-gray-500 italic text-[11px]">
                                Yêu cầu: {hc.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Location changes */}
                    {locationChanges && locationChanges.length > 0 && (
                      <div className="bg-white rounded-xl p-3 border border-[#F97316]/30 space-y-1">
                        <p className="font-bold text-purple-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                          Điểm tham quan:
                        </p>
                        {locationChanges.map((lc, idx) => (
                          <div key={idx} className="pl-5 space-y-0.5">
                            <p className="font-bold text-gray-900">
                              Ngày {lc.dayNumber}:{" "}
                              <span className="text-amber-800 font-bold">
                                → {lc.requestedLocations}
                              </span>{" "}
                              <span className="text-[10px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200 font-medium">
                                Tự đề xuất (Cần duyệt)
                              </span>
                            </p>
                            {lc.originalLocationName ? (
                              <p className="text-gray-400 line-through text-[11px]">
                                Gốc: {lc.originalLocationName}
                              </p>
                            ) : (
                              lc.originalLocations && (
                                <p className="text-gray-400 line-through text-[11px]">
                                  Gốc: {lc.originalLocations.join(", ")}
                                </p>
                              )
                            )}
                            {lc.note && (
                              <p className="text-gray-500 italic text-[11px]">
                                Ghi chú: {lc.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Meal changes */}
                    {customMealChanges && customMealChanges.length > 0 && (
                      <div className="bg-white rounded-xl p-3 border border-[#F97316]/30 space-y-1">
                        <p className="font-bold text-purple-900 flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-[#F97316]" />
                          Ẩm thực &amp; Thực đơn:
                        </p>
                        {customMealChanges.map((mc, idx) => (
                          <div key={idx} className="pl-5 space-y-0.5">
                            <p className="font-bold text-gray-900">
                              Ngày {mc.dayNumber} (
                              {mc.mealType === "breakfast"
                                ? "Bữa sáng"
                                : mc.mealType === "lunch"
                                  ? "Bữa trưa"
                                  : "Bữa tối"}
                              ):{" "}
                              <span
                                className={
                                  mc.mode === "system"
                                    ? "text-emerald-700 font-bold"
                                    : "text-[#EA580C] font-bold"
                                }
                              >
                                {mc.newMealName}
                              </span>{" "}
                              {mc.mode === "system" ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                                  Option từ tour (Đã tự động áp dụng)
                                </span>
                              ) : (
                                <span className="text-[10px] bg-[#F0F9FF] text-purple-800 px-1.5 py-0.2 rounded border border-[#F97316]/30 font-medium">
                                  Yêu cầu riêng (Cần công ty duyệt)
                                </span>
                              )}
                            </p>
                            {mc.originalMealName && (
                              <p className="text-gray-400 line-through text-[11px]">
                                Tiêu chuẩn tour: {mc.originalMealName}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment & Provider Verification info */}
              <div className="rounded-xl p-4.5 border bg-[#E0F2FE]/80 border-[#075985]/15 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-teal-950 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-teal-700" />
                    Chính sách đặt chỗ & Thanh toán sau
                  </h3>
                  <span className="text-xs bg-teal-200 text-[#075985] font-bold px-2.5 py-0.5 rounded-full">
                    Chưa cần thanh toán
                  </span>
                </div>

                <div className="space-y-2 text-xs text-[#075985]">
                  <div className="flex justify-between items-center py-1 border-b border-[#075985]/15/60 font-semibold">
                    <span>
                      Tổng giá tour tạm tính ({passengers.length} người):
                    </span>
                    <span className="text-sm font-bold text-[#075985]">
                      {formatVND(totalPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-emerald-800">
                    <span>Số tiền cần thanh toán ngay lúc này:</span>
                    <span className="text-sm">0đ</span>
                  </div>
                  <p className="text-xs text-[#075985] leading-relaxed bg-white/70 p-3 rounded-lg border border-[#075985]/15/70">
                    <strong>Lưu ý quan trọng:</strong> Vì các dịch vụ như
                    khách sạn và chỗ ăn uống có thể có giá thay đổi theo thời
                    điểm thực tế, công ty du lịch sẽ liên hệ trực tiếp với các
                    đơn vị cung cấp đối tác ở ngoài hệ thống để hỏi và chốt giá
                    chính thức cho đoàn của bạn. Sau khi công ty du lịch xác
                    nhận lại thông tin và chốt giá, bạn mới tiến hành thanh
                    toán.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </Button>
              {submitError && <NotificationMessage tone="error" message={submitError} />}
              <Button
                disabled={
                  submitting || !isStep2Valid || !guestValidation.isValid
                }
                onClick={handleConfirm}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 px-8 shadow-sm text-sm font-bold disabled:opacity-50"
              >
                Gửi yêu cầu đặt tour
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 sm:p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle className="w-10 h-10 text-teal-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Gửi yêu cầu đặt tour thành công!
              </h2>
              <p className="text-gray-600 max-w-lg mx-auto text-sm leading-relaxed">
                Yêu cầu đặt tour của bạn đã được chuyển tới công ty du lịch{" "}
                <strong>{tour.companyName || "đơn vị tổ chức"}</strong>.
              </p>
            </div>

            {/* Status card */}
            <div className="bg-[#E0F2FE] border border-[#075985]/15 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-teal-950 text-sm">
                    Trạng thái: Chờ công ty du lịch xác nhận &amp; chốt giá
                  </p>
                  <p className="text-xs text-[#075985] mt-1 leading-relaxed">
                    Công ty du lịch đang liên hệ với các bên cung cấp (khách
                    sạn, nhà hàng, phương tiện) ở ngoài hệ thống để kiểm tra
                    tình trạng dịch vụ và chốt giá chính thức cho bạn.
                  </p>
                </div>
              </div>

              <div className="border-t border-[#075985]/15/80 pt-3 space-y-1.5 text-xs text-[#075985]">
                <div className="flex justify-between">
                  <span className="text-gray-600">Số lượng khách:</span>
                  <span className="font-bold text-gray-900">
                    {passengers.length} người
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng giá tour tạm tính:</span>
                  <span className="font-bold text-[#075985] text-sm">
                    {formatVND(totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Số tiền cần thanh toán ngay:
                  </span>
                  <span className="font-bold text-emerald-700">
                    0đ (Thanh toán sau khi duyệt)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Nhân viên tư vấn sẽ liên hệ với bạn qua số điện thoại{" "}
              <strong>{contactPhone}</strong> hoặc email{" "}
              <strong>{contactEmail}</strong> trong vòng 24 giờ để xác nhận và
              gửi hướng dẫn thanh toán.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                onClick={() =>
                  onViewMyBookings ? onViewMyBookings() : onBack()
                }
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-medium"
              >
                <FileText className="w-4 h-4" />
                Xem tour đã đặt của tôi
              </Button>
              <Button
                onClick={() => (onGoHome ? onGoHome() : onBack())}
                variant="outline"
                className="gap-2"
              >
                Về trang chủ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
