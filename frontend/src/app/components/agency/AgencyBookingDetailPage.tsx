import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from "@/app/components/ui/alert-dialog";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { toast } from "@/app/lib/notifications";
import { confirmAction } from "@/app/lib/notificationDialogs";
import { bookingRefusalReason, bookingCancellationReason } from "@/app/lib/bookingRefusal";
import { PartnerBookingRevenue } from "./PartnerBookingRevenue";
import { BookingStagePassengers } from "./BookingStagePassengers";
import { BookingFinancialChangesPanel } from "./BookingFinancialChangesPanel";
import { BookingSurchargeDialog } from "./BookingSurchargeDialog";
import { VietnameseMoneyInput } from "@/app/components/ui/VietnameseMoneyInput";
import { BookingServicePicker, type BookingReplacement } from "./BookingServicePicker";
import { VietnameseDatePicker } from "@/app/components/ui/VietnameseDatePicker";
import { useState, useMemo, useEffect, useRef } from "react";
import { http } from "@/app/lib/http";
import { useBookingSupplierState } from "@/app/hooks/useBookingSupplierState";
import {
  Booking,
  User,
  TourContract,
  CustomLocationChange,
  CustomHotelChange,
  CustomMealChange,
  BookingPassenger,
  TourCoHost,
  BookingPriceAdjustment,
  BookingAgencyShare,
  BookingAssignedGuide,
  BookingAttractionCheckin,
  BookingIncident,
  AttractionAttendanceStatus,
  IncidentCategory,
  IncidentStatus,
  Location,
} from "@/app/types";
import { formatVietnamDateTime, formatVietnamDeadline } from "@/app/services/payos";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Users,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  AlertTriangle,
  Info,
  Check,
  Building2,
  Utensils,
  ArrowRight,
  Printer,
  Sparkles,
  Home,
  Star,
  ChevronDown,
  ChevronUp,
  Sun,
  UtensilsCrossed,
  Edit3,
  Handshake,
  ShieldCheck,
  ExternalLink,
  Download,
  Tag,
  CheckSquare,
  Square,
  Trash2,
  Edit,
  UserPlus,
  UserMinus,
  RotateCcw,
  Zap,
  Flag,
  History,
  X,
  Lock,
  AlertCircle,
  Camera,
  Eye,
  RefreshCw,
  CheckCheck,
  Navigation,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/app/components/ui/popover";
import { mockUsers } from "@/app/data/mockData";
import { ServiceBlogDetailModal } from "@/app/components/service/ServiceBlogDetailModal";
import { BookingSupplierConfirmation } from "./BookingSupplierConfirmation";
import { useServiceCatalogue } from "@/app/contexts/ServiceCatalogue";
import { providerResponseInstant } from "@/app/lib/bookingSupplierStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { CancellationStatusCard } from "@/app/components/common/CancellationStatusCard";
import { ContractCard } from "@/app/components/common/ContractCard";
import { fromApiBooking, getAgencyCancellationQuote, type CancellationQuoteDto } from "@/app/services/wf05Bookings";

