interface TourState { id?: string; status?: string; visibility?: string; createdAt?: string }

export function publicTourSaveState(tour?: TourState | null) {
  const isPublished = (tour?.status === "completed" || tour?.status === "published" || (tour && !tour.status)) && tour?.visibility !== "hidden";
  return {
    status: "completed",
    visibility: isPublished ? "public" : "hidden",
  } as const;
}

export function compareTourCreation(a: TourState, b: TourState): number {
  const timestamp = (s?: string) => s && Number.isFinite(Date.parse(s)) ? Date.parse(s) : 0;
  return timestamp(b.createdAt) - timestamp(a.createdAt)
    || Number(b.id?.replace(/^tour-/, "") || 0) - Number(a.id?.replace(/^tour-/, "") || 0);
}

export function tourStatusOrder(tour: TourState): number {
  const isPublished = (tour.status === "completed" || tour.status === "published" || !tour.status) && tour.visibility !== "hidden";
  return isPublished ? 0 : 1;
}

export function emptyTourDays(count: number, destination: string) {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: `day-${index + 1}`, day: index + 1, title: "", description: "",
    destinationCity: destination, locations: [], meals: [],
  }));
}
