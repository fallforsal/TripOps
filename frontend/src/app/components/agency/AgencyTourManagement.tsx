import { useState, useEffect } from "react";
import {
  Tour,
  TourCompany,
  DailyItinerary,
  TourPriceRow,
  TourMeal,
  TourAlternativeMeal,
  TourHotel,
  TourAlternativeHotel,
  Location,
  TourVersion,
  CustomTourRequest,
} from "@/app/types";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Package,
  MapPin,
  Clock,
  Users,
  Star,
  DollarSign,
  Building2,
  Calendar,
  Sparkles,
  Utensils,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Eye,
  RefreshCw,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Sun,
  LayoutGrid,
  List,
  Search,
  Download,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  EyeOff,
  Handshake,
  UserPlus,
  Tag,
  Lock,
  History,
} from "lucide-react";
import { mockTourCompanies } from "@/app/data/mockData";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/app/components/ui/alert-dialog";
import { TourDetailPage } from "@/app/components/user/TourDetailPage";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { TourVersionHistoryModal } from "@/app/components/agency/TourVersionHistoryModal";
import { eligibleServices, type EligibleService } from "@/app/services/wf02Tours";
import { AIItineraryPlannerModal } from "@/app/components/ai/AIItineraryPlannerModal";

export interface AgencyTourManagementProps {
  tours: Tour[];
  company: TourCompany;
  onCreateTour: (tour: Omit<Tour, "id">) => void | Promise<unknown>;
  onEditTour: (tourId: string, tour: Partial<Tour>) => void | Promise<unknown>;
  onDeleteTour: (tourId: string) => void | Promise<unknown>;
  onDuplicateTour?: (tourId: string, name: string) => Promise<void>;
  onRestoreTourVersion?: (tourId: string, versionNumber: number) => void;
}

// Kiểu hành động cần hiển thị hộp thoại xác nhận đẹp mắt
type ConfirmActionType = "duplicate" | "hide" | "publish" | "delete";

interface PendingAction {
  type: ConfirmActionType;
  tour: Tour;
}

