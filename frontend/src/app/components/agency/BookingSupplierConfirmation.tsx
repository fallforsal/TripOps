import { useState } from "react";
import { ChatWithButton } from "@/app/components/chat/ChatWithButton";
import { CheckCircle2, Clock, ExternalLink, Eye, Hotel, MapPin, Phone, UtensilsCrossed, XCircle } from "lucide-react";
import type { TourSupplierSnapshot } from "@/app/types";
import { findBookingSupplierRequest, providerResponseInstant, type BookingSupplierState, type BookingServiceSlot } from "@/app/lib/bookingSupplierStatus";
import { formatVietnamDateTime } from "@/app/services/payos";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { useServiceCatalogue } from "@/app/contexts/ServiceCatalogue";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";

const statuses = {
  Pending: { label: "Chờ Provider xác nhận", tone: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock },
  Confirmed: { label: "Provider đã xác nhận", tone: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  Rejected: { label: "Provider từ chối", tone: "bg-rose-50 text-rose-800 border-rose-200", icon: XCircle },
};

export function BookingSupplierConfirmation({ state, slot, supplierSource, supplier, onOpenService, serviceName, stay, stars }:
  { state: BookingSupplierState; slot: BookingServiceSlot; supplierSource?: string;
    supplier?: TourSupplierSnapshot; serviceName?: string; stay?: {from?: string; to?: string}; stars?: number; onOpenService: (id: string) => void }) {
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const services = useServiceCatalogue();
  const ownSupplier = supplierSource === "AGENCY_SUPPLIER" || (!slot.serviceId && supplierSource !== "PLATFORM_PARTNER");
  const request = ownSupplier ? undefined : findBookingSupplierRequest(state.requests, slot);
  const status = request ? statuses[request.status as keyof typeof statuses] : undefined;
  const StatusIcon = status?.icon || Clock;
  const address = ownSupplier ? supplier?.address : request?.fullAddress;
  const phone = ownSupplier ? supplier?.contactPhone : request?.providerPhone;
  const service = ownSupplier ? undefined : services.find(s => s.id === slot.serviceId);
  const thumbnail = ownSupplier ? undefined : request?.thumbnailUrl || service?.thumbnailUrl || service?.image;
  const serviceId = request?.serviceId ?? slot.serviceId;
  const displayStars = stars ?? service?.stars;
  const displayName = serviceName || request?.serviceName || service?.name;
  const isHotelSlot = slot.kind === "hotel";
  const formatRefPrice = (value?: number | null) =>
    value == null ? "Chưa cập nhật" : `${value.toLocaleString("vi-VN")}đ`;

  return <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 text-xs sm:flex-row" aria-label="Xác nhận dịch vụ">
    {thumbnail && <button type="button" onClick={() => serviceId && onOpenService(String(serviceId))}
      aria-label={`Xem bài viết ${request?.serviceName || service?.name || "dịch vụ"}`}
      className="w-28 shrink-0 self-start overflow-hidden rounded-lg border border-gray-200 bg-white sm:w-32">
      <ImageWithFallback key={thumbnail} src={thumbnail} alt={request?.serviceName || service?.name || "Ảnh dịch vụ"}
        loading="lazy" className="aspect-[4/3] w-full object-cover" />
    </button>}
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><strong className="text-sm text-slate-900">{displayName}</strong>{displayStars ? <span className="ml-1 font-semibold text-amber-500">({displayStars}★)</span> : null}<p className="mt-1 text-gray-500">{ownSupplier ? "Nhà cung cấp riêng của Agency" : request?.providerName || "Dịch vụ Provider trên sàn"}</p></div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
          ownSupplier ? "bg-violet-50 text-violet-800 border-violet-200" : status?.tone || "bg-gray-50 text-gray-600 border-gray-200"
        }`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {ownSupplier ? "Agency làm việc trực tiếp" : state.loading ? "Đang tải xác nhận" : state.error ? "Không tải được xác nhận" : status?.label || "Chưa có yêu cầu xác nhận"}
        </span>
      </div>
      {slot.kind === "hotel" && (request?.serviceDateFrom || stay?.from) && <p className="text-slate-600">Nhận phòng: <strong>{(request?.serviceDateFrom || stay?.from)?.slice(0,10).split("-").reverse().join("/")}</strong> · Trả phòng: <strong>{(request?.serviceDateTo || stay?.to)?.slice(0,10).split("-").reverse().join("/") || "Chưa cập nhật"}</strong></p>}
      {request?.quotedCost != null && <p>Giá xác nhận: <strong className="text-gray-900">{request.quotedCost.toLocaleString("vi-VN")}đ</strong> <span className="text-gray-500">/ toàn bộ dịch vụ</span></p>}
      {request?.respondedAt && <p className="text-gray-500">Phản hồi lúc: {formatVietnamDateTime(providerResponseInstant(request.respondedAt))} (giờ VN)</p>}
      {request?.note && <p className={`whitespace-pre-wrap break-words ${request.status === "Rejected" ? "text-rose-700" : "text-gray-600"}`}>
        {request.status === "Rejected" ? "Lý do từ chối" : "Ghi chú Provider"}: {request.note}
      </p>}
      {address && <p className="flex items-start gap-1.5 text-gray-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{address}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {ownSupplier && <button type="button" onClick={() => setSupplierModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-50">
          <Eye className="h-3.5 w-3.5" /> Xem thông tin chi tiết
        </button>}
        {request && <button type="button" onClick={() => onOpenService(String(request.serviceId))}
          className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-white px-2.5 py-1 font-medium text-indigo-700 hover:bg-indigo-50">
          <Eye className="h-3.5 w-3.5" /> Xem bài viết
        </button>}
        {!ownSupplier && <ChatWithButton userId={request?.providerId || service?.providerId} context={{kind:"booking",id:Number(state.bookingId),title:`Booking #${state.bookingId}`,subtitle:serviceName || request?.serviceName}}>Nhắn Provider</ChatWithButton>}
        {address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#075985] hover:underline"><MapPin className="h-3.5 w-3.5" /> Bản đồ <ExternalLink className="h-3 w-3" /></a>}
        {phone && <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-gray-600 hover:text-[#075985]"><Phone className="h-3.5 w-3.5" />{phone}</a>}
      </div>
    </div>
    {ownSupplier && <Dialog open={supplierModalOpen} onOpenChange={setSupplierModalOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-200 bg-white text-slate-900 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6 text-xl text-[#075985]">{displayName || "Nhà cung cấp riêng"}</DialogTitle>
          <DialogDescription>Thông tin nhà cung cấp riêng trong danh bạ Agency.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${isHotelSlot ? "border-sky-200 bg-sky-50 text-sky-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
            {isHotelSlot ? <Hotel className="h-3.5 w-3.5" /> : <UtensilsCrossed className="h-3.5 w-3.5" />}
            {isHotelSlot ? "Lưu trú" : "Ẩm thực"}
          </span>
          {displayStars ? <span className="text-sm text-amber-700">{displayStars} sao</span> : null}
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
          {[
            ["Khu vực", supplier?.area],
            ["Địa chỉ", supplier?.address],
            ["Người liên hệ", supplier?.contactName],
            ["Số điện thoại", supplier?.contactPhone],
            ["Email", supplier?.contactEmail],
            ["Giá tham khảo", `${formatRefPrice(supplier?.referencePrice)}${supplier?.referencePrice != null ? (isHotelSlot ? " / người / đêm" : " / người / bữa") : ""}`],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-1.5 break-words text-sm font-medium leading-6">{value || "Chưa cập nhật"}</dd>
            </div>
          ))}
        </dl>
        <div>
          <h3 className="text-sm font-semibold">Điều kiện tham khảo</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{supplier?.conditions || "Chưa cập nhật"}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Ghi chú nội bộ</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{supplier?.notes || "Chưa có ghi chú"}</p>
        </div>
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={() => setSupplierModalOpen(false)}>Đóng</Button>
        </div>
      </DialogContent>
    </Dialog>}
  </div>;
}
