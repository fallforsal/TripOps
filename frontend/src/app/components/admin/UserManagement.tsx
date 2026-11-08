import { useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Ban,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  Eye,
  Mail,
  MapPin,
  MinusCircle,
  Phone,
  Search,
  Store,
  User as UserIcon,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useAdminAccounts } from "@/app/hooks/useAdminAccounts";
import {
  adminAccountService,
  type AccountCounts,
  type AccountRole,
  type AccountStatus,
  type AdminAccount,
} from "@/app/services/adminAccountService";

type Tab = "all" | "user" | "agency" | "provider";
type StatusFilter = "" | AccountStatus;

const PAGE_SIZE = 20;

const TABS: { id: Tab; label: string; Icon: LucideIcon; count: (c: AccountCounts) => number }[] = [
  { id: "all", label: "Toàn bộ tài khoản", Icon: Users, count: (c) => c.all },
  { id: "user", label: "Tài khoản khách hàng", Icon: UserIcon, count: (c) => c.customer },
  { id: "agency", label: "Tài khoản công ty lữ hành", Icon: Compass, count: (c) => c.agency },
  { id: "provider", label: "Tài khoản nhà cung cấp dịch vụ", Icon: Store, count: (c) => c.provider },
];

const ROLE: Record<AccountRole, { label: string; cls: string; Icon: LucideIcon }> = {
  user: { label: "Khách hàng", cls: "bg-sky-100 text-sky-900 border-sky-200", Icon: UserIcon },
  agency: { label: "Công ty lữ hành", cls: "bg-amber-100 text-amber-900 border-amber-200", Icon: Compass },
  provider: { label: "Nhà cung cấp", cls: "bg-emerald-100 text-emerald-900 border-emerald-200", Icon: Store },
  guide: { label: "Hướng dẫn viên", cls: "bg-violet-100 text-violet-900 border-violet-200", Icon: UserCheck },
};

const STATUS: Record<AccountStatus, { label: string; cls: string; Icon: LucideIcon }> = {
  active: { label: "Đang hoạt động", cls: "bg-emerald-100 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  inactive: { label: "Không hoạt động", cls: "bg-slate-100 text-slate-700 border-slate-300", Icon: MinusCircle },
  banned: { label: "Bị cấm", cls: "bg-rose-100 text-rose-800 border-rose-200", Icon: Ban },
};

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "", label: "Tất cả trạng thái" },
  { id: "active", label: "Đang hoạt động" },
  { id: "inactive", label: "Không hoạt động" },
  { id: "banned", label: "Bị cấm" },
];

const BUSINESS_STATUS: Record<string, string> = {
  pending: "Chờ xét duyệt",
  approved: "Đang hoạt động",
  rejected: "Bị từ chối",
  suspended: "Đình chỉ",
};

// Backend trả thời gian UTC; thêm "Z" nếu chuỗi chưa có múi giờ để hiển thị đúng giờ địa phương.
const asDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) || date.getFullYear() < 1971 ? null : date;
};
const formatDate = (value?: string | null) => asDate(value)?.toLocaleDateString("vi-VN") ?? "Chưa có";
const formatDateTime = (value?: string | null) => asDate(value)?.toLocaleString("vi-VN") ?? "Chưa cập nhật";

function Avatar({ account, size }: { account: AdminAccount; size: "sm" | "lg" }) {
  const box = size === "lg" ? "w-20 h-20 text-3xl" : "w-9 h-9 text-sm";
  return account.avatarUrl ? (
    <img src={account.avatarUrl} alt={`Ảnh đại diện ${account.name}`} className={`${box} rounded-full object-cover border border-slate-200 shrink-0`} />
  ) : (
    <div className={`${box} rounded-full bg-[#075985] text-white font-bold flex items-center justify-center shrink-0`}>
      {(account.name || account.email).trim().charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }: { role: AccountRole }) {
  const { label, cls, Icon } = ROLE[role];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: AccountStatus }) {
  const { label, cls, Icon } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] text-slate-400 font-semibold block uppercase">{label}</span>
      <div className="mt-0.5 text-xs text-slate-900 font-medium">{children}</div>
    </div>
  );
}

