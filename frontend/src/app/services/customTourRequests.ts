import { http } from "@/app/lib/http";
import type { CustomTourRequest, Tour, TourCompany, TourCoHost } from "@/app/types";
import { fromApiTour, toConfiguration, type ApiTour } from "@/app/services/wf02Tours";

type RequestDto = {
  coHosts?: TourCoHost[];
  rejectionReason?: string | null; respondedAt?: string | null; sharedVersion?: number | null;
  id: number; customerId: string; agencyId: string; agencyName: string;
  contactName: string; contactEmail: string; contactPhone: string;
  destination: string; departureDate: string; returnDate: string | null;
  numberOfPeople: number; budgetPerPerson: number | null;
  hotelStars: string | null; additionalInfo: string | null;
  businessName: string | null; businessEmail: string | null; businessPhone: string | null;
  status: CustomTourRequest["status"]; createdAt: string;
  designedTourId: number | null; currentVersion: number | null;
  quotedPricePerPerson: number | null;
};
type AgencyChoice = { id: string; name: string; address: string; phone: string; email: string; logoUrl?: string | null };

const fromDto = (r: RequestDto): CustomTourRequest => ({
  coHosts: r.coHosts && r.coHosts.length > 1 ? r.coHosts : [], isCoHosted: Boolean(r.coHosts?.some(h => h.role === "partner" && h.status !== "rejected")),
  rejectionReason: r.rejectionReason || undefined, responseAt: r.respondedAt || undefined, sharedVersion: r.sharedVersion ?? undefined,
  id: String(r.id), userId: r.customerId, targetCompanyId: r.agencyId,
  targetCompanyName: r.agencyName, contactName: r.contactName,
  contactEmail: r.contactEmail, contactPhone: r.contactPhone,
  destinations: r.destination, departureDate: r.departureDate.slice(0, 10),
  returnDate: (r.returnDate || r.departureDate).slice(0, 10),
  numberOfPeople: String(r.numberOfPeople), budgetPerPerson: r.budgetPerPerson == null ? undefined : String(r.budgetPerPerson),
  hotelStars: r.hotelStars || undefined, additionalInfo: r.additionalInfo || undefined,
  businessName: r.businessName || undefined, businessEmail: r.businessEmail || undefined,
  businessPhone: r.businessPhone || undefined, status: r.status, createdAt: r.createdAt,
  designedTourId: r.designedTourId == null ? undefined : String(r.designedTourId),
  currentVersion: r.currentVersion || undefined,
  quotedPricePerPerson: r.quotedPricePerPerson || undefined,
});
export const requestAgencies = async (): Promise<TourCompany[]> =>
  (await http<AgencyChoice[]>("/tour-design-requests/agencies")).map((a) => ({
    id: a.id, name: a.name, address: a.address, phone: a.phone, email: a.email,
    logo: a.logoUrl || undefined,
    taxCode: "", adminId: a.id, createdAt: "", status: "approved" as const,
  }));
export const customerDesignRequests = async () =>
  (await http<RequestDto[]>("/tour-design-requests")).map(fromDto);
export const agencyDesignRequests = async () =>
  (await http<RequestDto[]>("/agency/tour-design-requests")).map(fromDto);
export const submitDesignRequest = async (r: Omit<CustomTourRequest, "id" | "createdAt" | "status">) =>
  fromDto(await http<RequestDto>("/tour-design-requests", { method: "POST", body: JSON.stringify({
    initialChanges: r.initialChanges, sourceTourId: r.sourceTourId ? Number(r.sourceTourId) : null, agencyId: r.targetCompanyId, contactName: r.contactName, contactEmail: r.contactEmail,
    contactPhone: r.contactPhone, destination: r.destinations,
    departureDate: r.departureDate, returnDate: r.returnDate,
    numberOfPeople: Number(r.numberOfPeople), budgetPerPerson: r.budgetPerPerson ? Number(r.budgetPerPerson) : null,
    hotelStars: r.hotelStars, additionalInfo: r.additionalInfo,
    businessName: r.businessName, businessEmail: r.businessEmail, businessPhone: r.businessPhone,
  }) }));
export const cancelDesignRequest = async (id: string) =>
  fromDto(await http<RequestDto>(`/tour-design-requests/${Number(id)}/cancel`, { method: "POST" }));
export const actOnDesignRequest = async (id: string, action: "review" | "reject", reason?: string) =>
  fromDto(await http<RequestDto>(`/agency/tour-design-requests/${Number(id)}/action`, {
    method: "POST", body: JSON.stringify({ action, reason }),
  }));
export const createDesignRequestTour = async (requestId: string, tour: Partial<Tour>) =>
  http<ApiTour>(`/agency/tour-design-requests/${Number(requestId)}/tours`, {
    method: "POST", body: JSON.stringify(toConfiguration(tour)),
  });
export const customerRequestTour = async (requestId: string) =>
  fromApiTour(await http<ApiTour>(`/tour-design-requests/${Number(requestId)}/tour`));
export const customerRequestPlans = async (requestId: string) =>
  (await http<ApiTour[]>(`/tour-design-requests/${Number(requestId)}/plans`)).map((t) => ({ ...fromApiTour(t), customRequestId: requestId }));
export const cloneDesignTour = async (requestId: string, tourId: string) =>
  fromApiTour(await http<ApiTour>(`/agency/tour-design-requests/${Number(requestId)}/clone`, { method: "POST", body: JSON.stringify({ tourId: Number(tourId) }) }));
export const shareDesignTour = async (requestId: string, revision: number, version: number) =>
  fromApiTour(await http<ApiTour>(`/agency/tour-design-requests/${Number(requestId)}/share`, { method: "POST", body: JSON.stringify({ revision, version }) }));
export const getDesignVersion = async (requestId: string, version: number) =>
  fromApiTour(await http<ApiTour>(`/agency/tour-design-requests/${Number(requestId)}/versions/${version}`));
export const saveDesignTour = async (requestId: string, tour: Partial<Tour>, revision?: number) =>
  fromApiTour(await http<ApiTour>(`/agency/tour-design-requests/${Number(requestId)}/tour`, { method: "PUT", body: JSON.stringify({ revision: revision ?? null, createNewVersion: tour.createNewVersion === true, version: tour.version, configuration: toConfiguration(tour), complete: tour.status === "completed", reason: tour.changeNote }) }));
