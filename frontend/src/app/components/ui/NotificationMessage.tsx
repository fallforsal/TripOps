import { useEffect, useRef } from "react";
import { toast } from "@/app/lib/notifications";
import type { NotificationTone } from "@/app/lib/notificationDialogs";

// Adapts existing async result state to the shared toast host without changing API flows.
export function NotificationMessage({ message, tone = "error" }: { message: string; tone?: NotificationTone }) {
  const previous = useRef("");
  useEffect(() => {
    const key = `${tone}:${message}`;
    if (message.trim() && previous.current !== key) {
      previous.current = key;
      toast[tone](message);
    }
  }, [message, tone]);
  return null;
}
