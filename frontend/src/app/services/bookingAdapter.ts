import type {
  Booking,
  Tour,
  PaymentRequest,
  PaymentTransactionView,
  User,
  IncidentReport,
  RefundRequest,
  RefundReasonType,
} from "../types/index.ts";
import type { AdminRefundDto, BookingDto } from "./wf05Bookings.ts";

/** Yêu cầu hủy/hoàn tiền từ máy chủ → dạng dùng ở màn hình Admin. Số tiền lấy nguyên từ máy chủ. */
export function fromAdminRefund(d: AdminRefundDto): RefundRequest {
  const status: RefundRequest["status"] =
    d.status === "Completed" ? "COMPLETED"
      : d.status === "Rejected" ? "REJECTED"
        : d.status === "Reviewing" ? "REVIEWING"
          : d.status === "Approved" ? "APPROVED"
            : "PENDING";
  const refund = d.approvedRefundAmount ?? d.suggestedRefund;
  return {
    id: String(d.id),
    bookingId: String(d.bookingId),
    bookingCode: d.bookingCode,
    tourName: d.tourName || "",
    tourStartDate: d.startDate ? d.startDate.slice(0, 10) : undefined,
    requestedBy: d.requestedByRole,
    requestedByRole: d.requestedByRole,
    customerName: d.customerName,
    customerEmail: d.customerEmail || "",
    customerPhone: d.customerPhone || undefined,
    agencyName: d.agencyName || undefined,
    reason: d.reason as RefundReasonType,
    reasonDetail: d.reasonDetail,
    originalPaidAmount: d.paidAmount,
    approvedRefundAmount: refund,
    suggestedRefundAmount: d.suggestedRefund,
    refundFee: Math.min(d.fee, d.paidAmount),
    feePercent: d.feePercent,
    totalAmount: d.totalAmount,
    refundPercentage: d.paidAmount > 0 ? Math.round((refund * 100) / d.paidAmount) : 0,
    refundBankName: d.bankName || "",
    refundAccountNumber: d.accountNumber || "",
    refundAccountHolder: d.accountHolder || "",
    status,
    reviewNote: d.adminNote || undefined,
    rejectionReason: d.rejectionReason || undefined,
    bankTransactionCode: d.refundTransactionCode || undefined,
    createdAt: d.createdAt,
    reviewedAt: d.reviewedAt || undefined,
    completedAt: d.completedAt || undefined,
    bankBin: d.bankBin || undefined,
    payoutState: d.payoutState || undefined,
    lastPayoutError: d.lastPayoutError || undefined,
  };
}

function guideRole(role?: string): "lead_guide" | "support_guide" | "stage_guide" | "logistics" {
  switch (role?.toLowerCase()) {
    case "lead": case "lead_guide": return "lead_guide";
    case "stage": case "stage_guide": return "stage_guide";
    case "logistics": return "logistics";
    default: return "support_guide";
  }
}

