import { http } from "@/app/lib/http";
export const getAgencySubscription = () => http<{ active: boolean }>("/agency/subscription");
export const setAgencySubscription = (active: boolean) => http<{ active: boolean }>("/agency/subscription", {
  method: "PUT", body: JSON.stringify({ active }),
});
