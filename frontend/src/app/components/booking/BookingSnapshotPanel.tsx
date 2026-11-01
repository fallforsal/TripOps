import { useState, useEffect, useMemo, useRef } from "react";
import {
  History,
  CheckCircle2,
  Clock,
  Send,
  Check,
  Building2,
  Utensils,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import type { Booking } from "@/app/types";
import {
  getBookingSnapshots,
  getBookingSnapshotDetail,
  createAgencyProposal,
  acceptBookingProposal,
  getAgencyBookingDetail,
  type BookingDto,
  type BookingSnapshotSummaryDto,
  type BookingSnapshotDto,
} from "@/app/services/wf05Bookings";
import { acceptedSnapshotFromBooking, canChangeBookingProposal, selectSnapshotVersions } from "@/app/services/bookingSnapshots";

interface BookingSnapshotPanelProps {
  booking: Booking;
  currentUserRole?: "customer" | "agency" | "admin" | "guide";
  onSnapshotUpdated?: (updated: BookingDto) => void;
}

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

function formatDateTime(isoStr?: string | null) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function toList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") {
    return val
      .split(/\r?\n|•|-|\*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function BookingSnapshotPanel({
  booking,
  currentUserRole = "customer",
  onSnapshotUpdated,
}: BookingSnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<BookingSnapshotSummaryDto[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(null);
  const [activeSnapshotDetail, setActiveSnapshotDetail] = useState<BookingSnapshotDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRevision, setDetailRevision] = useState(0);
  const listRequest = useRef(0);

  // Agency proposal creation modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalNote, setProposalNote] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Customer acceptance loading state
  const [isAccepting, setIsAccepting] = useState(false);

  // Expanded sections in snapshot view
  const [showItinerary, setShowItinerary] = useState(true);
  const [showHotels, setShowHotels] = useState(true);
  const [showPolicies, setShowPolicies] = useState(false);

  const bookingIdNumber = Number(booking.id);

  // Load snapshot list
  const loadSnapshots = async (preferredId?: number) => {
    if (!bookingIdNumber || isNaN(bookingIdNumber)) return;
    const requestId = ++listRequest.current;
    try {
      setIsLoading(true);
      setLoadError(null);
      const list = await getBookingSnapshots(bookingIdNumber);
      if (requestId !== listRequest.current) return;
      const versions = selectSnapshotVersions(list);
      setSnapshots(versions.sorted);
      const selection = versions.sorted.find(s => s.id === preferredId) ?? versions.effective;
      setSelectedSnapshotId(selection?.id ?? null);
      if (!selection) setActiveSnapshotDetail(null);
      setDetailRevision(r => r + 1);
    } catch (err: any) {
      if (requestId === listRequest.current) setLoadError(err.message || "Không tải được lịch sử phương án.");
    } finally {
      if (requestId === listRequest.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    setSnapshots([]);
    setSelectedSnapshotId(null);
    setActiveSnapshotDetail(null);
    loadSnapshots();
    return () => { listRequest.current++; };
  }, [booking.id]);

  // Load detail whenever selectedSnapshotId changes
  useEffect(() => {
    if (!bookingIdNumber || !selectedSnapshotId) return;
    let cancelled = false;

    const fetchDetail = async () => {
      try {
        setIsLoadingDetail(true);
        setDetailError(null);
        setActiveSnapshotDetail(null);
        const detail = await getBookingSnapshotDetail(bookingIdNumber, selectedSnapshotId);
        if (!cancelled) {
          setActiveSnapshotDetail(detail);
        }
      } catch (err: any) {
        if (!cancelled) {
          setDetailError(err.message || "Không tải được chi tiết phương án.");
        }
      } finally {
        if (!cancelled) setIsLoadingDetail(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [bookingIdNumber, selectedSnapshotId, detailRevision]);

  // Identify snapshot status
  const { proposal: latestProposal, agreed: agreedSnapshot } = useMemo(
    () => selectSnapshotVersions(snapshots), [snapshots]);
  const canChangeProposal = canChangeBookingProposal(booking.status) && !agreedSnapshot && !booking.agreedSnapshot;
  const hasPendingProposal = canChangeProposal && Boolean(latestProposal) && !isLoading && !loadError;

  // Handler: Agency sends proposal
  const handleCreateProposal = async () => {
    if (!bookingIdNumber) return;
    try {
      setIsSubmittingProposal(true);
      const created = await createAgencyProposal(bookingIdNumber, {
        note: proposalNote.trim() || undefined,
      });
      toast.success(`Đã gửi phương án phiên bản ${created.version} tới khách hàng!`);
      setIsProposalModalOpen(false);
      setProposalNote("");
      await loadSnapshots(created.id);
      const refreshed = await getAgencyBookingDetail(bookingIdNumber);
      onSnapshotUpdated?.(refreshed);
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo phương án mới");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Handler: Customer accepts proposal
  const handleAcceptProposal = async (proposalId: number) => {
    if (!bookingIdNumber) return;
    try {
      setIsAccepting(true);
      const updated = await acceptBookingProposal(bookingIdNumber, proposalId);
      const agreed = acceptedSnapshotFromBooking(updated);
      toast.success(
        `Đã chấp nhận phương án phiên bản ${agreed.version}! Hợp đồng dịch vụ đã được cập nhật.`
      );
      setActiveSnapshotDetail(agreed);
      onSnapshotUpdated?.(updated);
      await loadSnapshots(agreed.id);
    } catch (err: any) {
      toast.error(err.message || "Không thể chấp nhận phương án này");
    } finally {
      setIsAccepting(false);
    }
  };

  const currentSnapData = activeSnapshotDetail?.snapshotData;

  const isLegacy = snapshots.length === 0 && !isLoading && !loadError;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-base">
                Lịch sử phương án & Snapshot hợp đồng
              </h3>
              {agreedSnapshot && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đã chốt v{agreedSnapshot.version}
                </span>
              )}
              {hasPendingProposal && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Có phương án mới chờ khách duyệt
                </span>
              )}
              {isLegacy && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                  Dữ liệu lịch sử (Legacy)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lưu vết bất biến mọi điều khoản, lịch trình, bảng giá giữa khách hàng và công ty lữ hành.
            </p>
          </div>
        </div>

        {/* Agency Action Button */}
        {currentUserRole === "agency" && canChangeProposal && !isLoading && !loadError && (
          <Button
            size="sm"
            onClick={() => setIsProposalModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Gửi phương án mới cho khách
          </Button>
        )}
      </div>

      {/* Customer alert when a proposal is waiting for approval */}
      {currentUserRole === "customer" && hasPendingProposal && latestProposal && (
        <div className="m-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-900 text-sm">
                Đại lý vừa gửi Phương án điều chỉnh (Phiên bản {latestProposal.version})
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                Phương án đã cập nhật lịch trình hoặc chi phí phù hợp nhất cho đoàn của bạn. Vui lòng kiểm tra chi tiết bên dưới và xác nhận để cập nhật hợp đồng.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleAcceptProposal(latestProposal.id)}
            disabled={isAccepting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 flex items-center gap-1.5 shadow"
          >
            {isAccepting ? (
              <>Đang xử lý...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Chấp nhận phương án này
              </>
            )}
          </Button>
        </div>
      )}

      {/* Version Tabs */}
      {snapshots.length > 0 && (
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2 overflow-x-auto bg-slate-50/50">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2 shrink-0">
            Phiên bản:
          </span>
          {snapshots.map((s) => {
            const isSelected = selectedSnapshotId === s.id;
            const isAgreed = s.snapshotType === "agreed";
            const isProposal = s.snapshotType === "proposal";
            const isInitial = s.snapshotType === "initial_request";

            return (
              <button
                key={s.id}
                onClick={() => setSelectedSnapshotId(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? isAgreed
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : isAgreed
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : isProposal
                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>
                  v{s.version} -{" "}
                  {isInitial
                    ? "Yêu cầu ban đầu"
                    : isAgreed
                      ? "Đã thống nhất"
                      : "Phương án đại lý"}
                </span>
                {isAgreed && <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-emerald-600"}`} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Snapshot Content View */}
      {loadError || detailError ? (
        <div role="alert" className="p-6 text-sm text-red-700">
          <p>{loadError || detailError}</p>
          <Button variant="outline" className="mt-3" onClick={() => {
            if (loadError) void loadSnapshots(selectedSnapshotId ?? undefined);
            else setDetailRevision(r => r + 1);
          }}>Thử lại</Button>
        </div>
      ) : isLoading || isLoadingDetail ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          Đang tải chi tiết snapshot...
        </div>
      ) : activeSnapshotDetail && currentSnapData ? (
        <div className="p-6 space-y-6">
          {/* Metadata Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5">Loại snapshot:</span>
              <span className="font-semibold text-slate-800 text-sm capitalize">
                {activeSnapshotDetail.snapshotType === "initial_request"
                  ? "Yêu cầu ban đầu (Khách đặt)"
                  : activeSnapshotDetail.snapshotType === "agreed"
                    ? "Phương án đã thống nhất (Agreed)"
                    : "Phương án đề xuất (Proposal)"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Thời gian tạo:</span>
              <span className="font-medium text-slate-700">
                {formatDateTime(activeSnapshotDetail.createdAt)}
              </span>
              {activeSnapshotDetail.sourceTourVersion && (
                <span className="text-slate-400 block mt-0.5">
                  (Dựa theo Tour gốc v{activeSnapshotDetail.sourceTourVersion})
                </span>
              )}
            </div>
            <div>
              {activeSnapshotDetail.acceptedAt ? (
                <div>
                  <span className="text-emerald-600 font-medium block mb-0.5">Khách chấp nhận vào:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateTime(activeSnapshotDetail.acceptedAt)}
                  </span>
                </div>
              ) : activeSnapshotDetail.snapshotType === "proposal" ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-amber-600 font-medium block mb-0.5">Trạng thái:</span>
                    <span className="text-amber-800 font-semibold">
                      {canChangeProposal && activeSnapshotDetail.id === latestProposal?.id ? "Chờ khách duyệt" : "Chỉ xem lịch sử"}
                    </span>
                  </div>
                  {currentUserRole === "customer" && canChangeProposal && activeSnapshotDetail.id === latestProposal?.id && !loadError && (
                    <Button
                      size="sm"
                      onClick={() => handleAcceptProposal(activeSnapshotDetail.id)}
                      disabled={isAccepting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5"
                    >
                      {isAccepting ? "..." : "Chấp nhận"}
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-slate-400 block mb-0.5">Trạng thái:</span>
                  <span className="font-medium text-slate-600">Bản ghi ban đầu</span>
                </div>
              )}
            </div>
          </div>

          {/* Commercial Header: Tour Name, Price, Guests */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">
                {currentSnapData.tourCode}
              </div>
              <h4 className="text-lg font-bold text-slate-900 mt-0.5">
                {currentSnapData.tourName}
              </h4>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {currentSnapData.startDate?.split("T")[0]} → {currentSnapData.endDate?.split("T")[0]}
                </span>
                <span>•</span>
                <span>{currentSnapData.passengers.length} hành khách</span>
                {currentSnapData.destination && (
                  <>
                    <span>•</span>
                    <span>{currentSnapData.destination}</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">{activeSnapshotDetail.snapshotType === "agreed" ? "Giá trị đã thống nhất:" : "Giá trị phương án:"}</span>
              <span className="text-xl font-bold text-blue-700">
                {formatVND(currentSnapData.totalAmount)}
              </span>
            </div>
          </div>

          {/* Pricing breakdown per passenger/tier */}
          {currentSnapData.pricingTiers && currentSnapData.pricingTiers.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Cơ cấu giá theo hạng khách
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentSnapData.pricingTiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-slate-800 text-xs">
                        {tier.name}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {currentSnapData.passengers.filter(p => p.tierName === tier.name).length} khách
                      </div>
                    </div>
                    <div className="font-semibold text-slate-800 text-xs">
                      {formatVND(tier.pricePerGuest)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotels */}
          {currentSnapData.hotels && currentSnapData.hotels.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowHotels(!showHotels)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide py-1 border-b border-slate-100 hover:text-slate-900"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Khách sạn lưu trú ({currentSnapData.hotels.length} điểm)
                </span>
                {showHotels ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHotels && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {currentSnapData.hotels.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white shadow-xs"
                    >
                      <div className="font-semibold text-slate-800 text-xs">{h.name}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5 flex items-center justify-between">
                        <span>{h.destination}</span>
                        <span>{h.stars ? `${h.stars}★` : ""} • {h.nights} đêm</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Itinerary */}
          {currentSnapData.itinerary && currentSnapData.itinerary.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowItinerary(!showItinerary)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide py-1 border-b border-slate-100 hover:text-slate-900"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Lịch trình chi tiết ({currentSnapData.itinerary.length} ngày)
                </span>
                {showItinerary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showItinerary && (
                <div className="space-y-3 mt-3">
                  {currentSnapData.itinerary.map((day, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                          Ngày {day.dayNumber || idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {day.title}
                        </span>
                      </div>
                      {day.description && (
                        <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-line">
                          {day.description}
                        </p>
                      )}

                      {/* Locations & Meals */}
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                        {day.locations && day.locations.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-slate-700">Điểm đến:</span>
                            <span>{day.locations.map((l) => l.name).join(", ")}</span>
                          </div>
                        )}
                        {day.meals && day.meals.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Utensils className="w-3 h-3 text-slate-400" />
                            <span>{day.meals.map((m) => `${m.mealType}: ${m.name}`).join(" | ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Policies & Notes */}
          <div>
            <button
              type="button"
              onClick={() => setShowPolicies(!showPolicies)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide py-1 border-b border-slate-100 hover:text-slate-900"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                Chính sách bao gồm, hoàn hủy & điều kiện
              </span>
              {showPolicies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPolicies && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                {toList(currentSnapData.inclusions).length > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                    <span className="font-semibold text-emerald-800 block mb-1">Dịch vụ bao gồm:</span>
                    <ul className="list-disc list-inside text-emerald-900 space-y-0.5">
                      {toList(currentSnapData.inclusions).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {toList(currentSnapData.exclusions).length > 0 && (
                  <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200">
                    <span className="font-semibold text-rose-800 block mb-1">Không bao gồm:</span>
                    <ul className="list-disc list-inside text-rose-900 space-y-0.5">
                      {toList(currentSnapData.exclusions).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentSnapData.cancellationPolicy && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 md:col-span-2">
                    <span className="font-semibold text-slate-800 block mb-1">Chính sách hủy đổi:</span>
                    <p className="text-slate-600 whitespace-pre-line">{currentSnapData.cancellationPolicy}</p>
                  </div>
                )}
                {currentSnapData.customerNotes && (
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 md:col-span-2">
                    <span className="font-semibold text-amber-900 block mb-1">Ghi chú phương án:</span>
                    <p className="text-amber-800 whitespace-pre-line">{currentSnapData.customerNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : isLegacy ? (
        <div className="p-6 text-center text-slate-500 text-xs">
          Đơn đặt tour này chưa có snapshot lịch sử. Thông tin đang hiển thị từ dữ liệu hiện có, chưa được xác minh là phương án đã chấp nhận.
        </div>
      ) : (
        <div className="p-6 text-center text-slate-400 text-xs">
          Vui lòng chọn một phiên bản để xem chi tiết.
        </div>
      )}

      {/* Agency Proposal Modal */}
      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              Gửi phương án điều chỉnh cho khách
            </DialogTitle>
            <DialogDescription>Gửi phương án để khách xem xét trước khi chấp nhận.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600">
              Hệ thống sẽ tạo một snapshot phiên bản mới (Proposal) dựa trên hiện trạng lịch trình và chi phí mới nhất của đơn đặt tour #{booking.bookingCode}. Khách hàng sẽ nhận thông báo để xem xét và chấp nhận.
            </p>
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Ghi chú diễn giải phương án (tùy chọn):
              </label>
              <Textarea
                rows={4}
                value={proposalNote}
                onChange={(e) => setProposalNote(e.target.value)}
                placeholder="Ví dụ: Đã nâng cấp khách sạn 4 sao tại Nha Trang, điều chỉnh ngày 2 ghé thêm tháp Bà Ponagar theo yêu cầu..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProposalModalOpen(false)}
              disabled={isSubmittingProposal}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCreateProposal}
              disabled={isSubmittingProposal}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingProposal ? "Đang gửi..." : "Gửi phương án"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

