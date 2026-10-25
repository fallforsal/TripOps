import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  MapPin,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Smartphone,
  Monitor,
  Wifi,
  BatteryCharging,
  Search,
  Phone,
  Plus,
  Check,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  Camera,
  ShieldCheck,
  Award,
  NotebookPen,
  Users,
  Compass,
  CheckCheck,
} from "lucide-react";
import { GuideSchedule, BookingPassenger, IncidentReport } from "@/app/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

interface GuideDashboardProps {
  schedules: GuideSchedule[];
  onCheckIn: (
    scheduleId: string,
    locationId: string,
    image?: string,
    note?: string
  ) => void | Promise<void>;
  onDepartureRollCall?: (
    scheduleId: string,
    passengers: BookingPassenger[]
  ) => void | Promise<void>;
  onReportIncident?: (
    scheduleId: string,
    incident: Omit<IncidentReport, "id" | "reportedAt">
  ) => void | Promise<void>;
  onWrapUpTour?: (
    scheduleId: string,
    wrapUpReport: { rating?: number; notes: string }
  ) => void | Promise<void>;
  onUpdateNotes?: (
    scheduleId: string,
    personalNotes: string,
    guideNotesList?: GuideSchedule["guideNotesList"]
  ) => void | Promise<void>;
}

export function GuideDashboard({
  schedules,
  onCheckIn,
  onDepartureRollCall,
  onReportIncident,
  onWrapUpTour,
  onUpdateNotes,
}: GuideDashboardProps) {
  // Viewport mode: Phone simulator vs Expanded
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  // Primary Bottom Tabs: "calendar" (Lịch tour) | "operation" (Điều hành tour)
  const [activeTab, setActiveTab] = useState<"calendar" | "operation">("calendar");

  // Sub-tabs inside "operation" (Điều hành tour):
  // "itinerary" (Lộ trình) | "rollcall" (Điểm danh) | "notes" (Ghi chú) | "incidents" (Sự cố)
  const [operationSubTab, setOperationSubTab] = useState<
    "itinerary" | "rollcall" | "notes" | "incidents"
  >("itinerary");

  // Selected schedule
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    schedules[0]?.id || ""
  );

  const currentSchedule =
    schedules.find((s) => s.id === selectedScheduleId) || schedules[0];

  // Calendar State
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    if (currentSchedule?.booking?.tourStartDate) {
      const parsed = new Date(currentSchedule.booking.tourStartDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string>(
    () => calendarDate.toLocaleDateString("sv-SE")
  );

  // Local state for passengers of current schedule
  const [passengers, setPassengers] = useState<BookingPassenger[]>(() => {
    if (currentSchedule?.booking?.passengers) {
      return currentSchedule.booking.passengers;
    }
    return [];
  });

  useEffect(() => {
    if (currentSchedule?.booking?.passengers) {
      setPassengers(currentSchedule.booking.passengers);
    }
  }, [currentSchedule]);

  // Roll call search & notice
  const [passengerSearch, setPassengerSearch] = useState("");
  const [operationSaving, setOperationSaving] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [rollCallSavedNotice, setRollCallSavedNotice] = useState<string | null>(
    null
  );

  // Check-in modal (optional image & note)
  const [checkingInLocation, setCheckingInLocation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [checkInImage, setCheckInImage] = useState<string>("");
  const [checkInNote, setCheckInNote] = useState<string>("");

  // Guide Personal Notes (Sổ Tay Ghi Chép Nhanh duy nhất)
  const [freeformNotes, setFreeformNotes] = useState<string>(
    currentSchedule?.personalNotes ||
      "- Bác tài Nam: 0918.234.567 (Xe 29 chỗ Hyundai Universe 51B-987.65)\n- Khách Lê Thị Thu Thảo say xe, ưu tiên ngồi ghế đầu\n- Bàn ăn trưa Lam Viên Quán: Bàn 2 có 1 khách ăn chay trường\n- Khách sạn Heritage check-in 14:00, nhận 2 phòng đôi + 1 phòng đơn"
  );
  const [noteSavedNotice, setNoteSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentSchedule) {
      setFreeformNotes(currentSchedule.personalNotes || "");
    }
  }, [currentSchedule]);

  // Incident reporting modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentCategory, setIncidentCategory] = useState<
    "medical" | "transport" | "weather" | "service_provider" | "other"
  >("medical");
  const [incidentSeverity, setIncidentSeverity] = useState<
    "low" | "medium" | "high" | "critical"
  >("medium");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("");

  // Local state for incidents
  const [localIncidents, setLocalIncidents] = useState<IncidentReport[]>(currentSchedule?.incidents || []);
  useEffect(() => { setLocalIncidents(currentSchedule?.incidents || []); }, [currentSchedule]);
  // Quick SOS Hotline Modal
  const [showHotlineModal, setShowHotlineModal] = useState(false);

  // Tour wrap-up modal (báo cáo hoàn thành tour)
  const [showWrapUpModal, setShowWrapUpModal] = useState(false);
  const [wrapUpNotes, setWrapUpNotes] = useState("");
  const [wrapUpSuccess, setWrapUpSuccess] = useState(false);

  // Helper info for current tour
  const tour = currentSchedule?.booking?.tour;
  const itinerary = tour?.itinerary || [];
  const currentDayNumber = currentSchedule?.currentDay || 1;
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(
    currentDayNumber
  );

  const currentDayPlan =
    itinerary.find((d) => d.day === selectedDayNumber) || itinerary[0];

  const totalLocations = itinerary.reduce(
    (sum, d) => sum + (d.locations?.length || 0),
    0
  );
  const completedLocationsCount =
    currentSchedule?.completedLocations?.length || 0;

  // Condition for completion button: All locations checked in!
  const isAllLocationsCheckedIn =
    totalLocations > 0 && completedLocationsCount >= totalLocations;

  // Identify last day & last location of the tour
  const lastDay = itinerary[itinerary.length - 1];
  const lastLocation = lastDay?.locations?.[lastDay.locations.length - 1];
  const isViewingLastDay = lastDay && selectedDayNumber === lastDay.day;

  // Roll call calculations
  const presentCount = passengers.filter(
    (p) => p.departureAttendance === "present"
  ).length;
  const unmarkedCount = passengers.filter(
    (p) => p.departureAttendance !== "present"
  ).length;

  const filteredPassengers = passengers.filter((p) => {
    if (!passengerSearch.trim()) return true;
    const q = passengerSearch.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q))
    );
  });

  // Calculate schedule date spans for calendar highlighting
  const scheduleDatesMap = useMemo(() => {
    const map = new Map<string, GuideSchedule[]>();

    schedules.forEach((sch) => {
      const startStr = sch.booking.tourStartDate;
      if (!startStr) return;

      const startDate = new Date(startStr);
      if (isNaN(startDate.getTime())) return;

      const numDays = sch.booking.tour?.itinerary?.length || 3;

      for (let i = 0; i < numDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateKey = `${y}-${m}-${day}`;

        const existing = map.get(dateKey) || [];
        existing.push(sch);
        map.set(dateKey, existing);
      }
    });

    return map;
  }, [schedules]);

  // Calendar Month Computation
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const totalDays = lastDayOfMonth.getDate();
    const days: {
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      schedules: GuideSchedule[];
    }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        dayNumber: 0,
        dateKey: `pad-${i}`,
        isCurrentMonth: false,
        schedules: [],
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const y = currentYear;
      const m = String(currentMonth + 1).padStart(2, "0");
      const day = String(d).padStart(2, "0");
      const dateKey = `${y}-${m}-${day}`;
      const schs = scheduleDatesMap.get(dateKey) || [];

      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        schedules: schs,
      });
    }

    return days;
  }, [currentYear, currentMonth, scheduleDatesMap]);

  const toursOnSelectedDate = useMemo(() => {
    return scheduleDatesMap.get(selectedCalendarDateStr) || [];
  }, [scheduleDatesMap, selectedCalendarDateStr]);

  // 1-Tap Check-in handler
  const handleDirectCheckIn = (locId: string) => {
    if (!currentSchedule) return;
    onCheckIn(
      currentSchedule.id,
      locId,
      undefined,
      "Đã check-in điểm đến đúng lịch trình."
    );
  };

  // Optional Check-in with photo/note
  const handleConfirmOptionalCheckIn = () => {
    if (!checkingInLocation || !currentSchedule) return;
    onCheckIn(
      currentSchedule.id,
      checkingInLocation.id,
      checkInImage.trim() || undefined,
      checkInNote.trim() || undefined
    );
    setCheckingInLocation(null);
    setCheckInImage("");
    setCheckInNote("");
  };

  // Trigger incident report prefilled with a location
  const handleOpenIncidentForLocation = (locationName: string) => {
    setIncidentLocation(locationName);
    setIncidentDescription("");
    setIncidentSeverity("medium");
    setShowIncidentModal(true);
  };

  // Passenger Roll Call Checkbox toggle
  const handleTogglePassengerPresent = (
    passengerId: string,
    isPresent: boolean
  ) => {
    const updated = passengers.map((p) =>
      p.id === passengerId
        ? {
            ...p,
            departureAttendance: (isPresent
              ? "present"
              : "absent") as BookingPassenger["departureAttendance"],
            departureCheckInTime: isPresent
              ? new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : undefined,
          }
        : p
    );
    setPassengers(updated);
  };

  // Update passenger note
  const handleUpdatePassengerNote = (passengerId: string, noteVal: string) => {
    const updated = passengers.map((p) =>
      p.id === passengerId ? { ...p, notes: noteVal } : p
    );
    setPassengers(updated);
  };

  // Bulk check all present
  const handleCheckAllPresent = () => {
    const timeNow = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const updated = passengers.map((p) => ({
      ...p,
      departureAttendance: "present" as const,
      departureCheckInTime: p.departureCheckInTime || timeNow,
    }));
    setPassengers(updated);
  };

  const handleUncheckAll = () => {
    const updated = passengers.map((p) => ({
      ...p,
      departureAttendance: "absent" as const,
      departureCheckInTime: undefined,
    }));
    setPassengers(updated);
  };

  // Save departure roll call
  const handleSaveDepartureRollCall = async () => {
    if (!currentSchedule || operationSaving) return;
    setOperationSaving(true); setOperationError("");
    try {
      await onDepartureRollCall?.(currentSchedule.id, passengers);
      setRollCallSavedNotice(`Đã lưu điểm danh: ${presentCount} có mặt / ${passengers.length} khách.`);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Không lưu được điểm danh.");
    } finally { setOperationSaving(false); }
  };

  // Save Sổ tay ghi chép nhanh
  const handleSaveFreeformNotes = () => {
    if (!currentSchedule) return;
    if (onUpdateNotes) {
      onUpdateNotes(currentSchedule.id, freeformNotes);
    }
    setNoteSavedNotice("✓ Đã lưu sổ tay ghi chép nhanh của HDV!");
    setTimeout(() => setNoteSavedNotice(null), 3000);
  };

  // Create Incident
  const handleCreateIncident = async () => {
    if (!incidentDescription.trim() || !currentSchedule || operationSaving) return;
    setOperationSaving(true); setOperationError("");
    try {
      await onReportIncident?.(currentSchedule.id, {
        bookingId: currentSchedule.booking.id, tourId: currentSchedule.booking.tourId,
        tourName: tour?.name || "", guideId: currentSchedule.booking.guideId || "",
        guideName: currentSchedule.booking.guideName || "", title: `Sự cố ${incidentCategory}`,
        category: incidentCategory, severity: incidentSeverity,
        description: incidentDescription.trim(), location: incidentLocation.trim(), status: "reported",
      });
      setShowIncidentModal(false); setIncidentDescription(""); setIncidentLocation("");
      setOperationSubTab("incidents");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Không lưu được báo cáo sự cố.");
    } finally { setOperationSaving(false); }
  };

  // Wrap-up Tour submit
  const handleConfirmWrapUp = () => {
    if (!currentSchedule) return;
    if (onWrapUpTour) {
      onWrapUpTour(currentSchedule.id, {
        notes: wrapUpNotes.trim(),
      });
    }
    setWrapUpSuccess(true);
    setTimeout(() => {
      setShowWrapUpModal(false);
      setWrapUpSuccess(false);
    }, 2000);
  };

  if (!currentSchedule) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center max-w-md mx-auto shadow-sm border border-slate-200">
        <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-sm">Chưa có lịch tour nào được gán</h3>
        <p className="text-xs text-slate-500 mt-1">
          Vui lòng liên hệ điều hành công ty lữ hành để nhận phân công dẫn tour.
        </p>
      </div>
    );
  }

  return (
    <div className="py-4 px-2 sm:px-4">
      {/* Top Device Mode Switcher */}
      <div className="max-w-md mx-auto mb-4 flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-slate-800">
            Ứng Dụng Hướng Dẫn Viên (Mobile App)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMobileFrame(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              isMobileFrame
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Khung điện thoại chuẩn iPhone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Khung Mobile</span>
          </button>
          <button
            onClick={() => setIsMobileFrame(false)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              !isMobileFrame
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Mở rộng kích thước đầy đủ"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Mở rộng</span>
          </button>
        </div>
      </div>

      {/* Main Container: Phone Simulator or Full Responsive */}
      <div
        className={
          isMobileFrame
            ? "max-w-[420px] mx-auto bg-slate-900 p-3 rounded-[46px] shadow-2xl border-4 border-slate-700/60 ring-1 ring-slate-800 relative transition-all duration-300"
            : "max-w-2xl mx-auto bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden relative transition-all duration-300"
        }
      >
        {/* Dynamic Island on Phone Frame */}
        {isMobileFrame && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-40 flex items-center justify-between px-2">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            <span className="w-2 h-2 rounded-full bg-indigo-950/80 border border-indigo-700/50" />
          </div>
        )}

        {/* Inner Phone Screen */}
        <div
          className={`bg-slate-50 flex flex-col relative overflow-hidden ${
            isMobileFrame
              ? "h-[740px] rounded-[36px]"
              : "min-h-[750px] rounded-3xl"
          }`}
        >
          {/* Simulated Mobile Status Bar */}
          <div className="bg-slate-900 text-white px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-mono shrink-0 select-none">
            <span className="font-bold tracking-tight">09:41</span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-[10px] font-sans font-bold">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* ============================================================== */}
          {/* CONTEXTUAL TOP BAR (CHỈ HIỂN THỊ KHI PHÙ HỢP)                  */}
          {/* ============================================================== */}
          {activeTab === "calendar" ? (
            /* Compact Profile Header on Calendar View */
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-3 shrink-0 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center font-extrabold text-xs text-yellow-300">
                  HDV
                </div>
                <div>
                  <span className="text-[10px] text-blue-200 block">
                    Hướng dẫn viên
                  </span>
                  <h3 className="font-extrabold text-xs leading-tight">
                    {currentSchedule.booking.guideName || "Trần Thị Bích"}
                  </h3>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-white/15 px-2 py-0.5 rounded-full border border-white/20 text-yellow-200">
                📅 Lịch phân công
              </span>
            </div>
          ) : (
            /* Operation Top Bar on Tour Operation View */
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-3.5 pt-3 pb-2 shrink-0 shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-200">
                    <span className="font-bold text-yellow-300">
                      {tour?.tourCode || "T-01"}
                    </span>
                    <span>•</span>
                    <span className="truncate">{tour?.destination}</span>
                  </div>
                  <h4 className="font-extrabold text-xs text-white truncate mt-0.5">
                    {tour?.name}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Tour Switcher Dropdown */}
                  {schedules.length > 1 && (
                    <select
                      aria-label="Chọn đoàn được phân công"
                      value={selectedScheduleId || currentSchedule?.id}
                      onChange={(e) => setSelectedScheduleId(e.target.value)}
                      className="bg-white/20 text-white text-[10px] font-semibold px-2 py-1 rounded-lg border border-white/30 focus:outline-hidden max-w-[110px] truncate"
                    >
                      {schedules.map((s, idx) => (
                        <option key={s.id} value={s.id} className="text-slate-900">
                          {s.booking.bookingCode || `Đoàn ${idx + 1}`} · {s.booking.contactName || s.booking.userName}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* SOS Hotline Button */}
                  <button
                    type="button"
                    onClick={() => setShowHotlineModal(true)}
                    className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 text-[10px] font-bold"
                    title="Đường dây nóng khẩn cấp"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">SOS</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs inside "Điều hành tour" */}
              <div className="grid grid-cols-4 gap-1 mt-2.5 pt-2 border-t border-white/15 text-center">
                <button
                  type="button"
                  onClick={() => setOperationSubTab("itinerary")}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                    operationSubTab === "itinerary"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  📍 Lộ trình
                </button>

                <button
                  type="button"
                  onClick={() => setOperationSubTab("rollcall")}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all relative ${
                    operationSubTab === "rollcall"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  👥 Điểm danh
                  {unmarkedCount > 0 && (
                    <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOperationSubTab("notes")}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all ${
                    operationSubTab === "notes"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  📝 Ghi chú
                </button>

                <button
                  type="button"
                  onClick={() => setOperationSubTab("incidents")}
                  className={`py-1 rounded-lg text-[11px] font-bold transition-all relative ${
                    operationSubTab === "incidents"
                      ? "bg-white text-indigo-900 shadow-xs"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  ⚠️ Sự cố
                  {localIncidents.some((i) => i.status === "reported") && (
                    <span className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-rose-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SCROLLABLE MAIN VIEWPORT                                       */}
          {/* ============================================================== */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 pb-24">
            {/* ============================================================== */}
            {/* VIEW 1: LỊCH TOUR (CALENDAR)                                   */}
            {/* ============================================================== */}
            {activeTab === "calendar" && (
              <div className="space-y-4">
                {/* Monthly Calendar Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(currentYear, currentMonth - 1, 1)
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Tháng trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Tháng {currentMonth + 1} / {currentYear}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Lịch tour được phân công
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarDate(
                          new Date(currentYear, currentMonth + 1, 1)
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Tháng sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day of week header */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((dayName, idx) => (
                      <span
                        key={dayName}
                        className={`text-[10px] font-bold py-1 ${
                          idx >= 5 ? "text-amber-600" : "text-slate-500"
                        }`}
                      >
                        {dayName}
                      </span>
                    ))}
                  </div>

                  {/* Month Grid with Highlighted Tour Dates */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((item, idx) => {
                      if (!item.isCurrentMonth) {
                        return (
                          <div
                            key={idx}
                            className="h-10 rounded-xl bg-transparent"
                          />
                        );
                      }

                      const hasTour = item.schedules.length > 0;
                      const isSelected = selectedCalendarDateStr === item.dateKey;
                      const isToday =
                        item.dateKey === "2026-10-15" ||
                        item.dateKey ===
                          new Date().toISOString().split("T")[0];

                      return (
                        <button
                          key={item.dateKey}
                          type="button"
                          onClick={() => {
                            setSelectedCalendarDateStr(item.dateKey);
                            if (item.schedules.length > 0) {
                              setSelectedScheduleId(item.schedules[0].id);
                            }
                          }}
                          className={`h-11 rounded-xl flex flex-col items-center justify-center relative transition-all duration-200 ${
                            isSelected
                              ? "ring-2 ring-indigo-600 ring-offset-1 font-extrabold scale-105 z-10"
                              : ""
                          } ${
                            hasTour
                              ? "bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-extrabold shadow-xs"
                              : isToday
                              ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="text-xs">{item.dayNumber}</span>
                          {hasTour && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-around text-[10px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-md bg-indigo-600 inline-block" />
                      <span>Ngày nhận tour (Nổi bật)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-md bg-amber-200 border border-amber-300 inline-block" />
                      <span>Hôm nay</span>
                    </span>
                  </div>
                </div>

                {/* Tour Detail for Selected Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />
                      Lịch Tour Ngày {selectedCalendarDateStr}
                    </h5>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {toursOnSelectedDate.length} tour
                    </span>
                  </div>

                  {toursOnSelectedDate.length > 0 ? (
                    toursOnSelectedDate.map((sch) => {
                      const isCurrent = sch.id === selectedScheduleId;
                      return (
                        <div
                          key={sch.id}
                          className={`bg-white rounded-2xl p-3.5 border transition-all shadow-2xs ${
                            isCurrent
                              ? "border-indigo-400 ring-1 ring-indigo-200"
                              : "border-slate-200"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                {sch.booking.tour.tourCode || "T-01"}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  sch.booking.status === "completed"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {sch.booking.status === "completed"
                                  ? "Đã hoàn tất"
                                  : "Đang phân công"}
                              </span>
                            </div>
                            <h5 className="font-bold text-xs sm:text-sm text-slate-900 mt-1">
                              {sch.booking.tour.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span>{sch.booking.tour.destination}</span>
                              <span className="mx-1">·</span>
                              <Users className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{sch.booking.numberOfGuests} khách</span>
                            </p>
                            <p className="text-[10px] text-indigo-700 font-medium mt-1">
                              Trưởng đoàn: {sch.booking.contactName} ({sch.booking.contactPhone})
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">
                              Khởi hành: {sch.booking.tourStartDate}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedScheduleId(sch.id);
                                setActiveTab("operation");
                                setOperationSubTab("itinerary");
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl h-8 px-3 shadow-xs"
                            >
                              👉 Vào điều hành tour này
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 shadow-2xs">
                      <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        Không có lịch tour vào ngày này
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Bạn đang trong ngày nghỉ ngơi hoặc không có phân công.
                      </p>
                    </div>
                  )}
                </div>

                {/* All Assigned Tours Summary */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Tất cả các tour được phân công ({schedules.length})
                  </h5>
                  <div className="space-y-2">
                    {schedules.map((sch) => {
                      const isCurrent = sch.id === selectedScheduleId;
                      return (
                        <div
                          key={sch.id}
                          role="button" tabIndex={0} aria-label={`Chọn đoàn ${sch.booking.bookingCode || sch.booking.id}`}
                          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedScheduleId(sch.id); } }}
                          onClick={() => {
                            setSelectedScheduleId(sch.id);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isCurrent
                              ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-900 block truncate">
                              {sch.booking.tour.name}
                            </span><span className="block text-xs text-slate-600">{sch.booking.bookingCode} · {sch.booking.contactName || sch.booking.userName}</span>
                            <span className="text-[10px] text-slate-500">
                              Khởi hành: {sch.booking.tourStartDate} · {sch.booking.tour.destination}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isCurrent
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isCurrent ? "Đang chọn" : "Chọn"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* VIEW 2: ĐIỀU HÀNH TOUR (OPERATION WORKSPACE)                   */}
            {/* ============================================================== */}
            {activeTab === "operation" && (
              <>
                {/* ------------------------------------------------------------ */}
                {/* SUB-TAB 1: LỘ TRÌNH (CHỈ HIỂN THỊ ĐỊA ĐIỂM + NÚT BÁO SỰ CỐ)  */}
                {/* ------------------------------------------------------------ */}
                {operationSubTab === "itinerary" && (
                  <div className="space-y-3.5">
                    {/* Progress Bar */}
                    <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800">
                          Tiến độ check-in các điểm đến
                        </span>
                        <span className="font-mono font-extrabold text-indigo-600">
                          {completedLocationsCount} / {totalLocations} điểm
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              totalLocations > 0
                                ? Math.round(
                                    (completedLocationsCount / totalLocations) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Day Selector Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {itinerary.map((d) => (
                        <button
                          key={d.day}
                          onClick={() => setSelectedDayNumber(d.day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                            d.day === selectedDayNumber
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Ngày {d.day}
                        </button>
                      ))}
                    </div>

                    {/* Day Title */}
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 text-xs">
                      <h5 className="font-extrabold text-indigo-950">
                        {currentDayPlan?.title}
                      </h5>
                    </div>

                    {/* Locations List (CHỈ HIỂN THỊ ĐỊA ĐIỂM THÔI - BỎ 08:30) */}
                    <div className="space-y-2.5">
                      {currentDayPlan?.locations?.map((loc, idx) => {
                        const isCheckedIn =
                          loc.checkedIn ||
                          currentSchedule.completedLocations.includes(loc.id);

                        return (
                          <div
                            key={loc.id || idx}
                            className={`bg-white rounded-2xl border p-3.5 shadow-2xs transition-all space-y-2.5 ${
                              isCheckedIn
                                ? "border-emerald-300 bg-emerald-50/20"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2.5">
                              {/* Chỉ hiển thị tên địa điểm */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                    isCheckedIn
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {isCheckedIn ? <Check className="w-4 h-4" /> : idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                    {loc.name}
                                  </h5>
                                  {isCheckedIn && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full inline-block mt-0.5">
                                      ✓ Đã check-in
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Check-in Action Buttons */}
                              <div className="shrink-0 flex items-center gap-1.5">
                                {isCheckedIn ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCheckingInLocation({
                                        id: loc.id,
                                        name: loc.name,
                                      })
                                    }
                                    className="text-[11px] text-slate-500 hover:text-indigo-600 font-semibold p-1"
                                    title="Xem lại hoặc bổ sung ảnh/ghi chú"
                                  >
                                    {loc.checkInImage ? "📸 Có ảnh" : "+ Ảnh/Ghi chú"}
                                  </button>
                                ) : (
                                  <>
                                    {/* 1-Tap Check-in Button */}
                                    <Button
                                      size="sm"
                                      onClick={() => handleDirectCheckIn(loc.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 px-3 shadow-xs flex items-center gap-1"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Check-in</span>
                                    </Button>

                                    {/* Optional Image Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCheckingInLocation({
                                          id: loc.id,
                                          name: loc.name,
                                        })
                                      }
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                      title="Chụp ảnh / ghi chú tùy chọn"
                                    >
                                      <Camera className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Location Footer: Nút Báo cáo sự cố tại địa điểm đó */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleOpenIncidentForLocation(loc.name)}
                                className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline transition-colors"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Báo sự cố tại địa điểm này</span>
                              </button>

                              {isCheckedIn && (loc.checkInImage || loc.checkInNote) && (
                                <span className="text-[10px] text-slate-400 italic">
                                  {loc.checkInNote || "Đã lưu thông tin thực địa"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* NÚT BÁO CÁO HOÀN THÀNH TOUR:
                        CHỈ HIỂN THỊ Ở ĐỊA ĐIỂM CUỐI CÙNG VÀ TẤT CẢ CÁC ĐỊA ĐIỂM ĐÃ ĐƯỢC CHECK-IN */}
                    {isViewingLastDay && isAllLocationsCheckedIn && (
                      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-4 text-white shadow-lg space-y-2.5 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <CheckCheck className="w-5 h-5 text-yellow-300" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs uppercase tracking-wide">
                              Đã hoàn thành toàn bộ lộ trình tour!
                            </h4>
                            <p className="text-[11px] text-emerald-100">
                              Tất cả các điểm đến đã được check-in đầy đủ.
                            </p>
                          </div>
                        </div>

                        {currentSchedule.wrapUpReport ? (
                          <div className="bg-white/15 rounded-xl p-2.5 text-xs">
                            <span className="font-bold text-yellow-200 block">
                              ✓ Tour đã được nghiệm thu kết thúc!
                            </span>
                            <p className="text-[11px] text-white/90 italic mt-0.5">
                              "{currentSchedule.wrapUpReport.notes || "Tour kết thúc thành công."}"
                            </p>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setShowWrapUpModal(true)}
                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-extrabold text-xs h-10 rounded-xl shadow-md flex items-center justify-center gap-2"
                          >
                            <Award className="w-4 h-4 text-slate-950" />
                            <span>Báo Cáo Hoàn Thành & Kết Thúc Tour</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------------------------------------------------ */}
                {/* SUB-TAB 2: ĐIỂM DANH (TÊN, SĐT, CHECKBOX BÊN PHẢI, GHI CHÚ) */}
                {/* ------------------------------------------------------------ */}
                {operationSubTab === "rollcall" && (
                  <div className="space-y-3.5">
                    {/* Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold mb-0.5">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Điểm danh khởi hành đoàn tour</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Tích checkbox để đánh dấu khách có mặt và điền ghi chú (nếu đi trễ, hẹn điểm đón khác...).
                      </p>
                    </div>

                    {operationError && <p role="alert" className="p-3 text-sm text-red-700">{operationError}</p>}
                {rollCallSavedNotice && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{rollCallSavedNotice}</span>
                      </div>
                    )}

                    {/* Stats bar */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase">
                          Tổng số
                        </span>
                        <span className="text-base font-extrabold text-slate-900">
                          {passengers.length}
                        </span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-[10px] text-emerald-700 font-bold block uppercase">
                          Đã có mặt
                        </span>
                        <span className="text-base font-extrabold text-emerald-600">
                          {presentCount}
                        </span>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-xl border border-rose-200 shadow-2xs">
                        <span className="text-[10px] text-rose-700 font-bold block uppercase">
                          Chưa đến
                        </span>
                        <span className="text-base font-extrabold text-rose-600">
                          {unmarkedCount}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action & Search */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={passengerSearch}
                          onChange={(e) => setPassengerSearch(e.target.value)}
                          placeholder="Tìm theo tên hoặc SĐT..."
                          className="w-full text-xs pl-8 pr-3 py-2 bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCheckAllPresent}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap bg-indigo-50 px-2.5 py-2 rounded-xl border border-indigo-200"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={handleUncheckAll}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 whitespace-nowrap bg-slate-100 px-2.5 py-2 rounded-xl border border-slate-200"
                      >
                        Bỏ chọn
                      </button>
                    </div>

                    {/* Passenger List: Tên, SĐT, Checkbox bên phải, Ghi chú */}
                    <div className="space-y-2.5">
                      {filteredPassengers.map((p, idx) => {
                        const isChecked = p.departureAttendance === "present";

                        return (
                          <div
                            key={p.id || idx}
                            className={`bg-white rounded-2xl border p-3 shadow-2xs transition-all space-y-2 ${
                              isChecked
                                ? "border-emerald-300 ring-1 ring-emerald-100 bg-emerald-50/20"
                                : "border-slate-200"
                            }`}
                          >
                            {/* Tên & SĐT bên trái, Checkbox Có mặt bên phải */}
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                                  {p.fullName}
                                </h5>
                                {p.phone ? (
                                  <a
                                    href={`tel:${p.phone}`}
                                    className="text-[#F97316] font-semibold text-[11px] flex items-center gap-1 hover:underline mt-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{p.phone}</span>
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    Chưa có số điện thoại
                                  </span>
                                )}
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) =>
                                    handleTogglePassengerPresent(
                                      p.id,
                                      e.target.checked
                                    )
                                  }
                                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                                />
                                <span
                                  className={`text-xs font-extrabold ${
                                    isChecked
                                      ? "text-emerald-700"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {isChecked ? "Có mặt" : "Chưa đến"}
                                </span>
                              </label>
                            </div>

                            {/* Ô ghi chú riêng cho từng khách */}
                            <div>
                              <input
                                type="text"
                                value={p.notes || ""}
                                onChange={(e) =>
                                  handleUpdatePassengerNote(p.id, e.target.value)
                                }
                                placeholder="Ghi chú (VD: đi trễ 10p, đón tại Cổng 2...)"
                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-400 rounded-lg focus:outline-hidden transition-colors"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <Button
                        onClick={handleSaveDepartureRollCall} disabled={operationSaving}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs h-10 rounded-xl shadow-md flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lưu & Chốt Danh Sách Điểm Danh Khởi Hành</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------ */}
                {/* SUB-TAB 3: GHI CHÚ (CHỈ GIỮ "SỔ TAY GHI CHÉP NHANH")           */}
                {/* ------------------------------------------------------------ */}
                {operationSubTab === "notes" && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <NotebookPen className="w-4 h-4 text-indigo-600" />
                          Sổ Tay Ghi Chép Nhanh Của HDV
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Lưu trữ thông tin tự do phục vụ dẫn đoàn
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveFreeformNotes}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl h-8 px-3 shadow-xs"
                      >
                        Lưu sổ tay
                      </Button>
                    </div>

                    {noteSavedNotice && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{noteSavedNotice}</span>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
                      <Textarea
                        rows={12}
                        value={freeformNotes}
                        onChange={(e) => setFreeformNotes(e.target.value)}
                        placeholder="Gõ nhanh ghi chú tại hiện trường:
- Số điện thoại Bác tài & Biển số xe
- Khách cần hỗ trợ đặc biệt (ăn chay, say xe, người lớn tuổi)
- Dặn dò mốc giờ tập trung sáng mai
- Các phát sinh chi phí hoặc hóa đơn thực địa..."
                        className="text-xs font-mono leading-relaxed"
                      />

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>Đã nhập: {freeformNotes.length} ký tự</span>
                        <Button
                          size="sm"
                          onClick={handleSaveFreeformNotes}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl h-8 px-3"
                        >
                          Lưu Thay Đổi
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------ */}
                {/* SUB-TAB 4: SỰ CỐ (HIỂN THỊ CÁC ĐỢT BÁO CÁO SỰ CỐ NẾU CÓ)       */}
                {/* ------------------------------------------------------------ */}
                {operationSubTab === "incidents" && (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        Danh Sách Báo Cáo Sự Cố ({localIncidents.length})
                      </h4>
                      <Button
                        size="sm"
                        onClick={() => {
                          setIncidentLocation("");
                          setShowIncidentModal(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl h-8 px-3 shadow-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Báo sự cố mới</span>
                      </Button>
                    </div>

                    {localIncidents.length === 0 ? (
                      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs">
                        <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <h5 className="font-bold text-slate-800 text-xs">
                          Tour đang diễn ra an toàn
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Chưa có sự cố nào được ghi nhận trong chuyến đi.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {localIncidents.map((inc) => (
                          <div
                            key={inc.id}
                            className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    inc.severity === "critical"
                                      ? "bg-rose-600 text-white animate-pulse"
                                      : inc.severity === "high"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {inc.severity === "critical"
                                    ? "🚨 Khẩn cấp"
                                    : inc.severity === "high"
                                    ? "Mức cao"
                                    : "Trung bình"}
                                </span>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                                  {inc.category === "medical"
                                    ? "Y tế"
                                    : inc.category === "transport"
                                    ? "Giao thông"
                                    : inc.category === "weather"
                                    ? "Thời tiết"
                                    : "Khác"}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-400">
                                {inc.reportedAt}
                              </span>
                            </div>

                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {inc.description}
                            </p>

                            {inc.location && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                <span>{inc.location}</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  inc.status === "resolved"
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {inc.status === "resolved" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Đã xử lý xong
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5" />
                                    Đang phối hợp giải quyết
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ============================================================== */}
          {/* BOTTOM NAVIGATION BAR: 2 PRIMARY TABS                          */}
          {/* ============================================================== */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex items-center justify-around z-30 shadow-lg ${
              isMobileFrame ? "rounded-b-[36px]" : "rounded-b-3xl"
            }`}
          >
            {/* TAB 1: LỊCH TOUR */}
            <button
              onClick={() => setActiveTab("calendar")}
              className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-all ${
                activeTab === "calendar"
                  ? "text-indigo-600 font-extrabold scale-105"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">Lịch tour</span>
            </button>

            {/* TAB 2: ĐIỀU HÀNH TOUR (GỒM LỘ TRÌNH, ĐIỂM DANH, GHI CHÚ, SỰ CỐ) */}
            <button
              onClick={() => {
                setActiveTab("operation");
              }}
              className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-all relative ${
                activeTab === "operation"
                  ? "text-indigo-600 font-extrabold scale-105"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Compass className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">Điều hành tour</span>
              {unmarkedCount > 0 && (
                <span className="absolute top-1 right-10 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}

      {/* OPTIONAL CHECK-IN MODAL (ẢNH VÀ GHI CHÚ TÙY CHỌN) */}
      <Dialog
        open={!!checkingInLocation}
        onOpenChange={(open) => !open && setCheckingInLocation(null)}
      >
        <DialogContent className="max-w-sm p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              Check-in điểm đến (Ảnh & ghi chú tùy chọn)
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              {checkingInLocation?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="bg-slate-100 rounded-xl h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden">
              {checkInImage ? (
                <img
                  src={checkInImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-3">
                  <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-slate-600 block">
                    Chụp ảnh thực địa (Không bắt buộc)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Bấm ảnh mẫu bên dưới nếu muốn đính kèm
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setCheckInImage(
                    "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?w=600"
                  )
                }
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded"
              >
                + Ảnh mẫu 1
              </button>
              <button
                type="button"
                onClick={() =>
                  setCheckInImage(
                    "https://images.unsplash.com/photo-1520454125516-134a66d9bf78?w=600"
                  )
                }
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded"
              >
                + Ảnh mẫu 2
              </button>
              {checkInImage && (
                <button
                  type="button"
                  onClick={() => setCheckInImage("")}
                  className="text-[10px] text-rose-600 hover:underline font-bold px-2 py-1 ml-auto"
                >
                  Xóa ảnh
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ghi chú tình hình đoàn (Không bắt buộc)
              </label>
              <input
                type="text"
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                placeholder="VD: Đoàn đến đúng giờ, thời tiết đẹp..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCheckingInLocation(null)}
                className="text-xs"
              >
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmOptionalCheckIn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Xác nhận Check-in
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CREATE INCIDENT MODAL */}
      <Dialog
        open={showIncidentModal}
        onOpenChange={(open) => !open && setShowIncidentModal(false)}
      >
        <DialogContent className="max-w-sm p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Báo cáo sự cố khẩn cấp
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              Gửi thông tin về trung tâm điều hành lữ hành
            </DialogDescription>
          </DialogHeader>{operationError && <p role="alert" className="text-sm text-red-700">{operationError}</p>}

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Phân loại sự cố
              </label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
              >
                <option value="medical">🚑 Y tế & Sức khỏe thành viên</option>
                <option value="transport">🚌 Xe cộ & Giao thông di chuyển</option>
                <option value="weather">⛈️ Thời tiết cực đoan & Thiên tai</option>
                <option value="service_provider">🏨 Đối tác khách sạn / nhà hàng</option>
                <option value="other">📌 Tình huống khác</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Địa điểm xảy ra
              </label>
              <Input
                value={incidentLocation}
                onChange={(e) => setIncidentLocation(e.target.value)}
                placeholder="VD: Km 45 Quốc lộ 20, Nhà hàng..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Mô tả chi tiết sự việc
              </label>
              <Textarea
                rows={3}
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                placeholder="Mô tả sự việc và các hành động xử lý đã triển khai..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowIncidentModal(false)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={operationSaving || !incidentDescription.trim()}
                onClick={handleCreateIncident}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Gửi Báo Cáo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QUICK HOTLINE MODAL (SOS 24/7) */}
      <Dialog open={showHotlineModal} onOpenChange={setShowHotlineModal}>
        <DialogContent className="max-w-sm p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Đường Dây Nóng Khẩn Cấp 24/7
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              Bấm số để gọi nhanh hỗ trợ trực tiếp
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <a
              href="tel:0909123456"
              className="bg-[#F97316]/10 hover:bg-[#E0F2FE] p-2.5 rounded-xl border border-[#CBD5E1] text-left transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-blue-900 block">Điều hành Tour</span>
                <span className="text-[11px] text-[#F97316] font-mono">0909 123 456</span>
              </div>
            </a>

            <a
              href="tel:115"
              className="bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-200 text-left transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-rose-900 block">Cấp cứu 115</span>
                <span className="text-[11px] text-rose-600 font-mono">Y tế khẩn</span>
              </div>
            </a>

            <a
              href="tel:113"
              className="bg-amber-50 hover:bg-amber-100 p-2.5 rounded-xl border border-amber-200 text-left transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">Cảnh sát 113</span>
                <span className="text-[11px] text-amber-600 font-mono">An ninh</span>
              </div>
            </a>

            <a
              href="tel:114"
              className="bg-orange-50 hover:bg-orange-100 p-2.5 rounded-xl border border-orange-200 text-left transition-colors flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-bold text-orange-900 block">Cứu nạn 114</span>
                <span className="text-[11px] text-orange-600 font-mono">Cứu hộ</span>
              </div>
            </a>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHotlineModal(false)}
              className="text-xs"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TOUR WRAP-UP MODAL (BÁO CÁO KẾT THÚC TOUR) */}
      <Dialog open={showWrapUpModal} onOpenChange={setShowWrapUpModal}>
        <DialogContent className="max-w-sm p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              Tổng kết & Báo Cáo Kết Thúc Tour
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              Báo cáo hoàn thành tour cho điều hành lữ hành
            </DialogDescription>
          </DialogHeader>

          {wrapUpSuccess ? (
            <div className="py-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-sm text-slate-900">
                Đã gửi báo cáo kết thúc tour!
              </h4>
              <p className="text-xs text-slate-500">
                Cảm ơn bạn đã hoàn thành xuất sắc toàn bộ lộ trình tour.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ghi chú tổng kết chuyến đi của HDV
                </label>
                <Textarea
                  rows={4}
                  value={wrapUpNotes}
                  onChange={(e) => setWrapUpNotes(e.target.value)}
                  placeholder="Ghi nhận tình hình chung của đoàn, phản hồi về đối tác khách sạn/nhà hàng hoặc các đề xuất cho chuyến đi sau..."
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWrapUpModal(false)}
                  className="text-xs"
                >
                  Đóng
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmWrapUp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Xác Nhận Kết Thúc Tour
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}