export function AgencyTourManagement({
  tours,
  company,
  onCreateTour,
  onEditTour,
  onDeleteTour,
  onDuplicateTour,
  onRestoreTourVersion,
}: AgencyTourManagementProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Hộp thoại xác nhận UI cao cấp (AlertDialog) cho các hành động: Nhân bản, Ẩn/Hiện, Xóa
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Trang xem chi tiết tour riêng biệt (không mở popup)
  const [viewingTour, setViewingTour] = useState<Tour | null>(null);
  const [versionTour, setVersionTour] = useState<Tour | null>(null);

  // Chế độ xem & Bộ lọc
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "hidden">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc" | "rating" | "bookings">("newest");
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);

  const isApproved = company.status === "approved";

  // LOẠI BỎ TOUR THIẾT KẾ RIÊNG VÀ TOUR ĐÃ XÓA (Soft-deleted theo Database Schema: is_request, status, visibility)
  const publicTours = tours.filter((t) => !t.is_request && t.tourType !== "custom_request" && (t.status as any) !== "deleted");

  const publishedCount = publicTours.filter((t) => (t.status === "completed" || t.status === "published" || !t.status) && (t.visibility === "public" || !t.visibility)).length;
  const draftCount = publicTours.filter((t) => t.status === "draft").length;
  const hiddenCount = publicTours.filter((t) => (t.status === "completed" || t.status === "published") && t.visibility === "hidden").length;

  // Lọc và sắp xếp danh sách tour công khai
  const filteredTours = publicTours
    .filter((t) => {
      // Bộ lọc trạng thái & hiển thị theo Database Schema (status: completed | draft, visibility: public | hidden)
      if (statusFilter === "published" && ((t.status !== "completed" && t.status !== "published" && !!t.status) || t.visibility === "hidden")) return false;
      if (statusFilter === "draft" && t.status !== "draft") return false;
      if (statusFilter === "hidden" && (t.visibility !== "hidden" || t.status === "draft")) return false;

      // Tìm kiếm theo Tên tour, Mã tour, Điểm đến
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchCode = (t.tourCode || "").toLowerCase().includes(q);
        const matchDest = (t.destination || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDest) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "bookings") return (b.bookings || 0) - (a.bookings || 0);
      return 0;
    });

  // Xử lý thực thi hành động sau khi người dùng xác nhận trên AlertDialog
  const handleExecuteConfirmedAction = async () => {
    if (!pendingAction) return;
    const { type, tour } = pendingAction;
    setActionBusy(true); setActionError("");
    try {
      if (type === "duplicate") {
        if (!onDuplicateTour) throw new Error("Không thể nhân bản tour này.");
        await onDuplicateTour(tour.id, `${tour.name} (Bản sao)`);
        setCopiedNotice(`Đã tạo bản nháp từ "${tour.name}".`);
      } else if (type === "hide") {
        await onEditTour(tour.id, { visibility: "hidden" });
        setCopiedNotice(`Đã tạm ẩn tour "${tour.name}".`);
      } else if (type === "publish") {
        await onEditTour(tour.id, { status: "completed", visibility: "public" });
        setCopiedNotice(`Đã đăng bán tour "${tour.name}".`);
      } else if (type === "delete") {
        await onDeleteTour(tour.id);
        setCopiedNotice(`Đã lưu trữ tour "${tour.name}".`);
      }
      setPendingAction(null);
      setTimeout(() => setCopiedNotice(null), 3500);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể cập nhật tour.");
    } finally {
      setActionBusy(false);
    }
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedTourIds.length === filteredTours.length) {
      setSelectedTourIds([]);
    } else {
      setSelectedTourIds(filteredTours.map((t) => t.id));
    }
  };

  const handleBulkToggleVisibility = async (toVisibility: "public" | "hidden") => {
    setActionBusy(true); setActionError("");
    try {
      for (const id of selectedTourIds) await onEditTour(id, { visibility: toVisibility, status: "completed" });
      setCopiedNotice(`Đã cập nhật ${selectedTourIds.length} tour.`);
      setSelectedTourIds([]);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Không thể cập nhật tour."); }
    finally { setActionBusy(false); }
  };

  // 1. Nếu đang mở xem chi tiết tour -> Render trang TourDetailPage RIÊNG BIỆT (Toàn màn hình)
  if (viewingTour) {
    return (
      <div className="w-full bg-[#F0F9FF] min-h-screen">
        <TourDetailPage
          tour={viewingTour}
          services={[]}
          currentUser={company as any}
          onBack={() => setViewingTour(null)}
          onEditTour={onEditTour}
          onDeleteTour={(id) => {
            onDeleteTour(id);
            setViewingTour(null);
          }}
        />
      </div>
    );
  }

  // 2. Nếu đang tạo mới hoặc chỉnh sửa tour -> Render trang TourFormPage RIÊNG BIỆT
  if (showCreateModal || !!editingTour) {
    return (
      <TourFormPage
        tour={editingTour}
        company={company}
        isCustomTour={false}
        onBack={() => {
          setShowCreateModal(false);
          setEditingTour(null);
        }}
        onSubmit={async (data) => {
          if (editingTour) {
            await onEditTour(editingTour.id, data);
            setEditingTour(null);
          } else {
            await onCreateTour(data as Omit<Tour, "id">);
            setShowCreateModal(false);
          }
        }}
      />
    );
  }

  // 3. Màn hình Quản Lý Tour chính
  return (
    <div className="space-y-6 w-full">
      {actionError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
      {/* HEADER: TIÊU ĐỀ & NÚT TÁC VỤ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quản lý Tour</h2>
          <p className="text-xs text-gray-500 mt-1">
            {publicTours.length} tour công khai · {publishedCount} đang mở bán · {draftCount} bản nháp · {hiddenCount} tạm dừng
          </p>
        </div>

        <div className="flex items-center gap-2.5">

          {/* Nút Tạo Tour mới */}
          <Button
            disabled={!isApproved}
            onClick={() => setShowCreateModal(true)}
            className="bg-[#075985] hover:bg-[#F97316] text-white text-xs font-bold flex items-center gap-1.5 h-9 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Tour mới</span>
          </Button>
        </div>
      </div>

      {/* TOOLBAR: TÌM KIẾM, SẮP XẾP, TABS TRẠNG THÁI & CHUYỂN VIEW LƯỚI / BẢNG */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên tour, mã tour (T001...), hoặc điểm đến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Sắp xếp */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 whitespace-nowrap">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-white border border-[#CBD5E1] rounded-xl px-2.5 py-2 text-gray-700 font-medium focus:outline-none focus:border-[#075985]"
              >
                <option value="newest">Mới cập nhật nhất</option>
                <option value="price-asc">Giá: Thấp đến cao</option>
                <option value="price-desc">Giá: Cao đến thấp</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="bookings">Lượng khách đặt nhiều</option>
              </select>
            </div>

            {/* Chuyển đổi Lưới / Bảng */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Chế độ Lưới (Grid View)"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "grid" ? "bg-white text-[#075985] shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Lưới</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Chế độ Bảng (Table View)"
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "table" ? "bg-white text-[#075985] shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Bảng</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Phân Loại: Chỉ gồm các tour công khai (Tất cả, Đang mở bán, Tạm dừng) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD5E1] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "all"
                  ? "bg-[#075985] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Tất cả ({publicTours.length})
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "published"
                  ? "bg-[#075985] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Đang mở bán ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "draft"
                  ? "bg-[#075985] text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Bản nháp ({draftCount})
            </button>
            <button
              onClick={() => setStatusFilter("hidden")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === "hidden"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Chưa đăng / Tạm ẩn ({hiddenCount})
            </button>
          </div>

          {/* Thao tác chọn hàng loạt */}
          {selectedTourIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[#E0F2FE] px-3 py-1 rounded-xl border border-[#075985]/30 animate-in fade-in">
              <span className="text-xs font-bold text-[#075985]">Đã chọn {selectedTourIds.length} tour:</span>
              <button
                onClick={() => handleBulkToggleVisibility("published")}
                className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded hover:bg-emerald-200"
              >
                Mở bán
              </button>
              <button
                onClick={() => handleBulkToggleVisibility("hidden")}
                className="text-[11px] font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded hover:bg-slate-300"
              >
                Tạm dừng
              </button>
              <button
                onClick={() => setSelectedTourIds([])}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1"
              >
                Bỏ chọn
              </button>
            </div>
          )}
        </div>
      </div>

      {copiedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{copiedNotice}</span>
          </div>
          <button
            onClick={() => setCopiedNotice(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isApproved && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700">
          Công ty chưa được phê duyệt. Bạn cần được nền tảng phê duyệt để tạo và đăng tour.
        </div>
      )}

      {/* DANH SÁCH TOUR: HIỂN THỊ DẠNG LƯỚI HOẶC BẢNG */}
      {filteredTours.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD5E1] p-16 text-center shadow-xs">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            {statusFilter === "active"
              ? "Chưa có tour công khai nào đang mở bán"
              : statusFilter === "hidden"
              ? "Không có tour nào đang tạm dừng"
              : "Không tìm thấy tour nào phù hợp"}
          </p>
          {isApproved && (
            <Button className="mt-4 bg-[#075985] text-white" onClick={() => setShowCreateModal(true)}>
              Tạo tour mới ngay
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* CHẾ ĐỘ LƯỚI (GRID VIEW) */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTours.map((tour) => {
            const isSelected = selectedTourIds.includes(tour.id);

            return (
              <div
                key={tour.id}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between group ${
                  isSelected ? "border-[#075985] ring-2 ring-[#075985]/20" : "border-[#CBD5E1]"
                }`}
              >
                <div>
                  {/* Ảnh bìa & Thẻ Tag */}
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    {tour.image ? <img src={tour.image} alt={tour.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-10 h-10" /></div>}

                    {/* Checkbox chọn hàng loạt */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedTourIds((prev) =>
                            isSelected ? prev.filter((id) => id !== tour.id) : [...prev, tour.id]
                          );
                        }}
                        className="w-4 h-4 rounded text-[#075985] bg-white/90 border-slate-300 focus:ring-0 cursor-pointer shadow-sm"
                      />
                    </div>

                    <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold text-slate-800">{tour.rating || "—"}</span>
                    </div>

                    <div className="absolute top-2.5 left-9 flex items-center gap-1.5 flex-wrap">
                      <div className="bg-[#075985] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        {tour.tourCode || "T-NEW"}
                      </div>

                      {tour.status === "draft" && (
                        <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Bản nháp
                        </div>
                      )}
                      {tour.visibility === "hidden" && tour.status !== "draft" && (
                        <div className="bg-slate-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Chưa đăng / Tạm ẩn
                        </div>
                      )}
                      {(tour.status === "completed" || tour.status === "published" || !tour.status) && tour.visibility !== "hidden" && (
                        <div className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          Đang mở bán
                        </div>
                      )}
                    </div>

                    {tour.images && tour.images.length > 1 && (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-semibold">
                        +{tour.images.length} ảnh
                      </div>
                    )}
                    {tour.operationPeriod && (
                      <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-medium">
                        {tour.operationPeriod}
                      </div>
                    )}
                  </div>

                  {/* Nội dung thông tin Tour */}
                  <div className="p-4 space-y-3">
                    <h3
                      onClick={() => setViewingTour(tour)}
                      className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 min-h-[38px] group-hover:text-[#075985] transition-colors cursor-pointer"
                      title="Bấm để xem trang chi tiết tour"
                    >
                      {tour.name}
                    </h3>

                    {/* Chi tiết tour */}
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#075985]" />
                        <span className="font-medium text-slate-800">{tour.destination}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#075985]" />
                        <span>{tour.duration} ({tour.itinerary?.length ?? tour.numberOfDays ?? 0} ngày lịch trình)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#075985]" />
                        <span>Quy mô đoàn: {tour.minGuests} – {tour.maxGuests} khách (Nhận trọn đoàn)</span>
                      </div>
                      {tour.highlights && tour.highlights.length > 0 && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic pt-0.5">
                          ★ {tour.highlights.slice(0, 2).join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer thẻ: Giá & Các nút thao tác quản lý */}
                <div className="px-4 pb-4 pt-1">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Giá cơ bản từ</p>
                      <p className="text-base font-extrabold text-[#075985]">
                        {tour.price.toLocaleString("vi-VN")}đ
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Xem trang chi tiết tour riêng biệt */}
                      <button
                        type="button"
                        title="Xem trang chi tiết tour"
                        onClick={() => setViewingTour(tour)}
                        className="p-1.5 text-slate-600 hover:text-[#075985] hover:bg-[#F0F9FF] rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Nút hành động Mở bán / Tạm dừng / Đăng bán bản nháp */}
                      {tour.status === "draft" ? (
                        <button
                          type="button"
                          title="Đăng & Mở bán tour lên sàn TripOps"
                          onClick={() => setPendingAction({ type: "publish", tour })}
                          className="p-1.5 text-amber-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title={tour.visibility === "hidden" ? "Mở bán lại tour trên sàn" : "Tạm ẩn tour khỏi sàn"}
                          onClick={() => {
                            const actionType = tour.visibility === "hidden" ? "publish" : "hide";
                            setPendingAction({ type: actionType, tour });
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            tour.visibility === "hidden"
                              ? "text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                              : "text-emerald-600 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {tour.visibility === "hidden" ? <ToggleLeft className="w-4 h-4 text-slate-400" /> : <ToggleRight className="w-4 h-4 text-emerald-600" />}
                        </button>
                      )}

                      {/* Chỉnh sửa chi tiết tour */}
                      <button
                        type="button"
                        title="Chỉnh sửa chi tiết tour"
                        onClick={() => setEditingTour(tour)}
                        className="p-1.5 text-slate-500 hover:text-[#075985] hover:bg-[#F0F9FF] rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button type="button" title="Lịch sử phiên bản" onClick={() => setVersionTour(tour)}
                        className="p-1.5 text-slate-500 hover:text-[#075985] hover:bg-[#F0F9FF] rounded-lg">
                        <History className="w-4 h-4" />
                      </button>

                      {/* Nhân bản tour (có hộp thoại xác nhận) */}
                      <button
                        type="button"
                        title="Nhân bản tour (Duplicate)"
                        onClick={() => setPendingAction({ type: "duplicate", tour })}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Xóa tour (có hộp thoại xác nhận) */}
                      <button
                        type="button"
                        title="Lưu trữ tour"
                        onClick={() => setPendingAction({ type: "delete", tour })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* CHẾ ĐỘ BẢNG (TABLE VIEW) */
        <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#CBD5E1] text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTourIds.length === filteredTours.length && filteredTours.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded text-[#075985] border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Mã & Tên Tour</th>
                  <th className="p-3.5">Điểm Đến</th>
                  <th className="p-3.5">Thời Lượng</th>
                  <th className="p-3.5">Quy Mô Nhận Đoàn</th>
                  <th className="p-3.5">Giá Sàn (VNĐ)</th>
                  <th className="p-3.5">Trạng Thái</th>
                  <th className="p-3.5 text-right">Thao Tác Quản Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTours.map((tour) => {
                  const isSelected = selectedTourIds.includes(tour.id);

                  return (
                    <tr
                      key={tour.id}
                      className={`hover:bg-slate-50/60 transition-colors ${isSelected ? "bg-[#F0F9FF]" : ""}`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedTourIds((prev) =>
                              isSelected ? prev.filter((id) => id !== tour.id) : [...prev, tour.id]
                            );
                          }}
                          className="w-4 h-4 rounded text-[#075985] border-slate-300 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {tour.image ? <img src={tour.image} alt={tour.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                            : <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>}
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#075985]">
                                {tour.tourCode || "T-NEW"}
                              </span>
                              <span className="flex items-center text-[10px] text-amber-500 font-bold">
                                ★ {tour.rating || "—"}
                              </span>
                            </div>
                            <p
                              onClick={() => setViewingTour(tour)}
                              className="font-bold text-slate-900 line-clamp-1 max-w-[280px] hover:text-[#075985] cursor-pointer"
                              title="Bấm để xem trang chi tiết tour"
                            >
                              {tour.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-800 font-medium">{tour.destination}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-600">{tour.duration}</span>
                        <div className="text-[10px] text-slate-400">({tour.itinerary?.length ?? tour.numberOfDays ?? 0} ngày lịch trình)</div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-700">{tour.minGuests} – {tour.maxGuests} khách</span>
                        <div className="text-[10px] text-slate-400">Nhận trọn đoàn</div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-extrabold text-[#075985] text-sm">
                          {tour.price.toLocaleString("vi-VN")}đ
                        </span>
                      </td>

                      <td className="p-3.5">
                        {tour.status === "draft" ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            Bản nháp
                          </span>
                        ) : tour.visibility === "hidden" ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                            Chưa đăng / Tạm ẩn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Đang mở bán
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Xem trang chi tiết tour"
                            onClick={() => setViewingTour(tour)}
                            className="p-1.5 text-slate-500 hover:text-[#075985] hover:bg-[#F0F9FF] rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {tour.status === "draft" ? (
                            <button
                              type="button"
                              title="Đăng & Mở bán tour lên sàn TripOps"
                              onClick={() => setPendingAction({ type: "publish", tour })}
                              className="p-1.5 text-amber-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title={tour.visibility === "hidden" ? "Mở bán lại tour trên sàn" : "Tạm ẩn tour khỏi sàn"}
                              onClick={() => {
                                const actionType = tour.visibility === "hidden" ? "publish" : "hide";
                                setPendingAction({ type: actionType, tour });
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                            >
                              {tour.visibility === "hidden" ? <ToggleLeft className="w-4 h-4 text-slate-400" /> : <ToggleRight className="w-4 h-4 text-emerald-600" />}
                            </button>
                          )}
                          <button
                            type="button"
                            title="Chỉnh sửa chi tiết"
                            onClick={() => setEditingTour(tour)}
                            className="p-1.5 text-slate-500 hover:text-[#075985] hover:bg-[#F0F9FF] rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button type="button" title="Lịch sử phiên bản" onClick={() => setVersionTour(tour)}
                            className="p-1.5 text-slate-500 hover:text-[#075985] hover:bg-[#F0F9FF] rounded-lg">
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Nhân bản tour (Duplicate)"
                            onClick={() => setPendingAction({ type: "duplicate", tour })}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Lưu trữ tour"
                            onClick={() => setPendingAction({ type: "delete", tour })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HỘP THOẠI XÁC NHẬN HÀNH ĐỘNG (ALERT DIALOG UI CAO CẤP)                   */}
      {/* ========================================================================= */}
      <TourVersionHistoryModal isOpen={!!versionTour} onClose={() => setVersionTour(null)}
        tour={versionTour} onRestoreVersion={(id, version) => {
          void Promise.resolve(onRestoreTourVersion?.(id, version)).catch(error =>
            setActionError(error instanceof Error ? error.message : "Không thể khôi phục phiên bản."));
        }} />
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="max-w-md p-6 rounded-2xl bg-white shadow-xl border border-slate-200">
          <AlertDialogHeader className="space-y-3">
            {/* Header Icon & Title */}
            <div className="flex items-center gap-3">
              {pendingAction?.type === "delete" && (
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
              )}
              {pendingAction?.type === "hide" && (
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <EyeOff className="w-5 h-5" />
                </div>
              )}
              {pendingAction?.type === "publish" && (
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
              )}
              {pendingAction?.type === "duplicate" && (
                <div className="w-11 h-11 rounded-2xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5" />
                </div>
              )}

              <div>
                <AlertDialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {pendingAction?.type === "delete" && "Xác nhận lưu trữ tour"}
                  {pendingAction?.type === "hide" && "Xác nhận tạm dừng mở bán tour"}
                  {pendingAction?.type === "publish" && "Xác nhận mở bán lại tour"}
                  {pendingAction?.type === "duplicate" && "Xác nhận nhân bản tour"}
                </AlertDialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã tour: <span className="font-bold text-slate-700">{pendingAction?.tour.tourCode}</span>
                </p>
              </div>
            </div>

            {/* Tour Info Preview Box */}
            {pendingAction?.tour && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-left">
                {pendingAction.tour.image ? <img src={pendingAction.tour.image} alt={pendingAction.tour.name}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                  : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{pendingAction.tour.name}</p>
                  <p className="text-[11px] text-slate-500">{pendingAction.tour.destination} · {pendingAction.tour.duration}</p>
                  <p className="text-xs font-extrabold text-[#075985]">{pendingAction.tour.price.toLocaleString("vi-VN")}đ</p>
                </div>
              </div>
            )}

            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed text-left">
              {pendingAction?.type === "delete" && (
                <span className="text-rose-700 font-medium">
                  Tour sẽ được lưu trữ và ẩn khỏi danh sách đang bán. Lịch sử phiên bản và cấu hình vẫn được giữ trong hệ thống.
                </span>
              )}
              {pendingAction?.type === "hide" && (
                <span>
                  Tour này sẽ tạm thời bị ẩn khỏi sàn TripOps. Khách du lịch sẽ không tìm thấy hoặc gửi yêu cầu đặt tour này cho đến khi bạn mở bán trở lại.
                </span>
              )}
              {pendingAction?.type === "publish" && (
                <span>
                  {pendingAction.tour.status === "draft"
                    ? "Tour này sẽ được chuyển từ Bản nháp sang trạng thái Đang mở bán công khai trên sàn TripOps để khách hàng có thể tìm kiếm và đặt tour ngay."
                    : "Tour này sẽ được mở bán công khai trở lại trên sàn TripOps để khách hàng có thể tìm kiếm và đặt tour."}
                </span>
              )}
              {pendingAction?.type === "duplicate" && (
                <span>
                  Hệ thống sẽ sao chép toàn bộ thông tin lịch trình và bảng giá của tour này sang một bản ghi mới với mã tour mới để bạn chỉnh sửa nhanh.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <AlertDialogCancel
              onClick={() => setPendingAction(null)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs px-4 h-9"
            >
              Hủy bỏ
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); void handleExecuteConfirmedAction(); }}
              disabled={actionBusy}
              className={`text-xs font-bold text-white px-4 h-9 transition-colors ${
                pendingAction?.type === "delete"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : pendingAction?.type === "hide"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : pendingAction?.type === "publish"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#075985] hover:bg-[#F97316]"
              }`}
            >
              {pendingAction?.type === "delete" && "Lưu trữ tour"}
              {pendingAction?.type === "hide" && "Tạm dừng bán"}
              {pendingAction?.type === "publish" && (pendingAction.tour.status === "draft" ? "Đăng bán ngay" : "Mở bán lại")}
              {pendingAction?.type === "duplicate" && "Tạo bản sao"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
// =========================================================================
// COMPREHENSIVE TOUR FORM STANDALONE PAGE (CHUYỂN THÀNH TRANG RIÊNG BIỆT)
// =========================================================================

export interface TourFormPageProps {
  tour: Tour | null;
  company: TourCompany;
  onBack: () => void;
  onSubmit: (data: Partial<Tour>) => void | Promise<unknown>;
  customRequest?: CustomTourRequest | null;
  isCustomTour?: boolean;
}

type TabType = "general" | "itinerary" | "pricing" | "regulations" | "preview";

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

export function TourFormPage({
  tour,
  company,
  onBack,
  onSubmit,
  customRequest,
  isCustomTour,
}: TourFormPageProps) {
  const isCustom = isCustomTour || !!customRequest || tour?.tourType === "custom_request";
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [showAIPlanner, setShowAIPlanner] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [serviceOptions, setServiceOptions] = useState<EligibleService[]>([]);
  const [serviceError, setServiceError] = useState("");
  useEffect(() => {
    if (isCustom) return;
    let active = true;
    Promise.all([eligibleServices("hotel"), eligibleServices("fnb")])
      .then(groups => { if (active) setServiceOptions(groups.flat()); })
      .catch(error => { if (active) setServiceError(error instanceof Error ? error.message : "Không tải được danh mục dịch vụ."); });
    return () => { active = false; };
  }, [isCustom]);

  const handleApplyAIItinerary = (generated: {
    name: string;
    destination: string;
    duration: string;
    highlights: string[];
    description: string;
    itinerary: DailyItinerary[];
  }) => {
    setName(generated.name);
    setDestination(generated.destination);
    setDuration(generated.duration);
    setHighlights(generated.highlights);
    setDescription(generated.description);
    setItinerary(generated.itinerary);
    setNumberOfDays(generated.itinerary.length);
    setNumberOfNights(Math.max(1, generated.itinerary.length - 1));
  };

  // Tab 1: General Info
  const [tourCode, setTourCode] = useState(
    tour?.tourCode ?? ""
  );
  const [name, setName] = useState(
    tour?.name ?? (customRequest ? `Tour riêng: ${customRequest.destination} - Khách đoàn ${customRequest.customerName}` : "")
  );
  const [destination, setDestination] = useState(
    tour?.destination ?? (customRequest?.destination ?? "")
  );
  const [duration, setDuration] = useState(
    tour?.duration ?? (customRequest ? `${customRequest.numberOfDays} ngày ${Math.max(1, customRequest.numberOfDays - 1)} đêm` : "3 ngày 2 đêm")
  );
  const [numberOfDays, setNumberOfDays] = useState(
    tour?.numberOfDays ?? (customRequest?.numberOfDays ?? 3)
  );
  const [numberOfNights, setNumberOfNights] = useState(
    tour?.numberOfNights ?? (customRequest ? Math.max(1, customRequest.numberOfDays - 1) : 2)
  );
  const [price, setPrice] = useState(
    tour?.price ?? (customRequest?.estimatedBudget ? Math.round(customRequest.estimatedBudget / (customRequest.numberOfGuests || 1)) : 3500000)
  );

  // Photos & Thumbnail
  const initialImages: string[] = tour?.images || (tour?.image ? [tour.image] : []);
  const [images, setImages] = useState<string[]>(initialImages);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(0);

  // Operation period & Departure location
  const [operationPeriod, setOperationPeriod] = useState(
    tour?.operationPeriod ?? ""
  );
  const [departureLocation, setDepartureLocation] = useState(
    tour?.departureLocation ?? ""
  );
  const [minGuests, setMinGuests] = useState(
    tour?.minGuests ?? (customRequest?.numberOfGuests ?? 2)
  );
  const [maxGuests, setMaxGuests] = useState(
    tour?.maxGuests ?? (customRequest ? customRequest.numberOfGuests + 2 : 20)
  );
  const [description, setDescription] = useState(
    tour?.description ?? (customRequest?.specialRequests ? `Tour thiết kế riêng theo yêu cầu của ${customRequest.customerName}.\nYêu cầu đặc biệt: ${customRequest.specialRequests}` : "")
  );
  const [highlights, setHighlights] = useState<string[]>(tour?.highlights || []);
  const [newHighlight, setNewHighlight] = useState("");

  // Co-Hosting Alliance & Segment Quotation States (Hỗ trợ liên minh đa công ty)
  const [coHostsList, setCoHostsList] = useState<TourCoHost[]>(() => {
    if (tour?.coHosts && tour.coHosts.length > 0) return JSON.parse(JSON.stringify(tour.coHosts));
    if (customRequest?.coHosts && customRequest.coHosts.length > 0) return JSON.parse(JSON.stringify(customRequest.coHosts));
    return [];
  });
  const isCoHostedTour = !!(customRequest?.isCoHosted || tour?.isCoHosted || coHostsList.length > 0);
  const leadHost = coHostsList.find((ch) => ch.role === "lead") || (coHostsList.length > 0 ? coHostsList[0] : undefined);
  const partnerHosts = coHostsList.filter((ch) => ch.role === "partner");
  const myHost = coHostsList.find((ch) => ch.companyId === company.id);
  const otherHosts = coHostsList.filter((ch) => ch.companyId !== company.id);
  const isLeadCompany = !isCoHostedTour || !leadHost || leadHost.companyId === company.id;

  // State modal mời thêm đối tác lữ hành liên minh vào tour
  const [showAddCoHostModal, setShowAddCoHostModal] = useState(false);
  const [newPartnerCompanyId, setNewPartnerCompanyId] = useState("");
  const [newPartnerSegment, setNewPartnerSegment] = useState("");
  const [newPartnerBudget, setNewPartnerBudget] = useState(2000000);
  const [newPartnerNotes, setNewPartnerNotes] = useState("");

  const [myQuoteAdult, setMyQuoteAdult] = useState<number>(() => {
    if (myHost?.quoteAdult && myHost.quoteAdult > 0) return myHost.quoteAdult;
    if (myHost?.quotePerGuest && myHost.quotePerGuest > 0) return myHost.quotePerGuest;
    if (myHost?.role === "partner") {
      return myHost?.estimatedBudgetPerGuest || 2200000;
    }
    return 2100000;
  });
  const [myQuoteChild, setMyQuoteChild] = useState<number>(() => {
    if (myHost?.quoteChild !== undefined && myHost.quoteChild > 0) return myHost.quoteChild;
    return Math.round(myQuoteAdult * 0.7);
  });
  const [myQuoteInfant, setMyQuoteInfant] = useState<number>(() => {
    if (myHost?.quoteInfant !== undefined) return myHost.quoteInfant;
    return 0;
  });

  // Custom quotes for dynamic age groups added by the Lead company
  const [myCustomQuotes, setMyCustomQuotes] = useState<Record<string, number>>({});

  const getMyQuoteForRow = (row: TourPriceRow): number => {
    if (row.ageGroup === "adult" || row.ageGroupLabel.toLowerCase().includes("người lớn")) {
      return myQuoteAdult;
    }
    if (row.ageGroup === "child_2_11" || row.ageGroupLabel.toLowerCase().includes("trẻ em")) {
      return myQuoteChild;
    }
    if (row.ageGroup === "child_under_2" || row.ageGroupLabel.toLowerCase().includes("em bé")) {
      return myQuoteInfant;
    }
    return myCustomQuotes[row.ageGroup] ?? Math.round(myQuoteAdult * 0.85);
  };

  const setMyQuoteForRow = (row: TourPriceRow, val: number) => {
    if (row.ageGroup === "adult" || row.ageGroupLabel.toLowerCase().includes("người lớn")) {
      setMyQuoteAdult(val);
    } else if (row.ageGroup === "child_2_11" || row.ageGroupLabel.toLowerCase().includes("trẻ em")) {
      setMyQuoteChild(val);
    } else if (row.ageGroup === "child_under_2" || row.ageGroupLabel.toLowerCase().includes("em bé")) {
      setMyQuoteInfant(val);
    } else {
      setMyCustomQuotes((prev) => ({ ...prev, [row.ageGroup]: val }));
    }
  };

  const getPartnerQuoteForRow = (ch: TourCoHost, row: TourPriceRow): number => {
    const isMe = ch.companyId === company.id;
    if (isMe) return getMyQuoteForRow(row);

    const baseAdult = ch.quoteAdult ?? ch.quotePerGuest ?? ch.estimatedBudgetPerGuest ?? 0;
    if (row.ageGroup === "adult" || row.ageGroupLabel.toLowerCase().includes("người lớn")) {
      return baseAdult;
    }
    if (row.ageGroup === "child_2_11" || row.ageGroupLabel.toLowerCase().includes("trẻ em")) {
      return ch.quoteChild ?? Math.round(baseAdult * 0.7);
    }
    if (row.ageGroup === "child_under_2" || row.ageGroupLabel.toLowerCase().includes("em bé")) {
      return ch.quoteInfant ?? 0;
    }
    return Math.round(baseAdult * 0.85);
  };

  const getTotalQuoteForRow = (row: TourPriceRow): number => {
    if (!isCoHostedTour || coHostsList.length === 0) return row.price;
    return coHostsList.reduce((sum, ch) => sum + getPartnerQuoteForRow(ch, row), 0);
  };

  const myQuotePerGuest = myQuoteAdult;
  const setMyQuotePerGuest = setMyQuoteAdult;

  const [myQuoteStatus, setMyQuoteStatus] = useState<"draft" | "submitted">(
    myHost?.quoteStatus || "draft"
  );
  const [myQuoteNote, setMyQuoteNote] = useState<string>(
    myHost?.quoteNote || (myHost?.role === "lead"
      ? "Đã bao gồm xe đưa đón đoàn, phòng khách sạn chặng đầu, ăn uống và vé tham quan."
      : "Đã bao gồm khách sạn địa phương, ẩm thực đặc sản chặng sau, xe trung chuyển và HDV bản địa.")
  );

  // Financial calculations for co-hosted tours supporting N companies & 3 age tiers
  const totalNetAdult = isCoHostedTour && coHostsList.length > 0
    ? coHostsList.reduce((sum, ch) => {
        const q = ch.companyId === company.id
          ? myQuoteAdult
          : (ch.quoteAdult ?? ch.quotePerGuest ?? ch.estimatedBudgetPerGuest ?? 0);
        return sum + q;
      }, 0)
    : price;

  const totalNetChild = isCoHostedTour && coHostsList.length > 0
    ? coHostsList.reduce((sum, ch) => {
        const q = ch.companyId === company.id
          ? myQuoteChild
          : (ch.quoteChild ?? Math.round((ch.quoteAdult ?? ch.quotePerGuest ?? ch.estimatedBudgetPerGuest ?? 0) * 0.7));
        return sum + q;
      }, 0)
    : Math.round(price * 0.7);

  const totalNetInfant = isCoHostedTour && coHostsList.length > 0
    ? coHostsList.reduce((sum, ch) => {
        const q = ch.companyId === company.id
          ? myQuoteInfant
          : (ch.quoteInfant ?? 0);
        return sum + q;
      }, 0)
    : 0;

  const totalNetCost = totalNetAdult;
  const platformFeeRate = tour?.platformFeeRate ?? 0; // 0% (tạm thời không thu phí sàn)
  const calculatedPlatformFee = 0;
  const calculatedFinalPrice = isCoHostedTour && totalNetCost > 0 ? totalNetCost : price;

  // Thêm một công ty đối tác vào liên minh
  const handleAddPartnerCoHost = (partnerId: string, segment: string, budget: number, note: string) => {
    const targetComp = mockTourCompanies.find((c) => c.id === partnerId);
    if (!targetComp) return;

    let baseList = [...coHostsList];
    if (!baseList.some((ch) => ch.role === "lead")) {
      baseList.unshift({
        id: `cohost-lead-${Date.now()}`,
        companyId: company.id,
        companyName: company.name,
        companyLogo: company.logo,
        companyPhone: company.phone,
        companyEmail: company.email,
        role: "lead",
        status: "accepted",
        assignedSegments: "Đón tiếp đoàn & Điều phối chung",
        quotePerGuest: myQuotePerGuest,
        quoteStatus: myQuoteStatus,
        quoteNote: myQuoteNote,
        quotedAt: new Date().toISOString(),
      });
    }

    const newPartner: TourCoHost = {
      id: `cohost-partner-${Date.now()}`,
      companyId: targetComp.id,
      companyName: targetComp.name,
      companyLogo: targetComp.logo,
      companyPhone: targetComp.phone,
      companyEmail: targetComp.email,
      role: "partner",
      status: "accepted",
      assignedSegments: segment.trim() || `Chặng phối hợp tại ${targetComp.name}`,
      estimatedBudgetPerGuest: Number(budget) || 1800000,
      quotePerGuest: Number(budget) || 1800000,
      quoteStatus: "submitted",
      quoteNote: note.trim() || "Phụ trách các dịch vụ chặng liên minh",
      notes: note.trim(),
      invitedAt: new Date().toISOString(),
      respondedAt: new Date().toISOString(),
    };

    const nextList = [...baseList, newPartner];
    const tot = nextList.reduce(
      (s, c) => s + (c.companyId === company.id ? myQuotePerGuest : (c.quotePerGuest || c.estimatedBudgetPerGuest || 0)),
      0
    );
    const updated = nextList.map((c) => {
      const q = c.companyId === company.id ? myQuotePerGuest : (c.quotePerGuest || c.estimatedBudgetPerGuest || 0);
      return {
        ...c,
        revenueSharePercentage: tot > 0 ? Math.round((q / tot) * 100) : Math.round(100 / nextList.length),
      };
    });
    setCoHostsList(updated);
    setShowAddCoHostModal(false);
    setNewPartnerCompanyId("");
    setNewPartnerSegment("");
    setNewPartnerNotes("");
  };

  const handleRemovePartnerCoHost = (coHostId: string) => {
    const filtered = coHostsList.filter((ch) => ch.id !== coHostId);
    const tot = filtered.reduce(
      (s, c) => s + (c.companyId === company.id ? myQuotePerGuest : (c.quotePerGuest || c.estimatedBudgetPerGuest || 0)),
      0
    );
    const updated = filtered.map((c) => {
      const q = c.companyId === company.id ? myQuotePerGuest : (c.quotePerGuest || c.estimatedBudgetPerGuest || 0);
      return {
        ...c,
        revenueSharePercentage: tot > 0 ? Math.round((q / tot) * 100) : Math.round(100 / (filtered.length || 1)),
      };
    });
    setCoHostsList(updated);
  };

  // Tab 2 - Section 1: Danh sách Khách sạn lưu trú & Cấu hình Đổi hạng khách sạn
  const [hotels, setHotels] = useState<TourHotel[]>(tour?.hotels || []);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>("hotel-1");

  const addHotel = () => {
    const newId = `hotel-${Date.now()}`;
    const newHotel: TourHotel = {
      id: newId,
      name: "Khách sạn / Resort mới",
      destination: destination || "Điểm đến",
      nights: 1,
      stars: 4,
      pricePerNight: 1500000,
      description: "",
      address: "",
      allowCustomHotelRequest: true,
      alternativeHotels: [],
      createdByCompanyId: company.id,
      createdByCompanyName: company.name,
    };
    setHotels((prev) => [...prev, newHotel]);
    setExpandedHotelId(newId);
  };

  const removeHotel = (id: string) => {
    if (hotels.length > 1) {
      setHotels((prev) => prev.filter((h) => h.id !== id));
    }
  };

  const updateHotel = (id: string, updates: Partial<TourHotel>) => {
    setHotels((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  // Helpers for Alternative / Upgrade Hotels
  const addAlternativeHotel = (hotelId: string, prefill?: Partial<TourAlternativeHotel>) => {
    const newAlt: TourAlternativeHotel = {
      id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: prefill?.name || "Khách sạn / Resort nâng cấp",
      stars: prefill?.stars ?? 4,
      priceDifference: prefill?.priceDifference ?? 400000,
      description: prefill?.description || "Không gian nghỉ dưỡng cao cấp, tiện nghi sang trọng",
      address: prefill?.address || "",
    };
    setHotels((prev) =>
      prev.map((h) => {
        if (h.id === hotelId) {
          return {
            ...h,
            alternativeHotels: [...(h.alternativeHotels || []), newAlt],
          };
        }
        return h;
      })
    );
  };

  const updateAlternativeHotel = (
    hotelId: string,
    altId: string,
    updates: Partial<TourAlternativeHotel>
  ) => {
    setHotels((prev) =>
      prev.map((h) => {
        if (h.id === hotelId) {
          return {
            ...h,
            alternativeHotels: (h.alternativeHotels || []).map((alt) =>
              alt.id === altId ? { ...alt, ...updates } : alt
            ),
          };
        }
        return h;
      })
    );
  };

  const removeAlternativeHotel = (hotelId: string, altId: string) => {
    setHotels((prev) =>
      prev.map((h) => {
        if (h.id === hotelId) {
          return {
            ...h,
            alternativeHotels: (h.alternativeHotels || []).filter((alt) => alt.id !== altId),
          };
        }
        return h;
      })
    );
  };

  // Tab 2 - Section 2: Chế độ ẩm thực & Bữa ăn (Có thể thêm hoặc xóa)
  const [expandedMealKey, setExpandedMealKey] = useState<string | null>(null);
  const [showAddMealForm, setShowAddMealForm] = useState(false);
  const [newMealDay, setNewMealDay] = useState(1);
  const [newMealType, setNewMealType] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [newMealRestaurant, setNewMealRestaurant] = useState("");
  const [newMealDesc, setNewMealDesc] = useState("");
  const [newMealPrice, setNewMealPrice] = useState(120000);

  const handleAddMeal = () => {
    const dayIdx = itinerary.findIndex((d) => d.day === newMealDay);
    if (dayIdx >= 0) {
      const updated = [...itinerary];
      const dayMeals = [...(updated[dayIdx].meals || [])];
      const label = newMealType === "lunch" ? "Ăn trưa" : newMealType === "dinner" ? "Ăn tối" : "Ăn sáng";
      dayMeals.push({
        type: newMealType,
        serviceName: newMealRestaurant.trim() || `Nhà hàng đặc sản (${label})`,
        description: newMealDesc.trim() || "Thực đơn tiêu chuẩn theo chương trình tour",
        pricePerPerson: newMealPrice || 120000,
        createdByCompanyId: company.id,
        createdByCompanyName: company.name,
      });
      updated[dayIdx].meals = dayMeals;
      setItinerary(updated);
      setNewMealRestaurant("");
      setNewMealDesc("");
      setShowAddMealForm(false);
    }
  };

  const removeMeal = (dayIdx: number, mealIdx: number) => {
    const updated = [...itinerary];
    const currentMeals = updated[dayIdx].meals || [];
    updated[dayIdx].meals = currentMeals.filter((_, i) => i !== mealIdx);
    setItinerary(updated);
  };

  const addMealToDay = (dayIdx: number, mealType: "lunch" | "dinner" | "breakfast" = "lunch") => {
    const updated = [...itinerary];
    const dayMeals = [...(updated[dayIdx].meals || [])];
    const label = mealType === "lunch" ? "Ăn trưa" : mealType === "dinner" ? "Ăn tối" : "Ăn sáng";
    const defaultPrice = mealType === "breakfast" ? 60000 : mealType === "dinner" ? 140000 : 120000;
    const newMeal: TourMeal = {
      type: mealType,
      serviceName: `Nhà hàng đặc sản (${label})`,
      description: "Thực đơn tiêu chuẩn theo chương trình tour",
      pricePerPerson: defaultPrice,
      allowCustomMealRequest: true,
      alternativeMeals: [],
      createdByCompanyId: company.id,
      createdByCompanyName: company.name,
    };
    dayMeals.push(newMeal);
    updated[dayIdx].meals = dayMeals;
    setItinerary(updated);
    setExpandedMealKey(`${updated[dayIdx].id}-${mealType}-${dayMeals.length - 1}`);
  };

  // Helper methods for Alternative Meals (Đổi món / nhà hàng)
  const addAlternativeMeal = (dayIdx: number, mealIdx: number, prefill?: Partial<TourAlternativeMeal>) => {
    const updated = [...itinerary];
    const currentMeals = updated[dayIdx].meals || [];
    if (!currentMeals[mealIdx]) return;
    const targetMeal = currentMeals[mealIdx];
    const newAlt: TourAlternativeMeal = {
      id: `alt-meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      restaurantName: prefill?.restaurantName || "Nhà hàng đổi món / nâng cấp",
      priceDifference: prefill?.priceDifference ?? 50000,
      description: prefill?.description || "Thực đơn phong phú, không gian ấm cúng",
      address: prefill?.address || "",
    };
    currentMeals[mealIdx] = {
      ...targetMeal,
      alternativeMeals: [...(targetMeal.alternativeMeals || []), newAlt],
    };
    updated[dayIdx].meals = currentMeals;
    setItinerary(updated);
  };

  const updateAlternativeMeal = (
    dayIdx: number,
    mealIdx: number,
    altId: string,
    updates: Partial<TourAlternativeMeal>
  ) => {
    const updated = [...itinerary];
    const currentMeals = updated[dayIdx].meals || [];
    if (!currentMeals[mealIdx]) return;
    const targetMeal = currentMeals[mealIdx];
    currentMeals[mealIdx] = {
      ...targetMeal,
      alternativeMeals: (targetMeal.alternativeMeals || []).map((alt) =>
        alt.id === altId ? { ...alt, ...updates } : alt
      ),
    };
    updated[dayIdx].meals = currentMeals;
    setItinerary(updated);
  };

  const removeAlternativeMeal = (dayIdx: number, mealIdx: number, altId: string) => {
    const updated = [...itinerary];
    const currentMeals = updated[dayIdx].meals || [];
    if (!currentMeals[mealIdx]) return;
    const targetMeal = currentMeals[mealIdx];
    currentMeals[mealIdx] = {
      ...targetMeal,
      alternativeMeals: (targetMeal.alternativeMeals || []).filter((alt) => alt.id !== altId),
    };
    updated[dayIdx].meals = currentMeals;
    setItinerary(updated);
  };

  const updateMealField = (dayIdx: number, mealIdx: number, updates: Partial<TourMeal>) => {
    const updated = [...itinerary];
    const currentMeals = updated[dayIdx].meals || [];
    if (!currentMeals[mealIdx]) return;
    currentMeals[mealIdx] = {
      ...currentMeals[mealIdx],
      ...updates,
      createdByCompanyId: company.id,
      createdByCompanyName: company.name,
    };
    updated[dayIdx].meals = currentMeals;
    setItinerary(updated);
  };

  // Tab 2: Lịch trình chi tiết
  const [itinerary, setItinerary] = useState<DailyItinerary[]>(tour?.itinerary?.length
    ? JSON.parse(JSON.stringify(tour.itinerary))
    : [{ id: 'day-1', day: 1, date: '', title: '', description: '', locations: [], meals: [] }]);

  // Tab 3: Bảng giá vé theo độ tuổi
  const [priceTable, setPriceTable] = useState<TourPriceRow[]>(tour?.priceTable?.length
    ? JSON.parse(JSON.stringify(tour.priceTable))
    : [{ ageGroup: 'adult', ageGroupLabel: 'Người lớn', minAge: 0, price: 0 }]);

  const handleAddPriceRow = () => {
    if (!isLeadCompany) {
      alert("Chỉ đơn vị chủ trì (Lead) mới có quyền thêm phân loại giá vé cho tour liên minh!");
      return;
    }
    const newRow: TourPriceRow = {
      ageGroup: `custom_${Date.now()}`,
      ageGroupLabel: "Khung giá mới (VD: Người cao tuổi)",
      ageRange: "Từ 60 tuổi trở lên",
      minAge: 60,
      maxAge: 120,
      price: Math.round(price * 0.8) || 2000000,
    };
    setPriceTable([...priceTable, newRow]);
  };

  const handleRemovePriceRow = (index: number) => {
    if (!isLeadCompany) {
      alert("Chỉ đơn vị chủ trì (Lead) mới có quyền xóa phân loại giá vé!");
      return;
    }
    if (priceTable.length <= 1) {
      alert("Cần giữ lại ít nhất 1 khung giá vé cho tour!");
      return;
    }
    setPriceTable(priceTable.filter((_, i) => i !== index));
  };

  const handleResetDefaultPriceRows = () => {
    if (!isLeadCompany) {
      alert("Chỉ đơn vị chủ trì (Lead) mới có quyền khôi phục mẫu phân loại chuẩn!");
      return;
    }
    const base = price || 3500000;
    setPriceTable([
      { ageGroup: "adult", ageGroupLabel: "Người lớn", ageRange: "Từ 11 tuổi trở lên", price: base },
      { ageGroup: "child_2_11", ageGroupLabel: "Trẻ em (2–11 tuổi)", ageRange: "Từ 2 đến dưới 11 tuổi", price: Math.round(base * 0.7) },
      { ageGroup: "child_under_2", ageGroupLabel: "Em bé (dưới 2 tuổi)", ageRange: "Dưới 2 tuổi", price: 0 },
    ]);
  };

  // Tự động đồng bộ Bảng giá vé trọn gói từ Ma Trận Báo Giá Liên Minh khi là tour Liên minh
  useEffect(() => {
    if (isCoHostedTour && coHostsList.length > 0) {
      setPriceTable((prev) => {
        return prev.map((row) => {
          const tot = coHostsList.reduce((sum, ch) => sum + getPartnerQuoteForRow(ch, row), 0);
          return { ...row, price: tot };
        });
      });
    }
  }, [isCoHostedTour, coHostsList.length, myQuoteAdult, myQuoteChild, myQuoteInfant, myCustomQuotes]);

  // Tab 4: Quy định & Chính sách
  const [inclusions, setInclusions] = useState<string[]>(tour?.inclusions || []);
  const [exclusions, setExclusions] = useState<string[]>(tour?.exclusions || []);
  const [regulations, setRegulations] = useState<string[]>(tour?.regulations || []);
  const [companyNote, setCompanyNote] = useState(tour?.companyNote || '');

  const [newInclusion, setNewInclusion] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  const [newRegulation, setNewRegulation] = useState("");

  const [previewActiveTab, setPreviewActiveTab] = useState<"program" | "regulations" | "pricing" | "custom" | "reviews">("program");
  const [previewExpandedDays, setPreviewExpandedDays] = useState<Set<string>>(new Set([itinerary[0]?.id || "day-1"]));

  const togglePreviewDay = (id: string) => {
    setPreviewExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addImageUrl = () => {
    try {
      const url = new URL(newImageUrl.trim());
      if (url.protocol !== "https:" || url.href.length > 2048) throw new Error();
      setImages(previous => [...previous, url.href]);
      setNewImageUrl("");
      setSaveError("");
    } catch { setSaveError("Hình tour phải là URL HTTPS hợp lệ, tối đa 2048 ký tự."); }
  };

  const removeImage = (idx: number) => {
    if (images.length <= 1) return;
    const updated = images.filter((_, i) => i !== idx);
    setImages(updated);
    if (thumbnailIndex >= updated.length) {
      setThumbnailIndex(0);
    }
  };

  // Drag and drop state & swap for attraction points
  const [draggedLocation, setDraggedLocation] = useState<{ dayIdx: number; locIdx: number } | null>(null);
  const [dragOverLocation, setDragOverLocation] = useState<{ dayIdx: number; locIdx: number } | null>(null);

  const moveLocation = (dayIdx: number, fromIdx: number, toIdx: number) => {
    const updated = [...itinerary];
    const locs = [...updated[dayIdx].locations];
    if (toIdx < 0 || toIdx >= locs.length) return;
    const [moved] = locs.splice(fromIdx, 1);
    locs.splice(toIdx, 0, moved);
    updated[dayIdx].locations = locs;
    setItinerary(updated);
  };

  // Helpers for Days
  const addDay = () => {
    const nextDayNum = itinerary.length + 1;
    const nextNights = Math.max(0, nextDayNum - 1);
    const newDay: DailyItinerary = {
      id: `day-${Date.now()}`,
      day: nextDayNum,
      date: new Date(Date.now() + nextDayNum * 86400000).toISOString().split("T")[0],
      title: `Ngày ${nextDayNum}: Tiếp tục hành trình (Ăn trưa, tối)`,
      description: "Đoàn tiếp tục tham quan các điểm du lịch nổi tiếng...",
      destinationCity: destination || "Điểm đến",
      createdByCompanyId: company.id,
      createdByCompanyName: company.name,
      hotel: {
        name: itinerary[0]?.hotel?.name || hotels[0]?.name || "Khách sạn lưu trú tiêu chuẩn",
        pricePerNight: itinerary[0]?.hotel?.pricePerNight || hotels[0]?.pricePerNight || 2800000,
        description: "Khách sạn lưu trú tiêu chuẩn",
        createdByCompanyId: company.id,
        createdByCompanyName: company.name,
      },
      meals: [
        { type: "lunch", serviceName: "Nhà hàng Trúc Lâm Viên", description: "Bữa trưa đặc sản", pricePerPerson: 140000, createdByCompanyId: company.id, createdByCompanyName: company.name },
        { type: "dinner", serviceName: "Nhà hàng Làng Nướng Đà Lạt", description: "Bữa tối tiêu chuẩn", pricePerPerson: 160000, createdByCompanyId: company.id, createdByCompanyName: company.name },
      ],
      locations: [
        { id: `loc-${Date.now()}-1`, name: "Điểm tham quan mới", address: "", time: "09:00" },
      ],
    };
    const updated = [...itinerary, newDay];
    setItinerary(updated);
    setNumberOfDays(nextDayNum);
    setNumberOfNights(nextNights);
    setDuration(`${nextDayNum} ngày ${nextNights} đêm`);
  };

  const removeDay = (idx: number) => {
    if (itinerary.length <= 1) return;
    const updated = itinerary.filter((_, i) => i !== idx).map((d, i) => ({
      ...d,
      day: i + 1,
    }));
    const daysCount = updated.length;
    const nightsCount = Math.max(0, daysCount - 1);
    setItinerary(updated);
    setNumberOfDays(daysCount);
    setNumberOfNights(nightsCount);
    setDuration(`${daysCount} ngày ${nightsCount} đêm`);
  };

  const addLocationToDay = (dayIdx: number) => {
    const updated = [...itinerary];
    const currentLocs = updated[dayIdx]?.locations ? [...updated[dayIdx].locations] : [];
    currentLocs.push({
      id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "Điểm tham quan mới",
      address: "",
      time: "10:00",
      createdByCompanyId: company.id,
      createdByCompanyName: company.name,
    });
    updated[dayIdx].locations = currentLocs;
    setItinerary(updated);
  };

  const removeLocationFromDay = (dayIdx: number, locIdx: number) => {
    const updated = [...itinerary];
    if (updated[dayIdx]?.locations) {
      updated[dayIdx].locations = updated[dayIdx].locations.filter((_, i) => i !== locIdx);
      setItinerary(updated);
    }
  };

  const handleSubmit = async (mode: "draft" | "complete_public" = "complete_public") => {
    const isDraft = mode === "draft";
    if (!isDraft && !name.trim()) {
      alert("Vui lòng nhập tên tour trước khi hoàn tất.");
      return;
    }
    const finalTourCode = tourCode.trim();
    const chosenThumbnail = images[thumbnailIndex] || images[0] || "";

    let nextVersion = tour?.version || 1;
    let nextVersionHistory = tour?.versionHistory ? [...tour.versionHistory] : [];

    if (isCustom) {
      if (tour) {
        const snapshot: TourVersion = {
          version: tour.version || 1,
          createdAt: new Date().toISOString(),
          createdByName: company.name,
          changeNote: changeNote.trim() || `Cập nhật phiên bản v${tour.version || 1}`,
          tourSnapshot: JSON.parse(JSON.stringify(tour)),
        };
        nextVersionHistory = [snapshot, ...nextVersionHistory];
        nextVersion = (tour.version || 1) + 1;
      } else {
        nextVersion = 1;
      }
    }

    // Handle co-hosting quotes and dynamic revenue split calculation
    let updatedCoHosts = coHostsList;
    if (isCoHostedTour && updatedCoHosts.length > 0) {
      const totNet = updatedCoHosts.reduce(
        (s, c) => s + (c.companyId === company.id ? myQuoteAdult : (c.quoteAdult ?? c.quotePerGuest ?? c.estimatedBudgetPerGuest ?? 0)),
        0
      );
      updatedCoHosts = updatedCoHosts.map((ch) => {
        const q = ch.companyId === company.id ? myQuoteAdult : (ch.quoteAdult ?? ch.quotePerGuest ?? ch.estimatedBudgetPerGuest ?? 0);
        const pct = totNet > 0 ? Math.round((q / totNet) * 100) : Math.round(100 / updatedCoHosts.length);
        if (ch.companyId === company.id) {
          return {
            ...ch,
            quotePerGuest: myQuoteAdult,
            quoteAdult: myQuoteAdult,
            quoteChild: myQuoteChild,
            quoteInfant: myQuoteInfant,
            quoteStatus: myQuoteStatus,
            quoteNote: myQuoteNote,
            quotedAt: myQuoteStatus === "submitted" ? (ch.quotedAt || new Date().toISOString()) : ch.quotedAt,
            revenueSharePercentage: pct,
          };
        }
        return {
          ...ch,
          quoteAdult: ch.quoteAdult ?? ch.quotePerGuest ?? ch.estimatedBudgetPerGuest ?? 0,
          quoteChild: ch.quoteChild ?? Math.round((ch.quoteAdult ?? ch.quotePerGuest ?? 0) * 0.7),
          quoteInfant: ch.quoteInfant ?? 0,
          revenueSharePercentage: pct,
        };
      });
    }

    const finalTourPrice = isCoHostedTour && calculatedFinalPrice > 0 ? calculatedFinalPrice : price;

    const tourData: Partial<Tour> = {
      tourCode: finalTourCode,
      name,
      destination,
      departureLocation,
      departureCity: departureLocation,
      duration,
      numberOfDays,
      numberOfNights,
      price: finalTourPrice,
      image: chosenThumbnail,
      images,
      operationPeriod,
      minGuests,
      maxGuests,
      description,
      highlights: highlights.filter((h) => h.trim().length > 0),
      hotels,
      itinerary,
      priceTable: priceTable.map((p) => (p.ageGroup === "adult" ? { ...p, price: finalTourPrice } : p)),
      inclusions: inclusions.filter((i) => i.trim().length > 0),
      exclusions: exclusions.filter((e) => e.trim().length > 0),
      regulations: regulations.filter((r) => r.trim().length > 0),
      companyNote,
      rating: tour?.rating ?? 4.8,
      companyId: tour?.companyId || company.id,
      companyName: tour?.companyName || company.name,
      companyLogo: tour?.companyLogo || company.logo,
      isCoHosted: isCoHostedTour,
      coHosts: updatedCoHosts,
      platformFeeRate: 0,
      pricingStatus: updatedCoHosts?.every((ch) => ch.quoteStatus === "submitted") ? "quoted" : "pending_partner_quote",
      status: isDraft ? "draft" : "completed",
      visibility: isDraft ? "hidden" : "public",
      is_request: isCustom,
      tourType: isCustom ? "custom_request" : (tour?.tourType || "public"),
      customRequestId: customRequest?.id || tour?.customRequestId,
      targetUserId: customRequest?.userId || tour?.targetUserId,
      targetCustomerName: customRequest?.customerName || tour?.targetCustomerName,
      targetCustomerPhone: customRequest?.customerPhone || tour?.targetCustomerPhone,
      targetCustomerEmail: customRequest?.customerEmail || tour?.targetCustomerEmail,
      version: isCustom ? nextVersion : tour?.version,
      changeNote: isCustom
        ? (changeNote.trim() || (tour ? `Cập nhật phiên bản v${nextVersion}` : "Phiên bản thiết kế đầu tiên theo yêu cầu"))
        : tour?.changeNote,
      versionHistory: isCustom ? nextVersionHistory : tour?.versionHistory,
    };

    setSaving(true); setSaveError("");
    try { await onSubmit(tourData); onBack(); }
    catch (error) { setSaveError(error instanceof Error ? error.message : "Không thể lưu tour."); }
    finally { setSaving(false); }
  };

  const chosenThumbnail = images[thumbnailIndex] || images[0] || "";
  const mainHotel = hotels[0];
  const hotelNights = hotels.reduce((sum, h) => sum + (h.nights || 1), 0);

  return (
    <div className="bg-slate-50 min-h-screen pb-16 space-y-6 -m-6">
      {saveError && <div role="alert" className="mx-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}
      {serviceError && <div role="alert" className="mx-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{serviceError} Bạn vẫn có thể nhập dịch vụ thủ công.</div>}
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#CBD5E1] px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
              <Package className={`w-5 h-5 ${isCustom ? "text-[#F97316]" : "text-[#075985]"}`} />
              {isCustom
                ? (tour ? `Chỉnh sửa Tour Theo Yêu Cầu: ${tour.name} (v${tour.version || 1})` : "Thiết Kế Tour Riêng Theo Yêu Cầu Của Khách")
                : (tour ? `Chỉnh sửa Tour: ${tour.name}` : "Thiết kế & Tạo Tour Du lịch Mới")}
            </h1>
            <p className="text-xs text-gray-500">
              {isCustom
                ? `Mã tour: ${tour?.tourCode || "TC-NEW"} · Khách hàng: ${customRequest?.customerName || tour?.targetCustomerName || "Khách đặt riêng"}`
                : (tour ? `Mã tour: ${tourCode || "T-NEW"} · Cập nhật thông tin chi tiết` : "Cấu hình đầy đủ thông tin, hình ảnh, chỗ ở, chỗ ăn, lộ trình chi tiết và bảng giá")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={() => setShowAIPlanner(true)}
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>✨ AI Lên Lịch Trình</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="text-gray-600"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="border-amber-500 text-amber-700 hover:bg-amber-50 text-xs font-semibold"
            title="Lưu bản nháp để tiếp tục chỉnh sửa sau"
          >
            Lưu bản nháp
          </Button>
          <Button
            type="button"
            disabled={saving || !name.trim() || !destination.trim()}
            onClick={() => handleSubmit("complete_public")}
            className={`${
              isCustom
                ? "bg-[#F97316] hover:bg-[#EA580C] text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            } font-semibold shadow-xs text-xs`}
          >
            <Check className="w-4 h-4 mr-1.5" />
            {isCustom
              ? (tour ? `Lưu phiên bản mới (v${(tour.version || 1) + 1})` : "Hoàn tất & Lưu Tour Thiết Kế")
              : (tour ? "Lưu & Mở bán ngay" : "Hoàn tất & Đăng bán ngay")}
          </Button>
        </div>
      </div>

      {/* Custom Tour Banner & Change Note Input */}
      {isCustom && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md border-b border-purple-700">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-purple-500/30 text-purple-200 border border-purple-400/50 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span>🔒</span> TOUR THIẾT KẾ RIÊNG
            </span>
            <span className="text-sm font-semibold">
              Khách hàng: <span className="text-purple-200">{customRequest?.customerName || tour?.targetCustomerName || "Yêu cầu từ khách"}</span>
              {(customRequest?.customerPhone || tour?.targetCustomerPhone) && (
                <span className="text-purple-300 ml-1">({customRequest?.customerPhone || tour?.targetCustomerPhone})</span>
              )}
            </span>
            <span className="bg-purple-800 text-purple-200 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-purple-600">
              {tour ? `Phiên bản hiện tại: v${tour.version || 1} ➔ Dự kiến lưu: v${(tour.version || 1) + 1}` : "Phiên bản đầu tiên: v1"}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-purple-200 font-medium whitespace-nowrap">Ghi chú thay đổi (Change Note):</span>
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder={tour ? `Ghi chú cho v${(tour.version || 1) + 1} (VD: Đổi khách sạn sang TTC Premium...)` : "Ghi chú ban đầu..."}
              className="text-xs bg-purple-950/80 text-white placeholder-purple-400 border border-purple-500/50 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 flex-1 md:w-80"
            />
          </div>
        </div>
      )}

      {/* Co-Hosting Collaboration Header & Multi-Company Alliance Bar */}
      {isCoHostedTour && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-950 text-white px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs border-b border-purple-600 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-bold shadow-xs flex-shrink-0">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold uppercase tracking-wider text-amber-300">
                  LIÊN MINH ĐA CÔNG TY ({coHostsList.length} ĐƠN VỊ PHỐI HỢP)
                </span>
                <span className="text-[10px] bg-purple-800 text-purple-200 px-2 py-0.5 rounded font-medium border border-purple-600">
                  {isLeadCompany ? "Bạn là Đơn vị Chủ trì (Lead)" : "Bạn là Đối tác Liên minh (Partner)"}
                </span>
              </div>
              <p className="text-purple-200 text-[11px] mt-0.5">
                Mỗi công ty tự thiết lập chặng mình phụ trách và <strong>bị vô hiệu hóa</strong> không được chỉnh sửa phần của đối tác khác.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {coHostsList.map((ch) => (
              <span
                key={ch.id || ch.companyId}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-2xs ${
                  ch.companyId === company.id
                    ? "bg-emerald-500 text-white border border-emerald-400"
                    : "bg-white/15 text-purple-100 border border-white/20"
                }`}
              >
                <span>{ch.companyName}</span>
                <span className="text-[10px] opacity-80">
                  ({ch.role === "lead" ? "Chủ trì" : "Đối tác"} · {ch.revenueSharePercentage ?? Math.round(100 / coHostsList.length)}%)
                </span>
              </span>
            ))}

            {isLeadCompany && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddCoHostModal(true)}
                className="bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold text-xs h-7 px-2.5 gap-1 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Mời thêm đối tác
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sticky Tabs Bar */}
      <div className="bg-white border-y border-[#CBD5E1] px-6 shadow-2xs sticky top-[57px] z-20">
        <div className="flex overflow-x-auto gap-1">
          {[
            { id: "general", label: "1. Thông tin chung, Ảnh & Điểm nhấn" },
            { id: "itinerary", label: "2. Chỗ ở, Chỗ ăn & Lịch trình chi tiết" },
            { id: "pricing", label: "3. Bảng giá vé theo độ tuổi" },
            { id: "regulations", label: "4. Quy định & Chính sách" },
            { id: "preview", label: "5. Mô phỏng Tour hiển thị (Preview)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-[#075985] text-[#075985] bg-[#F0F9FF]/50"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-[#F0F9FF]"
              }`}
            >
              {tab.id === "preview" && <Eye className="w-4 h-4 text-[#F97316]" />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Page Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          {/* TAB 1: THÔNG TIN CHUNG, HÌNH ẢNH & ĐIỂM NHẤN */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Partner Banner in Tab 1 */}
              {isCoHostedTour && !isLeadCompany && (
                <div className="bg-[#F0F9FF] border border-[#F97316]/30 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-purple-900 shadow-2xs">
                  <Info className="w-5 h-5 text-[#F97316] flex-shrink-0" />
                  <div>
                    <p className="font-bold">Chế độ Đối tác Liên minh (Partner Mode):</p>
                    <p className="text-[#EA580C] mt-0.5">
                      Thông tin chung của tour do Đơn vị Chủ trì (<strong>{leadHost?.companyName || "Đơn vị chủ trì"}</strong>) quản lý. Bạn có thể xem thông tin tại đây, thiết kế các ngày lịch trình do công ty bạn phụ trách tại <strong>Tab 2</strong> và xác nhận báo giá chặng của mình tại <strong>Tab 3</strong>.
                    </p>
                  </div>
                </div>
              )}
              {/* UPLOAD MULTIPLE IMAGES & CHOOSE THUMBNAIL */}
              <div className="bg-[#F0F9FF]/60 border border-[#CBD5E1] rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Label className="text-sm font-bold text-blue-950 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#075985]" />
                      Hình ảnh của Tour (URL HTTPS &amp; Chọn Thumbnail)
                    </Label>
                    <p className="text-xs text-[#075985] mt-0.5">
                      Dán URL ảnh HTTPS. Nhấp vào ảnh để đặt làm <strong>Ảnh đại diện</strong>.
                    </p>
                  </div>
                  <div>
                    <Input value={newImageUrl} onChange={event => setNewImageUrl(event.target.value)}
                      placeholder="https://example.com/tour.jpg" className="mb-2" aria-label="URL ảnh tour" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addImageUrl}
                      className="bg-white border-blue-300 text-[#075985] hover:bg-[#F0F9FF] text-xs gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Thêm ảnh từ URL
                    </Button>
                  </div>
                </div>

                {/* Thumbnails grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                  {images.map((img, idx) => {
                    const isThumb = thumbnailIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setThumbnailIndex(idx)}
                        className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-video group shadow-xs ${
                          isThumb ? "border-[#075985] ring-2 ring-blue-500/50" : "border-[#CBD5E1] hover:border-blue-400"
                        }`}
                      >
                        <img src={img} alt={`Tour photo ${idx + 1}`} className="w-full h-full object-cover" />
                        {isThumb && (
                          <div className="absolute top-1.5 left-1.5 bg-[#075985] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                            <Check className="w-3 h-3" />
                            Ảnh đại diện
                          </div>
                        )}
                        {!isThumb && (
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-medium">
                            Chọn làm Thumbnail
                          </div>
                        )}
                        {images.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(idx);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#075985]" />
                    Mã Tour (tour_code) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={tourCode}
                    readOnly
                    placeholder="Hệ thống tạo mã khi lưu"
                    className="mt-1 font-bold text-[#075985] uppercase"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Mã Tour do máy chủ cấp khi lưu bản nháp.</p>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-gray-700">Tên tour <span className="text-red-500">*</span></Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Khám Phá Đà Lạt – Xứ Sở Ngàn Hoa 3N2Đ"
                    className="mt-1 font-semibold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Điểm đến chính <span className="text-red-500">*</span></Label>
                  <Input
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="VD: Đà Lạt"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Thời gian (hiển thị)</Label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="VD: 3 ngày 2 đêm"
                    className="mt-1"
                  />
                </div>

                {/* THỜI GIAN HOẠT ĐỘNG */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#075985]" />
                    Thời gian hoạt động / Mùa tour <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={operationPeriod}
                    onChange={(e) => setOperationPeriod(e.target.value)}
                    placeholder="VD: Quanh năm (Tháng 1 – Tháng 12)"
                    className="mt-1"
                  />
                </div>

                {/* ĐIỂM KHỞI HÀNH */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Điểm khởi hành
                  </Label>
                  <Input
                    value={departureLocation}
                    onChange={(e) => setDepartureLocation(e.target.value)}
                    disabled={!isCustom}
                    placeholder="VD: TP. Hồ Chí Minh / Hà Nội"
                    className="mt-1"
                  />
                  {!isCustom && <p className="text-[11px] text-gray-500 mt-1">API Tour hiện chưa lưu điểm khởi hành riêng.</p>}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Số ngày</Label>
                  <Input
                    type="number"
                    min={1}
                    value={numberOfDays}
                    onChange={(e) => setNumberOfDays(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Số đêm</Label>
                  <Input
                    type="number"
                    min={0}
                    value={numberOfNights}
                    onChange={(e) => setNumberOfNights(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Giá cơ bản / người lớn (VNĐ) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    step={50000}
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    className="mt-1 font-bold text-[#075985]"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Số khách tối thiểu – tối đa</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input
                      type="number"
                      min={1}
                      value={minGuests}
                      onChange={(e) => setMinGuests(parseInt(e.target.value) || 2)}
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(parseInt(e.target.value) || 20)}
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-gray-700">Mô tả ngắn tổng quan về tour</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Mô tả hấp dẫn về hành trình, những nét thú vị đón chờ du khách..."
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              {/* Highlights section */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <Label className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Điểm nhấn nổi bật của Tour (ĐIỂM NỔI BẬT)
                </Label>
                <div className="space-y-1.5">
                  {highlights.map((hl, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={hl}
                        onChange={(e) => {
                          const updated = [...highlights];
                          updated[idx] = e.target.value;
                          setHighlights(updated);
                        }}
                        className="text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setHighlights(highlights.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <Input
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    placeholder="Thêm điểm nhấn mới..."
                    className="text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newHighlight.trim()) {
                          setHighlights([...highlights, newHighlight.trim()]);
                          setNewHighlight("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newHighlight.trim()) {
                        setHighlights([...highlights, newHighlight.trim()]);
                        setNewHighlight("");
                      }
                    }}
                  >
                    Thêm
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHỖ Ở, CHỖ ĂN & LỊCH TRÌNH CHI TIẾT (CHUẨN XÁC 100% NHƯ THONGTINTOUR.PNG) */}
          {activeTab === "itinerary" && (
            <div className="space-y-7">
              {/* Header tip identical to thongtintour.png */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 pb-3">
                <p>Chọn khách sạn và tùy chỉnh lịch trình. Thay đổi địa điểm hoặc tự nhập khách sạn → công ty sẽ báo giá.</p>
                <button
                  type="button"
                  onClick={addDay}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F0F9FF] text-gray-700 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm ngày tour
                </button>
              </div>

              {/* ===== 1. KHÁCH SẠN LƯU TRÚ ===== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#075985]" />
                    KHÁCH SẠN LƯU TRÚ ({hotels.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addHotel}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-blue-300 bg-[#F0F9FF] text-[#075985] hover:bg-[#E0F2FE] font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm khách sạn
                  </button>
                </div>

                {/* List of hotels for this tour (supports multiple hotels) */}
                <div className="space-y-2.5">
                  {hotels.map((hotel, hIdx) => {
                    const isExpanded = expandedHotelId === hotel.id;
                    const isHotelLocked = isCoHostedTour && Boolean(hotel.createdByCompanyId && hotel.createdByCompanyId !== company.id);
                    const hotelOwnerName = hotel.createdByCompanyName || "Công ty đối tác";

                    return (
                      <div key={hotel.id || hIdx} className={`border rounded-2xl overflow-hidden bg-white shadow-2xs ${isHotelLocked ? "border-amber-200" : "border-[#CBD5E1]"}`}>
                        <button
                          type="button"
                          onClick={() => setExpandedHotelId(isExpanded ? null : (hotel.id || `h-${hIdx}`))}
                          className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${
                            isHotelLocked ? "bg-amber-50/70 hover:bg-amber-100/60" : "bg-[#F0F9FF]/80 hover:bg-[#E0F2FE]/70"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className={`w-5 h-5 flex-shrink-0 ${isHotelLocked ? "text-amber-700" : "text-[#075985]"}`} />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-gray-900">{hotel.destination || destination || "Khu vực lưu trú"}</p>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  {hotel.stars || 4} <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                </span>
                                {isHotelLocked && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                    <Lock className="w-3 h-3 text-amber-700" /> Do {hotelOwnerName} thiết lập (Chỉ xem)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {hotel.nights || 1} đêm • {hotel.name || "Chưa nhập tên khách sạn"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hotels.length > 1 && (
                              isHotelLocked ? (
                                <span
                                  className="p-1.5 text-gray-300 cursor-not-allowed"
                                  title={`Không thể xóa khách sạn do ${hotelOwnerName} tạo`}
                                >
                                  <Lock className="w-4 h-4" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeHotel(hotel.id || "");
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Xóa khách sạn này"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                            {isHotelLocked && (
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  Khách sạn này do <strong>{hotelOwnerName}</strong> phụ trách. Bạn không có quyền chỉnh sửa.
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                                  Chỉ xem
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-semibold text-gray-700">
                                  Lựa chọn 1: Khách sạn / Resort tiêu chuẩn (0đ chênh lệch) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={hotel.name}
                                  disabled={isHotelLocked}
                                  onChange={(e) => updateHotel(hotel.id || "", { name: e.target.value })}
                                  placeholder="VD: Khách sạn Đà Lạt Palace Heritage"
                                  className={`mt-1 text-xs ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                />
                                <select value={hotel.serviceId || ""} disabled={isHotelLocked}
                                  onChange={e => {
                                    const selected = serviceOptions.find(option => String(option.id) === e.target.value);
                                    updateHotel(hotel.id || "", { serviceId: selected ? String(selected.id) : undefined,
                                      name: selected?.name || hotel.name });
                                  }} className="mt-2 w-full h-9 px-2 text-xs border border-gray-300 rounded-md bg-white">
                                  <option value="">Nhập khách sạn thủ công (không liên kết Service)</option>
                                  {serviceOptions.filter(option => option.category === "hotel").map(option =>
                                    <option key={option.id} value={option.id}>{option.name} · #{option.id}</option>)}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs font-semibold text-gray-700">Điểm đến / Khu vực lưu trú</Label>
                                <Input
                                  value={hotel.destination ?? ""}
                                  disabled={isHotelLocked}
                                  onChange={(e) => updateHotel(hotel.id || "", { destination: e.target.value })}
                                  placeholder="VD: Đà Lạt"
                                  className={`mt-1 text-xs ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs font-semibold text-gray-700">Số đêm lưu trú</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={hotel.nights ?? 1}
                                  disabled={isHotelLocked}
                                  onChange={(e) => updateHotel(hotel.id || "", { nights: parseInt(e.target.value) || 1 })}
                                  className={`mt-1 text-xs ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                                  <span>Số sao của khách sạn tiêu chuẩn</span>
                                  <span className="flex items-center gap-0.5 text-amber-500">
                                    {Array.from({ length: hotel.stars || 4 }).map((_, i) => (
                                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-500" />
                                    ))}
                                  </span>
                                </Label>
                                <select
                                  value={hotel.stars ?? 4}
                                  disabled={isHotelLocked}
                                  onChange={(e) => updateHotel(hotel.id || "", { stars: parseInt(e.target.value) || 4 })}
                                  className={`mt-1 w-full h-9 px-3 py-1.5 text-xs border border-gray-300 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-[#075985] focus:border-blue-500 ${
                                    isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-gray-800"
                                  }`}
                                >
                                  <option value={1}>1 sao ⭐</option>
                                  <option value={2}>2 sao ⭐⭐</option>
                                  <option value={3}>3 sao ⭐⭐⭐</option>
                                  <option value={4}>4 sao ⭐⭐⭐⭐</option>
                                  <option value={5}>5 sao ⭐⭐⭐⭐⭐</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-gray-700">Địa chỉ / Ghi chú phòng</Label>
                              <Input
                                value={hotel.address ?? hotel.description ?? ""}
                                disabled={isHotelLocked}
                                onChange={(e) => updateHotel(hotel.id || "", { address: e.target.value, description: e.target.value })}
                                placeholder="VD: 02 Trần Phú, Phường 3, TP. Đà Lạt"
                                className={`mt-1 text-xs ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                              />
                            </div>
                            <p className="text-[11px] text-gray-500">
                              * Đây là phương án lưu trú tiêu chuẩn của tour (giá chênh lệch = 0đ). Nếu muốn cung cấp thêm các phương án khách sạn khác cho khách chọn khi đặt tour, hãy cấu hình ở danh sách các option bên dưới.
                            </p>

                            {/* CÁC LỰA CHỌN KHÁCH SẠN / RESORT KHÁC CHO TOUR (OPTIONS) */}
                            <div className="pt-4 border-t border-[#CBD5E1] space-y-3.5">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                  <Label className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Các lựa chọn khách sạn / chỗ ở khác cho tour ({(hotel.alternativeHotels || []).length})
                                  </Label>
                                  <p className="text-[11px] text-gray-500 mt-0.5">
                                    Các phương án khách sạn do công ty chuẩn bị sẵn kèm mức giá chênh lệch. Khách hàng chọn các option này khi đặt tour sẽ tự động áp dụng giá mà không tính là thay đổi cần duyệt.
                                  </p>
                                </div>
                                {isHotelLocked ? (
                                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 cursor-not-allowed">
                                    <Lock className="w-3.5 h-3.5 text-gray-400" /> Lựa chọn do {hotelOwnerName} thiết lập
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => addAlternativeHotel(hotel.id || "")}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold transition-colors shadow-2xs"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-amber-700" />
                                    Thêm phương án khách sạn khác (Option)
                                  </button>
                                )}
                              </div>

                              {/* Danh sách các option khách sạn đã cấu hình */}
                              {(hotel.alternativeHotels || []).length === 0 ? (
                                <div className="p-4 border border-dashed border-[#CBD5E1] rounded-2xl text-center text-xs text-gray-400">
                                  Chưa có phương án khách sạn bổ sung. Bấm "+ Thêm phương án khách sạn khác (Option)" nếu muốn cung cấp thêm các lựa chọn lưu trú khác cho khách hàng khi đặt tour.
                                </div>
                              ) : (
                                <div className="space-y-2.5">
                                  {(hotel.alternativeHotels || []).map((alt, aIdx) => (
                                    <div
                                      key={alt.id || aIdx}
                                      className="p-3 rounded-2xl border border-[#CBD5E1] bg-[#F0F9FF]/50 hover:bg-white transition-all space-y-2 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                                          {/* Tên khách sạn */}
                                          <div className="sm:col-span-6">
                                            <Label className="text-[11px] text-gray-500 font-medium">Lựa chọn {aIdx + 2}: Tên khách sạn / Resort</Label>
                                            <Input
                                              value={alt.name}
                                              disabled={isHotelLocked}
                                              onChange={(e) =>
                                                updateAlternativeHotel(hotel.id || "", alt.id, { name: e.target.value })
                                              }
                                              placeholder="VD: Dalat Edensee Lake Resort & Spa"
                                              className={`text-xs mt-0.5 font-semibold ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                                            />
                                          </div>

                                          {/* Số sao */}
                                          <div className="sm:col-span-3">
                                            <Label className="text-[11px] text-gray-500 font-medium flex items-center justify-between">
                                              <span>Số sao</span>
                                              <span className="text-amber-500 text-[10px]">
                                                {"★".repeat(alt.stars || 4)}
                                              </span>
                                            </Label>
                                            <select
                                              value={alt.stars ?? 4}
                                              disabled={isHotelLocked}
                                              onChange={(e) =>
                                                updateAlternativeHotel(hotel.id || "", alt.id, {
                                                  stars: parseInt(e.target.value) || 4,
                                                })
                                              }
                                              className={`text-xs mt-0.5 w-full h-9 px-2 py-1 border border-gray-300 rounded-md font-medium focus:outline-none focus:ring-1 focus:ring-[#075985] ${
                                                isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-gray-800"
                                              }`}
                                            >
                                              <option value={1}>1 sao ⭐</option>
                                              <option value={2}>2 sao ⭐⭐</option>
                                              <option value={3}>3 sao ⭐⭐⭐</option>
                                              <option value={4}>4 sao ⭐⭐⭐⭐</option>
                                              <option value={5}>5 sao ⭐⭐⭐⭐⭐</option>
                                            </select>
                                          </div>

                                          {/* Mức chênh lệch */}
                                          <div className="sm:col-span-3">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-[11px] text-gray-500 font-medium">
                                                Giá chênh lệch (VNĐ)
                                              </Label>
                                              <span
                                                className={`text-[11px] font-bold ${
                                                  alt.priceDifference > 0
                                                    ? "text-amber-700"
                                                    : alt.priceDifference < 0
                                                    ? "text-emerald-600"
                                                    : "text-gray-500"
                                                }`}
                                              >
                                                {alt.priceDifference > 0 ? "+" : ""}
                                                {formatVND(alt.priceDifference || 0)}
                                              </span>
                                            </div>
                                            <Input
                                              type="number"
                                              step={50000}
                                              value={alt.priceDifference}
                                              disabled={isHotelLocked}
                                              onChange={(e) =>
                                                updateAlternativeHotel(hotel.id || "", alt.id, {
                                                  priceDifference: parseInt(e.target.value) || 0,
                                                })
                                              }
                                              placeholder="VD: 400000 hoặc -350000"
                                              className={`text-xs mt-0.5 font-bold ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                                            />
                                          </div>
                                        </div>

                                        {/* Nút xóa */}
                                        {isHotelLocked ? (
                                          <span className="p-1.5 text-gray-300 cursor-not-allowed self-end mb-1">
                                            <Lock className="w-4 h-4" />
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => removeAlternativeHotel(hotel.id || "", alt.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors self-end mb-1"
                                            title="Xóa khách sạn này"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Địa chỉ / Ghi chú phòng */}
                                      <div>
                                        <Label className="text-[11px] text-gray-500 font-medium">Địa chỉ / Ghi chú phòng</Label>
                                        <Input
                                          value={alt.address ?? alt.description ?? ""}
                                          disabled={isHotelLocked}
                                          onChange={(e) =>
                                            updateAlternativeHotel(hotel.id || "", alt.id, {
                                              address: e.target.value,
                                              description: e.target.value,
                                            })
                                          }
                                          placeholder="VD: 02 Trần Phú, Phường 3, TP. Đà Lạt"
                                          className={`text-xs mt-0.5 ${isHotelLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-gray-600"}`}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ===== 2. LỊCH TRÌNH CHI TIẾT & CHẾ ĐỘ ĂN UỐNG (THEO TỪNG NGÀY) ===== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#F97316]" />
                      LỊCH TRÌNH CHI TIẾT &amp; CHẾ ĐỘ ĂN UỐNG (THEO TỪNG NGÀY)
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lộ trình các điểm tham quan và các bữa ăn (trưa/tối) theo từng ngày. Bữa ăn nằm ngay dưới các điểm tham quan giúp theo dõi và tùy chỉnh trực quan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addDay}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white text-xs gap-1.5 flex items-center shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm ngày tour
                  </Button>
                </div>

                <div className="space-y-4">
                  {itinerary.map((day, dIdx) => {
                    const dayOwnerId = day.createdByCompanyId || (isCoHostedTour && leadHost?.companyId ? leadHost.companyId : company.id);
                    const dayOwnerName = day.createdByCompanyName || coHostsList.find((c) => c.companyId === dayOwnerId)?.companyName || "Công ty đối tác";
                    const isDayCreatedByMe = !isCoHostedTour || dayOwnerId === company.id;
                    const isDayLocked = isCoHostedTour && !isDayCreatedByMe;

                    return (
                    <div key={day.id || dIdx} className={`rounded-2xl border overflow-hidden bg-white shadow-2xs ${isCoHostedTour && !isDayCreatedByMe ? "border-[#F97316]/30" : "border-[#CBD5E1]"}`}>
                      {/* Banner hiển thị quyền chỉnh sửa khi tour liên minh */}
                      {isCoHostedTour && (
                        <div className={`border-b px-4 py-2 flex items-center justify-between text-xs ${
                          isDayCreatedByMe
                            ? "bg-emerald-50/95 border-emerald-200 text-emerald-900"
                            : "bg-[#F0F9FF]/90 border-[#F97316]/30 text-purple-900"
                        }`}>
                          <div className="flex items-center gap-2">
                            {isDayCreatedByMe ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Handshake className="w-3.5 h-3.5 text-[#F97316] flex-shrink-0" />
                            )}
                            <span>
                              {isDayCreatedByMe ? (
                                <>Lịch trình Ngày {day.day} do công ty bạn (<strong className="font-bold">{company.name}</strong>) khởi tạo &amp; phụ trách.</>
                              ) : (
                                <>Lịch trình Ngày {day.day} do <strong className="font-bold text-purple-950">{dayOwnerName}</strong> khởi tạo. Bạn có thể <strong>thêm điểm tham quan và bữa ăn</strong> thuộc trách nhiệm của mình.</>
                              )}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded flex items-center gap-1 border ${
                            isDayCreatedByMe
                              ? "bg-emerald-200 text-emerald-900 border-emerald-300"
                              : "bg-[#F97316]/15 text-purple-800 border-purple-300"
                          }`}>
                            {isDayCreatedByMe ? "Đơn vị khởi tạo ngày" : "Phối hợp đóng góp"}
                          </span>
                        </div>
                      )}

                      {/* Day header identical to thongtintour.png */}
                      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-[#F97316] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {day.day}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm">
                                Ngày {day.day}: {day.title || `Lịch trình ngày ${day.day}`}
                              </p>
                              {(() => {
                                const coHosts = coHostsList;
                                if (!coHosts || coHosts.length === 0) return null;

                                // Scan companies that contributed to this day
                                const dayCompanies = new Map<string, string>();
                                if (day.createdByCompanyId) {
                                  dayCompanies.set(day.createdByCompanyId, day.createdByCompanyName || "Công ty điều phối");
                                }
                                if (day.hotel?.createdByCompanyId) {
                                  dayCompanies.set(day.hotel.createdByCompanyId, day.hotel.createdByCompanyName || "Công ty lưu trú");
                                }
                                day.meals?.forEach((m) => {
                                  if (m.createdByCompanyId) {
                                    dayCompanies.set(m.createdByCompanyId, m.createdByCompanyName || "Công ty ẩm thực");
                                  }
                                });
                                day.locations?.forEach((loc) => {
                                  if (loc.createdByCompanyId) {
                                    dayCompanies.set(loc.createdByCompanyId, loc.createdByCompanyName || "Công ty tham quan");
                                  }
                                });

                                // Fallback to assignedDays if not explicitly tagged yet
                                if (dayCompanies.size === 0) {
                                  coHosts.forEach((ch) => {
                                    if (ch.assignedDays?.includes(day.day)) {
                                      dayCompanies.set(ch.companyId, ch.companyName);
                                    }
                                  });
                                }

                                const companyList = Array.from(dayCompanies.entries());
                                const isMultiCompany = companyList.length > 1;

                                if (isMultiCompany) {
                                  return (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                        <Handshake className="w-3 h-3 text-amber-700" />
                                        🤝 Các công ty cùng phối hợp ({companyList.map(([_, name]) => name).join(" & ")})
                                      </span>
                                    </div>
                                  );
                                }

                                if (companyList.length === 1) {
                                  const [cId, cName] = companyList[0];
                                  const isMyCompany = cId === company.id;
                                  return (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                                        isMyCompany
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                          : "bg-[#E0F2FE] text-blue-800 border border-[#CBD5E1]"
                                      }`}
                                    >
                                      <Building2 className="w-3 h-3" />
                                      {isMyCompany ? `Công ty bạn phụ trách (${cName})` : `Phụ trách: ${cName}`}
                                    </span>
                                  );
                                }

                                return null;
                              })()}
                            </div>
                            {day.meals && day.meals.length > 0 && (
                              <span className="text-xs text-gray-400 font-normal">
                                ({day.meals.map((m) => (m.type === "breakfast" ? "Ăn sáng" : m.type === "lunch" ? "trưa" : "tối")).join(", ")})
                              </span>
                            )}
                          </div>
                        </div>

                        {itinerary.length > 1 && (
                          isDayLocked ? (
                            <span
                              className="text-gray-300 p-1 flex items-center gap-1 text-[11px] cursor-not-allowed"
                              title={`Không thể xóa ngày do ${dayOwnerName} tạo`}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeDay(dIdx)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Xóa ngày này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>

                      {/* Day content: Edit Title & Description */}
                      <div className="p-4 space-y-3">

                        <div>
                          <Label className="text-[11px] text-gray-600">Tiêu đề ngày</Label>
                          <Input
                            value={day.title}
                            disabled={isDayLocked}
                            onChange={(e) => {
                              const updated = [...itinerary];
                              updated[dIdx].title = e.target.value;
                              setItinerary(updated);
                            }}
                            placeholder="VD: TP.HCM – Đà Lạt (Ăn trưa, tối)"
                            className={`text-xs mt-0.5 ${isDayLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed border-[#CBD5E1]" : ""}`}
                          />
                        </div>

                        {/* Description box like thongtintour.png */}
                        <div className="bg-[#F0F9FF] p-3 rounded-lg border border-gray-100">
                          <Label className="text-[11px] font-semibold text-gray-600 block mb-1">Mô tả lịch trình trong ngày</Label>
                          <Textarea
                            value={day.description}
                            disabled={isDayLocked}
                            onChange={(e) => {
                              const updated = [...itinerary];
                              updated[dIdx].description = e.target.value;
                              setItinerary(updated);
                            }}
                            rows={2}
                            placeholder="Mô tả tóm tắt hoạt động trong ngày..."
                            className={`text-xs ${isDayLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed border-[#CBD5E1]" : "bg-white"}`}
                          />
                        </div>

                        {/* Locations timeline identical to thongtintour.png */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-bold text-gray-700">Điểm tham quan ({day.locations.length})</Label>
                            <button
                              type="button"
                              onClick={() => addLocationToDay(dIdx)}
                              className="text-[#F97316] hover:text-purple-800 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Thêm điểm tham quan
                            </button>
                          </div>

                          <div className="relative pl-1">
                            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200" />
                            <div className="space-y-2">
                              {day.locations.map((loc, lIdx) => {
                                const isBeingDragged = draggedLocation?.dayIdx === dIdx && draggedLocation?.locIdx === lIdx;
                                const isDropTarget = dragOverLocation?.dayIdx === dIdx && dragOverLocation?.locIdx === lIdx;
                                const locOwnerId = loc.createdByCompanyId || (isCoHostedTour ? dayOwnerId : company.id);
                                const isLocLocked = Boolean(isCoHostedTour && locOwnerId && locOwnerId !== company.id);
                                const locOwnerName = loc.createdByCompanyName || (locOwnerId === company.id ? company.name : dayOwnerName);

                                return (
                                  <div
                                    key={loc.id || lIdx}
                                    draggable={!isLocLocked}
                                    onDragStart={(e) => {
                                      if (isLocLocked) return;
                                      e.dataTransfer.setData("text/plain", `${dIdx}-${lIdx}`);
                                      setDraggedLocation({ dayIdx: dIdx, locIdx: lIdx });
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      if (!isLocLocked && draggedLocation?.dayIdx === dIdx && dragOverLocation?.locIdx !== lIdx) {
                                        setDragOverLocation({ dayIdx: dIdx, locIdx: lIdx });
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (!isLocLocked && draggedLocation && draggedLocation.dayIdx === dIdx && draggedLocation.locIdx !== lIdx) {
                                        moveLocation(dIdx, draggedLocation.locIdx, lIdx);
                                      }
                                      setDraggedLocation(null);
                                      setDragOverLocation(null);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedLocation(null);
                                      setDragOverLocation(null);
                                    }}
                                    className={`relative flex items-center gap-2.5 transition-all ${
                                      isDropTarget ? "scale-[1.01]" : ""
                                    }`}
                                  >
                                    {/* Dot icon */}
                                    <div className="relative z-10 w-7 h-7 rounded-full bg-white border-2 border-blue-400 flex items-center justify-center flex-shrink-0">
                                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                                    </div>

                                    {/* Location Card with Drag Handle & Swap Controls */}
                                    <div
                                      className={`flex-1 flex items-center justify-between p-2.5 rounded-2xl border bg-white transition-all ${
                                        isBeingDragged
                                          ? "border-dashed border-purple-400 bg-[#F0F9FF]/50 opacity-60"
                                          : isDropTarget
                                          ? "border-purple-500 bg-[#F0F9FF] ring-2 ring-purple-300"
                                          : isLocLocked
                                          ? "border-[#CBD5E1] bg-[#F0F9FF]/60 shadow-2xs"
                                          : "border-[#CBD5E1] hover:border-gray-300 shadow-2xs"
                                      }`}
                                    >
                                      {/* Drag Handle */}
                                      <div
                                        title={isLocLocked ? `Không thể di chuyển điểm do ${locOwnerName} quản lý` : "Kéo thả để sắp xếp thứ tự điểm tham quan"}
                                        className={`mr-2 p-0.5 flex-shrink-0 ${isLocLocked ? "text-gray-300 cursor-not-allowed" : "cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#F97316]"}`}
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>

                                      {/* Location Name Input */}
                                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                                        <Input
                                          value={loc.name}
                                          disabled={isLocLocked}
                                          onChange={(e) => {
                                            const updated = [...itinerary];
                                            updated[dIdx].locations[lIdx].name = e.target.value;
                                            if (!updated[dIdx].locations[lIdx].createdByCompanyId) {
                                              updated[dIdx].locations[lIdx].createdByCompanyId = company.id;
                                              updated[dIdx].locations[lIdx].createdByCompanyName = company.name;
                                            }
                                            setItinerary(updated);
                                          }}
                                          placeholder="Tên điểm tham quan (VD: Hồ Xuân Hương)..."
                                          className={`text-xs font-medium border-none shadow-none focus-visible:ring-1 flex-1 min-w-[120px] p-0 h-auto ${isLocLocked ? "text-gray-500 cursor-not-allowed bg-transparent" : "text-gray-900"}`}
                                        />
                                        {(loc.createdByCompanyName || (isCoHostedTour && locOwnerName)) && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 flex items-center gap-1 border ${
                                            isLocLocked
                                              ? "bg-amber-50 text-amber-900 border-amber-200"
                                              : "bg-[#F0F9FF] text-[#EA580C] border-[#F97316]/30 font-semibold"
                                          }`}>
                                            {isLocLocked ? <Lock className="w-2.5 h-2.5 text-amber-600" /> : <Building2 className="w-2.5 h-2.5 text-[#F97316]" />}
                                            {isLocLocked ? locOwnerName : `${loc.createdByCompanyName || company.name} (Bạn)`}
                                          </span>
                                        )}
                                      </div>

                                      {/* Actions: Move Up, Move Down, Delete */}
                                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                        <button
                                          type="button"
                                          disabled={isLocLocked || lIdx === 0}
                                          onClick={() => moveLocation(dIdx, lIdx, lIdx - 1)}
                                          className="p-1 text-gray-400 hover:text-[#F97316] disabled:opacity-20 disabled:hover:text-gray-400 rounded transition-colors"
                                          title="Đổi thứ tự lên trên"
                                        >
                                          <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isLocLocked || lIdx === day.locations.length - 1}
                                          onClick={() => moveLocation(dIdx, lIdx, lIdx + 1)}
                                          className="p-1 text-gray-400 hover:text-[#F97316] disabled:opacity-20 disabled:hover:text-gray-400 rounded transition-colors"
                                          title="Đổi thứ tự xuống dưới"
                                        >
                                          <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        {isLocLocked ? (
                                          <span title={`Không thể xóa điểm do ${locOwnerName} tạo`} className="p-1 text-gray-300 cursor-not-allowed">
                                            <Lock className="w-3.5 h-3.5" />
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => removeLocationFromDay(dIdx, lIdx)}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors ml-0.5"
                                            title="Xóa điểm tham quan này"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* CHẾ ĐỘ ẨM THỰC & BỮA ĂN (CHỖ ĂN) - ĐẶT NGAY DƯỚI CÁC ĐIỂM THAM QUAN */}
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                                <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                                BỮA ĂN TRONG NGÀY {day.day} (CHẾ ĐỘ ẨM THỰC)
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Cấu hình nhà hàng mặc định và các lựa chọn đổi nhà hàng cho Ngày {day.day}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => addMealToDay(dIdx, "breakfast")}
                                className="px-2.5 py-1 text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                Thêm bữa sáng
                              </button>
                              <button
                                type="button"
                                onClick={() => addMealToDay(dIdx, "lunch")}
                                className="px-2.5 py-1 text-xs rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                Thêm bữa trưa
                              </button>
                              <button
                                type="button"
                                onClick={() => addMealToDay(dIdx, "dinner")}
                                className="px-2.5 py-1 text-xs rounded-lg border border-purple-300 bg-[#F0F9FF] text-[#EA580C] hover:bg-[#F97316]/15 font-medium transition-colors flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                Thêm bữa tối
                              </button>
                            </div>
                          </div>

                          {/* Danh sách các bữa ăn của ngày */}
                          {(!day.meals || day.meals.length === 0) ? (
                            <div className="p-3 border border-dashed border-[#CBD5E1] rounded-2xl text-center text-xs text-gray-400 bg-[#F0F9FF]/50">
                              Chưa có bữa ăn nào cho Ngày {day.day}. Nhấp nút "+ Thêm bữa sáng", "+ Thêm bữa trưa" hoặc "+ Thêm bữa tối" ở trên để bổ sung.
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {day.meals.map((meal, mIdx) => {
                                const mealType = meal.type;
                                const mealKey = `${day.id}-${mealType}-${mIdx}`;
                                const isExpanded = expandedMealKey === mealKey;
                                const mealLabel = mealType === "breakfast" ? "Ăn sáng" : mealType === "lunch" ? "Ăn trưa" : "Ăn tối";
                                const altsCount = (meal.alternativeMeals || []).length;
                                const mealOwnerId = meal.createdByCompanyId || (isCoHostedTour ? dayOwnerId : company.id);
                                const isMealLocked = Boolean(isCoHostedTour && mealOwnerId && mealOwnerId !== company.id);
                                const mealOwnerName = meal.createdByCompanyName || (mealOwnerId === company.id ? company.name : dayOwnerName);

                                return (
                                  <div key={mealKey} className={`border rounded-2xl overflow-hidden bg-white shadow-2xs ${isMealLocked ? "border-amber-200" : "border-[#CBD5E1]"}`}>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedMealKey(isExpanded ? null : mealKey)}
                                      className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-left ${
                                        isMealLocked
                                          ? "bg-amber-50/60 hover:bg-amber-100/50"
                                          : mealType === "breakfast"
                                          ? "bg-amber-50/50 hover:bg-amber-100/50"
                                          : mealType === "lunch"
                                          ? "bg-emerald-50/50 hover:bg-emerald-100/50"
                                          : "bg-[#F0F9FF]/50 hover:bg-[#F97316]/15/50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                          isMealLocked
                                            ? "bg-amber-100 text-amber-700"
                                            : mealType === "breakfast"
                                            ? "bg-amber-100 text-amber-700"
                                            : mealType === "lunch"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-[#F97316]/15 text-[#EA580C]"
                                        }`}>
                                          {mealType === "breakfast" ? <Sun className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs sm:text-sm font-semibold text-gray-900">
                                              {mealLabel}:{" "}
                                              <span className="font-bold text-gray-900">{meal.serviceName || "Nhà hàng theo tour"}</span>
                                            </p>
                                            {(meal.createdByCompanyName || (isCoHostedTour && mealOwnerName)) && (
                                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal flex items-center gap-1 border ${
                                                isMealLocked
                                                  ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                                                  : "text-[#EA580C] bg-[#F0F9FF] border-[#F97316]/30 font-semibold"
                                              }`}>
                                                {isMealLocked ? <Lock className="w-2.5 h-2.5 text-amber-700" /> : <Building2 className="w-2.5 h-2.5 text-[#F97316]" />}
                                                {isMealLocked ? `Khóa: ${mealOwnerName}` : `Tạo bởi: ${meal.createdByCompanyName || company.name} (Bạn)`}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                            Tiêu chuẩn: {meal.serviceName || "Nhà hàng địa phương"} (0đ chênh lệch)
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[11px] text-gray-500 bg-white px-2 py-0.5 rounded border border-[#CBD5E1] font-medium">
                                          {altsCount > 0 ? `${altsCount + 1} phương án ẩm thực` : "1 phương án tiêu chuẩn (0đ)"}
                                        </span>
                                        {isMealLocked ? (
                                          <span
                                            className="p-1 text-gray-300 cursor-not-allowed"
                                            title={`Không thể xóa bữa ăn do ${mealOwnerName} tạo`}
                                          >
                                            <Lock className="w-3.5 h-3.5" />
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeMeal(dIdx, mIdx);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                            title="Xóa bữa ăn này"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                      </div>
                                    </button>

                                    {isExpanded && (
                                      <div className="p-4 bg-white border-t border-gray-100 space-y-4">
                                        {isMealLocked && (
                                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 font-medium">
                                              <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                              Bữa ăn này do <strong>{mealOwnerName}</strong> phụ trách. Bạn không có quyền chỉnh sửa thực đơn.
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                                              Chỉ xem
                                            </span>
                                          </div>
                                        )}

                                        {/* Default Restaurant & Description */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                          <div className="sm:col-span-12">
                                            <Label className="text-xs font-semibold text-gray-700">
                                              Lựa chọn 1: Tên nhà hàng / Món ăn tiêu chuẩn ({mealLabel}) <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                              value={meal.serviceName || ""}
                                              disabled={isMealLocked}
                                              onChange={(e) => updateMealField(dIdx, mIdx, { serviceName: e.target.value })}
                                              placeholder="VD: Nhà hàng Hương Rừng Đà Lạt"
                                              className={`mt-1 text-xs ${isMealLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                            />
                                            <select value={meal.serviceId || ""} disabled={isMealLocked}
                                              onChange={e => {
                                                const selected = serviceOptions.find(option => String(option.id) === e.target.value);
                                                updateMealField(dIdx, mIdx, { serviceId: selected ? String(selected.id) : undefined,
                                                  serviceName: selected?.name || meal.serviceName });
                                              }} className="mt-2 w-full h-9 px-2 text-xs border border-gray-300 rounded-md bg-white">
                                              <option value="">Nhập nhà hàng thủ công (không liên kết Service)</option>
                                              {serviceOptions.filter(option => option.category === "fnb").map(option =>
                                                <option key={option.id} value={option.id}>{option.name} · #{option.id}</option>)}
                                            </select>
                                          </div>
                                          <div className="sm:col-span-12">
                                            <Label className="text-xs font-semibold text-gray-700">Mô tả thực đơn tiêu chuẩn (Đã bao gồm trong giá tour - 0đ chênh lệch)</Label>
                                            <Input
                                              value={meal.description ?? ""}
                                              disabled={isMealLocked}
                                              onChange={(e) => updateMealField(dIdx, mIdx, { description: e.target.value })}
                                              placeholder="VD: Đặc sản gà đồi, cơm lam, rau củ tươi organic"
                                              className={`mt-1 text-xs ${isMealLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                            />
                                          </div>
                                        </div>

                                        {/* Sub-section: Cấu hình các lựa chọn bữa ăn khác */}
                                        <div className="border-t border-emerald-100 pt-3 space-y-3">
                                          <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                              <h5 className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                                                <Utensils className="w-3 h-3 text-emerald-600" />
                                                CÁC LỰA CHỌN ẨM THỰC / NHÀ HÀNG KHÁC CHO BỮA NÀY ({altsCount})
                                              </h5>
                                              <p className="text-[10px] text-gray-500">
                                                Các phương án nhà hàng/thực đơn thay thế do công ty thiết lập sẵn. Khách chọn option này khi đặt tour sẽ tự động áp dụng giá mà không tính là thay đổi cần duyệt.
                                              </p>
                                            </div>
                                            {!isMealLocked && (
                                              <button
                                                type="button"
                                                onClick={() => addAlternativeMeal(dIdx, mIdx)}
                                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-semibold transition-colors shadow-2xs"
                                              >
                                                <Plus className="w-3 h-3 text-emerald-700" />
                                                Thêm phương án bữa ăn khác (Option)
                                              </button>
                                            )}
                                          </div>

                                          {/* List of configured alternative meals */}
                                          {altsCount === 0 ? (
                                            <div className="p-3 border border-dashed border-[#CBD5E1] rounded-2xl text-center text-[11px] text-gray-400">
                                              Chưa có phương án ẩm thực bổ sung. Bấm "+ Thêm phương án bữa ăn khác (Option)" để thiết lập thêm các lựa chọn thực đơn cho khách.
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              {(meal.alternativeMeals || []).map((alt, aIdx) => (
                                                <div
                                                  key={alt.id || aIdx}
                                                  className="p-2.5 rounded-2xl border border-[#CBD5E1] bg-[#F0F9FF]/50 hover:bg-white transition-all space-y-1.5 shadow-2xs"
                                                >
                                                  <div className="flex items-center justify-between gap-2">
                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                      <div className="sm:col-span-7">
                                                        <Label className="text-[10px] text-gray-500 font-medium">Lựa chọn {aIdx + 2}: Tên nhà hàng / Món ăn</Label>
                                                        <Input
                                                          value={alt.restaurantName}
                                                          disabled={isMealLocked}
                                                          onChange={(e) =>
                                                            updateAlternativeMeal(dIdx, mIdx, alt.id, { restaurantName: e.target.value })
                                                          }
                                                          placeholder="VD: Nhà hàng Trúc Lâm Viên"
                                                          className={`text-xs mt-0.5 bg-white font-semibold ${isMealLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                                        />
                                                      </div>
                                                      <div className="sm:col-span-5">
                                                        <div className="flex items-center justify-between">
                                                          <Label className="text-[10px] text-gray-500 font-medium">
                                                            Giá chênh lệch / người (VNĐ)
                                                          </Label>
                                                          <span
                                                            className={`text-[10px] font-bold ${
                                                              alt.priceDifference > 0
                                                                ? "text-amber-700"
                                                                : alt.priceDifference < 0
                                                                ? "text-emerald-600"
                                                                : "text-gray-500"
                                                            }`}
                                                          >
                                                            {alt.priceDifference > 0 ? "+" : ""}
                                                            {formatVND(alt.priceDifference || 0)}
                                                          </span>
                                                        </div>
                                                        <Input
                                                          type="number"
                                                          step={10000}
                                                          disabled={isMealLocked}
                                                          value={alt.priceDifference}
                                                          onChange={(e) =>
                                                            updateAlternativeMeal(dIdx, mIdx, alt.id, {
                                                              priceDifference: parseInt(e.target.value) || 0,
                                                            })
                                                          }
                                                          className={`text-xs mt-0.5 bg-white font-bold ${isMealLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                                        />
                                                      </div>
                                                    </div>
                                                    {!isMealLocked ? (
                                                      <button
                                                        type="button"
                                                        onClick={() => removeAlternativeMeal(dIdx, mIdx, alt.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors self-end mb-1"
                                                        title="Xóa nhà hàng này"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    ) : (
                                                      <span className="p-1.5 text-gray-300 cursor-not-allowed self-end mb-1">
                                                        <Lock className="w-3.5 h-3.5" />
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div>
                                                    <Input
                                                      value={alt.description ?? ""}
                                                      disabled={isMealLocked}
                                                      onChange={(e) =>
                                                        updateAlternativeMeal(dIdx, mIdx, alt.id, { description: e.target.value })
                                                      }
                                                      placeholder="Mô tả thực đơn (VD: Cơm niêu gia đình, canh atiso...)"
                                                      className={`text-xs bg-white text-gray-600 ${isMealLocked ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                                                    />
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Toggle custom request */}
                                          <div className="flex items-center gap-2 pt-1 text-xs">
                                            <input
                                              type="checkbox"
                                              id={`custom-meal-req-${mealKey}`}
                                              disabled={isMealLocked}
                                              checked={meal.allowCustomMealRequest !== false}
                                              onChange={(e) =>
                                                updateMealField(dIdx, mIdx, { allowCustomMealRequest: e.target.checked })
                                              }
                                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                            <label
                                              htmlFor={`custom-meal-req-${mealKey}`}
                                              className={`text-gray-700 font-medium text-[11px] ${isMealLocked ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                                            >
                                              Cho phép khách tự đề xuất nhà hàng khác ngoài danh sách (công ty sẽ báo giá sau khi nhận booking)
                                            </label>
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
                    </div>
                  );
                })}

                  {/* Button to add a new day at bottom of Section 3 */}
                  <button
                    type="button"
                    onClick={addDay}
                    className="w-full py-3.5 border-2 border-dashed border-purple-300 rounded-2xl text-[#EA580C] bg-[#F0F9FF]/50 hover:bg-[#F97316]/15/70 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm ngày mới vào lịch trình tour (Ngày {itinerary.length + 1})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BẢNG GIÁ THEO ĐỘ TUỔI */}
          {activeTab === "pricing" && (
            <div className="space-y-6">
              {/* BẢNG GIÁ VÉ THEO PHÂN LOẠI ĐỘ TUỔI & MA TRẬN BÁO GIÁ LIÊN MINH (GỘP 1 BẢNG DUY NHẤT) */}
              {isCoHostedTour ? (
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50/40 to-blue-50 border-2 border-[#F97316]/30 rounded-2xl p-5 space-y-4 shadow-sm">
                  {/* Thanh Tiêu đề & Quyền hạn */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F97316]/30/80">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-2xl bg-[#F97316] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                        <Handshake className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-purple-950 flex items-center gap-2">
                          Bảng Giá Vé Theo Độ Tuổi &amp; Ma Trận Báo Giá Liên Minh ({coHostsList.length} Công Ty)
                        </h3>
                        <p className="text-xs text-purple-800/80 mt-0.5">
                          {isLeadCompany ? (
                            <span className="text-purple-900 font-medium">
                              👑 <strong>Bạn là Đơn vị chủ trì (Lead):</strong> Bạn có toàn quyền thêm, sửa, xóa các khung phân loại độ tuổi. Các công ty liên minh tự nhập báo giá chặng của mình.
                            </span>
                          ) : (
                            <span className="text-indigo-900 font-medium">
                              🤝 <strong>Bạn là Đối tác Liên minh (Partner):</strong> Chỉ Đơn vị chủ trì ({leadHost?.companyName || "Chủ trì"}) mới có quyền thêm/xóa khung độ tuổi. Bạn chỉ được phép nhập báo giá cho chặng của mình.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Huy hiệu vai trò công ty hiện tại */}
                      <span className="text-xs font-bold text-purple-900 bg-white border border-purple-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                        <Building2 className="w-3.5 h-3.5 text-[#F97316]" />
                        Đang thao tác: <strong>{company.name}</strong> ({isLeadCompany ? "Đơn vị Chủ trì" : "Đối tác Liên minh"})
                      </span>

                      {/* Các nút bấm chỉ Đơn vị chủ trì mới có quyền thực hiện */}
                      {isLeadCompany ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResetDefaultPriceRows}
                            className="text-xs h-8 px-2.5 text-[#EA580C] border-purple-300 hover:bg-[#F97316]/15/70 font-semibold shadow-2xs"
                            title="Khôi phục lại 3 khung giá mặc định (Người lớn, Trẻ em, Em bé)"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#F97316]" />
                            Mẫu chuẩn 3 nhóm
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddPriceRow}
                            className="text-xs h-8 px-3 bg-purple-700 hover:bg-purple-800 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                            title="Thêm một khung giá vé mới vào bảng"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + Thêm khung giá vé
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddCoHostModal(true)}
                            className="text-xs h-8 px-3 border-purple-300 text-[#EA580C] hover:bg-[#F97316]/15 font-bold gap-1 shadow-2xs"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Mời thêm đối tác
                          </Button>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 border border-[#CBD5E1] px-3 py-1 rounded-full flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-gray-500" />
                          Khung độ tuổi do Đơn vị chủ trì thiết lập (Chỉ xem)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BẢNG MA TRẬN DUY NHẤT KẾT HỢP PHÂN LOẠI ĐỘ TUỔI VÀ BÁO GIÁ CÁC CÔNG TY */}
                  <div className="bg-white border-2 border-purple-300 rounded-2xl p-4 space-y-3 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto rounded-2xl border border-[#CBD5E1] shadow-2xs">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 text-[11px] uppercase">
                            <th className="p-3 font-bold border-b border-[#CBD5E1] min-w-[210px]">
                              <div>Phân loại khách &amp; Độ tuổi áp dụng</div>
                              <span className="text-[10px] text-gray-500 font-normal lowercase">
                                {isLeadCompany ? "(Chủ trì có quyền thêm/sửa/xóa)" : "(Do chủ trì ban hành)"}
                              </span>
                            </th>

                            {coHostsList.map((ch, idx) => {
                              const isMe = ch.companyId === company.id;
                              return (
                                <th
                                  key={ch.id || idx}
                                  className={`p-3 font-bold border-b border-[#CBD5E1] min-w-[220px] transition-colors ${
                                    isMe
                                      ? "bg-[#F97316]/15/90 text-purple-950 border-x-2 border-t-2 border-purple-400 shadow-xs"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span
                                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                        isMe
                                          ? "bg-[#F97316] text-white shadow-2xs"
                                          : "bg-gray-200 text-gray-600 border border-gray-300 flex items-center gap-1"
                                      }`}
                                    >
                                      {isMe ? "✏️ Chặng của bạn (Được sửa)" : <><Lock className="w-2.5 h-2.5" /> Đối tác (Chỉ xem)</>}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold bg-white border border-[#CBD5E1] text-gray-700">
                                        {ch.revenueSharePercentage ?? Math.round(100 / coHostsList.length)}%
                                      </span>
                                      {!isMe && isLeadCompany && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePartnerCoHost(ch.id)}
                                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                          title="Xóa đối tác này khỏi liên minh"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`font-bold text-xs truncate ${isMe ? "text-purple-950 font-extrabold" : "text-gray-900"}`}>
                                    {ch.companyName} {isMe ? "(Bạn)" : ""}
                                  </div>
                                  <div className={`text-[10px] font-normal truncate mt-0.5 ${isMe ? "text-purple-800 font-medium" : "text-gray-500"}`}>
                                    {ch.assignedSegments || `Chặng ${idx + 1}`}
                                  </div>
                                </th>
                              );
                            })}

                            <th className="p-3 font-extrabold text-right border-b border-[#CBD5E1] bg-emerald-50 text-emerald-900 min-w-[180px]">
                              <div>ĐƠN GIÁ BÁN TRỌN GÓI</div>
                              <span className="text-[10px] text-emerald-700 font-medium lowercase">
                                (Tự động cộng dồn)
                              </span>
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                          {priceTable.map((row, idx) => {
                            const isChildRow = row.ageGroup === "child_2_11" || row.ageGroupLabel.toLowerCase().includes("trẻ em");
                            const totalRowPrice = getTotalQuoteForRow(row);

                            return (
                              <tr key={row.ageGroup || idx} className="hover:bg-[#F0F9FF]/20 transition-colors">
                                {/* Cột 1: Tên phân loại & Độ tuổi - CHỈ ĐƠN VỊ CHỦ TRÌ MỚI CÓ THỂ SỬA HOẶC XÓA */}
                                <td className="p-3 align-top bg-[#F0F9FF]/40">
                                  {isLeadCompany ? (
                                    <div className="flex items-start gap-1.5">
                                      <div className="space-y-1 flex-1">
                                        <Input
                                          value={row.ageGroupLabel}
                                          onChange={(e) => {
                                            const updated = [...priceTable];
                                            updated[idx].ageGroupLabel = e.target.value;
                                            setPriceTable(updated);
                                          }}
                                          placeholder="Tên nhóm (VD: Người lớn, Trẻ em...)"
                                          className="text-xs h-7.5 font-bold text-gray-900 bg-white border-gray-300"
                                        />
                                        <Input
                                          value={row.ageRange ?? ""}
                                          onChange={(e) => {
                                            const updated = [...priceTable];
                                            updated[idx].ageRange = e.target.value;
                                            setPriceTable(updated);
                                          }}
                                          placeholder="Độ tuổi áp dụng..."
                                          className="text-[11px] h-6.5 text-gray-600 bg-[#F0F9FF]/80"
                                        />
                                      </div>
                                      {priceTable.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePriceRow(idx)}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors mt-0.5"
                                          title="Xóa khung giá này (Chỉ Đơn vị chủ trì có quyền)"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-1">
                                      <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                        <span>{row.ageGroupLabel}</span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">
                                        {row.ageRange || "Theo quy định"}
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Các Cột Báo Giá Của Từng Công Ty */}
                                {coHostsList.map((ch, cIdx) => {
                                  const isMe = ch.companyId === company.id;
                                  const quoteVal = getPartnerQuoteForRow(ch, row);

                                  return (
                                    <td
                                      key={ch.id || cIdx}
                                      className={`p-3 align-top ${
                                        isMe
                                          ? "bg-[#F0F9FF]/50 border-x-2 border-purple-300"
                                          : "bg-[#F0F9FF]/30 text-gray-700 cursor-not-allowed select-none"
                                      }`}
                                    >
                                      {isMe ? (
                                        <div className="space-y-1">
                                          <div className="relative">
                                            <Input
                                              type="number"
                                              step={50000}
                                              min={0}
                                              value={getMyQuoteForRow(row)}
                                              onChange={(e) => setMyQuoteForRow(row, parseInt(e.target.value) || 0)}
                                              className="text-xs font-bold text-purple-950 bg-white border-2 border-purple-400 focus:border-purple-600 focus:ring-1 focus:ring-purple-400 pr-10 h-8.5 shadow-2xs"
                                              placeholder="Nhập giá..."
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#EA580C] font-extrabold">
                                              VNĐ
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px]">
                                            {isChildRow ? (
                                              <button
                                                type="button"
                                                onClick={() => setMyQuoteForRow(row, Math.round(myQuoteAdult * 0.7))}
                                                className="text-[#EA580C] hover:text-purple-900 underline font-medium cursor-pointer"
                                                title="Tính nhanh 70% giá người lớn"
                                              >
                                                Gợi ý 70% ({formatVND(Math.round(myQuoteAdult * 0.7))})
                                              </button>
                                            ) : (
                                              <span className="text-gray-400 text-[10px]">Quy đổi:</span>
                                            )}
                                            <span className="font-bold text-purple-800">
                                              = {getMyQuoteForRow(row) === 0 ? "0đ (Miễn phí)" : formatVND(getMyQuoteForRow(row))}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-gray-100/70 rounded border border-[#CBD5E1] mt-1">
                                          <span className="font-semibold text-gray-800">
                                            {quoteVal === 0 ? "0đ (Miễn phí)" : formatVND(quoteVal)}
                                          </span>
                                          <span className="text-gray-400 flex items-center gap-1 text-[10px]" title={`Chỉ ${ch.companyName} được sửa cột này`}>
                                            <Lock className="w-3 h-3 text-gray-400" />
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}

                                {/* Cột Cuối: ĐƠN GIÁ BÁN TRỌN GÓI */}
                                <td className="p-3 text-right bg-emerald-50/70 font-black text-emerald-800 text-sm align-middle">
                                  {totalRowPrice === 0 ? "0đ (Miễn phí)" : formatVND(totalRowPrice)}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Hàng Dịch vụ chặng bao gồm */}
                          <tr className="hover:bg-[#F0F9FF]/20 transition-colors">
                            <td className="p-3 font-bold text-gray-900 align-top bg-[#F0F9FF]/40">
                              <div className="text-xs">Dịch vụ chặng bao gồm</div>
                              <span className="text-[10px] text-gray-500 font-normal">KS, ăn uống, vé, xe...</span>
                            </td>
                            {coHostsList.map((ch, idx) => {
                              const isMe = ch.companyId === company.id;

                              return (
                                <td
                                  key={ch.id || idx}
                                  className={`p-3 align-top ${
                                    isMe
                                      ? "bg-[#F0F9FF]/50 border-x-2 border-purple-300"
                                      : "bg-[#F0F9FF]/30 text-gray-700"
                                  }`}
                                >
                                  {isMe ? (
                                    <Textarea
                                      value={myQuoteNote}
                                      onChange={(e) => setMyQuoteNote(e.target.value)}
                                      rows={2}
                                      placeholder="Diễn giải dịch vụ bao gồm chặng của công ty bạn..."
                                      className="text-[11px] bg-white border border-purple-300 rounded-lg p-2 focus:ring-1 focus:ring-purple-400 resize-none leading-relaxed"
                                    />
                                  ) : (
                                    <div className="p-2 rounded bg-gray-100/60 border border-[#CBD5E1] text-[11px] text-gray-600 italic line-clamp-3">
                                      "{ch.quoteNote || ch.notes || "Đối tác đang chuẩn bị chi tiết dịch vụ chặng..."}"
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center bg-emerald-50/70 text-emerald-900 text-[11px] font-medium align-middle">
                              Cộng gộp toàn bộ dịch vụ các chặng thành tour hoàn chỉnh
                            </td>
                          </tr>

                          {/* Hàng Trạng thái & Thao tác chốt giá */}
                          <tr className="bg-[#F0F9FF]/50">
                            <td className="p-3 font-bold text-gray-900 align-middle bg-[#F0F9FF]/60">
                              <div className="text-xs">Trạng thái chốt giá</div>
                            </td>
                            {coHostsList.map((ch, idx) => {
                              const isMe = ch.companyId === company.id;

                              return (
                                <td
                                  key={ch.id || idx}
                                  className={`p-3 align-middle ${
                                    isMe
                                      ? "bg-[#F0F9FF]/50 border-x-2 border-b-2 border-purple-400"
                                      : "bg-[#F0F9FF]/30 text-center"
                                  }`}
                                >
                                  {isMe ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        const newStatus = myQuoteStatus === "submitted" ? "draft" : "submitted";
                                        setMyQuoteStatus(newStatus);
                                      }}
                                      className={`w-full text-xs font-bold py-1.5 h-8 shadow-xs cursor-pointer ${
                                        myQuoteStatus === "submitted"
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                          : "bg-[#F97316] hover:bg-[#EA580C] text-white"
                                      }`}
                                    >
                                      {myQuoteStatus === "submitted" ? "✓ Đã chốt báo giá" : "Xác nhận chốt giá"}
                                    </Button>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                        ch.quoteStatus === "submitted"
                                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                    >
                                      {ch.quoteStatus === "submitted" ? "🟢 Đã chốt báo giá" : "⏳ Đang soạn thảo"}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center bg-emerald-50/70 align-middle">
                              {(() => {
                                const allSubmitted = coHostsList.length > 0 && coHostsList.every((ch) =>
                                  ch.companyId === company.id ? myQuoteStatus === "submitted" : ch.quoteStatus === "submitted"
                                );
                                return (
                                  <span
                                    className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                      allSubmitted
                                        ? "bg-emerald-200 text-emerald-900 border border-emerald-300"
                                        : "bg-amber-100 text-amber-800 border border-amber-300"
                                    }`}
                                  >
                                    {allSubmitted ? "✓ Đủ báo giá toàn đoàn" : "Chờ đối tác chốt"}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Hộp giải thích nghiệp vụ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                        <span className="text-sm">💡</span>
                        <p className="leading-relaxed text-[11px]">
                          <strong>Cơ chế tính giá &amp; Đón/trả khách linh hoạt theo chặng:</strong> Khi hành khách đặt booking và chỉ chọn tham gia một số chặng (ví dụ: rời đoàn sau Chặng 1 hoặc nhập đoàn tại Chặng 3), hệ thống điều hành booking sẽ tự động tính giá vé từng người bằng tổng đơn giá của các chặng mà khách thực tế tham gia.
                        </p>
                      </div>

                      <div className="bg-[#F0F9FF]/80 p-3 rounded-lg border border-[#CBD5E1] text-xs text-blue-950 flex items-start gap-2">
                        <span className="text-sm">ℹ️</span>
                        <p className="leading-relaxed text-[11px]">
                          <strong>Tự động nhận diện độ tuổi:</strong> Khi khách hàng nhập ngày sinh hoặc tải danh sách bằng Excel, hệ thống sẽ tự tính số tuổi đến ngày khởi hành để áp dụng chính xác mức giá từ bảng phân loại trên.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TOUR ĐƠN LẺ KHÔNG LIÊN MINH (1 CÔNG TY) */
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Bảng giá vé theo phân loại độ tuổi
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Quy định đơn giá áp dụng cho từng đối tượng hành khách. Bạn có thể thêm, chỉnh sửa hoặc xóa các khung giá vé tùy theo chính sách của tour.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddPriceRow}
                        className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm khung giá vé
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#CBD5E1] rounded-2xl shadow-2xs">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700">
                          <th className="p-3 text-left w-[42%] font-semibold">Tên phân loại khách</th>
                          <th className="p-3 text-center w-[26%] font-semibold">Khoảng tuổi áp dụng</th>
                          <th className="p-3 text-right w-[24%] font-semibold">Đơn giá vé (VNĐ)</th>
                          <th className="p-3 text-center w-[8%] font-semibold">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {priceTable.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F0F9FF]/70 transition-colors">
                            <td className="p-3">
                              <Input
                                value={row.ageGroupLabel}
                                onChange={(e) => {
                                  const updated = [...priceTable];
                                  updated[idx].ageGroupLabel = e.target.value;
                                  setPriceTable(updated);
                                }}
                                placeholder="Tên nhóm (VD: Người lớn, Trẻ em...)"
                                className="text-xs h-8 font-semibold text-gray-900"
                              />
                            </td>
                            
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center justify-center gap-2 bg-[#F0F9FF] px-3 py-1 rounded-xl border border-[#CBD5E1] shadow-2xs">
                                <span className="text-[11px] text-gray-500 font-medium">Từ</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={120}
                                  value={row.minAge ?? ""}
                                  onChange={(e) => {
                                    const updated = [...priceTable];
                                    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                    updated[idx].minAge = val !== undefined && !isNaN(val) ? Math.max(0, val) : undefined;
                                    setPriceTable(updated);
                                  }}
                                  placeholder="0"
                                  className="text-xs h-8 w-14 text-center font-bold text-[#075985] bg-white border-gray-300 focus:border-[#075985] px-1 shadow-2xs"
                                />
                                <span className="text-gray-400 font-semibold">-</span>
                                <span className="text-[11px] text-gray-500 font-medium">Đến</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={120}
                                  value={row.maxAge ?? ""}
                                  onChange={(e) => {
                                    const updated = [...priceTable];
                                    const val = e.target.value === "" ? undefined : parseInt(e.target.value);
                                    updated[idx].maxAge = val !== undefined && !isNaN(val) ? Math.max(0, val) : undefined;
                                    setPriceTable(updated);
                                  }}
                                  placeholder="120"
                                  className="text-xs h-8 w-14 text-center font-bold text-[#075985] bg-white border-gray-300 focus:border-[#075985] px-1 shadow-2xs"
                                />
                                <span className="text-[11px] text-gray-600 font-medium">tuổi</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Input
                                  type="number"
                                  step={50000}
                                  min={0}
                                  value={row.price}
                                  onChange={(e) => {
                                    const updated = [...priceTable];
                                    updated[idx].price = Math.max(0, parseInt(e.target.value) || 0);
                                    setPriceTable(updated);
                                  }}
                                  className="text-xs h-8 text-right font-bold text-[#075985] max-w-[160px]"
                                />
                                <span className="text-[11px] text-gray-500 font-medium">đ</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePriceRow(idx)}
                                disabled={priceTable.length <= 1}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={priceTable.length <= 1 ? "Cần giữ tối thiểu 1 khung giá" : "Xóa khung giá này"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2.5 bg-[#F0F9FF]/70 border border-[#CBD5E1] rounded-2xl flex items-center justify-between text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#075985] flex-shrink-0" />
                      <span>
                        Khi khách hàng nhập ngày sinh hoặc tải danh sách bằng Excel, hệ thống sẽ tự tính số tuổi đến ngày khởi hành để áp dụng chính xác mức giá từ bảng trên.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUY ĐỊNH & CHÍNH SÁCH */}
          {activeTab === "regulations" && (
            <div className="space-y-6">
              {/* GIÁ BAO GỒM */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Giá tour bao gồm:
                </Label>
                <div className="space-y-1.5">
                  {inclusions.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...inclusions];
                          updated[idx] = e.target.value;
                          setInclusions(updated);
                        }}
                        className="text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setInclusions(inclusions.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    placeholder="Thêm mục bao gồm..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newInclusion.trim()) {
                        setInclusions([...inclusions, newInclusion.trim()]);
                        setNewInclusion("");
                      }
                    }}
                  >
                    Thêm
                  </Button>
                </div>
              </div>

              {/* GIÁ KHÔNG BAO GỒM */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <Label className="text-xs font-bold text-red-800 flex items-center gap-1.5 uppercase">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Giá tour không bao gồm:
                </Label>
                <div className="space-y-1.5">
                  {exclusions.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...exclusions];
                          updated[idx] = e.target.value;
                          setExclusions(updated);
                        }}
                        className="text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setExclusions(exclusions.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    placeholder="Thêm mục không bao gồm..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newExclusion.trim()) {
                        setExclusions([...exclusions, newExclusion.trim()]);
                        setNewExclusion("");
                      }
                    }}
                  >
                    Thêm
                  </Button>
                </div>
              </div>

              {/* ĐIỀU KIỆN & LƯU Ý */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase">
                  <Info className="w-4 h-4 text-amber-600" />
                  Điều kiện &amp; Lưu ý khi đi tour:
                </Label>
                <div className="space-y-1.5">
                  {regulations.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const updated = [...regulations];
                          updated[idx] = e.target.value;
                          setRegulations(updated);
                        }}
                        className="text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setRegulations(regulations.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newRegulation}
                    onChange={(e) => setNewRegulation(e.target.value)}
                    placeholder="Thêm điều kiện / lưu ý mới..."
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newRegulation.trim()) {
                        setRegulations([...regulations, newRegulation.trim()]);
                        setNewRegulation("");
                      }
                    }}
                  >
                    Thêm
                  </Button>
                </div>
              </div>

              {/* LỜI NHẮN TỪ CÔNG TY */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <Label className="text-xs font-bold text-gray-900">
                  Lời nhắn / Khẩu hiệu kết thúc tour từ Công ty du lịch
                </Label>
                <Input
                  value={companyNote}
                  onChange={(e) => setCompanyNote(e.target.value)}
                  placeholder="VD: VIETTRAVEL KÍNH CHÚC QUÝ KHÁCH MỘT CHUYẾN ĐI VUI VẺ!"
                  className="text-sm font-semibold text-red-600"
                />
              </div>
            </div>
          )}

          {/* TAB 5: MÔ PHỎNG TOUR HIỂN THỊ (PREVIEW Y HỆT KHÁCH HÀNG XEM) */}
          {activeTab === "preview" && (
            <div className="space-y-6 bg-[#F0F9FF]/70 p-4 rounded-2xl border border-[#CBD5E1]">
              <div className="bg-[#F97316]/15/70 text-purple-900 border border-purple-300 p-3 rounded-2xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#EA580C]" />
                  <span><strong>Chế độ mô phỏng trực tiếp:</strong> Đây là giao diện chính xác mà khách hàng sẽ thấy sau khi bạn đăng tour này.</span>
                </div>
                <span className="text-[11px] font-bold bg-purple-200 px-2 py-0.5 rounded">Preview Live</span>
              </div>

              {/* Top Hero Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative rounded-2xl overflow-hidden shadow-md h-72">
                    <img src={chosenThumbnail} alt={name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
                      {company.logo && <img src={company.logo} alt="" className="w-5 h-5 rounded object-cover" />}
                      <span className="text-xs font-semibold text-gray-800">{company.name}</span>
                    </div>
                    <div className="absolute top-4 right-4 bg-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      4.8
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-[11px] text-white/70 font-medium mb-1">MÃ TOUR: {tourCode || "T-NEW"}</p>
                      <h1 className="text-xl font-bold leading-tight drop-shadow-sm">{name || "Tên tour của bạn"}</h1>
                    </div>
                  </div>

                  {/* Thumbnail gallery if multiple images */}
                  {images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className={`w-16 h-12 rounded-lg object-cover border-2 flex-shrink-0 ${
                            thumbnailIndex === i ? "border-[#075985] ring-2 ring-blue-500/50" : "border-[#CBD5E1]"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Meta strip */}
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl p-3.5 flex flex-wrap gap-4 text-xs text-gray-700 shadow-2xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <span>{destination || "Điểm đến"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>{duration}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{minGuests}–{maxGuests} khách</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>{operationPeriod}</span>
                    </div>
                  </div>

                  {/* Preview Tabs View */}
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-2xs">
                    <div className="flex border-b border-[#CBD5E1] bg-[#F0F9FF]/50">
                      {[
                        { id: "program", label: "Chương trình tour" },
                        { id: "regulations", label: "Quy định" },
                        { id: "pricing", label: "Bảng giá" },
                        { id: "custom", label: "Lịch trình tùy chỉnh" },
                        { id: "reviews", label: "Nhận xét" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPreviewActiveTab(t.id as any)}
                          className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                            previewActiveTab === t.id
                              ? "border-[#075985] text-[#075985] bg-white"
                              : "border-transparent text-gray-500 hover:text-gray-800"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 text-xs space-y-4">
                      {/* CUSTOM TAB (EXACTLY MATCHING THONGTINTOUR.PNG) */}
                      {previewActiveTab === "custom" && (
                        <div className="space-y-5">
                          <p className="text-gray-500 text-[11px]">
                            Chọn khách sạn và tùy chỉnh lịch trình. Thay đổi địa điểm hoặc tự nhập khách sạn → công ty sẽ báo giá.
                          </p>

                          {/* 1. KHÁCH SẠN LƯU TRÚ */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 uppercase">
                              <Building2 className="w-3.5 h-3.5 text-[#075985]" />
                              Khách sạn lưu trú ({hotels.length})
                            </h4>
                            <div className="space-y-2">
                              {hotels.map((h, hi) => (
                                <div key={hi} className="border border-[#CBD5E1] rounded-2xl overflow-hidden bg-white shadow-2xs">
                                  <div className="p-3 bg-[#F0F9FF]/80 flex items-center justify-between border-b border-gray-100">
                                    <div className="flex items-center gap-2.5">
                                      <Building2 className="w-4 h-4 text-[#075985]" />
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-bold text-gray-900 text-xs">{h.destination || destination || "Điểm đến"}</p>
                                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                            {h.stars || 4} ★
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500">
                                          {h.nights || 1} đêm • {h.name || "Khách sạn lưu trú"} • {h.stars || 4} sao (Tiêu chuẩn: 0đ)
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] bg-white border border-[#CBD5E1] px-2 py-0.5 rounded text-gray-600 font-medium">
                                      {(h.alternativeHotels || []).length > 0 ? `${(h.alternativeHotels || []).length + 1} phương án chỗ ở` : "1 phương án chỗ ở tiêu chuẩn"}
                                    </span>
                                  </div>
                                  {(h.alternativeHotels || []).length > 0 && (
                                    <div className="p-2.5 space-y-1.5 bg-[#F0F9FF]/50">
                                      {(h.alternativeHotels || []).map((alt, ai) => (
                                        <div key={ai} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 text-[11px]">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-medium text-gray-800">{alt.name}</span>
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                              {alt.stars || 4} ★
                                            </span>
                                          </div>
                                          <span className={`font-bold ${alt.priceDifference > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                                            {alt.priceDifference > 0 ? "+" : ""}{formatVND(alt.priceDifference)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 2. LỊCH TRÌNH CHI TIẾT & CHẾ ĐỘ ĂN UỐNG (THEO TỪNG NGÀY) */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 uppercase">
                              <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                              LỊCH TRÌNH CHI TIẾT &amp; CHẾ ĐỘ ĂN UỐNG (THEO TỪNG NGÀY)
                            </h4>
                            <div className="space-y-3">
                              {itinerary.map((d) => (
                                <div key={d.id} className="border border-[#CBD5E1] rounded-2xl p-3 bg-white space-y-2.5 shadow-2xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#F97316] text-white text-xs font-bold flex items-center justify-center">
                                      {d.day}
                                    </div>
                                    <span className="font-bold text-gray-900 text-xs">Ngày {d.day}: {d.title}</span>
                                  </div>
                                  {d.description && (
                                    <p className="bg-[#F0F9FF] p-2.5 rounded-lg border border-gray-100 text-[11px] text-gray-600">
                                      {d.description}
                                    </p>
                                  )}
                                  <div className="space-y-1.5 pl-2">
                                    {d.locations.map((loc) => (
                                      <div key={loc.id} className="flex items-center justify-between p-2 rounded-lg border border-[#CBD5E1] bg-white">
                                        <div className="flex items-center gap-2 text-xs">
                                          <MapPin className="w-3 h-3 text-blue-500" />
                                          <span className="font-medium text-gray-900">{loc.name}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-[#CBD5E1]">
                                          Thay đổi
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Bữa ăn trong ngày: Nằm ngay dưới các điểm tham quan */}
                                  {d.meals && d.meals.length > 0 && (
                                    <div className="pt-2.5 border-t border-gray-100 space-y-2 pl-2">
                                      <p className="text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                                        Bữa ăn Ngày {d.day} (Chỗ ăn)
                                      </p>
                                      <div className="space-y-1.5">
                                        {d.meals.map((m, mi) => (
                                          <div key={mi} className="border border-[#CBD5E1] rounded-lg overflow-hidden bg-white">
                                            <div className={`p-2 flex items-center justify-between border-b border-gray-100 ${
                                              m.type === "breakfast" ? "bg-amber-50/50" : m.type === "lunch" ? "bg-emerald-50/50" : "bg-[#F0F9FF]/50"
                                            }`}>
                                              <div className="flex items-center gap-2">
                                                {m.type === "breakfast" ? (
                                                  <Sun className="w-3 h-3 text-amber-600" />
                                                ) : (
                                                  <Utensils className="w-3 h-3 text-emerald-600" />
                                                )}
                                                <span className="font-semibold text-gray-900 text-[11px]">
                                                  {m.type === "breakfast" ? "Ăn sáng" : m.type === "lunch" ? "Ăn trưa" : "Ăn tối"}: {m.serviceName}
                                                </span>
                                              </div>
                                              <span className="text-[10px] bg-white border border-[#CBD5E1] px-1.5 py-0.5 rounded text-gray-600 font-medium">
                                                {(m.alternativeMeals || []).length > 0 ? `${(m.alternativeMeals || []).length + 1} phương án ẩm thực` : "1 phương án ẩm thực tiêu chuẩn"}
                                              </span>
                                            </div>
                                            {(m.alternativeMeals || []).length > 0 && (
                                              <div className="p-2 space-y-1 bg-[#F0F9FF]/40">
                                                {(m.alternativeMeals || []).map((alt, ai) => (
                                                  <div key={ai} className="flex items-center justify-between p-1.5 rounded bg-white border border-gray-100 text-[10px]">
                                                    <span className="font-medium text-gray-800">{alt.restaurantName}</span>
                                                    <span className={`font-bold ${alt.priceDifference > 0 ? "text-amber-700" : "text-emerald-600"}`}>
                                                      {alt.priceDifference > 0 ? "+" : ""}{formatVND(alt.priceDifference)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PROGRAM TAB (CHƯƠNG TRÌNH TOUR CHÍNH THỨC) */}
                      {previewActiveTab === "program" && (
                        <div className="space-y-6">
                          {/* Thời gian hoạt động */}
                          {operationPeriod && (
                            <div className="bg-[#F0F9FF] border border-blue-100 rounded-2xl p-3.5">
                              <h4 className="text-xs font-bold text-[#075985] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                Thời gian hoạt động
                              </h4>
                              <p className="text-xs text-gray-700">
                                <span className="text-gray-500">Mùa tour / Thời gian hoạt động:</span>{" "}
                                <strong>{operationPeriod}</strong>
                              </p>
                            </div>
                          )}

                          {/* Điểm nổi bật */}
                          {highlights.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold text-red-600 mb-2.5 flex items-center gap-1.5">
                                <Star className="w-4 h-4" />
                                ĐIỂM NỔI BẬT:
                              </h4>
                              <ul className="space-y-1.5">
                                {highlights.map((h, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                    <span>{h}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Lịch trình chi tiết */}
                          <div>
                            <h4 className="text-sm font-bold text-red-600 mb-3 uppercase">LỊCH TRÌNH CHI TIẾT:</h4>
                            <div className="space-y-3">
                              {itinerary.map((d) => {
                                const isOpen = previewExpandedDays.has(d.id);
                                return (
                                  <div key={d.id} className="border border-[#CBD5E1] rounded-2xl overflow-hidden bg-white shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => togglePreviewDay(d.id)}
                                      className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#F0F9FF] hover:bg-gray-100 transition-colors text-left"
                                    >
                                      <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                                        {d.day}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-bold text-gray-900 text-xs sm:text-sm">
                                            NGÀY {d.day}: {d.title.toUpperCase()}
                                          </p>
                                          {(() => {
                                            if (!isCoHostedTour) return null;
                                            const dayCompanies = new Map<string, string>();
                                            if (d.createdByCompanyId) dayCompanies.set(d.createdByCompanyId, d.createdByCompanyName || "Công ty điều phối");
                                            if (d.hotel?.createdByCompanyId) dayCompanies.set(d.hotel.createdByCompanyId, d.hotel.createdByCompanyName || "Công ty lưu trú");
                                            d.meals?.forEach((m) => {
                                              if (m.createdByCompanyId) dayCompanies.set(m.createdByCompanyId, m.createdByCompanyName || "Công ty ẩm thực");
                                            });
                                            d.locations?.forEach((loc) => {
                                              if (loc.createdByCompanyId) dayCompanies.set(loc.createdByCompanyId, loc.createdByCompanyName || "Công ty tham quan");
                                            });
                                            if (dayCompanies.size === 0) {
                                              const coHosts = tour?.coHosts || customRequest?.coHosts || coHostsList;
                                              coHosts?.forEach((ch) => {
                                                if (ch.assignedDays?.includes(d.day)) {
                                                  dayCompanies.set(ch.companyId, ch.companyName);
                                                }
                                              });
                                            }
                                            const list = Array.from(dayCompanies.entries());
                                            if (list.length > 1) {
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                                  <Handshake className="w-3 h-3 text-amber-700" />
                                                  🤝 Đồng phụ trách ({list.map(([_, n]) => n).join(" & ")})
                                                </span>
                                              );
                                            }
                                            if (list.length === 1) {
                                              const [_, cName] = list[0];
                                              return (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-blue-800 border border-[#CBD5E1] flex items-center gap-1 shadow-2xs">
                                                  <Building2 className="w-3 h-3" />
                                                  Phụ trách: {cName}
                                                </span>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>
                                      </div>
                                      {d.meals && d.meals.length > 0 && (
                                        <div className="flex gap-1 flex-shrink-0">
                                          {d.meals.map((m, mi) => {
                                            const isBreakfast = m.type === "breakfast";
                                            const isLunch = m.type === "lunch";
                                            const badgeColor = isBreakfast
                                              ? "text-amber-700 bg-amber-50 border border-amber-200"
                                              : isLunch
                                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                              : "text-[#EA580C] bg-[#F0F9FF] border border-[#F97316]/30";
                                            const label = isBreakfast ? "Sáng" : isLunch ? "Trưa" : "Tối";
                                            return (
                                              <span key={mi} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor}`}>
                                                {label}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {isOpen ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      )}
                                    </button>

                                    {isOpen && (
                                      <div className="px-4 py-3.5 space-y-3 bg-white">
                                        {d.description && (
                                          <p className="text-gray-700 leading-relaxed text-xs">{d.description}</p>
                                        )}

                                        {/* Pure locations list (No detailed addresses) */}
                                        {d.locations.length > 0 && (
                                          <div className="space-y-1.5">
                                            {d.locations.map((loc) => (
                                              <div key={loc.id} className="flex items-center justify-between text-xs text-gray-700">
                                                <div className="flex items-center gap-2">
                                                  <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                  <span className="font-medium text-gray-900">{loc.name}</span>
                                                </div>
                                                {loc.createdByCompanyName && (
                                                  <span className="text-[10px] text-gray-500 bg-gray-100 border border-[#CBD5E1] px-1.5 py-0.2 rounded">
                                                    Tạo bởi: {loc.createdByCompanyName}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Chế độ ẩm thực & Bữa ăn (Chỗ ăn) trong ngày */}
                                        {d.meals && d.meals.length > 0 && (
                                          <div className="pt-3 border-t border-gray-100 space-y-2">
                                            <h5 className="text-[11px] font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                                              Chế độ ẩm thực &amp; Bữa ăn (Chỗ ăn)
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                              {d.meals.map((meal, mIdx) => {
                                                const mealType = meal.type;
                                                const label = mealType === "breakfast" ? "Ăn sáng" : mealType === "lunch" ? "Ăn trưa" : "Ăn tối";
                                                const isBreakfast = mealType === "breakfast";
                                                const isLunch = mealType === "lunch";
                                                return (
                                                  <div
                                                    key={mIdx}
                                                    className={`p-2.5 rounded-2xl border flex items-start gap-2.5 ${
                                                      isBreakfast
                                                        ? "bg-amber-50/60 border-amber-200/80"
                                                        : isLunch
                                                        ? "bg-emerald-50/60 border-emerald-200/80"
                                                        : "bg-[#F0F9FF]/60 border-[#F97316]/30/80"
                                                    }`}
                                                  >
                                                    <div
                                                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                        isBreakfast
                                                          ? "bg-amber-100 text-amber-700"
                                                          : isLunch
                                                          ? "bg-emerald-100 text-emerald-700"
                                                          : "bg-[#F97316]/15 text-[#EA580C]"
                                                      }`}
                                                    >
                                                      {isBreakfast ? <Sun className="w-3 h-3" /> : <Utensils className="w-3 h-3 text-emerald-600" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <p className="text-[11px] font-bold text-gray-900">{label}</p>
                                                      <p className="text-xs text-gray-800 font-semibold truncate">
                                                        {meal.serviceName || "Nhà hàng theo chương trình"}
                                                      </p>
                                                      {meal.description && (
                                                        <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                                                          {meal.description}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PRICING TAB */}
                      {previewActiveTab === "pricing" && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-gray-900">BẢNG GIÁ THEO LỨA TUỔI:</h4>
                          <table className="w-full border border-[#CBD5E1] rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-2 text-left">Phân loại</th>
                                <th className="p-2 text-center">Độ tuổi áp dụng</th>
                                <th className="p-2 text-right">Giá vé</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {priceTable.map((p, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 font-medium">{p.ageGroupLabel}</td>
                                  <td className="p-2 text-center text-gray-600">
                                    {p.minAge !== undefined && p.maxAge !== undefined
                                      ? (p.maxAge >= 100 ? `Từ ${p.minAge} tuổi trở lên` : `Từ ${p.minAge} đến ${p.maxAge} tuổi`)
                                      : (p.ageRange || "-")}
                                  </td>
                                  <td className="p-2 text-right font-bold text-[#075985]">
                                    {p.price === 0 ? "Miễn phí" : formatVND(p.price)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* REGULATIONS TAB */}
                      {previewActiveTab === "regulations" && (
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-bold text-emerald-700 mb-1">GIÁ TOUR BAO GỒM:</h4>
                            <ul className="space-y-0.5 list-disc pl-4 text-gray-700">
                              {inclusions.map((inc, i) => <li key={i}>{inc}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-red-600 mb-1">GIÁ TOUR KHÔNG BAO GỒM:</h4>
                            <ul className="space-y-0.5 list-disc pl-4 text-gray-700">
                              {exclusions.map((exc, i) => <li key={i}>{exc}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-bold text-amber-700 mb-1">ĐIỀU KIỆN &amp; LƯU Ý:</h4>
                            <ul className="space-y-0.5 list-disc pl-4 text-gray-700">
                              {regulations.map((reg, i) => <li key={i}>{reg}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* REVIEWS TAB */}
                      {previewActiveTab === "reviews" && (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-[#075985]">5.0</p>
                              <div className="flex justify-center gap-0.5 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">Tour mới (Chưa có đánh giá thực tế)</p>
                            </div>
                            <div className="flex-1 w-full space-y-1 text-xs">
                              {[
                                { star: 5, pct: "100%" },
                                { star: 4, pct: "0%" },
                                { star: 3, pct: "0%" },
                                { star: 2, pct: "0%" },
                                { star: 1, pct: "0%" },
                              ].map(({ star, pct }) => (
                                <div key={star} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600 w-3">{star}</span>
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: pct }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 border border-dashed border-[#CBD5E1] rounded-2xl text-center text-xs text-gray-400">
                            Khách hàng sẽ để lại đánh giá và nhận xét sau khi hoàn thành chuyến đi.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Booking Sidebar Preview */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-sm p-4 space-y-3 text-xs">
                    <div>
                      <p className="text-gray-400">Giá từ</p>
                      <p className="text-2xl font-bold text-[#075985]">{formatVND(price)}</p>
                      <p className="text-gray-400 text-[10px]">/ người lớn</p>
                    </div>

                    <div className="bg-[#F0F9FF] rounded-2xl p-2.5">
                      <p className="text-[10px] text-[#075985] font-bold uppercase mb-0.5">Thời gian hoạt động</p>
                      <p className="font-semibold text-gray-800">{operationPeriod}</p>
                    </div>

                    <div className="bg-[#F0F9FF] rounded-2xl p-2.5 space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Thời lượng:</span>
                        <strong className="text-gray-900">{duration}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Điểm đến:</span>
                        <strong className="text-gray-900">{destination}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Quy mô đoàn:</span>
                        <strong className="text-gray-900">{minGuests}–{maxGuests} khách</strong>
                      </div>
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 text-xs rounded-2xl">
                      Đặt tour ngay (Khách tự chọn ngày)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#CBD5E1] px-6 py-3.5 flex items-center justify-between shadow-lg">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>{tour ? `Đang chỉnh sửa: ${tour.name}` : "Tạo tour mới chuẩn dữ liệu. Đảm bảo đã thiết lập đủ lịch trình và bảng giá."}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onBack}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="border-amber-500 text-amber-700 hover:bg-amber-50 font-semibold"
          >
            Lưu bản nháp
          </Button>
          <Button
            disabled={saving || !name.trim() || !destination.trim()}
            onClick={() => handleSubmit("complete_public")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Check className="w-4 h-4 mr-1.5" />
            {tour ? "Lưu & Mở bán ngay" : "Hoàn tất & Đăng bán ngay"}
          </Button>
        </div>
      </div>

      {/* AI Itinerary Planner Modal */}
      {showAIPlanner && (
        <AIItineraryPlannerModal
          isOpen={showAIPlanner}
          onClose={() => setShowAIPlanner(false)}
          onApplyItinerary={handleApplyAIItinerary}
          initialDestination={destination}
        />
      )}

      {/* Modal Mời Đối Tác Liên Minh Đa Công Ty */}
      {showAddCoHostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#F97316]/15 text-[#EA580C] flex items-center justify-center font-bold shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Mời Đối Tác Lữ Hành Liên Minh</h3>
                  <p className="text-xs text-gray-500">Mở rộng tour phối hợp cùng thực hiện dịch vụ ({coHostsList.length} công ty hiện tại)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCoHostModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Chọn Công ty Du lịch đối tác <span className="text-red-500">*</span></Label>
                <select
                  value={newPartnerCompanyId}
                  onChange={(e) => setNewPartnerCompanyId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316] font-medium"
                >
                  <option value="">-- Chọn công ty lữ hành đối tác --</option>
                  {mockTourCompanies
                    .filter((c) => c.id !== company.id && !coHostsList.some((ch) => ch.companyId === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.address})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Chặng / Dịch vụ phân công đảm nhiệm <span className="text-red-500">*</span></Label>
                <Input
                  value={newPartnerSegment}
                  onChange={(e) => setNewPartnerSegment(e.target.value)}
                  placeholder="VD: Phụ trách khách sạn & ẩm thực chặng 2 (Ngày 3–4 tại Đà Lạt/Hà Giang)"
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Dự trù kinh phí chặng của đối tác (VNĐ / khách)</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step={50000}
                    value={newPartnerBudget}
                    onChange={(e) => setNewPartnerBudget(Number(e.target.value) || 0)}
                    className="text-xs pr-12 font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">VNĐ</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Ghi chú phối hợp / Lời nhắn mời tham gia</Label>
                <Textarea
                  value={newPartnerNotes}
                  onChange={(e) => setNewPartnerNotes(e.target.value)}
                  rows={2}
                  placeholder="VD: Nhờ quý công ty chuẩn bị thực đơn đặc sản địa phương và phòng khách sạn tiêu chuẩn 4 sao..."
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddCoHostModal(false)}
                className="text-xs"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                disabled={!newPartnerCompanyId}
                onClick={() => handleAddPartnerCoHost(newPartnerCompanyId, newPartnerSegment, newPartnerBudget, newPartnerNotes)}
                className="bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Xác nhận mời vào liên minh
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const CompanyTourManagement = AgencyTourManagement;
