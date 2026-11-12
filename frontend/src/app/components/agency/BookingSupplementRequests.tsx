import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { useState } from "react";
import { Building2, Eye, RefreshCw, Users, Utensils } from "lucide-react";
import type { BookingPassenger } from "@/app/types";
import type { BookingSupplierRequest, BookingSupplierState } from "@/app/lib/bookingSupplierStatus";
import { http } from "@/app/lib/http";
import { toast } from "@/app/lib/notifications";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { BookingServicePicker, type BookingReplacement } from "./BookingServicePicker";

const serviceLabels: Record<string,string> = {External:"Agency làm việc trực tiếp",Pending:"Chờ Provider xác nhận dịch vụ",Confirmed:"Đã xác nhận dịch vụ",Rejected:"Provider từ chối dịch vụ"};
const labels: Record<string,string> = {Pending:"Chờ Provider nhận thêm khách",Confirmed:"Đã xác nhận khách bổ sung",Rejected:"Không thể nhận thêm khách",Cancelled:"Đã hủy phần bổ sung",CounterOffered:"Provider đề nghị báo giá",Partial:"Provider chỉ đáp ứng một phần"};
export function BookingSupplementRequests({state,passengers,viewerAgencyId,canAmend,onOpenService}:
  {state:BookingSupplierState;passengers:BookingPassenger[];viewerAgencyId?:string;canAmend:boolean;onOpenService:(id:string)=>void}) {
  const [editing,setEditing]=useState<BookingSupplierRequest|null>(null);
  const [choice,setChoice]=useState<BookingReplacement|null>(null);const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const rows=state.requests.filter(r=>r.parentRequestId && r.status!=="Superseded");
  if(!rows.length)return null;
  const names=(r:BookingSupplierRequest)=>{
    let indices:number[]=[];try {indices=JSON.parse(r.participantIndicesJson||"[]");}catch {return [];}
    return passengers.filter(p=>p.agencyId===r.ownerAgencyId && indices.includes(p.participantIndex??-1) && p.status!=="INACTIVE").map(p=>p.fullName);
  };
  const save=async()=>{
    if(!editing||(!choice?.serviceId&&!choice?.agencySupplierId)||busy)return;setBusy(true);setError("");
    try {
      await http(`/bookings/${state.bookingId}/quotations/supplier-requests/${editing.id}/replace-supplement`,{method:"POST",body:JSON.stringify({serviceId:choice?.serviceId,agencySupplierId:choice?.agencySupplierId,reason:reason.trim()})});
      setEditing(null);window.dispatchEvent(new Event("booking-suppliers-changed"));
      toast.success(choice?.agencySupplierId ? "Đã lưu nhà cung cấp riêng cho khách bổ sung. Agency tự liên hệ xác nhận." : "Đã gửi yêu cầu mới cho riêng khách bổ sung. Khách cũ giữ nguyên dịch vụ.");
    }catch(e){setError(e instanceof Error?e.message:"Không gửi được yêu cầu mới.");}finally{setBusy(false);}
  };
  return <section className="space-y-3 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
    <div><h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Users className="h-4 w-4 text-violet-700"/>Dịch vụ cho khách bổ sung</h2>
      <p className="mt-1 text-xs text-slate-500">Yêu cầu đã gửi đến Provider đang chọn. Phần khách cũ đã xác nhận giữ nguyên; chỉ tìm dịch vụ khác sau khi Provider không thể nhận thêm.</p></div>
    {rows.map(r=>{const people=names(r);const hotel=r.slotKey.startsWith("hotel:");const Icon=hotel?Building2:Utensils;return <article key={r.id} className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 font-semibold text-slate-900"><Icon className="h-4 w-4 text-violet-700"/>{r.serviceName}</p><p className="mt-1 text-slate-500">{r.providerName}</p></div>
        <span className={`rounded-full px-2 py-1 font-medium ${r.status==="Confirmed"?"bg-emerald-50 text-emerald-800":r.status==="Rejected"?"bg-rose-50 text-rose-800":"bg-amber-50 text-amber-800"}`}>{(!r.isSupplement ? serviceLabels[r.status] : undefined)||labels[r.status]||r.status}</span></div>
      {!!people.length&&<p className="leading-relaxed text-slate-700">{r.isSupplement ? "Khách bổ sung" : "Khách sử dụng dịch vụ"}: <strong>{people.join(", ")}</strong></p>}
      <p className="text-slate-500">{hotel?"Lưu trú":"Bữa ăn"}: {r.serviceDateFrom?.slice(0,10).split("-").reverse().join("/")}{hotel&&r.serviceDateTo&&` → ${r.serviceDateTo.slice(0,10).split("-").reverse().join("/")}`}</p>
      {r.note&&<p className="whitespace-pre-wrap text-slate-700">{r.agencySupplierId ? "Ghi chú Agency" : "Phản hồi Provider"}: {r.note}</p>}
      {r.quotedCost!=null&&<p className="text-slate-700">Giá phần bổ sung: <strong>{r.quotedCost.toLocaleString("vi-VN")}đ</strong></p>}
      <div className="flex flex-wrap items-center gap-2">{r.serviceId&&<Button size="sm" variant="outline" onClick={()=>onOpenService(String(r.serviceId))}><Eye className="mr-1 h-3.5 w-3.5"/>Xem bài dịch vụ</Button>}
        <ChatWithButton userId={r.providerId} context={{kind:"booking",id:Number(state.bookingId),title:r.serviceName}}>Nhắn Provider</ChatWithButton>
        {r.agencySupplierId&&<p className="text-slate-500">{r.fullAddress}{r.providerPhone&&<> · <a href={`tel:${r.providerPhone}`}>{r.providerPhone}</a></>}</p>}
        {r.ownerAgencyId===viewerAgencyId&&r.status==="Rejected"&&<Button size="sm" disabled={!canAmend} onClick={()=>{setEditing(r);setChoice(null);setReason("Provider không thể nhận thêm khách");setError("");}}><RefreshCw className="mr-1 h-3.5 w-3.5"/>Tìm dịch vụ khác cho khách bổ sung</Button>}
        {r.status==="Pending"&&<span className="text-slate-500">Đang chờ Provider phản hồi.</span>}</div>
    </article>})}
    <Dialog open={!!editing} onOpenChange={open=>!busy&&!open&&setEditing(null)}><DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-[760px]"><DialogHeader><DialogTitle>Bố trí dịch vụ riêng cho khách bổ sung</DialogTitle></DialogHeader>
      <div className="space-y-4 overflow-y-auto pr-1 text-sm"><p className="rounded-lg bg-violet-50 p-3 text-xs text-violet-900">Chỉ gửi yêu cầu cho: {editing&&names(editing).join(", ")}. Khách cũ tiếp tục sử dụng dịch vụ đã xác nhận.</p>
      <BookingServicePicker allowManual={false} kind={editing?.slotKey.startsWith("hotel:")?"hotel":"meal"} value={choice} onChange={setChoice}/>
      <label className="block space-y-1 font-medium">Lý do thay thế<textarea rows={2} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-lg border p-3 text-sm"/></label>
      <p className="text-xs text-slate-500">Giá Provider báo chỉ là chi phí phần bổ sung. Giá tour đã chốt không đổi; nếu cần thu/giảm thêm tiền, gửi đề nghị điều chỉnh để chủ trì phê duyệt.</p>{error&&<p role="alert" className="text-sm text-rose-700">{error}</p>}</div>
      <div className="flex justify-end gap-2 border-t pt-3"><Button variant="outline" disabled={busy} onClick={()=>setEditing(null)}>Hủy</Button><Button disabled={busy||(!choice?.serviceId&&!choice?.agencySupplierId)|| (!!choice?.serviceId && choice.serviceId===editing?.serviceId)||reason.trim().length<3} onClick={save}>{busy?"Đang lưu…":choice?.agencySupplierId?"Lưu nhà cung cấp riêng":"Gửi yêu cầu mới"}</Button></div>
    </DialogContent></Dialog>
  </section>;
}
