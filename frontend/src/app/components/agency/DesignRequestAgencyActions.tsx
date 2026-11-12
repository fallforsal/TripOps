import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { CustomTourRequest } from "@/app/types";

export type DesignRequestDecision = "reviewing" | "rejected";

interface Props {
  request: CustomTourRequest;
  hasTour: boolean;
  busy: boolean;
  onDecide: (request: CustomTourRequest, decision: DesignRequestDecision) => Promise<void>;
}

export function DesignRequestAgencyActions({ request, hasTour, busy, onDecide }: Props) {
  if (hasTour || (request.status !== "pending" && request.status !== "reviewing")) return null;

  return (
    <>
      {request.status === "pending" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          title="Xác nhận Agency có thể tiếp nhận và thiết kế tour này"
          onClick={() => void onDecide(request, "reviewing")}
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Tiếp nhận
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
        title="Agency không thể tổ chức tour theo yêu cầu này"
        onClick={() => void onDecide(request, "rejected")}
      >
        <XCircle className="w-3.5 h-3.5" />
        Từ chối
      </Button>
    </>
  );
}
