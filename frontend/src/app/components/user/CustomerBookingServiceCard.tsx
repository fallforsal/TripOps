import { useEffect, useState } from "react";
import { Eye, MapPin } from "lucide-react";
import { http } from "@/app/lib/http";
import type { Service } from "@/app/types";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

type CustomerBookedService = Omit<Service, "price" | "priceFrom" | "priceTo" | "pricePerPerson">;

export function useCustomerBookingServices(bookingId: string, updatedAt?: string) {
  const [state, setState] = useState<{ bookingId: string; services: Service[]; loading: boolean; error?: string }>({ bookingId, services: [], loading: true });
  useEffect(() => {
    const abort = new AbortController();
    setState({ bookingId, services: [], loading: true });
    http<CustomerBookedService[]>(`/bookings/${Number(bookingId)}/services`, { signal: abort.signal })
      .then(items => !abort.signal.aborted && setState({ bookingId, services: items.map(s => ({ ...s, price: 0 })), loading: false }))
      .catch(e => !abort.signal.aborted && setState({ bookingId, services: [], loading: false, error: e.message }));
    return () => abort.abort();
  }, [bookingId, updatedAt]);
  return state.bookingId === bookingId ? state : { bookingId, services: [], loading: true };
}

export function CustomerBookingServiceCard({ service, onOpen }: { service?: Service; onOpen: (service: Service) => void }) {
  if (!service) return null;
  return <div className="mt-3 flex items-start gap-3 border-t border-gray-100 pt-3 text-xs">
    {(service.thumbnailUrl || service.image) && <button type="button" onClick={() => onOpen(service)}
      aria-label={`Xem bài viết ${service.name}`} className="w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white sm:w-28">
      <ImageWithFallback key={service.thumbnailUrl || service.image} src={service.thumbnailUrl || service.image}
        alt={service.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
    </button>}
    <div className="min-w-0 flex-1 space-y-2">
      <p className="font-medium text-gray-700">{service.providerName}</p>
      {(service.fullAddress || service.location) && <p className="flex items-start gap-1.5 text-gray-500">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{service.fullAddress || service.location}
      </p>}
      <button type="button" onClick={() => onOpen(service)} className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-50">
        <Eye className="h-3.5 w-3.5" /> Xem bài viết
      </button>
    </div>
  </div>;
}
