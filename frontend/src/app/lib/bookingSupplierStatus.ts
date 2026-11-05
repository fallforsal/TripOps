export type QuotationCostLine = { slotKey: string; source: string; name: string; quantity: number; unit: string;
  referenceUnitCost: number; unitCost: number; total: number; confirmed?: boolean };
export type BookingQuotation = { id: number; bookingId: number; version: number; tourId: number; status: string;
  estimatedSale: number; totalCost: number | null; agencyProfit: number | null;
  saleTotal: number; costs: QuotationCostLine[] | null; reason: string; createdAt: string;
  requiresCustomerAcceptance?: boolean };
export type BookingSupplierRequest = { id: number; bookingId: number; serviceId: number; slotKey: string;
  serviceName: string; status: string; estimatedCost: number; quotedCost: number | null; note: string | null;
  serviceDateFrom?: string | null; serviceDateTo?: string | null; quantity?: number; unit?: string;
  respondedAt?: string | null; providerId?: string | null; providerName?: string | null;
  providerPhone?: string | null; fullAddress?: string | null };
export type BookingQuotationState = { bookingId: string; loading: boolean; error?: string;
  quotes: BookingQuotation[]; requests: BookingSupplierRequest[] };
export type BookingServiceSlot = { kind: "hotel" | "meal"; itemId?: string; serviceId?: string };

// SQL datetime2 responses represent UTC but may be serialized without a zone.
export function providerResponseInstant(value: string) {
  return /(?:z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
}

export function findBookingSupplierRequest(requests: BookingSupplierRequest[], slot: BookingServiceSlot) {
  if (!slot.itemId || !slot.serviceId) return undefined;
  return requests.filter((r) => r.status !== "Superseded" && r.slotKey === `${slot.kind}:${slot.itemId}`
    && String(r.serviceId) === slot.serviceId).sort((a, b) => b.id - a.id)[0];
}

export function bookingApprovalEligibility(state: BookingQuotationState, expected: BookingServiceSlot[]) {
  if (state.loading) return { canApprove: false, reason: "Đang kiểm tra xác nhận dịch vụ và báo giá." };
  if (state.error) return { canApprove: false, reason: "Chưa tải được xác nhận dịch vụ và báo giá. Vui lòng làm mới." };
  const active = state.requests.filter((r) => r.status !== "Superseded");
  const missing = expected.filter((s) => s.serviceId && !findBookingSupplierRequest(active, s));
  if (missing.length) return { canApprove: false, reason: `Chưa có xác nhận cho ${missing.length} dịch vụ đã chọn.` };
  const rejected = active.filter((r) => r.status === "Rejected");
  if (rejected.length) return { canApprove: false, reason: `${rejected.length} dịch vụ bị từ chối. Cần đổi phương án.` };
  const pending = active.filter((r) => r.status !== "Confirmed");
  if (pending.length) return { canApprove: false, reason: `Chờ Provider xác nhận ${pending.length} dịch vụ.` };
  const latest = [...state.quotes].sort((a, b) => b.version - a.version)[0];
  const requiresAcceptance = latest?.requiresCustomerAcceptance ?? (active.length > 0);
  if (requiresAcceptance && latest?.status !== "Accepted") return {
    canApprove: false, reason: latest?.status === "Sent"
      ? "Chờ khách đồng ý báo giá hiện hành." : "Cần gửi báo giá và được khách đồng ý trước khi duyệt.",
  };
  return { canApprove: true, reason: "Dịch vụ và báo giá đã đủ điều kiện duyệt booking." };
}
