import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Plus, X, Wallet } from "lucide-react";
import { http } from "@/app/lib/http";
import { toast } from "@/app/lib/notifications";
import { confirmAction } from "@/app/lib/notificationDialogs";
import type { BookingAgencyShare } from "@/app/types";
import type { BookingDto } from "@/app/services/wf05Bookings";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { VietnameseMoneyInput } from "@/app/components/ui/VietnameseMoneyInput";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { formatVietnamDateTime } from "@/app/services/payos";

interface FinancialChange {
  id:number; agencyId:string; agencyName:string; amount:number; reason:string;
  status:string; createdAt:string; reviewNote?:string; refundRequestId?:number;
  refundAmount:number; refundStatus?:string; hasRefundAccount:boolean;
}
export function BookingFinancialChangesPanel({bookingId,expectedTotal,isHost=false,customer=false,canAmend=false,agencies=[],onChanged,refreshKey}:
  {bookingId:string;expectedTotal:number;isHost?:boolean;customer?:boolean;canAmend?:boolean;agencies?:BookingAgencyShare[];onChanged?:(b:BookingDto)=>void;refreshKey?:unknown}) {
  const [rows,setRows]=useState<FinancialChange[]>([]);const [loadError,setLoadError]=useState("");
  const [open,setOpen]=useState(false);const [amount,setAmount]=useState("");const [agency,setAgency]=useState("");
  const [reason,setReason]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [review,setReview]=useState<FinancialChange|null>(null);const [reviewNote,setReviewNote]=useState("");
  const [refund,setRefund]=useState<FinancialChange|null>(null);const [bank,setBank]=useState("");const [account,setAccount]=useState("");const [holder,setHolder]=useState("");
  const key=useRef(crypto.randomUUID());const base=`/bookings/${bookingId}/financial-changes`;
  const load=useCallback(async()=>{try {setRows(await http<FinancialChange[]>(base));setLoadError("");}catch(e){setLoadError(e instanceof Error?e.message:"Không tải được đề nghị.");}},[base]);
  useEffect(()=>{void load();const reload=()=>void load();window.addEventListener("booking-financial-changed",reload);window.addEventListener("focus",reload);
    const timer=window.setInterval(()=>{if(document.visibilityState!=="hidden")void load();},15000);
    return()=>{window.clearInterval(timer);window.removeEventListener("booking-financial-changed",reload);window.removeEventListener("focus",reload);};},[load,refreshKey]);
  const money=(n:number)=>`${n>0?"+":""}${n.toLocaleString("vi-VN")}đ`;
  const submit=async()=>{if(busy)return;setBusy(true);setError("");try {
    await http(base,{method:"POST",body:JSON.stringify({amount:Number(amount),reason:reason.trim(),expectedTotal,requestId:key.current,agencyId:agency})});
    setOpen(false);await load();toast.success("Đã gửi đề nghị, chờ chủ trì phê duyệt.");
  }catch(e){setError(e instanceof Error?e.message:"Không gửi được đề nghị.");}finally{setBusy(false);}};
  const decide=async(row:FinancialChange,decision:"approve"|"reject")=>{
    if(busy)return;
    if(decision==="approve"&&!await confirmAction(`${row.agencyName}: ${money(row.amount)}. Khoản tăng tạo phụ thu; khoản giảm khấu trừ tiền chưa thu hoặc chuyển sang yêu cầu hoàn.`,{title:"Duyệt điều chỉnh tiền booking?",confirmLabel:"Duyệt điều chỉnh",tone:"warning"}))return;
    setBusy(true);setError("");try {
      const updated=await http<BookingDto>(`${base}/${row.id}/decision`,{method:"POST",body:JSON.stringify({decision,expectedTotal,note:reviewNote.trim()||null})});
      onChanged?.(updated);setReview(null);await load();toast.success(decision==="approve"?"Đã duyệt và cập nhật đúng phần tiền của Agency.":"Đã từ chối đề nghị.");
    }catch(e){setError(e instanceof Error?e.message:"Không xử lý được đề nghị.");toast.error(e instanceof Error?e.message:"Không xử lý được đề nghị.");}finally{setBusy(false);}
  };
  const saveAccount=async()=>{if(!refund||busy)return;setBusy(true);setError("");try {
    await http(`${base}/refunds/${refund.refundRequestId}/account`,{method:"PUT",body:JSON.stringify({bankName:bank,accountNumber:account,accountHolder:holder})});
    setRefund(null);await load();toast.success("Đã gửi tài khoản nhận hoàn tiền cho nền tảng.");
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được tài khoản.");}finally{setBusy(false);}};
  if(customer&&!rows.length&&!loadError)return null;
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold text-slate-900"><Wallet className="h-4 w-4 text-sky-800"/>{customer?"Các khoản điều chỉnh đã duyệt":"Điều chỉnh & Phụ thu"}</h3><p className="mt-1 text-xs text-slate-500">{customer?"Khoản giảm được khấu trừ tiền chưa thu; tiền đã trả dư được nền tảng xử lý hoàn.":"Đề nghị chỉ thay đổi tiền sau khi chủ trì phê duyệt. Từng khoản được ghi cho đúng Agency."}</p></div>
      {!customer&&<Button size="sm" variant="outline" disabled={!canAmend||busy} onClick={()=>{key.current=crypto.randomUUID();setAmount("");setReason("");setAgency(agencies.length===1?agencies[0].agencyId:"");setError("");setOpen(true);}}><Plus className="mr-1 h-4 w-4"/>Đề nghị tăng / giảm</Button>}</div>
    {loadError&&<NotificationMessage tone="error" message={loadError}/>}
    {!rows.length&&!loadError&&<p className="text-xs text-slate-500">Chưa có đề nghị điều chỉnh.</p>}
    {rows.map(row=><div key={row.id} className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`font-bold tabular-nums ${row.amount>0?"text-amber-700":"text-emerald-700"}`}>{money(row.amount)}{!customer&&` · ${row.agencyName}`}</span><span className={`rounded-full px-2 py-1 ${row.status==="Pending"?"bg-amber-50 text-amber-800":row.status==="Approved"?"bg-emerald-50 text-emerald-800":"bg-rose-50 text-rose-700"}`}>{row.status==="Pending"?"Chờ chủ trì duyệt":row.status==="Approved"?"Đã duyệt":"Đã từ chối"}</span></div><p className="whitespace-pre-wrap text-slate-700">{row.reason}</p><div className="flex flex-wrap items-center justify-between gap-2 text-slate-500"><span>{formatVietnamDateTime(row.createdAt)}</span>{!customer&&isHost&&row.status==="Pending"&&<div className="flex gap-2"><Button size="sm" variant="outline" disabled={!canAmend||busy} onClick={()=>void decide(row,"approve")}><Check className="mr-1 h-3 w-3"/>Duyệt</Button><Button size="sm" variant="outline" disabled={!canAmend||busy} onClick={()=>{setReview(row);setReviewNote("");setError("");}}><X className="mr-1 h-3 w-3"/>Từ chối</Button></div>}</div>{row.reviewNote&&<p className="text-slate-600">Phản hồi chủ trì: {row.reviewNote}</p>}
      {!!row.refundRequestId&&<div className="space-y-2 rounded-lg bg-sky-50 p-3 text-sky-900"><p>Hoàn tiền: <strong>{row.refundAmount.toLocaleString("vi-VN")}đ</strong> · {row.refundStatus==="Completed"?"Đã hoàn":row.refundStatus==="Approved"?"Đang chuyển tiền":row.hasRefundAccount?"Chờ nền tảng xử lý":"Cần tài khoản nhận hoàn"}</p>{customer&&(row.refundStatus==="Pending"||row.refundStatus==="Reviewing")&&<Button size="sm" variant="outline" onClick={()=>{setRefund(row);setBank("");setAccount("");setHolder("");setError("");}}>{row.hasRefundAccount?"Cập nhật tài khoản hoàn":"Nhập tài khoản nhận hoàn"}</Button>}</div>}
    </div>)}
    <Dialog open={open} onOpenChange={next=>!busy&&setOpen(next)}><DialogContent className="sm:max-w-[540px]"><DialogHeader><DialogTitle>Đề nghị điều chỉnh tiền</DialogTitle></DialogHeader><p className="text-xs text-slate-500">Nhập số dương để tăng, số âm để giảm tiền khách phải trả. Chi phí nhà cung cấp thay đổi không tự động làm thay đổi giá bán.</p><label className="space-y-1 text-sm font-medium">Agency nhận / chịu khoản điều chỉnh<select value={agency} onChange={e=>setAgency(e.target.value)} className="h-10 w-full rounded-lg border bg-white px-3"><option value="">Chọn Agency</option>{agencies.map(a=><option key={a.agencyId} value={a.agencyId}>{a.agencyName}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Số tiền tăng / giảm (VNĐ)<VietnameseMoneyInput signed value={amount} onValueChange={setAmount} className="h-10 w-full rounded-lg border px-3" placeholder="VD: +100.000 hoặc -100.000"/></label><textarea rows={3} maxLength={240} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Lý do và thỏa thuận với khách" className="w-full rounded-lg border p-3 text-sm"/>{error&&<NotificationMessage tone="error" message={error}/>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Hủy</Button><Button disabled={busy||!agency||!Number.isSafeInteger(Number(amount))||Number(amount)===0||reason.trim().length<3} onClick={submit}>Gửi đề nghị</Button></div></DialogContent></Dialog>
    <Dialog open={!!review} onOpenChange={next=>!busy&&!next&&setReview(null)}><DialogContent><DialogHeader><DialogTitle>Từ chối đề nghị</DialogTitle></DialogHeader><textarea rows={3} maxLength={240} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Lý do từ chối" className="rounded-lg border p-3"/>{error&&<NotificationMessage tone="error" message={error}/>}<Button disabled={busy||reviewNote.trim().length<3} onClick={()=>review&&void decide(review,"reject")}>Xác nhận từ chối</Button></DialogContent></Dialog>
    <Dialog open={!!refund} onOpenChange={next=>!busy&&!next&&setRefund(null)}><DialogContent><DialogHeader><DialogTitle>Tài khoản nhận hoàn tiền</DialogTitle></DialogHeader>{[["Ngân hàng",bank,setBank],["Số tài khoản",account,setAccount],["Tên chủ tài khoản",holder,setHolder]].map(([label,value,setter])=><label key={String(label)} className="space-y-1 text-sm">{String(label)}<input value={String(value)} onChange={e=>(setter as (s:string)=>void)(e.target.value)} maxLength={100} className="h-10 w-full rounded-lg border px-3"/></label>)}{error&&<NotificationMessage tone="error" message={error}/>}<Button disabled={busy||!bank.trim()||!account.trim()||!holder.trim()} onClick={saveAccount}>Lưu tài khoản</Button></DialogContent></Dialog>
  </section>;
}
