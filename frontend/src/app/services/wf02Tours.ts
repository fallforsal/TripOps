import type { DailyItinerary, Tour, TourHotel, TourMeal, TourPriceRow, TourVersion } from "@/app/types";
import { http } from "@/app/lib/http";

type Tier = { name: string; minAge: number | null; maxAge: number | null; pricePerGuest: number; displayOrder: number };
type Activity = { name: string; serviceId: number | null; description: string | null; estimatedTime: string | null; orderIndex: number };
type Meal = { mealType: "breakfast" | "lunch" | "dinner"; restaurantName: string; serviceId: number | null; description: string | null; isDefault: boolean; priceDifference: number };
type Accommodation = { hotelName: string; destinationName: string; serviceId: number | null; roomType: string | null; nightsCount: number; starRating: number; isDefault: boolean; priceDifference: number; addressNotes: string | null };
type Day = { dayNumber: number; title: string; description: string | null; transportationServiceId: number | null; activities: Activity[]; meals: Meal[]; accommodations: Accommodation[] };
export type TourConfiguration = { name: string; description: string | null; destination: string | null; departureLocation: string | null; durationDays: number; durationNights: number; basePrice: number; minGuests: number | null; maxGuests: number | null; operationPeriod: string | null; highlights: string | null; inclusions: string | null; exclusions: string | null; cancellationPolicy: string | null; message: string | null; images: string[]; pricingTiers: Tier[]; timelines: Day[] };
export type ApiTour = { id: number; agencyId: string; code: string | null; status: "draft" | "completed" | "deleted"; visibility: "hidden" | "public"; isRequest: boolean; isAiGenerated: boolean; version: number; configuration: TourConfiguration; createdAt: string; updatedAt: string };
type PublicTour = { id: number; code: string | null; version: number; configuration: TourConfiguration };
type TourPage<T> = { items: T[]; total: number; page: number; pageSize: number };
type TourListItem = { id: number };
export type ApiVersion = { version: number; changeNote: string | null; createdBy: string | null; price: number | null; createdAt: string; snapshotData: string | null };
export type EligibleService = { id: number; providerId: string; category: string; name: string; price: number };

const lines = (value?: string | null) => value?.split(/\r?\n/).map(s => s.trim()).filter(Boolean) || [];
const text = (values?: string[]) => (values || []).map(s => s.trim()).filter(Boolean).join("\n") || null;
const idNumber = (id: string) => {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("Mã tour không hợp lệ.");
  return parsed;
};
const serviceId = (value?: string) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("Mã dịch vụ phải là số dương.");
  return parsed;
};
const hotelOption = (hotel: TourHotel, destination: string, isDefault: boolean, delta = 0, nights = 1): Accommodation => ({
  hotelName: hotel.name.trim(), destinationName: hotel.destination?.trim() || destination,
  serviceId: serviceId(hotel.serviceId), roomType: null, nightsCount: nights,
  starRating: hotel.stars || 3, isDefault, priceDifference: delta, addressNotes: hotel.address || hotel.description || null,
});

export function toConfiguration(tour: Partial<Tour>): TourConfiguration {
  const days = tour.numberOfDays ?? Number(tour.duration?.match(/\d+/)?.[0] || 1);
  const nights = tour.numberOfNights ?? Math.max(0, days - 1);
  const destination = tour.destination?.trim() || "";
  const sourceDays = tour.itinerary || [];
  let firstNight = 1;
  const hotelStays = (tour.hotels || []).map(hotel => {
    const stay = { startDay: firstNight, hotel };
    firstNight += hotel.nights ?? 1;
    return stay;
  });
  const timelines: Day[] = sourceDays.filter(day =>
    day.title.trim() || day.locations?.length || day.meals?.length || day.hotel).map((day, index) => {
    const dayNumber = day.day || index + 1;
    const activities: Activity[] = (day.locations || []).map((place, orderIndex) => ({
      name: place.name.trim(), serviceId: null, description: place.address?.trim() || null,
      estimatedTime: place.time ? `${place.time.slice(0, 5)}:00` : null, orderIndex,
    }));
    const meals: Meal[] = (day.meals || []).flatMap((meal: TourMeal) => [
      { mealType: meal.type, restaurantName: (meal.serviceName || meal.description || "").trim(), serviceId: null, description: meal.description || null, isDefault: true, priceDifference: 0 },
      ...(meal.alternativeMeals || []).map(option => ({ mealType: meal.type, restaurantName: option.restaurantName.trim(), serviceId: null, description: option.description || null, isDefault: false, priceDifference: option.priceDifference })),
    ]);
    // Each hotel is one continuous stay anchored to its first night; alternatives are not additive.
    const hotel = hotelStays.length ? hotelStays.find(stay => stay.startDay === dayNumber)?.hotel : day.hotel;
    const stayNights = hotel ? (hotel.nights ?? nights) : 0;
    const accommodations: Accommodation[] = hotel ? [
      hotelOption(hotel, destination, true, 0, stayNights),
      ...(hotel.alternativeHotels || []).map(option => hotelOption({ ...hotel, name: option.name, stars: option.stars || hotel.stars, address: option.address || hotel.address, serviceId: undefined }, destination, false, option.priceDifference, stayNights)),
    ] : [];
    return { dayNumber, title: day.title.trim(), description: day.description || null,
      transportationServiceId: null, activities, meals, accommodations };
  });
  return { name: tour.name?.trim() || "", description: tour.description || null, destination: destination || null,
    departureLocation: tour.departureLocation?.trim() || null,
    durationDays: days, durationNights: nights, basePrice: tour.price ?? 0,
    minGuests: tour.minGuests ?? null, maxGuests: tour.maxGuests ?? null,
    operationPeriod: tour.operationPeriod || null, highlights: text(tour.highlights),
    inclusions: text(tour.inclusions), exclusions: text(tour.exclusions),
    cancellationPolicy: text(tour.regulations), message: tour.companyNote || null,
    images: (tour.images || []).filter(Boolean),
    pricingTiers: (tour.priceTable || []).map((row, displayOrder) => ({
      name: row.ageGroupLabel.trim(), minAge: row.minAge ?? null, maxAge: row.maxAge ?? null,
      pricePerGuest: row.price, displayOrder,
    })), timelines };
}

