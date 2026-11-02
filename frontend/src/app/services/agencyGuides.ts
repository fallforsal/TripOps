import { http } from "@/app/lib/http";
import type { ChangeGuidePasswordRequest } from "@/app/components/agency/agencyGuideTypes";
import type { AgencyGuideProfile, AgencyGuideListResponse, AgencyGuideDetailResponse,
  CreateAgencyGuideRequest, UpdateAgencyGuideRequest, UpdateGuideAccountStatusRequest,
  UpdateGuideAccountStatusResponse, ListAgencyGuidesQuery } from "@/app/components/agency/agencyGuideTypes";

export const listAgencyGuides = (query: ListAgencyGuidesQuery = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return http<AgencyGuideListResponse>(`/agency/guides?${params}`, { signal });
};
export const getAgencyGuide = (id: string, signal?: AbortSignal) =>
  http<AgencyGuideDetailResponse>(`/agency/guides/${encodeURIComponent(id)}`, { signal });
export const createAgencyGuide = ({ password, ...profile }: CreateAgencyGuideRequest) =>
  http<AgencyGuideProfile>("/agency/guides", { method: "POST", body: JSON.stringify({ profile, password }) });
export const updateAgencyGuide = (id: string, request: UpdateAgencyGuideRequest) =>
  http<AgencyGuideProfile>(`/agency/guides/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(request) });
export const changeGuideAccountStatus = ({ guideId, ...request }: UpdateGuideAccountStatusRequest) =>
  http<UpdateGuideAccountStatusResponse>(`/agency/guides/${encodeURIComponent(guideId)}/account-status`, {
    method: "PATCH", body: JSON.stringify(request),
  });
export const deleteAgencyGuide = (id: string) =>
  http<void>(`/agency/guides/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getGuideAssignments = (id: string, status = "all") =>
  http<{ guideId: string; items: NonNullable<AgencyGuideProfile["assignments"]> }>(`/agency/guides/${encodeURIComponent(id)}/assignments?status=${encodeURIComponent(status)}`);

export async function getAllAgencyGuides(): Promise<AgencyGuideProfile[]> {
  const items: AgencyGuideProfile[] = [];
  for (let page = 1; ; page++) {
    const result = await listAgencyGuides({ page, pageSize: 100 });
    items.push(...result.items.map(g => ({ ...g, guideStatus: g.mobileAccountStatus === "active" ? "active" as const : "inactive" as const })));
    if (items.length >= result.total || result.items.length === 0) return items;
  }
}

export const changeAgencyGuidePassword = (
  guideId: string,
  request: ChangeGuidePasswordRequest,
) => http<void>(`/agency/guides/${encodeURIComponent(guideId)}/password`, {
  method: "PUT",
  body: JSON.stringify(request),
});
