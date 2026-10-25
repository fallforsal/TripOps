import { partnerService } from "@/app/services/partnerService";
import { useAuth } from "@/app/contexts/AuthContext";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Building2,
  FileText,
  ShieldAlert,
  CheckCircle2,
  Clock,
  LogOut,
  Upload,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Info,
  Sparkles,
  FileCheck,
  UserCheck,
  User as UserIcon,
  XCircle,
  RotateCcw,
  Headphones,
  HelpCircle,
  Eye,
  Check,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { TourCompany, User, BusinessProfile } from "@/app/types";

interface BusinessProfileOnboardingPageProps {
  currentUser: User;
  company?: TourCompany;
  onLogout?: () => void;
  onSubmitSuccess?: (profile?: BusinessProfile) => void;
}

type VerificationStatus = "draft" | "pending" | "rejected";

const cleanDisplayName = (name?: string) => {
  if (!name) return "";
  return name
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export function BusinessProfileOnboardingPage({
  currentUser,
  company,
  onLogout,
  onSubmitSuccess,
}: BusinessProfileOnboardingPageProps) {
  const { refresh: refreshAccount } = useAuth();
  const isAgency =
    currentUser.role === "agency" || currentUser.role === "company_admin";
  const isProvider = currentUser.role === "provider";
  const [profile, setProfile] = useState(currentUser.businessProfile);
  const [currentViewStatus, setCurrentViewStatus] =
    useState<VerificationStatus>(
      profile?.status === "rejected" || profile?.status === "suspended"
        ? "rejected"
        : profile
          ? "pending"
          : "draft",
    );
  const [businessName, setBusinessName] = useState(profile?.businessName || "");
  const [taxCode, setTaxCode] = useState(profile?.taxCode || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [address, setAddress] = useState(profile?.businessAddress || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const licenseFileUploaded = Boolean(
    licenseFile || profile?.businessLicenseUrl,
  );
  const licenseFileName =
    licenseFile?.name ||
    (profile?.businessLicenseUrl ? "Ảnh giấy phép đã nộp" : "");
  const rejectionReason =
    profile?.rejectionReason ||
    (profile?.status === "suspended"
      ? "Hồ sơ đang bị đình chỉ. Vui lòng liên hệ hỗ trợ."
      : "");
  const rejectedAt = profile?.updatedAt
    ? new Date(profile.updatedAt).toLocaleString("vi-VN")
    : "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  async function refreshStatus() {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      const user = await refreshAccount();
      setProfile(user.businessProfile);
      setCurrentViewStatus(
        user.businessProfile?.status === "rejected" ||
          user.businessProfile?.status === "suspended"
          ? "rejected"
          : user.businessProfile
            ? "pending"
            : "draft",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra trạng thái",
      );
    } finally {
      setIsRefreshing(false);
    }
  }
  function selectLicense(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !["image/png", "image/jpeg"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setErrorMessage("Chỉ nhận ảnh PNG/JPEG tối đa 5 MB.");
      event.target.value = "";
      return;
    }
    setLicenseFile(file);
    setErrorMessage("");
  }
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    if (
      !businessName.trim() ||
      !taxCode.trim() ||
      !phone.trim() ||
      !address.trim()
    ) {
      setErrorMessage(
        "Vui lòng điền đầy đủ tên doanh nghiệp, mã số thuế, điện thoại và địa chỉ.",
      );
      return;
    }
    if (!licenseFileUploaded) {
      setErrorMessage("Vui lòng chọn ảnh giấy phép kinh doanh.");
      return;
    }
    const form = new FormData();
    form.set("businessName", businessName.trim());
    form.set("taxCode", taxCode.trim());
    form.set("phone", phone.trim());
    form.set("businessAddress", address.trim());
    form.set("description", description.trim());
    if (licenseFile) form.set("license", licenseFile);
    setIsSubmitting(true);
    try {
      const saved = await partnerService.submit(form);
      setProfile(saved);
      setLicenseFile(null);
      setCurrentViewStatus("pending");
      onSubmitSuccess?.(saved);
      await refreshAccount();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể nộp hồ sơ",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F9FF] via-slate-50 to-white text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      {/* TOP MINIMAL NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#075985] text-white flex items-center justify-center shadow-xs">
              <Compass className="w-6 h-6 text-[#F97316]" />
            </div>
            <div>
              <div className="font-extrabold text-[#075985] tracking-tight text-base flex items-center gap-2">
                <span>TripOps Platform</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold uppercase tracking-wider">
                  Verification Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Cổng xác thực hồ sơ đối tác doanh nghiệp
              </p>
            </div>
          </div>

          {/* User info, State Switcher Demo & Logout */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isRefreshing || isSubmitting}
              onClick={refreshStatus}
              className="h-8.5 rounded-xl text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isRefreshing ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}
            </Button>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900">
                {cleanDisplayName(currentUser.name)}
              </div>
              <div className="text-[11px] text-slate-500">
                {currentUser.email}
              </div>
            </div>

            {onLogout && (
              <Button
                type="button"
                variant="outline"
                onClick={onLogout}
                className="h-8.5 px-3 rounded-xl border-slate-300 text-slate-700 hover:text-red-600 hover:border-red-300 hover:bg-red-50 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {currentViewStatus !== "draft" && errorMessage && (
          <p
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs"
          >
            {errorMessage}
          </p>
        )}
        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* TRƯỜNG HỢP 1: FORM NHẬP / CHỈNH SỬA HỒ SƠ PHÁP NHÂN (DRAFT) */}
          {/* ========================================================================= */}
          {currentViewStatus === "draft" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              {/* STATUS BANNER */}
              <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-300/80 shadow-xs flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-extrabold text-amber-950">
                      Tài khoản cần hoàn tất Hồ sơ Doanh nghiệp để hoạt động
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold uppercase">
                      Chờ nộp hồ sơ
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Theo quy chuẩn của nền tảng TripOps, đối tác{" "}
                    <strong>
                      {isAgency
                        ? "Doanh nghiệp Lữ hành"
                        : "Nhà cung cấp Dịch vụ"}
                    </strong>{" "}
                    cần định danh pháp nhân (Mã số thuế & Giấy phép kinh doanh).
                    Sau khi Quản trị viên duyệt, tài khoản sẽ được mở khóa toàn
                    bộ quyền đăng bài và liên minh.
                  </p>
                </div>
              </div>

              {/* THÔNG TIN TÀI KHOẢN NGƯỜI ĐẠI DIỆN (ĐÃ LƯU TRONG BẢNG USERS) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#075985]" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      1. Tài khoản Người đại diện (Dữ liệu từ bảng users)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Đã đăng ký tài khoản
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Họ và tên người đại diện</span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {cleanDisplayName(currentUser.name)}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email đăng nhập tài khoản</span>
                    </div>
                    <div className="font-bold text-slate-900 truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  ℹ️ Khi đăng nhập bằng Google hoặc tạo tài khoản nhanh, bạn
                  chưa cung cấp số điện thoại. Vui lòng nhập số điện thoại
                  hotline/người đại diện ở form bên dưới để Ban quản trị liên hệ
                  khi cần.
                </p>
              </div>

              {/* FORM BỔ SUNG BẢNG BUSINESS_PROFILES */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#075985]">
                    <Building2 className="w-4 h-4 text-[#F97316]" />
                    <span>2. Thông tin pháp nhân doanh nghiệp</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vui lòng cung cấp đầy đủ thông tin pháp nhân để Ban Quản trị
                    thẩm định và kích hoạt quyền kinh doanh.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Trường 1: business_name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>
                        Tên doanh nghiệp / Cơ sở kinh doanh{" "}
                        <span className="text-red-500">*</span>
                      </span>
                    </Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={
                        isAgency
                          ? "VD: Công ty Cổ phần Lữ hành Fiditour"
                          : "VD: Tổ hợp Dịch vụ Du lịch Heritage"
                      }
                      className="text-xs h-9.5 bg-slate-50/50 focus:bg-white border-slate-300"
                    />
                  </div>

                  {/* Trường 2 & 3: tax_code & phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>
                          Mã số thuế doanh nghiệp (MST){" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </Label>
                      <Input
                        value={taxCode}
                        onChange={(e) => setTaxCode(e.target.value)}
                        placeholder="VD: 0301012345"
                        className="text-xs h-9.5 bg-slate-50/50 focus:bg-white border-slate-300 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                        <span>
                          Số điện thoại liên hệ / Hotline CSKH{" "}
                          <span className="text-red-500">*</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Hotline CSKH / Người đại diện
                        </span>
                      </Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="VD: 028 3930 9888 hoặc 0912 345 678"
                        className="text-xs h-9.5 bg-slate-50/50 focus:bg-white border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  {/* Trường 4: business_address */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>
                        Địa chỉ trụ sở kinh doanh{" "}
                        <span className="text-red-500">*</span>
                      </span>
                    </Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="VD: 218/1 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh"
                      className="text-xs h-9.5 bg-slate-50/50 focus:bg-white border-slate-300"
                    />
                  </div>

                  {/* Trường 5: description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Mô tả giới thiệu doanh nghiệp (Tùy chọn)</span>
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder={
                        isAgency
                          ? "VD: Doanh nghiệp lữ hành chuyên thiết kế tour khám phá thiên nhiên, văn hóa và liên minh mở bán chặng đa tỉnh thành..."
                          : "VD: Cơ sở lưu trú và dịch vụ du lịch chuyên nghiệp đạt chuẩn phục vụ khách đoàn lữ hành và khách du lịch cá nhân..."
                      }
                      className="text-xs bg-slate-50/50 focus:bg-white border-slate-300 resize-none leading-relaxed"
                    />
                  </div>

                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={selectLicense}
                  />
                  {/* Trường 6: business_license_url (Tải tài liệu GPKD) */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>
                        Ảnh chụp Giấy phép kinh doanh / Giấy phép lữ hành{" "}
                        <span className="text-red-500">*</span>
                      </span>
                    </Label>

                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Chọn ảnh giấy phép"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          fileInput.current?.click();
                        }
                      }}
                      onClick={() => fileInput.current?.click()}
                      className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        licenseFileUploaded
                          ? "border-emerald-400 bg-emerald-50/60"
                          : "border-slate-300 hover:border-[#075985] bg-slate-50/50 hover:bg-white"
                      }`}
                    >
                      {licenseFileUploaded ? (
                        <>
                          <FileCheck className="w-8 h-8 text-emerald-600" />
                          <div className="text-center">
                            <div className="text-xs font-bold text-emerald-800">
                              Đã đính kèm: {licenseFileName || "Ảnh giấy phép"}
                            </div>
                            <div className="text-[10px] text-emerald-600">
                              {licenseFile
                                ? `${(licenseFile.size / 1024 / 1024).toFixed(2)} MB · Sẵn sàng tải lên`
                                : "Đã lưu trên Cloudinary"}{" "}
                              · Nhấp để chọn ảnh khác
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400" />
                          <div className="text-center">
                            <div className="text-xs font-bold text-slate-800">
                              Bấm để tải lên bản chụp Giấy phép kinh doanh /
                              Giấy phép lữ hành
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Hỗ trợ ảnh JPG, PNG dung lượng tối đa 5 MB
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* NÚT SUBMIT */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      🔒 Thông tin hồ sơ được bảo mật an toàn theo Tiêu chuẩn
                      xác thực đối tác TripOps.
                    </span>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-11 px-6 bg-[#075985] hover:bg-[#0369a1] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md gap-2 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Gửi hồ sơ thẩm định cho Admin</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TRƯỜNG HỢP 2: ĐÃ ĐĂNG NHẬP NHƯNG HỒ SƠ CHƯA ĐƯỢC DUYỆT (PENDING) */}
          {/* ========================================================================= */}
          {currentViewStatus === "pending" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              {/* TOP STATUS CARD */}
              <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 sm:p-8 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Trạng thái: Đang chờ xét duyệt</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Hồ sơ Doanh nghiệp đang chờ Quản trị viên xét duyệt
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Hồ sơ của bạn đã được tiếp nhận thành công. Ban Quản trị
                    TripOps đang thẩm định tính hợp pháp của Mã số thuế và Giấy
                    phép kinh doanh.
                  </p>
                </div>

                {/* PROGRESS TIMELINE (4 BƯỚC) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left">
                  <div className="text-xs font-bold text-slate-900 mb-3.5 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Tiến độ kích hoạt tài khoản đối tác:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    {/* Bước 1 */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Bước 1: Đăng ký</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Tài khoản thành viên đã kích hoạt
                      </p>
                    </div>

                    {/* Bước 2 */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Bước 2: Nộp hồ sơ</span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        Đã nộp Mã số thuế & Giấy phép
                      </p>
                    </div>

                    {/* Bước 3 */}
                    <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-400 space-y-1 shadow-xs">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px]">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin-slow" />
                        <span>Bước 3: Thẩm định</span>
                      </div>
                      <p className="text-[11px] text-amber-900 font-medium">
                        Đang chờ Quản trị viên xét duyệt
                      </p>
                    </div>

                    {/* Bước 4 */}
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1 opacity-70">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
                        <div className="w-4 h-4 rounded-full border-2 border-slate-400 flex items-center justify-center text-[9px]">
                          4
                        </div>
                        <span>Bước 4: Mở khóa</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Đăng tour, mở bán & liên minh
                      </p>
                    </div>
                  </div>
                </div>

                {/* THÔNG TIN HỒ SƠ ĐÃ LƯU TRONG DATABASE */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 text-left space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#075985]" />
                      <span>Thông tin hồ sơ đã gửi:</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Tên doanh nghiệp
                      </span>
                      <span className="font-bold text-slate-900">
                        {businessName || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Mã số thuế (MST)
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {taxCode || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Số điện thoại liên hệ
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {phone || currentUser.phone || "Chưa cập nhật"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Giấy phép kinh doanh
                      </span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4" />
                        <a
                          href={profile?.businessLicenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {licenseFileName || "Ảnh giấy phép"}
                        </a>
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Địa chỉ trụ sở kinh doanh
                      </span>
                      <span className="font-medium text-slate-800">
                        {address ||
                          "218/1 Nguyễn Đình Chiểu, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh"}
                      </span>
                    </div>

                    {description && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Mô tả giới thiệu
                        </span>
                        <span className="text-slate-600 line-clamp-2">
                          {description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* HÀNH ĐỘNG HỖ TRỢ & CHỈNH SỬA */}
                <div className="pt-2 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={refreshStatus}
                    disabled={isRefreshing}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kiểm tra trạng thái hồ sơ</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* TRƯỜNG HỢP 3: HỒ SƠ BỊ TỪ CHỐI (REJECTED) */}
          {/* ========================================================================= */}
          {currentViewStatus === "rejected" && (
            <motion.div
              key="rejected"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              {/* TOP REJECTED CARD */}
              <div className="bg-white rounded-3xl border border-red-200 shadow-md p-6 sm:p-8 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                  <XCircle className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-900 font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Trạng thái: Hồ sơ bị từ chối</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Hồ sơ Doanh nghiệp không được phê duyệt
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Rất tiếc, thông tin pháp nhân bạn gửi chưa đáp ứng đủ tiêu
                    chuẩn kiểm duyệt của sàn du lịch TripOps. Vui lòng xem lý do
                    chi tiết dưới đây.
                  </p>
                </div>

                {/* HỘP HIỂN THỊ CỘT REJECTION_REASON TỪ DATABASE */}
                <div className="p-5 rounded-2xl bg-red-50/80 border-2 border-red-300 text-left space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-red-900 border-b border-red-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Lý do từ chối từ Ban Quản trị:</span>
                    </div>
                    <span className="text-[10px] text-red-700 font-normal">
                      Thời gian phản hồi: {rejectedAt}
                    </span>
                  </div>

                  <p className="text-xs text-red-950 font-medium leading-relaxed bg-white/70 p-3.5 rounded-xl border border-red-200">
                    "{rejectionReason}"
                  </p>

                  <div className="text-[11px] text-red-800 flex items-start gap-1.5 pt-1">
                    <Info className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>
                      Bạn có thể chỉnh sửa lại Mã số thuế, tải lại bản chụp Giấy
                      phép rõ nét hoặc cập nhật địa chỉ chính xác rồi gửi thẩm
                      định lại bất kỳ lúc nào.
                    </span>
                  </div>
                </div>

                {/* TÓM TẮT DỮ LIỆU ĐÃ BỊ TỪ CHỐI ĐỂ USER BIẾT CẦN SỬA GÌ */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 pb-1 border-b border-slate-200 flex items-center justify-between">
                    <span>Thông tin hồ sơ cần cập nhật lại:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Tên pháp nhân đã nộp:
                      </span>
                      <span className="font-semibold text-slate-900">
                        {businessName || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Mã số thuế đã nộp:
                      </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {taxCode || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[10px]">
                        Địa chỉ trụ sở kinh doanh đã nộp:
                      </span>
                      <span className="font-semibold text-slate-900">
                        {address || "Chưa cập nhật"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* HÀNH ĐỘNG KHẮC PHỤC: RESUBMIT */}
                <div className="pt-2 flex items-center justify-center">
                  <Button
                    type="button"
                    onClick={() => setCurrentViewStatus("draft")}
                    disabled={profile?.status === "suspended"}
                    className="w-full sm:w-auto h-11 px-8 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md gap-2 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Chỉnh sửa & Nộp lại hồ sơ thẩm định</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        TripOps B2B Multi-Role Tourism Platform · Cổng Xác thực Hồ sơ Pháp nhân
        Đối tác
      </footer>
    </div>
  );
}
