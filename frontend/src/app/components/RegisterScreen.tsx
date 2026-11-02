import { register } from "@/app/services/authService";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Building2,
  Store,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { User, UserRole } from "@/app/types";

interface RegisterScreenProps {
  onRegisterSuccess?: (registeredUser?: User) => void;
  onBack?: () => void;
  onShowLogin?: () => void;
}

type RegisterableRole = "user" | "agency" | "provider";

interface RoleCardConfig {
  id: RegisterableRole;
  title: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  icon: any;
  desc: string;
  tagline: string;
  borderColor: string;
  activeBorderColor: string;
  activeBgColor: string;
  iconBg: string;
  iconColor: string;
  onboardingNote: string;
}

const ROLES_CONFIG: RoleCardConfig[] = [
  {
    id: "user",
    title: "Khách du lịch",
    badge: "Du Khách / B2C",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    icon: Compass,
    tagline: "Khám phá & Đặt tour",
    desc: "Tìm kiếm tour, đặt vé trực tuyến, yêu cầu thiết kế tour riêng theo nhu cầu cá nhân & gia đình.",
    borderColor: "border-slate-200",
    activeBorderColor: "border-[#075985]",
    activeBgColor: "bg-[#075985]/5",
    iconBg: "bg-sky-500",
    iconColor: "text-white",
    onboardingNote:
      "✨ Tài khoản cá nhân được kích hoạt ngay lập tức, không yêu cầu xét duyệt hồ sơ doanh nghiệp.",
  },
  {
    id: "agency",
    title: "Doanh nghiệp Lữ hành",
    badge: "Agency / B2B",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    icon: Building2,
    tagline: "Tạo tour & Liên minh",
    desc: "Tạo và mở bán tour, lập liên minh chặng đa công ty, tìm kiếm dịch vụ B2B & điều phối HDV.",
    borderColor: "border-slate-200",
    activeBorderColor: "border-amber-500",
    activeBgColor: "bg-amber-500/5",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    onboardingNote:
      "ℹ️ Tạo tài khoản, nộp hồ sơ doanh nghiệp và chờ Admin phê duyệt trước khi mở bán.",
  },
  {
    id: "provider",
    title: "Nhà cung cấp Dịch vụ",
    badge: "Đối tác Cung ứng",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    icon: Store,
    tagline: "Đa dạng dịch vụ",
    desc: "Tự do đăng bán Khách sạn/Resort, Nhà hàng ẩm thực, Xe vận chuyển du lịch, Vé tham quan.",
    borderColor: "border-slate-200",
    activeBorderColor: "border-emerald-500",
    activeBgColor: "bg-emerald-500/5",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    onboardingNote:
      "ℹ️ Nộp hồ sơ cơ sở và giấy phép để Admin phê duyệt trước khi đăng bán dịch vụ.",
  },
];

