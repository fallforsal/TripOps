interface ServicePresentation {
  name?: string;
  thumbnailUrl?: string;
  image?: string;
  images?: string[];
  fullAddress?: string;
  street?: string;
  ward?: string;
  province?: string;
  location?: string;
}

// The API keeps the cover separate from the additional gallery.
export function serviceThumbnail(service?: ServicePresentation | null): string {
  return service?.thumbnailUrl?.trim() || service?.image?.trim()
    || service?.images?.find(url => url?.trim())?.trim() || "";
}

export function serviceGallery(service: ServicePresentation): string[] {
  return [...new Set([serviceThumbnail(service), ...(service.images || [])]
    .map(url => url.trim()).filter(Boolean))];
}

export function serviceAddress(service: ServicePresentation): string {
  if (service.fullAddress?.trim()) return service.fullAddress.trim();
  if (service.street?.trim() || service.ward?.trim()) {
    return [service.street, service.ward, service.province]
      .map(part => part?.trim()).filter(Boolean).join(", ");
  }
  return service.location?.trim() || service.province?.trim() || "Việt Nam";
}

function serviceGoogleMapsQuery(service: ServicePresentation): string {
  return [service.name?.trim(), serviceAddress(service)]
    .filter(Boolean).join(", ");
}

export function serviceGoogleMapsUrl(service: ServicePresentation): string {
  const query = serviceGoogleMapsQuery(service);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function serviceGoogleMapsEmbedUrl(service: ServicePresentation): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(serviceGoogleMapsQuery(service))}&hl=vi&z=17&output=embed`;
}
