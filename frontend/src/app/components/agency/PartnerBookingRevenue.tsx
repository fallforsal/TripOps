import { Wallet } from "lucide-react";
import type { Booking } from "@/app/types";

export function PartnerBookingRevenue({booking,agencyId}:{booking:Booking;agencyId?:string}) {
  const share=booking.bookingAgencies?.find(a=>a.agencyId===agencyId);
  const money=(n:number)=>`${n.toLocaleString("vi-VN")}đ`;
  if(!share)return null;
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Wallet className="h-4 w-4 text-sky-800"/>Doanh thu chặng của bạn</h3>
    <dl className="space-y-3 text-xs">
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Giá trị chặng{booking.hasBeenApproved?" đã chốt":" dự kiến"}</dt><dd className="font-semibold tabular-nums">{money(booking.hasBeenApproved?share.originalAmount:share.finalAmount)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Phụ thu thuộc công ty bạn</dt><dd className="font-semibold tabular-nums">{money((share.paidSurchargeAmount||0)+(share.unpaidSurchargeAmount||0))}</dd></div>
      <div className="flex justify-between gap-3 border-t pt-3"><dt className="font-medium">Tổng doanh thu phân bổ</dt><dd className="font-bold tabular-nums text-sky-800">{money(share.finalAmount)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Phụ thu đã thanh toán</dt><dd className="tabular-nums text-emerald-700">{money(share.paidSurchargeAmount||0)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Phụ thu chưa thanh toán</dt><dd className="tabular-nums text-amber-700">{money(share.unpaidSurchargeAmount||0)}</dd></div>
      <div className="flex justify-between gap-3 border-t pt-3"><dt className="text-slate-500">Dự kiến nhận sau phí sàn</dt><dd className="font-semibold tabular-nums">{money(share.netPayout??share.finalAmount)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Quyết toán</dt><dd>{share.settlementStatus==="paid"?"Đã quyết toán":"Chờ đối soát"}</dd></div>
    </dl><p className="text-xs leading-relaxed text-slate-500">Phần phân bổ này thuộc công ty bạn. Lịch thanh toán của khách và hợp đồng toàn đoàn do Agency chủ trì quản lý.</p>
  </section>;
}