export function RegisterScreen({
  onRegisterSuccess,
  onBack,
  onShowLogin,
}: RegisterScreenProps) {
  // 1. Role Selection (Bắt buộc chọn trước)
  const [selectedRole, setSelectedRole] = useState<RegisterableRole>("agency");

  // 2. Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // 3. UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [registeredRoleInfo, setRegisteredRoleInfo] =
    useState<RoleCardConfig | null>(null);
  const [registeredUserObject, setRegisteredUserObject] = useState<User | null>(
    null,
  );

  const activeRoleConfig =
    ROLES_CONFIG.find((r) => r.id === selectedRole) || ROLES_CONFIG[0];

  // Xử lý đăng ký form truyền thống
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Vui lòng nhập họ và tên");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Vui lòng nhập email hợp lệ");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (!agreeTerms) {
      setError("Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật");
      return;
    }

    setIsLoading(true);
    try {
      const user = await register({
        name: fullName,
        email,
        password,
        role: selectedRole,
        acceptedTerms: agreeTerms,
      });
      setRegisteredUserObject(user);
      setRegisteredRoleInfo(activeRoleConfig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đăng ký");
    } finally {
      setIsLoading(false);
    }
  };

  // Tiến vào Dashboard sau khi hoàn tất đăng ký
  const handleEnterDashboard = () => {
    if (onRegisterSuccess && registeredUserObject) {
      onRegisterSuccess(registeredUserObject);
    } else if (onShowLogin) {
      onShowLogin();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F9FF] via-white to-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* TOP BRAND HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-2xs mb-1">
            <Compass className="w-5 h-5 text-[#075985] animate-spin-slow" />
            <span className="font-extrabold text-[#075985] tracking-wide text-sm uppercase">
              TripOps Platform
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Sign Up v2
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Đăng ký tài khoản thành viên
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Hệ sinh thái kết nối thông minh giữa Doanh nghiệp lữ hành, Nhà cung
            cấp dịch vụ, Hướng dẫn viên và Du khách
          </p>
        </div>

        {/* MAIN CARD CONTAINER */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-7">
          {/* ========================================================================= */}
          {/* BƯỚC 1: LỰA CHỌN ROLE (BẮT BUỘC) */}
          {/* ========================================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#075985] bg-sky-50 px-2.5 py-1 rounded-md">
                  Bước 1 · Định danh vai trò
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  Bạn tham gia TripOps với tư cách gì?{" "}
                  <span className="text-red-500">*</span>
                </h2>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Đang chọn:{" "}
                <strong className="text-slate-900">
                  {activeRoleConfig.title}
                </strong>
              </span>
            </div>

            {/* Grid 4 Cards Vai Trò với AnimateUI motion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {ROLES_CONFIG.map((role) => {
                const IconComponent = role.icon;
                const isSelected = selectedRole === role.id;

                return (
                  <motion.button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setError("");
                    }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${role.activeBorderColor} ${role.activeBgColor} shadow-md ring-2 ring-[#075985]/15`
                        : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Tick icon badge if selected */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeRoleCheck"
                        className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#075985] text-white flex items-center justify-center shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </motion.div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl ${role.iconBg} ${role.iconColor} flex items-center justify-center shadow-2xs`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${role.badgeBg} ${role.badgeText}`}
                        >
                          {role.badge}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm">
                        {role.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                        {role.tagline}
                      </p>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed">
                      {role.desc}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            {/* Note banner giải thích tiến trình xác minh hồ sơ */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRole}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs"
              >
                <Info className="w-4 h-4 text-[#075985] shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  {activeRoleConfig.onboardingNote}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-t border-slate-100" />

          {/* ========================================================================= */}
          {/* BƯỚC 2: PHƯƠNG THỨC ĐĂNG KÝ (GOOGLE OAUTH HOẶC FORM CƠ BẢN) */}
          {/* ========================================================================= */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#075985] bg-sky-50 px-2.5 py-1 rounded-md">
                Bước 2 · Tạo tài khoản
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                Đăng ký cho vai trò:{" "}
                <span className="text-[#075985] font-extrabold">
                  {activeRoleConfig.title}
                </span>
              </h2>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {error}
              </motion.div>
            )}

            {/* Tùy chọn 2: Form 4 trường cơ bản */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Họ và tên */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Họ và tên / Tên đại diện{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="VD: Trần Quốc Bảo"
                      className="pl-9 text-xs h-9 bg-slate-50/50 focus:bg-white border-slate-300"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Email đăng nhập <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tenban@email.com"
                      className="pl-9 text-xs h-9 bg-slate-50/50 focus:bg-white border-slate-300"
                    />
                  </div>
                </div>

                {/* Vai trò xác nhận */}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Vai trò đã chọn
                  </Label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-between text-xs text-slate-700 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <activeRoleConfig.icon className="w-3.5 h-3.5 text-[#075985]" />
                      {activeRoleConfig.title}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Đã chọn ở Bước 1
                    </span>
                  </div>
                </div>

                {/* Mật khẩu */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Mật khẩu <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      className="pl-9 pr-9 text-xs h-9 bg-slate-50/50 focus:bg-white border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Xác nhận mật khẩu */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Xác nhận lại mật khẩu{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="pl-9 pr-9 text-xs h-9 bg-slate-50/50 focus:bg-white border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Điều khoản Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#075985] focus:ring-[#075985]"
                  />
                  <span>
                    Tôi đồng ý với{" "}
                    <a
                      href="#terms"
                      className="text-[#075985] font-semibold hover:underline"
                    >
                      Điều khoản dịch vụ
                    </a>{" "}
                    và{" "}
                    <a
                      href="#privacy"
                      className="text-[#075985] font-semibold hover:underline"
                    >
                      Chính sách bảo mật
                    </a>{" "}
                    của TripOps.
                  </span>
                </label>
              </div>

              {/* Nút Submit Form */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#075985] hover:bg-[#0369a1] text-white font-bold text-sm rounded-xl shadow-md gap-2 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Tạo tài khoản {activeRoleConfig.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              <span>Đã có tài khoản TripOps? </span>
              <button
                type="button"
                onClick={onShowLogin || onBack}
                className="font-bold text-[#F97316] hover:underline cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                ← Quay về trang chủ TripOps
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL SUCCESS ONBOARDING */}
      {/* ========================================================================= */}
      {registeredRoleInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Đăng ký thành công
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Chào mừng bạn đến với TripOps!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tài khoản của bạn đã được kích hoạt với vai trò{" "}
                <strong className="text-slate-900">
                  {registeredRoleInfo.title}
                </strong>
                .
              </p>
            </div>

            {/* Box hướng dẫn quy trình xác minh profile */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs text-slate-700">
              <div className="font-bold flex items-center gap-1.5 text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#075985]" />
                <span>Quy trình kích hoạt tính năng:</span>
              </div>
              {registeredRoleInfo.id === "user" ? (
                <p className="text-slate-600 leading-relaxed">
                  Tài khoản của bạn đã sẵn sàng 100%. Bạn có thể đặt tour, thanh
                  toán hoặc yêu cầu tour thiết kế riêng ngay bây giờ!
                </p>
              ) : (
                <div className="space-y-1.5 text-slate-600">
                  <p>
                    1. Theo quy định nền tảng, để bảo vệ quyền lợi du khách và
                    các đối tác, tài khoản doanh nghiệp cần cung cấp thông tin
                    pháp nhân (Mã số thuế, Giấy phép GPKD/Lữ hành).
                  </p>
                  <p>
                    2. Bấm nút dưới đây để chuyển trực tiếp đến{" "}
                    <strong>Trang hoàn tất hồ sơ doanh nghiệp</strong> (không
                    hiển thị các menu quản lý cho đến khi được duyệt).
                  </p>
                </div>
              )}
            </div>

            {/* NÚT VÀO NỀN TẢNG / ONBOARDING */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={handleEnterDashboard}
                className="w-full h-11 bg-[#075985] hover:bg-[#0369a1] text-white font-bold text-sm rounded-xl shadow-md cursor-pointer gap-2"
              >
                {registeredRoleInfo.id === "user" ? (
                  <>
                    <span>Khám phá Tour & Dịch vụ ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Tiến hành nộp Hồ sơ Doanh nghiệp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
