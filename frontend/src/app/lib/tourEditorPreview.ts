import type { Tour } from "../types/index";

// Render the Customer's total prices using current form inputs, without saving a draft.
export function customerTourPreview(draft: Tour, pricingAgencyId?: string): Tour {
  const accepted = draft.coHosts?.filter(host => host.status === "accepted") || [];
  const priceTable = (draft.priceTable || []).map(row => ({ ...row, price: pricingAgencyId
    ? row.price + accepted.filter(host => host.companyId !== pricingAgencyId).reduce((sum, host) => {
      const tiers = draft.agencyPricing?.find(pricing => pricing.agencyId === host.companyId)?.tiers || [];
      const tier = tiers.find(tier => row.tierKey && tier.key === row.tierKey)
        ?? tiers.find(tier => !tier.key && tier.minAge === (row.minAge ?? null) && tier.maxAge === (row.maxAge ?? null));
      return sum + (tier?.pricePerGuest || 0);
    }, 0)
    : row.ageGroup === "adult" ? draft.price : row.price }));
  const adult = priceTable.find(row => row.ageGroup === "adult" || (row.maxAge ?? 150) >= 100);
  return { ...draft, priceTable, price: pricingAgencyId ? adult?.price ?? draft.price : draft.price,
    agencyPricing: undefined, coHosts: accepted, isCoHosted: accepted.some(host => host.role === "partner") };
}
