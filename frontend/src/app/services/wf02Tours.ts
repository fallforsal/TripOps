import { toTourApiTime } from "@/app/lib/tourClockTime";
import { tourSaveBody } from "@/app/lib/tourSaveBody";
import type {
  DailyItinerary,
  Tour,
  TourHotel,
  TourMeal,
  TourPriceRow,
  TourVersion,
  TourSupplierSnapshot,
} from "@/app/types";
import { http } from "@/app/lib/http";

type Tier = {
  key?: string | null;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  pricePerGuest: number;
  displayOrder: number;
};
type Activity = {
  id?: string; agencyId?: string;
  name: string;
  description: string | null;
  estimatedTime: string | null;
  orderIndex: number;
};
type Meal = {
  id?: string; agencyId?: string;
  supplierSource?: "PLATFORM_PARTNER" | "AGENCY_SUPPLIER";
  agencySupplierId?: number | null;
  supplier?: TourSupplierSnapshot | null;
  serviceId?: number | null;
  time?: string | null;
  mealType: "breakfast" | "lunch" | "dinner";
  restaurantName: string;
  description: string | null;
  isDefault: boolean;
  priceDifference: number;
};
type Accommodation = {
  id?: string; agencyId?: string;
  supplierSource?: "PLATFORM_PARTNER" | "AGENCY_SUPPLIER";
  agencySupplierId?: number | null;
  supplier?: TourSupplierSnapshot | null;
  serviceId?: number | null;
  hotelName: string;
  destinationName: string;
  roomType: string | null;
  nightsCount: number;
  starRating: number;
  isDefault: boolean;
  priceDifference: number;
  addressNotes: string | null;
};
type Day = {
  dayNumber: number;
  title: string;
  description: string | null;
  activities: Activity[];
  meals: Meal[];
  accommodations: Accommodation[];
};
export type TourConfiguration = {
  agencyPricing?: import("@/app/types").Tour["agencyPricing"];
  coHosts?: import("@/app/types").TourCoHost[];
  numberOfGuests?: number | null;
  code?: string | null;
  name: string;
  description: string | null;
  destination: string | null;
  departureLocation: string | null;
  durationDays: number;
  durationNights: number;
  basePrice: number;
  minGuests: number | null;
  maxGuests: number | null;
  operationPeriod: string | null;
  highlights: string | null;
  inclusions: string | null;
  exclusions: string | null;
  cancellationPolicy: string | null;
  message: string | null;
  images: string[];
  pricingTiers: Tier[];
  timelines: Day[];
  provinceCodes?: string[];
};
export type TourAgencyContact = { id: string; name: string; logoUrl?: string | null; phone?: string | null; email?: string | null };
export type ApiTour = {
  agency?: TourAgencyContact | null;
  revision?: number;
  hasDraftChanges?: boolean;
  sharedVersion?: number | null;
  designRequestId?: number | null;
  id: number;
  agencyId: string;
  code: string | null;
  status: "draft" | "completed" | "deleted";
  visibility: "hidden" | "public";
  isRequest: boolean;
  isAiGenerated: boolean;
  version: number;
  configuration: TourConfiguration;
  createdAt: string;
  updatedAt: string;
};
type PublicTour = { agencyId?: string; agency?: TourAgencyContact | null;
  id: number;
  code: string | null;
  version: number;
  configuration: TourConfiguration;
};
type TourPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
type TourListItem = { id: number; provinceCodes?: string[] };
export type CandidateAgency = {
  agencyId: string;
  businessName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  matchedProvinceCodes: string[];
  matchedTourCount: number;
};
export type ApiVersion = {
  version: number;
  changeNote: string | null;
  createdBy: string | null;
  price: number | null;
  createdAt: string;
  snapshotData: string | null;
};
export type EligibleService = {
  id: number;
  providerId: string;
  category: string;
  name: string;
  price: number;
};
export type AgencySupplier = {
  id: number; type: "HOTEL" | "RESTAURANT"; name: string;
  address?: string | null; area?: string | null; contactName?: string | null;
  contactPhone?: string | null; contactEmail?: string | null; starRating?: number | null;
  referencePrice?: number | null; conditions?: string | null; notes?: string | null;
  status: string;
};
export type SupplierInput = Omit<AgencySupplier, "id" | "status"> & { status?: string };
export const agencySuppliers = (type?: "HOTEL" | "RESTAURANT", search = "", signal?: AbortSignal) =>
  http<AgencySupplier[]>(`/agency/suppliers?${type ? `type=${type}&` : ""}search=${encodeURIComponent(search)}`, { signal });
