import { Building2, CheckCircle2, XCircle, Clock, Phone, Mail, MapPin, FileText, FileCheck, AlertTriangle, ShieldCheck, UserCheck, ExternalLink, Store, Compass, Check, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import type { PartnerApplication } from "@/app/services/partnerService";

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

export function toPartnerProfile(item: PartnerApplication): UnifiedPartnerItem {
  return { id: String(item.profile.id), type: item.role, businessName: item.profile.businessName,
    taxCode: item.profile.taxCode, representativeName: item.name, email: item.email, phone: item.phone || "",
    address: item.profile.businessAddress, licenseUrl: item.profile.businessLicenseUrl,
    description: item.profile.description, status: item.profile.status,
    rejectionReason: item.profile.rejectionReason, createdAt: item.profile.createdAt || "" };
}

interface PartnerProfileDialogProps {
  partner: UnifiedPartnerItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (partner: UnifiedPartnerItem) => void;
  onReject?: (partner: UnifiedPartnerItem) => void;
  error?: string;
  onRetry?: () => void;
}

export function PartnerProfileDialog({ partner: selectedPartner, open, onOpenChange, onApprove, onReject, error, onRetry }: PartnerProfileDialogProps) {
  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl md:max-w-4xl w-[94vw] max-w-4xl rounded-3xl p-0 bg-white text-slate-900 border border-slate-200/90 shadow-2xl overflow-hidden focus:outline-none block">
          {!selectedPartner && <div className="space-y-4 p-6">
            <DialogTitle>Hồ sơ nhà cung cấp</DialogTitle>
            <DialogDescription>{error ? "Không thể tải hồ sơ doanh nghiệp." : "Đang tải hồ sơ doanh nghiệp…"}</DialogDescription>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            {error && onRetry && <Button variant="outline" onClick={onRetry}>Thử lại</Button>}
          </div>}
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
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedPartner.businessName}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Thông tin pháp nhân, người đại diện và giấy phép kinh doanh của đối tác.</DialogDescription>
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
                  onClick={() => onOpenChange(false)}
                  className="text-xs h-10 px-5 rounded-xl cursor-pointer font-semibold border-slate-300"
                >
                  Đóng
                </Button>

                <div className="flex items-center gap-2.5">
                  {selectedPartner.status === "pending" && onReject && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        onReject?.(selectedPartner);
                      }}
                      className="h-10 px-4.5 border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1.5 cursor-pointer rounded-xl"
                    >
                      <X className="w-4 h-4" />
                      <span>Từ chối hồ sơ</span>
                    </Button>
                  )}

                  {selectedPartner.status === "pending" && onApprove && (
                    <Button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        onApprove?.(selectedPartner);
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
  );
}
