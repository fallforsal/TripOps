import { useState } from "react";
import { Building2, ExternalLink, Eye, MapPin } from "lucide-react";
import type { Service, Tour } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { ServiceBlogDetailModal } from "@/app/components/service/ServiceBlogDetailModal";
import { serviceAddress } from "@/app/lib/tourServiceAddress";

export function TourAccommodationSummary({ tour, services = [] }: { tour: Pick<Tour, "hotels" | "itinerary">; services?: Service[] }) {
  const [viewing, setViewing] = useState<Service | null>(null);
  const hotels = tour.hotels?.length ? tour.hotels : tour.itinerary.flatMap(day => day.hotel ? [day.hotel] : []);
  if (!hotels.length) return null;
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="flex items-center gap-2 font-semibold text-[#075985]"><Building2 className="h-4 w-4"/>Khách sạn lưu trú trong phương án</h3>
    {hotels.map((hotel, index) => {
      const service = hotel.serviceId ? services.find(s => s.id === hotel.serviceId) : undefined;
      const address = hotel.address?.trim() || hotel.supplier?.address?.trim() || (service ? serviceAddress(service) : undefined);
      const image = service?.thumbnailUrl || hotel.image || service?.images?.[0];
      const mapUrl = hotel.googleMapsUrl || hotel.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hotel.name,address || hotel.destination].filter(Boolean).join(", "))}`;
      return <article key={hotel.id || `${hotel.name}-${index}`} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 sm:flex-row">
        {image ? <ImageWithFallback src={image} alt={hotel.name} className="h-28 w-full rounded-lg object-cover sm:w-36"/> : <div className="flex h-24 w-full items-center justify-center rounded-lg bg-sky-50 sm:w-28"><Building2 className="h-8 w-8 text-[#075985]"/></div>}
        <div className="min-w-0 flex-1 space-y-1.5"><h4 className="font-semibold text-slate-900">{hotel.name}</h4>
          <p className="text-sm text-slate-500">{[hotel.destination, hotel.nights ? `${hotel.nights} đêm` : null, hotel.stars ? `${hotel.stars} sao` : null, hotel.roomType].filter(Boolean).join(" · ")}</p>
          {address && <p className="flex items-start gap-1.5 text-sm text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0"/>{address}</p>}
          <div className="flex flex-wrap gap-2 pt-1">{service && <Button size="sm" variant="outline" onClick={() => setViewing(service)}><Eye className="h-3.5 w-3.5"/>Xem bài dịch vụ</Button>}<a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2 py-1 text-sm text-[#075985]"><MapPin className="h-3.5 w-3.5"/>Bản đồ<ExternalLink className="h-3 w-3"/></a></div>
        </div>
      </article>;
    })}
    <ServiceBlogDetailModal service={viewing} isOpen={Boolean(viewing)} onClose={() => setViewing(null)} hidePrice/>
  </section>;
}
