import { useState } from "react";
import { TourCompany, User } from "@/app/types";
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  Star,
  Users,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";

interface CompanyManagementProps {
  companies: TourCompany[];
  companyAdmins: User[];
  onApproveCompany: (companyId: string) => void;
  onRejectCompany: (companyId: string, reason: string) => void;
  onSuspendCompany: (companyId: string, reason: string) => void;
}

const statusConfig = {
  approved: {
    label: "Đã duyệt",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  pending: {
    label: "Chờ duyệt",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Clock,
  },
  rejected: {
    label: "Từ chối",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
  suspended: {
    label: "Tạm ngừng",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: AlertTriangle,
  },
};

export function CompanyManagement({
  companies,
  companyAdmins,
  onApproveCompany,
  onRejectCompany,
  onSuspendCompany,
}: CompanyManagementProps) {
  const [selectedCompany, setSelectedCompany] =
    useState<TourCompany | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    filterStatus === "all"
      ? companies
      : companies.filter((c) => c.status === filterStatus);

  const getAdmin = (adminId: string) =>
    companyAdmins.find((u) => u.id === adminId);

  const stats = {
    total: companies.length,
    approved: companies.filter((c) => c.status === "approved")
      .length,
    pending: companies.filter((c) => c.status === "pending").length,
    rejected: companies.filter((c) => c.status === "rejected")
      .length,
    suspended: companies.filter((c) => c.status === "suspended")
      .length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Quản lý Công ty Du lịch
        </h2>
        <p className="text-gray-500 mt-1">
          Phê duyệt và quản lý các công ty du lịch đăng ký tham gia
          nền tảng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Tổng cộng",
            value: stats.total,
            color: "bg-[#F0F9FF] text-[#075985]",
            border: "border-[#CBD5E1]",
          },
          {
            label: "Đã duyệt",
            value: stats.approved,
            color: "bg-emerald-50 text-emerald-700",
            border: "border-emerald-200",
          },
          {
            label: "Chờ duyệt",
            value: stats.pending,
            color: "bg-amber-50 text-amber-700",
            border: "border-amber-200",
          },
          {
            label: "Từ chối / Ngừng",
            value: stats.rejected + stats.suspended,
            color: "bg-red-50 text-red-700",
            border: "border-red-200",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-4 ${s.border}`}
          >
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all", label: "Tất cả" },
          { id: "pending", label: "Chờ duyệt" },
          { id: "approved", label: "Đã duyệt" },
          { id: "rejected", label: "Từ chối" },
          { id: "suspended", label: "Tạm ngừng" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filterStatus === tab.id
                ? "bg-[#075985] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Company list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Không có công ty nào</p>
          </div>
        )}
        {filtered.map((company) => {
          const cfg = statusConfig[company.status];
          const StatusIcon = cfg.icon;
          const admin = getAdmin(company.adminId);
          const isExpanded = expandedId === company.id;

          return (
            <div
              key={company.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Main row */}
              <div className="p-4 flex items-center gap-4">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">
                      {company.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {company.address}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {company.totalTours} tour
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {company.totalBookings} booking
                    </span>
                    {company.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400" />
                        {company.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {company.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() =>
                          onApproveCompany(company.id)
                        }
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedCompany(company);
                          setShowRejectModal(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Từ chối
                      </Button>
                    </>
                  )}
                  {company.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => {
                        setSelectedCompany(company);
                        setShowSuspendModal(true);
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Tạm ngừng
                    </Button>
                  )}
                  {company.status === "suspended" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() =>
                        onApproveCompany(company.id)
                      }
                    >
                      Kích hoạt lại
                    </Button>
                  )}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : company.id)
                    }
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Thông tin liên hệ
                    </h4>
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-2 text-sm text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {company.phone}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {company.email}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {company.address}
                      </p>
                      {company.website && (
                        <p className="flex items-center gap-2 text-sm text-[#075985]">
                          <Globe className="w-4 h-4" />
                          {company.website}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Pháp lý & Người quản lý
                    </h4>
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-2 text-sm text-gray-700">
                        <FileText className="w-4 h-4 text-gray-400" />
                        MST: {company.taxCode}
                      </p>
                      {company.licenseNumber && (
                        <p className="flex items-center gap-2 text-sm text-gray-700">
                          <FileText className="w-4 h-4 text-gray-400" />
                          GPLH: {company.licenseNumber}
                        </p>
                      )}
                      {admin && (
                        <div className="flex items-center gap-2 mt-2">
                          <img
                            src={admin.avatar}
                            alt={admin.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              {admin.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {admin.email}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {company.rejectionReason && (
                    <div className="md:col-span-2">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">
                          <strong>Lý do từ chối/ngừng:</strong>{" "}
                          {company.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 md:col-span-2">
                    Ngày đăng ký: {company.createdAt}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reject modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối công ty</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Nhập lý do từ chối{" "}
            <strong>{selectedCompany?.name}</strong>:
          </p>
          <Textarea
            placeholder="Lý do từ chối..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (selectedCompany) {
                  onRejectCompany(selectedCompany.id, rejectReason);
                  setShowRejectModal(false);
                  setRejectReason("");
                }
              }}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend modal */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạm ngừng hoạt động</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Nhập lý do tạm ngừng{" "}
            <strong>{selectedCompany?.name}</strong>:
          </p>
          <Textarea
            placeholder="Lý do tạm ngừng..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowSuspendModal(false)}
            >
              Hủy
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!suspendReason.trim()}
              onClick={() => {
                if (selectedCompany) {
                  onSuspendCompany(selectedCompany.id, suspendReason);
                  setShowSuspendModal(false);
                  setSuspendReason("");
                }
              }}
            >
              Xác nhận tạm ngừng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
