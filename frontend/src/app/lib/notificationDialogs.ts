export type NotificationTone = "info" | "success" | "warning" | "error";
export type NotificationDialogOptions = {
  title?: string;
  confirmLabel?: string;
  tone?: NotificationTone;
};
export type NotificationDialogRequest = NotificationDialogOptions & {
  id: number;
  kind: "confirm" | "input";
  message: string;
  initialValue?: string;
};

// Dialogs are queued so concurrent requests cannot replace another pending decision.
export function createNotificationDialogQueue() {
  let nextId = 0;
  const pending: Array<{ request: NotificationDialogRequest; resolve: (value: string | boolean | null) => void }> = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    snapshot: () => pending[0]?.request ?? null,
    enqueue(request: Omit<NotificationDialogRequest, "id">) {
      return new Promise<string | boolean | null>(resolve => {
        pending.push({ request: { ...request, id: ++nextId }, resolve }); emit();
      });
    },
    respond(id: number, value: string | boolean | null) {
      if (pending[0]?.request.id !== id) return;
      const item = pending.shift()!;
      item.resolve(value); emit();
    },
    cancelAll() {
      const cancelled = pending.splice(0);
      cancelled.forEach(item => item.resolve(item.request.kind === "input" ? null : false)); emit();
    },
  };
}

export const notificationDialogs = createNotificationDialogQueue();
export async function confirmAction(message: string, options: NotificationDialogOptions = {}): Promise<boolean> {
  return (await notificationDialogs.enqueue({ kind: "confirm", message, ...options })) === true;
}
export async function requestText(message: string, initialValue = "", options: NotificationDialogOptions = {}): Promise<string | null> {
  const result = await notificationDialogs.enqueue({ kind: "input", message, initialValue, ...options });
  return typeof result === "string" ? result : null;
}

export function confirmationTone(message: string): NotificationTone {
  return /xóa|xoá|hủy|huỷ|thu hồi|rút |gỡ bỏ|từ chối/i.test(message) ? "error" : "warning";
}