export const getAgencySupplier = (id: number) =>
  http<AgencySupplier>(`/agency/suppliers/${id}`);
export const deleteAgencySupplier = (id: number) =>
  http<void>(`/agency/suppliers/${id}`, { method: "DELETE" });
export const createAgencySupplier = (data: SupplierInput) =>
  http<AgencySupplier>("/agency/suppliers", { method: "POST", body: JSON.stringify(data) });
export const updateAgencySupplier = (id: number, data: SupplierInput) =>
  http<AgencySupplier>(`/agency/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) });

const lines = (value?: string | null) =>
  value
    ?.split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean) || [];
const text = (values?: string[]) =>
  (values || [])
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n") || null;
const idNumber = (id: string) => {
  const parsed = Number(id);
  if (!Number.isSafeInteger(parsed) || parsed <= 0)
    throw new Error("Mã tour không hợp lệ.");
  return parsed;
};
const hotelOption = (
  hotel: TourHotel,
  destination: string,
  isDefault: boolean,
  delta = 0,
  nights = 1,
): Accommodation => ({
  id: hotel.id, agencyId: hotel.createdByCompanyId,
  supplierSource: hotel.supplierSource || (hotel.isCustom || !hotel.serviceId ? "AGENCY_SUPPLIER" : "PLATFORM_PARTNER"),
  agencySupplierId: hotel.agencySupplierId || null,
  supplier: hotel.supplier || (hotel.isCustom ? { address: hotel.address, area: hotel.destination, referencePrice: hotel.pricePerNight, conditions: hotel.description } : null),
  serviceId:
    hotel.supplierSource !== "AGENCY_SUPPLIER" && !hotel.isCustom && hotel.serviceId && /^\d+$/.test(hotel.serviceId)
      ? Number(hotel.serviceId)
      : null,
  hotelName: hotel.name.trim(),
  destinationName: hotel.destination?.trim() || destination,
  roomType: null,
  nightsCount: nights,
  starRating: hotel.stars || 3,
  isDefault,
  priceDifference: delta,
  addressNotes: hotel.address || hotel.description || null,
});

export function toConfiguration(tour: Partial<Tour>): TourConfiguration {
  const days =
    tour.numberOfDays ?? Number(tour.duration?.match(/\d+/)?.[0] || 1);
  const nights = tour.numberOfNights ?? Math.max(0, days - 1);
  const destination = tour.destination?.trim() || "";
  const sourceDays = tour.itinerary || [];
  let firstNight = 1;
  const hotelStays = (tour.hotels || []).map((hotel) => {
    const stay = { startDay: firstNight, hotel };
    firstNight += hotel.nights ?? 1;
    return stay;
  });
  const timelines: Day[] = sourceDays
    .filter(
      (day) =>
        day.title.trim() ||
        day.locations?.length ||
        day.meals?.length ||
        day.hotel,
    )
    .map((day, index) => {
      const dayNumber = day.day || index + 1;
      const activities: Activity[] = (day.locations || []).map(
        (place, orderIndex) => ({
          name: place.name.trim(),
          id: place.id, agencyId: place.createdByCompanyId,
          description: place.address?.trim() || null,
          estimatedTime: toTourApiTime(place.time, `Ngày ${dayNumber}, điểm ${orderIndex + 1} (${place.name || "chưa có tên"})`),
          orderIndex,
        }),
      );
      const meals: Meal[] = (day.meals || []).flatMap((meal: TourMeal) => [
        {
          supplierSource: meal.supplierSource || (meal.isCustom || !meal.serviceId ? "AGENCY_SUPPLIER" : "PLATFORM_PARTNER"),
          agencySupplierId: meal.agencySupplierId || null,
          supplier: meal.supplier || (meal.isCustom ? { area: day.destinationCity || destination, referencePrice: meal.pricePerPerson, conditions: meal.description } : null),
          id: meal.id, agencyId: meal.createdByCompanyId,
          mealType: meal.type,
          restaurantName: (meal.serviceName || meal.description || "").trim(),
          serviceId:
            meal.supplierSource !== "AGENCY_SUPPLIER" && !meal.isCustom && meal.serviceId && /^\d+$/.test(meal.serviceId)
              ? Number(meal.serviceId)
              : null,
          time: toTourApiTime(meal.time, `Ngày ${dayNumber}, bữa ${meal.type === "breakfast" ? "sáng" : meal.type === "lunch" ? "trưa" : "tối"}`),
          description: meal.description || null,
          isDefault: true,
          priceDifference: 0,
        },
        ...(meal.alternativeMeals || []).map((option) => ({
          supplierSource: option.supplierSource || (option.isCustom || !option.serviceId ? "AGENCY_SUPPLIER" : "PLATFORM_PARTNER"),
          agencySupplierId: option.agencySupplierId || null,
          supplier: option.supplier || (option.isCustom ? { address: option.address, area: day.destinationCity || destination, referencePrice: option.price, conditions: option.description } : null),
          id: option.id, agencyId: option.createdByCompanyId || meal.createdByCompanyId,
          mealType: meal.type,
          restaurantName: option.restaurantName.trim(),
          serviceId:
            option.supplierSource !== "AGENCY_SUPPLIER" && !option.isCustom && option.serviceId && /^\d+$/.test(option.serviceId)
              ? Number(option.serviceId)
              : null,
          time: toTourApiTime(meal.time, `Ngày ${dayNumber}, bữa ${meal.type === "breakfast" ? "sáng" : meal.type === "lunch" ? "trưa" : "tối"}`),
          description: option.description || null,
          isDefault: false,
          priceDifference: option.priceDifference,
        })),
      ]);
      // Each hotel is one continuous stay anchored to its first night; alternatives are not additive.
      const hotel = hotelStays.length
        ? hotelStays.find((stay) => stay.startDay === dayNumber)?.hotel
        : day.hotel;
      const stayNights = hotel ? (hotel.nights ?? nights) : 0;
      const accommodations: Accommodation[] = hotel
        ? [
            hotelOption(hotel, destination, true, 0, stayNights),
            ...(hotel.alternativeHotels || []).map((option) =>
              hotelOption(
                {
                  ...hotel,
                  id: option.id, createdByCompanyId: option.createdByCompanyId || hotel.createdByCompanyId,
                  serviceId: option.serviceId,
                  supplierSource: option.supplierSource,
                  agencySupplierId: option.agencySupplierId,
                  supplier: option.supplier,
                  isCustom: option.isCustom,
                  name: option.name,
                  stars: option.stars || hotel.stars,
                  address: option.address || hotel.address,
                },
                destination,
                false,
                option.priceDifference,
                stayNights,
              ),
            ),
          ]
        : [];
      return {
        dayNumber,
        title: day.title.trim(),
        description: day.description || null,
        activities,
        meals,
        accommodations,
      };
    });
  return {
    code: tour.tourCode?.trim() || null,
    coHosts: tour.coHosts,
    name: tour.name?.trim() || "",
    description: tour.description || null,
    destination: destination || null,
    departureLocation: tour.departureLocation?.trim() || null,
    durationDays: days,
    durationNights: nights,
    numberOfGuests: tour.planGuestCount ?? null,
    basePrice: tour.price ?? 0,
    minGuests: tour.minGuests ?? null,
    maxGuests: tour.maxGuests ?? null,
    operationPeriod: tour.operationPeriod || null,
    highlights: text(tour.highlights),
    inclusions: text(tour.inclusions),
    exclusions: text(tour.exclusions),
    cancellationPolicy: text(tour.regulations),
    message: tour.companyNote || null,
    images: (tour.image
      ? [tour.image, ...(tour.images || []).filter((url) => url !== tour.image)]
      : tour.images || []
    ).filter(Boolean),
    pricingTiers: (tour.priceTable || []).map((row, displayOrder) => ({
      key: row.tierKey || null,
      name: row.ageGroupLabel.trim(),
      minAge: row.minAge ?? null,
      maxAge: row.maxAge ?? null,
      pricePerGuest: row.price,
      displayOrder,
    })),
    timelines,
    provinceCodes: Array.from(
      new Set(
        (tour.provinceCodes || [])
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean),
      ),
    ),
  };
}

export function fromConfiguration(
  id: number,
  code: string | null,
  version: number,
  configuration: TourConfiguration,
  options: {
    agencyId?: string;
    agency?: TourAgencyContact | null;
    status?: Tour["status"];
    visibility?: Tour["visibility"];
    createdAt?: string;
    updatedAt?: string;
    isRequest?: boolean;
  } = {},
): Tour {
  const c = configuration;
  const itinerary: DailyItinerary[] = (c.timelines || []).map((day) => {
    const defaultHotel = day.accommodations?.find((option) => option.isDefault);
    const hotel: TourHotel | undefined = defaultHotel
      ? {
          id: defaultHotel.id || `hotel-${day.dayNumber}-0`,
          createdByCompanyId: defaultHotel.agencyId || (day as typeof day & { agencyId?: string }).agencyId,
          createdByCompanyName: c.coHosts?.find(h => h.companyId === (defaultHotel.agencyId || (day as typeof day & { agencyId?: string }).agencyId))?.companyName,
          name: defaultHotel.hotelName,
          serviceId: defaultHotel.serviceId
            ? String(defaultHotel.serviceId)
            : undefined,
          supplierSource: defaultHotel.supplierSource || (defaultHotel.serviceId ? "PLATFORM_PARTNER" : "AGENCY_SUPPLIER"),
          agencySupplierId: defaultHotel.agencySupplierId || undefined,
          supplier: defaultHotel.supplier || undefined,
          isCustom: defaultHotel.supplierSource === "AGENCY_SUPPLIER" || !defaultHotel.serviceId,
          providerName: defaultHotel.supplierSource === "AGENCY_SUPPLIER" || !defaultHotel.serviceId ? "Nhà cung cấp của agency" : undefined,
          destination: defaultHotel.destinationName,
          nights: defaultHotel.nightsCount,
          stars: defaultHotel.starRating,
          pricePerNight: defaultHotel.supplier?.referencePrice || 0,
          address: defaultHotel.supplier?.address || defaultHotel.addressNotes || undefined,
          alternativeHotels: day.accommodations
            .filter((option) => !option.isDefault)
            .map((option, index) => ({
              id: option.id || `hotel-${day.dayNumber}-${index + 1}`,
              createdByCompanyId: option.agencyId,
              serviceId: option.serviceId
                ? String(option.serviceId)
                : undefined,
              supplierSource: option.supplierSource || (option.serviceId ? "PLATFORM_PARTNER" : "AGENCY_SUPPLIER"),
              agencySupplierId: option.agencySupplierId || undefined,
              supplier: option.supplier || undefined,
              isCustom: option.supplierSource === "AGENCY_SUPPLIER" || !option.serviceId,
              providerName: option.supplierSource === "AGENCY_SUPPLIER" || !option.serviceId ? "Nhà cung cấp của agency" : undefined,
              name: option.hotelName,
              stars: option.starRating,
              priceDifference: option.priceDifference,
              price: option.supplier?.referencePrice || undefined,
              address: option.supplier?.address || option.addressNotes || undefined,
            })),
        }
      : undefined;
    const meals: TourMeal[] = (day.meals || [])
      .filter((m) => m.isDefault)
      .map((meal, index) => ({
        id: meal.id || `meal-${day.dayNumber}-${index}`,
        createdByCompanyId: meal.agencyId || (day as typeof day & { agencyId?: string }).agencyId,
        createdByCompanyName: c.coHosts?.find(h => h.companyId === (meal.agencyId || (day as typeof day & { agencyId?: string }).agencyId))?.companyName,
        type: meal.mealType,
        serviceId: meal.serviceId ? String(meal.serviceId) : undefined,
        supplierSource: meal.supplierSource || (meal.serviceId ? "PLATFORM_PARTNER" : "AGENCY_SUPPLIER"),
        agencySupplierId: meal.agencySupplierId || undefined,
        supplier: meal.supplier || undefined,
        isCustom: meal.supplierSource === "AGENCY_SUPPLIER" || !meal.serviceId,
        providerName: meal.supplierSource === "AGENCY_SUPPLIER" || !meal.serviceId ? "Nhà cung cấp của agency" : undefined,
        time: meal.time?.slice(0, 5),
        serviceName: meal.restaurantName,
        description: meal.description || undefined,
        pricePerPerson: meal.supplier?.referencePrice || undefined,
        alternativeMeals: day.meals
          .filter(
            (option) => option.mealType === meal.mealType && !option.isDefault,
          )
          .map((option, alternative) => ({
            id: option.id || `meal-${day.dayNumber}-${index}-${alternative}`,
            createdByCompanyId: option.agencyId,
            serviceId: option.serviceId ? String(option.serviceId) : undefined,
            supplierSource: option.supplierSource || (option.serviceId ? "PLATFORM_PARTNER" : "AGENCY_SUPPLIER"),
            agencySupplierId: option.agencySupplierId || undefined,
            supplier: option.supplier || undefined,
            isCustom: option.supplierSource === "AGENCY_SUPPLIER" || !option.serviceId,
            providerName: option.supplierSource === "AGENCY_SUPPLIER" || !option.serviceId ? "Nhà cung cấp của agency" : undefined,
            restaurantName: option.restaurantName,
            priceDifference: option.priceDifference,
            description: option.description || undefined,
            price: option.supplier?.referencePrice || undefined,
          })),
      }));
    return {
      id: `day-${day.dayNumber}`,
      day: day.dayNumber,
      date: "",
      title: day.title,
      description: day.description || "",
      destinationCity: c.destination || undefined,
      hotel,
      createdByCompanyId: (day as typeof day & { agencyId?: string }).agencyId,
      createdByCompanyName: c.coHosts?.find(h => h.companyId === (day as typeof day & { agencyId?: string }).agencyId)?.companyName,
      meals,
      locations: (day.activities || []).map((activity, index) => ({
        id: activity.id || `activity-${day.dayNumber}-${index}`,
        createdByCompanyId: activity.agencyId || (day as typeof day & { agencyId?: string }).agencyId,
        createdByCompanyName: c.coHosts?.find(h => h.companyId === (activity.agencyId || (day as typeof day & { agencyId?: string }).agencyId))?.companyName,
        name: activity.name,
        address: activity.description || "",
        latitude: 0,
        longitude: 0,
        time: activity.estimatedTime?.slice(0, 5),
      })),
    };
  });
  const hotels = itinerary.flatMap((day) => (day.hotel ? [day.hotel] : []));
  const priceTable: TourPriceRow[] = (c.pricingTiers || []).map((tier) => ({
    tierKey: tier.key || undefined,
    ageGroup:
      (tier.minAge ?? 0) >= 12 && (tier.maxAge ?? 150) >= 100
        ? "adult"
        : (tier.minAge ?? 0) === 0 && (tier.maxAge ?? 150) <= 4
          ? "child_under_2"
          : (tier.maxAge ?? 150) <= 11
            ? "child_2_11"
            : `tier-${tier.displayOrder}`,
    ageGroupLabel: tier.name,
    minAge: tier.minAge ?? undefined,
    maxAge: tier.maxAge ?? undefined,
    price: tier.pricePerGuest,
  }));
  return {
    id: String(id),
    tourCode: code || String(id),
    name: c.name,
    destination: c.destination || "",
    provinceCodes: c.provinceCodes || [],
    duration: `${c.durationDays} ngày ${c.durationNights} đêm`,
    numberOfDays: c.durationDays,
    numberOfNights: c.durationNights,
    price: c.basePrice,
    description: c.description || "",
    image: c.images?.[0] || "",
    images: c.images || [],
    rating: 0,
    planGuestCount: c.numberOfGuests || undefined,
    minGuests: c.minGuests || 0,
    maxGuests: c.maxGuests || 0,
    highlights: lines(c.highlights),
    hotels,
    itinerary,
    agencyPricing: c.agencyPricing,
    coHosts: c.coHosts && c.coHosts.length > 1 ? c.coHosts.map(h=>({...h, quoteStatus:h.quotedAt?"submitted" as const:"draft" as const,quotePerGuest:h.quoteAdult})) : [],
    isCoHosted: Boolean(c.coHosts?.some(h => h.role === "partner" && h.status === "accepted")),
    operationPeriod: c.operationPeriod || undefined,
    departureLocation: c.departureLocation || undefined,
    departureCity: c.departureLocation || undefined,
    priceTable,
    inclusions: lines(c.inclusions),
    exclusions: lines(c.exclusions),
    regulations: lines(c.cancellationPolicy),
    companyNote: c.message || "",
    companyId: options.agencyId,
    companyName: options.agency?.name,
    companyLogo: options.agency?.logoUrl || undefined,
    companyPhone: options.agency?.phone || undefined,
    companyEmail: options.agency?.email || undefined,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
    status: options.status || "completed",
    visibility: options.visibility || "public",
    is_request: options.isRequest || false,
    version,
    tourType: options.isRequest ? "custom_request" : "public",
  };
}
export const fromApiTour = (tour: ApiTour): Tour => ({
  ...fromConfiguration(tour.id, tour.code, tour.version, tour.configuration, {
    agencyId: tour.agencyId,
    agency: tour.agency,
    status: tour.status,
    visibility: tour.visibility,
    createdAt: tour.createdAt,
    updatedAt: tour.updatedAt,
    isRequest: tour.isRequest,
  }),
  sharedVersion: tour.sharedVersion ?? undefined,
  revision: tour.revision ?? 1, hasDraftChanges: tour.hasDraftChanges ?? false,
  customRequestId: tour.designRequestId == null ? undefined : String(tour.designRequestId),
});
const fromPublicTour = (tour: PublicTour) =>
  fromConfiguration(tour.id, tour.code, tour.version, tour.configuration, { agencyId: tour.agencyId, agency: tour.agency });

async function allPages(path: string): Promise<TourListItem[]> {
  const items: TourListItem[] = [];
  for (let page = 1; ; page++) {
    const batch = await http<TourPage<TourListItem>>(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}&pageSize=100`,
    );
    items.push(...batch.items);
    if (items.length >= batch.total || !batch.items.length) return items;
  }
}
// publicTours supports optional provinceCode filter
export async function publicTours(provinceCode?: string): Promise<Tour[]> {
  const query = provinceCode?.trim()
    ? `/tours?provinceCode=${encodeURIComponent(provinceCode.trim().toUpperCase())}`
    : "/tours";
  const summaries = await allPages(query);
  return Promise.all(
    summaries.map(async (item) =>
      fromPublicTour(await http<PublicTour>(`/tours/${item.id}`)),
    ),
  );
}
export async function agencyTours(provinceCode?: string): Promise<Tour[]> {
  const query = provinceCode?.trim()
    ? `/agency/tours?provinceCode=${encodeURIComponent(provinceCode.trim().toUpperCase())}`
    : "/agency/tours";
  const summaries = await allPages(query);
  return Promise.all(
    summaries.map(async (item) => {
      const api = await http<ApiTour>(`/agency/tours/${item.id}`);
      const result = fromApiTour(api);
      if (!api.isRequest) return result;
      const versions = await agencyTourVersions(String(item.id));
      result.versionHistory = await Promise.all(
        versions.items
          .filter((v) => v.version < api.version)
          .map(async (v) => {
            const detail = await agencyTourVersion(String(item.id), v.version);
            const snapshot = JSON.parse(detail.snapshotData || "{}") as {
              configuration?: TourConfiguration;
              status?: Tour["status"];
              visibility?: Tour["visibility"];
            };
            return {
              version: v.version,
              createdAt: v.createdAt,
              createdByName: v.createdBy || undefined,
              changeNote: v.changeNote || undefined,
              tourSnapshot: snapshot.configuration
                ? fromConfiguration(
                    api.id,
                    api.code,
                    v.version,
                    snapshot.configuration,
                    {
                      status: snapshot.status,
                      visibility: snapshot.visibility,
                    },
                  )
                : result,
            } satisfies TourVersion;
          }),
      );
      return result;
    }),
  );
}
export async function moderationTours(): Promise<Tour[]> {
  const summaries = await allPages("/admin/tours");
  return Promise.all(
    summaries.map(async (item) =>
      fromApiTour(await http<ApiTour>(`/admin/tours/${item.id}`)),
    ),
  );
}
export const getAgencyTour = (id: string) =>
  http<ApiTour>(`/agency/tours/${idNumber(id)}`);
