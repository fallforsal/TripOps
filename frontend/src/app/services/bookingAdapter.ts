import type {
  Booking,
  Tour,
  PaymentRequest,
  User,
  IncidentReport,
} from "../types/index.ts";
import type { BookingDto } from "./wf05Bookings.ts";

function toList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(/\r?\n|•|-|\*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function toText(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === "string") return val.trim() || undefined;
  if (Array.isArray(val)) return val.join("\n").trim() || undefined;
  return String(val);
}

export function fromApiBooking(
  dto: BookingDto,
  tours: Tour[] = [],
  currentUser?: User | null,
): Booking {
  const matchedTour = tours.find((t) => String(t.id) === String(dto.tourId));

  // Determine active snapshot: agreed -> proposal -> initial_request
  const activeSnapshot =
    dto.agreedSnapshot || dto.latestProposal || dto.initialRequestSnapshot;
  const snap = activeSnapshot?.snapshotData;

  const tourName =
    snap?.tourName || dto.tourName || matchedTour?.name || "Tour Du Lịch";
  const tourCode =
    snap?.tourCode || matchedTour?.tourCode || `TRIP-${dto.tourId || "0"}`;

  const numDays =
    dto.snapshotDays?.length ||
    snap?.itinerary?.length ||
    Math.max(
      1,
      Math.round((Date.parse(dto.endDate) - Date.parse(dto.startDate)) / 86400000) + 1,
    );

  const fallbackTour: Tour = {
    id: String(dto.tourId || "0"),
    tourCode: tourCode,
    name: tourName,
    description: matchedTour?.description || "",
    destination: snap?.destination || matchedTour?.destination || "",
    duration: `${numDays} ngày`,
    image: matchedTour?.image || "",
    rating: matchedTour?.rating || 0,
    minGuests: snap?.minGuests ?? 1,
    price: snap?.basePrice ?? dto.totalAmount,
    maxGuests: snap?.maxGuests ?? dto.totalGuests,
    images: matchedTour?.images || [],
    status: "completed",
    companyId: dto.agencyId || matchedTour?.companyId || "",
    companyName: dto.agencyName || matchedTour?.companyName || "TripOps Partner",
    itinerary: [],
    inclusions: snap ? toList(snap.inclusions) : (matchedTour?.inclusions ?? []),
    exclusions: snap ? toList(snap.exclusions) : (matchedTour?.exclusions ?? []),
    highlights: matchedTour?.highlights || [],
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
  if (dto.depositAmount > 0) {
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
  if (remainingAmount > 0 && isDepositPaid) {
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

  const assignedLeadGuide = dto.assignedGuides?.[0];

  return {
    id: String(dto.id),
    bookingCode: dto.bookingCode,
    tourId: String(dto.tourId || "0"),
    agreedSnapshot: dto.agreedSnapshot,
    latestProposal: dto.latestProposal,
    initialRequestSnapshot: dto.initialRequestSnapshot,
    snapshotStatus: dto.snapshotStatus,
    effectiveSnapshotVersion: dto.effectiveSnapshotVersion,
    cancellationPolicy: snap?.cancellationPolicy,
    inclusions: toText(snap?.inclusions),
    exclusions: toText(snap?.exclusions),
    tour: {
      ...fallbackTour,
      // Strictly visual extras from catalog tour
      image: matchedTour?.image || "",
      images: matchedTour?.images || [],
      rating: matchedTour?.rating || 0,
      numberOfDays: numDays,
      itinerary: dto.snapshotDays?.length
        ? dto.snapshotDays.map((d) => ({
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
              address: "",
              time: l.time?.slice(11, 16),
              checkedIn: l.attendanceStatus === "CheckedIn",
            })),
            meals: d.meals.map((m) => ({
              id: String(m.id),
              type: m.mealType,
              serviceName: m.name,
              serviceId: m.serviceId ? String(m.serviceId) : undefined,
              time: m.time?.slice(11, 16),
            })),
          }))
        : snap?.itinerary?.length
          ? snap.itinerary.map((d, index) => ({
              id: `snap-day-${index + 1}`,
              day: d.dayNumber || index + 1,
              date: new Date(
                Date.parse(dto.startDate) + index * 86400000,
              )
                .toISOString()
                .slice(0, 10),
              title: d.title,
              description: d.description || "",
              locations: (d.locations || []).map((l, lIdx) => ({
                id: `snap-loc-${index + 1}-${lIdx}`,
                name: l.name,
                address: "",
                time: l.time,
                checkedIn: false,
              })),
              meals: (d.meals || []).map((m, mIdx) => ({
                id: `snap-meal-${index + 1}-${mIdx}`,
                type: m.mealType,
                serviceName: m.name,
                serviceId: m.serviceId ? String(m.serviceId) : undefined,
                time: m.time,
              })),
            }))
          : matchedTour?.itinerary || [],
      hotels: dto.snapshotHotels?.length
        ? (dto.snapshotHotels || []).map((h) => ({
            id: String(h.id),
            name: h.name,
            destination: h.destination,
            stars: h.stars || 3,
            nights: h.nights,
            pricePerNight: 0,
            serviceId: h.serviceId ? String(h.serviceId) : undefined,
          }))
        : snap?.hotels?.length
          ? snap.hotels.map((h, hIdx) => ({
              id: `snap-hotel-${hIdx}`,
              name: h.name,
              destination: h.destination,
              stars: h.stars || 3,
              nights: h.nights,
              pricePerNight: 0,
              serviceId: h.serviceId ? String(h.serviceId) : undefined,
            }))
          : matchedTour?.hotels || [],
    },
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
      role: ag.role === "Lead" ? "lead_guide" : "support_guide",
      assignedAt: ag.assignedAt || dto.updatedAt || dto.createdAt,
      notes: ag.notes,
    })),
    depositAmount: dto.depositAmount,
    depositPaid: isDepositPaid,
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
