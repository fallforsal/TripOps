export type BookingSupplierRequest = { id: number; bookingId: number; serviceId: number; slotKey: string;
  serviceName: string; status: string; estimatedCost: number; quotedCost: number | null; note: string | null;
  serviceDateFrom?: string | null; serviceDateTo?: string | null; quantity?: number; unit?: string;
  respondedAt?: string | null; providerId?: string | null; providerName?: string | null;
  providerPhone?: string | null; thumbnailUrl?: string | null; fullAddress?: string | null; holdUntil?: string | null; availableQuantity?: number | null };
export type BookingSupplierState = { bookingId: string; loading: boolean; error?: string;
  requests: BookingSupplierRequest[] };
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
