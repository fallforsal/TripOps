import { useState } from "react";
import type { Tour, TourCompany } from "@/app/types";
import { TourFormPage } from "@/app/components/agency/AgencyTourManagement";

type ProposalDraft = { itinerary: Tour["itinerary"]; hotels: Tour["hotels"]; message: string };

export function CustomerPlanEditor({ requestId, plan, onDone, onCancel, onSaveDraft }: {
  onSaveDraft?: (draft: ProposalDraft) => void;
  requestId: string; plan: Tour; onDone: () => void; onCancel: () => void;
}) {
  const [requestedChanges, setRequestedChanges] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const company = { id: plan.companyId || "", name: plan.companyName || "Agency", logo: plan.companyLogo || "" } as TourCompany;
  // All edits remain in the shared editor's local state. Only a change request is sent.
  const submit = async (edited: Partial<Tour>) => {
    if (!message.trim()) throw new Error("Hãy ghi rõ Agency cần xem hoặc thay đổi điều gì.");
    const draft = { itinerary: structuredClone(edited.itinerary || []), hotels: structuredClone(edited.hotels || []) };
    if (onSaveDraft) onSaveDraft({ ...draft, message: message.trim() });
    else throw new Error("Vui lòng trao đổi trực tiếp với Agency trong yêu cầu thiết kế.");
    onDone();
  };
  return <TourFormPage customerMode company={company}
    tour={{ ...structuredClone(plan), isCoHosted: false, coHosts: [] }}
    onBack={onCancel} onSubmit={submit}
    customerSubmitLabel={onSaveDraft ? "Lưu đề xuất vào yêu cầu" : "Gửi yêu cầu thay đổi cho Agency"}
    customerContent={<div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        {([["numberOfPeople", "Số khách mong muốn"], ["budgetPerPerson", "Ngân sách/người"], ["hotelStars", "Tiêu chuẩn khách sạn"], ["departureDate", "Ngày khởi hành"], ["returnDate", "Ngày kết thúc"]] as const).map(([key, label]) => <label key={key}>{label}
          <input className="block w-full border rounded p-2" type={key.includes("Date") ? "date" : "number"} min={key.includes("Date") ? undefined : "1"}
            value={requestedChanges[key] || ""} onChange={(e) => setRequestedChanges({ ...requestedChanges, [key]: e.target.value })} />
        </label>)}
      </div>
      <label className="block">Lời nhắn cho Agency<textarea aria-label="Lời nhắn cho Agency" className="mt-1 w-full rounded border p-2" rows={4}
        placeholder="Nêu thay đổi, nhu cầu riêng hoặc thông tin cần Agency báo giá lại…" value={message} onChange={(e) => setMessage(e.target.value)} /></label>
    </div>} />;
}
