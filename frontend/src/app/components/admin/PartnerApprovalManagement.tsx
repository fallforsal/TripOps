import { partnerService } from "@/app/services/partnerService";
import { usePartnerApplications } from "@/app/hooks/usePartnerApplications";
import { useState, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  Search,
  Filter,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  UserCheck,
  ExternalLink,
  Store,
  Compass,
  Check,
  X,
  ChevronRight,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";

export interface UnifiedPartnerItem {
  id: string;
  type: "agency" | "provider";
  businessName: string;
  taxCode: string;
  representativeName: string;
  email: string;
  phone: string;
  address: string;
  licenseUrl?: string;
  description?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  createdAt: string;
}

const cleanDisplayName = (name?: string) => {
  if (!name) return "";
  return name
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export function PartnerApprovalManagement() {
  // Filters & Search
  const [searchTerm, updateSearchTerm] = useState("");
  const [statusFilter, updateStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [roleFilter, updateRoleFilter] = useState<
    "all" | "agency" | "provider"
  >("all");

  const [page, setPage] = useState(1);
  const setSearchTerm = (value: string) => {
    updateSearchTerm(value);
    setPage(1);
  };
  const setStatusFilter = (
    value: "all" | "pending" | "approved" | "rejected",
  ) => {
    updateStatusFilter(value);
    setPage(1);
  };
  const setRoleFilter = (value: "all" | "agency" | "provider") => {
    updateRoleFilter(value);
    setPage(1);
  };
  const {
    items,
    total,
    counts,
    loading,
    error: loadError,
    refresh,
  } = usePartnerApplications(statusFilter, roleFilter, searchTerm, page);
  const allPartners = useMemo<UnifiedPartnerItem[]>(
    () =>
      items.map((item) => ({
        id: String(item.profile.id),
        type: item.role,
        businessName: item.profile.businessName,
        taxCode: item.profile.taxCode,
        representativeName: item.name,
        email: item.email,
        phone: item.phone || "",
        address: item.profile.businessAddress,
        licenseUrl: item.profile.businessLicenseUrl,
        description: item.profile.description,
        status: item.profile.status,
        rejectionReason: item.profile.rejectionReason,
        createdAt: item.profile.createdAt || "",
      })),
    [items],
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  // Modals state
  const [selectedPartner, setSelectedPartner] =
    useState<UnifiedPartnerItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Modal Phê duyệt kèm lý do / ghi chú
  const [approvingPartner, setApprovingPartner] =
    useState<UnifiedPartnerItem | null>(null);

  // Modal Từ chối kèm lý do bắt buộc
  const [rejectingPartner, setRejectingPartner] =
    useState<UnifiedPartnerItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const filteredPartners = allPartners;
  const handleOpenApproveModal = (partner: UnifiedPartnerItem) => {
    setReviewError("");
    setApprovingPartner(partner);
  };
  const handleConfirmApprove = async () => {
    if (!approvingPartner || isReviewing) return;
    setIsReviewing(true);
    setReviewError("");
    try {
      await partnerService.approve(Number(approvingPartner.id));
      setApprovingPartner(null);
      setShowDetailModal(false);
      refresh();
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Không thể phê duyệt",
      );
    } finally {
      setIsReviewing(false);
    }
  };
  const handleOpenRejectModal = (partner: UnifiedPartnerItem) => {
    setReviewError("");
    setRejectingPartner(partner);
    setRejectReason("");
    setRejectError("");
  };
  const handleConfirmReject = async () => {
    if (!rejectingPartner || isReviewing) return;
    if (!rejectReason.trim()) {
      setRejectError("Vui lòng nhập lý do từ chối cụ thể.");
      return;
    }
    setIsReviewing(true);
    setReviewError("");
    try {
      await partnerService.reject(
        Number(rejectingPartner.id),
        rejectReason.trim(),
      );
      setRejectingPartner(null);
      setShowDetailModal(false);
      refresh();
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Không thể từ chối",
      );
    } finally {
      setIsReviewing(false);
    }
  };

  // Quick preset lý do từ chối
  const rejectionPresets = [
    "Mã số thuế không tồn tại hoặc không trùng khớp với tên pháp nhân trên Cổng Thông tin Quốc gia về Đăng ký Doanh nghiệp.",
    "Bản chụp Giấy phép kinh doanh / Giấy phép lữ hành bị mờ, không thấy rõ dấu mộc đỏ pháp lý.",
    "Địa chỉ trụ sở hoặc thông tin số điện thoại người đại diện không chính xác, ban quản trị không liên lạc được.",
    "Giấy phép kinh doanh lữ hành đã hết hạn hiệu lực, đề nghị cung cấp bản gia hạn mới nhất.",
  ];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#075985]/10 text-[#075985] text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4 text-[#F97316]" />
            <span>Trung tâm Kiểm duyệt Đối tác Sàn (TripOps Moderation)</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Phê duyệt Hồ sơ Doanh nghiệp & Nhà cung cấp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thẩm định tính hợp pháp của Mã số thuế, Giấy phép kinh doanh (bảng{" "}
            <code>business_profiles</code>) trước khi cấp quyền bán hàng.
          </p>
        </div>

        {counts.pending > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-extrabold text-lg shadow-xs animate-bounce">
              {counts.pending}
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                Có đơn chờ xét duyệt!
              </div>
              <div className="text-[11px] text-amber-700">
                Cần xử lý trong vòng 24h
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tất cả */}
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-[#075985] text-white border-[#075985] shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div className="text-xs font-medium opacity-80 flex items-center justify-between">
            <span>Tổng số đối tác</span>
            <Building2 className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.all}</div>
          <div className="text-[11px] mt-1 opacity-75">
            Bao gồm Agency & Nhà cung cấp
          </div>
        </div>

        {/* Chờ duyệt (Pending) */}
        <div
          onClick={() => setStatusFilter("pending")}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "pending"
              ? "bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-amber-200 hover:border-amber-300 shadow-2xs"
          }`}
        >
          <div className="text-xs font-medium opacity-90 flex items-center justify-between">
            <span>Chờ phê duyệt</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2 flex items-center gap-2">
            <span>{counts.pending}</span>
            {counts.pending > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 uppercase font-bold tracking-wider">
                Mới
              </span>
            )}
          </div>
          <div className="text-[11px] mt-1 opacity-80">
            Hồ sơ đã nộp cần thẩm định
          </div>
        </div>

        {/* Đã duyệt (Approved) */}
        <div
          onClick={() => setStatusFilter("approved")}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "approved"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-emerald-200 hover:border-emerald-300 shadow-2xs"
          }`}
        >
          <div className="text-xs font-medium opacity-90 flex items-center justify-between">
            <span>Đã phê duyệt</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.approved}</div>
          <div className="text-[11px] mt-1 opacity-80">
            Đang hoạt động trên sàn
          </div>
        </div>

        {/* Bị từ chối (Rejected) */}
        <div
          onClick={() => setStatusFilter("rejected")}
          className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "rejected"
              ? "bg-rose-600 text-white border-rose-600 shadow-md scale-[1.02]"
              : "bg-white text-slate-700 border-rose-200 hover:border-rose-300 shadow-2xs"
          }`}
        >
          <div className="text-xs font-medium opacity-90 flex items-center justify-between">
            <span>Bị từ chối</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.rejected}</div>
          <div className="text-[11px] mt-1 opacity-80">
            Cần bổ sung / nộp lại
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên doanh nghiệp, MST, email, SĐT..."
            className="pl-9.5 text-xs h-10 bg-slate-50/60 focus:bg-white border-slate-200 rounded-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Role Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500"
              }`}
            >
              Tất cả vai trò
            </button>
            <button
              onClick={() => setRoleFilter("agency")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === "agency"
                  ? "bg-amber-500 text-white shadow-2xs font-bold"
                  : "text-slate-600"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Agency (Lữ hành)</span>
            </button>
            <button
              onClick={() => setRoleFilter("provider")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                roleFilter === "provider"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-slate-600"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Provider (Dịch vụ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PARTNER LIST TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div
            role="status"
            className="p-12 text-center text-sm text-slate-500"
          >
            Đang tải hồ sơ đối tác...
          </div>
        ) : loadError ? (
          <div role="alert" className="p-12 text-center text-sm text-rose-700">
            {loadError}
            <Button
              variant="outline"
              onClick={refresh}
              className="ml-3 rounded-xl"
            >
              Thử lại
            </Button>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Không tìm thấy đối tác nào phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc chuyển sang bộ lọc trạng thái
              khác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Doanh nghiệp / Pháp nhân</th>
                  <th className="py-3.5 px-4">Người đại diện & Liên hệ</th>
                  <th className="py-3.5 px-4">Trụ sở & Giấy phép</th>
                  <th className="py-3.5 px-4">Trạng thái duyệt</th>
                  <th className="py-3.5 px-4 text-right">
                    Hành động kiểm duyệt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPartners.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-sky-50/30 transition-colors group"
                  >
                    {/* Cột 1: Thông tin Doanh nghiệp */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 group-hover:text-[#075985] transition-colors">
                            {item.businessName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                              item.type === "agency"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            }`}
                          >
                            {item.type === "agency" ? (
                              <Compass className="w-3 h-3" />
                            ) : (
                              <Store className="w-3 h-3" />
                            )}
                            <span>
                              {item.type === "agency"
                                ? "Agency / Lữ hành"
                                : "Nhà cung cấp"}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span>
                            MST:{" "}
                            <strong className="text-slate-800 font-mono">
                              {item.taxCode}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Người đại diện */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">
                          {item.representativeName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{item.email}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Địa chỉ & Giấy phép */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="space-y-1">
                        <div className="text-slate-600 line-clamp-1 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="truncate">{item.address}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPartner(item);
                              setShowDetailModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-[#075985] hover:text-[#0369a1] font-bold hover:underline cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Bản chụp Giấy phép KD</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Cột 4: Trạng thái */}
                    <td className="py-4 px-4">
                      {item.status === "pending" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Chờ xét duyệt</span>
                        </span>
                      )}
                      {item.status === "approved" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đã phê duyệt</span>
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Bị từ chối</span>
                          </span>
                          {item.rejectionReason && (
                            <p className="text-[10px] text-rose-700 italic line-clamp-1 max-w-xs">
                              Lý do: "{item.rejectionReason}"
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Cột 5: Nút hành động */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút Xem chi tiết */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPartner(item);
                            setShowDetailModal(true);
                          }}
                          className="h-8 px-2.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline ml-1">
                            Xem hồ sơ
                          </span>
                        </Button>

                        {/* Nút Phê duyệt (Có modal xác nhận & nhập ghi chú) */}
                        {item.status === "pending" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenApproveModal(item)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Duyệt</span>
                          </Button>
                        )}

                        {/* Nút Từ chối (BẮT BUỘC NHẬP LÝ DO TẠI SAO) */}
                        {item.status === "pending" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRejectModal(item)}
                            className="h-8 px-2.5 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Từ chối</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
        <span>
          Trang {page} · Tổng {total} hồ sơ phù hợp
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Trang trước
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={loading || page * 20 >= total}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={refresh}
          >
            Tải lại
          </Button>
        </div>
      </div>
      {/* ========================================================================= */}
      {/* MODAL 1: PHÊ DUYỆT HỒ SƠ ĐỐI TÁC (CÓ Ô NHẬP LỜI NHẮN / GHI CHÚ) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(approvingPartner)}
        onOpenChange={(open) =>
          !open && !isReviewing && setApprovingPartner(null)
        }
      >
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Phê duyệt Hồ sơ Doanh nghiệp đối tác
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cấp quyền chính thức hoạt động trên sàn cho:{" "}
              <strong className="text-slate-900">
                {approvingPartner?.businessName}
              </strong>{" "}
              (MST: {approvingPartner?.taxCode})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Quyền lợi sau khi được Admin phê duyệt:</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Tài khoản sẽ được mở khóa 100% tính năng, được phép đăng
                tour/dịch vụ lên sàn công khai và tham gia liên minh hợp tác
                doanh nghiệp.
              </p>
            </div>
          </div>

          {reviewError && (
            <p role="alert" className="text-xs text-rose-700">
              {reviewError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isReviewing}
              onClick={() => setApprovingPartner(null)}
              className="text-xs h-10 px-4 rounded-xl cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              disabled={isReviewing}
              onClick={handleConfirmApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận Phê duyệt & Kích hoạt</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: TỪ CHỐI HỒ SƠ ĐỐI TÁC (BẮT BUỘC PHẢI NHẬP LÝ DO TẠI SAO) */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(rejectingPartner)}
        onOpenChange={(open) =>
          !open && !isReviewing && setRejectingPartner(null)
        }
      >
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Từ chối Phê duyệt Hồ sơ Đối tác
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Doanh nghiệp:{" "}
              <strong className="text-slate-900">
                {rejectingPartner?.businessName}
              </strong>{" "}
              (MST: {rejectingPartner?.taxCode})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Quy định kiểm duyệt bắt buộc:</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Quản trị viên{" "}
                <strong>bắt buộc phải ghi rõ lý do từ chối</strong> (lưu vào cột{" "}
                <code>rejection_reason</code> của bảng{" "}
                <code>business_profiles</code>) để đối tác biết chính xác điểm
                sai sót cần sửa đổi.
              </p>
            </div>

            {/* Ô NHẬP LÝ DO BẮT BUỘC */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>
                  Lý do từ chối hồ sơ (Bắt buộc){" "}
                  <span className="text-rose-600">*</span>
                </span>
              </Label>
              <Textarea
                maxLength={2000}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  setRejectError("");
                }}
                rows={3}
                placeholder="VD: Mã số thuế không trùng khớp với Giấy đăng ký kinh doanh. Bản chụp giấy phép bị mờ, đề nghị gửi lại..."
                className={`text-xs bg-slate-50 focus:bg-white resize-none ${
                  rejectError ? "border-rose-500 focus:ring-rose-500" : ""
                }`}
              />
              {rejectError && (
                <p className="text-[11px] text-rose-600 font-semibold">
                  {rejectError}
                </p>
              )}
            </div>

            {/* GỢI Ý LÝ DO NHANH (QUICK PRESETS) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý lý do phổ biến (Bấm để chọn nhanh):</span>
              </span>
              <div className="flex flex-col gap-1.5">
                {rejectionPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRejectReason(preset);
                      setRejectError("");
                    }}
                    className="text-left text-[11px] p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    • {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {reviewError && (
            <p role="alert" className="text-xs text-rose-700">
              {reviewError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isReviewing}
              onClick={() => setRejectingPartner(null)}
              className="text-xs h-10 px-4 rounded-xl cursor-pointer"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              disabled={isReviewing}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 px-5 rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
              <span>Xác nhận Từ chối hồ sơ</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: XEM CHI TIẾT ĐẦY ĐỦ HỒ SƠ & BẢN CHỤP GIẤY PHÉP */}
      {/* ========================================================================= */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-4xl md:max-w-4xl w-[94vw] max-w-4xl rounded-3xl p-0 bg-white text-slate-900 border border-slate-200/90 shadow-2xl overflow-hidden focus:outline-none block">
          {selectedPartner && (
            <div className="flex flex-col max-h-[88vh]">
              {/* HEADER MODAL */}
              <div
                className={`px-7 py-5 border-b border-slate-200/80 pr-14 ${
                  selectedPartner.type === "agency"
                    ? "bg-gradient-to-r from-amber-500/10 via-sky-50/40 to-white"
                    : "bg-gradient-to-r from-emerald-500/10 via-teal-50/40 to-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${
                        selectedPartner.type === "agency"
                          ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs"
                      }`}
                    >
                      {selectedPartner.type === "agency" ? (
                        <>
                          <Compass className="w-3.5 h-3.5 text-amber-800" />
                          <span>Doanh nghiệp Lữ hành (Agency)</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3.5 h-3.5 text-emerald-800" />
                          <span>Nhà cung cấp Dịch vụ (Provider)</span>
                        </>
                      )}
                    </span>

                    {/* Trạng thái hiện tại */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                        selectedPartner.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : selectedPartner.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-300"
                            : "bg-amber-50 text-amber-700 border-amber-300"
                      }`}
                    >
                      {selectedPartner.status === "approved" && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã phê duyệt</span>
                        </>
                      )}
                      {selectedPartner.status === "rejected" && (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Đã từ chối</span>
                        </>
                      )}
                      {selectedPartner.status === "pending" && (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Đang chờ xét duyệt</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedPartner.businessName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>
                      Hồ sơ thẩm định tư cách đối tác hệ sinh thái TripOps
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span>
                      Mã số thuế:{" "}
                      <strong className="font-mono text-slate-700">
                        {selectedPartner.taxCode}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>

              {/* BODY CONTENT (2-COLUMN BALANCED LAYOUT ON DESKTOP) */}
              <div className="p-7 space-y-5 overflow-y-auto bg-slate-50/60 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* CỘT TRÁI (7 PHẦN): THÔNG TIN PHÁP NHÂN & ĐẠI DIỆN */}
                  <div className="lg:col-span-7 space-y-5">
                    {/* 1. THÔNG TIN PHÁP NHÂN */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <Building2 className="w-4 h-4 text-[#075985]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          1. Thông tin pháp nhân doanh nghiệp
                        </h3>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                              Tên cơ sở kinh doanh
                            </span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                              {selectedPartner.businessName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                              Mã số thuế (MST)
                            </span>
                            <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg inline-block mt-0.5 border border-slate-200">
                              {selectedPartner.taxCode}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Địa chỉ trụ sở kinh doanh
                          </span>
                          <div className="font-medium text-slate-800 flex items-start gap-1.5 mt-0.5">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{selectedPartner.address}</span>
                          </div>
                        </div>

                        {selectedPartner.description && (
                          <div>
                            <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                              Giới thiệu năng lực hoạt động
                            </span>
                            <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed text-xs">
                              {selectedPartner.description}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. NGƯỜI ĐẠI DIỆN PHÁP LUẬT */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <UserCheck className="w-4 h-4 text-[#075985]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          2. Người đại diện & Thông tin liên hệ
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Họ và tên người đại diện
                          </span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                            {cleanDisplayName(
                              selectedPartner.representativeName,
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Số điện thoại liên hệ
                          </span>
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{selectedPartner.phone}</span>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-[11px] text-slate-400 font-semibold block uppercase">
                            Email đăng nhập tài khoản
                          </span>
                          <div className="font-medium text-slate-900 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{selectedPartner.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI (5 PHẦN): HỒ SƠ PHÁP LÝ & QUYẾT ĐỊNH XÉT DUYỆT */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* 3. TÀI LIỆU GIẤY PHÉP KINH DOANH */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            3. Hồ sơ pháp lý
                          </h3>
                        </div>
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tệp gốc</span>
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              Ảnh giấy phép kinh doanh
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Bản chụp do đối tác cung cấp
                            </div>
                          </div>
                        </div>

                        {selectedPartner.licenseUrl && (
                          <img
                            src={selectedPartner.licenseUrl}
                            alt="Ảnh giấy phép kinh doanh của đối tác"
                            className="max-h-72 w-full object-contain rounded-xl bg-white"
                          />
                        )}
                        <a
                          href={selectedPartner.licenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4 text-[#075985]" />
                          <span>Mở xem tài liệu gốc</span>
                        </a>
                      </div>
                    </div>

                    {/* HỘP CẢNH BÁO NẾU ĐÃ BỊ TỪ CHỐI */}
                    {selectedPartner.rejectionReason && (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5 text-xs">
                        <div className="font-bold text-rose-950 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Lý do từ chối trước đó:</span>
                        </div>
                        <p className="text-rose-800 leading-relaxed italic pl-6">
                          "{selectedPartner.rejectionReason}"
                        </p>
                      </div>
                    )}

                    {/* HỘP GHI CHÚ DUYỆT / CHỈ DẪN ADMIN */}
                    <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 text-xs text-sky-950 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-[#075985]">
                        <ShieldCheck className="w-4 h-4 text-[#075985]" />
                        <span>Nguyên tắc thẩm định sàn:</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Đối chiếu chính xác Mã số thuế và tên pháp nhân với Cổng
                        thông tin Quốc gia về ĐKKD trước khi bấm Phê duyệt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="px-7 py-4.5 bg-white border-t border-slate-200/80 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                  className="text-xs h-10 px-5 rounded-xl cursor-pointer font-semibold border-slate-300"
                >
                  Đóng
                </Button>

                <div className="flex items-center gap-2.5">
                  {selectedPartner.status === "pending" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenRejectModal(selectedPartner);
                      }}
                      className="h-10 px-4.5 border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1.5 cursor-pointer rounded-xl"
                    >
                      <X className="w-4 h-4" />
                      <span>Từ chối hồ sơ</span>
                    </Button>
                  )}

                  {selectedPartner.status === "pending" && (
                    <Button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenApproveModal(selectedPartner);
                      }}
                      className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 cursor-pointer shadow-xs rounded-xl"
                    >
                      <Check className="w-4 h-4" />
                      <span>Phê duyệt hồ sơ</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
