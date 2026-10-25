import { useState } from "react";
import { Tour, TourVersion } from "@/app/types";
import {
  History,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Building2,
  MapPin,
  Utensils,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

interface TourVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tour: Tour | null;
  onRestoreVersion: (tourId: string, versionNumber: number) => void;
}

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TourVersionHistoryModal({
  isOpen,
  onClose,
  tour,
  onRestoreVersion,
}: TourVersionHistoryModalProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  if (!tour) return null;

  const currentVersionNum = tour.version || 1;
  const history: TourVersion[] = tour.versionHistory || [];

  // Sắp xếp các phiên bản từ mới nhất đến cũ nhất
  const sortedVersions = [...history].sort((a, b) => b.version - a.version);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#075985] mb-1">
            <History className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Lịch sử phiên bản &amp; Sao lưu (Version Control)
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {tour.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Lịch sử cấu hình tour • Phiên bản hiện tại:{" "}
            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              v{currentVersionNum}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="bg-[#F0F9FF]/70 border border-[#CBD5E1] rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#075985] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Cơ chế bảo toàn &amp; Khôi phục (Backup &amp; Rollback):</p>
              <p className="text-blue-800 text-[11px] mt-0.5">
                Mỗi thay đổi được lưu thành một bản ghi cấu hình. Khôi phục phiên bản cũ sẽ tạo bản nháp mới và giữ nguyên lịch sử.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Phiên bản hiện tại */}
            <div className="border-2 border-emerald-400 bg-emerald-50/30 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    v{currentVersionNum}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">
                        Phiên bản hiện tại ({tour.visibility === "public" ? "Đang hiển thị cho khách" : "Chưa công khai"})
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Cập nhật: {formatDate(tour.updatedAt || tour.createdAt || "")}
                      {tour.companyName && ` • Bởi: ${tour.companyName}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-gray-400 uppercase font-semibold">Giá tour hiện tại</p>
                  <p className="text-base font-bold text-emerald-700">{formatVND(tour.price)}</p>
                </div>
              </div>

              {tour.changeNote && (
                <div className="bg-white/80 rounded-lg p-2.5 border border-emerald-200 text-xs text-emerald-950 font-medium flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{tour.changeNote}</span>
                </div>
              )}

              {/* Tóm tắt nhanh cấu hình hiện tại */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/70 text-xs text-gray-700">
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <p className="text-[10px] text-gray-400">Thời lượng</p>
                  <p className="font-semibold text-gray-900">{tour.duration || `${tour.numberOfDays ?? 0}N${tour.numberOfNights ?? 0}Đ`}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <p className="text-[10px] text-gray-400">Khách sạn</p>
                  <p className="font-semibold text-gray-900 truncate">
                    {tour.hotels?.[0]?.name || "Theo tiêu chuẩn"}
                    {tour.hotels?.[0]?.stars && ` (${tour.hotels[0].stars}★)`}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <p className="text-[10px] text-gray-400">Lộ trình</p>
                  <p className="font-semibold text-gray-900">{tour.itinerary?.length || 0} ngày lịch trình</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-100">
                  <p className="text-[10px] text-gray-400">Số khách thiết kế</p>
                  <p className="font-semibold text-gray-900">{tour.minGuests} - {tour.maxGuests} khách</p>
                </div>
              </div>
            </div>

            {/* Danh sách các version trước đó */}
            {sortedVersions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                Chưa có bản ghi phiên bản cũ nào. Mỗi khi bạn chỉnh sửa tour này, hệ thống sẽ tự động sao lưu lịch sử tại đây.
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider pt-2">
                  Các bản sao lưu lịch sử ({sortedVersions.length})
                </p>

                {sortedVersions.map((v) => {
                  const isExp = expandedVersion === v.version;
                  const snap = v.tourSnapshot;

                  return (
                    <div
                      key={v.version}
                      className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-[#CBD5E1] transition-all shadow-2xs"
                    >
                      <div className="p-3.5 flex items-center justify-between flex-wrap gap-2 bg-gray-50/70">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center">
                            v{v.version}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              Phiên bản v{v.version} • {snap?.name || tour.name}
                            </p>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Lưu lúc: {formatDate(v.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <span className="text-xs font-bold text-gray-800">
                              {formatVND(snap?.price || tour.price)}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedVersion(isExp ? null : v.version)}
                            className="text-xs h-7 px-2.5 gap-1 text-gray-600"
                          >
                            {isExp ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                Thu gọn
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                Xem chi tiết
                              </>
                            )}
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Bạn có chắc chắn muốn khôi phục lại nội dung của Phiên bản v${v.version} không? Hệ thống sẽ tạo phiên bản mới tiếp theo mang toàn bộ cấu hình của v${v.version}.`
                                )
                              ) {
                                onRestoreVersion(tour.id, v.version);
                                onClose();
                              }
                            }}
                            className="bg-[#075985] hover:bg-[#F97316] text-white text-xs h-7 px-2.5 gap-1 font-semibold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Khôi phục bản này
                          </Button>
                        </div>
                      </div>

                      {v.changeNote && (
                        <div className="px-3.5 py-2 bg-amber-50/50 border-t border-gray-100 text-xs text-amber-900">
                          <span className="font-semibold">Ghi chú version:</span> {v.changeNote}
                        </div>
                      )}

                      {/* Chi tiết nội dung bản snapshot khi mở rộng */}
                      {isExp && snap && (
                        <div className="p-4 border-t border-gray-200 bg-white space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-gray-50 rounded-lg">
                            <div>
                              <span className="text-[10px] text-gray-400 block">Thời lượng:</span>
                              <span className="font-semibold text-gray-800">{snap.duration}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block">Khách sạn lưu trú:</span>
                              <span className="font-semibold text-gray-800">
                                {snap.hotels?.[0]?.name || "Theo tiêu chuẩn"}
                                {snap.hotels?.[0]?.stars && ` (${snap.hotels[0].stars}★)`}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block">Điểm khởi hành &amp; Đến:</span>
                              <span className="font-semibold text-gray-800">{snap.departureCity ? `${snap.departureCity} → ` : ""}{snap.destination}</span>
                            </div>
                          </div>

                          <div>
                            <p className="font-bold text-gray-900 text-xs mb-1.5 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#075985]" />
                              Lộ trình các ngày trong bản v{v.version}:
                            </p>
                            <div className="space-y-1.5 pl-2">
                              {snap.itinerary?.map((d) => (
                                <div key={d.id} className="p-2 border border-gray-100 rounded-lg bg-gray-50/50">
                                  <p className="font-semibold text-gray-800">
                                    Ngày {d.day}: {d.title}
                                  </p>
                                  {d.hotel?.name && (
                                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                      <Building2 className="w-3 h-3 text-blue-500" />
                                      {d.hotel.name}
                                    </p>
                                  )}
                                  {d.meals && d.meals.length > 0 && (
                                    <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                      <Utensils className="w-3 h-3 text-emerald-500" />
                                      {d.meals.map((m) => m.serviceName || m.type).join(" • ")}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