export async function eligibleServices(
  category: string,
): Promise<EligibleService[]> {
  const items: EligibleService[] = [];
  for (let page = 1; ; page++) {
    const batch = await http<TourPage<EligibleService>>(
      `/services?category=${encodeURIComponent(category)}&page=${page}&pageSize=100`,
    );
    items.push(...batch.items);
    if (items.length >= batch.total || !batch.items.length) return items;
  }
}
export const getPublicTour = (id: string) =>
  http<PublicTour>(`/tours/${idNumber(id)}`);
export const createAgencyTour = (data: Partial<Tour>) => {
  const body=tourSaveBody(toConfiguration(data),data);
  return http<ApiTour>(body instanceof FormData ? "/agency/tours/with-images" : "/agency/tours",{method:"POST",body,signal:body instanceof FormData ? AbortSignal.timeout(120000) : undefined});
};
export const updateAgencyTour = (id:string,revision:number,data:Partial<Tour>) => {
  const body=tourSaveBody({revision,configuration:toConfiguration(data),changeNote:data.changeNote || "Agency updated tour"},data);
  return http<ApiTour>(`/agency/tours/${idNumber(id)}${body instanceof FormData ? "/with-images" : ""}`,{method:"PUT",body,signal:body instanceof FormData ? AbortSignal.timeout(120000) : undefined});
};
export const publishAgencyTour = (id: string, version: number) =>
  http<ApiTour>(`/agency/tours/${idNumber(id)}/publish`, {
    method: "POST",
    body: JSON.stringify({ revision: version }),
  });
