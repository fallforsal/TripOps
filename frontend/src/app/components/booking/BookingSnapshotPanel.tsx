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
  Users,
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
  requestBookingProposalChanges,
  getBookingDetail,
  getAgencyBookingDetail,
  type BookingDto,
  type BookingSnapshotSummaryDto,
  type BookingSnapshotDto,
} from "@/app/services/wf05Bookings";
import { acceptedSnapshotFromBooking, canChangeBookingProposal, proposalVersionStyle, selectSnapshotVersions, snapshotHasPassengerNotes, snapshotNotes } from "@/app/services/bookingSnapshots";

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
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;
  const updatedRef = useRef(onSnapshotUpdated);
  updatedRef.current = onSnapshotUpdated;
  const [isChangesOpen, setIsChangesOpen] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [isSendingChanges, setIsSendingChanges] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  // Agency proposal creation modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalNote, setProposalNote] = useState("");
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Customer acceptance loading state
  const [isAccepting, setIsAccepting] = useState(false);

  // Expanded sections in snapshot view
  const [showItinerary, setShowItinerary] = useState(true);
  const [showHotels, setShowHotels] = useState(true);
  const [showPassengers, setShowPassengers] = useState(false);
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
      snapshotsRef.current = versions.sorted;
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

  // Refresh only changed history; keep the selected older version and open form drafts.
  useEffect(() => {
    if (!bookingIdNumber) return;
    let cancelled = false, busy = false;
    const refresh = async () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      const generation = listRequest.current;
      try {
        const list = await getBookingSnapshots(bookingIdNumber);
        if (cancelled || generation !== listRequest.current) return;
        setRefreshError("");
        if (JSON.stringify(list) !== JSON.stringify(snapshotsRef.current)) {
          const previous = selectSnapshotVersions(snapshotsRef.current).effective;
          const next = selectSnapshotVersions(list);
          snapshotsRef.current = next.sorted;
          setSnapshots(next.sorted);
          setSelectedSnapshotId(id => !id || id === previous?.id ? next.effective?.id ?? null : id);
          setDetailRevision(r => r + 1);
          const detail = currentUserRole === "agency" ? await getAgencyBookingDetail(bookingIdNumber) : await getBookingDetail(bookingIdNumber);
          if (!cancelled && generation === listRequest.current) updatedRef.current?.(detail);
        }
      } catch { if (!cancelled) setRefreshError("Chưa cập nhật được phản hồi mới. Vui lòng thử lại."); }
      finally { busy = false; }
    };
    const interval = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [bookingIdNumber, currentUserRole]);

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
  const hasPendingProposal = canChangeProposal && Boolean(latestProposal) && !latestProposal?.changeRequest && !isLoading && !loadError;

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
      window.dispatchEvent(new Event("booking-proposal-updated"));
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
      window.dispatchEvent(new Event("booking-proposal-updated"));
    } catch (err: any) {
      toast.error(err.message || "Không thể chấp nhận phương án này");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!latestProposal || !changeMessage.trim()) return;
    try {
      setIsSendingChanges(true);
      const updated = await requestBookingProposalChanges(bookingIdNumber, latestProposal.id, changeMessage.trim());
      onSnapshotUpdated?.(updated);
      setIsChangesOpen(false); setChangeMessage("");
      await loadSnapshots(latestProposal.id);
      window.dispatchEvent(new Event("booking-proposal-updated"));
      toast.success("Đã gửi yêu cầu chỉnh sửa cho công ty lữ hành.");
    } catch (err: any) { toast.error(err.message || "Chưa gửi được phản hồi. Vui lòng thử lại."); }
    finally { setIsSendingChanges(false); }
  };

  const currentSnapData = activeSnapshotDetail?.snapshotData;

  const isLegacy = snapshots.length === 0 && !isLoading && !loadError;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-base">
                Phương án đặt tour & lịch sử trao đổi
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
                  Đơn chưa có lịch sử phương án
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Xem các phiên bản lịch trình, dịch vụ, giá và phản hồi giữa hai bên.
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
                Công ty lữ hành đã gửi phương án (Phiên bản {latestProposal.version})
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                Vui lòng xem lịch trình, dịch vụ và giá bên dưới. Bạn có thể chấp nhận hoặc gửi nội dung cần chỉnh sửa.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedSnapshotId(latestProposal.id)} className="shrink-0 border-amber-400 text-amber-900">
            Xem phương án {latestProposal.version}
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
            const isInitial = s.snapshotType === "initial_request";

            return (
              <button
                key={s.id}
                onClick={() => setSelectedSnapshotId(s.id)}
                aria-pressed={isSelected}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 shrink-0 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${proposalVersionStyle(s.snapshotType, isSelected)}`}
              >
                <span>
                  v{s.version} -{" "}
                  {isInitial
                    ? "Yêu cầu ban đầu"
                    : isAgreed
                      ? "Đã thống nhất"
                      : "Phương án lữ hành"}
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
          Đang tải chi tiết phương án...
        </div>
      ) : activeSnapshotDetail && currentSnapData ? (
        <div className="p-6 space-y-6">
          {refreshError && <p role="alert" className="text-sm text-red-700">{refreshError} <Button variant="link" onClick={() => void loadSnapshots(selectedSnapshotId ?? undefined)}>Thử lại</Button></p>}
          {/* Metadata Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block mb-0.5">Nội dung phiên bản:</span>
              <span className="font-semibold text-slate-800 text-sm">
                {activeSnapshotDetail.snapshotType === "initial_request"
                  ? "Yêu cầu đặt tour của khách"
                  : activeSnapshotDetail.snapshotType === "agreed"
                    ? "Phương án đã chốt"
                    : "Phương án từ công ty lữ hành"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Thời gian tạo:</span>
              <span className="font-medium text-slate-700">
                {formatDateTime(activeSnapshotDetail.createdAt)}
              </span>

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
                      {activeSnapshotDetail.changeRequest ? "Khách đã yêu cầu chỉnh sửa" : canChangeProposal && activeSnapshotDetail.id === latestProposal?.id ? "Chờ khách phản hồi" : "Chỉ xem lịch sử"}
                    </span>
                  </div>

                </div>
              ) : (
                <div>
                  <span className="text-slate-400 block mb-0.5">Trạng thái:</span>
                  <span className="font-medium text-slate-600">Yêu cầu đặt tour ban đầu</span>
                </div>
              )}
            </div>
          </div>

          {(() => {
            const notes = snapshotNotes(activeSnapshotDetail);
            if (!notes.agencyNote && !notes.customerNote) return null;
            return (
              <div className="space-y-3">
                {notes.agencyNote && (
                  <div className="rounded-md border border-slate-200 p-4 text-sm">
                    <h4 className="font-semibold text-slate-800">Nội dung từ công ty lữ hành</h4>
                    <p className="mt-2 whitespace-pre-line text-slate-700">{notes.agencyNote}</p>
                  </div>
                )}
                {notes.customerNote && (
                  <div className="rounded-md border border-slate-200 bg-slate-50/60 p-4 text-sm">
                    <h4 className="font-semibold text-slate-800">Yêu cầu của khách</h4>
                    <p className="mt-2 whitespace-pre-line text-slate-700">{notes.customerNote}</p>
                  </div>
                )}
              </div>
            );
          })()}
          {activeSnapshotDetail.changeRequest && <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm" role="status">
            <h4 className="font-semibold text-amber-950">Khách yêu cầu chỉnh sửa · {formatDateTime(activeSnapshotDetail.changeRequest.createdAt)}</h4>
            <p className="mt-2 whitespace-pre-line text-amber-950">{activeSnapshotDetail.changeRequest.message}</p>
            <p className="mt-2 text-xs text-amber-800">{currentUserRole === "agency" ? "Hãy điều chỉnh đơn và gửi phương án mới để khách xem xét." : "Đã gửi phản hồi. Vui lòng chờ công ty lữ hành gửi phương án mới."}</p>
          </div>}
          {currentUserRole === "customer" && hasPendingProposal && activeSnapshotDetail.id === latestProposal?.id && <div className="flex flex-wrap gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => handleAcceptProposal(activeSnapshotDetail.id)} disabled={isAccepting || isSendingChanges}>
              <Check className="size-4" />{isAccepting ? "Đang xử lý..." : `Chấp nhận phương án ${activeSnapshotDetail.version}`}
            </Button>
            <Button variant="outline" className="border-amber-400 text-amber-950" disabled={isAccepting || isSendingChanges} onClick={() => setIsChangesOpen(true)}>Yêu cầu chỉnh sửa</Button>
            <p className="w-full text-xs text-slate-600">Nội dung phản hồi sẽ được gửi cho công ty lữ hành. Yêu cầu chỉnh sửa không hủy đơn đặt tour.</p>
          </div>}

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
              <span className={`text-xl font-bold ${activeSnapshotDetail.snapshotType === "agreed" ? "text-emerald-700" : activeSnapshotDetail.snapshotType === "proposal" ? "text-amber-800" : "text-slate-800"}`}>
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

          {/* Passengers as recorded in this version */}
          {currentSnapData.passengers.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPassengers(!showPassengers)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wide py-1 border-b border-slate-100 hover:text-slate-900"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Danh sách hành khách ({currentSnapData.passengers.length})
                </span>
                {showPassengers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPassengers && (
                <div className="mt-3 space-y-2">
                  {!snapshotHasPassengerNotes(currentSnapData) && (
                    <p className="text-[11px] text-slate-500">Phiên bản này được lưu trước khi hệ thống ghi nhận ghi chú hành khách.</p>
                  )}
                  {currentSnapData.passengers.map((p) => (
                    <div key={p.index} className="p-3 rounded-lg border border-slate-200 bg-white text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{p.index}. {p.fullName}</span>
                        <span className="text-slate-600">{p.tierName ?? "—"} · {formatVND(p.price)}</span>
                      </div>
                      {(p.note || p.roommateNote || p.restaurantNote) && (
                        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                          {p.note && <div><dt className="font-medium text-slate-500">Ghi chú</dt><dd className="whitespace-pre-line">{p.note}</dd></div>}
                          {p.roommateNote && <div><dt className="font-medium text-slate-500">Nguyện vọng xếp phòng</dt><dd className="whitespace-pre-line">{p.roommateNote}</dd></div>}
                          {p.restaurantNote && <div><dt className="font-medium text-slate-500">Nguyện vọng ăn uống</dt><dd className="whitespace-pre-line">{p.restaurantNote}</dd></div>}
                        </dl>
                      )}
                    </div>
                  ))}
                </div>
              )}
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

              </div>
            )}
          </div>
        </div>
      ) : isLegacy ? (
        <div className="p-6 text-center text-slate-500 text-xs">
          Đơn đặt tour này chưa có lịch sử phương án. Thông tin đang hiển thị từ dữ liệu hiện có, chưa được xác minh là phương án đã chấp nhận.
        </div>
      ) : (
        <div className="p-6 text-center text-slate-400 text-xs">
          Vui lòng chọn một phiên bản để xem chi tiết.
        </div>
      )}

      <Dialog open={isChangesOpen} onOpenChange={open => { if (!isSendingChanges) setIsChangesOpen(open); }}>
        <DialogContent className="max-w-md bg-white text-slate-900">
          <DialogHeader><DialogTitle>Yêu cầu chỉnh sửa phương án {latestProposal?.version}</DialogTitle>
            <DialogDescription>Cho công ty lữ hành biết nội dung bạn muốn thay đổi trước khi chốt phương án.</DialogDescription></DialogHeader>
          <label htmlFor="proposal-change-message" className="text-sm font-medium">Nội dung cần chỉnh sửa <span className="text-red-600">*</span></label>
          <Textarea id="proposal-change-message" rows={5} maxLength={2000} value={changeMessage} onChange={e => setChangeMessage(e.target.value)} placeholder="Ví dụ: Đoàn muốn đổi khách sạn sang hai giường đơn và giảm ngân sách bữa tối..." />
          <p className="text-xs text-slate-500">Bắt buộc nhập nội dung, tối đa 2.000 ký tự. Đây là phản hồi phương án, không phải yêu cầu hủy tour.</p>
          <DialogFooter><Button variant="outline" disabled={isSendingChanges} onClick={() => setIsChangesOpen(false)}>Đóng</Button>
            <Button disabled={!changeMessage.trim() || isSendingChanges || isAccepting} onClick={handleRequestChanges}>{isSendingChanges ? "Đang gửi..." : "Gửi yêu cầu chỉnh sửa"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agency Proposal Modal */}
      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              Gửi phương án điều chỉnh cho khách
            </DialogTitle>
            <DialogDescription>Gửi phương án để khách xem xét trước khi chấp nhận.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <p className="text-slate-600">
              Phương án sẽ lưu lịch trình, dịch vụ và chi phí hiện tại của đơn {booking.bookingCode}. Hãy kiểm tra các thay đổi trước khi gửi. Khách nhận thông báo và có thể chấp nhận hoặc yêu cầu chỉnh sửa.
            </p>
            <div>
              <label htmlFor="agency-proposal-note" className="font-medium text-slate-700 block mb-1">
                Ghi chú diễn giải phương án (tùy chọn):
              </label>
              <Textarea
                id="agency-proposal-note"
                rows={4}
                maxLength={2000}
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

