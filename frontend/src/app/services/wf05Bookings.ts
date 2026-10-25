import { http } from "@/app/lib/http";
import type { Booking, Tour, PaymentRequest } from "@/app/types";

export interface ParticipantInput {
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  identityNumber?: string;
  pricingTierId?: number;
}

export interface CreateBookingRequest {
  tourId: number;
  startDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  specialRequests?: string;
  participants: ParticipantInput[];
}

export interface ParticipantDto {
  id: number;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  identityNumber?: string;
  attendanceStatus: string;
  status: string;
  assignedGuideName?: string;
}

export interface AssignedGuideDto {
  id: number;
  guideId: string;
  guideName: string;
  guidePhone?: string;
  role?: string;
  status: string;
  notes?: string;
}

export interface BookingDto {
  id: number;
  bookingCode: string;
  customerId: string;
  customerName: string;
  tourId?: number;
  tourName?: string;
  agencyId?: string;
  agencyName?: string;
  startDate: string;
  endDate: string;
  totalGuests: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  status: "Pending" | "Deposited" | "Confirmed" | "Paid" | "InProgress" | "Completed" | "Cancelled" | "Rejected";
  paymentStatus: "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded";
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  participants: ParticipantDto[];
  assignedGuides: AssignedGuideDto[];
  createdAt: string;
  updatedAt?: string;
}

export interface BookingListItem {
  id: number;
  bookingCode: string;
  tourName?: string;
  customerName?: string;
  contactPhone?: string;
  startDate: string;
  totalGuests: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface BookingPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IncidentDto {
  id: number;
  bookingId: number;
  title: string;
  description: string;
  resolutionNotes?: string;
  status: string;
  createdAt: string;
}

// 1. Customer APIs (WF05)
export async function createBooking(request: CreateBookingRequest): Promise<BookingDto> {
  return await http<BookingDto>("/bookings", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getCustomerBookings(status?: string, page = 1, pageSize = 20): Promise<BookingPage<BookingListItem>> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return await http<BookingPage<BookingListItem>>(`/bookings?${params.toString()}`);
}

export async function getBookingDetail(id: number): Promise<BookingDto> {
  return await http<BookingDto>(`/bookings/${id}`);
}

export async function depositBooking(id: number, amount: number, transactionReference?: string, paymentProofUrl?: string): Promise<BookingDto> {
  return await http<BookingDto>(`/bookings/${id}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount, transactionReference, paymentProofUrl }),
  });
}

export async function cancelBooking(id: number, reason: string): Promise<BookingDto> {
  return await http<BookingDto>(`/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// 2. Agency APIs (WF05 & WF06)
export async function getAgencyBookings(status?: string, search?: string, page = 1, pageSize = 20): Promise<BookingPage<BookingListItem>> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return await http<BookingPage<BookingListItem>>(`/agency/bookings?${params.toString()}`);
}

export async function getAgencyBookingDetail(id: number): Promise<BookingDto> {
  return await http<BookingDto>(`/agency/bookings/${id}`);
}

export async function decideBooking(id: number, decision: "approve" | "reject", reason?: string): Promise<BookingDto> {
  return await http<BookingDto>(`/agency/bookings/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  });
}

export async function assignGuide(id: number, guideId: string, role?: string, notes?: string): Promise<BookingDto> {
  return await http<BookingDto>(`/agency/bookings/${id}/guide-assignments`, {
    method: "POST",
    body: JSON.stringify({ guideId, role, notes }),
  });
}

// 3. Guide APIs (WF06)
export async function getGuideBookings(page = 1, pageSize = 20): Promise<BookingPage<BookingListItem>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return await http<BookingPage<BookingListItem>>(`/guide/bookings?${params.toString()}`);
}

export async function getGuideBookingDetail(id: number): Promise<BookingDto> {
  return await http<BookingDto>(`/guide/bookings/${id}`);
}

export async function recordAttendance(bookingId: number, participantId: number, status: "CheckedIn" | "Absent" | "Pending"): Promise<ParticipantDto> {
  return await http<ParticipantDto>(`/guide/bookings/${bookingId}/attendance`, {
    method: "POST",
    body: JSON.stringify({ participantId, status }),
  });
}

export async function reportIncident(bookingId: number, incidentType: string, title: string, description: string, severity?: string): Promise<IncidentDto> {
  return await http<IncidentDto>(`/guide/bookings/${bookingId}/incidents`, {
    method: "POST",
    body: JSON.stringify({ incidentType, title, description, severity }),
  });
}

export function fromApiBooking(dto: BookingDto, tours: Tour[] = [], currentUser?: any): Booking {
  const matchedTour = tours.find((t) => String(t.id) === String(dto.tourId));
  const fallbackTour: Tour = {
    id: String(dto.tourId || "0"),
    tourCode: `TRIP-${dto.tourId || "0"}`,
    name: dto.tourName || "Tour Du Lịch",
    description: "",
    destination: "Việt Nam",
    duration: "3N2Đ",
    price: dto.totalAmount,
    maxGuests: dto.totalGuests || 10,
    images: ["https://images.unsplash.com/photo-1528127269322-539801943592?w=800"],
    status: "active",
    companyId: dto.agencyId || "",
    companyName: dto.agencyName || "TripOps Partner",
    itinerary: [],
    inclusions: [],
    exclusions: [],
    highlights: [],
    pricingTiers: [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt || dto.createdAt,
  };

  const statusMap: Record<string, "pending" | "deposited" | "confirmed" | "paid" | "completed" | "cancelled" | "rejected"> = {
    pending: "pending",
    deposited: "deposited",
    confirmed: "confirmed",
    paid: "paid",
    inprogress: "confirmed",
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
      amount: dto.depositAmount,
      description: `Đặt cọc 30% chuyến đi (${dto.bookingCode})`,
      dueDate: dto.startDate ? dto.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
      status: isDepositPaid ? "paid" : "pending",
      paidAt: isDepositPaid ? (dto.updatedAt || dto.createdAt).split("T")[0] : undefined,
      createdAt: dto.createdAt.split("T")[0],
    });
  }
  if (remainingAmount > 0) {
    paymentRequests.push({
      id: `pr-remaining-${dto.id}`,
      bookingId: String(dto.id),
      amount: remainingAmount,
      description: `Thanh toán số tiền còn lại (${dto.bookingCode})`,
      dueDate: dto.startDate ? dto.startDate.split("T")[0] : new Date().toISOString().split("T")[0],
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
    paymentStatus: isFullyPaid ? "paid" : isDepositPaid ? "paid" : "unpaid",
    paymentRequests: paymentRequests,
    passengers: (dto.participants || []).map((p, index) => ({
      id: String(p.id || `p-${index}`),
      fullName: p.fullName,
      phone: p.phoneNumber,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "2000-01-01",
      gender: (p.gender === "Nữ" ? "female" : "male") as "male" | "female",
      ageGroup: "adult" as const,
      price: dto.totalAmount / (dto.totalGuests || 1),
      idNumber: p.identityNumber,
    })),
  };
}