export const hideAgencyTour = (id: string, version: number, reason: string) =>
  http<ApiTour>(`/agency/tours/${idNumber(id)}/hide`, {
    method: "POST",
    body: JSON.stringify({ revision: version, reason }),
  });
export const hideModeratedTour = (
  id: string,
  version: number,
  reason: string,
) =>
  http<ApiTour>(`/admin/tours/${idNumber(id)}/hide`, {
    method: "POST",
    body: JSON.stringify({ revision: version, reason }),
  });
export const archiveAgencyTour = (id: string, version: number) =>
  http<void>(`/agency/tours/${idNumber(id)}?revision=${version}`, {
    method: "DELETE",
  });
export const duplicateAgencyTour = (id: string, name: string) =>
  http<ApiTour>(`/agency/tours/${idNumber(id)}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const agencyTourVersions = (id: string) =>
  http<TourPage<ApiVersion>>(
    `/agency/tours/${idNumber(id)}/versions?pageSize=100`,
  );
export const agencyTourVersion = (id: string, number: number) =>
  http<ApiVersion>(`/agency/tours/${idNumber(id)}/versions/${number}`);
export const findCandidateAgenciesByProvince = (
  provinceCodes: string | string[],
  excludeSelf = true,
) => {
  const joined = (Array.isArray(provinceCodes) ? provinceCodes : [provinceCodes])
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
  return http<CandidateAgency[]>(
    `/agency/tours/candidate-agencies?provinceCode=${encodeURIComponent(joined)}&excludeSelf=${excludeSelf}`,
  );
};

export const completeAgencyTour = (id: string, version: number) =>
  http<ApiTour>(`/agency/tours/${idNumber(id)}/complete`, {
    method: "POST",
    body: JSON.stringify({ revision: version }),
  });
