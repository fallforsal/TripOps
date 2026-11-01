import type { Tour } from "@/app/types";

export interface TourSearchCriteria {
  destination: string;
  departureDate: string;
  guests: string;
}
export const emptyTourSearch: TourSearchCriteria = {
  destination: "",
  departureDate: "",
  guests: "",
};
export function normalizeDestination(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}
export function matchesTourSearch(tour: Tour, criteria: TourSearchCriteria) {
  const term = normalizeDestination(criteria.destination);
  if (
    term &&
    !normalizeDestination(`${tour.destination} ${tour.name}`).includes(term)
  )
    return false;
  const guests = Number(criteria.guests);
  if (
    guests > 0 &&
    ((tour.maxGuests > 0 && guests > tour.maxGuests) ||
      (tour.minGuests > 0 && guests < tour.minGuests))
  )
    return false;
  // Free-form operation periods do not promise live availability.
  if (
    criteria.departureDate &&
    !tour.operationPeriod &&
    tour.departureDates?.length
  ) {
    return tour.departureDates.some(
      (d) =>
        d.date.slice(0, 10) === criteria.departureDate &&
        (d.seatsAvailable == null || d.seatsAvailable >= (guests || 1)),
    );
  }
  return true;
}