export function fromApiBooking(
  dto: BookingDto,
  tours: Tour[] = [],
  currentUser?: User | null,
): Booking {
  const matchedTour = tours.find((t) => String(t.id) === String(dto.tourId));
  const fallbackTour: Tour = {
    id: String(dto.tourId || "0"),
    tourCode: `TRIP-${dto.tourId || "0"}`,
    name: dto.tourName || "Tour Du Lịch",
    description: "",
    destination: "",
    duration: `${Math.max(1, Math.round((Date.parse(dto.endDate) - Date.parse(dto.startDate)) / 86400000) + 1)} ngày`,
    image: "",
    rating: 0,
    minGuests: 1,
    price: dto.totalAmount,
    maxGuests: dto.totalGuests || 10,
    images: [],
    status: "completed",
    companyId: dto.agencyId || "",
    companyName: dto.agencyName || "TripOps Partner",
    itinerary: [],
    inclusions: [],
    exclusions: [],
    highlights: [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt || dto.createdAt,
  };

  const statusMap: Record<string, Booking["status"]> = {
    pending: "pending",
    deposited: "deposited",
    confirmed: "confirmed",
    paid: "paid",
    inprogress: "in_progress",
    completed: "completed",
    cancelled: "cancelled",
    rejected: "rejected",
  };
  const normalizedStatus = statusMap[dto.status.toLowerCase()] || "pending";

  const isDepositPaid =
    dto.paidAmount >= dto.depositAmount && dto.depositAmount > 0;
  const isFullyPaid = dto.paidAmount >= dto.totalAmount && dto.totalAmount > 0;
  const remainingAmount = Math.max(0, dto.totalAmount - dto.paidAmount);

  const paymentRequests: PaymentRequest[] = [];
  if (dto.paymentSchedule) {
    // Lịch thanh toán thật của máy chủ (đơn chờ duyệt: chưa có đợt nào).
    for (const item of dto.paymentSchedule) {
      const status: PaymentRequest["status"] =
        item.status === "Paid"
          ? "paid"
          : item.status === "Overdue"
            ? "overdue"
            : item.status === "Scheduled"
              ? "scheduled"
              : item.status === "NotIssued"
                ? "not_issued"
                : "pending";
      paymentRequests.push({
        id: item.id ? String(item.id) : `pr-${item.stage}-${dto.id}`,
        bookingId: String(dto.id),
        stage: item.stage,
        amount: status === "paid" ? item.amount : item.outstanding,
        totalAmount: item.amount,
        description: item.description,
        dueDate: item.dueDate ? item.dueDate.slice(0, 10) : "",
        dueAt: item.dueAt || undefined,
        warning: item.warning || undefined,
        status,
        paidAt: item.paidAt ? item.paidAt.slice(0, 10) : undefined,
        createdAt: dto.createdAt.split("T")[0],
      });
    }
  } else if (dto.depositAmount > 0) {
    paymentRequests.push({
      id: `pr-deposit-${dto.id}`,
      bookingId: String(dto.id),
      amount: isDepositPaid
        ? dto.depositAmount
        : Math.max(0, dto.depositAmount - dto.paidAmount),
      description: `Đặt cọc 30% chuyến đi (${dto.bookingCode})`,
      dueDate: dto.startDate
        ? dto.startDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
      status: isDepositPaid ? "paid" : "pending",
      paidAt: isDepositPaid
        ? (dto.updatedAt || dto.createdAt).split("T")[0]
        : undefined,
      createdAt: dto.createdAt.split("T")[0],
    });
  }
  if (!dto.paymentSchedule && remainingAmount > 0 && isDepositPaid) {
    paymentRequests.push({
      id: `pr-remaining-${dto.id}`,
      bookingId: String(dto.id),
      amount: remainingAmount,
      description: `Thanh toán số tiền còn lại (${dto.bookingCode})`,
      dueDate: dto.endDate.split("T")[0],
      status: isFullyPaid ? "paid" : "pending",
      paidAt: isFullyPaid
        ? (dto.updatedAt || dto.createdAt).split("T")[0]
        : undefined,
      createdAt: dto.createdAt.split("T")[0],
    });
  }

  const scheduledDeposit = dto.paymentSchedule?.find((p) => p.stage === "deposit" || p.stage === "full");
  const depositPaid = scheduledDeposit
    ? scheduledDeposit.status === "Paid"
    : isDepositPaid;
  const paymentTransactions: PaymentTransactionView[] = (
    dto.paymentTransactions || []
  ).map((t) => ({
    id: String(t.id),
    code: t.transactionCode,
    method: t.paymentMethod,
    amount: t.amount,
    status: t.status.toLowerCase() as PaymentTransactionView["status"],
    paidAt: t.paidAt || undefined,
    createdAt: t.createdAt || undefined,
    gatewayTransactionNo: t.gatewayTransactionNo || undefined,
    expiresAt: t.expiresAt || undefined,
    reviewNote: t.reviewNote || undefined,
  }));

  const assignedLeadGuide = dto.assignedGuides?.find(g => guideRole(g.role) === "lead_guide") || dto.assignedGuides?.[0];

  return {
    id: String(dto.id),
    bookingCode: dto.bookingCode,
    tourId: String(dto.tourId || "0"),
    tour: dto.snapshotDays?.length
      ? {
          ...(matchedTour || fallbackTour),
          numberOfDays: dto.snapshotDays.length,
          itinerary: dto.snapshotDays.map((d) => ({
            id: String(d.id),
            day: d.dayNumber,
            date: new Date(
              Date.parse(dto.startDate) + (d.dayNumber - 1) * 86400000,
            )
              .toISOString()
              .slice(0, 10),
            title: d.title,
            description: d.description || "",
            locations: d.locations.map((l) => ({
              id: String(l.id),
              name: l.name,
              originalName: l.originalName,
              changeReason: l.changeReason,
              address: "",
              time: l.time?.slice(11, 16),
              checkedIn: l.attendanceStatus === "CheckedIn",
            })),
            meals: d.meals.map((m) => ({
              id: String(m.id),
              type: m.mealType,
              serviceName: m.name,
              originalName: m.originalName,
              serviceId: m.serviceId ? String(m.serviceId) : undefined,
              supplierSource: m.serviceId ? "PLATFORM_PARTNER" : "AGENCY_SUPPLIER",
              supplier: m.supplier,
              address: m.supplier?.address,
              time: m.time?.slice(11, 16),
            })),
          })),
          hotels: (dto.snapshotHotels || []).map((h) => ({
            id: String(h.id),
            name: h.name,
            originalName: h.originalName,
            destination: h.destination,
            stars: h.stars || 3,
            nights: h.nights,
            pricePerNight: 0,
            serviceId: h.serviceId ? String(h.serviceId) : undefined,
            supplierSource: h.serviceId ? "PLATFORM_PARTNER" : "AGENCY_SUPPLIER",
            supplier: h.supplier,
            address: h.supplier?.address,
          })),
        }
      : matchedTour || fallbackTour,
    userId: dto.customerId || currentUser?.id || "",
    userName: dto.customerName || currentUser?.name || "",
    userEmail: dto.contactEmail || currentUser?.email || "",
    contactName: dto.contactName || dto.customerName,
    contactPhone: dto.contactPhone,
    contactEmail: dto.contactEmail,
    bookingNotes: dto.specialRequests,
    numberOfGuests: dto.totalGuests,
    totalPrice: dto.totalAmount,
    baseTourPrice: dto.baseTourAmount ?? dto.totalAmount,
    surchargeAmount: dto.surchargeAmount ?? 0,
    hasBeenApproved: dto.hasBeenApproved ?? !!dto.contract,
    originalTotalPrice: dto.originalTotalPrice,
    priceAdjustments: (dto.priceAdjustments || []).map(a => ({ ...a, id: String(a.id), bookingId: String(dto.id), createdAt: a.createdAt || dto.updatedAt || dto.createdAt })),
    status: normalizedStatus,
    bookingDate: dto.createdAt
      ? dto.createdAt.split("T")[0]
      : new Date().toISOString().split("T")[0],
    tourStartDate: dto.startDate
      ? dto.startDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
    companyId: dto.agencyId,
    companyName: dto.agencyName,
    guideId: assignedLeadGuide?.guideId,
    guideName: assignedLeadGuide?.guideName,
    guidePhone: assignedLeadGuide?.guidePhone,
    assignedGuides: (dto.assignedGuides || []).map((ag) => ({
      id: String(ag.id),
      guideId: ag.guideId,
      guideName: ag.guideName,
      guidePhone: ag.guidePhone,
      companyId: ag.agencyId || dto.agencyId || "",
      companyName: dto.agencyName || "",
      role: guideRole(ag.role),
      assignedAt: ag.assignedAt || dto.updatedAt || dto.createdAt,
      notes: ag.notes,
    })),
    depositAmount: dto.depositAmount,
    depositPaid,
    remainingAmount: remainingAmount,
    paidAmount: dto.paidAmount,
    tourEndDate: dto.endDate.split("T")[0],
    paymentStatus:
      dto.paymentStatus === "Refunded"
        ? "refunded"
        : isFullyPaid
          ? "paid"
          : dto.paidAmount > 0
            ? "partially_paid"
            : "unpaid",
    paymentRequests: paymentRequests,
    paymentTransactions,
    cancellation: dto.cancellation ?? undefined,
    travelContract: dto.contract ?? undefined,
    guideIncidents: (dto.incidents || []).map((i) => ({
      id: String(i.id),
      bookingId: String(dto.id),
      tourId: String(dto.tourId || ""),
      tourName: dto.tourName || "",
      guideId: currentUser?.role === "guide" ? currentUser.id : "",
      guideName: currentUser?.role === "guide" ? currentUser.name : "",
      title: i.title,
      description: i.description,
      category: ([
        "vehicle",
        "weather",
        "medical",
        "schedule",
        "service",
        "other",
        "transport",
        "service_provider",
      ].find((c) => i.title.startsWith(`[${c}]`)) ||
        "other") as IncidentReport["category"],
      severity: ["low", "medium", "high", "critical"].includes(
        i.resolutionNotes?.toLowerCase() || "",
      )
        ? (i.resolutionNotes!.toLowerCase() as IncidentReport["severity"])
        : "medium",
      status:
        i.status === "Resolved"
          ? "resolved"
          : i.status === "Acknowledged"
            ? "acknowledged"
            : "reported",
      reportedAt: i.createdAt,
    })),
    passengers: (dto.participants || []).map((p, index) => ({
      id: String(p.id || `p-${index}`),
      fullName: p.fullName,
      phone: p.phoneNumber,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
      gender: (p.gender === "Nữ" ? "female" : "male") as "male" | "female",
      ageGroup: (/em b[eé]|infant/i.test(p.tierName || "")
        ? "child_under_2"
        : /tr[eẻ]|child/i.test(p.tierName || "")
          ? "child_2_11"
          : "adult") as "adult" | "child_2_11" | "child_under_2",
      price: p.price ?? dto.totalAmount / (dto.totalGuests || 1),
      idNumber: p.identityNumber,
      roommateNote: p.roommateNote,
      dietaryNote: p.restaurantNote,
      notes: p.note,
      participantIndex: p.participantIndex,
      agencyId: p.agencyId,
      isPrimary: p.isPrimary,
      tierName: p.tierName,
      checkedBy: p.checkedBy,
      checkedAt: p.checkedAt,
      assignedGuideId: p.assignedGuideId,
      attendanceStatus:
        p.attendanceStatus === "CheckedIn"
          ? "CHECKED_IN"
          : p.attendanceStatus === "Absent"
            ? "ABSENT"
            : "PENDING",
      departureAttendance:
        p.attendanceStatus === "CheckedIn"
          ? "present"
          : p.attendanceStatus === "Absent"
            ? "absent"
            : undefined,
      status: p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })),
  };
}