interface AgencyBookingDetailPageProps {
  booking: Booking;
  guides: User[];
  companyName: string;
  companyId?: string;
  onBack: () => void;
  onApproveBooking: (bookingId: string) => void | Promise<boolean | void>;
  onRejectBooking: (bookingId: string, reason?: string) => void;
  onAssignGuide: (bookingId: string, guideId: string) => void;
  onUpdateAssignedGuides?: (bookingId: string, guides: BookingAssignedGuide[]) => void;
  onMarkDepositPaid?: (bookingId: string) => void;
  onMarkFullyPaid?: (bookingId: string) => void;
  onUpdateBookingPrice?: (bookingId: string, newPrice: number, note?: string, adjustment?: Partial<BookingPriceAdjustment>) => void | Promise<boolean>;
  onBookingChanged?: (booking: import("@/app/services/wf05Bookings").BookingDto) => void;
  onUpdateBookingPassengers?: (bookingId: string, passengers: BookingPassenger[]) => void;
  onUpdateBookingAgencies?: (bookingId: string, agencies: BookingAgencyShare[]) => void;
  onUpdateAttractionCheckins?: (bookingId: string, checkins: BookingAttractionCheckin[]) => void;
  onUpdateIncidents?: (bookingId: string, incidents: BookingIncident[]) => void;
  /** Agency hủy đơn: chưa có tiền thì hủy ngay; đã có tiền thì gửi yêu cầu chờ Admin duyệt. */
  onCancelBooking?: (bookingId: string, reason: string) => Promise<boolean>;
  /** Agency kiểm tra bản hợp đồng khách đã ký. */
  onReviewContract?: (bookingId: string, decision: "verify" | "resign", note?: string) => Promise<boolean>;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed: { label: "Đã xác nhận", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-800 border-red-200" },
  completed: { label: "Hoàn thành", color: "bg-[#E0F2FE] text-blue-800 border-[#CBD5E1]" },
  rejected: { label: "Từ chối", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

const paymentStatusMap: Record<NonNullable<Booking["paymentStatus"]>, { label: string; color: string }> = {
  unpaid: { label: "Chưa thanh toán", color: "bg-red-50 text-red-700 border-red-200" },
  partially_paid: { label: "Đã thanh toán một phần", color: "bg-sky-50 text-sky-800 border-sky-200" },
  paid: { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  refunded: { label: "Đã hoàn tiền", color: "bg-[#F0F9FF] text-[#EA580C] border-[#F97316]/30" },
};

const MEAL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  breakfast: { label: "Sáng", icon: Sun, color: "text-amber-700 bg-amber-50 border-amber-200" },
  lunch: { label: "Trưa", icon: Utensils, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  dinner: { label: "Tối", icon: UtensilsCrossed, color: "text-[#EA580C] bg-[#F0F9FF] border-[#F97316]/30" },
};

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const clean = timeStr.trim().toLowerCase();
  const match = clean.match(/(\d{1,2})(?:[:h](\d{0,2}))?/i);
  if (!match) return 9999;
  const hours = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + mins;
}


function calculateAge(dobStr?: string, refDateStr?: string): number | null {
  if (!dobStr) return null;
  const parts = dobStr.includes("-") ? dobStr.split("-") : dobStr.split("/");
  let birthDate: Date;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  } else {
    birthDate = new Date(dobStr);
  }
  if (isNaN(birthDate.getTime())) return null;

  const targetDate = refDateStr ? new Date(refDateStr) : new Date();
  if (isNaN(targetDate.getTime())) return null;

  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const m = targetDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

export function AgencyBookingDetailPage({
  booking,
  guides,
  companyName,
  companyId,
  onBack,
  onApproveBooking,
  onRejectBooking,
  onAssignGuide,
  onUpdateAssignedGuides,
  onMarkDepositPaid,
  onMarkFullyPaid,
  onUpdateBookingPrice,
  onBookingChanged,
  onUpdateBookingPassengers,
  onUpdateBookingAgencies,
  onUpdateAttractionCheckins,
  onUpdateIncidents,
  onCancelBooking,
  onReviewContract,
}: AgencyBookingDetailPageProps) {
  const services = useServiceCatalogue();
  const agencyNameFor=(id?:string)=>booking.agencyDirectory?.find(a=>a.agencyId===id)?.agencyName
    || booking.bookingAgencies?.find(a=>a.agencyId===id)?.agencyName
    || (id===booking.companyId?booking.companyName:undefined) || "Agency chưa xác định";
  const ownsItem=(id?:string)=>!!companyId && (id||booking.companyId)===companyId;
  const currentQuotationState = useBookingSupplierState(booking.id);
  const [approvingBooking, setApprovingBooking] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  // Hủy đơn đã duyệt (Agency): xem trước hệ quả do máy chủ tính rồi mới gửi.
  const [agencyCancelOpen, setAgencyCancelOpen] = useState(false);
  const [agencyCancelReason, setAgencyCancelReason] = useState("");
  const [agencyCancelQuote, setAgencyCancelQuote] = useState<CancellationQuoteDto | null>(null);
  const [agencyCancelError, setAgencyCancelError] = useState("");
  const [agencyCancelling, setAgencyCancelling] = useState(false);
  const agencyCancellationPending =
    booking.cancellation?.status === "Pending" || booking.cancellation?.status === "Reviewing";
  const openAgencyCancel = async () => {
    setAgencyCancelOpen(true);
    setAgencyCancelQuote(null);
    setAgencyCancelError("");
    try {
      setAgencyCancelQuote(await getAgencyCancellationQuote(Number(booking.id)));
    } catch (err) {
      setAgencyCancelError(err instanceof Error ? err.message : "Không tải được thông tin hủy.");
    }
  };
  const submitAgencyCancel = async () => {
    if (agencyCancelReason.trim().length < 3) {
      setAgencyCancelError("Vui lòng nhập lý do hủy (gửi cho khách và Admin).");
      return;
    }
    if (!onCancelBooking) return;
    setAgencyCancelling(true);
    const ok = await onCancelBooking(booking.id, agencyCancelReason.trim());
    setAgencyCancelling(false);
    if (ok) {
      setAgencyCancelOpen(false);
      setAgencyCancelReason("");
    }
  };
  const [rejectReason, setRejectReason] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [priceNoteInput, setPriceNoteInput] = useState("");
  const [priceAdjustmentsModalOpen, setPriceAdjustmentsModalOpen] = useState(false);

  // Assigned Guides State (supporting multiple guides per tour & ownership)
  const [assignedGuides, setAssignedGuides] = useState<BookingAssignedGuide[]>(() => {
    if (booking.assignedGuides && booking.assignedGuides.length > 0) {
      return booking.assignedGuides;
    }
    if (booking.guideName && booking.guideId) {
      return [
        {
          id: `bag-${booking.id}-legacy`,
          guideId: booking.guideId,
          guideName: booking.guideName,
          guidePhone: booking.guidePhone,
          guideAvatar: booking.guideAvatar,
          companyId: booking.companyId || companyId || "",
          companyName: booking.companyName || companyName || "",
          role: "lead_guide",
          notes: "HDV Trưởng đoàn",
          assignedAt: booking.bookingDate || new Date().toISOString().split("T")[0],
        },
      ];
    }
    return [];
  });

  // Assign Guide Modal states
  const [selectedGuideToAdd, setSelectedGuideToAdd] = useState<string>("");
  const [selectedGuideRole, setSelectedGuideRole] = useState<string>("lead_guide");
  const [selectedGuideNotes, setSelectedGuideNotes] = useState<string>("");

  // Replace Guide Modal states
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [guideToReplace, setGuideToReplace] = useState<BookingAssignedGuide | null>(null);
  const [newReplacementGuideId, setNewReplacementGuideId] = useState<string>("");

  // Stage list and Co-host Alliance support
  const stagesList: TourCoHost[] = useMemo(() => booking.coHosts ?? booking.tour?.coHosts ?? [], [booking]);
  const isCoHostedTour = booking.isCoHosted ?? (stagesList.length > 1);

  // Agencies List state (representing booking_agencies table)
  // Agencies List state (representing booking_agencies table)
  const [agenciesList, setAgenciesList] = useState<BookingAgencyShare[]>(() => {
    if (booking.bookingAgencies && booking.bookingAgencies.length > 0) {
      return booking.bookingAgencies.map((ba, idx) => {
        const isHost = Boolean(
          ba.isHost !== undefined
            ? ba.isHost
            : ba.agencyId === booking.companyId ||
              (booking.coHosts && booking.coHosts.find((c) => c.companyId === ba.agencyId)?.role === "lead") ||
              idx === 0
        );
        return {
          ...ba,
          isHost,
          role: isHost ? ("lead" as const) : ("partner" as const),
        };
      });
    }
    const cHosts = booking.coHosts ?? booking.tour?.coHosts ?? [];
    if (cHosts.length > 0) {
      return cHosts.map((ch, idx) => {
        const isLead = ch.role === "lead" || ch.companyId === booking.companyId || idx === 0;
        const count = booking.numberOfGuests || 1;
        const quote = ch.fixedPayoutAmount || (ch.quotePerGuest || (ch.quoteAdult ?? 2000000)) * count;
        return {
          id: `ba-${booking.id}-${idx}`,
          bookingId: booking.id,
          agencyId: ch.companyId,
          agencyName: ch.companyName,
          isHost: isLead,
          role: isLead ? ("lead" as const) : ("partner" as const),
          originalAmount: quote,
          finalAmount: quote,
          confirmationStatus: booking.status !== "pending" ? ("confirmed" as const) : ("pending" as const),
          quoteConfirmed: booking.status !== "pending",
          settlementStatus: "unpaid" as const,
        };
      });
    }
    return [
      {
        id: `ba-${booking.id}-main`,
        bookingId: booking.id,
        agencyId: booking.companyId ?? companyId ?? "",
        agencyName: booking.companyName ?? companyName ?? "",
        isHost: true,
        role: "lead" as const,
        originalAmount: booking.totalPrice,
        finalAmount: booking.totalPrice,
        confirmationStatus: booking.status !== "pending" ? ("confirmed" as const) : ("pending" as const),
        quoteConfirmed: booking.status !== "pending",
        settlementStatus: "unpaid" as const,
      },
    ];
  });

  // Determine current company's role (Lead vs Partner)
  const isCurrentCompanyLead = useMemo(() => {
    if (companyId) {
      if (companyId === booking.companyId) return true;
      const myAgency = agenciesList.find((a) => a.agencyId === companyId);
      if (myAgency) return Boolean(myAgency.isHost || (myAgency as any).role === "lead");
      const myCoHost = (booking.coHosts ?? booking.tour?.coHosts)?.find((c) => c.companyId === companyId);
      if (myCoHost) return myCoHost.role === "lead";
      return false;
    }
    if (companyName) {
      if (companyName === booking.companyName) return true;
      const myAgencyByName = agenciesList.find((a) => a.agencyName === companyName);
      if (myAgencyByName) return Boolean(myAgencyByName.isHost || (myAgencyByName as any).role === "lead");
      const myCoHostByName = (booking.coHosts ?? booking.tour?.coHosts)?.find((c) => c.companyName === companyName);
      if (myCoHostByName) return myCoHostByName.role === "lead";
    }
    return true;
  }, [agenciesList, companyId, companyName, booking]);

  const currentAgency = useMemo(() => {
    if (companyId) {
      return agenciesList.find((a) => a.agencyId === companyId) || agenciesList[0];
    }
    return agenciesList.find((a) => a.agencyName === companyName) || agenciesList[0];
  }, [agenciesList, companyId, companyName]);

  const leadAgency = useMemo(() => {
    return (
      agenciesList.find((a) => a.isHost || (a as any).role === "lead" || a.agencyId === booking.companyId) ||
      agenciesList[0]
    );
  }, [agenciesList, booking.companyId]);

  // Stage filters and Modals
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [passengerToDeactivate, setPassengerToDeactivate] = useState<BookingPassenger | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [happyCaseModalOpen, setHappyCaseModalOpen] = useState(false);

  // ----------------------------------------------------
  // GUIDES BELONGING TO CURRENT AGENCY (for assignment)
  // ----------------------------------------------------
  const myAgencyGuides = useMemo(() => {
    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";
    const myAgencyName = companyName || currentAgency?.agencyName || booking.companyName || "";
    const fromAssigned = assignedGuides.filter(
      (ag) => ag.companyId === myAgencyId || (ag.companyName && ag.companyName === myAgencyName)
    );
    if (fromAssigned.length > 0) return fromAssigned;
    return guides.map((g) => ({
      id: `bag-${g.id}`,
      guideId: g.id,
      guideName: g.name,
      guidePhone: g.phone,
      guideAvatar: g.avatar,
      companyId: myAgencyId,
      companyName: myAgencyName,
      role: "lead_guide" as const,
      notes: "HDV Công ty",
      assignedAt: booking.bookingDate || new Date().toISOString().split("T")[0],
    }));
  }, [assignedGuides, guides, companyId, companyName, currentAgency, booking]);

  // ----------------------------------------------------
  // ALL COMPANY GUIDES FOR QUICK INLINE ATTRACTION ASSIGNMENT
  // ----------------------------------------------------
  const companyAllGuides = useMemo(() => {
    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";

    const guideMap = new Map<string, { guideId: string; guideName: string; guidePhone?: string; guideAvatar?: string }>();

    // 1. Guides already assigned to this booking
    assignedGuides.forEach((ag) => {
      guideMap.set(ag.guideId, {
        guideId: ag.guideId,
        guideName: ag.guideName,
        guidePhone: ag.guidePhone,
        guideAvatar: ag.guideAvatar,
      });
    });

    // 2. All company guides from `guides` prop
    guides.forEach((g) => {
      if (!g.companyId || g.companyId === myAgencyId) {
        if (!guideMap.has(g.id)) {
          guideMap.set(g.id, {
            guideId: g.id,
            guideName: g.name,
            guidePhone: g.phone,
            guideAvatar: g.avatar,
          });
        }
      }
    });

    // Fallback: if empty, add from mockUsers
    if (guideMap.size === 0) {
      mockUsers.filter((u) => u.role === "guide" && (!u.companyId || u.companyId === myAgencyId)).forEach((g) => {
        guideMap.set(g.id, {
          guideId: g.id,
          guideName: g.name,
          guidePhone: g.phone,
          guideAvatar: g.avatar,
        });
      });
    }

    return Array.from(guideMap.values());
  }, [assignedGuides, guides, companyId, currentAgency, booking]);

  // ----------------------------------------------------
  // INLINE TOGGLE GUIDE ASSIGNMENT FOR SPECIFIC ATTRACTION
  // ----------------------------------------------------
  const handleToggleGuideForAttraction = (
    attractionId: string,
    attractionName: string,
    dayNumber: number,
    guide: { guideId: string; guideName: string; guidePhone?: string; guideAvatar?: string }
  ) => {
    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";
    const myAgencyName = companyName || currentAgency?.agencyName || booking.companyName || "Công ty điều phối";

    const existingCheckin = attractionCheckins.find(
      (c) =>
        (c.bookingTimelineAttractionId === attractionId || (c.locationName === attractionName && c.dayNumber === dayNumber)) &&
        c.guideId === guide.guideId
    );

    let updatedCheckins: BookingAttractionCheckin[];

    if (existingCheckin) {
      // Remove this guide's checkin for this attraction
      updatedCheckins = attractionCheckins.filter((c) => c.id !== existingCheckin.id);
    } else {
      // Add new checkin record
      const newCheckin: BookingAttractionCheckin = {
        id: `bac-${booking.id}-${dayNumber}-${attractionId}-${guide.guideId}-${Date.now()}`,
        bookingId: booking.id,
        bookingTimelineAttractionId: attractionId,
        locationName: attractionName,
        dayNumber: dayNumber,
        scheduledTime: "08:30",
        agencyId: myAgencyId,
        agencyName: myAgencyName,
        guideId: guide.guideId,
        guideName: guide.guideName,
        guidePhone: guide.guidePhone,
        guideAvatar: guide.guideAvatar,
        attendanceStatus: "PENDING",
        createdAt: new Date().toISOString(),
      };
      updatedCheckins = [...attractionCheckins, newCheckin];

      // Ensure guide is registered in assignedGuides
      if (!assignedGuides.some((ag) => ag.guideId === guide.guideId)) {
        const newAssignedGuide: BookingAssignedGuide = {
          id: `bag-${booking.id}-${guide.guideId}`,
          guideId: guide.guideId,
          guideName: guide.guideName,
          guidePhone: guide.guidePhone,
          guideAvatar: guide.guideAvatar,
          companyId: myAgencyId,
          companyName: myAgencyName,
          role: "stage_guide",
          notes: `HDV phân công bổ sung tại điểm ${attractionName}`,
          assignedAt: new Date().toISOString().split("T")[0],
        };
        const updatedAssigned = [...assignedGuides, newAssignedGuide];
        setAssignedGuides(updatedAssigned);
        if (onUpdateAssignedGuides) {
          onUpdateAssignedGuides(booking.id, updatedAssigned);
        }
      }
    }

    setAttractionCheckins(updatedCheckins);
    if (onUpdateAttractionCheckins) {
      onUpdateAttractionCheckins(booking.id, updatedCheckins);
    }
  };

  // ----------------------------------------------------
  // FLAT LIST OF ALL ATTRACTIONS ACROSS DAYS (with agency ownership)
  // ----------------------------------------------------
  const allItineraryAttractions = useMemo(() => {
    const list: Array<{
      dayNumber: number;
      dayTitle: string;
      location: Location;
      responsibleAgencyId: string;
      responsibleAgencyName: string;
      isMyAgencyAttraction: boolean;
    }> = [];

    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";

    booking.tour?.itinerary?.forEach((day) => {
      day.locations?.forEach((loc) => {
        const agencyId = loc.createdByCompanyId || day.createdByCompanyId || booking.companyId || myAgencyId;
        const agencyName = agencyNameFor(agencyId);
        const isMine = agencyId === myAgencyId;

        list.push({
          dayNumber: day.day,
          dayTitle: day.title,
          location: loc,
          responsibleAgencyId: agencyId,
          responsibleAgencyName: agencyName,
          isMyAgencyAttraction: isMine,
        });
      });
    });

    return list;
  }, [booking, companyId, currentAgency, agenciesList]);

  // ----------------------------------------------------
  // BOOKING ATTRACTION CHECK-INS (booking_attraction_checkins)
  // ----------------------------------------------------
  const [attractionCheckins, setAttractionCheckins] = useState<BookingAttractionCheckin[]>(() => {
    if (booking.attractionCheckins && booking.attractionCheckins.length > 0) {
      return booking.attractionCheckins;
    }
    const generated: BookingAttractionCheckin[] = [];
    const itinerary = booking.tour?.itinerary || [];
    const myAgencyId = companyId || booking.companyId || "company-1";
    const myAgencyName = companyName || booking.companyName || "Công ty điều phối";
    const initialGuides = assignedGuides.length > 0 ? assignedGuides : [
      {
        id: `bag-default`,
        guideId: booking.guideId || guides[0]?.id || "guide-1",
        guideName: booking.guideName || guides[0]?.name || "Trần Thị Bích",
        guidePhone: booking.guidePhone || guides[0]?.phone,
        guideAvatar: booking.guideAvatar || guides[0]?.avatar,
        companyId: myAgencyId,
        companyName: myAgencyName,
      },
    ];

    itinerary.forEach((day) => {
      day.locations?.forEach((loc, idx) => {
        const locAgencyId = loc.createdByCompanyId || day.createdByCompanyId || booking.companyId || myAgencyId;
        const locAgencyName = agencyNameFor(locAgencyId);
        const agencyGuides = initialGuides.filter((g) => g.companyId === locAgencyId);
        const targetGuides = agencyGuides;

        targetGuides.forEach((g) => {
          generated.push({
            id: `bac-${booking.id}-${day.day}-${loc.id || idx}-${g.guideId}`,
            bookingId: booking.id,
            bookingTimelineAttractionId: loc.id || `loc-${day.day}-${idx}`,
            locationName: loc.name,
            dayNumber: day.day,
            scheduledTime: loc.time || "08:30",
            agencyId: locAgencyId,
            agencyName: locAgencyName,
            guideId: g.guideId,
            guideName: g.guideName,
            guidePhone: g.guidePhone,
            guideAvatar: g.guideAvatar,
            attendanceStatus: "PENDING",
            createdAt: booking.bookingDate || new Date().toISOString(),
          });
        });
      });
    });
    return generated;
  });

  // ----------------------------------------------------
  // BOOKING INCIDENTS (booking_incidents - no severity field)
  // ----------------------------------------------------
  const [incidents, setIncidents] = useState<BookingIncident[]>(() => {
    return booking.incidents || [];
  });

  // ----------------------------------------------------
  // ATTRACTION ASSIGNMENT MODAL STATES
  // ----------------------------------------------------
  const [assignAttractionsModalOpen, setAssignAttractionsModalOpen] = useState(false);
  const [assignPresetMode, setAssignPresetMode] = useState<"single" | "co_guides" | "custom">("single");
  const [selectedSingleGuideId, setSelectedSingleGuideId] = useState<string>("");
  const [selectedMultiGuideIds, setSelectedMultiGuideIds] = useState<string[]>([]);
  const [customAttractionGuideMap, setCustomAttractionGuideMap] = useState<Record<string, string[]>>({});

  // ----------------------------------------------------
  // ITINERARY SUB-TAB & FILTERS (NO BUS/XE MENTION!)
  // ----------------------------------------------------
  const [itinerarySubTab, setItinerarySubTab] = useState<"standard" | "live_checkin" | "incidents">("standard");
  const [trackerGuideFilter, setTrackerGuideFilter] = useState<string>("all");
  const [trackerDayFilter, setTrackerDayFilter] = useState<string>("all");

  // ----------------------------------------------------
  // PROOF IMAGE PREVIEW MODAL
  // ----------------------------------------------------
  const [previewProofModalOpen, setPreviewProofModalOpen] = useState(false);
  const [proofPreviewData, setProofPreviewData] = useState<{
    title: string;
    image: string;
    time?: string;
    note?: string;
    guideName?: string;
  } | null>(null);

  // Open Assignment Modal with prefilled data
  const handleOpenAssignAttractionsModal = () => {
    if (myAgencyGuides.length > 0) {
      setSelectedSingleGuideId(myAgencyGuides[0].guideId);
      setSelectedMultiGuideIds(myAgencyGuides.map((g) => g.guideId));
    }
    const currentMap: Record<string, string[]> = {};
    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";
    allItineraryAttractions.forEach((item) => {
      const locId = item.location.id;
      const assignedForThisLoc = attractionCheckins
        .filter((c) => c.bookingTimelineAttractionId === locId && c.agencyId === myAgencyId)
        .map((c) => c.guideId);
      currentMap[locId] =
        assignedForThisLoc.length > 0
          ? assignedForThisLoc
          : myAgencyGuides[0]
          ? [myAgencyGuides[0].guideId]
          : [];
    });
    setCustomAttractionGuideMap(currentMap);
    setAssignAttractionsModalOpen(true);
  };

  // Save Assignment across attractions with 3 Presets & Alliance Guard
  const handleSaveAttractionAssignment = async () => {
    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";
    const myAgencyName = companyName || currentAgency?.agencyName || booking.companyName || "Công ty điều phối";

    // Keep partner checkins completely intact
    const partnerCheckins = attractionCheckins.filter((c) => c.agencyId !== myAgencyId);
    const myAttractions = allItineraryAttractions.filter((a) => a.isMyAgencyAttraction);

    if (myAttractions.length === 0) {
      toast.info("Công ty của bạn hiện không phụ trách điểm đến nào trong tour này để phân công.");
      return;
    }

    const newMyCheckins: BookingAttractionCheckin[] = [];

    if (assignPresetMode === "single") {
      const targetGuide = myAgencyGuides.find((g) => g.guideId === selectedSingleGuideId) || myAgencyGuides[0];
      if (!targetGuide) {
        toast.warning("Vui lòng chọn 1 Hướng dẫn viên!");
        return;
      }

      myAttractions.forEach((att) => {
        const existing = attractionCheckins.find(
          (c) => c.bookingTimelineAttractionId === att.location.id && c.guideId === targetGuide.guideId
        );
        newMyCheckins.push({
          id: existing ? existing.id : `bac-${booking.id}-${att.dayNumber}-${att.location.id}-${targetGuide.guideId}`,
          bookingId: booking.id,
          bookingTimelineAttractionId: att.location.id,
          locationName: att.location.name,
          dayNumber: att.dayNumber,
          scheduledTime: att.location.time || "08:30",
          agencyId: myAgencyId,
          agencyName: myAgencyName,
          guideId: targetGuide.guideId,
          guideName: targetGuide.guideName,
          guidePhone: targetGuide.guidePhone,
          guideAvatar: targetGuide.guideAvatar,
          attendanceStatus: existing ? existing.attendanceStatus : "PENDING",
          checkedAt: existing?.checkedAt,
          photoProofUrl: existing?.photoProofUrl,
          notes: existing?.notes,
          createdAt: existing?.createdAt || new Date().toISOString(),
        });
      });
    } else if (assignPresetMode === "co_guides") {
      if (selectedMultiGuideIds.length === 0) {
        toast.warning("Vui lòng chọn ít nhất 1 Hướng dẫn viên!");
        return;
      }

      const chosenGuides = myAgencyGuides.filter((g) => selectedMultiGuideIds.includes(g.guideId));

      myAttractions.forEach((att) => {
        chosenGuides.forEach((g) => {
          const existing = attractionCheckins.find(
            (c) => c.bookingTimelineAttractionId === att.location.id && c.guideId === g.guideId
          );
          newMyCheckins.push({
            id: existing ? existing.id : `bac-${booking.id}-${att.dayNumber}-${att.location.id}-${g.guideId}`,
            bookingId: booking.id,
            bookingTimelineAttractionId: att.location.id,
            locationName: att.location.name,
            dayNumber: att.dayNumber,
            scheduledTime: att.location.time || "08:30",
            agencyId: myAgencyId,
            agencyName: myAgencyName,
            guideId: g.guideId,
            guideName: g.guideName,
            guidePhone: g.guidePhone,
            guideAvatar: g.guideAvatar,
            attendanceStatus: existing ? existing.attendanceStatus : "PENDING",
            checkedAt: existing?.checkedAt,
            photoProofUrl: existing?.photoProofUrl,
            notes: existing?.notes,
            createdAt: existing?.createdAt || new Date().toISOString(),
          });
        });
      });
    } else {
      // Custom mode: per-attraction selections
      myAttractions.forEach((att) => {
        const assignedGuideIds = customAttractionGuideMap[att.location.id] || [];
        assignedGuideIds.forEach((gid) => {
          const g = myAgencyGuides.find((item) => item.guideId === gid);
          if (!g) return;
          const existing = attractionCheckins.find(
            (c) => c.bookingTimelineAttractionId === att.location.id && c.guideId === g.guideId
          );
          newMyCheckins.push({
            id: existing ? existing.id : `bac-${booking.id}-${att.dayNumber}-${att.location.id}-${g.guideId}`,
            bookingId: booking.id,
            bookingTimelineAttractionId: att.location.id,
            locationName: att.location.name,
            dayNumber: att.dayNumber,
            scheduledTime: att.location.time || "08:30",
            agencyId: myAgencyId,
            agencyName: myAgencyName,
            guideId: g.guideId,
            guideName: g.guideName,
            guidePhone: g.guidePhone,
            guideAvatar: g.guideAvatar,
            attendanceStatus: existing ? existing.attendanceStatus : "PENDING",
            checkedAt: existing?.checkedAt,
            photoProofUrl: existing?.photoProofUrl,
            notes: existing?.notes,
            createdAt: existing?.createdAt || new Date().toISOString(),
          });
        });
      });
    }

    const updatedCheckins = [...partnerCheckins, ...newMyCheckins];
    try { await onUpdateAttractionCheckins?.(booking.id, updatedCheckins); } catch(e){toast.error(e instanceof Error?e.message:"Không lưu được phân công.");return;}
    setAttractionCheckins(updatedCheckins);
    setAssignAttractionsModalOpen(false);
    toast.success(`🎉 Đã lưu phân công Hướng dẫn viên cho các điểm đến do công ty phụ trách (${newMyCheckins.length} lượt check-in)!`);
  };

  // Passenger list state - default: full tour for all passengers
  const [passengersList, setPassengersList] = useState<BookingPassenger[]>(() => {
    if (booking.passengers && booking.passengers.length > 0) {
      return booking.passengers;
    }
    return [];
  });

  // Passenger Modal (Add/Edit)
  useEffect(()=>{
    setPassengersList(booking.passengers||[]);
    if(booking.bookingAgencies)setAgenciesList(booking.bookingAgencies);
    if(booking.assignedGuides)setAssignedGuides(booking.assignedGuides);
    if(booking.attractionCheckins)setAttractionCheckins(booking.attractionCheckins);
  },[booking.passengers,booking.bookingAgencies,booking.assignedGuides,booking.attractionCheckins]);
  const [passengerModalOpen, setPassengerModalOpen] = useState(false);
  const [passengerModalMode, setPassengerModalMode] = useState<"add" | "edit">("add");
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengerDob, setPassengerDob] = useState("");
  const [passengerGender, setPassengerGender] = useState<"male" | "female">("male");
  const [passengerIdNumber, setPassengerIdNumber] = useState("");
  const [passengerSaving, setPassengerSaving] = useState(false);
  const [passengerError, setPassengerError] = useState("");
  const passengerCreationKey = useRef("");
  const [passengerNotes, setPassengerNotes] = useState("");
  const [passengerRoommateNote, setPassengerRoommateNote] = useState("");
  const [passengerDietaryNote, setPassengerDietaryNote] = useState("");
  const [selectedPassengerAgencies,setSelectedPassengerAgencies]=useState<string[]>([]);
  const [passengerSelectedAgencyId, setPassengerSelectedAgencyId] = useState<string>("all");

  // Simultaneous price sync state when adding passenger
  const [customAdjustmentReason, setCustomAdjustmentReason] = useState("");
  const [passengerCustomPrice, setPassengerCustomPrice] = useState<string>("");

  // Direct Custom Service Updates (Hotel, Sightseeing Location, Meal) by Tour Operator / Admin
  const [hotelChanges, setHotelChanges] = useState<CustomHotelChange[]>(() => booking.customHotelChanges || []);
  const [locChanges, setLocChanges] = useState<CustomLocationChange[]>(() => booking.locationChanges || []);
  const [mealChangesList, setMealChangesList] = useState<CustomMealChange[]>(() => booking.customMealChanges || []);

  // Viewing Provider Service Detail Modal (Xem bài viết & Bản đồ)
  const [viewingServiceId, setViewingServiceId] = useState<string | null>(null);

  // Quick Service Edit Modal State
  const [serviceEditModalOpen, setServiceEditModalOpen] = useState(false);
  const [serviceEditType, setServiceEditType] = useState<"hotel" | "location" | "meal">("hotel");
  const [editTargetDay, setEditTargetDay] = useState<number>(1);
  const [editTargetKey, setEditTargetKey] = useState<string>("");
  const [editOldName, setEditOldName] = useState("");
  const [replacement, setReplacement] = useState<BookingReplacement | null>(null);
  const [editItemId, setEditItemId] = useState("");
  const [amendmentSaving, setAmendmentSaving] = useState(false);
  const [amendmentError, setAmendmentError] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [surchargeOpen, setSurchargeOpen] = useState(false);
  const hasBeenApproved = booking.hasBeenApproved ?? !!booking.travelContract;
  const canAmend = ["pending", "confirmed", "deposited", "paid"].includes(booking.status) && !agencyCancellationPending;
  const canChangePrice = isCurrentCompanyLead && canAmend && !hasBeenApproved && booking.status === "pending";
  const canAddSurcharge = isCurrentCompanyLead && canAmend && hasBeenApproved && booking.status !== "pending";
  useEffect(() => { if (serviceEditModalOpen) { setReplacement(null); setAmendmentError(""); } }, [serviceEditModalOpen]);
  const [editNewName, setEditNewName] = useState("");
  const [editPriceDiff, setEditPriceDiff] = useState<string>("0");
  const financialRequestKey=useRef(crypto.randomUUID());
  useEffect(()=>{if(serviceEditModalOpen)financialRequestKey.current=crypto.randomUUID();},[serviceEditModalOpen]);
  const [editReason, setEditReason] = useState("");
  const [editAddressOrNote, setEditAddressOrNote] = useState("");

  const handleSaveServiceEdit = async () => {
    if (serviceEditType !== "location") {
      const source=serviceEditType==="hotel"?booking.tour.hotels?.find(h=>h.id===editItemId)
        :booking.tour.itinerary.flatMap(d=>d.meals||[]).find(m=>m.id===editItemId);
      if(!source || !ownsItem(source.createdByCompanyId)) {
        setAmendmentError("Chỉ Agency tạo mục dịch vụ này được cập nhật.");return;
      }
      if (!replacement?.name.trim() || (!replacement.serviceId && !replacement.supplier?.address?.trim())) {
        setAmendmentError("Vui lòng chọn dịch vụ hoặc nhập đủ tên và địa chỉ ngoài sàn."); return;
      }
      const diff = canChangePrice ? Number(editPriceDiff) : 0;
      if (!Number.isSafeInteger(diff) || !Number.isSafeInteger(Number(editPriceDiff)) || booking.totalPrice + diff <= 0 || editReason.trim().length < 3) {
        setAmendmentError("Nhập chênh lệch hợp lệ, tổng giá phải lớn hơn 0 và cần có lý do thay đổi."); return;
      }
      setAmendmentSaving(true); setAmendmentError("");
      try {
        const updated = await http<import("@/app/services/wf05Bookings").BookingDto>(`/agency/bookings/${booking.id}/service-changes`, {
          method: "POST", body: JSON.stringify({ kind: serviceEditType, itemId: Number(editItemId), ...replacement,
            reason: editReason.trim(), priceDifference: diff, expectedTotal: booking.totalPrice,
            proposedAmount: canChangePrice ? 0 : Number(editPriceDiff), financialRequestId: financialRequestKey.current }),
        });
        onBookingChanged?.(updated);
        window.dispatchEvent(new Event("booking-suppliers-changed"));
        window.dispatchEvent(new Event("booking-financial-changed"));
        if(!canChangePrice && Number(editPriceDiff)!==0) toast.success("Đã đổi dịch vụ và gửi đề nghị điều chỉnh cho chủ trì.");
        setServiceEditModalOpen(false);
      } catch (e) { setAmendmentError(e instanceof Error ? e.message : "Không lưu được dịch vụ."); }
      finally { setAmendmentSaving(false); }
      return;
    }
    const location=booking.tour.itinerary.flatMap(day=>day.locations).find(item=>item.id===editItemId);
    if(!companyId || !location || (location.createdByCompanyId || booking.companyId)!==companyId) {
      setAmendmentError("Chỉ Agency tạo địa điểm này được thay đổi."); return;
    }
    const diff = canChangePrice ? Number(editPriceDiff) : 0;
    if (!editNewName.trim() || editNewName.trim().length > 255 || editReason.trim().length < 3 ||
        !Number.isSafeInteger(diff) || booking.totalPrice + diff <= 0) {
      setAmendmentError("Nhập tên điểm, lý do thay đổi và chênh lệch giá hợp lệ."); return;
    }
    setAmendmentSaving(true); setAmendmentError("");
    try {
      const updated = await http<import("@/app/services/wf05Bookings").BookingDto>(`/agency/bookings/${booking.id}/location-changes`, {
        method: "POST", body: JSON.stringify({ itemId: Number(editItemId), name: editNewName.trim(),
          reason: editReason.trim(), expectedTotal: booking.totalPrice, priceDifference: diff }),
      });
      onBookingChanged?.(updated);
      setServiceEditModalOpen(false);
    } catch (e) { setAmendmentError(e instanceof Error ? e.message : "Không lưu được điểm tham quan."); }
    finally { setAmendmentSaving(false); }
  };

  // Function to calculate passenger price based on age group and stage
  const calculatePassengerPrice = (
    ageGroup: "adult" | "child_2_11" | "child_under_2",
    targetAgencyId?: string
  ): number => {
    if (ageGroup === "child_under_2") return 0;

    // Specific agency stage selected
    if (targetAgencyId && targetAgencyId !== "all") {
      const stage = stagesList.find((ch) => ch.companyId === targetAgencyId);
      const agencyShare = agenciesList.find((a) => a.agencyId === targetAgencyId);
      let agencyBase = stage?.quoteAdult ?? stage?.quotePerGuest;
      if (!agencyBase && agencyShare && booking.numberOfGuests) {
        agencyBase = Math.round(agencyShare.finalAmount / booking.numberOfGuests);
      }
      if (!agencyBase) agencyBase = 1800000;

      if (ageGroup === "child_2_11") {
        return stage?.quoteChild ?? Math.round(agencyBase * 0.7);
      }
      return agencyBase;
    }

    if (isCoHostedTour && stagesList.length > 0) {
      return stagesList.reduce((sum, ch) => {
        if (!ch) return sum;
        if (ageGroup === "child_2_11") {
          return sum + (ch.quoteChild ?? Math.round((ch.quoteAdult ?? ch.quotePerGuest ?? 2000000) * 0.7));
        }
        return sum + (ch.quoteAdult ?? ch.quotePerGuest ?? 2000000);
      }, 0);
    }

    const existingAdult = passengersList.find((p) => p.ageGroup === "adult" && p.price && p.price > 0);
    let baseAdultPrice = 0;
    if (existingAdult && existingAdult.price) {
      baseAdultPrice = existingAdult.price;
    } else if (booking.passengers && booking.passengers.length > 0) {
      const bAdult = booking.passengers.find((p) => p.ageGroup === "adult" && p.price && p.price > 0);
      if (bAdult && bAdult.price) {
        baseAdultPrice = bAdult.price;
      }
    }

    if (!baseAdultPrice && booking.numberOfGuests && booking.numberOfGuests > 0 && booking.totalPrice > 0) {
      baseAdultPrice = Math.round(booking.totalPrice / booking.numberOfGuests);
    }

    if (!baseAdultPrice) {
      baseAdultPrice = booking.tour?.price || 0;
    }

    if (ageGroup === "child_2_11") {
      const existingChild = passengersList.find((p) => p.ageGroup === "child_2_11" && p.price && p.price > 0);
      if (existingChild && existingChild.price) {
        return existingChild.price;
      }
      return Math.round(baseAdultPrice * 0.7);
    }

    return baseAdultPrice;
  };

  // Approval for Lead Agency (Lead confirms the group and itinerary)
  const handleApproveHappyCase = async () => {
    if (approvingBooking) return;
    setApprovingBooking(true);
    try {
      const approved = await onApproveBooking(booking.id);
      if (approved === false) return;
      setAgenciesList(current => current.map(a => ({ ...a, confirmationStatus: "confirmed" as const,
        quoteConfirmed: true, confirmedAt: a.confirmedAt || new Date().toISOString() })));
      setHappyCaseModalOpen(false);
    } finally { setApprovingBooking(false); }
  };

  // Multi-Guide Management Handlers
  const handleConfirmAddGuide = async () => {
    const targetGuide = guides.find((g) => g.id === selectedGuideToAdd);
    if (!targetGuide) {
      toast.warning("Vui lòng chọn hướng dẫn viên để phân công!");
      return;
    }
    if (assignedGuides.some((ag) => ag.guideId === targetGuide.id)) {
      toast.info(`Hướng dẫn viên ${targetGuide.name} đã được phân công trong danh sách đoàn!`);
      return;
    }

    const newAg: BookingAssignedGuide = {
      id: `bag-${Date.now()}`,
      guideId: targetGuide.id,
      guideName: targetGuide.name,
      guidePhone: targetGuide.phone,
      guideAvatar: targetGuide.avatar,
      companyId: companyId || currentAgency?.agencyId || booking.companyId || "",
      companyName: companyName || currentAgency?.agencyName || booking.companyName || "",
      role: selectedGuideRole,
      notes: selectedGuideNotes.trim() || undefined,
      assignedAt: new Date().toLocaleDateString("vi-VN"),
    };

    const updated = [...assignedGuides, newAg];
    setAssignedGuides(updated);
    try {await onUpdateAssignedGuides?.(booking.id, updated);}catch(e){toast.error(e instanceof Error?e.message:"Không lưu được HDV.");return;}

    setAssignModalOpen(false);
    setSelectedGuideNotes("");
    toast.success(`✓ Đã phân công hướng dẫn viên ${targetGuide.name} vào đoàn thành công!`);
  };

  const handleConfirmReplaceGuide = async () => {
    if (!guideToReplace || !newReplacementGuideId) return;
    const replacement = guides.find((g) => g.id === newReplacementGuideId);
    if (!replacement) {
      toast.warning("Vui lòng chọn hướng dẫn viên thay thế!");
      return;
    }
    if (assignedGuides.some((ag) => ag.guideId === replacement.id && ag.id !== guideToReplace.id)) {
      toast.warning(`Hướng dẫn viên ${replacement.name} đã có trong danh sách phân công!`);
      return;
    }

    const updated = assignedGuides.map((ag) => {
      if (ag.id !== guideToReplace.id) return ag;
      return {
        ...ag,
        guideId: replacement.id,
        guideName: replacement.name,
        guidePhone: replacement.phone,
        guideAvatar: replacement.avatar,
        assignedAt: new Date().toLocaleDateString("vi-VN"),
      };
    });

    setAssignedGuides(updated);
    try {await onUpdateAssignedGuides?.(booking.id, updated);}catch(e){toast.error(e instanceof Error?e.message:"Không lưu được HDV.");return;}
    setReplaceModalOpen(false);
    setGuideToReplace(null);
    toast.success(`✓ Đã thay thế HDV ${guideToReplace.guideName} bằng ${replacement.name} thành công!`);
  };

  const handleRemoveAssignedGuide = async (guideAssignmentId: string) => {
    const target = assignedGuides.find((ag) => ag.id === guideAssignmentId);
    if (!target) return;
    const isMyGuide = (companyId && target.companyId === companyId) ||
      (companyName && target.companyName === companyName) ||
      (!target.companyId && isCurrentCompanyLead);

    if (!isMyGuide) {
      toast.warning(`Bạn không có quyền xoá HDV ${target.guideName} vì nhân sự này do ${target.companyName} trực tiếp quản lý và phân công!`);
      return;
    }

    if (!(await confirmAction(`Xác nhận rút hướng dẫn viên ${target.guideName} khỏi đoàn này?`))) return;

    const updated = assignedGuides.filter((ag) => ag.id !== guideAssignmentId);
    setAssignedGuides(updated);
    try {await onUpdateAssignedGuides?.(booking.id, updated);}catch(e){toast.error(e instanceof Error?e.message:"Không lưu được HDV.");return;}
  };

  // Partner Agency confirms their stage quote
  const handleConfirmAgencyQuote = (targetAgencyId: string) => {
    const target = agenciesList.find((a) => a.agencyId === targetAgencyId);
    const updatedAgencies = agenciesList.map((a) =>
      a.agencyId === targetAgencyId
        ? { ...a, quoteConfirmed: true, confirmedAt: new Date().toISOString() }
        : a
    );
    setAgenciesList(updatedAgencies);
    onUpdateBookingAgencies?.(booking.id, updatedAgencies);
    toast.success(`✓ Đã xác nhận chốt biểu phí chặng của ${target?.agencyName || "công ty"} thành công!`);
  };

  // Passenger Deactivation handlers (Stage B reduction)
  const handleOpenDeactivateModal = (passenger: BookingPassenger) => {
    setPassengerToDeactivate(passenger);
    setDeactivateReason("");
    setDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = () => {
    if (!passengerToDeactivate) return;
    if (!deactivateReason.trim()) {
      toast.warning("Vui lòng nhập lý do rút hành khách khỏi chặng!");
      return;
    }
    const p = passengerToDeactivate;
    const targetAgencyId = p.agencyId || (isCurrentCompanyLead ? agenciesList[1]?.agencyId : currentAgency.agencyId) || agenciesList[0].agencyId;
    const targetAgency = agenciesList.find((a) => a.agencyId === targetAgencyId) || agenciesList[0];
    const deductAmount = p.price || 0;

    const updatedPassengers = passengersList.map((item) =>
      item.id === p.id
        ? {
            ...item,
            status: "INACTIVE" as const,
            statusNote: `Đã rút khỏi chặng ${targetAgency.agencyName}: ${deactivateReason.trim()}`,
          }
        : item
    );
    setPassengersList(updatedPassengers);
    onUpdateBookingPassengers?.(booking.id, updatedPassengers);

    const updatedAgencies = agenciesList.map((a) =>
      a.agencyId === targetAgency.agencyId
        ? {
            ...a,
            finalAmount: Math.max(0, a.finalAmount - deductAmount),
            quoteConfirmed: false,
          }
        : a
    );
    setAgenciesList(updatedAgencies);
    onUpdateBookingAgencies?.(booking.id, updatedAgencies);

    const newTotal = Math.max(0, booking.totalPrice - deductAmount);
    const reasonText = `Giảm khách ${p.fullName} ở chặng ${targetAgency.agencyName}: ${deactivateReason.trim()}`;
    if (onUpdateBookingPrice) {
      onUpdateBookingPrice(booking.id, newTotal, reasonText, {
        id: `adj-${Date.now()}`,
        bookingId: booking.id,
        agencyId: targetAgency.agencyId,
        agencyName: targetAgency.agencyName,
        adjustedBy: companyName,
        previousTotalPrice: booking.totalPrice,
        adjustmentAmount: -deductAmount,
        newTotalPrice: newTotal,
        reason: reasonText,
        createdAt: new Date().toISOString(),
      });
    }

    setDeactivateModalOpen(false);
    setPassengerToDeactivate(null);
    setDeactivateReason("");
    toast.success(`✓ Đã rút hành khách "${p.fullName}" khỏi chặng ${targetAgency.agencyName}!\n✓ Đã trừ -${formatVND(deductAmount)} vào doanh thu chặng và cập nhật tổng tiền đơn hàng.`);
  };

  const handleReactivatePassenger = async (p: BookingPassenger) => {
    const targetAgencyId = p.agencyId || agenciesList[0].agencyId;
    const targetAgency = agenciesList.find((a) => a.agencyId === targetAgencyId) || agenciesList[0];
    const restoreAmount = p.price || 0;

    if (!(await confirmAction(`Khôi phục hành khách "${p.fullName}" trở lại chặng ${targetAgency.agencyName}?\nTổng tiền sẽ được cộng lại (+${formatVND(restoreAmount)}).`))) return;

    const updatedPassengers = passengersList.map((item) =>
      item.id === p.id
        ? {
            ...item,
            status: "ACTIVE" as const,
            statusNote: undefined,
          }
        : item
    );
    setPassengersList(updatedPassengers);
    onUpdateBookingPassengers?.(booking.id, updatedPassengers);

    const updatedAgencies = agenciesList.map((a) =>
      a.agencyId === targetAgency.agencyId
        ? {
            ...a,
            finalAmount: a.finalAmount + restoreAmount,
          }
        : a
    );
    setAgenciesList(updatedAgencies);
    onUpdateBookingAgencies?.(booking.id, updatedAgencies);

    const newTotal = booking.totalPrice + restoreAmount;
    const reasonText = `Khôi phục khách ${p.fullName} tham gia chặng ${targetAgency.agencyName}`;
    if (onUpdateBookingPrice) {
      onUpdateBookingPrice(booking.id, newTotal, reasonText, {
        id: `adj-${Date.now()}`,
        bookingId: booking.id,
        agencyId: targetAgency.agencyId,
        agencyName: targetAgency.agencyName,
        adjustedBy: companyName,
        previousTotalPrice: booking.totalPrice,
        adjustmentAmount: restoreAmount,
        newTotalPrice: newTotal,
        reason: reasonText,
        createdAt: new Date().toISOString(),
      });
    }
  };

  // Dynamic booking total price based on passenger tickets
  const dynamicTotalPrice = useMemo(() => {
    if (passengersList.length > 0) {
      return passengersList.reduce((sum, p) => sum + (p.price || 0), 0);
    }
    return booking.totalPrice;
  }, [passengersList, booking.totalPrice]);

  // Sắp xếp nhật ký điều chỉnh giá theo thứ tự mới nhất từ trên xuống dưới (Newest-first)
  const sortedPriceAdjustments = useMemo(() => {
    if (!booking.priceAdjustments || booking.priceAdjustments.length === 0) return [];
    return [...booking.priceAdjustments].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [booking.priceAdjustments]);

  // Lần điều chỉnh gần đây nhất
  const latestPriceAdjustment = sortedPriceAdjustments[0] || null;

  const handleDeletePassenger = async (passengerId: string) => {
    const pToDelete = passengersList.find((p) => p.id === passengerId);
    if (!pToDelete) return;

    const passengerPrice = pToDelete.price || 0;
    const confirmMessage = passengerPrice > 0
      ? `Bạn có chắc chắn muốn xóa hành khách "${pToDelete.fullName}" khỏi đoàn?\n\nBạn có muốn đồng thời trừ tiền vé (-${formatVND(passengerPrice)}) khỏi tổng tiền tour không?`
      : `Bạn có chắc chắn muốn xóa hành khách "${pToDelete.fullName}" khỏi danh sách đoàn?`;

    if (!(await confirmAction(confirmMessage))) return;

    const willDeduct = Boolean(passengerPrice > 0 && onUpdateBookingPrice);
    const updatedList = passengersList.filter((p) => p.id !== passengerId);
    setPassengersList(updatedList);

    if (onUpdateBookingPassengers) {
      onUpdateBookingPassengers(booking.id, updatedList);
    }

    if (willDeduct && onUpdateBookingPrice) {
      const newTotal = Math.max(0, booking.totalPrice - passengerPrice);
      const reason = `Giảm thành viên đoàn: Xóa hành khách ${pToDelete.fullName}`;
      onUpdateBookingPrice(booking.id, newTotal, reason, {
        id: `adj-${Date.now()}`,
        bookingId: booking.id,
        adjustedBy: companyName,
        previousTotalPrice: booking.totalPrice,
        adjustmentAmount: -passengerPrice,
        newTotalPrice: newTotal,
        reason,
        createdAt: new Date().toISOString(),
      });
      toast.success(`✓ Đã xóa hành khách "${pToDelete.fullName}" và trừ tiền vé (-${formatVND(passengerPrice)}) khỏi tổng giá tour.`);
    } else {
      toast.success(`✓ Đã xóa hành khách "${pToDelete.fullName}" khỏi danh sách đoàn.`);
    }
  };

  const handleOpenAddPassenger = () => {
    setPassengerModalMode("add");
    setEditingPassengerId(null);
    setPassengerName("");
    setPassengerDob("1995-01-01");
    setPassengerGender("male");
    setPassengerIdNumber("");
    passengerCreationKey.current = crypto.randomUUID();
    setSelectedPassengerAgencies(agenciesList.map(a=>a.agencyId));
    setPassengerError("");
    setPassengerRoommateNote(""); setPassengerDietaryNote("");
    setPassengerNotes("");
    const defaultAgency = isCurrentCompanyLead ? "all" : (currentAgency?.agencyId || "all");
    setPassengerSelectedAgencyId(defaultAgency);
    setCustomAdjustmentReason("Bổ sung hành khách theo thỏa thuận với khách hàng");
    const defaultPrice = calculatePassengerPrice("adult", defaultAgency);
    setPassengerCustomPrice(defaultPrice.toString());
    setPassengerModalOpen(true);
  };

  const handleOpenEditPassenger = (p: BookingPassenger) => {
    setPassengerModalMode("edit");
    setEditingPassengerId(p.id);
    setPassengerName(p.fullName);
    setPassengerDob(p.dateOfBirth || "1995-01-01");
    setPassengerGender(p.gender || "male");
    setPassengerIdNumber(p.idNumber || "");
    setPassengerError("");
    setPassengerRoommateNote(p.roommateNote || "");
    setPassengerDietaryNote(p.dietaryNote || "");
    setPassengerNotes(p.notes || "");
    setPassengerSelectedAgencyId(p.agencyId || "all");
    const initialPrice = p.price !== undefined ? p.price : calculatePassengerPrice(p.ageGroup || "adult", p.agencyId || "all");
    setPassengerCustomPrice(initialPrice.toString());
    setPassengerModalOpen(true);
  };

  const handlePassengerDobChange = (newDob: string) => {
    setPassengerDob(newDob);
    const age = calculateAge(newDob, booking.tourStartDate || booking.bookingDate) ?? 25;
    let grp: "adult" | "child_2_11" | "child_under_2" = "adult";
    if (age < 2) grp = "child_under_2";
    else if (age <= 11) grp = "child_2_11";
    const autoPrice = calculatePassengerPrice(grp, passengerSelectedAgencyId);
    setPassengerCustomPrice(autoPrice.toString());
  };

  const handleSavePassengerModal = async () => {
    if (passengerSaving) return;
    if(passengerModalMode==="add" && isCoHostedTour && selectedPassengerAgencies.length===0){setPassengerError("Chọn ít nhất một chặng tham gia.");return;}
    if (!passengerName.trim() || !passengerDob) { setPassengerError("Vui lòng nhập họ tên và ngày sinh."); return; }
    const price = Number(passengerCustomPrice);
    if (!Number.isSafeInteger(price) || price < 0) { setPassengerError("Giá vé phải là số nguyên không âm."); return; }
    setPassengerSaving(true); setPassengerError("");
    try {
      if (passengerModalMode === "add") {
        const updated = await http<import("@/app/services/wf05Bookings").BookingDto>(`/agency/bookings/${booking.id}/participants`, {
          method: "POST", body: JSON.stringify({ fullName: passengerName.trim(), dateOfBirth: passengerDob,
            gender: passengerGender === "female" ? "Nữ" : "Nam", identityNumber: passengerIdNumber.trim() || null,
            roommateNote: passengerRoommateNote.trim(), restaurantNote: passengerDietaryNote.trim(), note: passengerNotes.trim(),
            agencyIds:isCoHostedTour?selectedPassengerAgencies:undefined, ticketPrice: price, reason: customAdjustmentReason.trim(), expectedTotal: booking.totalPrice, requestId: passengerCreationKey.current }),
        });
        setPassengersList(fromApiBooking(updated, [booking.tour]).passengers || []);
        onBookingChanged?.(updated);
        window.dispatchEvent(new Event("booking-suppliers-changed"));
      } else if (editingPassengerId) {
        const edited=passengersList.find(p=>p.id===editingPassengerId);
        const next = passengersList.map(p => p.participantIndex === edited?.participantIndex ? { ...p, fullName: passengerName.trim(),
          dateOfBirth: passengerDob, gender: passengerGender, idNumber: passengerIdNumber.trim(),
          roommateNote: passengerRoommateNote.trim(), dietaryNote: passengerDietaryNote.trim(), notes: passengerNotes.trim() } : p);
        await onUpdateBookingPassengers?.(booking.id, next.filter(p=>p.isPrimary));
        setPassengersList(next);
      }
      setPassengerModalOpen(false);
    } catch (e) { setPassengerError(e instanceof Error ? e.message : "Không lưu được hành khách."); }
    finally { setPassengerSaving(false); }
  };

  useEffect(()=>{
    if(passengerModalMode!=="add" || !isCoHostedTour)return;
    const age=calculateAge(passengerDob,booking.tourStartDate||booking.bookingDate)??30;
    const sum=agenciesList.filter(a=>selectedPassengerAgencies.includes(a.agencyId)).reduce((total,a)=>total+(a.pricingTiers?.find(t=>age>=(t.minAge??0) && (t.maxAge==null || age<=t.maxAge))?.pricePerGuest||0),0);
    setPassengerCustomPrice(String(sum));
  },[selectedPassengerAgencies,passengerDob,passengerModalMode,agenciesList,isCoHostedTour,booking.tourStartDate,booking.bookingDate]);

  const isRejectedBooking = booking.status === "rejected";
  const isClosedBooking = isRejectedBooking || booking.status === "cancelled";
  const st = statusMap[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-700" };
  const pst = paymentStatusMap[booking.paymentStatus ?? "unpaid"] ?? {
    label: "Chưa xác định", color: "bg-gray-100 text-gray-700 border-gray-200",
  };

  // Default contract number
  const contractNo = `HD-${booking.id.replace("booking-", "").toUpperCase()}`;
  const today = new Date().toLocaleDateString("vi-VN");

  return (
    <div className="space-y-6 w-full min-w-0 pb-16">
      {/* Top Header & Actions Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#075985] hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách booking
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                Chi tiết Booking #{booking.id}
              </h1>
                <ChatWithButton userId={booking.userId} context={{kind:"booking",id:Number(booking.id),title:`Booking #${booking.id}`,thumbnailUrl:booking.tour.image}}>Chat với khách</ChatWithButton>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${st.color}`}>
                {st.label}
              </span>
              {!isClosedBooking && <span className={`text-xs px-3 py-1 rounded-full font-bold border ${pst.color}`}>
                {pst.label}
              </span>}
              {booking.hasLocationCustomization && (
                <span className="text-xs px-3 py-1 rounded-full font-bold bg-[#F97316]/15 text-purple-800 border border-[#F97316]/30 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Có tùy chỉnh lịch trình
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Ngày đặt: <strong>{booking.bookingDate}</strong> · Khách hàng: <strong>{booking.contactName || booking.userName}</strong>
            </p>
          </div>

          {/* Quick Action Buttons */}
          {!isClosedBooking && <div className="flex items-center gap-2 flex-wrap">
            {booking.status === "pending" && (
              <>
                {isCurrentCompanyLead ? (
                  <div className="space-y-1.5">
                    <Button onClick={handleApproveHappyCase} disabled={approvingBooking}
                      title="Agency chủ động duyệt booking, độc lập với phản hồi Provider"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-sm font-bold disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" />
                      Duyệt Booking
                    </Button>
                    <p className="max-w-sm text-xs text-gray-600" role="status">Agency chủ động duyệt booking; phản hồi Provider được theo dõi riêng.</p>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F0F9FF] text-purple-800 border border-[#F97316]/30">
                    <Handshake className="w-4 h-4 text-[#F97316]" />
                    Đối tác liên minh (Chờ Chủ trì duyệt)
                  </span>
                )}

                {isCurrentCompanyLead && (
                  <Button
                    variant="outline"
                    onClick={() => setRejectModalOpen(true)}
                    className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5 text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </Button>
                )}
              </>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setSelectedGuideToAdd(guides[0]?.id || "");
                setSelectedGuideRole(assignedGuides.length === 0 ? "lead_guide" : "support_guide");
                setSelectedGuideNotes("");
                setAssignModalOpen(true);
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 text-sm"
            >
              <UserCheck className="w-4 h-4 text-[#075985]" />
              Giao HDV ({assignedGuides.length})
            </Button>

            <Button
              variant="outline"
              onClick={handleOpenAssignAttractionsModal}
              className="border-purple-300 text-[#EA580C] hover:bg-[#F0F9FF] gap-1.5 text-sm font-semibold shadow-2xs"
              title="Phân công Hướng dẫn viên theo từng Điểm đến và Chặng tham quan (booking_attraction_checkins)"
            >
              <Navigation className="w-4 h-4 text-[#F97316]" />
              Phân công lộ trình HDV
            </Button>

            {isCurrentCompanyLead&&<Button
              variant="outline"
              onClick={() => setContractModalOpen(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 text-sm"
            >
              <FileText className="w-4 h-4 text-[#075985]" />
              Xem Hợp đồng
            </Button>}
          </div>}
        </div>
      </div>

      {isClosedBooking && <div role="status" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-rose-900">
        <h2 className="font-bold">{isRejectedBooking ? "Đã từ chối tiếp nhận booking" : "Booking đã được hủy"}</h2>
        <p className="mt-1 whitespace-pre-line text-sm">{isRejectedBooking ? bookingRefusalReason(booking.bookingNotes, booking.cancellationReason) : bookingCancellationReason(booking.bookingNotes, booking.cancellationReason)}</p>
      </div>}

      {!isClosedBooking && <BookingFinancialChangesPanel bookingId={booking.id} expectedTotal={booking.totalPrice} isHost={isCurrentCompanyLead} canAmend={canAmend} agencies={agenciesList} onChanged={onBookingChanged} refreshKey={booking.totalPrice} />}
      <BookingStagePassengers booking={booking} rows={passengersList} isHost={isCurrentCompanyLead} viewerAgencyId={companyId} canAmend={canAmend}
        onAdd={handleOpenAddPassenger} onEdit={handleOpenEditPassenger} onChanged={dto=>{
          setPassengersList(fromApiBooking(dto,[booking.tour]).passengers||[]);onBookingChanged?.(dto);
        }}/>



      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Details & Customization Breakdown) */}
        <div className="lg:col-span-2 space-y-6">
          {/* TOUR OVERVIEW CARD */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CompassIcon className="w-4 h-4 text-[#075985]" />
              Thông tin Tour cơ bản
            </h2>
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={booking.tour.image}
                alt={booking.tour.name}
                className="w-full sm:w-44 h-32 object-cover rounded-xl flex-shrink-0 shadow-sm"
              />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">
                    {booking.tour.tourCode}
                  </span>
                  <span className="text-xs text-gray-500">Đơn vị tổ chức: <strong>{booking.companyName || companyName}</strong></span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 leading-snug">
                  {booking.tour.name}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-gray-400 block">Ngày khởi hành</span>
                    <span className="font-bold text-teal-800 text-sm flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {booking.tourStartDate || "Chưa xác định"}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-gray-400 block">Thời gian</span>
                    <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{booking.tour.duration}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <span className="text-gray-400 block">Thời gian hoạt động</span>
                    <span className="font-semibold text-gray-800 text-sm mt-0.5 block">{booking.tour.operationPeriod || "Quanh năm"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CO-HOSTING ALLIANCE BREAKDOWN CARD */}
          {/* ======================================================== */}
          {!isClosedBooking && isCoHostedTour && (
            <div className="bg-gradient-to-br from-amber-50/70 via-purple-50/50 to-blue-50/50 rounded-2xl border-2 border-amber-300 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 shadow-2xs">
                    <Handshake className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-amber-950 flex items-center gap-2 flex-wrap">
                      {isCurrentCompanyLead?`Tour Liên Minh Hợp Tác (${agenciesList.length} Công Ty)`:"Chặng phụ trách của bạn"}
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                        Phân bổ theo chặng
                      </span>
                    </h2>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {isCurrentCompanyLead?"Các công ty phối hợp vận hành đoàn theo chặng. Doanh thu được phân bổ độc lập cho từng công ty.":"Bạn chỉ xem được thông tin khách, dịch vụ và doanh thu thuộc chặng của mình."}
                    </p>
                  </div>
                </div>


              </div>

              {/* Both Companies Agency Shares (from booking_agencies) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agenciesList.filter(a=>isCurrentCompanyLead || a.agencyId===companyId).map((agency) => {
                  const isLead = Boolean(
                    agency.isHost ||
                    (agency as any).role === "lead" ||
                    agency.agencyId === booking.companyId ||
                    (stagesList.find((c) => c.companyId === agency.agencyId)?.role === "lead")
                  );
                  const coHostInfo = stagesList.find((c) => c.companyId === agency.agencyId);
                  const isMyAgency = companyId ? agency.agencyId === companyId : agency.agencyName === companyName;
                  const isAdjusted = agency.finalAmount !== agency.originalAmount;
                  const diff = agency.finalAmount - agency.originalAmount;

                  return (
                    <div
                      key={agency.id || agency.agencyId}
                      className={`p-5 rounded-2xl border-2 space-y-3.5 ${
                        isLead
                          ? "border-blue-400 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 shadow-xs"
                          : "border-purple-300 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 shadow-xs"
                      } ${isMyAgency ? "ring-2 ring-blue-500/50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {coHostInfo?.companyLogo ? (
                            <img src={coHostInfo.companyLogo} alt="" className="w-9 h-9 rounded-xl object-cover border border-gray-200 shadow-2xs" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-700 border">
                              {agency.agencyName?.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-extrabold text-gray-900 text-sm block truncate">
                              {agency.agencyName}
                            </span>
                            <span className="text-[11px] font-semibold block">
                              {isLead ? (
                                <span className="text-[#075985]">{isMyAgency ? "🏢 Đơn vị của bạn (Chủ trì)" : "🏢 Đơn vị chủ trì điều phối"}</span>
                              ) : (
                                <span className="text-[#EA580C]">{isMyAgency ? "🤝 Đơn vị của bạn (Đối tác)" : "🤝 Đối tác liên minh địa phương"}</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {isLead ? (
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-[#075985] text-white shadow-xs border border-blue-700 flex items-center gap-1.5 shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                            ĐƠN VỊ CHỦ TRÌ (LEAD)
                          </span>
                        ) : (
                          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#F97316]/15 text-purple-900 border border-purple-300 shadow-xs flex items-center gap-1.5 shrink-0">
                            <Handshake className="w-3.5 h-3.5 text-[#EA580C]" />
                            ĐỐI TÁC ĐỒNG DẪN (PARTNER)
                          </span>
                        )}
                      </div>

                      {/* Role and segment clarification */}
                      <div className="text-xs text-gray-600 space-y-2 pt-1 border-t border-gray-100">
                        {isLead ? (
                          <p className="text-[11px] text-blue-900 bg-[#E0F2FE]/60 p-2.5 rounded-xl border border-[#CBD5E1]/80 leading-relaxed">
                            🏢 <strong>Vai trò Đơn vị Chủ trì:</strong> Chịu trách nhiệm pháp lý hợp đồng, xe đưa đón, duyệt đơn booking và phát hành các đợt thanh toán cho khách hàng.
                          </p>
                        ) : (
                          <p className="text-[11px] text-purple-900 bg-[#F97316]/15/60 p-2.5 rounded-xl border border-[#F97316]/30/80 leading-relaxed">
                            🤝 <strong>Vai trò Đối tác Chuyên tuyến:</strong> Phụ trách dịch vụ, lộ trình và hướng dẫn viên của chặng mình. Danh sách khách do Agency chủ trì cập nhật.
                          </p>
                        )}

                        <p className="text-[11px]">
                          <strong className="text-gray-700">Chặng phụ trách:</strong>{" "}
                          <span className="font-semibold text-gray-900">
                            {coHostInfo?.assignedSegments || (isLead ? "Chặng đón đoàn & Điều phối tổng thể" : "Chặng trải nghiệm địa phương")}
                          </span>
                        </p>

                        <div className="bg-white/80 rounded-xl p-2.5 border border-gray-200 space-y-1.5 shadow-2xs">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-500">Báo giá chặng gốc ban đầu:</span>
                            <span className="font-semibold text-gray-700">{formatVND(agency.originalAmount)}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-800">Doanh thu chặng chốt:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-emerald-700 text-sm">{formatVND(agency.finalAmount)}</span>
                              {isAdjusted && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  diff > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}>
                                  {diff > 0 ? `+${formatVND(diff)}` : `-${formatVND(Math.abs(diff))}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>


                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Happy Case Action Notice if Booking is Pending */}
              {booking.status === "pending" && (
                <div className="bg-[#F0F9FF]/90 border border-[#CBD5E1] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Quy trình duyệt booking &amp; Thỏa thuận liên minh
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Công ty chủ trì chủ động duyệt booking. Khách ký hợp đồng và thanh toán theo lịch; phản hồi Provider được theo dõi riêng cho từng dịch vụ.
                    </p>
                  </div>
                  {isCurrentCompanyLead && (
                    <Button
                      onClick={handleApproveHappyCase}
                      disabled={approvingBooking} title="Agency chủ động duyệt booking, độc lập với phản hồi Provider"
                      className="bg-[#075985] hover:bg-[#F97316] text-white text-xs font-bold h-9 px-4 shrink-0 shadow-sm flex items-center gap-1.5 rounded-xl"
                    >
                      <Zap className="w-4 h-4 text-yellow-300" />
                      Duyệt Booking (Chủ trì)
                    </Button>
                  )}
                </div>
              )}

              {/* Escrow Guarantee Policy Note */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">
                    Bảo chứng thanh toán Ký quỹ (Escrow) &amp; Quyết toán độc lập:
                  </p>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    {isCurrentCompanyLead?`Khách thanh toán theo lịch của booking. Sàn đối soát và quyết toán cho từng Agency sau khi tour kết thúc.`:"Sàn đối soát phần doanh thu và phụ thu thuộc công ty bạn trước khi quyết toán."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED ACCOMMODATION / HOTEL SECTION (MATCHING TourDetailPage.tsx & BookingFormPage.tsx) */}
          {(() => {
            const tour = booking.tour;
            if(booking.isPartnerView && !tour.hotels?.length)return null;
            const customHotelChanges = hotelChanges;

            let accommodationList: Array<{
              agencyId?: string;
              itemId?: string;
              serviceId?: string;
              supplierSource?: string;
              supplier?: import("@/app/types").TourSupplierSnapshot;
              destination: string;
              nights: number;
              hotelName: string;
              stars?: number;
              originalHotelName?: string;
              isChanged: boolean;
              mode: "system" | "provider" | "custom";
              note?: string;
              address?: string;
              priceDifference?: number;
              providerId?: string;
            }> = [];

            if (tour.hotels && tour.hotels.length > 0) {
              accommodationList = tour.hotels.map((h) => {
                const dest = h.destination || tour.destination;
                const change = customHotelChanges?.find(
                  (hc) => hc.destination === dest || hc.destination === h.destination || tour.hotels!.length === 1
                );
                return {
                  agencyId:h.createdByCompanyId||booking.companyId,
                  itemId: h.id,
                  serviceId: change ? change.serviceId : h.serviceId,
                  supplierSource: change?.isCustom || change?.mode === "custom" ? "AGENCY_SUPPLIER" : h.supplierSource,
                  supplier: change ? { address: change.address, contactPhone: change.providerPhone } : h.supplier,
                  destination: dest,
                  nights: h.nights || 1,
                  hotelName: change ? change.newHotelName : h.name,
                  stars: change?.stars || h.stars || 4,
                  originalHotelName: h.originalName || change?.originalHotelName || h.name,
                  isChanged: Boolean(change) || (!!h.originalName && h.originalName !== h.name),
                  mode: (change?.mode as any) || (change?.isProviderService ? "provider" : "system"),
                  note: change?.note,
                  address: change?.address || h.address || h.description,
                  priceDifference: change?.newPricePerNight !== undefined && h.pricePerNight !== undefined
                    ? change.newPricePerNight - h.pricePerNight
                    : undefined,
                  providerId: change?.providerId,
                };
              });
            } else {
              const uniqueDests: string[] = [];
              tour.itinerary?.forEach((d) => {
                const dest = d.destinationCity || tour.destination || "Điểm đến";
                if (!uniqueDests.includes(dest)) uniqueDests.push(dest);
              });

              accommodationList = uniqueDests.map((dest) => {
                const change = customHotelChanges?.find((hc) => hc.destination === dest || uniqueDests.length === 1);
                const dayWithHotel = tour.itinerary?.find((d) => (d.destinationCity || tour.destination) === dest && d.hotel);
                const defaultHotel = dayWithHotel?.hotel || tour.itinerary?.[0]?.hotel;
                const nights = tour.itinerary?.filter((d) => (d.destinationCity || tour.destination) === dest).length || 1;

                return {
                  agencyId:defaultHotel?.createdByCompanyId||booking.companyId,
                  itemId: defaultHotel?.id,
                  serviceId: change ? change.serviceId : defaultHotel?.serviceId,
                  supplierSource: change?.isCustom || change?.mode === "custom" ? "AGENCY_SUPPLIER" : defaultHotel?.supplierSource,
                  supplier: change ? { address: change.address, contactPhone: change.providerPhone } : defaultHotel?.supplier,
                  destination: dest,
                  nights: Math.max(1, nights > 1 ? nights - 1 : nights),
                  hotelName: change ? change.newHotelName : (defaultHotel?.name || "Khách sạn tiêu chuẩn theo tour"),
                  stars: change?.stars || defaultHotel?.stars || 4,
                  originalHotelName: change?.originalHotelName || defaultHotel?.name,
                  isChanged: Boolean(change),
                  mode: (change?.mode as any) || (change?.isProviderService ? "provider" : "system"),
                  note: change?.note,
                  address: change?.address || defaultHotel?.address || defaultHotel?.description,
                  priceDifference: undefined,
                  providerId: change?.providerId,
                };
              });
            }

            if (!accommodationList || accommodationList.length === 0) return null;

            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-3.5">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#075985]" />
                      Khách sạn lưu trú
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Danh sách khách sạn, khu vực nghỉ dưỡng được bố trí cho chuyến đi của đoàn
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {accommodationList.map((acc, aIdx) => (
                    <div key={aIdx} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="px-4 py-3 bg-[#F0F9FF]/70 border-b border-blue-100 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{acc.destination}</p>
                            <p className="text-xs text-gray-500">
                              {acc.nights} đêm • {acc.hotelName} {acc.stars ? `(${acc.stars}★)` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if(!canAmend || !ownsItem(acc.agencyId))return;
                              setServiceEditType("hotel");
                              setEditItemId(acc.itemId || "");
                              setEditTargetKey(acc.destination);
                              setEditOldName(acc.originalHotelName || acc.hotelName);
                              setEditNewName(acc.hotelName);
                              setEditPriceDiff("0");
                              setEditReason(acc.note || "Đã liên hệ thống nhất với khách đổi khách sạn");
                              setEditAddressOrNote(acc.address || "");
                              setServiceEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-[#075985] hover:text-blue-900 bg-white hover:bg-[#F0F9FF] border border-[#CBD5E1] px-2.5 py-1 rounded-lg font-semibold transition-colors shadow-2xs cursor-pointer disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-slate-100 disabled:hover:text-slate-400"
                            disabled={!canAmend || !ownsItem(acc.agencyId)} title={!ownsItem(acc.agencyId)?`Mục này do ${agencyNameFor(acc.agencyId)} bố trí. Chỉ Agency đó được cập nhật.`:"Cập nhật khách sạn do công ty bạn bố trí"}
                          >
                            <Edit className={`w-3.5 h-3.5 ${!canAmend || !ownsItem(acc.agencyId)?"text-slate-400":"text-[#075985]"}`} />
                            <span>Cập nhật khách sạn</span>
                          </button>
                          {acc.isChanged && (
                            acc.mode === "system" ? (
                              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Option từ tour {acc.priceDifference ? `(+${formatVND(acc.priceDifference)})` : ""}
                              </span>
                            ) : acc.mode === "provider" ? (
                              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Đối tác Nền tảng
                              </span>
                            ) : (
                              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Tự đề xuất
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5 text-xs">
                        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="h-3.5 w-3.5"/>Agency bố trí: <strong className="font-medium text-sky-800">{agencyNameFor(acc.agencyId)}</strong></p>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Khách sạn được chọn:</span>
                          <span className="font-bold text-gray-900 text-sm">
                            {acc.hotelName} {acc.stars ? `(${acc.stars}★)` : ""}
                          </span>
                        </div>
                        {acc.isChanged && acc.originalHotelName && acc.originalHotelName !== acc.hotelName && (
                          <div className="flex items-center justify-between text-gray-400">
                            <span>Lúc đặt:</span>
                            <span className="line-through">{acc.originalHotelName}</span>
                          </div>
                        )}
                        {acc.address && (
                          <div className="flex items-start justify-between text-gray-600 pt-1 border-t border-gray-100">
                            <span className="text-gray-400">Địa chỉ / Ghi chú phòng:</span>
                            <span className="text-right font-medium text-gray-700">{acc.address}</span>
                          </div>
                        )}
                        {acc.note && (
                          <div className="flex items-start justify-between text-[#EA580C] pt-1 border-t border-purple-100 italic">
                            <span>Yêu cầu riêng của khách:</span>
                            <span className="text-right font-medium">{acc.note}</span>
                          </div>
                        )}
                        <BookingSupplierConfirmation state={currentQuotationState}
                          slot={{ kind: "hotel", itemId: acc.itemId, serviceId: acc.serviceId }}
                          supplierSource={acc.supplierSource} supplier={acc.supplier || { address: acc.address }}
                          onOpenService={setViewingServiceId} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* TOUR FULL ITINERARY (MATCHING chitietlichtrinh.png & TourDetailPage.tsx) */}
          {booking.tour.itinerary && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
              {/* Header with Sub-Tabs */}
              <div className="border-b border-gray-200 pb-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#F97316]" />
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                      Tiến độ &amp; Lịch trình Tour
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Theo dõi lịch trình, tiến độ check-in và sự cố phát sinh trong chuyến đi.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1 rounded-xl" aria-label="Thông tin vận hành tour">
                  <button
                    type="button"
                    onClick={() => setItinerarySubTab("standard")}
                    aria-pressed={itinerarySubTab === "standard"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      itinerarySubTab === "standard"
                        ? "bg-white text-[#075985] shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#075985]" />
                    Lịch trình chi tiết chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setItinerarySubTab("live_checkin")}
                    aria-pressed={itinerarySubTab === "live_checkin"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      itinerarySubTab === "live_checkin"
                        ? "bg-white text-[#EA580C] shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#F97316]" />
                    Tiến độ Check-in Trực tiếp
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#F97316]/15 text-purple-800">
                      {attractionCheckins.filter((c) => c.attendanceStatus === "CHECKED_IN").length}/{attractionCheckins.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItinerarySubTab("incidents")}
                    aria-pressed={itinerarySubTab === "incidents"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      itinerarySubTab === "incidents"
                        ? "bg-white text-rose-700 shadow-2xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Nhật ký sự cố Tour
                    <span className="ml-1 px-1.5 rounded-full text-[10px] bg-rose-100 text-rose-800">
                      {incidents.length}
                    </span>
                  </button>
                </div>
              </div>

              {itinerarySubTab === "incidents" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" />
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                          Nhật ký sự cố Tour
                          <span className="text-xs normal-case px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {incidents.length} sự cố
                          </span>
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Theo dõi sự cố phát sinh và báo cáo của hướng dẫn viên trong chuyến đi.
                        </p>
                      </div>
                    </div>
                  </div>

                  {incidents.length === 0 ? (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-emerald-900 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold">Đoàn đang vận hành an toàn</p>
                        <p className="text-emerald-700 text-[11px]">
                          Chưa có sự cố nào được ghi nhận cho đơn tour này. Hướng dẫn viên sẽ báo cáo trực tiếp từ ứng dụng di động nếu phát sinh vấn đề trên đường tour.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {incidents.map((inc) => {
                        const categoryLabels: Record<IncidentCategory, { label: string; icon: string; style: string }> = {
                          HEALTH: { label: "Y tế & Sức khỏe", icon: "🏥", style: "bg-rose-50 text-rose-800 border-rose-200" },
                          VEHICLE: { label: "Phương tiện vận chuyển", icon: "🚗", style: "bg-amber-50 text-amber-800 border-amber-200" },
                          WEATHER: { label: "Thời tiết & Thiên tai", icon: "⛈️", style: "bg-sky-50 text-sky-800 border-sky-200" },
                          CUSTOMER: { label: "Khách hàng & Thành viên", icon: "👥", style: "bg-[#F0F9FF] text-purple-800 border-[#F97316]/30" },
                          SECURITY: { label: "An ninh & Trật tự", icon: "🛡️", style: "bg-indigo-50 text-indigo-800 border-indigo-200" },
                          SCHEDULE: { label: "Lịch trình & Thời gian", icon: "⏰", style: "bg-orange-50 text-orange-800 border-orange-200" },
                          OTHER: { label: "Sự cố khác", icon: "📋", style: "bg-gray-50 text-gray-800 border-gray-200" },
                        };
                        const cat = categoryLabels[inc.incidentType] || categoryLabels.OTHER;

                        const statusBadges = {
                          REPORTED: { label: "Mới báo cáo", color: "bg-amber-100 text-amber-800 border-amber-300" },
                          IN_PROGRESS: { label: "Đang xử lý", color: "bg-[#E0F2FE] text-blue-800 border-blue-300" },
                          RESOLVED: { label: "Đã giải quyết", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
                        };
                        const st = statusBadges[inc.status];

                        return (
                          <div
                            key={inc.id}
                            className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                              inc.status === "RESOLVED"
                                ? "bg-white border-gray-200"
                                : inc.status === "IN_PROGRESS"
                                ? "bg-[#F0F9FF]/30 border-[#CBD5E1] shadow-2xs"
                                : "bg-amber-50/40 border-amber-300 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${cat.style}`}>
                                    {cat.icon} {cat.label}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${st.color}`}>
                                    {st.label}
                                  </span>
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mt-1">{inc.title}</h4>
                              </div>
                              <span className="text-[11px] text-gray-500 font-medium">
                                {inc.reportedAt}
                              </span>
                            </div>

                            <p className="text-gray-700 leading-relaxed bg-white/90 p-3 rounded-lg border border-gray-100 text-xs">
                              {inc.description}
                            </p>

                            {/* Evidence Photo Preview */}
                            {inc.evidenceUrls && inc.evidenceUrls.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                                  <Camera className="w-3.5 h-3.5 text-[#075985]" />
                                  Ảnh minh chứng hiện trường ({inc.evidenceUrls.length}):
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {inc.evidenceUrls.map((url, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setProofPreviewData({
                                          title: inc.title,
                                          image: url,
                                          time: inc.reportedAt,
                                          note: inc.description,
                                          guideName: inc.reportedByName,
                                        });
                                        setPreviewProofModalOpen(true);
                                      }}
                                      className="relative group w-20 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-2xs"
                                    >
                                      <img src={url} alt="Minh chứng" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Eye className="w-4 h-4 text-white" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Resolution Note if resolved */}
                            {inc.resolutionNote && (
                              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1 text-xs">
                                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  Kết quả xử lý &amp; khắc phục:
                                  {inc.resolvedAt && (
                                    <span className="text-[11px] font-normal text-emerald-700 ml-auto">
                                      (Hoàn thành lúc {inc.resolvedAt})
                                    </span>
                                  )}
                                </p>
                                <p className="text-emerald-800 leading-relaxed text-[11px]">{inc.resolutionNote}</p>
                              </div>
                            )}

                            {/* Footer Info & Quick Status Actions */}
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                              <div className="text-gray-500">
                                Báo cáo bởi: <strong className="text-gray-800">{inc.reportedByName}</strong>
                                {inc.agencyName && <> • Đơn vị: <strong className="text-[#EA580C]">{inc.agencyName}</strong></>}
                              </div>

                              <div className="flex items-center gap-1.5 ml-auto">
                                {inc.status === "REPORTED" && (
                                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    ⏳ Đang chờ HDV hiện trường cập nhật
                                  </span>
                                )}
                                {inc.status === "IN_PROGRESS" && (
                                  <span className="text-[11px] font-semibold text-[#075985] bg-[#F0F9FF] px-2 py-0.5 rounded border border-[#CBD5E1]">
                                    ⚙️ Đang xử lý tại hiện trường
                                  </span>
                                )}
                                {inc.status === "RESOLVED" && (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <Check className="w-3.5 h-3.5" /> Đã hoàn tất xử lý
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 1: LIVE CHECK-IN TRACKER */}
              {itinerarySubTab === "live_checkin" && (() => {
                const totalCheckins = attractionCheckins.length;
                const checkedInCount = attractionCheckins.filter((c) => c.attendanceStatus === "CHECKED_IN").length;
                const pendingCount = attractionCheckins.filter((c) => c.attendanceStatus === "PENDING").length;
                const skippedCount = attractionCheckins.filter((c) => c.attendanceStatus === "SKIPPED").length;
                const percentDone = totalCheckins > 0 ? Math.round((checkedInCount / totalCheckins) * 100) : 0;

                // Unique guides present in attractionCheckins
                const uniqueCheckinGuides = Array.from(
                  new Set(attractionCheckins.map((c) => c.guideId))
                ).map((gid) => {
                  const sample = attractionCheckins.find((c) => c.guideId === gid);
                  return {
                    guideId: gid,
                    guideName: sample?.guideName || gid,
                    count: attractionCheckins.filter((c) => c.guideId === gid).length,
                  };
                });

                return (
                  <div className="space-y-4">
                    {/* Top Action Bar with Guide Filters & Settings */}
                    <div className="bg-[#F0F9FF]/40 border border-[#F97316]/30 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-purple-900 font-bold">
                        <SlidersHorizontal className="w-4 h-4 text-[#F97316]" />
                        Bộ lọc theo Dõi Tiến Độ:
                      </div>

                      {/* Filter by Tour Guide (STRICTLY NO BUS / XE!) */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-gray-500 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#075985]" />
                          HDV dẫn đoàn:
                        </span>
                        <button
                          type="button"
                          onClick={() => setTrackerGuideFilter("all")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            trackerGuideFilter === "all"
                              ? "bg-[#075985] text-white shadow-2xs"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          Tất cả HDV ({totalCheckins})
                        </button>
                        {uniqueCheckinGuides.map((g) => (
                          <button
                            key={g.guideId}
                            type="button"
                            onClick={() => setTrackerGuideFilter(g.guideId)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              trackerGuideFilter === g.guideId
                                ? "bg-[#F97316] text-white shadow-2xs"
                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>👤 {g.guideName}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              trackerGuideFilter === g.guideId ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-600"
                            }`}>
                              {g.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Days & Attractions List */}
                    <div className="space-y-4 pt-1">
                      {[...booking.tour.itinerary].sort((a, b) => a.day - b.day).map((day) => {
                        const dayAttractions = [...(day.locations || [])].sort(
                          (a, b) => parseTimeToMinutes(a.time || "08:30") - parseTimeToMinutes(b.time || "08:30")
                        );
                        if (dayAttractions.length === 0) return null;

                        const dayAgencyId = day.createdByCompanyId || booking.companyId;

                        return (
                          <div key={day.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                            {/* Day Header */}
                            <div className="bg-gray-50/90 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-[#F97316] text-white rounded-full flex items-center justify-center font-bold text-xs shadow-2xs">
                                  {day.day}
                                </div>
                                <div>
                                  <h3 className="font-bold text-gray-900 text-sm">
                                    {day.title || "Chưa nhập tiêu đề"}
                                  </h3>
                                </div>
                              </div>


                            </div>

                            {/* Single-line Vertical Timeline Track */}
                            <div className="p-5 sm:p-6 bg-white">
                              <div className="relative pl-10 sm:pl-12 border-l-2 border-slate-200 ml-7 sm:ml-8 space-y-6">
                                {dayAttractions.map((loc, lIdx) => {
                                  const locAgencyId = loc.createdByCompanyId || dayAgencyId;
                                  const locAgencyName = agencyNameFor(locAgencyId);
                                  const isMyLoc = !!companyId && locAgencyId === companyId;
                                  const scheduledMinutes = parseTimeToMinutes(loc.time || "08:30");
                                  const scheduledTime = scheduledMinutes < 1440
                                    ? `${String(Math.floor(scheduledMinutes / 60)).padStart(2, "0")}:${String(scheduledMinutes % 60).padStart(2, "0")}`
                                    : loc.time || "08:30";

                                  // Find all checkin records matching this attraction
                                  const locCheckins = attractionCheckins.filter(
                                    (c) => c.bookingTimelineAttractionId === loc.id || (c.locationName === loc.name && c.dayNumber === day.day)
                                  );

                                  // Filter checkins by guide
                                  const filteredLocCheckins = locCheckins.filter((c) => {
                                    if (trackerGuideFilter !== "all" && c.guideId !== trackerGuideFilter) return false;
                                    return true;
                                  });

                                  // If a filter is active and this attraction has no matching checkins, skip
                                  if (
                                    trackerGuideFilter !== "all" &&
                                    filteredLocCheckins.length === 0 &&
                                    locCheckins.length > 0
                                  ) {
                                    return null;
                                  }

                                  // Determine attraction check-in status
                                  const hasCheckins = locCheckins.length > 0;
                                  const isAllCheckedIn = hasCheckins && locCheckins.every((c) => c.attendanceStatus === "CHECKED_IN");
                                  const hasAnyCheckedIn = locCheckins.some((c) => c.attendanceStatus === "CHECKED_IN");
                                  const isAllSkipped = hasCheckins && locCheckins.every((c) => c.attendanceStatus === "SKIPPED");
                                  const isPartial = hasAnyCheckedIn && !isAllCheckedIn;

                                  return (
                                    <div key={loc.id || lIdx} className="relative group">
                                      {/* Timeline Node on the line */}
                                      <div
                                        className={`absolute -left-[70px] sm:-left-[78px] top-0.5 w-14 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums ring-4 ring-white transition-all shadow-xs ${
                                          isAllCheckedIn
                                            ? "bg-emerald-500 text-white shadow-emerald-200"
                                            : isPartial
                                            ? "bg-blue-500 text-white shadow-blue-200"
                                            : isAllSkipped
                                            ? "bg-rose-100 text-rose-700 border-2 border-rose-300"
                                            : "bg-white border-2 border-slate-300 text-slate-500"
                                        }`}
                                        title={
                                          isAllCheckedIn
                                            ? "Đã check-in đầy đủ"
                                            : isPartial
                                            ? "Đang check-in (một số HDV đã đến)"
                                            : isAllSkipped
                                            ? "Đã bỏ qua điểm này"
                                            : "Chưa tới điểm check-in"
                                        }
                                      >
                                        <time>{scheduledTime}</time>
                                      </div>

                                      {/* Attraction Info */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-gray-900 text-sm">{loc.name}</h4>
                                          </div>

                                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${isMyLoc ? "bg-sky-50 text-sky-800 border-sky-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                            Phụ trách dẫn chặng: {locAgencyName}
                                          </span>
                                        </div>

                                        {/* Assigned Guides & Check-in Status underneath the attraction */}
                                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                          {locCheckins.length === 0 ? (
                                            isMyLoc ? (
                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-purple-300 bg-[#F0F9FF]/70 text-[#EA580C] hover:bg-[#F97316]/15 hover:border-purple-400 hover:shadow-2xs transition-all cursor-pointer group"
                                                  >
                                                    <UserPlus className="w-3.5 h-3.5 text-[#F97316] group-hover:scale-110 transition-transform" />
                                                    <span>+ Gán HDV cho điểm này</span>
                                                  </button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                  className="w-80 p-3.5 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 space-y-3"
                                                  align="start"
                                                  sideOffset={6}
                                                >
                                                  {/* Popover Header */}
                                                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
                                                    <div className="min-w-0">
                                                      <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 truncate">
                                                        <MapPin className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                                                        <span className="truncate">{loc.name}</span>
                                                      </h5>
                                                      <p className="text-[11px] text-gray-500 mt-0.5">
                                                        Chọn HDV phụ trách điểm này (Ngày {day.day}):
                                                      </p>
                                                    </div>
                                                  </div>

                                                  {/* Guides List */}
                                                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                                    {companyAllGuides.map((g) => {
                                                      const isAssigned = locCheckins.some((c) => c.guideId === g.guideId);
                                                      return (
                                                        <div
                                                          key={g.guideId}
                                                          onClick={() => handleToggleGuideForAttraction(loc.id || loc.name, loc.name, day.day, g)}
                                                          className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                                                            isAssigned
                                                              ? "bg-[#F0F9FF]/80 border-purple-300 shadow-2xs font-semibold"
                                                              : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                                                          }`}
                                                        >
                                                          <div className="flex items-center gap-2.5 min-w-0">
                                                            {g.guideAvatar ? (
                                                              <img
                                                                src={g.guideAvatar}
                                                                alt={g.guideName}
                                                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                                                              />
                                                            ) : (
                                                              <div className="w-8 h-8 rounded-full bg-[#075985] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                                {g.guideName[0]}
                                                              </div>
                                                            )}
                                                            <div className="min-w-0">
                                                              <p className="text-xs text-gray-900 truncate">{g.guideName}</p>
                                                              <p className="text-[10px] text-gray-500 truncate">{g.guidePhone || "HDV Công ty"}</p>
                                                            </div>
                                                          </div>

                                                          <div
                                                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                                              isAssigned
                                                                ? "bg-[#F97316] border-purple-600 text-white shadow-2xs"
                                                                : "border-gray-300 bg-white"
                                                            }`}
                                                          >
                                                            {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>

                                                  {/* Footer */}
                                                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                                                    <span className="text-gray-500 font-medium">
                                                      Đang gán: <strong className="text-[#EA580C]">{locCheckins.length} HDV</strong>
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 italic">Bấm chọn để cập nhật</span>
                                                  </div>
                                                </PopoverContent>
                                              </Popover>
                                            ) : (
                                              <div className="flex items-center gap-1.5 text-xs text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                                                <Lock className="w-3 h-3 text-slate-400" />
                                                <span>Chặng đối tác: {locAgencyName} phụ trách</span>
                                              </div>
                                            )
                                          ) : (
                                            <>
                                              {locCheckins.map((chk) => {
                                                const isChecked = chk.attendanceStatus === "CHECKED_IN";
                                                const isSkip = chk.attendanceStatus === "SKIPPED";
                                                const isPending = chk.attendanceStatus === "PENDING";

                                                // Respect current filter
                                                if (trackerGuideFilter !== "all" && chk.guideId !== trackerGuideFilter) return null;

                                                return (
                                                  <div
                                                    key={chk.id}
                                                    title={`HDV: ${chk.guideName}`}
                                                    className={`inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full text-xs border transition-all ${
                                                      isChecked
                                                        ? "bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-2xs"
                                                        : isSkip
                                                        ? "bg-rose-50/90 border-rose-200 text-rose-900"
                                                        : "bg-slate-50 border-slate-200 text-slate-700"
                                                    }`}
                                                  >
                                                    {/* Avatar HDV (Phóng to hơn, nhận diện trực quan qua ảnh) */}
                                                    {chk.guideAvatar ? (
                                                      <img
                                                        src={chk.guideAvatar}
                                                        alt={chk.guideName}
                                                        title={`HDV: ${chk.guideName}`}
                                                        className="w-7 h-7 rounded-full object-cover border border-slate-300 shadow-2xs shrink-0"
                                                      />
                                                    ) : (
                                                      <div
                                                        title={`HDV: ${chk.guideName}`}
                                                        className="w-7 h-7 rounded-full bg-[#075985] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                                                      >
                                                        {chk.guideName ? chk.guideName[0] : "H"}
                                                      </div>
                                                    )}

                                                    {/* Badge trạng thái */}
                                                    {isChecked ? (
                                                      <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                        Đã check-in {chk.checkedAt ? `(${chk.checkedAt})` : ""}
                                                      </span>
                                                    ) : isSkip ? (
                                                      <span
                                                        className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full"
                                                        title={chk.notes || "Bỏ qua"}
                                                      >
                                                        <X className="w-3 h-3 text-rose-600" />
                                                        Đã bỏ qua
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1 font-medium text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                        Chưa check-in
                                                      </span>
                                                    )}

                                                    {/* Nút xem ảnh minh chứng (chỉ khi HDV đã upload ảnh từ app) */}
                                                    {isChecked && chk.photoProofUrl && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setProofPreviewData({
                                                            title: `Minh chứng check-in: ${chk.locationName}`,
                                                            image: chk.photoProofUrl!,
                                                            time: chk.checkedAt,
                                                            note: chk.notes,
                                                            guideName: chk.guideName,
                                                          });
                                                          setPreviewProofModalOpen(true);
                                                        }}
                                                        className="text-[#075985] hover:text-blue-800 text-[11px] font-semibold underline flex items-center gap-0.5 ml-0.5"
                                                        title="Xem ảnh xác nhận check-in thực tế do HDV gửi lên"
                                                      >
                                                        <Camera className="w-3 h-3" />
                                                        Xem ảnh
                                                      </button>
                                                    )}

                                                    {/* Nút hủy gán nhanh nếu chưa check-in */}
                                                    {isMyLoc && isPending && (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          handleToggleGuideForAttraction(
                                                            loc.id || loc.name,
                                                            loc.name,
                                                            day.day,
                                                            { guideId: chk.guideId, guideName: chk.guideName }
                                                          );
                                                        }}
                                                        title={`Hủy gán HDV này khỏi điểm ${loc.name}`}
                                                        className="w-4 h-4 rounded-full hover:bg-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors ml-0.5"
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    )}
                                                  </div>
                                                );
                                              })}

                                              {/* Nút thêm HDV dẫn cùng điểm này */}
                                              {isMyLoc && (
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <button
                                                      type="button"
                                                      title="Thêm hoặc đổi HDV cho điểm này"
                                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-slate-300 text-slate-600 hover:text-[#EA580C] hover:border-purple-400 hover:bg-[#F0F9FF] transition-all cursor-pointer shadow-2xs"
                                                    >
                                                      <Plus className="w-3 h-3 text-[#F97316]" />
                                                      <span className="text-[11px]">Thêm HDV</span>
                                                    </button>
                                                  </PopoverTrigger>
                                                  <PopoverContent
                                                    className="w-80 p-3.5 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 space-y-3"
                                                    align="start"
                                                    sideOffset={6}
                                                  >
                                                    {/* Popover Header */}
                                                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
                                                      <div className="min-w-0">
                                                        <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 truncate">
                                                          <MapPin className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                                                          <span className="truncate">{loc.name}</span>
                                                        </h5>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                                          Thêm hoặc bớt HDV phụ trách điểm này (Ngày {day.day}):
                                                        </p>
                                                      </div>
                                                    </div>

                                                    {/* Guides List */}
                                                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                                      {companyAllGuides.map((g) => {
                                                        const isAssigned = locCheckins.some((c) => c.guideId === g.guideId);
                                                        return (
                                                          <div
                                                            key={g.guideId}
                                                            onClick={() => handleToggleGuideForAttraction(loc.id || loc.name, loc.name, day.day, g)}
                                                            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer select-none ${
                                                              isAssigned
                                                                ? "bg-[#F0F9FF]/80 border-purple-300 shadow-2xs font-semibold"
                                                                : "bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                                                            }`}
                                                          >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                              {g.guideAvatar ? (
                                                                <img
                                                                  src={g.guideAvatar}
                                                                  alt={g.guideName}
                                                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                                                                />
                                                              ) : (
                                                                <div className="w-8 h-8 rounded-full bg-[#075985] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                                  {g.guideName[0]}
                                                                </div>
                                                              )}
                                                              <div className="min-w-0">
                                                                <p className="text-xs font-bold text-gray-900 truncate">{g.guideName}</p>
                                                                <p className="text-[10px] text-gray-500 truncate">{g.guidePhone || "HDV Công ty"}</p>
                                                              </div>
                                                            </div>

                                                            <div
                                                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                                                isAssigned
                                                                  ? "bg-[#F97316] border-purple-600 text-white shadow-2xs"
                                                                  : "border-gray-300 bg-white"
                                                              }`}
                                                            >
                                                              {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                                                      <span className="text-gray-500 font-medium">
                                                        Đang gán: <strong className="text-[#EA580C]">{locCheckins.length} HDV</strong>
                                                      </span>
                                                      <span className="text-[10px] text-gray-400 italic">Bấm chọn để cập nhật</span>
                                                    </div>
                                                  </PopoverContent>
                                                </Popover>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* VIEW 2: STANDARD ITINERARY */}
              {itinerarySubTab === "standard" && (
                <div className="space-y-4">
                {booking.tour.itinerary.map((day) => {
                  const dayLocChange = locChanges.find(
                    (lc) => lc.dayNumber === day.day || lc.dayId === day.id
                  );
                  const dayMealChanges = mealChangesList.filter(
                    (mc) => mc.dayNumber === day.day
                  );

                  const dayHasChanges = Boolean(dayLocChange || (dayMealChanges && dayMealChanges.length > 0));

                  return (
                    <div
                      key={day.id}
                      className={`rounded-xl border overflow-hidden ${
                        dayHasChanges ? "border-amber-300" : "border-gray-200"
                      }`}
                    >
                      {/* Day header */}
                      <div
                        className={`px-4 py-3 flex items-center justify-between ${
                          dayHasChanges ? "bg-amber-50" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-[#F97316] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-xs">
                            {day.day}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">
                              {day.title || "Chưa nhập tiêu đề"}

                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {dayLocChange && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-medium border border-amber-300">
                              Đổi điểm tham quan
                            </span>
                          )}
                          {dayMealChanges && dayMealChanges.length > 0 && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-medium border border-emerald-300">
                              Đổi bữa ăn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Day description & Sightseeing locations */}
                      <div className="px-4 py-3.5 space-y-3 bg-white">
                        {day.description && (
                          <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            {day.description}
                          </p>
                        )}

                        {/* Unified Locations & Meals Timeline */}
                        {(() => {
                          type UnifiedItem =
                            | {
                                kind: "location";
                                key: string;
                                time: string;
                                minutes: number;
                                loc: any;
                              }
                            | {
                                kind: "meal";
                                key: string;
                                time: string;
                                minutes: number;
                                meal: any;
                              };

                          const timelineItems: UnifiedItem[] = [
                            ...(day.locations || []).map((loc, lIdx) => {
                              const time = loc.time || "08:30";
                              return {
                                kind: "location" as const,
                                key: loc.id || `loc-${lIdx}`,
                                time,
                                minutes: parseTimeToMinutes(time),
                                loc,
                              };
                            }),
                            ...(day.meals || []).map((meal, mIdx) => {
                              const defTime = meal.type === "breakfast" ? "07:30" : meal.type === "lunch" ? "12:00" : "18:30";
                              const time = meal.time || defTime;
                              return {
                                kind: "meal" as const,
                                key: meal.id || `meal-${mIdx}`,
                                time,
                                minutes: parseTimeToMinutes(time),
                                meal,
                              };
                            }),
                          ];

                          timelineItems.sort((a, b) => a.minutes - b.minutes);

                          if (timelineItems.length === 0) {
                            return (
                              <p className="text-xs text-gray-500 italic pl-4 py-2">
                                Hoạt động tự do hoặc di chuyển theo lịch trình tour.
                              </p>
                            );
                          }

                          return (
                            <div className="relative pl-1">
                              {/* Continuous vertical timeline axis */}
                              <div className="absolute left-[95px] top-3 bottom-3 w-0.5 bg-gray-200" />

                              <div className="space-y-3">
                                {timelineItems.map((item) => {
                                  if (item.kind === "location") {
                                    const { loc, time } = item;
                                    const ownsLocation = !!companyId && (loc.createdByCompanyId || booking.companyId) === companyId;
                                    const locationEditDisabled = !canAmend || !!loc.checkedIn || !ownsLocation;
                                    const locChange = loc.originalName !== undefined ? undefined : locChanges.find(
                                      (lc) =>
                                        (lc.dayId === day.id || lc.dayNumber === day.day) &&
                                        (lc.locationId === loc.id ||
                                          (lc.originalLocationName && lc.originalLocationName.toLowerCase() === loc.name.toLowerCase()) ||
                                          (lc.originalLocations && lc.originalLocations.some((orig) => orig.toLowerCase() === loc.name.toLowerCase())))
                                    );
                                    const currentLocationName = locChange?.requestedLocations || loc.name;
                                    const originalLocationName = loc.originalName || locChange?.originalLocationName || loc.name;
                                    const locationReason = loc.changeReason || locChange?.note;
                                    const isLocChanged = currentLocationName !== originalLocationName;

                                    return (
                                      <div key={item.key} className="relative flex items-start gap-2.5">
                                        {/* Time pill */}
                                        <div className="w-[72px] flex-shrink-0 text-right pr-1 pt-2">
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                            <Clock className="w-3 h-3 text-blue-500" />
                                            {time}
                                          </span>
                                        </div>

                                        {/* Dot */}
                                        <div
                                          className={`relative z-10 flex-shrink-0 mt-1.5 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-2xs ${
                                            isLocChanged
                                              ? "bg-amber-400 border-amber-400 text-white"
                                              : "bg-white border-blue-400 text-blue-500"
                                          }`}
                                        >
                                          <MapPin className="w-3.5 h-3.5" />
                                        </div>

                                        {/* Content card */}
                                        <div
                                          className={`flex-1 rounded-xl border p-3 shadow-2xs transition-all ${
                                            isLocChanged ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                              {isLocChanged ? (
                                                <>
                                                  <p className="text-xs text-gray-500">Lúc đặt: {originalLocationName}</p>
                                                  <p className="text-sm font-medium text-amber-800 mt-0.5">
                                                    {currentLocationName}
                                                  </p>
                                                  {locationReason && (
                                                    <p className="text-xs text-amber-700 italic mt-0.5">
                                                      Lý do đổi: {locationReason}
                                                    </p>
                                                  )}
                                                </>
                                              ) : (
                                                <p className="font-medium text-gray-900 text-sm">{loc.name}</p>
                                              )}
                                              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="h-3 w-3"/>Phụ trách dẫn chặng: <strong className="font-medium text-sky-800">{agencyNameFor(loc.createdByCompanyId||booking.companyId)}</strong></p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (locationEditDisabled) return;
                                                  setServiceEditType("location");
                                                  setEditItemId(loc.id);
                                                  setEditTargetDay(day.day);
                                                  setEditTargetKey(loc.id || loc.name);
                                                  setEditOldName(currentLocationName);
                                                  setEditNewName(currentLocationName);
                                                  setEditPriceDiff("0");
                                                  setEditReason("Đã liên hệ thống nhất với khách đổi điểm tham quan");
                                                  setEditAddressOrNote("");
                                                  setServiceEditModalOpen(true);
                                                }}
                                                className="text-xs text-amber-700 hover:text-amber-900 bg-white hover:bg-amber-100/70 border border-amber-300 px-2 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-slate-100 disabled:hover:text-slate-400"
                                                disabled={locationEditDisabled}
                                                title={!ownsLocation ? "Chỉ Agency tạo địa điểm này được thay đổi" : loc.checkedIn ? "Địa điểm đã check-in không thể thay đổi" : "Điều chỉnh hoặc đổi điểm đến này"}
                                              >
                                                <Edit className={`w-3 h-3 ${locationEditDisabled ? "text-slate-400" : "text-amber-600"}`} />
                                                <span>Đổi điểm</span>
                                              </button>
                                              {isLocChanged && (
                                                <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-amber-100 text-amber-700 border border-amber-300">
                                                  Đã đổi
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    const defaultMeal = item.meal;
                                    const ownsMeal=ownsItem(defaultMeal.createdByCompanyId);
                                    const mealEditDisabled=!canAmend || !ownsMeal;
                                    const { time } = item;
                                    const mealType = defaultMeal.type as "breakfast" | "lunch" | "dinner";
                                    const mealChange = dayMealChanges?.find((mc) => mc.mealType === mealType);
                                    const isChanged = Boolean(mealChange);
                                    const mealLabel =
                                      mealType === "breakfast" ? "Bữa sáng" : mealType === "lunch" ? "Bữa trưa" : "Bữa tối";

                                    return (
                                      <div key={item.key} className="relative flex items-start gap-2.5">
                                        {/* Time pill */}
                                        <div className="w-[72px] flex-shrink-0 text-right pr-1 pt-2">
                                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono border shadow-2xs ${
                                            mealType === "breakfast"
                                              ? "bg-amber-50 text-amber-800 border-amber-200"
                                              : mealType === "lunch"
                                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                              : "bg-purple-50 text-[#EA580C] border-purple-200"
                                          }`}>
                                            <Clock className={`w-3 h-3 ${
                                              mealType === "breakfast" ? "text-amber-600" : mealType === "lunch" ? "text-emerald-600" : "text-[#F97316]"
                                            }`} />
                                            {time}
                                          </span>
                                        </div>

                                        {/* Dot */}
                                        <div
                                          className={`relative z-10 flex-shrink-0 mt-1.5 w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-2xs ${
                                            mealType === "breakfast"
                                              ? "bg-amber-100 border-amber-400 text-amber-700"
                                              : mealType === "lunch"
                                              ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                                              : "bg-[#F97316]/15 border-purple-500 text-[#EA580C]"
                                          }`}
                                        >
                                          {mealType === "breakfast" ? (
                                            <Sun className="w-3.5 h-3.5" />
                                          ) : mealType === "dinner" ? (
                                            <UtensilsCrossed className="w-3.5 h-3.5" />
                                          ) : (
                                            <Utensils className="w-3.5 h-3.5" />
                                          )}
                                        </div>

                                        {/* Meal card */}
                                        <div
                                          className={`flex-1 rounded-xl border p-3 shadow-2xs transition-all ${
                                            isChanged
                                              ? "border-emerald-300 bg-emerald-50/30"
                                              : mealType === "breakfast"
                                              ? "border-amber-200 bg-amber-50/30"
                                              : mealType === "lunch"
                                              ? "border-emerald-200 bg-emerald-50/30"
                                              : "border-purple-200 bg-[#F0F9FF]/40"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                  mealType === "breakfast"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : mealType === "lunch"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-[#F97316]/15 text-[#EA580C]"
                                                }`}
                                              >
                                                {mealType === "breakfast" ? (
                                                  <Sun className="w-4 h-4" />
                                                ) : mealType === "dinner" ? (
                                                  <UtensilsCrossed className="w-4 h-4" />
                                                ) : (
                                                  <Utensils className="w-4 h-4" />
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                                                    mealType === "breakfast"
                                                      ? "bg-amber-100 text-amber-800 border-amber-300"
                                                      : mealType === "lunch"
                                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                                      : "bg-[#F97316]/15 text-[#EA580C] border-purple-300"
                                                  }`}>
                                                    {mealLabel}
                                                  </span>
                                                  <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                                    {isChanged
                                                      ? mealChange?.newMealName
                                                      : defaultMeal.serviceName || "Nhà hàng theo tour"}
                                                  </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500">
                                                  Lúc đặt: {defaultMeal.originalName || defaultMeal.serviceName || "Nhà hàng địa phương"}
                                                </p>
                                                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="h-3 w-3"/>Agency bố trí: <strong className="font-medium text-sky-800">{agencyNameFor(defaultMeal.createdByCompanyId||booking.companyId)}</strong></p>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if(mealEditDisabled)return;
                                                  setServiceEditType("meal");
                                                  setEditItemId(defaultMeal.id || "");
                                                  setEditTargetDay(day.day);
                                                  setEditTargetKey(mealType);
                                                  setEditOldName(defaultMeal.serviceName || "Nhà hàng theo tour");
                                                  setEditNewName(isChanged ? mealChange?.newMealName || defaultMeal.serviceName || "" : defaultMeal.serviceName || "");
                                                  setEditPriceDiff("0");
                                                  setEditReason(mealChange?.note || "Đã liên hệ thống nhất với khách đổi nhà hàng / bữa ăn");
                                                  setEditAddressOrNote("");
                                                  setServiceEditModalOpen(true);
                                                }}
                                                disabled={mealEditDisabled} className="text-xs text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:bg-slate-100 disabled:hover:text-slate-400"
                                                title={!ownsMeal?`Mục này do ${agencyNameFor(defaultMeal.createdByCompanyId||booking.companyId)} bố trí. Chỉ Agency đó được cập nhật.`:"Điều chỉnh bữa ăn & nhà hàng này"}
                                              >
                                                <Edit className={`w-3 h-3 ${mealEditDisabled?"text-slate-400":"text-emerald-600"}`} />
                                                <span>Đổi bữa ăn</span>
                                              </button>
                                              {isChanged && (<div className="border border-gray-200 bg-white px-2.5 py-1 rounded-md text-xs text-gray-500 flex items-center gap-1 shadow-2xs">
                                                  <span className="text-[10px] text-emerald-800 font-bold">
                                                    Đã đổi {mealChange?.priceDifference ? `(+${formatVND(mealChange.priceDifference)})` : ""}
                                                  </span>

                                              </div>)}
                                            </div>
                                          </div>
                                          <BookingSupplierConfirmation state={currentQuotationState}
                                            slot={{ kind: "meal", itemId: defaultMeal.id,
                                              serviceId: isChanged ? mealChange?.serviceId : defaultMeal.serviceId }}
                                            supplierSource={isChanged ? (mealChange?.isCustom || mealChange?.mode === "custom"
                                              ? "AGENCY_SUPPLIER" : "PLATFORM_PARTNER") : defaultMeal.supplierSource}
                                            supplier={isChanged ? { address: mealChange?.address, contactPhone: mealChange?.providerPhone } : defaultMeal.supplier}
                                            onOpenService={setViewingServiceId} />
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          )}
        </div>

        {/* Right Sidebar (Contact, Finance, Guide, Contract) */}
        <div className="space-y-6">
          {/* CONTACT INFO CARD */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#075985]" />
              Thông tin Người đại diện
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px]">Họ & Tên</span>
                <span className="font-bold text-gray-900 text-sm">{booking.contactName || booking.userName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Số điện thoại liên hệ</span>
                <span className="font-semibold text-[#075985] flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {booking.contactPhone || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Email</span>
                <span className="font-medium text-gray-800 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {booking.contactEmail || booking.userEmail}
                </span>
              </div>
              {booking.contactAddress && (
                <div>
                  <span className="text-gray-400 block text-[11px]">Địa chỉ liên lạc</span>
                  <span className="text-gray-700 flex items-start gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    {booking.contactAddress}
                  </span>
                </div>
              )}
              {booking.bookingNotes && !isClosedBooking && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-900 mt-2">
                  <span className="font-bold block mb-1">Ghi chú từ khách hàng:</span>
                  <p className="leading-relaxed">{booking.bookingNotes}</p>
                </div>
              )}
            </div>
          </div>

          {!isClosedBooking && <>
          {isCurrentCompanyLead ? (<>
          {/* FINANCE & PAYMENT STATUS CARD */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#075985]" />
                Tài chính & Thanh toán
              </h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${pst.color}`}>
                {pst.label}
              </span>
            </div>

            {/* Total Price with Adjustment option */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                {hasBeenApproved && <div className="space-y-1 border-b border-slate-200 pb-2 text-xs">
                  <div className="flex justify-between gap-2"><span className="flex items-center gap-1 text-slate-500"><Lock className="h-3 w-3" /> Giá tour đã chốt</span><strong>{formatVND(booking.baseTourPrice ?? booking.totalPrice)}</strong></div>
                  {(booking.baseTourPrice??booking.totalPrice)+(booking.surchargeAmount??0)>booking.totalPrice&&<div className="flex justify-between gap-2 text-emerald-700"><span>Giảm giá đã duyệt</span><strong>−{formatVND((booking.baseTourPrice??booking.totalPrice)+(booking.surchargeAmount??0)-booking.totalPrice)}</strong></div>}
                  <div className="flex justify-between gap-2"><span className="text-slate-500">Phụ thu phát sinh</span><strong className="text-amber-700">+{formatVND(booking.surchargeAmount ?? 0)}</strong></div>
                </div>}
                <div className="flex justify-between items-center gap-3">
                  <span className="text-gray-500 font-medium">Tổng giá trị đơn ({booking.numberOfGuests} khách):</span>
                  <span className="font-extrabold text-[#075985] text-base whitespace-nowrap">{formatVND(booking.totalPrice)}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {hasBeenApproved ? <Button size="sm" variant="ghost" disabled={!canAddSurcharge} onClick={() => setSurchargeOpen(true)} className="h-7 gap-1 px-2 text-xs text-sky-800"><Plus className="h-3.5 w-3.5" /> Thêm phụ thu</Button> : <>
                  <Button size="sm" variant="ghost" disabled={!canChangePrice || !onUpdateBookingPrice}
                    onClick={() => { setNewPriceInput(String(booking.totalPrice)); setPriceNoteInput(""); setPriceModalOpen(true); }}
                    className="h-7 px-2 text-xs text-sky-800 gap-1" title={canChangePrice ? "Điều chỉnh giá trước khi duyệt" : "Giá tour đã khóa sau khi duyệt"}>
                    <Edit3 className="h-3.5 w-3.5" /> Đổi giá
                  </Button>
                  </>}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPriceAdjustmentsModalOpen(true)}
                    className="h-7 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 gap-1 font-semibold"
                    title="Xem nhật ký lịch sử điều chỉnh giá và biến động thành viên đoàn"
                  >
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    Nhật ký điều chỉnh ({booking.priceAdjustments?.length || 0})
                  </Button>
                </div>

                {booking.originalTotalPrice && booking.originalTotalPrice !== booking.totalPrice && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-400 line-through">Giá gốc: {formatVND(booking.originalTotalPrice)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                      Đã điều chỉnh ({booking.totalPrice > booking.originalTotalPrice ? "+" : ""}{formatVND(booking.totalPrice - booking.originalTotalPrice)})
                    </span>
                  </div>
                )}

                {booking.priceAdjustmentNote && (
                  <p className="text-[11px] text-gray-600 italic bg-white p-2 rounded border border-gray-200">
                    <strong>Ghi chú điều chỉnh giá:</strong> {booking.priceAdjustmentNote}
                  </p>
                )}

                {latestPriceAdjustment && (
                  <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-1">
                    <div className="flex justify-between items-center font-bold">
                      <span className="flex items-center gap-1 text-[11px]">
                        <History className="w-3 h-3 text-amber-600" />
                        Điều chỉnh gần nhất:
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(latestPriceAdjustment.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 line-clamp-1 italic">
                      "{latestPriceAdjustment.reason}"
                    </p>
                  </div>
                )}
              </div>

              {/* Payment status row */}
              <div className="flex justify-between items-center py-1 border-b border-gray-100">
                <span className="text-gray-500">Trạng thái thanh toán:</span>
                <span className={`font-bold ${booking.paymentStatus === "paid" ? "text-emerald-700" : booking.paymentStatus === "refunded" ? "text-[#EA580C]" : "text-amber-700"}`}>
                  {booking.paymentStatus === "paid"
                    ? "Đã thanh toán"
                    : booking.paymentStatus === "refunded"
                    ? "Đã hoàn tiền"
                    : booking.paymentStatus === "partially_paid"
                    ? "Đã thanh toán một phần"
                    : "Chưa thanh toán"}
                </span>
              </div>

              {/* Progress breakdown */}
              {(() => {
                const paid = booking.paidAmount ?? 0;
                const remaining = Math.max(0, booking.totalPrice - paid);
                return (
                  <div className="space-y-1.5 py-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500">Khách đã thanh toán:</span>
                      <span className="font-bold text-emerald-700">{formatVND(paid)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500">Còn lại phải thu:</span>
                      <span className="font-bold text-amber-700">{formatVND(remaining)} / {formatVND(booking.totalPrice)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Settlement status banner */}
              {booking.settlementStatus === "settled" ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Admin sàn đã quyết toán tiền tour:
                  </p>
                  <p>Số tiền đã nhận: <strong className="text-emerald-700 text-xs">{formatVND(booking.settledAmount ?? 0)}</strong> {booking.platformFeeRate ? `(Đã khấu trừ ${booking.platformFeeRate}% phí sàn ${formatVND(booking.platformFeeAmount ?? 0)})` : "(Đã khấu trừ 10% phí sàn)"}</p>
                  {booking.settledAt && <p className="text-gray-500">Ngày quyết toán: {booking.settledAt}</p>}
                </div>
              ) : booking.status === "completed" ? (
                <div className="bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-3 text-[11px] text-blue-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-blue-800">
                    <Clock className="w-4 h-4 text-[#075985]" />
                    Tour đã hoàn thành:
                  </p>
                  <p>Hệ thống đang tạm giữ tiền. Admin sàn sẽ sớm đối soát và giải ngân chi trả cho Quý công ty.</p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Tiền khách trả được giữ tại tài khoản TripOps và chuyển cho công ty sau khi tour kết thúc.
                </p>
              )}
            </div>

            {booking.travelContract && (
              <ContractCard
                bookingId={booking.id}
                contract={booking.travelContract}
                onReview={onReviewContract ? (decision, note) => onReviewContract(booking.id, decision, note) : undefined}
              />
            )}

            {booking.cancellation && <CancellationStatusCard cancellation={booking.cancellation} />}

            {onCancelBooking && isCurrentCompanyLead && !agencyCancellationPending &&
              (booking.status === "confirmed" || booking.status === "paid" || booking.status === "deposited") && (
                <Button
                  variant="outline"
                  onClick={openAgencyCancel}
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 gap-1.5 text-xs font-semibold h-9"
                >
                  <XCircle className="w-4 h-4" />
                  Hủy đơn này
                </Button>
              )}

            {/* Lịch thanh toán do hệ thống tự tạo khi duyệt: chỉ giải thích ngắn khi đơn chưa có lịch. */}
            {(!booking.paymentRequests || booking.paymentRequests.length === 0) && (
              <p className="flex items-start gap-1.5 text-[11px] text-gray-500 leading-relaxed">
                <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                Duyệt đơn xong, hệ thống tự mở đợt cọc 50% (hạn 24 giờ) và đợt còn lại (hạn trước khởi hành 1 tuần).
              </p>
            )}

            {booking.paymentRequests && booking.paymentRequests.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">Lịch thanh toán của khách:</span>
                <div className="space-y-2">
                  {booking.paymentRequests.map((pr) => (
                    <div key={pr.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-[#075985] block">
                            {pr.stage === "deposit" ? "Đợt 1 · Đặt cọc" : pr.stage === "balance" ? "Đợt 2 · Phần còn lại"
                              : pr.stage === "surcharge" ? "Phụ thu phát sinh" : pr.stage === "full" ? "Thanh toán toàn bộ · Tour sát ngày" : "Đợt thanh toán"}
                          </span>
                          <p className="font-semibold text-gray-800">{pr.description}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${
                          pr.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : pr.status === "overdue"
                            ? "bg-red-100 text-red-800 border-red-200"
                            : pr.status === "scheduled"
                            ? "bg-gray-100 text-gray-700 border-gray-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}>
                          {pr.status === "paid" ? "Đã thanh toán" : pr.status === "overdue" ? "Quá hạn" : pr.status === "scheduled" ? (pr.stage === "surcharge" ? "Chờ thanh toán các khoản trước" : "Mở sau khi đủ cọc") : pr.status === "not_issued" ? "Chưa phát hành" : "Chờ khách thanh toán"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 pt-1">
                        <span>Hạn: {pr.dueAt ? `${formatVietnamDeadline(pr.dueAt)} (giờ VN)` : pr.dueDate || "—"}</span>
                        <span className="font-bold text-[#075985] text-sm">{formatVND(pr.amount)}</span>
                      </div>
                      {pr.warning && pr.status !== "paid" && (
                        <p className="text-[10px] text-amber-700">{pr.warning}</p>
                      )}
                      {pr.paidAt && (
                        <p className="text-[10px] text-emerald-600 font-medium">
                          Khách đã thanh toán ngày: {pr.paidAt}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {booking.paymentTransactions && booking.paymentTransactions.some((t) => t.status === "success") && (
              <div className="pt-3 border-t border-gray-100 space-y-1.5">
                <span className="text-xs font-bold text-gray-700 block">Giao dịch đã ghi nhận:</span>
                {booking.paymentTransactions.filter((t) => t.status === "success").map((t) => (
                  <div key={t.id} className="flex justify-between text-[11px] text-gray-600">
                    <span className="font-mono truncate">{t.method === "PAYOS" ? "payOS" : t.method === "VNPAY" ? "VNPAY (cũ)" : t.method} · {t.code}</span>
                    <span className="font-bold text-emerald-700 flex-shrink-0 ml-2">{formatVND(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>) : (<PartnerBookingRevenue booking={booking} agencyId={companyId}/>)}
          </>}

        </div>
      </div>

      {/* MODAL: TỪ CHỐI BOOKING */}
      <AlertDialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <AlertDialogContent aria-describedby={undefined} tone="error" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Từ chối Đặt tour</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 pt-2">
            <Label className="text-xs">Lý do từ chối gửi đến khách hàng <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Không đủ chỗ, lịch trình yêu cầu không khả thi trong mùa này..."
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2">
              <AlertDialogCancel asChild><Button data-slot="alert-dialog-cancel" variant="outline" onClick={() => setRejectModalOpen(false)}>Hủy</Button></AlertDialogCancel>
              <Button data-slot="alert-dialog-action"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  onRejectBooking(booking.id, rejectReason);
                  setRejectModalOpen(false);
                }}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL: AGENCY HỦY ĐƠN ĐÃ DUYỆT */}
      <AlertDialog open={agencyCancelOpen} onOpenChange={setAgencyCancelOpen}>
        <AlertDialogContent aria-describedby={undefined} tone="error" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy đơn đặt tour</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            {!agencyCancelQuote && !agencyCancelError && <p className="text-gray-500">Đang tính hệ quả hủy...</p>}
            {agencyCancelQuote && (
              <div
                className={`rounded-xl border p-3 space-y-1 ${
                  agencyCancelQuote.mode === "overdue" ? "border-amber-300 bg-amber-50" : "border-[#CBD5E1] bg-[#F0F9FF]/70"
                }`}
              >
                <p className="font-semibold">{agencyCancelQuote.explanation}</p>
                {agencyCancelQuote.mode !== "immediate" && (
                  <p>
                    Khách đã trả <strong>{formatVND(agencyCancelQuote.paidAmount)}</strong> · hoàn lại{" "}
                    <strong>{formatVND(agencyCancelQuote.refundAmount)}</strong>
                  </p>
                )}
              </div>
            )}
            <Label className="text-xs">
              Lý do hủy (gửi cho khách và Admin) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={agencyCancelReason}
              onChange={(e) => {
                setAgencyCancelReason(e.target.value);
                setAgencyCancelError("");
              }}
              placeholder="VD: Không đủ số khách tối thiểu, thời tiết xấu, khách không thanh toán đợt 2..."
              rows={3}
            />
            {agencyCancelError && <p className="text-[11px] text-red-600">{agencyCancelError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <AlertDialogCancel asChild><Button data-slot="alert-dialog-cancel" variant="outline" onClick={() => setAgencyCancelOpen(false)}>
                Đóng
              </Button></AlertDialogCancel>
              <Button data-slot="alert-dialog-action"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!agencyCancelQuote || agencyCancelling}
                onClick={submitAgencyCancel}
              >
                {agencyCancelQuote?.mode === "immediate" ? "Hủy đơn ngay" : "Gửi yêu cầu hủy cho Admin"}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL: GIAO THÊM HƯỚNG DẪN VIÊN */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#075985]" />
              Phân công Hướng dẫn viên cho đoàn
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <div className="bg-[#F0F9FF]/70 p-3 rounded-xl border border-[#CBD5E1] text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                Đơn vị phân công: {companyName || currentAgency?.agencyName || "Công ty của bạn"}
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Quý công ty chỉ phân công hướng dẫn viên thuộc danh sách nhân sự của đơn vị mình. Mỗi hướng dẫn viên được chỉ định sẽ được bảo vệ quyền sở hữu, đơn vị khác không thể tự ý xóa hay thay thế.
              </p>
            </div>

            {guides.length === 0 ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                <p className="font-semibold text-amber-900">Chưa có hướng dẫn viên trực thuộc</p>
                <p className="text-[11px] text-amber-800">
                  Công ty của bạn chưa có danh sách hướng dẫn viên nào trong hệ thống.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Chọn Hướng dẫn viên <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {guides.map((g) => {
                      const isAlreadyAssigned = assignedGuides.some((ag) => ag.guideId === g.id);
                      const isSelected = selectedGuideToAdd === g.id;

                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            if (!isAlreadyAssigned) setSelectedGuideToAdd(g.id);
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                            isAlreadyAssigned
                              ? "opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed"
                              : isSelected
                              ? "border-blue-500 bg-[#F0F9FF]/70 ring-2 ring-blue-400/30 cursor-pointer"
                              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer"
                          }`}
                        >
                          {g.avatar ? (
                            <img src={g.avatar} alt={g.name} className="w-10 h-10 rounded-full object-cover border" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#075985] text-white font-bold flex items-center justify-center">
                              {g.name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-gray-900 text-xs">{g.name}</p>
                              {isAlreadyAssigned && (
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                                  Đã có trong đoàn
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">{g.phone || g.email}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Vai trò phụ trách trong đoàn <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={selectedGuideRole}
                    onChange={(e) => setSelectedGuideRole(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#075985] bg-white"
                  >
                    <option value="lead_guide">HDV Trưởng đoàn (Điều phối chung)</option>
                    <option value="stage_guide">HDV Chặng (Phụ trách chặng địa phương)</option>
                    <option value="support_guide">HDV Hỗ trợ / Phụ tá</option>
                    <option value="logistics">Hậu cần & Vận chuyển</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Ghi chú phân công (tùy chọn)</Label>
                  <Input
                    type="text"
                    value={selectedGuideNotes}
                    onChange={(e) => setSelectedGuideNotes(e.target.value)}
                    placeholder="VD: Phụ trách đón đoàn tại sân bay, dẫn chặng 2..."
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setAssignModalOpen(false)} className="border-rose-300 bg-white text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-semibold cursor-pointer transition-colors">Hủy</Button>
              <Button
                disabled={guides.length === 0 || !selectedGuideToAdd}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirmAddGuide}
              >
                Xác nhận phân công
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: THAY THẾ HƯỚNG DẪN VIÊN */}
      <Dialog open={replaceModalOpen} onOpenChange={setReplaceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-[#075985]" />
              Thay thế Hướng dẫn viên
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            {guideToReplace && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                <span className="text-[11px] text-gray-400 font-semibold block">Đang thay thế nhân sự:</span>
                <p className="font-bold text-gray-900 text-sm">{guideToReplace.guideName}</p>
                <p className="text-[11px] text-gray-500">Đơn vị quản lý: {guideToReplace.companyName}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Chọn Hướng dẫn viên thay thế <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {guides
                  .filter((g) => g.id !== guideToReplace?.guideId)
                  .map((g) => {
                    const isAlreadyAssigned = assignedGuides.some(
                      (ag) => ag.guideId === g.id && ag.id !== guideToReplace?.id
                    );
                    const isSelected = newReplacementGuideId === g.id;

                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          if (!isAlreadyAssigned) setNewReplacementGuideId(g.id);
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                          isAlreadyAssigned
                            ? "opacity-50 border-gray-200 bg-gray-50 cursor-not-allowed"
                            : isSelected
                            ? "border-blue-500 bg-[#F0F9FF]/70 ring-2 ring-blue-400/30 cursor-pointer"
                            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer"
                        }`}
                      >
                        {g.avatar ? (
                          <img src={g.avatar} alt={g.name} className="w-10 h-10 rounded-full object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#075985] text-white font-bold flex items-center justify-center">
                            {g.name[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-xs">{g.name}</p>
                          <p className="text-[11px] text-gray-500">{g.phone || g.email}</p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-bold text-[#075985]">Đã chọn</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setReplaceModalOpen(false)}>Hủy</Button>
              <Button
                disabled={!newReplacementGuideId}
                className="bg-[#075985] hover:bg-[#F97316] text-white font-bold"
                onClick={handleConfirmReplaceGuide}
              >
                Xác nhận thay thế
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BookingSurchargeDialog open={surchargeOpen} onOpenChange={setSurchargeOpen} bookingId={booking.id} expectedTotal={booking.totalPrice} agencies={booking.bookingAgencies||[]} onChanged={onBookingChanged} />

      {/* MODAL: ĐIỀU CHỈNH GIÁ TOUR TỔNG THỂ */}
      <Dialog open={priceModalOpen} onOpenChange={setPriceModalOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-gray-900">
              <Edit3 className="w-5 h-5 text-[#075985]" />
              Điều chỉnh Giá Tour Tổng Thể
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1 text-xs">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-1">
              <p className="text-gray-600">Đơn booking: <strong>#{booking.id}</strong> ({booking.userName})</p>
              <p className="text-gray-600">Giá hiện tại: <strong className="text-[#075985]">{formatVND(booking.totalPrice)}</strong></p>
              {booking.originalTotalPrice && (
                <p className="text-gray-400 text-[11px]">Giá gốc ban đầu: {formatVND(booking.originalTotalPrice)}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="booking-new-total" className="text-xs font-semibold text-gray-700">
                Giá tổng thể mới (VNĐ) <span className="text-red-500">*</span>
              </Label>
              <VietnameseMoneyInput
                id="booking-new-total"
                value={newPriceInput}
                onValueChange={setNewPriceInput}
                placeholder={booking.totalPrice.toLocaleString("vi-VN")}
                className="mt-1 text-xs font-bold text-[#075985]"
              />
              <p className="pt-1 text-[11px] text-gray-500">Chỉ được sửa giá trước lần duyệt đầu tiên. Sau khi duyệt, khoản phát sinh được tạo thành phụ thu riêng.</p>
              {parseInt(newPriceInput) > 0 && (
                <p className="text-[11px] text-gray-500 pt-0.5">
                  Tương đương: <strong>{formatVND(parseInt(newPriceInput))}</strong>
                  {parseInt(newPriceInput) !== booking.totalPrice && (
                    <span className="ml-2 font-bold text-amber-700">
                      ({parseInt(newPriceInput) > booking.totalPrice ? "+" : ""}
                      {formatVND(parseInt(newPriceInput) - booking.totalPrice)})
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">
                Ghi chú / Lý do điều chỉnh giá *
              </Label>
              <Textarea
                value={priceNoteInput}
                onChange={(e) => setPriceNoteInput(e.target.value)}
                placeholder="VD: Phụ thu nâng cấp phòng khách sạn view hồ và đổi bữa tối lẩu gà lá é..."
                rows={3}
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button disabled={priceSaving} variant="outline" onClick={() => setPriceModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                disabled={priceSaving || !canChangePrice || !Number.isSafeInteger(Number(newPriceInput)) || Number(newPriceInput) <= 0 || Number(newPriceInput) === booking.totalPrice || priceNoteInput.trim().length < 3}
                className="bg-[#075985] hover:bg-[#F97316] text-white font-bold"
                onClick={async () => {
                  if (!onUpdateBookingPrice) return;
                  setPriceSaving(true);
                  try {
                    const ok = await onUpdateBookingPrice(booking.id, Number(newPriceInput), priceNoteInput.trim());
                    if (ok !== false) setPriceModalOpen(false);
                  } finally { setPriceSaving(false); }
                }}
              >
                {priceSaving ? "Đang lưu…" : "Lưu giá mới"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: HỢP ĐỒNG ĐIỆN TỬ */}
      <Dialog open={contractModalOpen} onOpenChange={setContractModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#075985]" />
              Hợp đồng Dịch vụ Du lịch – {contractNo}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs text-gray-700 pt-2">
            <div className="text-center border-b pb-3">
              <p className="font-bold text-sm text-gray-900 uppercase">{companyName}</p>
              <p className="text-xs text-gray-500">Giấy phép kinh doanh lữ hành quốc tế</p>
              <p className="text-base font-bold mt-2 text-blue-800">HỢP ĐỒNG DỊCH VỤ LỮ HÀNH</p>
              <p className="text-[11px] text-gray-400">Số: {contractNo} – Ngày lập: {today}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2.5 rounded-lg border">
                <p className="font-bold text-gray-900 mb-1">BÊN A (CÔNG TY DU LỊCH):</p>
                <p>Tên: <strong>{companyName}</strong></p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-lg border">
                <p className="font-bold text-gray-900 mb-1">BÊN B (KHÁCH HÀNG):</p>
                <p>Đại diện: <strong>{booking.contactName || booking.userName}</strong></p>
                <p>SĐT: {booking.contactPhone || "—"}</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-1">ĐIỀU 1: NỘI DUNG VÀ THỜI GIAN</p>
              <p>Tour: <strong>{booking.tour.name}</strong> ({booking.tour.tourCode})</p>
              <p>Khởi hành: <strong>{booking.tourStartDate || "Theo thỏa thuận"}</strong> · Thời gian: {booking.tour.duration}</p>
              <p>Số lượng khách: <strong>{booking.numberOfGuests} người</strong></p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-1">ĐIỀU 2: GIÁ TRỊ VÀ PHƯƠNG THỨC THANH TOÁN</p>
              <p>Tổng giá trị hợp đồng: <strong className="text-[#075985]">{formatVND(booking.baseTourPrice ?? booking.totalPrice)}</strong></p>
              <p>Trạng thái thanh toán: <strong>{pst.label}</strong></p>
              {booking.remainingAmount !== undefined && booking.remainingAmount > 0 && (
                <p>Số tiền còn lại: <strong className="text-amber-700">{formatVND(booking.remainingAmount)}</strong></p>
              )}
            </div>

            {booking.hasLocationCustomization && (
              <div className="bg-[#F0F9FF] p-2.5 rounded-lg border border-[#F97316]/30">
                <p className="font-bold text-purple-900 mb-1">ĐIỀU KHOẢN TÙY CHỈNH LỊCH TRÌNH:</p>
                <p>Các điều chỉnh về khách sạn và điểm đến theo thỏa thuận đính kèm trong phụ lục booking.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setContractModalOpen(false)}>Đóng</Button>
            <Button className="bg-[#075985] hover:bg-[#F97316] text-white gap-1.5" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              In hợp đồng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passengerModalOpen} onOpenChange={open => !passengerSaving && setPassengerModalOpen(open)}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[760px]">
          <DialogHeader className="border-b px-5 py-4 text-left"><DialogTitle className="flex items-center gap-2 pr-6 text-base"><Users className="h-5 w-5 text-sky-800" />{passengerModalMode === "add" ? "Thêm hành khách vào đoàn" : "Chỉnh sửa hồ sơ hành khách"}</DialogTitle></DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs">
            {passengerModalMode==="add" && isCoHostedTour && <fieldset className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3"><legend className="px-1 font-semibold text-sky-900">Chặng tham gia *</legend>{agenciesList.map(a=><label key={a.agencyId} className="flex items-center gap-2 rounded bg-white p-2"><input type="checkbox" checked={selectedPassengerAgencies.includes(a.agencyId)} onChange={e=>setSelectedPassengerAgencies(ids=>e.target.checked?[...ids,a.agencyId]:ids.filter(id=>id!==a.agencyId))}/>{a.agencyName}<span className="ml-auto font-semibold text-sky-800">{formatVND(a.pricingTiers?.find(t=>{const age=calculateAge(passengerDob,booking.tourStartDate||booking.bookingDate)??30;return age>=(t.minAge??0)&&(t.maxAge==null||age<=t.maxAge);})?.pricePerGuest||0)}</span></label>)}<p className="text-sky-700">Giá vé lấy theo bảng giá chặng đã đặt. Phụ thu được ghi cho từng Agency được chọn.</p></fieldset>}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 font-semibold">Họ và tên *<Input maxLength={150} value={passengerName} onChange={e => setPassengerName(e.target.value)} placeholder="VD: Nguyễn Văn An" /></label>
              <label className="space-y-1.5 font-semibold">CCCD / Hộ chiếu<Input maxLength={50} value={passengerIdNumber} onChange={e => setPassengerIdNumber(e.target.value)} placeholder="Không bắt buộc với trẻ nhỏ" /></label>
              <div className="space-y-1.5"><label className="font-semibold">Ngày sinh *</label><VietnameseDatePicker value={passengerDob} onChange={passengerModalMode === "add" ? handlePassengerDobChange : setPassengerDob} /></div>
              <label className="space-y-1.5 font-semibold">Giới tính<select value={passengerGender} onChange={e => setPassengerGender(e.target.value as "male" | "female")} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="male">Nam</option><option value="female">Nữ</option></select></label>
              <label className="space-y-1.5 font-semibold">Nguyện vọng xếp phòng<Textarea rows={2} maxLength={2000} value={passengerRoommateNote} onChange={e => setPassengerRoommateNote(e.target.value)} placeholder="VD: Ở cùng Nguyễn Văn An, ưu tiên hai giường đơn…" /></label>
              <label className="space-y-1.5 font-semibold">Ăn uống / Dị ứng<Textarea rows={2} maxLength={2000} value={passengerDietaryNote} onChange={e => setPassengerDietaryNote(e.target.value)} placeholder="VD: Ăn chay, dị ứng hải sản, không ăn cay…" /></label>
              <label className="space-y-1.5 font-semibold sm:col-span-2">Hỗ trợ đặc biệt / Ghi chú<Textarea rows={2} maxLength={2000} value={passengerNotes} onChange={e => setPassengerNotes(e.target.value)} placeholder="VD: Cần xe lăn, dễ say xe, người thân đi cùng…" /></label>
            </div>
            {passengerModalMode === "add" && <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 sm:grid-cols-2">
              <label className="space-y-1.5 font-semibold">Giá vé bổ sung (VNĐ) *<VietnameseMoneyInput disabled={isCoHostedTour} value={passengerCustomPrice} onValueChange={setPassengerCustomPrice} className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 font-semibold tabular-nums" /></label>
              <label className="space-y-1.5 font-semibold">Lý do bổ sung / Thỏa thuận *<Input maxLength={240} value={customAdjustmentReason} onChange={e => setCustomAdjustmentReason(e.target.value)} /></label>
              <p className="text-[11px] leading-relaxed text-amber-900 sm:col-span-2">{hasBeenApproved ? "Giá tour đã chốt giữ nguyên. Tiền vé bổ sung được tạo thành phụ thu riêng; booking và lịch thanh toán tour không cần duyệt lại." : "Tiền vé bổ sung được cộng vào tổng giá tour trước lần duyệt đầu tiên."} Vé 0đ sẽ không tạo khoản thu.</p>
            </div>}
            {passengerError && <NotificationMessage tone="error" message={passengerError} />}
          </div>
          <div className="flex justify-end gap-2 border-t px-5 py-3"><Button size="sm" variant="outline" disabled={passengerSaving} onClick={() => setPassengerModalOpen(false)}>Hủy</Button>
            <Button size="sm" disabled={passengerSaving || !passengerName.trim() || !passengerDob || (passengerModalMode === "add" && customAdjustmentReason.trim().length < 3)} onClick={handleSavePassengerModal}>{passengerSaving ? "Đang lưu…" : passengerModalMode === "add" ? "Thêm vào đoàn" : "Lưu hồ sơ"}</Button></div>
        </DialogContent>
      </Dialog>

      {/* MODAL: RÚT KHÁCH KHỎI CHẶNG (DEACTIVATE PASSENGER & AUTO DEDUCT PRICE) */}
      <Dialog open={deactivateModalOpen} onOpenChange={setDeactivateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
              <UserMinus className="w-5 h-5 text-rose-600" />
              Rút hành khách khỏi chặng (Trước khởi hành)
            </DialogTitle>
          </DialogHeader>

          {passengerToDeactivate && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 space-y-2 text-rose-950">
                <p className="font-bold text-sm text-gray-900">
                  {passengerToDeactivate.fullName}
                  {passengerToDeactivate.phone && <span className="text-xs font-normal text-gray-500 ml-2">({passengerToDeactivate.phone})</span>}
                </p>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-rose-200">
                  <span className="text-gray-600">Tiền vé khấu trừ khỏi đơn hàng:</span>
                  <span className="font-black text-rose-700 text-sm">-{formatVND(passengerToDeactivate.price || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Đơn vị phụ trách khấu trừ:</span>
                  <span className="font-bold text-gray-800">
                    {passengerToDeactivate.agencyName || (isCurrentCompanyLead ? agenciesList[1]?.agencyName : currentAgency?.agencyName) || "Chặng phụ trách"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-800 block">
                  Lý do rút khách khỏi chặng <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="VD: Khách hàng chỉ tham gia chặng đón Hà Nội của Viettravel, tự túc về không đi chặng Hà Giang..."
                  rows={3}
                  className="w-full text-xs"
                />
                <p className="text-[11px] text-gray-500">
                  Lý do này sẽ được ghi vào nhật ký kiểm toán điều chỉnh giá (`booking_price_adjustments`) và hiển thị minh bạch cho khách hàng và đối tác.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setDeactivateModalOpen(false)}>
                  Hủy bỏ
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmDeactivate}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Xác nhận rút &amp; Trừ tiền
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: NHẬT KÝ ĐIỀU CHỈNH GIÁ & THÀNH VIÊN ĐOÀN (AUDIT LOG) */}
      <Dialog open={priceAdjustmentsModalOpen} onOpenChange={setPriceAdjustmentsModalOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <History className="w-5 h-5 text-amber-600" />
              Nhật ký điều chỉnh giá &amp; thành viên đoàn #{booking.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <p className="text-slate-500">Lịch sử giá, người thực hiện và lý do đã thống nhất với khách.</p>

            {sortedPriceAdjustments && sortedPriceAdjustments.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200 bg-white shadow-2xs">
                {sortedPriceAdjustments.map((adj, index) => {
                  const isPositive = adj.adjustmentAmount > 0;
                  const isLatest = index === 0;
                  const logOrder = sortedPriceAdjustments.length - index;

                  return (
                    <div
                      key={adj.id || index}
                      className={`p-3.5 space-y-2 hover:bg-gray-50/80 transition-colors ${
                        isLatest ? "bg-amber-50/25 border-l-4 border-l-amber-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            #{logOrder}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E0F2FE] text-blue-800 border border-[#CBD5E1]">
                              Mới nhất
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            adj.adjustmentAmount === 0 ? "bg-slate-100 text-slate-700 border border-slate-200" : isPositive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {adj.adjustmentAmount === 0 ? "Giữ nguyên giá" : isPositive ? `+${formatVND(adj.adjustmentAmount)}` : `−${formatVND(Math.abs(adj.adjustmentAmount))}`}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium">
                          {formatVietnamDateTime(providerResponseInstant(adj.createdAt))}
                        </span>
                      </div>

                      <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5">
                        <p className="mb-1 text-[11px] font-semibold text-amber-900">Lý do điều chỉnh</p>
                        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-800">{adj.reason?.trim() || "Chưa ghi nhận lý do cho điều chỉnh này."}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50/70 p-2 rounded-lg border border-gray-100 text-[11px]">
                        <div>
                          <span className="text-gray-400 block">Người thực hiện:</span>
                          <span className="font-bold text-gray-800">{adj.adjustedBy || companyName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Biến động giá:</span>
                          <span className="font-medium text-gray-700">
                            {formatVND(adj.previousTotalPrice)} ➔ <strong className="text-[#075985]">{formatVND(adj.newTotalPrice)}</strong>
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Đợt thanh toán:</span>
                          <span className="font-medium text-gray-700">
                            {adj.paymentRequestId ? (
                              <span className="text-emerald-700 font-bold">Đã tạo yêu cầu thu</span>
                            ) : (
                              <span className="text-gray-500">Cập nhật trực tiếp</span>
                            )}
                          </span>
                        </div>
                        {adj.agencyName && (
                          <div className="sm:col-span-3 pt-1 border-t border-gray-100 flex items-center gap-1.5 text-[#EA580C] font-bold">
                            <Tag className="w-3 h-3 text-purple-500" />
                            <span>Chặng áp dụng: {adj.agencyName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-500 space-y-1">
                <History className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                <p className="font-medium">Chưa có lịch sử điều chỉnh giá nào.</p>
                <p className="text-[11px] text-gray-400">
                  Khi bạn thêm hành khách có đồng bộ giá hoặc chỉnh sửa tổng giá tour, nhật ký sẽ tự động xuất hiện tại đây.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setPriceAdjustmentsModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: PHÂN CÔNG HDV THEO ĐIỂM ĐẾN & CHẶNG (3 PRESETS)   */}
      {/* ======================================================== */}
      <Dialog open={assignAttractionsModalOpen} onOpenChange={setAssignAttractionsModalOpen}>
        <DialogContent className="sm:max-w-3xl h-[85vh] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-100">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Navigation className="w-5 h-5 text-[#F97316]" />
              Phân công Hướng dẫn viên theo Điểm đến &amp; Chặng
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 text-xs">
            {/* Context / Alliance Permission Banner */}
            <div className="bg-[#F0F9FF]/70 p-3.5 rounded-xl border border-[#F97316]/30 text-purple-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#EA580C]" />
                Đơn vị điều phối: {companyName || currentAgency?.agencyName || "Công ty của bạn"}
                {isCoHostedTour && (
                  <span className="ml-2 text-[10px] bg-purple-200 text-purple-900 font-extrabold px-2 py-0.5 rounded-full">
                    Tour Liên minh Co-host
                  </span>
                )}
              </p>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                {isCoHostedTour
                  ? "Trong mô hình Liên minh, quý công ty chỉ được phân công HDV trực thuộc đơn vị mình vào các điểm đến do công ty bạn đảm nhận. Các điểm đến của đối tác được bảo vệ quyền riêng tư và khóa chỉnh sửa."
                  : "Quý công ty quản lý và điều phối toàn bộ lịch trình tham quan của đoàn. Vui lòng chọn 1 trong 3 kịch bản phân công bên dưới để tự động tạo bản ghi check-in."}
              </p>
            </div>

            {/* 3 PRESET TABS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAssignPresetMode("single")}
                className={`flex h-full flex-col justify-start p-2.5 rounded-lg text-left ring-2 transition-all cursor-pointer ${
                  assignPresetMode === "single"
                    ? "bg-white text-purple-900 shadow-2xs ring-purple-400/40"
                    : "ring-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex h-5 items-center gap-1.5 text-xs leading-5 font-bold mb-1 text-[#EA580C]">
                  <Zap className="w-3.5 h-3.5" />
                  1. Gán 1 HDV Toàn bộ
                </div>
                <p className="text-[11px] text-gray-500 font-normal leading-snug">
                  1 HDV dẫn toàn bộ các điểm đến của công ty bạn
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAssignPresetMode("co_guides")}
                className={`flex h-full flex-col justify-start p-2.5 rounded-lg text-left ring-2 transition-all cursor-pointer ${
                  assignPresetMode === "co_guides"
                    ? "bg-white text-blue-900 shadow-2xs ring-blue-400/40"
                    : "ring-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex h-5 items-center gap-1.5 text-xs leading-5 font-bold mb-1 text-[#075985]">
                  <Users className="w-3.5 h-3.5" />
                  2. Gán 2+ HDV (Song hành)
                </div>
                <p className="text-[11px] text-gray-500 font-normal leading-snug">
                  Đoàn đông cần nhiều HDV cùng dẫn &amp; check-in riêng
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAssignPresetMode("custom")}
                className={`flex h-full flex-col justify-start p-2.5 rounded-lg text-left ring-2 transition-all cursor-pointer ${
                  assignPresetMode === "custom"
                    ? "bg-white text-emerald-900 shadow-2xs ring-emerald-400/40"
                    : "ring-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex h-5 items-center gap-1.5 text-xs leading-5 font-bold mb-1 text-emerald-700">
                  <MapPin className="w-3.5 h-3.5" />
                  3. Tùy chỉnh Từng điểm
                </div>
                <p className="text-[11px] text-gray-500 font-normal leading-snug">
                  Chia chặng, HDV A dẫn nửa đầu, HDV B dẫn nửa sau
                </p>
              </button>
            </div>

            {/* PRESET 1 CONTENT: SINGLE GUIDE */}
            {assignPresetMode === "single" && (
              <div className="p-4 bg-[#F0F9FF]/30 rounded-xl border border-[#F97316]/30 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-800">
                    Chọn 1 Hướng dẫn viên phụ trách toàn bộ ({allItineraryAttractions.filter(a => a.isMyAgencyAttraction).length} điểm đến của công ty):
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    Hệ thống sẽ gán HDV này vào tất cả các điểm tham quan do công ty bạn phụ trách.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {myAgencyGuides.map((g) => {
                    const isSelected = selectedSingleGuideId === g.guideId;
                    return (
                      <div
                        key={g.guideId}
                        onClick={() => setSelectedSingleGuideId(g.guideId)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#F97316]/15/70 border-purple-400 ring-2 ring-purple-400/30 font-bold"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {g.guideAvatar ? (
                          <img src={g.guideAvatar} alt={g.guideName} className="w-9 h-9 rounded-full object-cover border shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#F97316] text-white font-bold flex items-center justify-center shrink-0">
                            {g.guideName[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-900 truncate">{g.guideName}</p>
                          <p className="text-[11px] text-gray-500">{g.guidePhone || "Chưa có SĐT"}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#EA580C] shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PRESET 2 CONTENT: MULTI GUIDES DUPLICATION */}
            {assignPresetMode === "co_guides" && (
              <div className="p-4 bg-[#F0F9FF]/30 rounded-xl border border-[#CBD5E1] space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-gray-800">
                      Chọn các Hướng dẫn viên cùng song hành phụ trách đoàn đông:
                    </Label>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-[#E0F2FE] text-blue-800">
                      {selectedMultiGuideIds.length} HDV được chọn
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Mỗi HDV được chọn sẽ tự check-in riêng tại từng điểm đến của công ty.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {myAgencyGuides.map((g) => {
                    const isChecked = selectedMultiGuideIds.includes(g.guideId);
                    return (
                      <div
                        key={g.guideId}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedMultiGuideIds(selectedMultiGuideIds.filter(id => id !== g.guideId));
                          } else {
                            setSelectedMultiGuideIds([...selectedMultiGuideIds, g.guideId]);
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-[#E0F2FE]/70 border-blue-400 ring-2 ring-blue-400/30 font-bold"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-gray-300 text-[#075985] focus:ring-[#075985] w-4 h-4 shrink-0"
                        />
                        {g.guideAvatar ? (
                          <img src={g.guideAvatar} alt={g.guideName} className="w-8 h-8 rounded-full object-cover border shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#075985] text-white font-bold flex items-center justify-center shrink-0">
                            {g.guideName[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-900 truncate">{g.guideName}</p>
                          <p className="text-[11px] text-gray-500">{g.guidePhone || "Chưa có SĐT"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>


              </div>
            )}

            {/* PRESET 3 CONTENT: CUSTOM PER ATTRACTION */}
            {assignPresetMode === "custom" && (
              <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-200 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-gray-800">
                    Phân công chi tiết từng điểm đến (Chia chặng linh hoạt):
                  </Label>
                  <p className="text-[11px] text-gray-500">
                    Gán HDV phù hợp cho từng điểm cụ thể (Ví dụ: HDV A dẫn nửa đầu điểm 1–10, HDV B dẫn nửa sau).
                  </p>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {allItineraryAttractions.filter(a => a.isMyAgencyAttraction).map((att, idx) => {
                    const currentAssigned = customAttractionGuideMap[att.location.id] || [];

                    return (
                      <div key={att.location.id || idx} className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-gray-900 text-xs">{att.location.name}</span>
                            <span className="text-[10px] text-gray-500">Ngày {att.dayNumber}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {currentAssigned.length} HDV
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                          {myAgencyGuides.map((g) => {
                            const isAssigned = currentAssigned.includes(g.guideId);
                            return (
                              <button
                                key={g.guideId}
                                type="button"
                                onClick={() => {
                                  const updated = isAssigned
                                    ? currentAssigned.filter(id => id !== g.guideId)
                                    : [...currentAssigned, g.guideId];
                                  setCustomAttractionGuideMap({
                                    ...customAttractionGuideMap,
                                    [att.location.id]: updated,
                                  });
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                                  isAssigned
                                    ? "bg-emerald-600 text-white font-bold shadow-2xs"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {isAssigned && <Check className="w-3 h-3 text-white" />}
                                {g.guideName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PARTNER ATTRACTIONS (LOCKED IN ALLIANCE TOURS) */}
            {isCoHostedTour && allItineraryAttractions.some(a => !a.isMyAgencyAttraction) && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-gray-600 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                    Điểm đến thuộc chặng đối tác liên minh ({allItineraryAttractions.filter(a => !a.isMyAgencyAttraction).length} điểm):
                  </span>
                  <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                    Khóa chỉnh sửa
                  </span>
                </div>
                <div className="space-y-1">
                  {allItineraryAttractions.filter(a => !a.isMyAgencyAttraction).map((pAtt, pIdx) => (
                    <div key={pIdx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 text-gray-500">
                      <span>• {pAtt.location.name} (Ngày {pAtt.dayNumber})</span>
                      <span className="font-semibold text-[#EA580C] text-[10px]">
                        Do {pAtt.responsibleAgencyName} phân công
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-100 bg-white">
            <Button variant="outline" onClick={() => setAssignAttractionsModalOpen(false)} className="border-rose-300 bg-white text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 font-semibold cursor-pointer transition-colors">
              Hủy bỏ
            </Button>
            <Button onClick={handleSaveAttractionAssignment} className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Xác nhận &amp; Lưu phân công
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: XEM ẢNH MINH CHỨNG CHECK-IN THỰC TẾ               */}
      {/* ======================================================== */}
      <Dialog open={previewProofModalOpen} onOpenChange={setPreviewProofModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Camera className="w-5 h-5 text-emerald-600" />
              Minh chứng Check-in Thực tế
            </DialogTitle>
          </DialogHeader>

          {proofPreviewData && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-black/5 shadow-inner">
                <img
                  src={proofPreviewData.image}
                  alt={proofPreviewData.title}
                  className="w-full max-h-80 object-cover rounded-xl"
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5">
                <p className="font-bold text-gray-900 text-sm">{proofPreviewData.title}</p>
                {proofPreviewData.time && (
                  <p className="text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#F97316]" />
                    Thời gian ghi nhận: <strong className="text-gray-800">{proofPreviewData.time}</strong>
                  </p>
                )}
                {proofPreviewData.guideName && (
                  <p className="text-gray-500 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#075985]" />
                    HDV thực hiện: <strong className="text-[#075985]">{proofPreviewData.guideName}</strong>
                  </p>
                )}
                {proofPreviewData.note && (
                  <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200/80 italic">
                    "{proofPreviewData.note}"
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" onClick={() => setPreviewProofModalOpen(false)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: ĐIỀU CHỈNH DỊCH VỤ TRỰC TIẾP (KHÁCH SẠN / ĂN UỐNG / ĐIỂM ĐẾN) */}
      {/* ======================================================== */}
      <Dialog open={serviceEditModalOpen} onOpenChange={open => !amendmentSaving && setServiceEditModalOpen(open)}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[820px]">
          <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 pr-7 text-base font-bold text-slate-900">
              {serviceEditType === "hotel" ? <Building2 className="h-5 w-5 text-sky-800" /> : serviceEditType === "meal" ? <Utensils className="h-5 w-5 text-emerald-700" /> : <MapPin className="h-5 w-5 text-amber-700" />}
              {serviceEditType === "hotel" ? "Cập nhật khách sạn lưu trú" : serviceEditType === "meal" ? `Cập nhật bữa ăn & nhà hàng · Ngày ${editTargetDay}` : `Cập nhật điểm tham quan · Ngày ${editTargetDay}`}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 text-xs">
            {editOldName && <div className="flex flex-wrap items-start justify-between gap-1.5 rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="shrink-0 text-slate-500">Dịch vụ hiện tại</span>
              <span className="min-w-0 break-words font-semibold text-slate-800">{editOldName}</span>
            </div>}
            {serviceEditType !== "location" ? <BookingServicePicker key={`${serviceEditType}:${editItemId}:${serviceEditModalOpen}`} kind={serviceEditType}
              value={replacement} onChange={setReplacement} /> : <label className="block space-y-1.5 font-semibold text-slate-700">Tên điểm tham quan mới *
              <Input value={editNewName} onChange={e => setEditNewName(e.target.value)} maxLength={255} placeholder="VD: Vườn hoa thành phố Đà Lạt" />
            </label>}
            <div className="grid items-start gap-4 sm:grid-cols-2">
              {serviceEditType === "location" && !canChangePrice ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                <p className="mb-1 flex items-center gap-1 font-semibold text-slate-800"><Lock className="h-3.5 w-3.5" /> {isCurrentCompanyLead?"Giá tour đã chốt":"Giá trị chặng đã chốt"}: {formatVND(booking.baseTourPrice ?? booking.totalPrice)}</p>
                Đổi dịch vụ giữ nguyên giá và trạng thái booking. Nếu phát sinh tăng/giảm tiền khách phải trả, gửi đề nghị tại phần “Điều chỉnh & Phụ thu”.
              </div> : <>
              <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <label htmlFor="service-price-difference" className="block font-semibold text-amber-950">{canChangePrice ? "Chênh lệch giá tour (VNĐ)" : "Đề nghị tăng / giảm (VNĐ)"}</label>
                <VietnameseMoneyInput id="service-price-difference" signed value={editPriceDiff} onValueChange={setEditPriceDiff}
                  placeholder="0" className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-amber-200" />
                <div className="flex flex-wrap gap-1.5">
                  {[{ value: "0", label: "Giữ nguyên" }, { value: "50000", label: "+50.000đ" }, { value: "100000", label: "+100.000đ" }, { value: "-50000", label: "−50.000đ" }].map(option =>
                    <button type="button" key={option.value} onClick={() => setEditPriceDiff(option.value)} className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-100">{option.label}</button>)}
                </div>
                <p className="text-[11px] text-amber-800">{Number(editPriceDiff) > 0 ? `Tăng +${formatVND(Number(editPriceDiff))}` : Number(editPriceDiff) < 0 ? `Giảm ${formatVND(Math.abs(Number(editPriceDiff)))}` : "Không thay đổi giá bán tour"}</p>
                {!canChangePrice && <p className="text-[11px] text-slate-600">Đây là đề nghị chờ chủ trì duyệt, chưa thay đổi tiền khách phải trả hoặc doanh thu phân bổ.</p>}
              </div>
              </>}
              <div className="space-y-2">
                <label htmlFor="service-change-reason" className="block font-semibold text-slate-700">Lý do thay đổi & thỏa thuận với khách *</label>
                <Textarea id="service-change-reason" value={editReason} onChange={e => setEditReason(e.target.value)} rows={4} maxLength={2000}
                  placeholder="Ghi rõ lý do đổi dịch vụ và nội dung đã thống nhất với khách…" className="min-h-24 resize-y bg-white text-xs" />
                <p className="text-[11px] text-slate-500">Lý do đổi được gửi đến khách; chênh lệch giá được ghi nhật ký tài chính.</p>
              </div>
            </div>
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-900">Giá dịch vụ chỉ để tham khảo. Thay đổi được ghi nhật ký và gửi thông báo cho khách; booking đã duyệt giữ nguyên trạng thái và lịch thanh toán.</p>
            {amendmentError && <NotificationMessage tone="error" message={amendmentError} />}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
            <Button variant="outline" size="sm" disabled={amendmentSaving} onClick={() => setServiceEditModalOpen(false)}>Hủy bỏ</Button>
            <Button size="sm" disabled={amendmentSaving || !canAmend || (serviceEditType === "location" ? !editNewName.trim() : !replacement?.name.trim())} onClick={handleSaveServiceEdit}
              className="bg-[#075985] font-semibold text-white hover:bg-sky-900">{amendmentSaving ? "Đang lưu…" : "Lưu & cập nhật"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: XEM BÀI VIẾT CHI TIẾT & BẢN ĐỒ DỊCH VỤ PROVIDER */}
      {viewingServiceId && (() => {
        const targetService = services.find((service) => service.id === viewingServiceId);
        if (!targetService) return <Dialog open onOpenChange={() => setViewingServiceId(null)}>
          <DialogContent><DialogHeader><DialogTitle>Bài đăng không còn khả dụng</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600">Bài đăng này hiện không có trong danh sách dịch vụ trên sàn.</p>
          </DialogContent></Dialog>;

        return (
          <ServiceBlogDetailModal
            service={targetService}
            isOpen={Boolean(viewingServiceId)}
            onClose={() => setViewingServiceId(null)}
          />
        );
      })()}
    </div>
  );
}

function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
