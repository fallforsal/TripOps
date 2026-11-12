interface TourState { id?: string; status?: string; visibility?: string; createdAt?: string }

export function publicTourSaveState(tour?: TourState | null) {
  return {
    status: tour?.status === "completed" || tour?.status === "published" ? "completed" : "draft",
    visibility: tour && tour.status !== "draft" && tour.visibility !== "hidden" ? "public" : "hidden",
  } as const;
}

export function compareTourCreation(a: TourState, b: TourState): number {
  const timestamp = (s?: string) => s && Number.isFinite(Date.parse(s)) ? Date.parse(s) : 0;
  return timestamp(b.createdAt) - timestamp(a.createdAt)
    || Number(b.id?.replace(/^tour-/, "") || 0) - Number(a.id?.replace(/^tour-/, "") || 0);
}

export function tourStatusOrder(tour: TourState): number {
  return tour.status === "draft" ? 2 : tour.visibility === "hidden" ? 1 : 0;
}

export function emptyTourDays(count: number, destination: string) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: `day-${index + 1}`, day: index + 1, title: "", description: "",
    destinationCity: destination, locations: [], meals: [],
  }));
}
