import { http } from "@/app/lib/http";
import type { PaymentOutcome } from "./payos";

export interface ParticipantInput {
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  identityNumber?: string;
  pricingTierId?: number;
  note?: string;
  roommateNote?: string;
  restaurantNote?: string;
}

export interface CreateBookingRequest {
  tourId: number;
  startDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  specialRequests?: string;
  participants: ParticipantInput[];
  hotelChoices?: { destination: string; name: string; serviceId?: number }[];
  mealChoices?: {
    dayNumber: number;
    mealType: string;
    name: string;
    serviceId?: number;
  }[];
}

export interface ParticipantDto {
  checkedBy?: string;
  checkedAt?: string;
  assignedGuideId?: string;
  id: number;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  identityNumber?: string;
  attendanceStatus: string;
  status: string;
  assignedGuideName?: string;
  price?: number;
  tierName?: string;
  agencyId?: string;
  participantIndex?: number;
  isPrimary?: boolean;
  note?: string;
  roommateNote?: string;
  restaurantNote?: string;
}

export interface AssignedGuideDto {
  id: number;
  guideId: string;
  guideName: string;
  guidePhone?: string;
  role?: string;
  status: string;
  notes?: string;
  assignedAt?: string;
  agencyId?: string;
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
  status:
    | "Pending"
    | "Deposited"
    | "Confirmed"
    | "Paid"
    | "InProgress"
    | "Completed"
    | "Cancelled"
    | "Rejected";
  paymentStatus: "Unpaid" | "PartiallyPaid" | "Paid" | "Refunded";
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  specialRequests?: string;
  participants: ParticipantDto[];
  assignedGuides: AssignedGuideDto[];
  createdAt: string;
  updatedAt?: string;
  incidents?: IncidentDto[];
  snapshotDays?: {
    id: number;
    dayNumber: number;
    title: string;
    description?: string;
    locations: {
      id: number;
      name: string;
      time?: string;
      attendanceStatus?: string;
    }[];
    meals: {
      id: number;
      mealType: "breakfast" | "lunch" | "dinner";
      name: string;
      time?: string;
      serviceId?: number;
      priceDifference: number;
    }[];
  }[];
  snapshotHotels?: {
    id: number;
    destination: string;
    name: string;
    stars?: number;
    nights?: number;
    serviceId?: number;
    priceDifference: number;
  }[];
  /** Lịch thanh toán thật từ máy chủ (rỗng khi đơn còn chờ duyệt). */
  paymentSchedule?: PaymentScheduleItemDto[];
  paymentTransactions?: PaymentTransactionDto[];
}

export interface PaymentScheduleItemDto {
  id?: number | null;
  stage: "deposit" | "balance";
  description: string;
  amount: number;
  outstanding: number;
  dueDate?: string | null;
  /** Hạn chính xác (UTC) do backend tính; hiển thị theo giờ Việt Nam. */
  dueAt?: string | null;
  status: "Pending" | "Overdue" | "Paid" | "Scheduled" | "NotIssued";
  paidAt?: string | null;
  /** Hạn cọc rơi sau thời điểm khởi hành (chờ chốt quy tắc). */
  dueAfterDeparture?: boolean;
}

export interface PaymentTransactionDto {
  id: number;
  paymentRequestId?: number | null;
  transactionCode: string;
  paymentMethod: string;
  amount: number;
  status: "Pending" | "Success" | "Failed" | "Cancelled" | "Expired" | "NeedsReview" | "Refunded";
  paidAt?: string | null;
  createdAt?: string | null;
  gatewayTransactionNo?: string | null;
  expiresAt?: string | null;
  reviewNote?: string | null;
}

export interface PayOsCheckoutDto {
  checkoutUrl: string;
  transactionCode: string;
  amount: number;
  expiresAt: string;
  reused: boolean;
}

