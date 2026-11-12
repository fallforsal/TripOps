import type { TourCoHost } from "../types/index";

// The request's target Agency is the sole lead; a stale second lead is not an invitation.
export function normalizeDesignHosts(hosts: TourCoHost[] | undefined, leadId: string): TourCoHost[] {
  const seen=new Set<string>();
  return (hosts || []).filter(host=>{
    if(!host.companyId || seen.has(host.companyId) || host.role==="lead" && host.companyId!==leadId || host.status==="rejected")return false;
    seen.add(host.companyId);return true;
  }).map(host=>({...host,role:host.companyId===leadId?"lead" as const:"partner" as const}));
}
export const hasDesignPartners=(hosts:TourCoHost[] | undefined) => !!hosts?.some(host=>host.role==="partner" && host.status!=="rejected");

type Request = {id:string;targetCompanyId:string;archivedAt?:string;status:string;coHosts?:TourCoHost[]};
type Tour = {id:string;companyId?:string;customRequestId?:string;coHosts?:TourCoHost[]};
export function countPendingCoHostInvites(requests:Request[],tours:Tour[],companyId:string):number {
  const pending=(hosts:TourCoHost[] | undefined)=>hosts?.some(h=>h.companyId===companyId && h.role==="partner" && h.status==="pending");
  const ids=new Set<string>();
  for(const request of requests)if(request.targetCompanyId!==companyId && !request.archivedAt && ["reviewing","designed"].includes(request.status) && pending(normalizeDesignHosts(request.coHosts,request.targetCompanyId)))ids.add(`request:${request.id}`);
  // Design invitations come from the request API, not a second copy in the tour list.
  for(const tour of tours) {
    const leadId=tour.companyId || tour.coHosts?.find(h=>h.role==="lead")?.companyId;
    if(leadId && !tour.customRequestId && leadId!==companyId && pending(normalizeDesignHosts(tour.coHosts,leadId)))ids.add(`tour:${tour.id}`);
  }
  return ids.size;
}
