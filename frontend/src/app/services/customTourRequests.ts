import { http } from "@/app/lib/http";
import type { CustomTourRequest, Tour, TourCompany } from "@/app/types";
import { fromApiTour, toConfiguration, type ApiTour } from "@/app/services/wf02Tours";

type RequestDto = {
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
    agencyId: r.targetCompanyId, contactName: r.contactName, contactEmail: r.contactEmail,
    contactPhone: r.contactPhone, destination: r.destinations,
    departureDate: r.departureDate, returnDate: r.returnDate,
    numberOfPeople: Number(r.numberOfPeople), budgetPerPerson: r.budgetPerPerson ? Number(r.budgetPerPerson) : null,
    hotelStars: r.hotelStars, additionalInfo: r.additionalInfo,
    businessName: r.businessName, businessEmail: r.businessEmail, businessPhone: r.businessPhone,
  }) }));
export const cancelDesignRequest = async (id: string) =>
  fromDto(await http<RequestDto>(`/tour-design-requests/${Number(id)}/cancel`, { method: "POST" }));
export const actOnDesignRequest = async (id: string, action: "review" | "reject") =>
  fromDto(await http<RequestDto>(`/agency/tour-design-requests/${Number(id)}/action`, {
    method: "POST", body: JSON.stringify({ action }),
  }));
export const createDesignRequestTour = async (requestId: string, tour: Partial<Tour>) =>
  http<ApiTour>(`/agency/tour-design-requests/${Number(requestId)}/tours`, {
    method: "POST", body: JSON.stringify(toConfiguration(tour)),
  });
export const customerRequestTour = async (requestId: string) =>
  fromApiTour(await http<ApiTour>(`/tour-design-requests/${Number(requestId)}/tour`));
export const customerRequestPlans = async (requestId: string) =>
  (await http<ApiTour[]>(`/tour-design-requests/${Number(requestId)}/plans`)).map(fromApiTour);
export type TourPlanProposal = { id: number; requestId: number; tourId: number; baseTourVersion: number;
  proposal: Pick<Tour, "itinerary" | "hotels">; message: string; status: string;
  agencyReply: string | null; createdAt: string; respondedAt: string | null };
export const customerPlanProposals = (requestId: string) =>
  http<TourPlanProposal[]>(`/tour-design-requests/${Number(requestId)}/proposals`);
export const agencyPlanProposals = (requestId: string) =>
  http<TourPlanProposal[]>(`/agency/tour-design-requests/${Number(requestId)}/proposals`);
export const submitPlanProposal = (requestId: string, plan: Tour, proposal: TourPlanProposal["proposal"], message: string) =>
  http<TourPlanProposal>(`/tour-design-requests/${Number(requestId)}/proposals`, { method: "POST",
    body: JSON.stringify({ tourId: Number(plan.id), baseTourVersion: plan.version || 1, proposal, message }) });
export const replyPlanProposal = (requestId: string, proposalId: number, decision: "reviewed" | "needs_changes", message: string) =>
  http<TourPlanProposal>(`/agency/tour-design-requests/${Number(requestId)}/proposals/${proposalId}/reply`, {
    method: "POST", body: JSON.stringify({ decision, message }) });
