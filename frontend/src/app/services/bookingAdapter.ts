import type { Booking, Tour, PaymentRequest, User, IncidentReport } from "../types/index.ts";
import type { BookingDto } from "./wf05Bookings.ts";

export function fromApiBooking(dto: BookingDto, tours: Tour[] = [], currentUser?: User): Booking {
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

  const isDepositPaid = dto.paidAmount >= dto.depositAmount && dto.depositAmount > 0;
  const isFullyPaid = dto.paidAmount >= dto.totalAmount && dto.totalAmount > 0;
  const remainingAmount = Math.max(0, dto.totalAmount - dto.paidAmount);

  const paymentRequests: PaymentRequest[] = [];
  if (dto.depositAmount > 0) {
    paymentRequests.push({
      id: `pr-deposit-${dto.id}`,
      bookingId: String(dto.id),
      amount: isDepositPaid ? dto.depositAmount : Math.max(0, dto.depositAmount - dto.paidAmount),
      description: `Đặt cọc 30% chuyến đi (${dto.bookingCode})`,
      dueDate: dto.startDate ? dto.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
      status: isDepositPaid ? "paid" : "pending",
      paidAt: isDepositPaid ? (dto.updatedAt || dto.createdAt).split("T")[0] : undefined,
      createdAt: dto.createdAt.split("T")[0],
    });
  }
  if (remainingAmount > 0 && isDepositPaid) {
    paymentRequests.push({
      id: `pr-remaining-${dto.id}`,
      bookingId: String(dto.id),
      amount: remainingAmount,
      description: `Thanh toán số tiền còn lại (${dto.bookingCode})`,
      dueDate: dto.endDate.split("T")[0],
      status: isFullyPaid ? "paid" : "pending",
      paidAt: isFullyPaid ? (dto.updatedAt || dto.createdAt).split("T")[0] : undefined,
      createdAt: dto.createdAt.split("T")[0],
    });
  }

  const assignedLeadGuide = dto.assignedGuides?.[0];

  return {
    id: String(dto.id),
    bookingCode: dto.bookingCode,
    tourId: String(dto.tourId || "0"),
    tour: matchedTour || fallbackTour,
    userId: dto.customerId || currentUser?.id || "",
    userName: dto.customerName || currentUser?.name || "",
    userEmail: dto.contactEmail || currentUser?.email || "",
    contactName: dto.contactName || dto.customerName,
    contactPhone: dto.contactPhone,
    contactEmail: dto.contactEmail,
    bookingNotes: dto.specialRequests,
    numberOfGuests: dto.totalGuests,
    totalPrice: dto.totalAmount,
    status: normalizedStatus,
    bookingDate: dto.createdAt ? dto.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
    tourStartDate: dto.startDate ? dto.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
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
      companyId: dto.agencyId || "",
      companyName: dto.agencyName || "",
      role: ag.role === "Lead" ? "lead_guide" : "support_guide",
      assignedAt: dto.updatedAt || dto.createdAt,
      notes: ag.notes,
    })),
    depositAmount: dto.depositAmount,
    depositPaid: isDepositPaid,
    remainingAmount: remainingAmount,
    paidAmount: dto.paidAmount,
    tourEndDate: dto.endDate.split("T")[0],
    paymentStatus: dto.paymentStatus === "Refunded" ? "refunded" : isFullyPaid ? "paid" : dto.paidAmount > 0 ? "partially_paid" : "unpaid",
    paymentRequests: paymentRequests,
    guideIncidents: (dto.incidents || []).map(i => ({
      id: String(i.id), bookingId: String(dto.id), tourId: String(dto.tourId || ""),
      tourName: dto.tourName || "", guideId: currentUser?.role === "guide" ? currentUser.id : "",
      guideName: currentUser?.role === "guide" ? currentUser.name : "",
      title: i.title, description: i.description,
      category: (["vehicle", "weather", "medical", "schedule", "service", "other", "transport", "service_provider"].find(c => i.title.startsWith(`[${c}]`)) || "other") as IncidentReport["category"],
      severity: ["low", "medium", "high", "critical"].includes(i.resolutionNotes?.toLowerCase() || "")
        ? i.resolutionNotes!.toLowerCase() as IncidentReport["severity"] : "medium",
      status: i.status === "Resolved" ? "resolved" : i.status === "Acknowledged" ? "acknowledged" : "reported",
      reportedAt: i.createdAt,
    })),
    passengers: (dto.participants || []).map((p, index) => ({
      id: String(p.id || `p-${index}`),
      fullName: p.fullName,
      phone: p.phoneNumber,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
      gender: (p.gender === "Nữ" ? "female" : "male") as "male" | "female",
      ageGroup: "adult" as const,
      price: dto.totalAmount / (dto.totalGuests || 1),
      idNumber: p.identityNumber,
      attendanceStatus: p.attendanceStatus === "CheckedIn" ? "CHECKED_IN" : p.attendanceStatus === "Absent" ? "ABSENT" : "PENDING",
      departureAttendance: p.attendanceStatus === "CheckedIn" ? "present" : p.attendanceStatus === "Absent" ? "absent" : undefined,
      status: p.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    })),
  };
}

