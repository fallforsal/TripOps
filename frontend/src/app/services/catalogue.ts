import { http } from "@/app/lib/http";
import type { Service } from "@/app/types";
export async function fetchCatalogue(): Promise<Service[]> {
  return http<Service[]>("/catalogue");
}
