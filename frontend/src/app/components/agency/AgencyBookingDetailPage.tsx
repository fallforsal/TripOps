import { useState, useMemo } from "react";
import {
  Booking,
  User,
  PaymentRequest,
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
import { ProviderProfileModal } from "./ProviderProfileModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

interface AgencyBookingDetailPageProps {
  booking: Booking;
  guides: User[];
  companyName: string;
  companyId?: string;
  onBack: () => void;
  onApproveBooking: (bookingId: string) => void;
  onRejectBooking: (bookingId: string, reason?: string) => void;
  onAssignGuide: (bookingId: string, guideId: string) => void;
  onUpdateAssignedGuides?: (bookingId: string, guides: BookingAssignedGuide[]) => void;
  onCreatePaymentRequest: (bookingId: string, request: Omit<PaymentRequest, "id" | "bookingId" | "createdAt" | "status">) => void;
  onMarkDepositPaid?: (bookingId: string) => void;
  onMarkFullyPaid?: (bookingId: string) => void;
  onUpdateBookingPrice?: (bookingId: string, newPrice: number, note?: string, adjustment?: Partial<BookingPriceAdjustment>) => void;
  onUpdateBookingPassengers?: (bookingId: string, passengers: BookingPassenger[]) => void;
  onUpdateBookingAgencies?: (bookingId: string, agencies: BookingAgencyShare[]) => void;
  onUpdateAttractionCheckins?: (bookingId: string, checkins: BookingAttractionCheckin[]) => void;
  onUpdateIncidents?: (bookingId: string, incidents: BookingIncident[]) => void;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ duyệt", color: "bg-amber-100 text-amber-800 border-amber-200" },
  deposited: { label: "Đã đặt cọc", color: "bg-amber-50 text-amber-800 border-amber-300" },
  confirmed: { label: "Đã xác nhận", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  paid: { label: "Đã thanh toán đủ", color: "bg-teal-100 text-teal-800 border-teal-300" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-800 border-red-200" },
  completed: { label: "Hoàn thành", color: "bg-[#E0F2FE] text-blue-800 border-[#CBD5E1]" },
  rejected: { label: "Từ chối", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

const paymentStatusMap: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Chưa thanh toán", color: "bg-red-50 text-red-700 border-red-200" },
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
  onCreatePaymentRequest,
  onMarkDepositPaid,
  onMarkFullyPaid,
  onUpdateBookingPrice,
  onUpdateBookingPassengers,
  onUpdateBookingAgencies,
  onUpdateAttractionCheckins,
  onUpdateIncidents,
}: AgencyBookingDetailPageProps) {
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
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
  const stagesList: TourCoHost[] = useMemo(() => {
    if (booking.coHosts && booking.coHosts.length > 0) {
      return booking.coHosts;
    }
    if (booking.tour?.coHosts && booking.tour.coHosts.length > 0) {
      return booking.tour.coHosts;
    }
    return [];
  }, [booking]);

  const isCoHostedTour = Boolean(booking.isCoHosted || stagesList.length > 1);

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
    const cHosts = booking.coHosts || booking.tour?.coHosts || [];
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
        agencyId: booking.companyId,
        agencyName: booking.companyName,
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
      const myCoHost = (booking.coHosts || booking.tour?.coHosts)?.find((c) => c.companyId === companyId);
      if (myCoHost) return myCoHost.role === "lead";
      return false;
    }
    if (companyName) {
      if (companyName === booking.companyName) return true;
      const myAgencyByName = agenciesList.find((a) => a.agencyName === companyName);
      if (myAgencyByName) return Boolean(myAgencyByName.isHost || (myAgencyByName as any).role === "lead");
      const myCoHostByName = (booking.coHosts || booking.tour?.coHosts)?.find((c) => c.companyName === companyName);
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
          onUpdateAssignedGuides(updatedAssigned);
        }
      }
    }

    setAttractionCheckins(updatedCheckins);
    if (onUpdateAttractionCheckins) {
      onUpdateAttractionCheckins(updatedCheckins);
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
        const agencyId = loc.createdByCompanyId || day.createdByCompanyId || myAgencyId;
        const agencyName =
          loc.createdByCompanyName ||
          day.createdByCompanyName ||
          agenciesList.find((a) => a.agencyId === agencyId)?.agencyName ||
          "Công ty điều phối";
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
        const locAgencyId = loc.createdByCompanyId || day.createdByCompanyId || myAgencyId;
        const locAgencyName = loc.createdByCompanyName || day.createdByCompanyName || myAgencyName;
        const agencyGuides = initialGuides.filter((g) => g.companyId === locAgencyId);
        const targetGuides = agencyGuides.length > 0 ? agencyGuides : initialGuides.slice(0, 1);

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
  const [itinerarySubTab, setItinerarySubTab] = useState<"standard" | "live_checkin">("standard");
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
  const handleSaveAttractionAssignment = () => {
    const myAgencyId = companyId || currentAgency?.agencyId || booking.companyId || "company-1";
    const myAgencyName = companyName || currentAgency?.agencyName || booking.companyName || "Công ty điều phối";

    // Keep partner checkins completely intact
    const partnerCheckins = attractionCheckins.filter((c) => c.agencyId !== myAgencyId);
    const myAttractions = allItineraryAttractions.filter((a) => a.isMyAgencyAttraction);

    if (myAttractions.length === 0) {
      alert("Công ty của bạn hiện không phụ trách điểm đến nào trong tour này để phân công.");
      return;
    }

    const newMyCheckins: BookingAttractionCheckin[] = [];

    if (assignPresetMode === "single") {
      const targetGuide = myAgencyGuides.find((g) => g.guideId === selectedSingleGuideId) || myAgencyGuides[0];
      if (!targetGuide) {
        alert("Vui lòng chọn 1 Hướng dẫn viên!");
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
        alert("Vui lòng chọn ít nhất 1 Hướng dẫn viên!");
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
    setAttractionCheckins(updatedCheckins);
    onUpdateAttractionCheckins?.(booking.id, updatedCheckins);
    setAssignAttractionsModalOpen(false);
    alert(`🎉 Đã lưu phân công Hướng dẫn viên cho các điểm đến do công ty phụ trách (${newMyCheckins.length} lượt check-in)!`);
  };

  // Passenger list state - default: full tour for all passengers
  const [passengersList, setPassengersList] = useState<BookingPassenger[]>(() => {
    if (booking.passengers && booking.passengers.length > 0) {
      return booking.passengers;
    }
    return [];
  });

  // Passenger Modal (Add/Edit)
  const [passengerModalOpen, setPassengerModalOpen] = useState(false);
  const [passengerModalMode, setPassengerModalMode] = useState<"add" | "edit">("add");
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengerDob, setPassengerDob] = useState("");
  const [passengerGender, setPassengerGender] = useState<"male" | "female">("male");
  const [passengerIdNumber, setPassengerIdNumber] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerNotes, setPassengerNotes] = useState("");
  const [passengerSelectedAgencyId, setPassengerSelectedAgencyId] = useState<string>("all");

  // Simultaneous price sync state when adding passenger
  const [autoUpdateTourPrice, setAutoUpdateTourPrice] = useState(true);
  const [createExtraPaymentRequest, setCreateExtraPaymentRequest] = useState(true);
  const [customAdjustmentReason, setCustomAdjustmentReason] = useState("");
  const [passengerCustomPrice, setPassengerCustomPrice] = useState<string>("");

  // Direct Custom Service Updates (Hotel, Sightseeing Location, Meal) by Tour Operator / Admin
  const [hotelChanges, setHotelChanges] = useState<CustomHotelChange[]>(() => booking.customHotelChanges || []);
  const [locChanges, setLocChanges] = useState<CustomLocationChange[]>(() => booking.locationChanges || []);
  const [mealChangesList, setMealChangesList] = useState<CustomMealChange[]>(() => booking.customMealChanges || []);

  // Quick Service Edit Modal State
  const [serviceEditModalOpen, setServiceEditModalOpen] = useState(false);
  const [serviceEditType, setServiceEditType] = useState<"hotel" | "location" | "meal">("hotel");
  const [editTargetDay, setEditTargetDay] = useState<number>(1);
  const [editTargetKey, setEditTargetKey] = useState<string>("");
  const [editOldName, setEditOldName] = useState("");
  const [editNewName, setEditNewName] = useState("");
  const [editPriceDiff, setEditPriceDiff] = useState<string>("0");
  const [editReason, setEditReason] = useState("");
  const [editAddressOrNote, setEditAddressOrNote] = useState("");

  const handleSaveServiceEdit = () => {
    if (!editNewName.trim()) {
      alert("Vui lòng nhập tên dịch vụ thay thế!");
      return;
    }
    const diff = parseInt(editPriceDiff) || 0;
    const defaultReason =
      serviceEditType === "hotel"
        ? `Đã liên hệ thống nhất với khách đổi khách sạn sang "${editNewName.trim()}"`
        : serviceEditType === "meal"
        ? `Đã liên hệ thống nhất với khách đổi bữa ăn sang "${editNewName.trim()}"`
        : `Đã liên hệ thống nhất với khách đổi điểm tham quan sang "${editNewName.trim()}"`;
    const reasonText = editReason.trim() || defaultReason;

    if (serviceEditType === "hotel") {
      const existingIdx = hotelChanges.findIndex(
        (h) => h.destination === editTargetKey || (hotelChanges.length === 1 && !h.destination)
      );
      const updatedHotel: CustomHotelChange = {
        destination: editTargetKey,
        newHotelName: editNewName.trim(),
        originalHotelName: editOldName,
        mode: "custom",
        address: editAddressOrNote.trim() || undefined,
        note: reasonText,
        newPricePerNight: diff,
      };
      let nextHotels: CustomHotelChange[];
      if (existingIdx >= 0) {
        nextHotels = [...hotelChanges];
        nextHotels[existingIdx] = updatedHotel;
      } else {
        nextHotels = [...hotelChanges, updatedHotel];
      }
      setHotelChanges(nextHotels);
    } else if (serviceEditType === "location") {
      const existingIdx = locChanges.findIndex(
        (l) => l.dayNumber === editTargetDay && (l.locationId === editTargetKey || l.requestedLocations === editOldName || l.originalLocationName === editOldName)
      );
      const updatedLoc: CustomLocationChange = {
        dayId: `day-${editTargetDay}`,
        dayNumber: editTargetDay,
        locationId: editTargetKey,
        originalLocationName: editOldName,
        requestedLocations: editNewName.trim(),
        note: reasonText,
      };
      let nextLocs: CustomLocationChange[];
      if (existingIdx >= 0) {
        nextLocs = [...locChanges];
        nextLocs[existingIdx] = updatedLoc;
      } else {
        nextLocs = [...locChanges, updatedLoc];
      }
      setLocChanges(nextLocs);
    } else if (serviceEditType === "meal") {
      const existingIdx = mealChangesList.findIndex(
        (m) => m.dayNumber === editTargetDay && m.mealType === editTargetKey
      );
      const updatedMeal: CustomMealChange = {
        dayNumber: editTargetDay,
        mealType: editTargetKey as any,
        originalMealName: editOldName,
        newMealName: editNewName.trim(),
        mode: "custom",
        priceDifference: diff,
        note: reasonText,
      };
      let nextMeals: CustomMealChange[];
      if (existingIdx >= 0) {
        nextMeals = [...mealChangesList];
        nextMeals[existingIdx] = updatedMeal;
      } else {
        nextMeals = [...mealChangesList, updatedMeal];
      }
      setMealChangesList(nextMeals);
    }

    if (diff !== 0 && onUpdateBookingPrice) {
      const newTotal = booking.totalPrice + diff;
      onUpdateBookingPrice(booking.id, newTotal, reasonText, {
        adjustedBy: companyName || "Công ty lữ hành",
        previousTotalPrice: booking.totalPrice,
        adjustmentAmount: diff,
        newTotalPrice: newTotal,
        reason: reasonText,
        createdAt: new Date().toISOString(),
      });
    }

    setServiceEditModalOpen(false);
    alert(`✓ Đã cập nhật lại dịch vụ thành công!\n✓ Dịch vụ mới: ${editNewName.trim()}\n${diff !== 0 ? `✓ Điều chỉnh giá: ${diff > 0 ? "+" : ""}${formatVND(diff)}\n` : "✓ Giá tour không thay đổi.\n"}✓ Lý do: ${reasonText}`);
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
  const handleApproveHappyCase = () => {
    const updatedAgencies: BookingAgencyShare[] = agenciesList.map((a) => ({
      ...a,
      confirmationStatus: "confirmed" as const,
      quoteConfirmed: true,
      confirmedAt: a.confirmedAt || new Date().toISOString(),
    }));
    setAgenciesList(updatedAgencies);
    onUpdateBookingAgencies?.(booking.id, updatedAgencies);

    onApproveBooking(booking.id);
    setHappyCaseModalOpen(false);
    alert(`✓ Đã duyệt booking thành công!\n\n🏢 Đơn vị chủ trì đã xác nhận công ty và các bên liên minh có thể tham gia dẫn dắt đoàn theo đúng lịch trình.\n\n👉 Bước tiếp theo: Quý công ty vui lòng sử dụng nút "Tạo yêu cầu thanh toán" trên thanh công cụ để tạo các đợt thu (đặt cọc đợt 1, thanh toán đợt 2, v.v.) theo thỏa thuận với khách hàng.`);
  };

  // Multi-Guide Management Handlers
  const handleConfirmAddGuide = () => {
    const targetGuide = guides.find((g) => g.id === selectedGuideToAdd);
    if (!targetGuide) {
      alert("Vui lòng chọn hướng dẫn viên để phân công!");
      return;
    }
    if (assignedGuides.some((ag) => ag.guideId === targetGuide.id)) {
      alert(`Hướng dẫn viên ${targetGuide.name} đã được phân công trong danh sách đoàn!`);
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
    onUpdateAssignedGuides?.(booking.id, updated);
    if (assignedGuides.length === 0) {
      onAssignGuide?.(booking.id, targetGuide.id);
    }
    setAssignModalOpen(false);
    setSelectedGuideNotes("");
    alert(`✓ Đã phân công hướng dẫn viên ${targetGuide.name} vào đoàn thành công!`);
  };

  const handleConfirmReplaceGuide = () => {
    if (!guideToReplace || !newReplacementGuideId) return;
    const replacement = guides.find((g) => g.id === newReplacementGuideId);
    if (!replacement) {
      alert("Vui lòng chọn hướng dẫn viên thay thế!");
      return;
    }
    if (assignedGuides.some((ag) => ag.guideId === replacement.id && ag.id !== guideToReplace.id)) {
      alert(`Hướng dẫn viên ${replacement.name} đã có trong danh sách phân công!`);
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
    onUpdateAssignedGuides?.(booking.id, updated);
    setReplaceModalOpen(false);
    setGuideToReplace(null);
    alert(`✓ Đã thay thế HDV ${guideToReplace.guideName} bằng ${replacement.name} thành công!`);
  };

  const handleRemoveAssignedGuide = (guideAssignmentId: string) => {
    const target = assignedGuides.find((ag) => ag.id === guideAssignmentId);
    if (!target) return;
    const isMyGuide = (companyId && target.companyId === companyId) ||
      (companyName && target.companyName === companyName) ||
      (!target.companyId && isCurrentCompanyLead);

    if (!isMyGuide) {
      alert(`Bạn không có quyền xoá HDV ${target.guideName} vì nhân sự này do ${target.companyName} trực tiếp quản lý và phân công!`);
      return;
    }

    if (!window.confirm(`Xác nhận rút hướng dẫn viên ${target.guideName} khỏi đoàn này?`)) return;

    const updated = assignedGuides.filter((ag) => ag.id !== guideAssignmentId);
    setAssignedGuides(updated);
    onUpdateAssignedGuides?.(booking.id, updated);
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
    alert(`✓ Đã xác nhận chốt biểu phí chặng của ${target?.agencyName || "công ty"} thành công!`);
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
      alert("Vui lòng nhập lý do rút hành khách khỏi chặng!");
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
    alert(`✓ Đã rút hành khách "${p.fullName}" khỏi chặng ${targetAgency.agencyName}!\n✓ Đã trừ -${formatVND(deductAmount)} vào doanh thu chặng và cập nhật tổng tiền đơn hàng.`);
  };

  const handleReactivatePassenger = (p: BookingPassenger) => {
    const targetAgencyId = p.agencyId || agenciesList[0].agencyId;
    const targetAgency = agenciesList.find((a) => a.agencyId === targetAgencyId) || agenciesList[0];
    const restoreAmount = p.price || 0;

    if (!confirm(`Khôi phục hành khách "${p.fullName}" trở lại chặng ${targetAgency.agencyName}?\nTổng tiền sẽ được cộng lại (+${formatVND(restoreAmount)}).`)) return;

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

  const handleDeletePassenger = (passengerId: string) => {
    const pToDelete = passengersList.find((p) => p.id === passengerId);
    if (!pToDelete) return;

    const passengerPrice = pToDelete.price || 0;
    const confirmMessage = passengerPrice > 0
      ? `Bạn có chắc chắn muốn xóa hành khách "${pToDelete.fullName}" khỏi đoàn?\n\nBạn có muốn đồng thời trừ tiền vé (-${formatVND(passengerPrice)}) khỏi tổng tiền tour không?`
      : `Bạn có chắc chắn muốn xóa hành khách "${pToDelete.fullName}" khỏi danh sách đoàn?`;

    if (!confirm(confirmMessage)) return;

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
      alert(`✓ Đã xóa hành khách "${pToDelete.fullName}" và trừ tiền vé (-${formatVND(passengerPrice)}) khỏi tổng giá tour.`);
    } else {
      alert(`✓ Đã xóa hành khách "${pToDelete.fullName}" khỏi danh sách đoàn.`);
    }
  };

  const handleOpenAddPassenger = () => {
    setPassengerModalMode("add");
    setEditingPassengerId(null);
    setPassengerName("");
    setPassengerDob("1995-01-01");
    setPassengerGender("male");
    setPassengerIdNumber("");
    setPassengerPhone("");
    setPassengerNotes("");
    const defaultAgency = isCurrentCompanyLead ? "all" : (currentAgency?.agencyId || "all");
    setPassengerSelectedAgencyId(defaultAgency);
    setAutoUpdateTourPrice(true);
    setCreateExtraPaymentRequest(true);
    setCustomAdjustmentReason("");
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
    setPassengerPhone(p.phone || "");
    setPassengerNotes(p.notes || "");
    setPassengerSelectedAgencyId(p.agencyId || "all");
    const initialPrice = p.price !== undefined ? p.price : calculatePassengerPrice(p.ageGroup || "adult", p.agencyId || "all");
    setPassengerCustomPrice(initialPrice.toString());
    setPassengerModalOpen(true);
  };

  const handlePassengerDobChange = (newDob: string) => {
    setPassengerDob(newDob);
    const age = calculateAge(newDob, booking.tourStartDate || booking.bookingDate) || 25;
    let grp: "adult" | "child_2_11" | "child_under_2" = "adult";
    if (age < 2) grp = "child_under_2";
    else if (age <= 11) grp = "child_2_11";
    const autoPrice = calculatePassengerPrice(grp, passengerSelectedAgencyId);
    setPassengerCustomPrice(autoPrice.toString());
  };

  const handleSavePassengerModal = () => {
    if (!passengerName.trim()) {
      alert("Vui lòng nhập họ và tên hành khách!");
      return;
    }

    const age = calculateAge(passengerDob, booking.tourStartDate || booking.bookingDate) || 25;
    let ageGroup: "adult" | "child_2_11" | "child_under_2" = "adult";
    if (age < 2) ageGroup = "child_under_2";
    else if (age <= 11) ageGroup = "child_2_11";

    const computedPrice = passengerCustomPrice !== "" ? Math.max(0, parseInt(passengerCustomPrice) || 0) : calculatePassengerPrice(ageGroup, passengerSelectedAgencyId);
    const targetAgency = passengerSelectedAgencyId !== "all" ? agenciesList.find((a) => a.agencyId === passengerSelectedAgencyId) : null;

    if (passengerModalMode === "add") {
      const newPassenger: BookingPassenger = {
        id: `p-new-${Date.now()}`,
        fullName: passengerName.trim(),
        dateOfBirth: passengerDob,
        gender: passengerGender,
        ageGroup,
        idNumber: passengerIdNumber.trim(),
        phone: passengerPhone.trim(),
        notes: passengerNotes.trim(),
        price: computedPrice,
        agencyId: targetAgency ? targetAgency.agencyId : undefined,
        agencyName: targetAgency ? targetAgency.agencyName : undefined,
        isPrimary: true,
        status: "ACTIVE",
      };

      const nextList = [...passengersList, newPassenger];
      setPassengersList(nextList);

      if (onUpdateBookingPassengers) {
        onUpdateBookingPassengers(booking.id, nextList);
      }

      // Update booking_agencies final amount
      if (targetAgency) {
        const nextAgencies = agenciesList.map((a) =>
          a.agencyId === targetAgency.agencyId
            ? { ...a, finalAmount: a.finalAmount + computedPrice }
            : a
        );
        setAgenciesList(nextAgencies);
        onUpdateBookingAgencies?.(booking.id, nextAgencies);
      } else if (isCoHostedTour && agenciesList.length > 1) {
        const nextAgencies = agenciesList.map((a) => {
          const ch = stagesList.find((c) => c.companyId === a.agencyId);
          const share = ch?.quoteAdult ?? ch?.quotePerGuest ?? Math.round(computedPrice / agenciesList.length);
          return { ...a, finalAmount: a.finalAmount + share };
        });
        setAgenciesList(nextAgencies);
        onUpdateBookingAgencies?.(booking.id, nextAgencies);
      }

      // Simultaneously update tour price and create payment request if enabled
      if (autoUpdateTourPrice && computedPrice > 0) {
        const newTotal = booking.totalPrice + computedPrice;
        const ageLabel = ageGroup === "adult" ? "Người lớn" : ageGroup === "child_2_11" ? "Trẻ em (2–11t)" : "Em bé (<2t)";
        const stageLabel = targetAgency ? ` (Chặng ${targetAgency.agencyName})` : "";
        const reason = customAdjustmentReason.trim() || `Thêm thành viên đoàn: ${passengerName.trim()} (${ageLabel})${stageLabel}`;

        let paymentReqId: string | undefined = undefined;
        if (createExtraPaymentRequest) {
          paymentReqId = `pr-add-${Date.now()}`;
          onCreatePaymentRequest(booking.id, {
            amount: computedPrice,
            description: `Phụ thu bổ sung hành khách: ${passengerName.trim()} (${ageLabel})${stageLabel}`,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          });
        }

        if (onUpdateBookingPrice) {
          onUpdateBookingPrice(booking.id, newTotal, reason, {
            id: `adj-${Date.now()}`,
            bookingId: booking.id,
            agencyId: targetAgency ? targetAgency.agencyId : undefined,
            agencyName: targetAgency ? targetAgency.agencyName : undefined,
            adjustedBy: companyName,
            previousTotalPrice: booking.totalPrice,
            adjustmentAmount: computedPrice,
            newTotalPrice: newTotal,
            reason,
            createdAt: new Date().toISOString(),
            paymentRequestId: paymentReqId,
          });
        }

        alert(`✓ Đã thêm hành khách "${passengerName.trim()}" vào đoàn!\n✓ Đồng thời cập nhật tổng giá tour: ${formatVND(booking.totalPrice)} ➔ ${formatVND(newTotal)} (+${formatVND(computedPrice)})\n${createExtraPaymentRequest ? "✓ Đã tự động tạo đợt thu thanh toán tương ứng cho khách hàng." : ""}`);
      } else {
        alert(`✓ Đã thêm hành khách "${passengerName.trim()}" vào danh sách đoàn.`);
      }
    } else if (editingPassengerId) {
      const nextList = passengersList.map((p) => {
        if (p.id !== editingPassengerId) return p;
        return {
          ...p,
          fullName: passengerName.trim(),
          dateOfBirth: passengerDob,
          gender: passengerGender,
          ageGroup,
          idNumber: passengerIdNumber.trim(),
          phone: passengerPhone.trim(),
          notes: passengerNotes.trim(),
          price: computedPrice,
          agencyId: targetAgency ? targetAgency.agencyId : p.agencyId,
          agencyName: targetAgency ? targetAgency.agencyName : p.agencyName,
        };
      });
      setPassengersList(nextList);

      if (onUpdateBookingPassengers) {
        onUpdateBookingPassengers(booking.id, nextList);
      }
    }

    setPassengerModalOpen(false);
  };

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");

  // Provider Profile Modal state
  const [selectedProvider, setSelectedProvider] = useState<User | null>(null);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerServiceContext, setProviderServiceContext] = useState<{
    serviceName?: string;
    category?: "hotel" | "fnb" | "meal" | string;
    dayNumber?: number;
    destination?: string;
  } | undefined>(undefined);

  const handleOpenProviderProfile = (
    providerId?: string,
    context?: { serviceName?: string; category?: string; dayNumber?: number; destination?: string }
  ) => {
    const foundUser = mockUsers.find(
      (u) =>
        u.id === providerId ||
        u.email === "provider.heritage@gmail.com" ||
        u.email === "provider@demo.com" ||
        u.aliasEmails?.includes("provider.heritage@gmail.com") ||
        u.aliasEmails?.includes("provider@demo.com")
    );
    if (foundUser) {
      setSelectedProvider(foundUser);
    } else {
      const defaultProvider: User = {
        id: providerId || "provider-1",
        name: "Nguyễn Thị Mai (Heritage Provider)",
        email: "provider.heritage@gmail.com",
        aliasEmails: ["provider@demo.com"],
        role: "provider",
        businessName: "Tổ hợp Dịch vụ Du lịch Heritage",
        businessPhone: "0263 3825 444",
        businessEmail: "provider.heritage@gmail.com",
        businessAddress: "02 Trần Phú, Phường 3, TP. Đà Lạt, Tỉnh Lâm Đồng",
        taxCode: "0123456789",
        latitude: 11.9404,
        longitude: 108.4583,
        businessDescription:
          "Tổ hợp Dịch vụ Du lịch Heritage chuyên cung cấp các dịch vụ lưu trú cao cấp, ẩm thực bản địa trứ danh và các hoạt động trải nghiệm dã ngoại, vận chuyển du khách uy tín trên toàn quốc.",
      };
      setSelectedProvider(defaultProvider);
    }
    setProviderServiceContext(context);
    setProviderModalOpen(true);
  };

  const st = statusMap[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-700" };
  const pst = paymentStatusMap[booking.paymentStatus ?? "unpaid"];

  // Default contract number
  const contractNo = `HD-${booking.id.replace("booking-", "").toUpperCase()}`;
  const today = new Date().toLocaleDateString("vi-VN");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
                Chi tiết Booking {booking.bookingCode || `#${booking.id}`}
              </h1>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${st.color}`}>
                {st.label}
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${pst.color}`}>
                {pst.label}
              </span>
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
          <div className="flex items-center gap-2 flex-wrap">
            {booking.status === "pending" && (
              <>
                {isCurrentCompanyLead ? (
                  <Button
                    onClick={handleApproveHappyCase}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-sm font-bold"
                    title="Xác nhận cty có thể tham gia dẫn dắt đoàn này theo đúng lịch trình thỏa thuận"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Duyệt Booking
                  </Button>
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

            {/* Chỉ Công ty Chủ trì mới có quyền Tạo yêu cầu thanh toán cho khách hàng */}
            {isCurrentCompanyLead && (
              <Button
                onClick={() => setPaymentModalOpen(true)}
                className={`gap-1.5 text-sm font-bold shadow-sm transition-all ${
                  booking.status === "confirmed" && booking.paymentStatus !== "paid"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
                title="Tạo các đợt thanh toán (đặt cọc đợt 1, đợt 2, v.v.) theo trao đổi với khách hàng"
              >
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Tạo yêu cầu thanh toán
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setContractModalOpen(true)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 gap-1.5 text-sm"
            >
              <FileText className="w-4 h-4 text-[#075985]" />
              Xem Hợp đồng
            </Button>
          </div>
        </div>
      </div>

      {/* Provider Price Verification Notice for Pending Bookings */}
      {booking.status === "pending" && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3.5 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-sm text-amber-950 flex items-center gap-2">
              Lưu ý đối soát dịch vụ &amp; Chốt giá ngoài hệ thống:
              <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                Khách không thanh toán liền
              </span>
            </p>
            <p className="text-amber-800 leading-relaxed">
              Khách hàng đặt tour này <strong>không thanh toán ngay</strong>. Vì các dịch vụ như khách sạn lưu trú và chỗ ăn uống có thể có giá khác nhau theo thời điểm thực tế, nhân viên công ty cần chủ động liên hệ trực tiếp với các nhà cung ứng đối tác (provider) ở ngoài hệ thống để hỏi và chốt mức giá thực tế cho đoàn {booking.numberOfGuests} người.
            </p>
            <p className="font-semibold text-amber-900 pt-1">
              → Sau khi chốt giá và kiểm tra chỗ thành công, bấm <span className="text-emerald-700 font-bold">Duyệt Booking</span> và sử dụng tính năng <span className="text-[#075985] font-bold">Tạo yêu cầu thanh toán</span> để gửi thông tin thanh toán cho khách hàng.
            </p>
          </div>
        </div>
      )}

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
          {(booking.isCoHosted || booking.tour?.isCoHosted) && (
            <div className="bg-gradient-to-br from-amber-50/70 via-purple-50/50 to-blue-50/50 rounded-2xl border-2 border-amber-300 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0 shadow-2xs">
                    <Handshake className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-amber-950 flex items-center gap-2 flex-wrap">
                      Tour Liên Minh Hợp Tác Giữa 2 Công Ty (Co-Hosting Alliance)
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                        Bảng doanh thu chặng: booking_agencies
                      </span>
                    </h2>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Đoàn do 2 công ty đồng phối hợp. Báo giá từng chặng được ghi nhận độc lập và Sàn Escrow sẽ giải ngân trực tiếp cho từng công ty sau khi tour hoàn thành.
                    </p>
                  </div>
                </div>

                {booking.priceAdjustments && booking.priceAdjustments.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPriceAdjustmentsModalOpen(true)}
                    className="border-amber-300 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold gap-1.5 h-8 px-3 rounded-lg shrink-0 shadow-2xs"
                  >
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span>Nhật ký điều chỉnh giá ({booking.priceAdjustments.length})</span>
                  </Button>
                )}
              </div>

              {/* Both Companies Agency Shares (from booking_agencies) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {agenciesList.map((agency) => {
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
                            🤝 <strong>Vai trò Đối tác Chuyên tuyến:</strong> Phụ trách vận hành và hướng dẫn viên chặng địa phương, rà soát và điều chỉnh thêm/giảm khách chặng phụ trách.
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

                        {/* Confirmation status */}
                        {isLead ? (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-100">
                            <span className="text-[11px] text-gray-500 font-medium">Quyền hạn chốt đơn:</span>
                            {booking.status === "confirmed" || agency.quoteConfirmed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Đã duyệt tour &amp; Chốt biểu phí (Chủ trì)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075985] bg-[#F0F9FF] px-2.5 py-1 rounded-full border border-[#CBD5E1]">
                                <Info className="w-3.5 h-3.5 text-[#075985]" />
                                Tự động chốt khi Chủ trì bấm "Duyệt Booking"
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-purple-100">
                            <span className="text-[11px] text-gray-500 font-medium">Trạng thái biểu phí chặng:</span>
                            {booking.status === "confirmed" || agency.quoteConfirmed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Đã chốt theo biểu phí liên minh
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075985] bg-[#F0F9FF] px-2.5 py-1 rounded-full border border-[#CBD5E1]">
                                <Info className="w-3.5 h-3.5 text-[#075985]" />
                                Theo thỏa thuận hợp tác liên minh
                              </span>
                            )}
                          </div>
                        )}
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
                      Công ty chủ trì duyệt booking khi xác nhận cty và đối tác có thể dẫn dắt đoàn. Sau khi duyệt, Chủ trì có thể chủ động tạo các đợt yêu cầu thanh toán (chia đợt đặt cọc hoặc thanh toán toàn bộ tùy thỏa thuận với khách hàng).
                    </p>
                  </div>
                  {isCurrentCompanyLead && (
                    <Button
                      onClick={handleApproveHappyCase}
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
                    Khách hàng thanh toán 100% ({formatVND(booking.totalPrice)}) vào tài khoản ký quỹ trung gian của Nền tảng trước ngày khởi hành. Sau khi kết thúc tour an toàn, Sàn sẽ giải ngân độc lập cho từng công ty theo đúng doanh thu chặng chốt thực tế ở trên.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASSENGER LIST & STAGE ROLL-CALL TABLE */}
          {(() => {
            const isLead = isCurrentCompanyLead;
            const myAgencyId = companyId || currentAgency?.agencyId;

            // If current company is partner, they can ONLY see passengers belonging to their agency
            let visiblePassengers: BookingPassenger[] = [];
            if (isLead) {
              visiblePassengers = passengersList;
            } else {
              // 1. Check if there are explicit rows tagged for my agency
              const myAgencyRows = passengersList.filter(
                (p) =>
                  p.agencyId === myAgencyId ||
                  p.agencyName === companyName ||
                  (currentAgency?.agencyName && p.agencyName === currentAgency.agencyName)
              );

              if (myAgencyRows.length > 0) {
                visiblePassengers = myAgencyRows;
              } else {
                // 2. Fallback: If no explicit rows exist for my agency, but there are full-tour rows (unassigned to a specific stage)
                const unassignedRows = passengersList.filter((p) => !p.agencyId || p.agencyId === "all");
                if (unassignedRows.length > 0) {
                  visiblePassengers = unassignedRows;
                } else if (!passengersList.some((p) => p.agencyId && p.agencyId !== booking.companyId)) {
                  // 3. Fallback: Full tour group where all participants participate in this partner stage
                  const partnerStage = stagesList.find((s) => s.companyId === myAgencyId);
                  const partnerAgency = agenciesList.find((a) => a.agencyId === myAgencyId);
                  const stagePrice =
                    partnerStage?.quoteAdult ??
                    partnerStage?.quotePerGuest ??
                    (partnerAgency && booking.numberOfGuests
                      ? Math.round(partnerAgency.finalAmount / booking.numberOfGuests)
                      : 1800000);

                  visiblePassengers = passengersList.map((p) => ({
                    ...p,
                    agencyId: myAgencyId,
                    agencyName: companyName || currentAgency?.agencyName || partnerStage?.companyName,
                    price: stagePrice,
                  }));
                }
              }
            }

            const activeCount = visiblePassengers.filter((p) => p.status !== "INACTIVE").length;
            const inactiveCount = visiblePassengers.filter((p) => p.status === "INACTIVE").length;
            const visibleTotalPrice = visiblePassengers
              .filter((p) => p.status !== "INACTIVE")
              .reduce((sum, p) => sum + (p.price || 0), 0);

            const filteredPassengers = visiblePassengers.filter((p) => {
              if (!isLead) return true; // Partner already strictly limited to their stage
              if (stageFilter === "all") return true;
              if (stageFilter === "my_stage") {
                return p.agencyId === myAgencyId || p.agencyId === "all";
              }
              if (stageFilter === "partner_stage") {
                return p.agencyId && p.agencyId !== myAgencyId;
              }
              return p.agencyId === stageFilter || p.agencyId === "all" || !p.agencyId;
            });

            const filteredActiveCount = filteredPassengers.filter((p) => p.status !== "INACTIVE").length;
            const filteredTotalPrice = filteredPassengers
              .filter((p) => p.status !== "INACTIVE")
              .reduce((sum, p) => sum + (p.price || 0), 0);

            return (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#075985]" />
                        Danh sách hành khách tham gia đoàn ({visiblePassengers.length} người)
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {activeCount} Đang tham gia
                        </span>
                        {inactiveCount > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            {inactiveCount} Đã rút khỏi chặng
                          </span>
                        )}
                      </div>
                    </div>
                    {isCoHostedTour && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {isLead
                          ? `Tour liên minh ${agenciesList.length} công ty điều phối. Với vai trò Đơn vị Chủ trì, bạn có thể xem danh sách toàn đoàn, lọc theo từng chặng và thêm khách mới.`
                          : `Tour liên minh: Bạn đang xem danh sách hành khách chặng do ${companyName} phụ trách theo bảng booking_participants.`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* ONLY Lead Company has permission to add new passengers */}
                    {isLead && (
                      <Button
                        size="sm"
                        onClick={handleOpenAddPassenger}
                        className="bg-[#075985] hover:bg-[#F97316] text-white text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 shadow-2xs font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Thêm khách vào đoàn</span>
                      </Button>
                    )}

                    {visiblePassengers.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          try {
                            const exportPassengers = stageFilter !== "all" ? filteredPassengers : visiblePassengers;
                            const fileName = `Danh_Sach_Doan_${booking.id}${stageFilter !== "all" ? `_${stageFilter}` : ""}.xlsx`;
                            const exportRows = exportPassengers.map((p, idx) => {
                              const age = calculateAge(p.dateOfBirth, booking.tourStartDate || booking.bookingDate);
                              return {
                                "STT": idx + 1,
                                "Họ & Tên": p.fullName,
                                "CCCD / Định danh": p.idNumber || "",
                                "Ngày sinh": p.dateOfBirth || "",
                                "Độ tuổi": age !== null ? `${age} tuổi` : "",
                                "Giới tính": p.gender === "male" ? "Nam" : "Nữ",
                                "Phân loại": p.ageGroup === "adult" ? "Người lớn" : p.ageGroup === "child_2_11" ? "Trẻ em (2–11t)" : "Em bé (<2t)",
                                "Trạng thái chặng": p.status === "INACTIVE" ? `Đã rút (${p.statusNote || ""})` : "Đang tham gia chặng",
                                "Số điện thoại": p.phone || "",
                                "Ghi chú riêng": p.notes || "",
                                "Giá vé (VNĐ)": p.status === "INACTIVE" ? 0 : p.price,
                              };
                            });

                            const ws = XLSX.utils.json_to_sheet(exportRows);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach");
                            XLSX.writeFile(wb, fileName);
                          } catch (err: any) {
                            alert("Không thể xuất file Excel: " + (err?.message || "Lỗi không xác định"));
                          }
                        }}
                        className="text-xs gap-1.5 h-8 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-[#075985]" />
                        <span>Xuất Excel</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Partner Company Privacy Notice */}
                {!isLead && isCoHostedTour && (
                  <div className="bg-[#F0F9FF] border border-[#F97316]/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-purple-900">
                    <ShieldCheck className="w-4 h-4 text-[#F97316] flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Phân quyền Đối tác Liên minh (booking_participants):</strong> Quý công ty đang xem danh sách <strong>{filteredPassengers.length}</strong> hành khách thuộc phạm vi chặng do <strong>{companyName}</strong> phụ trách đón tiếp. Chỉ Đơn vị Chủ trì mới có quyền xem toàn bộ đoàn và thêm khách mới vào đoàn.
                    </p>
                  </div>
                )}

                {/* Stage Filter Buttons - ONLY visible to Lead Agency */}
                {isLead && isCoHostedTour && agenciesList.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-gray-400" /> Lọc theo chặng:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStageFilter("all")}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                        stageFilter === "all"
                          ? "bg-[#075985] text-white shadow-2xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Tất cả ({passengersList.length})
                    </button>
                    {agenciesList.map((a) => {
                      const countInStage = passengersList.filter((p) => p.agencyId === a.agencyId || p.agencyId === "all" || !p.agencyId).length;
                      return (
                        <button
                          key={a.agencyId}
                          type="button"
                          onClick={() => setStageFilter(a.agencyId)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                            stageFilter === a.agencyId
                              ? "bg-[#F97316] text-white shadow-2xs"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <span>{a.agencyName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            stageFilter === a.agencyId ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                          }`}>
                            {countInStage}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3">
                  {filteredPassengers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[11px]">
                            <th className="px-3 py-2.5 text-left rounded-l-lg">#</th>
                            <th className="px-3 py-2.5 text-left">Họ &amp; Tên</th>
                            <th className="px-3 py-2.5 text-left">CCCD / Passport</th>
                            <th className="px-3 py-2.5 text-left">Ngày sinh / Tuổi</th>
                            <th className="px-3 py-2.5 text-left">Phân loại</th>
                            <th className="px-3 py-2.5 text-left">Trạng thái chặng</th>
                            <th className="px-3 py-2.5 text-right">Giá vé áp dụng</th>
                            <th className="px-3 py-2.5 text-center rounded-r-lg">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredPassengers.map((p, i) => {
                            const isInactive = p.status === "INACTIVE";
                            return (
                              <tr
                                key={p.id}
                                className={`transition-colors ${
                                  isInactive ? "bg-rose-50/40 text-gray-500" : "hover:bg-gray-50/80"
                                }`}
                              >
                                <td className="px-3 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                                <td className="px-3 py-2.5 font-bold text-gray-900">
                                  <span className={isInactive ? "line-through text-gray-500" : ""}>
                                    {p.fullName}
                                  </span>
                                  {p.phone && <span className="block text-[11px] font-normal text-[#075985]">{p.phone}</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                  {p.idNumber ? (
                                    <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                      {p.idNumber}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-gray-600">
                                  <span>{p.dateOfBirth || "—"}</span>
                                  {(() => {
                                    const age = calculateAge(p.dateOfBirth, booking.tourStartDate || booking.createdAt);
                                    return age !== null ? (
                                      <span className="ml-1.5 text-xs text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                        {age} tuổi
                                      </span>
                                    ) : null;
                                  })()}
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.ageGroup === "adult"
                                      ? "bg-[#F0F9FF] text-[#075985]"
                                      : p.ageGroup === "child_2_11"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-[#F0F9FF] text-[#EA580C]"
                                  }`}>
                                    {p.ageGroup === "adult" ? "Người lớn" : p.ageGroup === "child_2_11" ? "Trẻ em (2–11t)" : "Em bé (<2t)"}
                                  </span>
                                </td>

                                <td className="px-3 py-2.5">
                                  {isInactive ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                        <XCircle className="w-3 h-3 text-rose-600" />
                                        Đã rút khỏi chặng
                                      </span>
                                      {p.statusNote && (
                                        <p className="text-[10px] text-rose-700 italic max-w-[170px] truncate" title={p.statusNote}>
                                          {p.statusNote}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      Đang tham gia chặng
                                    </span>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-right">
                                  {isInactive ? (
                                    <div>
                                      <span className="line-through text-gray-400 text-xs">{formatVND(p.price || 0)}</span>
                                      <span className="block text-[10px] text-rose-600 font-bold">0đ (Đã khấu trừ)</span>
                                    </div>
                                  ) : (
                                    <div className="font-bold text-[#075985]">
                                      {p.price === 0 ? "Miễn phí" : formatVND(p.price || 0)}
                                    </div>
                                  )}
                                </td>

                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPassenger(p)}
                                      className="p-1 text-gray-400 hover:text-[#075985] rounded transition-colors"
                                      title="Chỉnh sửa thông tin"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    {!isInactive ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDeactivateModal(p)}
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                        title="Rút hành khách khỏi chặng này trước khởi hành"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleReactivatePassenger(p)}
                                        className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                                        title="Khôi phục hành khách này vào chặng"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {isCurrentCompanyLead && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePassenger(p.id)}
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                        title="Xóa vĩnh viễn khỏi danh sách đoàn (Chỉ Công ty Chủ trì)"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-bold border-t border-gray-200">
                            <td colSpan={6} className="px-3 py-2.5 text-right text-gray-700">
                              Tổng cộng tiền vé ({filteredActiveCount} khách {stageFilter !== "all" ? "chặng này" : "đang tham gia"}):
                            </td>
                            <td className="px-3 py-2.5 text-right text-[#075985] text-sm font-extrabold">
                              {formatVND(filteredTotalPrice)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center text-xs text-gray-500 space-y-2">
                      <p>Chưa có hành khách nào phù hợp với bộ lọc này.</p>
                      <Button size="sm" onClick={handleOpenAddPassenger} className="text-xs bg-[#075985] text-white">
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm hành khách
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* DEDICATED ACCOMMODATION / HOTEL SECTION (MATCHING TourDetailPage.tsx & BookingFormPage.tsx) */}
          {(() => {
            const tour = booking.tour;
            const customHotelChanges = hotelChanges;

            let accommodationList: Array<{
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
                  destination: dest,
                  nights: h.nights || 1,
                  hotelName: change ? change.newHotelName : h.name,
                  stars: change?.stars || h.stars || 4,
                  originalHotelName: change?.originalHotelName || h.name,
                  isChanged: Boolean(change),
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
                              setServiceEditType("hotel");
                              setEditTargetKey(acc.destination);
                              setEditOldName(acc.originalHotelName || acc.hotelName);
                              setEditNewName(acc.hotelName);
                              setEditPriceDiff("0");
                              setEditReason(acc.note || "Đã liên hệ thống nhất với khách đổi khách sạn");
                              setEditAddressOrNote(acc.address || "");
                              setServiceEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-[#075985] hover:text-blue-900 bg-white hover:bg-[#F0F9FF] border border-[#CBD5E1] px-2.5 py-1 rounded-lg font-semibold transition-colors shadow-2xs cursor-pointer"
                            title="Điều chỉnh thông tin hoặc đổi khách sạn khác"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#075985]" />
                            <span>Cập nhật khách sạn</span>
                          </button>
                          {acc.isChanged ? (
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
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white text-[#075985] border border-[#CBD5E1]">
                              Theo tour (Tiêu chuẩn 0đ)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Khách sạn được chọn:</span>
                          <span className="font-bold text-gray-900 text-sm">
                            {acc.hotelName} {acc.stars ? `(${acc.stars}★)` : ""}
                          </span>
                        </div>
                        {acc.isChanged && acc.originalHotelName && acc.originalHotelName !== acc.hotelName && (
                          <div className="flex items-center justify-between text-gray-400">
                            <span>Tiêu chuẩn theo tour:</span>
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
                        {acc.isChanged && (acc.mode === "provider" || acc.providerId) && (
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-gray-500">Thông tin đối tác cung cấp:</span>
                            <button
                              type="button"
                              onClick={() => handleOpenProviderProfile(acc.providerId, {
                                serviceName: acc.hotelName,
                                category: "hotel",
                                destination: acc.destination,
                              })}
                              className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200 transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              Xem hồ sơ đối tác
                              <ExternalLink className="w-3 h-3 text-indigo-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* 1. BOOKING-LEVEL INCIDENTS CARD (booking_incidents)      */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <div>
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    Nhật ký Sự cố Tour (`booking_incidents`)
                    <span className="text-xs normal-case px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {incidents.length} sự cố
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Quản lý các sự cố phát sinh của đoàn liên kết trực tiếp vào mã booking #{booking.id}. (Không gắn cố định tại điểm tham quan).
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

          {/* TOUR FULL ITINERARY (MATCHING chitietlichtrinh.png & TourDetailPage.tsx) */}
          {booking.tour.itinerary && booking.tour.itinerary.length > 0 && (
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
                    Theo dõi check-in thực tế của từng hướng dẫn viên tại các điểm đến và chi tiết lịch trình của đoàn.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setItinerarySubTab("standard")}
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
                </div>
              </div>

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
                      {booking.tour.itinerary.map((day) => {
                        const dayAttractions = day.locations || [];
                        if (dayAttractions.length === 0) return null;

                        // Check which agency is responsible for this day
                        const dayAgencyId = day.createdByCompanyId || (dayAttractions[0]?.createdByCompanyId) || booking.companyId;
                        const dayAgencyName = day.createdByCompanyName || (dayAttractions[0]?.createdByCompanyName) || booking.companyName;
                        const isMyStage = (companyId && dayAgencyId === companyId) || (companyName && dayAgencyName === companyName);

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
                                    Ngày {day.day}: {day.title}
                                  </h3>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isMyStage
                                    ? "bg-[#F97316]/15 text-purple-800 border-purple-300"
                                    : "bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]"
                                }`}>
                                  {isMyStage ? `Chặng của cty bạn: ${dayAgencyName}` : `Chặng đối tác: ${dayAgencyName}`}
                                </span>
                              </div>
                            </div>

                            {/* Single-line Vertical Timeline Track */}
                            <div className="p-5 sm:p-6 bg-white">
                              <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 ml-3 sm:ml-4 space-y-6">
                                {dayAttractions.map((loc, lIdx) => {
                                  const locAgencyId = loc.createdByCompanyId || dayAgencyId;
                                  const locAgencyName = loc.createdByCompanyName || dayAgencyName;
                                  const isMyLoc = (companyId && locAgencyId === companyId) || (companyName && locAgencyName === companyName);

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
                                        className={`absolute -left-[35px] sm:-left-[43px] top-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white transition-all shadow-xs ${
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
                                        {isAllCheckedIn ? (
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        ) : isAllSkipped ? (
                                          <X className="w-3.5 h-3.5 stroke-[3]" />
                                        ) : isPartial ? (
                                          <Clock className="w-3.5 h-3.5" />
                                        ) : (
                                          <span>{lIdx + 1}</span>
                                        )}
                                      </div>

                                      {/* Attraction Info */}
                                      <div className="space-y-1.5">
                                        <div className="flex items-start justify-between gap-2 flex-wrap">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-gray-900 text-sm">{loc.name}</h4>
                                          </div>

                                          {!isMyLoc && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                              Đối tác: {locAgencyName}
                                            </span>
                                          )}
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
                              Ngày {day.day}: {day.title}
                              {day.meals && day.meals.length > 0 && (
                                <span className="text-xs text-gray-400 font-normal ml-1.5">
                                  (Ăn {day.meals.map((m) => m.type === "breakfast" ? "sáng" : m.type === "lunch" ? "trưa" : "tối").join(", ")})
                                </span>
                              )}
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

                        {/* Locations timeline */}
                        <div className="relative pl-1">
                          <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200" />

                          <div className="space-y-2.5">
                            {day.locations && day.locations.length > 0 ? (
                              day.locations.map((loc, lIdx) => {
                                const locChange = locChanges.find(
                                  (lc) =>
                                    (lc.dayId === day.id || lc.dayNumber === day.day) &&
                                    (lc.locationId === loc.id ||
                                      (lc.originalLocationName && lc.originalLocationName.toLowerCase() === loc.name.toLowerCase()) ||
                                      (lc.originalLocations && lc.originalLocations.some((orig) => orig.toLowerCase() === loc.name.toLowerCase())))
                                );
                                const isLocChanged = Boolean(locChange);

                                return (
                                  <div key={loc.id || lIdx} className="relative flex items-center gap-3">
                                    {/* Dot */}
                                    <div
                                      className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                                        isLocChanged
                                          ? "bg-amber-400 border-amber-400 text-white"
                                          : "bg-white border-blue-400 text-blue-500"
                                      }`}
                                    >
                                      <MapPin className="w-3.5 h-3.5" />
                                    </div>

                                    {/* Content card */}
                                    <div
                                      className={`flex-1 rounded-xl border p-3 ${
                                        isLocChanged ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          {isLocChanged ? (
                                            <>
                                              <p className="text-xs text-gray-400 line-through">{loc.name}</p>
                                              <p className="text-sm font-medium text-amber-800 mt-0.5">
                                                → {locChange?.requestedLocations}
                                              </p>
                                              {locChange?.note && (
                                                <p className="text-xs text-amber-700 italic mt-0.5">
                                                  Ghi chú: {locChange.note}
                                                </p>
                                              )}
                                            </>
                                          ) : (
                                            <p className="font-medium text-gray-900 text-sm">{loc.name}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setServiceEditType("location");
                                              setEditTargetDay(day.day);
                                              setEditTargetKey(loc.id || loc.name);
                                              setEditOldName(loc.name);
                                              setEditNewName(isLocChanged ? locChange?.requestedLocations || loc.name : loc.name);
                                              setEditPriceDiff("0");
                                              setEditReason(locChange?.note || "Đã liên hệ thống nhất với khách đổi điểm tham quan");
                                              setEditAddressOrNote("");
                                              setServiceEditModalOpen(true);
                                            }}
                                            className="text-xs text-amber-700 hover:text-amber-900 bg-white hover:bg-amber-100/70 border border-amber-300 px-2 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                            title="Điều chỉnh hoặc đổi điểm đến này"
                                          >
                                            <Edit className="w-3 h-3 text-amber-600" />
                                            <span>Đổi điểm</span>
                                          </button>
                                          <span
                                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                              isLocChanged
                                                ? "bg-amber-100 text-amber-700 border border-amber-300"
                                                : "bg-gray-100 text-gray-600"
                                            }`}
                                          >
                                            {isLocChanged ? "Đã đổi" : "Theo tour"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-gray-500 italic pl-8">
                                Hoạt động tự do hoặc di chuyển theo lịch trình tour.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Day Meals Section */}
                        {day.meals && day.meals.length > 0 && (
                          <div className="pt-3 border-t border-gray-100 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                                Chế độ ẩm thực &amp; Bữa ăn Ngày {day.day}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                (Thực đơn &amp; nhà hàng phục vụ)
                              </span>
                            </div>

                            <div className="space-y-2">
                              {day.meals.map((defaultMeal, mIdx) => {
                                const mealType = defaultMeal.type as "breakfast" | "lunch" | "dinner";
                                const mealChange = dayMealChanges?.find((mc) => mc.mealType === mealType);
                                const isChanged = Boolean(mealChange);
                                const mealLabel =
                                  mealType === "breakfast" ? "Bữa sáng" : mealType === "lunch" ? "Bữa trưa" : "Bữa tối";

                                return (
                                  <div
                                    key={mIdx}
                                    className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                                  >
                                    <div
                                      className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-left ${
                                        mealType === "breakfast"
                                          ? "bg-amber-50/60"
                                          : mealType === "lunch"
                                          ? "bg-emerald-50/60"
                                          : "bg-[#F0F9FF]/60"
                                      }`}
                                    >
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
                                          <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                            {mealLabel}:{" "}
                                            <span className="font-bold text-gray-900">
                                              {isChanged
                                                ? mealChange?.newMealName
                                                : defaultMeal.serviceName || "Nhà hàng theo tour"}
                                            </span>
                                          </p>
                                          <p className="text-[11px] text-gray-500">
                                            Mặc định: {defaultMeal.serviceName || "Nhà hàng địa phương"}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setServiceEditType("meal");
                                            setEditTargetDay(day.day);
                                            setEditTargetKey(mealType);
                                            setEditOldName(defaultMeal.serviceName || "Nhà hàng theo tour");
                                            setEditNewName(isChanged ? mealChange?.newMealName || defaultMeal.serviceName || "" : defaultMeal.serviceName || "");
                                            setEditPriceDiff(mealChange?.priceDifference ? mealChange.priceDifference.toString() : "0");
                                            setEditReason(mealChange?.note || "Đã liên hệ thống nhất với khách đổi nhà hàng / bữa ăn");
                                            setEditAddressOrNote("");
                                            setServiceEditModalOpen(true);
                                          }}
                                          className="text-xs text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                          title="Điều chỉnh bữa ăn & nhà hàng này"
                                        >
                                          <Edit className="w-3 h-3 text-emerald-600" />
                                          <span>Đổi bữa ăn</span>
                                        </button>
                                        <div className="border border-gray-200 bg-white px-2.5 py-1 rounded-md text-xs text-gray-500 flex items-center gap-1 shadow-2xs">
                                          {isChanged ? (
                                            <span className="text-[10px] text-emerald-800 font-bold">
                                              Đã đổi {mealChange?.priceDifference ? `(+${formatVND(mealChange.priceDifference)})` : ""}
                                            </span>
                                          ) : (
                                            <span>Theo tour (0đ)</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
              {booking.bookingNotes && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-amber-900 mt-2">
                  <span className="font-bold block mb-1">Ghi chú từ khách hàng:</span>
                  <p className="leading-relaxed">{booking.bookingNotes}</p>
                </div>
              )}
            </div>
          </div>

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
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Tổng giá trị đơn ({booking.numberOfGuests} khách):</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="font-extrabold text-[#075985] text-base">{formatVND(booking.totalPrice)}</span>
                    {onUpdateBookingPrice && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNewPriceInput(booking.totalPrice.toString());
                          setPriceNoteInput(booking.priceAdjustmentNote || "");
                          setPriceModalOpen(true);
                        }}
                        className="h-7 px-2 text-xs text-[#075985] hover:text-blue-800 hover:bg-[#E0F2FE] gap-1 font-semibold"
                        title="Điều chỉnh giá tiền tour theo thỏa thuận"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Đổi giá
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPriceAdjustmentsModalOpen(true)}
                      className="h-7 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 gap-1 font-semibold"
                      title="Xem nhật ký lịch sử điều chỉnh giá và biến động thành viên đoàn"
                    >
                      <History className="w-3.5 h-3.5 text-amber-600" />
                      Nhật ký ({booking.priceAdjustments?.length || 0})
                    </Button>
                  </div>
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
                    : "Chưa thanh toán (Thanh toán sau)"}
                </span>
              </div>

              {/* Progress breakdown */}
              {(() => {
                const totalPaidIntoSystem = (booking.paymentRequests ?? [])
                  .filter((pr) => pr.status === "paid")
                  .reduce((sum, pr) => sum + pr.amount, 0);
                const totalRequested = (booking.paymentRequests ?? [])
                  .filter((pr) => pr.status !== "cancelled")
                  .reduce((sum, pr) => sum + pr.amount, 0);
                const remainingToRequest = Math.max(0, booking.totalPrice - totalRequested);

                return (
                  <div className="space-y-1.5 py-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500">Khách đã nộp vào TK Hệ thống:</span>
                      <span className="font-bold text-emerald-700">{formatVND(totalPaidIntoSystem)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500">Tổng tiền đã tạo yêu cầu:</span>
                      <span className="font-bold text-[#075985]">{formatVND(totalRequested)} / {formatVND(booking.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500">Còn lại có thể yêu cầu thu:</span>
                      <span className="font-bold text-amber-700">{formatVND(remainingToRequest)}</span>
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
                  <p>Số tiền đã nhận: <strong className="text-emerald-700 text-xs">{formatVND(booking.settledAmount ?? 0)}</strong> {booking.platformFeeRate ? `(Đã khấu trừ ${booking.platformFeeRate}% phí sàn ${formatVND(booking.platformFeeAmount ?? 0)})` : "(Miễn phí sàn 0% - Giải ngân 100%)"}</p>
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
                <div className="bg-[#F0F9FF]/70 p-2.5 rounded-lg border border-[#CBD5E1] text-blue-900 text-[11px] leading-relaxed">
                  🛡️ <strong>Chính sách Escrow:</strong> Tiền thanh toán của khách sẽ vào Tài khoản Hệ thống. Khi tour kết thúc, Admin sàn sẽ đối soát và giải ngân 100% cho Quý công ty (chính sách miễn phí sàn hiện tại).
                </div>
              )}
            </div>

            {/* Quick Payment Action Buttons */}
            {isCurrentCompanyLead ? (
              (() => {
                const totalRequested = (booking.paymentRequests ?? [])
                  .filter((pr) => pr.status !== "cancelled")
                  .reduce((sum, pr) => sum + pr.amount, 0);
                const remainingToRequest = Math.max(0, booking.totalPrice - totalRequested);

                return (
                  <div className="space-y-2 pt-2">
                    <Button
                      variant="outline"
                      disabled={remainingToRequest <= 0}
                      onClick={() => {
                        setPaymentAmount(remainingToRequest.toString());
                        setPaymentDescription(
                          totalRequested === 0
                            ? "Đặt cọc đợt 1 (50%)"
                            : remainingToRequest === booking.totalPrice - totalRequested
                            ? "Thanh toán phần còn lại trước khởi hành"
                            : "Thanh toán đợt tiếp theo"
                        );
                        setPaymentDueDate("");
                        setPaymentModalOpen(true);
                      }}
                      className={`w-full text-xs h-9 gap-1.5 font-bold ${
                        remainingToRequest <= 0
                          ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                          : "border-blue-500 text-[#075985] hover:bg-[#F0F9FF]"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {remainingToRequest <= 0
                        ? "Đã tạo đủ yêu cầu cho 100% giá trị tour"
                        : `Tạo yêu cầu thanh toán (Còn ${formatVND(remainingToRequest)})`}
                    </Button>
                  </div>
                );
              })()
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Quyền tạo yêu cầu thanh toán
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Đơn hàng này do <strong>{leadAgency?.agencyName || booking.companyName || "Công ty Chủ trì"}</strong> đại diện liên minh ký hợp đồng và quản lý thu tiền từ khách hàng. Đối tác liên minh không tạo yêu cầu thanh toán trực tiếp với khách.
                </p>
              </div>
            )}

            {/* Existing Payment Requests List */}
            {booking.paymentRequests && booking.paymentRequests.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-xs font-bold text-gray-700 block">Các yêu cầu thanh toán đã tạo:</span>
                <div className="space-y-2">
                  {booking.paymentRequests.map((pr) => (
                    <div key={pr.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-gray-800">{pr.description}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pr.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {pr.status === "paid" ? "Tiền đã vào TK Hệ thống" : "Chờ khách thanh toán"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-gray-500 pt-1">
                        <span>Hạn: {pr.dueDate}</span>
                        <span className="font-bold text-[#075985] text-sm">{formatVND(pr.amount)}</span>
                      </div>
                      {pr.paidAt && (
                        <p className="text-[10px] text-emerald-600 font-medium">
                          Khách đã nộp ngày: {pr.paidAt}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ASSIGNED GUIDE CARD (Multi-guide support with company ownership) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#075985]" />
                Hướng dẫn viên phụ trách ({assignedGuides.length})
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenAssignAttractionsModal}
                  className="h-7 px-2 text-xs text-[#EA580C] hover:text-purple-900 hover:bg-[#F0F9FF] border-[#F97316]/30 font-semibold gap-1 shadow-2xs"
                  title="Phân công HDV theo từng điểm đến (booking_attraction_checkins)"
                >
                  <Navigation className="w-3 h-3 text-[#F97316]" />
                  Gán điểm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedGuideToAdd(guides[0]?.id || "");
                    setSelectedGuideRole(assignedGuides.length === 0 ? "lead_guide" : "support_guide");
                    setSelectedGuideNotes("");
                    setAssignModalOpen(true);
                  }}
                  className="h-7 px-2 text-xs text-[#075985] hover:text-blue-800 hover:bg-[#F0F9FF] border-[#CBD5E1] font-semibold gap-1"
                  title="Phân công thêm HDV của công ty bạn vào đoàn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Thêm HDV
                </Button>
              </div>
            </div>

            {assignedGuides.length === 0 ? (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center space-y-2">
                <p className="text-xs text-amber-800">Chưa có hướng dẫn viên được chỉ định cho đoàn này.</p>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedGuideToAdd(guides[0]?.id || "");
                    setSelectedGuideRole("lead_guide");
                    setSelectedGuideNotes("");
                    setAssignModalOpen(true);
                  }}
                  className="bg-[#075985] hover:bg-[#F97316] text-white text-xs h-8"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Giao hướng dẫn viên
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedGuides.map((ag) => {
                  const isMyGuide = Boolean(
                    (companyId && ag.companyId === companyId) ||
                    (companyName && ag.companyName === companyName) ||
                    (!ag.companyId && isCurrentCompanyLead)
                  );

                  const roleLabel =
                    ag.role === "lead_guide"
                      ? "HDV Trưởng đoàn"
                      : ag.role === "stage_guide"
                      ? "HDV Chặng"
                      : ag.role === "logistics"
                      ? "Hậu cần & Điều phối"
                      : "HDV Phụ tá / Hỗ trợ";

                  const roleBadgeClass =
                    ag.role === "lead_guide"
                      ? "bg-[#E0F2FE] text-blue-800 border-[#CBD5E1]"
                      : ag.role === "stage_guide"
                      ? "bg-[#F97316]/15 text-purple-800 border-[#F97316]/30"
                      : "bg-gray-100 text-gray-700 border-gray-200";

                  return (
                    <div
                      key={ag.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isMyGuide ? "bg-white border-[#CBD5E1] shadow-2xs" : "bg-gray-50/80 border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {ag.guideAvatar ? (
                          <img
                            src={ag.guideAvatar}
                            alt={ag.guideName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#075985] text-white font-bold flex items-center justify-center shrink-0">
                            {ag.guideName ? ag.guideName[0] : "H"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">{ag.guideName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadgeClass}`}>
                              {roleLabel}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-700">{ag.companyName}</span>
                            {isMyGuide ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Của cty bạn
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-[#F0F9FF] text-[#EA580C] border border-[#F97316]/30 text-[10px] font-bold">
                                Đối tác
                              </span>
                            )}
                          </div>

                          {ag.guidePhone && (
                            <p className="text-[#075985] flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3" />
                              {ag.guidePhone}
                            </p>
                          )}

                          {ag.notes && (
                            <p className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-100 italic">
                              {ag.notes}
                            </p>
                          )}

                          {/* Guide action permissions */}
                          <div className="pt-1.5 flex items-center justify-between border-t border-gray-100 text-[11px]">
                            {isMyGuide ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGuideToReplace(ag);
                                    const otherGuides = guides.filter((g) => g.id !== ag.guideId);
                                    setNewReplacementGuideId(otherGuides[0]?.id || "");
                                    setReplaceModalOpen(true);
                                  }}
                                  className="text-[#075985] hover:text-blue-800 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Thay thế
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAssignedGuide(ag.id)}
                                  className="text-rose-600 hover:text-rose-800 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Xoá
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 italic flex items-center gap-1">
                                <Lock className="w-3 h-3 text-gray-400" />
                                Do {ag.companyName} quản lý
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 ml-auto">
                              Gán: {ag.assignedAt}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: TỪ CHỐI BOOKING */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Từ chối Đặt tour</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label className="text-xs">Lý do từ chối gửi đến khách hàng <span className="text-red-500">*</span></Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Không đủ chỗ, lịch trình yêu cầu không khả thi trong mùa này..."
              rows={3}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Hủy</Button>
              <Button
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
        </DialogContent>
      </Dialog>

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
              <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Hủy</Button>
              <Button
                disabled={guides.length === 0 || !selectedGuideToAdd}
                className="bg-[#075985] hover:bg-[#F97316] text-white font-bold"
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

      {/* MODAL: TẠO YÊU CẦU THANH TOÁN */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          {(() => {
            const totalRequested = (booking.paymentRequests ?? [])
              .filter((pr) => pr.status !== "cancelled")
              .reduce((sum, pr) => sum + pr.amount, 0);
            const remainingToRequest = Math.max(0, booking.totalPrice - totalRequested);
            const requestedAmount = parseInt(paymentAmount) || 0;
            const isOverLimit = requestedAmount > remainingToRequest;

            return (
              <div className="space-y-4 pt-1 text-xs">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="w-5 h-5 text-[#075985]" />
                    Tạo Yêu cầu Thanh toán Đợt tiếp theo
                  </DialogTitle>
                </DialogHeader>

                {/* Booking & financial balance summary */}
                <div className="bg-[#F0F9FF]/70 rounded-xl p-3.5 border border-[#CBD5E1] space-y-1.5 text-xs text-blue-950">
                  <div className="flex justify-between items-center">
                    <span>Mã Booking: <strong>#{booking.id}</strong></span>
                    <span>Khách: <strong>{booking.userName}</strong></span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#CBD5E1]/60">
                    <span>Tổng tiền tour: <strong className="text-gray-900">{formatVND(booking.totalPrice)}</strong></span>
                    <span>Đã tạo yêu cầu: <strong className="text-[#075985]">{formatVND(totalRequested)}</strong></span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#CBD5E1]/60 font-bold">
                    <span>Số tiền còn lại có thể yêu cầu:</span>
                    <span className="text-sm text-amber-700">{formatVND(remainingToRequest)}</span>
                  </div>
                </div>

                {/* Amount input & Quick select */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-gray-700">
                      Số tiền yêu cầu đợt này (VNĐ) <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[11px] text-gray-400">
                      Tối đa: {formatVND(remainingToRequest)}
                    </span>
                  </div>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={remainingToRequest.toString()}
                    className={`mt-1 text-xs font-bold ${isOverLimit ? "border-red-500 text-red-600 focus:ring-red-500" : ""}`}
                  />
                  {isOverLimit && (
                    <p className="text-[11px] text-red-600 font-medium">
                      ⚠️ Số tiền không được vượt quá số tiền còn lại chưa tạo yêu cầu ({formatVND(remainingToRequest)})
                    </p>
                  )}

                  {/* Quick amount shortcuts */}
                  {remainingToRequest > 0 && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">Chọn nhanh:</span>
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(remainingToRequest.toString())}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#E0F2FE] text-blue-800 hover:bg-blue-200 font-semibold"
                      >
                        100% còn lại ({formatVND(remainingToRequest)})
                      </button>
                      {remainingToRequest >= 200000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(Math.round(remainingToRequest / 2).toString())}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                        >
                          50% ({formatVND(Math.round(remainingToRequest / 2))})
                        </button>
                      )}
                      {remainingToRequest >= 1000000 && (
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(Math.round(remainingToRequest * 0.3).toString())}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                        >
                          30% ({formatVND(Math.round(remainingToRequest * 0.3))})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Description input & Suggestions */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">
                    Mục đích / Tên đợt thanh toán <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    placeholder="VD: Đặt cọc đợt 1 (50%)"
                    className="mt-1 text-xs"
                  />
                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    <span className="text-[10px] text-gray-400">Gợi ý:</span>
                    {[
                      "Đặt cọc đợt 1 (50%)",
                      "Thanh toán đợt 2",
                      "Thanh toán toàn bộ 100%",
                      "Thanh toán phần còn lại trước khởi hành",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setPaymentDescription(s)}
                        className="text-[10px] px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due date */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">
                    Hạn chót thanh toán <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                {/* Escrow Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    Lưu ý về Dòng tiền Thanh toán:
                  </p>
                  <p>
                    Tiền thanh toán của khách sẽ được chuyển trực tiếp vào <strong>Tài khoản trung gian (Escrow) của Hệ thống</strong>. Khi tour kết thúc tốt đẹp, Admin sàn sẽ quyết toán và chuyển lại 100% cho Quý công ty (chính sách miễn phí sàn hiện tại).
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    disabled={
                      !paymentAmount ||
                      requestedAmount <= 0 ||
                      isOverLimit ||
                      !paymentDescription ||
                      !paymentDueDate
                    }
                    className="bg-[#075985] hover:bg-[#F97316] text-white font-bold"
                    onClick={() => {
                      onCreatePaymentRequest(booking.id, {
                        amount: requestedAmount,
                        description: paymentDescription,
                        dueDate: paymentDueDate,
                      });
                      setPaymentModalOpen(false);
                      setPaymentAmount("");
                      setPaymentDescription("");
                      setPaymentDueDate("");
                    }}
                  >
                    Gửi yêu cầu thanh toán
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* MODAL: ĐIỀU CHỈNH GIÁ TOUR TỔNG THỂ */}
      <Dialog open={priceModalOpen} onOpenChange={setPriceModalOpen}>
        <DialogContent className="max-w-md">
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
              <Label className="text-xs font-semibold text-gray-700">
                Giá tổng thể mới (VNĐ) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={newPriceInput}
                onChange={(e) => setNewPriceInput(e.target.value)}
                placeholder={booking.totalPrice.toString()}
                className="mt-1 text-xs font-bold text-[#075985]"
              />
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
                Ghi chú / Lý do điều chỉnh giá
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
              <Button variant="outline" onClick={() => setPriceModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                disabled={!newPriceInput || parseInt(newPriceInput) <= 0}
                className="bg-[#075985] hover:bg-[#F97316] text-white font-bold"
                onClick={() => {
                  if (onUpdateBookingPrice && newPriceInput) {
                    const parsed = parseInt(newPriceInput);
                    const diff = parsed - booking.totalPrice;
                    const reason = priceNoteInput.trim() || "Thỏa thuận điều chỉnh giá tour trực tiếp";
                    onUpdateBookingPrice(booking.id, parsed, priceNoteInput, {
                      id: `adj-${Date.now()}`,
                      bookingId: booking.id,
                      adjustedBy: companyName,
                      previousTotalPrice: booking.totalPrice,
                      adjustmentAmount: diff,
                      newTotalPrice: parsed,
                      reason,
                      createdAt: new Date().toISOString(),
                    });
                  }
                  setPriceModalOpen(false);
                }}
              >
                Lưu giá mới
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
              <p>Tổng giá trị hợp đồng: <strong className="text-[#075985]">{formatVND(booking.totalPrice)}</strong></p>
              <p>Trạng thái thanh toán: <strong>{booking.paymentStatus === "paid" ? "Đã thanh toán" : booking.paymentStatus === "refunded" ? "Đã hoàn tiền" : "Chưa thanh toán"}</strong></p>
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

      {/* Passenger Add/Edit Modal (with Stage Selection & Live Price Preview) */}
      <Dialog open={passengerModalOpen} onOpenChange={setPassengerModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Users className="w-5 h-5 text-[#075985]" />
              {passengerModalMode === "add" ? "Thêm hành khách vào đoàn" : "Chỉnh sửa thông tin hành khách"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-gray-700">Họ và tên *</label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Số CCCD / Passport</label>
                <input
                  type="text"
                  value={passengerIdNumber}
                  onChange={(e) => setPassengerIdNumber(e.target.value)}
                  placeholder="001..."
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Ngày sinh *</label>
                <input
                  type="date"
                  value={passengerDob}
                  onChange={(e) => handlePassengerDobChange(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:border-blue-500 focus:outline-hidden"
                />
                {passengerDob && (
                  <span className="text-[10px] text-gray-500 block">
                    Độ tuổi: {calculateAge(passengerDob, booking.tourStartDate || booking.bookingDate)} tuổi (
                    {(() => {
                      const age = calculateAge(passengerDob, booking.tourStartDate || booking.bookingDate) || 25;
                      if (age < 2) return "Em bé <2t";
                      if (age <= 11) return "Trẻ em 2–11t";
                      return "Người lớn";
                    })()}
                    )
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700">Giới tính</label>
                <select
                  value={passengerGender}
                  onChange={(e) => setPassengerGender(e.target.value as "male" | "female")}
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-gray-700">Số điện thoại liên hệ</label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="09..."
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Stage / Agency Selection (Alliance tours) */}
              {isCoHostedTour && agenciesList.length > 1 && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-gray-700 block">Chặng tour &amp; Đơn vị tiếp nhận:</label>
                  <select
                    value={passengerSelectedAgencyId}
                    onChange={(e) => {
                      const sel = e.target.value;
                      setPassengerSelectedAgencyId(sel);
                      const age = calculateAge(passengerDob, booking.tourStartDate || booking.bookingDate) || 25;
                      let grp: "adult" | "child_2_11" | "child_under_2" = "adult";
                      if (age < 2) grp = "child_under_2";
                      else if (age <= 11) grp = "child_2_11";
                      const p = calculatePassengerPrice(grp, sel);
                      setPassengerCustomPrice(p.toString());
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-purple-300 bg-[#F0F9FF]/50 text-xs font-semibold focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="all">Toàn bộ tour (100% tất cả các chặng)</option>
                    {agenciesList.map((a) => (
                      <option key={a.agencyId} value={a.agencyId}>
                        Chỉ tham gia chặng: {a.agencyName} ({a.role === "lead" ? "Chủ trì" : "Đối tác"})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500">
                    {passengerSelectedAgencyId === "all"
                      ? "Hành khách tham gia trọn vẹn lịch trình của cả 2 công ty."
                      : `Hành khách chỉ tham gia riêng chặng của công ty được chọn. Tiền vé sẽ chỉ phân bổ vào doanh thu chặng của công ty đó.`}
                  </p>
                </div>
              )}
            </div>

            {/* Price Box with Auto-calculation Explanation & Editable Input */}
            <div className="bg-[#F0F9FF]/70 p-3.5 rounded-xl border border-[#CBD5E1] space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-gray-800 font-bold text-xs block">Giá vé áp dụng theo độ tuổi:</span>
                  <span className="text-[11px] text-gray-500">
                    {(() => {
                      const age = calculateAge(passengerDob, booking.tourStartDate || booking.bookingDate) || 25;
                      if (age < 2) return "Em bé <2t (Miễn phí vé tour)";
                      if (age <= 11) return "Trẻ em 2–11t (70% giá vé người lớn)";
                      return "Khách người lớn (100% dịch vụ đoàn)";
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    value={passengerCustomPrice}
                    onChange={(e) => setPassengerCustomPrice(e.target.value)}
                    placeholder="0"
                    className="w-36 h-9 px-3 rounded-lg border border-blue-300 bg-white font-black text-blue-800 text-sm text-right focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="text-xs font-bold text-blue-900">đ</span>
                </div>
              </div>

              {/* Informative Note Explaining Price Origin */}
              <div className="text-[11px] text-blue-900 bg-white/90 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2 leading-relaxed">
                <Info className="w-4 h-4 text-[#075985] flex-shrink-0 mt-0.5" />
                <div>
                  <span>
                    <strong>Cơ sở tính giá vé:</strong> Giá vé đoàn thực tế của booking này là{" "}
                    <strong className="text-[#075985]">{formatVND(calculatePassengerPrice("adult"))}</strong>/khách người lớn
                    {booking.tour?.price && booking.tour.price !== calculatePassengerPrice("adult") ? (
                      <> (đã bao gồm tùy chỉnh nâng cấp dịch vụ &amp; phụ thu theo đơn của khách so với giá niêm yết ban đầu {formatVND(booking.tour.price)})</>
                    ) : null}.
                  </span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">
                    Hệ thống tự động điền giá chuẩn của đoàn, bạn có thể chỉnh sửa số tiền ở ô trên nếu có thỏa thuận riêng với khách.
                  </span>
                </div>
              </div>
            </div>

            {/* Simultaneous Price & Payment Request Options (Add Mode Only) */}
            {passengerModalMode === "add" && (() => {
              const effectivePrice = passengerCustomPrice !== "" ? Math.max(0, parseInt(passengerCustomPrice) || 0) : calculatePassengerPrice("adult");

              return (
                <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Đồng thời cập nhật tài chính &amp; tổng giá tour
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Theo quy trình bổ sung người ngoài hệ thống, bạn có thể tự động cộng tiền vé mới vào tổng giá booking và tạo đợt thu phụ phí cho khách.
                  </p>

                  <div className="space-y-2 pt-1 border-t border-amber-200/60">
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={autoUpdateTourPrice}
                        onChange={(e) => setAutoUpdateTourPrice(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-[#075985] focus:ring-[#075985] w-4 h-4"
                      />
                      <div>
                        <span>Tự động cập nhật tổng giá tour (+{formatVND(effectivePrice)})</span>
                        <span className="block text-[11px] font-normal text-gray-500 mt-0.5">
                          Tổng đơn sẽ tự động tăng từ <strong>{formatVND(booking.totalPrice)}</strong> lên{" "}
                          <strong className="text-[#075985]">{formatVND(booking.totalPrice + effectivePrice)}</strong>
                        </span>
                      </div>
                    </label>

                    {autoUpdateTourPrice && effectivePrice > 0 && (
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-gray-800 pl-6">
                        <input
                          type="checkbox"
                          checked={createExtraPaymentRequest}
                          onChange={(e) => setCreateExtraPaymentRequest(e.target.checked)}
                          className="mt-0.5 rounded border-gray-300 text-[#075985] focus:ring-[#075985] w-4 h-4"
                        />
                        <div>
                          <span>Tạo đợt thu (Payment Request) gửi đến khách hàng</span>
                          <span className="block text-[11px] font-normal text-gray-500 mt-0.5">
                            Tạo hóa đơn đợt thu bổ sung <strong>{formatVND(effectivePrice)}</strong> trên trang khách hàng kèm mã QR ngân hàng
                          </span>
                        </div>
                      </label>
                    )}

                    {autoUpdateTourPrice && effectivePrice > 0 && (
                      <div className="space-y-1 pl-6 pt-1">
                        <label className="font-semibold text-gray-700 text-[11px]">
                          Lý do điều chỉnh (ghi vào nhật ký kiểm toán / Audit Log):
                        </label>
                        <input
                          type="text"
                          value={customAdjustmentReason}
                          onChange={(e) => setCustomAdjustmentReason(e.target.value)}
                          placeholder={`VD: Bổ sung ${passengerName || "thành viên"} theo yêu cầu của khách qua Zalo/Điện thoại`}
                          className="w-full h-8 px-2.5 rounded border border-amber-300 bg-white text-xs text-gray-800 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1">
              <label className="font-bold text-gray-700">Ghi chú riêng (Dị ứng, hỗ trợ xe lăn, say xe...)</label>
              <textarea
                value={passengerNotes}
                onChange={(e) => setPassengerNotes(e.target.value)}
                rows={2}
                placeholder="VD: Ăn chay, dị ứng tôm cua, cần ghế ngồi phía trước xe..."
                className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={() => setPassengerModalOpen(false)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSavePassengerModal} className="bg-[#075985] hover:bg-[#F97316] text-white font-bold">
              {passengerModalMode === "add" ? "✓ Thêm vào danh sách đoàn" : "✓ Cập nhật thông tin"}
            </Button>
          </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <History className="w-5 h-5 text-amber-600" />
              Nhật ký điều chỉnh giá &amp; thành viên đoàn #{booking.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <p className="font-bold">Theo dõi lịch sử tài chính &amp; biến động thành viên</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Mỗi khi công ty thỏa thuận thêm/bớt hành khách hoặc điều chỉnh giá tour theo yêu cầu ngoài hệ thống, dữ liệu thay đổi sẽ được ghi nhận vào nhật ký kiểm toán (Audit Trail) để đảm bảo minh bạch tài chính và đối soát hợp đồng.
              </p>
            </div>

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
                            isPositive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}>
                            {isPositive ? `+${formatVND(adj.adjustmentAmount)}` : `-${formatVND(Math.abs(adj.adjustmentAmount))}`}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {adj.reason}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium">
                          {new Date(adj.createdAt).toLocaleString("vi-VN")}
                        </span>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Navigation className="w-5 h-5 text-[#F97316]" />
              Phân công Hướng dẫn viên theo Điểm đến &amp; Chặng (`booking_attraction_checkins`)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAssignPresetMode("single")}
                className={`p-2.5 rounded-lg text-left transition-all ${
                  assignPresetMode === "single"
                    ? "bg-white text-purple-900 shadow-2xs font-bold ring-2 ring-purple-400/40"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-[#EA580C]">
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
                className={`p-2.5 rounded-lg text-left transition-all ${
                  assignPresetMode === "co_guides"
                    ? "bg-white text-blue-900 shadow-2xs font-bold ring-2 ring-blue-400/40"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-[#075985]">
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
                className={`p-2.5 rounded-lg text-left transition-all ${
                  assignPresetMode === "custom"
                    ? "bg-white text-emerald-900 shadow-2xs font-bold ring-2 ring-emerald-400/40"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-emerald-700">
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
                    Khi lưu, BE sẽ tự động nhân bản (duplicate) các dòng trong bảng `booking_attraction_checkins` để mỗi HDV thực hiện check-in riêng biệt với nhau.
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

                {/* Calculation formula explanation */}
                <div className="p-2.5 bg-[#E0F2FE]/60 rounded-lg text-[11px] text-blue-900 space-y-0.5">
                  <p className="font-bold">
                    💡 Quy tắc nhân bản bảng `booking_attraction_checkins`:
                  </p>
                  <p>
                    {allItineraryAttractions.filter(a => a.isMyAgencyAttraction).length} điểm đến của công ty × {selectedMultiGuideIds.length} HDV ={" "}
                    <strong>{allItineraryAttractions.filter(a => a.isMyAgencyAttraction).length * selectedMultiGuideIds.length} lượt check-in độc lập</strong>.
                  </p>
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

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setAssignAttractionsModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                onClick={handleSaveAttractionAssignment}
                className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold"
              >
                Xác nhận &amp; Lưu phân công
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: XEM ẢNH MINH CHỨNG CHECK-IN THỰC TẾ               */}
      {/* ======================================================== */}
      <Dialog open={previewProofModalOpen} onOpenChange={setPreviewProofModalOpen}>
        <DialogContent className="max-w-lg">
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

      {/* Provider Profile Modal (B2B contacts & Google Map) */}
      <ProviderProfileModal
        provider={selectedProvider}
        isOpen={providerModalOpen}
        onClose={() => {
          setProviderModalOpen(false);
          setSelectedProvider(null);
          setProviderServiceContext(undefined);
        }}
        serviceContext={providerServiceContext}
      />

      {/* ======================================================== */}
      {/* MODAL: ĐIỀU CHỈNH DỊCH VỤ TRỰC TIẾP (KHÁCH SẠN / ĂN UỐNG / ĐIỂM ĐẾN) */}
      {/* ======================================================== */}
      <Dialog open={serviceEditModalOpen} onOpenChange={setServiceEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              {serviceEditType === "hotel" ? (
                <>
                  <Building2 className="w-5 h-5 text-[#075985]" />
                  Cập nhật Khách sạn lưu trú
                </>
              ) : serviceEditType === "meal" ? (
                <>
                  <Utensils className="w-5 h-5 text-emerald-600" />
                  Cập nhật Bữa ăn &amp; Nhà hàng (Ngày {editTargetDay})
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 text-amber-600" />
                  Cập nhật Điểm tham quan (Ngày {editTargetDay})
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-[#F0F9FF]/70 rounded-xl border border-[#CBD5E1] text-blue-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-xs text-blue-950">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Cập nhật thông tin dịch vụ theo thỏa thuận với khách hàng
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Nhân viên công ty có thể trực tiếp đổi dịch vụ và điều chỉnh lại mức giá tour tại đây. Dữ liệu sẽ lập tức được đồng bộ trên hệ thống mà khách hàng không cần phải hủy booking.
              </p>
            </div>

            {/* Old / Current Service */}
            {editOldName && (
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-center justify-between">
                <span className="text-gray-500">Dịch vụ hiện tại:</span>
                <span className="font-semibold text-gray-800">{editOldName}</span>
              </div>
            )}

            {/* New Service Name Input */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">
                Tên {serviceEditType === "hotel" ? "Khách sạn mới" : serviceEditType === "meal" ? "Nhà hàng / Món ăn mới" : "Điểm tham quan mới"}: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editNewName}
                onChange={(e) => setEditNewName(e.target.value)}
                placeholder={serviceEditType === "hotel" ? "VD: Khách Sạn Colline Đà Lạt (4*)" : serviceEditType === "meal" ? "VD: Nhà hàng Cơm Niêu Như Ngọc Đà Lạt" : "VD: Vườn Hoa Thành Phố Đà Lạt"}
                className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs font-semibold focus:outline-hidden focus:border-blue-500 bg-white"
              />
            </div>

            {/* Address or Room Note (for hotel) */}
            {serviceEditType === "hotel" && (
              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">Địa chỉ / Ghi chú phòng (tùy chọn):</label>
                <input
                  type="text"
                  value={editAddressOrNote}
                  onChange={(e) => setEditAddressOrNote(e.target.value)}
                  placeholder="VD: 10 Phan Bội Châu, Phường 1, TP. Đà Lạt"
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-xs focus:outline-hidden focus:border-blue-500 bg-white"
                />
              </div>
            )}

            {/* Price Difference Adjustment */}
            <div className="space-y-1.5 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-amber-950 block">Điều chỉnh chênh lệch giá tour (VNĐ):</label>
                <span className="text-[11px] text-amber-800">
                  {parseInt(editPriceDiff) > 0 ? `Tăng +${formatVND(parseInt(editPriceDiff))}` : parseInt(editPriceDiff) < 0 ? `Giảm ${formatVND(parseInt(editPriceDiff))}` : "Không thay đổi giá (0đ)"}
                </span>
              </div>
              <input
                type="number"
                step={10000}
                value={editPriceDiff}
                onChange={(e) => setEditPriceDiff(e.target.value)}
                placeholder="0"
                className="w-full h-9 px-3 rounded-lg border border-amber-300 text-xs font-mono font-bold focus:outline-hidden focus:border-amber-500 bg-white"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => setEditPriceDiff("0")}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 cursor-pointer"
                >
                  0đ (Giữ nguyên)
                </button>
                <button
                  type="button"
                  onClick={() => setEditPriceDiff("50000")}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 cursor-pointer"
                >
                  +50.000đ
                </button>
                <button
                  type="button"
                  onClick={() => setEditPriceDiff("100000")}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 cursor-pointer"
                >
                  +100.000đ
                </button>
                <button
                  type="button"
                  onClick={() => setEditPriceDiff("-50000")}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 cursor-pointer"
                >
                  -50.000đ
                </button>
              </div>
            </div>

            {/* Reason for change */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">
                Lý do thay đổi &amp; Thỏa thuận với khách: <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="VD: Đã gọi điện trao đổi với khách, thống nhất chuyển sang KS Colline do đối tác Heritage hết phòng giai đoạn này."
                className="w-full p-2.5 rounded-lg border border-gray-300 text-xs focus:outline-hidden focus:border-blue-500 bg-white"
              />
              <p className="text-[10px] text-gray-500 italic">
                Lý do này sẽ được ghi vào nhật ký biến động tài chính của booking để kiểm toán và hiển thị minh bạch cho các bên.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setServiceEditModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleSaveServiceEdit}
                className="bg-[#075985] hover:bg-[#F97316] text-white font-bold cursor-pointer"
              >
                ✓ Lưu &amp; Cập nhật hệ thống
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
