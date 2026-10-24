import { useState } from "react";
import { User } from "@/app/types";
import { login } from "@/app/services/authService";
import { Compass, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

interface LoginScreenProps {
  onLogin: (user: User) => void;
  onBack?: () => void;
  onShowRegister?: () => void;
  onShowForgotPassword?: () => void;
}

export function LoginScreen({
  onLogin,
  onBack,
  onShowRegister,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      if (response.success && response.data) {
        onLogin(response.data.user);
      } else {
        setError(response.error || "Đăng nhập thất bại");
      }
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    {
      role: "Khách hàng cá nhân",
      name: "Tập đoàn FPT",
      email: "khachhang.fpt@gmail.com",
      badge: "User",
    },
    {
      role: "Doanh nghiệp lữ hành (Agency Chủ trì)",
      name: "Trần Quốc Bảo (Viettravel)",
      email: "viettravel.tour@gmail.com",
      badge: "Agency",
    },
    {
      role: "Doanh nghiệp lữ hành (Agency Đối tác)",
      name: "Vàng Mí Sùng (Hà Giang Discovery)",
      email: "hagiang.discovery@gmail.com",
      badge: "Agency",
    },
    {
      role: "Lữ hành chờ duyệt (Onboarding Profile)",
      name: "Phạm Trung Hiếu",
      email: "company3@demo.com",
      badge: "Chờ duyệt",
    },
    {
      role: "Nhà cung cấp dịch vụ (Provider)",
      name: "Heritage Resorts & Villas Đà Lạt",
      email: "provider.heritage@gmail.com",
      badge: "Provider",
    },
    {
      role: "Nhà cung cấp chờ duyệt (Onboarding Profile)",
      name: "Hoàng Minh Trí",
      email: "provider.pending@tripops.vn",
      badge: "Chờ duyệt",
    },
    {
      role: "Quản trị sàn TripOps",
      name: "Admin Platform",
      email: "admin.platform@gmail.com",
      badge: "Admin",
    },
    {
      role: "Hướng dẫn viên lữ hành",
      name: "Trần Thị Bích",
      email: "guide@demo.com",
      badge: "Guide",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A] font-sans antialiased py-28 px-4 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-[#075985] flex items-center justify-center text-white mx-auto shadow-sm">
            <Compass className="w-6 h-6 text-[#F97316]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-[#075985]">
            Chào mừng trở lại TripOps
          </h2>
          <p className="text-xs text-[#475569]">
            Đăng nhập để quản lý hành trình và trải nghiệm dịch vụ du lịch chọn lọc
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 border border-[#CBD5E1] shadow-[0_12px_40px_rgb(0,0,0,0.04)] space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#075985]">
                Email tài khoản
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#075985]">
                  Mật khẩu
                </label>
                <a href="#" className="text-xs text-[#F97316] hover:underline">
                  Quên mật khẩu?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu của bạn"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#075985]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-full bg-[#075985] text-white text-xs font-semibold tracking-wide hover:bg-[#F97316] disabled:opacity-40 transition-all duration-300 shadow-sm"
            >
              {isLoading ? "Đang xử lý đăng nhập..." : "Đăng nhập ngay"}
            </button>
          </form>

          {/* Demo Accounts List */}
          <div className="pt-4 border-t border-[#CBD5E1] space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#475569] block">
              Chọn nhanh tài khoản thử nghiệm (Mật khẩu: 1):
            </span>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {demoAccounts.map((acc, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("1");
                  }}
                  className="p-2.5 rounded-xl border border-[#CBD5E1] hover:border-[#075985] hover:bg-[#F0F9FF] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#075985]">{acc.name}</div>
                    <div className="text-[10px] text-[#475569]">{acc.email}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#075985] font-medium">
                    {acc.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-[#475569]">
              Chưa có tài khoản?{" "}
              <button
                onClick={onShowRegister}
                className="text-[#F97316] font-semibold hover:underline"
              >
                Đăng ký tài khoản mới
              </button>
            </p>
          </div>
        </div>

        {onBack && (
          <div className="text-center">
            <button
              onClick={onBack}
              className="text-xs text-[#475569] hover:text-[#075985] transition-colors"
            >
              ← Quay về trang chủ TripOps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
