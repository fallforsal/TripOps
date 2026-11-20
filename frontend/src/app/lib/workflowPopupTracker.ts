/** Minimal shape returned by GET /api/v1/notifications. */
export interface PopupNotice {
  id: number;
  readAt: string | null;
}

/**
 * Identifies newly arrived notifications without replaying the existing inbox.
 *
 * - First successful fetch establishes the baseline.
 * - An authenticated SignalR hint can override a first-load race.
 * - Later API refreshes show only IDs newer than the baseline's high-water mark
 *   (including polling fallback when SignalR is offline).
 * - Repeated hints, reconnects and simultaneous refreshes do not re-toast an ID.
 */
export class WorkflowPopupTracker {
  private initialized = false;
  private highestId = 0;
  private readonly knownIds = new Set<number>();
  private readonly shownIds = new Set<number>();
  private readonly signaledIds = new Set<number>();

  signal(id: unknown): void {
    if (typeof id === "number" && Number.isSafeInteger(id) && id > 0 &&
        !this.shownIds.has(id)) this.signaledIds.add(id);
  }

  collect<T extends PopupNotice>(notices: readonly T[]): T[] {
    const baseline = !this.initialized;
    const previousHighest = this.highestId;
    const incoming: T[] = [];

    for (const notice of notices) {
      const id = notice.id;
      if (!Number.isSafeInteger(id) || id < 1) continue;
      const unknown = !this.knownIds.has(id);
      const signaled = this.signaledIds.delete(id);
      const newSinceBaseline = !baseline && unknown && id > previousHighest;
      if (notice.readAt == null && !this.shownIds.has(id) &&
          (signaled || newSinceBaseline)) {
        this.shownIds.add(id);
        incoming.push(notice);
      }
      this.knownIds.add(id);
      this.highestId = Math.max(this.highestId, id);
    }

    this.initialized = true;
    return incoming;
  }
}
