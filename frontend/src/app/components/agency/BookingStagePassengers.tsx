import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import type { Booking, BookingPassenger } from "@/app/types";
import type { BookingDto } from "@/app/services/wf05Bookings";
import * as XLSX from "xlsx";
import { toast } from "@/app/lib/notifications";
import { passengerExportRows } from "@/app/lib/passengerExport";
import { http } from "@/app/lib/http";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

export function BookingStagePassengers({ booking, rows, isHost, canAmend, onAdd, onEdit, onChanged, viewerAgencyId }:
  {booking:Booking;rows:BookingPassenger[];isHost:boolean;canAmend:boolean;onAdd:()=>void;onEdit:(p:BookingPassenger)=>void;onChanged:(dto:BookingDto)=>void;viewerAgencyId?:string}) {
  const [collapsed,setCollapsed]=useState(false);
  const [stage,setStage]=useState("all");const [editing,setEditing]=useState<BookingPassenger|null>(null);
  const [selected,setSelected]=useState<string[]>([]);const [reason,setReason]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const agencies=(booking.bookingAgencies||[]).filter(a=>isHost || a.agencyId===viewerAgencyId);
  const visibleRows=isHost?rows:rows.filter(p=>p.agencyId===viewerAgencyId && p.status!=="INACTIVE");
  const groups=useMemo(()=>{
    const result=new Map<string,BookingPassenger[]>();for(const row of visibleRows){const key=String(row.participantIndex??row.id);result.set(key,[...(result.get(key)||[]),row]);}return [...result.values()];
  },[rows,isHost,viewerAgencyId]);
  const visible=groups.filter(group=>group.some(p=>p.status!=="INACTIVE")).flatMap(group=>{
    if(isHost && stage!=="all")return group.filter(p=>p.agencyId===stage && p.status!=="INACTIVE");
    const active=group.filter(p=>p.status!=="INACTIVE");const person=active.find(p=>p.isPrimary)||active[0]||group[0];
    return [{...person,price:active.reduce((sum,p)=>sum+(p.price||0),0),status:active.length?"ACTIVE" as const:"INACTIVE" as const}];
  });
  const money=(n:number)=>`${n.toLocaleString("vi-VN")}đ`;
  const open=(p:BookingPassenger)=>{setEditing(p);setSelected(rows.filter(r=>r.participantIndex===p.participantIndex && r.status!=="INACTIVE" && (stage==="all" || r.agencyId===stage)).map(r=>r.agencyId||booking.companyId||""));setReason("");setError("");};
  const save=async()=>{if(!editing||busy)return;setBusy(true);setError("");try{
    const dto=await http<BookingDto>(`/agency/bookings/${booking.id}/participants/${editing.participantIndex}/stages`,{method:"PUT",body:JSON.stringify({agencyIds:rows.filter(r=>r.participantIndex===editing.participantIndex && r.status!=="INACTIVE" && !selected.includes(r.agencyId||booking.companyId||"")).map(r=>r.agencyId||booking.companyId||""),reason:reason.trim(),expectedTotal:booking.totalPrice,requestId:crypto.randomUUID()})});
    onChanged(dto);setEditing(null);window.dispatchEvent(new Event("booking-suppliers-changed"));
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được chặng tham gia.");}finally{setBusy(false);}};
  const names=(p:BookingPassenger)=>rows.filter(r=>r.participantIndex===p.participantIndex && r.status!=="INACTIVE").map(r=>agencies.find(a=>a.agencyId===r.agencyId)?.agencyName||r.agencyName||booking.companyName).join(", ");
  const exportExcel = () => {
    try {
      const sheet = XLSX.utils.json_to_sheet(passengerExportRows(visible, p => isHost && stage === "all" ? names(p) : agencies.find(a => a.agencyId === p.agencyId)?.agencyName || p.agencyName || ""));
      sheet["!cols"] = [{wch:6},{wch:28},{wch:22},{wch:25},{wch:16},{wch:30},{wch:45},{wch:40},{wch:40},{wch:20}];
      for (const key of Object.keys(sheet)) if (/^[CD]\d+$/.test(key)) { sheet[key].t = "s"; sheet[key].z = "@"; }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Danh_sach_khach");
      XLSX.writeFile(workbook, `Danh_sach_khach_booking_${booking.id}.xlsx`);
    } catch { toast.error("Không xuất được danh sách khách. Vui lòng thử lại."); }
  };
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><Users className="h-4 w-4 text-sky-800"/>{isHost?"Danh sách hành khách tham gia đoàn":"Hành khách thuộc chặng của bạn"} ({groups.filter(g=>g.some(p=>p.status!=="INACTIVE")).length} người)</h2><p className="mt-1 text-xs text-slate-500">{isHost?"Xem toàn đoàn hoặc lọc theo từng chặng. Chỉ Agency chủ trì được thêm khách và thay đổi chặng tham gia.":"Chỉ hiển thị khách đang tham gia chặng của công ty bạn. Agency chủ trì quản lý việc thêm/bớt khách."}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" aria-expanded={!collapsed} aria-controls="agency-passenger-list" onClick={()=>setCollapsed(v=>!v)}>{collapsed?<ChevronDown className="mr-1 h-4 w-4"/>:<ChevronUp className="mr-1 h-4 w-4"/>}{collapsed?"Mở danh sách đoàn":"Thu gọn danh sách đoàn"}</Button><Button size="sm" variant="outline" disabled={!visible.length} onClick={exportExcel}><Download className="mr-1 h-4 w-4"/>Xuất Excel</Button>{isHost&&<Button size="sm" disabled={!canAmend} onClick={onAdd}><UserPlus className="mr-1 h-4 w-4"/>Thêm khách vào đoàn</Button>}</div></div>
    {!collapsed && <div id="agency-passenger-list" className="space-y-4">
    <div className="flex flex-wrap gap-2">{isHost&&<Button size="sm" variant={stage==="all"?"default":"outline"} onClick={()=>setStage("all")}>Toàn đoàn</Button>}{agencies.map(a=><Button key={a.agencyId} size="sm" variant={stage===a.agencyId?"default":"outline"} onClick={()=>setStage(a.agencyId)}>{a.agencyName} ({rows.filter(p=>p.agencyId===a.agencyId&&p.status!=="INACTIVE").length})</Button>)}</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["#","Hành khách","Số điện thoại","Ngày sinh","Chặng tham gia","Xếp phòng","Ăn uống / Dị ứng","Ghi chú","Trạng thái",isHost&&stage==="all"?"Tổng giá vé tham gia":"Giá vé chặng",...(isHost?["Thao tác"]:[])].map(label=><th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((p,i)=><tr key={p.id} className={p.status==="INACTIVE"?"bg-rose-50/30 text-slate-400":"text-slate-700"}>
      <td className="px-3 py-3">{i+1}</td><td className="px-3 py-3"><p className="font-semibold text-slate-900">{p.fullName}</p><p className="mt-1 text-[11px] text-slate-400">{p.idNumber||""}</p></td><td className="whitespace-nowrap px-3 py-3">{p.phone ? <a className="text-sky-800 hover:underline" href={`tel:${p.phone}`}>{p.phone}</a> : "—"}</td><td className="whitespace-nowrap px-3 py-3">{p.dateOfBirth?.split("-").reverse().join("/")||"—"}</td><td className="max-w-[180px] px-3 py-3">{isHost&&stage==="all"?names(p):agencies.find(a=>a.agencyId===(isHost?stage:viewerAgencyId))?.agencyName}</td><td className="max-w-[180px] px-3 py-3">{p.roommateNote||"—"}</td><td className="max-w-[180px] px-3 py-3">{p.dietaryNote||"—"}</td><td className="max-w-[160px] px-3 py-3">{p.notes||"—"}</td><td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 ${p.status==="INACTIVE"?"bg-rose-50 text-rose-600":"bg-emerald-50 text-emerald-700"}`}>{p.status==="INACTIVE"?"Không tham gia":"Đang tham gia"}</span></td><td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-sky-800">{money(p.status==="INACTIVE"?0:p.price||0)}</td>{isHost&&<td className="px-3 py-3"><div className="flex gap-2"><button type="button" disabled={!canAmend} title="Sửa hồ sơ hành khách" onClick={()=>onEdit(p)} className="rounded border p-1.5 text-slate-500 disabled:opacity-30"><Pencil className="h-3.5 w-3.5"/></button><button type="button" disabled={!canAmend} title="Xóa khách khỏi đoàn hoặc chặng" aria-label={`Xóa khách ${p.fullName}`} onClick={()=>open(p)} className="rounded border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5"/></button></div></td>}
    </tr>)}</tbody><tfoot><tr className="bg-slate-50"><td colSpan={9} className="px-3 py-3 text-right font-medium">Tổng vé {isHost&&stage==="all"?"các chặng đang tham gia":"chặng đang xem"}</td><td className="whitespace-nowrap px-3 py-3 text-right font-bold text-sky-800">{money(visible.filter(p=>p.status!=="INACTIVE").reduce((sum,p)=>sum+(p.price||0),0))}</td>{isHost&&<td/>}</tr></tfoot></table></div>
    {isHost&&booking.hasBeenApproved&&<p className="text-xs text-slate-500">Giá tour đã chốt giữ nguyên khi rút khách khỏi chặng. Khách bổ sung chỉ trả phụ thu các chặng được chọn; việc hoàn tiền được xử lý riêng.</p>}
    </div>}
    <Dialog open={!!editing} onOpenChange={open=>!busy&&!open&&setEditing(null)}><DialogContent className="sm:max-w-[560px]"><DialogHeader><DialogTitle>Xóa khách · {editing?.fullName}</DialogTitle></DialogHeader><p className="text-sm text-slate-500">Chọn các chặng cần xóa khách. Chọn tất cả để xóa khách khỏi toàn đoàn.</p><div className="space-y-2">{agencies.filter(a=>rows.some(r=>r.participantIndex===editing?.participantIndex && r.agencyId===a.agencyId && r.status!=="INACTIVE")).map(a=><label key={a.agencyId} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" checked={selected.includes(a.agencyId)} onChange={e=>setSelected(current=>e.target.checked?[...current,a.agencyId]:current.filter(id=>id!==a.agencyId))}/><span><strong>{a.agencyName}</strong>{a.stageArea&&<span className="mt-1 block text-xs text-slate-500">{a.stageArea}</span>}</span></label>)}</div><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} maxLength={240} placeholder="Lý do / yêu cầu thay đổi của khách hàng" className="rounded-lg border p-3 text-sm"/><p className="text-xs text-slate-500">Xóa khách chỉ cập nhật danh sách phục vụ. Giá tour đã chốt và các khoản phụ thu đã phát hành được giữ nguyên; hoàn/giảm tiền phải được xử lý riêng.</p>{error && <NotificationMessage tone="error" message={error} />}<div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>setEditing(null)}>Hủy</Button><Button variant="destructive" disabled={busy||reason.trim().length<3||selected.length===0} onClick={save}>{busy?"Đang xóa…":"Xóa khỏi chặng đã chọn"}</Button></div></DialogContent></Dialog>
  </section>;
}