export function fromConfiguration(id: number, code: string | null, version: number, configuration: TourConfiguration,
  options: { agencyId?: string; status?: Tour["status"]; visibility?: Tour["visibility"]; createdAt?: string; updatedAt?: string; isRequest?: boolean } = {}): Tour {
  const c = configuration;
  const itinerary: DailyItinerary[] = (c.timelines || []).map(day => {
    const defaultHotel = day.accommodations?.find(option => option.isDefault);
    const hotel: TourHotel | undefined = defaultHotel ? {
      id: `hotel-${day.dayNumber}`, name: defaultHotel.hotelName, destination: defaultHotel.destinationName,
      serviceId: defaultHotel.serviceId?.toString(), nights: defaultHotel.nightsCount,
      stars: defaultHotel.starRating, pricePerNight: 0, address: defaultHotel.addressNotes || undefined,
      alternativeHotels: day.accommodations.filter(option => !option.isDefault).map((option, index) => ({
        id: `hotel-${day.dayNumber}-${index}`, name: option.hotelName, stars: option.starRating,
        priceDifference: option.priceDifference, address: option.addressNotes || undefined,
      })),
    } : undefined;
    const meals: TourMeal[] = (day.meals || []).filter(m => m.isDefault).map((meal, index) => ({
      id: `meal-${day.dayNumber}-${index}`, type: meal.mealType, serviceId: meal.serviceId?.toString(),
      serviceName: meal.restaurantName, description: meal.description || undefined,
      alternativeMeals: day.meals.filter(option => option.mealType === meal.mealType && !option.isDefault).map((option, alternative) => ({
        id: `meal-${day.dayNumber}-${index}-${alternative}`, restaurantName: option.restaurantName,
        priceDifference: option.priceDifference, description: option.description || undefined,
      })),
    }));
    return { id: `day-${day.dayNumber}`, day: day.dayNumber, date: "", title: day.title,
      description: day.description || "", destinationCity: c.destination || undefined,
      hotel, meals, locations: (day.activities || []).map((activity, index) => ({
        id: `activity-${day.dayNumber}-${index}`, name: activity.name, address: activity.description || "",
        latitude: 0, longitude: 0, time: activity.estimatedTime?.slice(0, 5),
      })) };
  });
  const hotels = itinerary.flatMap(day => day.hotel ? [day.hotel] : []);
  const priceTable: TourPriceRow[] = (c.pricingTiers || []).map(tier => ({
    ageGroup: `tier-${tier.displayOrder}`, ageGroupLabel: tier.name,
    minAge: tier.minAge ?? undefined, maxAge: tier.maxAge ?? undefined, price: tier.pricePerGuest,
  }));
  return { id: String(id), tourCode: code || String(id), name: c.name, destination: c.destination || "",
    duration: `${c.durationDays} ngày ${c.durationNights} đêm`, numberOfDays: c.durationDays,
    numberOfNights: c.durationNights, price: c.basePrice, description: c.description || "",
    image: c.images?.[0] || "", images: c.images || [], rating: 0, minGuests: c.minGuests || 0,
    maxGuests: c.maxGuests || 0, highlights: lines(c.highlights), hotels,
    itinerary, operationPeriod: c.operationPeriod || undefined,
    departureLocation: c.departureLocation || undefined, departureCity: c.departureLocation || undefined, priceTable,
    inclusions: lines(c.inclusions), exclusions: lines(c.exclusions), regulations: lines(c.cancellationPolicy),
    companyNote: c.message || "", companyId: options.agencyId, createdAt: options.createdAt,
    updatedAt: options.updatedAt, status: options.status || "completed", visibility: options.visibility || "public",
    is_request: options.isRequest || false, version, tourType: options.isRequest ? "custom_request" : "public" };
}
export const fromApiTour = (tour: ApiTour) => fromConfiguration(tour.id, tour.code, tour.version, tour.configuration,
  { agencyId: tour.agencyId, status: tour.status, visibility: tour.visibility, createdAt: tour.createdAt, updatedAt: tour.updatedAt, isRequest: tour.isRequest });
