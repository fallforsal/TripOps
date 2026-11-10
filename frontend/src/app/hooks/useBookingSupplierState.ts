import { useEffect, useState } from "react";
import { http } from "@/app/lib/http";
import type { BookingSupplierState, BookingSupplierRequest } from "@/app/lib/bookingSupplierStatus";

// Booking confirmations and approval eligibility are independent of quotation editing UI.
export function useBookingSupplierState(bookingId: string): BookingSupplierState {
  const [state, setState] = useState<BookingSupplierState>({ bookingId, loading: true, requests: [] });
  useEffect(() => {
    let active: AbortController | undefined;
    const refresh = async () => {
      active?.abort();
      const request = new AbortController();
      active = request;
      setState({ bookingId, loading: true, requests: [] });
      try {
        const requests = await http<BookingSupplierRequest[]>(
          `/bookings/${Number(bookingId)}/quotations/supplier-requests`, { signal: request.signal });
        if (!request.signal.aborted) setState({ bookingId, loading: false, requests });
      } catch (e) {
        if (!request.signal.aborted) setState({ bookingId, loading: false, requests: [],
          error: e instanceof Error ? e.message : "Không tải được xác nhận dịch vụ." });
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("booking-suppliers-changed", refresh);
    return () => { active?.abort(); window.removeEventListener("focus", refresh); window.removeEventListener("booking-suppliers-changed", refresh); };
  }, [bookingId]);
  return state.bookingId === bookingId ? state : { bookingId, loading: true, requests: [] };
}
