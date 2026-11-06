import type { Service, TourMeal } from "../types/index.ts";

type AddressSource = Pick<Service, "fullAddress" | "street" | "ward" | "province" | "location">;

export function serviceAddress(service: AddressSource): string | undefined {
  return service.fullAddress?.trim()
    || [service.street, service.ward, service.province].map((part) => part?.trim()).filter(Boolean).join(", ")
    || service.location?.trim()
    || undefined;
}

/** Use the address saved with the tour; older platform selections can use their linked post. */
export function mealAddress(meal: Pick<TourMeal, "supplier" | "supplierSource" | "isCustom" | "serviceId">,
  services: Service[]): string | undefined {
  const saved = meal.supplier?.address?.trim();
  if (saved) return saved;
  if (meal.supplierSource === "AGENCY_SUPPLIER" || meal.isCustom || !meal.serviceId) return undefined;
  const service = services.find((item) => item.id === meal.serviceId);
  return service ? serviceAddress(service) : undefined;
}