export function UserManagement({ onOpenBusiness }: { onOpenBusiness?: (userId: string) => void }) {
  const [tab, setTab] = useState<Tab>("all");
  const [status, setStatus] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { items, total, counts, loading, error, refresh } = useAdminAccounts(tab, status, search, page, PAGE_SIZE);

  const [selected, setSelected] = useState<AdminAccount | null>(null);
  const [target, setTarget] = useState<AdminAccount | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const changeTab = (value: Tab) => { setTab(value); setPage(1); };
  const changeStatus = (value: StatusFilter) => { setStatus(value); setPage(1); };
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };

  const openConfirm = (account: AdminAccount) => {
    setTarget(account);
    setReason("");
    setReasonError("");
    setActionError("");
  };

  const confirm = async () => {
    if (!target || submitting) return;
    const banning = target.status !== "banned";
    if (banning && reason.trim().length < 5) {
      setReasonError("Vui lòng nhập lý do cấm (tối thiểu 5 ký tự).");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      const updated = banning
        ? await adminAccountService.ban(target.id, reason.trim())
        : await adminAccountService.unban(target.id);
      toast.success(banning ? "Đã cấm tài khoản." : "Đã thu hồi lệnh cấm.");
      setSelected((current) => (current?.id === updated.id ? updated : current));
      setTarget(null);
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không thể cập nhật tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  const banningTarget = target ? target.status !== "banned" : true;

  return (
    <div className="space-y-6">
      {/* Tiêu đề */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý tài khoản</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Theo dõi tài khoản khách hàng, công ty lữ hành, nhà cung cấp và hướng dẫn viên; cấm hoặc thu hồi lệnh cấm khi cần.
        </p>
      </div>

      {/* 3 phần chính + toàn bộ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TABS.map(({ id, label, Icon, count }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => changeTab(id)}
              aria-pressed={active}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${active
                  ? "bg-[#075985] text-white border-[#075985] shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:border-[#075985]"
                }`}
            >
              <div className="text-xs font-medium opacity-90 flex items-center justify-between gap-2">
                <span>{label}</span>
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <div className="text-2xl font-black mt-2">{count(counts)}</div>
            </button>
          );
        })}
      </div>

      {/* Tìm kiếm và lọc trạng thái */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            className="pl-9 text-xs h-10 bg-slate-50/60 focus:bg-white border-slate-200 rounded-xl"
          />
        </div>
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-medium w-full lg:w-auto">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.id || "all"}
              type="button"
              onClick={() => changeStatus(option.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${status === option.id ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500"
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div role="status" className="p-12 text-center text-sm text-slate-500">Đang tải danh sách tài khoản...</div>
        ) : error ? (
          <div role="alert" className="p-12 text-center text-sm text-rose-700">
            {error}
            <Button variant="outline" onClick={refresh} className="ml-3 rounded-xl">Thử lại</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy tài khoản nào</h3>
            <p className="text-xs text-slate-500">Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Người dùng</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Số điện thoại</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((account) => (
                  <tr key={account.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar account={account} size="sm" />
                        <span className="font-bold text-sm text-slate-900 truncate max-w-[14rem]">{account.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4"><RoleBadge role={account.role} /></td>
                    <td className="py-3.5 px-4 text-slate-700">{account.email}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{account.phone || "Chưa cập nhật"}</td>
                    <td className="py-3.5 px-4"><StatusBadge status={account.status} /></td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(account)}
                          className="h-8 px-2.5 text-xs border-slate-300 hover:bg-slate-100 gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem chi tiết</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openConfirm(account)}
                          className={`h-8 px-2.5 text-xs font-bold gap-1 cursor-pointer ${account.status === "banned"
                              ? "border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                              : "border-rose-300 text-rose-700 hover:bg-rose-50"
                            }`}
                        >
                          {account.status === "banned" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          <span>{account.status === "banned" ? "Thu hồi lệnh cấm" : "Cấm tài khoản"}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phân trang */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
        <span>Trang {page} · Tổng {total} tài khoản phù hợp</span>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" disabled={loading || page <= 1} onClick={() => setPage((v) => v - 1)}>
            Trang trước
          </Button>
          <Button variant="outline" className="rounded-xl" disabled={loading || page * PAGE_SIZE >= total} onClick={() => setPage((v) => v + 1)}>
            Trang sau
          </Button>
          <Button variant="outline" className="rounded-xl" disabled={loading} onClick={refresh}>Tải lại</Button>
        </div>
      </div>

      {/* Chi tiết tài khoản */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
          {selected && (
            <div className="flex flex-col max-h-[88vh]">
              <DialogHeader className="px-7 py-5 border-b border-slate-200 pr-14 text-left">
                <div className="flex items-center gap-4">
                  <Avatar account={selected} size="lg" />
                  <div className="min-w-0 space-y-1.5">
                    <DialogTitle className="text-xl font-black tracking-tight truncate">{selected.name}</DialogTitle>
                    <DialogDescription className="sr-only">Thông tin chi tiết của tài khoản</DialogDescription>
                    <div className="flex flex-wrap gap-2">
                      <RoleBadge role={selected.role} />
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-7 space-y-5 overflow-y-auto bg-slate-50/60">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Info label="Email">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{selected.email}</span>
                  </Info>
                  <Info label="Số điện thoại">
                    <span className="flex items-center gap-1.5 font-mono"><Phone className="w-3.5 h-3.5 text-slate-400" />{selected.phone || "Chưa cập nhật"}</span>
                  </Info>
                  <Info label="Vai trò">{ROLE[selected.role].label}</Info>
                  <Info label="Trạng thái">{STATUS[selected.status].label}</Info>
                  <Info label="Ngày tham gia nền tảng">{formatDate(selected.createdAt)}</Info>
                  <Info label="Cập nhật thông tin gần nhất">{formatDateTime(selected.updatedAt)}</Info>
                </div>

                {selected.status === "banned" && (
                  <div role="status" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                    <div className="font-bold">Tài khoản đang bị cấm{selected.bannedAt ? ` từ ${formatDateTime(selected.bannedAt)}` : ""}</div>
                    {selected.banReason && <p className="italic">Lý do: "{selected.banReason}"</p>}
                  </div>
                )}

                {selected.business && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <Building2 className="w-4 h-4 text-[#075985]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Thông tin doanh nghiệp</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 shrink-0 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                        {selected.business.logoUrl ? (
                          <img src={selected.business.logoUrl} alt={`Logo ${selected.business.businessName}`} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl font-black text-slate-400">
                            {(selected.business.businessName || "?").trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-900">{selected.business.businessName}</div>
                        {selected.business.status && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Hồ sơ: {BUSINESS_STATUS[selected.business.status] ?? selected.business.status}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Info label="Địa chỉ">
                        <span className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          {selected.business.address || "Chưa cập nhật"}
                        </span>
                      </Info>
                      <Info label="Ngày đăng ký doanh nghiệp">{formatDate(selected.business.createdAt)}</Info>
                    </div>
                    {onOpenBusiness && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { onOpenBusiness(selected.id); setSelected(null); }}
                        className="rounded-xl text-xs gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-[#075985]" />
                        Xem chi tiết doanh nghiệp
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="px-7 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setSelected(null)} className="rounded-xl text-xs">Đóng</Button>
                <Button
                  type="button"
                  onClick={() => openConfirm(selected)}
                  className={`rounded-xl text-xs font-bold gap-1.5 text-white ${selected.status === "banned" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    }`}
                >
                  {selected.status === "banned" ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  {selected.status === "banned" ? "Thu hồi lệnh cấm" : "Cấm tài khoản"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Xác nhận cấm / thu hồi lệnh cấm */}
      <Dialog open={Boolean(target)} onOpenChange={(open) => !open && !submitting && setTarget(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white text-slate-900 border border-slate-200 shadow-2xl">
          {target && (
            <>
              <DialogHeader>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${banningTarget ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {banningTarget ? <Ban className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                </div>
                <DialogTitle className="text-lg font-bold">
                  {banningTarget ? "Xác nhận cấm tài khoản?" : "Xác nhận thu hồi lệnh cấm?"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Tài khoản: <strong className="text-slate-900">{target.name}</strong> ({target.email})
                </DialogDescription>
              </DialogHeader>

              {banningTarget ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 leading-relaxed">
                    Người dùng sẽ bị đăng xuất và không thể đăng nhập lại cho đến khi lệnh cấm được thu hồi.
                    {(target.role === "agency" || target.role === "provider") &&
                      " Doanh nghiệp này cũng sẽ không còn xuất hiện cho khách lựa chọn."}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ban-reason" className="text-xs font-bold text-slate-900">
                      Lý do cấm <span className="text-rose-600">*</span>
                    </Label>
                    <Textarea
                      id="ban-reason"
                      value={reason}
                      onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
                      rows={3}
                      maxLength={1000}
                      placeholder="VD: Vi phạm điều khoản sử dụng, có dấu hiệu gian lận..."
                      className={`text-xs resize-none ${reasonError ? "border-rose-500" : ""}`}
                    />
                    {reasonError && <p className="text-[11px] text-rose-600 font-semibold">{reasonError}</p>}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed space-y-1">
                  <p>Tài khoản sẽ trở lại trạng thái đang hoạt động và người dùng có thể đăng nhập lại.</p>
                  {target.banReason && <p className="italic">Lý do cấm trước đó: "{target.banReason}"</p>}
                </div>
              )}

              {actionError && <p role="alert" className="text-xs text-rose-700">{actionError}</p>}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => setTarget(null)} className="rounded-xl text-xs">
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  onClick={confirm}
                  className={`rounded-xl text-xs font-bold text-white ${banningTarget ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  {submitting ? "Đang xử lý..." : banningTarget ? "Xác nhận cấm" : "Xác nhận thu hồi"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}