import { toast as sonner } from "sonner";

// Stable IDs prevent the same API error from appearing twice in nested screens.
function statusToast(type: "success" | "error" | "warning" | "info") {
  const duration = { success: 4000, error: 7000, warning: 6500, info: 5000 }[type];
  const show: typeof sonner.error = (message, options) => sonner[type](message, {
    duration,
    id: typeof message === "string" ? `${type}:${message}` : undefined,
    ...options,
  });
  return show;
}

export const toast = Object.assign((...args: Parameters<typeof sonner>) => sonner(...args), sonner, {
  success: statusToast("success"), error: statusToast("error"), warning: statusToast("warning"), info: statusToast("info"),
});