export interface PaymentSyncResultDto {
  outcome: PaymentOutcome;
  message: string;
  booking: BookingDto;
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
export async function createBooking(
  request: CreateBookingRequest,
): Promise<BookingDto> {
  return await http<BookingDto>("/bookings", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getCustomerBookings(
  status?: string,
  page = 1,
  pageSize = 20,
): Promise<BookingPage<BookingListItem>> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return await http<BookingPage<BookingListItem>>(
    `/bookings?${params.toString()}`,
  );
}

export async function getBookingDetail(id: number): Promise<BookingDto> {
  return await http<BookingDto>(`/bookings/${id}`);
}

export async function depositBooking(
  id: number,
  amount: number,
  transactionReference?: string,
  paymentProofUrl?: string,
): Promise<BookingDto> {
  return await http<BookingDto>(`/bookings/${id}/deposit`, {
    method: "POST",
    body: JSON.stringify({ amount, transactionReference, paymentProofUrl }),
  });
}

/** Tạo (hoặc dùng lại) link payOS cho phần cọc còn thiếu. Số tiền do backend tính. */
export async function startPayOsPayment(id: number): Promise<PayOsCheckoutDto> {
  return await http<PayOsCheckoutDto>(`/bookings/${id}/payments/payos`, {
    method: "POST",
  });
}

/** Yêu cầu backend tra cứu payOS và cập nhật kết quả đã xác minh. */
export async function syncPayOsPayment(id: number): Promise<PaymentSyncResultDto> {
  return await http<PaymentSyncResultDto>(`/bookings/${id}/payments/payos/sync`, {
    method: "POST",
  });
}

export { isPayOsUrl } from "./payos";

export async function cancelBooking(
  id: number,
  reason: string,
): Promise<BookingDto> {
  return await http<BookingDto>(`/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// 2. Agency APIs (WF05 & WF06)
export async function getAgencyBookings(
  status?: string,
  search?: string,
  page = 1,
  pageSize = 20,
): Promise<BookingPage<BookingListItem>> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return await http<BookingPage<BookingListItem>>(
    `/agency/bookings?${params.toString()}`,
  );
}

export async function getAgencyBookingDetail(id: number): Promise<BookingDto> {
  return await http<BookingDto>(`/agency/bookings/${id}`);
}

export const getAvailableGuides = () =>
  http<Array<{ id: string; name: string; phone?: string }>>(
    "/agency/bookings/available-guides",
  );

export async function getAllBookingDetails(
  role: "user" | "agency" | "guide",
): Promise<BookingDto[]> {
  const summaries: BookingListItem[] = [];
  for (let page = 1; ; page++) {
    const batch =
      role === "user"
        ? await getCustomerBookings(undefined, page, 100)
        : role === "agency"
          ? await getAgencyBookings(undefined, undefined, page, 100)
          : await getGuideBookings(page, 100);
    summaries.push(...batch.items);
    if (!batch.items.length || summaries.length >= batch.total) break;
  }
  // A failed detail request is surfaced, never presented as an empty/missing booking.
  return Promise.all(
    summaries.map((item) =>
      role === "user"
        ? getBookingDetail(item.id)
        : role === "agency"
          ? getAgencyBookingDetail(item.id)
          : getGuideBookingDetail(item.id),
    ),
  );
}

export async function decideBooking(
  id: number,
  decision: "approve" | "reject",
  reason?: string,
): Promise<BookingDto> {
  return await http<BookingDto>(`/agency/bookings/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  });
}

export async function assignGuide(
  id: number,
  guideId: string,
  role?: string,
  notes?: string,
): Promise<BookingDto> {
  return await http<BookingDto>(`/agency/bookings/${id}/guide-assignments`, {
    method: "POST",
    body: JSON.stringify({ guideId, role, notes }),
  });
}

// 3. Guide APIs (WF06)
export async function getGuideBookings(
  page = 1,
  pageSize = 20,
): Promise<BookingPage<BookingListItem>> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return await http<BookingPage<BookingListItem>>(
    `/guide/bookings?${params.toString()}`,
  );
}

export async function getGuideBookingDetail(id: number): Promise<BookingDto> {
  return await http<BookingDto>(`/guide/bookings/${id}`);
}

export async function recordAttendance(
  bookingId: number,
  participantId: number,
  status: "CheckedIn" | "Absent" | "Pending",
): Promise<ParticipantDto> {
  return await http<ParticipantDto>(`/guide/bookings/${bookingId}/attendance`, {
    method: "POST",
    body: JSON.stringify({ participantId, status }),
  });
}

export async function reportIncident(
  bookingId: number,
  incidentType: string,
  title: string,
  description: string,
  severity?: string,
): Promise<IncidentDto> {
  return await http<IncidentDto>(`/guide/bookings/${bookingId}/incidents`, {
    method: "POST",
    body: JSON.stringify({ incidentType, title, description, severity }),
  });
}

export { fromApiBooking } from "./bookingAdapter";