const fromPublicTour = (tour: PublicTour) => fromConfiguration(tour.id, tour.code, tour.version, tour.configuration);

async function allPages(path: string): Promise<TourListItem[]> {
  const items: TourListItem[] = [];
  for (let page = 1; ; page++) {
    const batch = await http<TourPage<TourListItem>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&pageSize=100`);
    items.push(...batch.items);
    if (items.length >= batch.total || !batch.items.length) return items;
  }
}
export async function publicTours(): Promise<Tour[]> {
  const summaries = await allPages("/tours");
  return Promise.all(summaries.map(async item => fromPublicTour(await http<PublicTour>(`/tours/${item.id}`))));
}
export async function agencyTours(): Promise<Tour[]> {
  const summaries = await allPages("/agency/tours");
  return Promise.all(summaries.map(async item => {
    const api = await http<ApiTour>(`/agency/tours/${item.id}`);
    const result = fromApiTour(api);
    const versions = await agencyTourVersions(String(item.id));
    result.versionHistory = await Promise.all(versions.items.filter(v => v.version < api.version).map(async v => {
      const detail = await agencyTourVersion(String(item.id), v.version);
      const snapshot = JSON.parse(detail.snapshotData || "{}") as { configuration?: TourConfiguration; status?: Tour["status"]; visibility?: Tour["visibility"] };
      return { version: v.version, createdAt: v.createdAt, createdByName: v.createdBy || undefined,
        changeNote: v.changeNote || undefined,
        tourSnapshot: snapshot.configuration ? fromConfiguration(api.id, api.code, v.version, snapshot.configuration,
          { status: snapshot.status, visibility: snapshot.visibility }) : result } satisfies TourVersion;
    }));
    return result;
  }));
}
export async function moderationTours(): Promise<Tour[]> {
  const summaries = await allPages("/admin/tours");
  return Promise.all(summaries.map(async item => fromApiTour(await http<ApiTour>(`/admin/tours/${item.id}`))));
}
export const getAgencyTour = (id: string) => http<ApiTour>(`/agency/tours/${idNumber(id)}`);
export async function eligibleServices(category: string): Promise<EligibleService[]> {
  const items: EligibleService[] = [];
  for (let page = 1; ; page++) {
    const batch = await http<TourPage<EligibleService>>(`/services?category=${encodeURIComponent(category)}&page=${page}&pageSize=100`);
    items.push(...batch.items);
    if (items.length >= batch.total || !batch.items.length) return items;
  }
}
export const getPublicTour = (id: string) => http<PublicTour>(`/tours/${idNumber(id)}`);
export const createAgencyTour = (data: Partial<Tour>) => http<ApiTour>("/agency/tours", { method: "POST", body: JSON.stringify(toConfiguration(data)) });
export const updateAgencyTour = (id: string, version: number, data: Partial<Tour>) => http<ApiTour>(`/agency/tours/${idNumber(id)}`, { method: "PUT", body: JSON.stringify({ version, configuration: toConfiguration(data), changeNote: data.changeNote || "Agency updated tour" }) });
export const publishAgencyTour = (id: string, version: number) => http<ApiTour>(`/agency/tours/${idNumber(id)}/publish`, { method: "POST", body: JSON.stringify({ version }) });
export const hideAgencyTour = (id: string, version: number, reason: string) => http<ApiTour>(`/agency/tours/${idNumber(id)}/hide`, { method: "POST", body: JSON.stringify({ version, reason }) });
export const hideModeratedTour = (id: string, version: number, reason: string) => http<ApiTour>(`/admin/tours/${idNumber(id)}/hide`, { method: "POST", body: JSON.stringify({ version, reason }) });
export const archiveAgencyTour = (id: string, version: number) => http<void>(`/agency/tours/${idNumber(id)}?version=${version}`, { method: "DELETE" });
export const duplicateAgencyTour = (id: string, name: string) => http<ApiTour>(`/agency/tours/${idNumber(id)}/duplicate`, { method: "POST", body: JSON.stringify({ name }) });
export const agencyTourVersions = (id: string) => http<TourPage<ApiVersion>>(`/agency/tours/${idNumber(id)}/versions?pageSize=100`);
export const agencyTourVersion = (id: string, number: number) => http<ApiVersion>(`/agency/tours/${idNumber(id)}/versions/${number}`);
export const restoreAgencyTour = (id: string, number: number, version: number) => http<ApiTour>(`/agency/tours/${idNumber(id)}/versions/${number}/restore`, { method: "POST", body: JSON.stringify({ version, reason: `Restore version ${number}` }) });
