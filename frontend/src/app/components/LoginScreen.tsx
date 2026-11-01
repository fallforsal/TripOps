import { useState } from "react";
import { User } from "@/app/types";
import { login } from "@/app/services/authService";
import { Compass, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Info, CheckCircle2 } from "lucide-react";
import { TRIPOPS_LOGO } from "@/app/constants/logo";
import { Button } from "@/app/components/ui/button";

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

  // Forgot password view state
  const [isForgotPw, setIsForgotPw] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      if (response.success && response.data) {
        onLogin(response.data.user);
      } else {
        setError(response.error || "Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.");
      }
    } catch (err) {
      setError("Có lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setError('Khôi phục mật khẩu chưa được cấu hình.');
  };

  const demoAccounts = [
    {
      role: "Khách hàng cá nhân / Đoàn B2B",
      name: "Tập đoàn FPT",
      email: "customer@tripops.test",
      badge: "Customer",
    },
    {
      role: "Doanh nghiệp lữ hành (Agency)",
      name: "Viettravel",
      email: "agency@tripops.test",
      badge: "Agency",
    },
    {
      role: "Nhà cung cấp (Provider)",
      name: "Heritage Resorts Đà Lạt",
      email: "provider@tripops.test",
      badge: "Provider",
    },
    {
      role: "Hướng dẫn viên (Guide)",
      name: "Trần Thị Bích",
      email: "guide@tripops.test",
      badge: "Guide",
    },
    {
      role: "Quản trị viên sàn (Admin)",
      name: "Admin Platform",
      email: "admin@tripops.test",
      badge: "Admin",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans py-16 px-4 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center py-1">
            <img
              src={TRIPOPS_LOGO}
              alt="TripOps Logo"
              className="h-10 w-auto object-contain mx-auto"
            />
          </div>
          <p className="text-xs text-[#475569]">
            {isForgotPw
              ? "Khôi phục mật khẩu tài khoản"
              : "Đăng nhập nền tảng quản lý & đặt tour du lịch"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          {isForgotPw ? (
            <div className="space-y-4">
              {forgotSuccess ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] flex items-center justify-center mx-auto text-[#15803D]">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Yêu cầu đã được ghi nhận (Mô phỏng)
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Trong môi trường thử nghiệm, mật khẩu tạm thời cho email <strong>{forgotEmail}</strong> đã được thiết lập mặc định là <code>demo123</code>.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setEmail(forgotEmail);
                      setPassword("demo123");
                      setIsForgotPw(false);
                      setForgotSuccess(false);
                    }}
                    className="w-full bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 rounded-[6px]"
                  >
                    Quay lại đăng nhập với thông tin này
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                  <p className="text-xs text-[#475569] leading-relaxed">
                    Nhập địa chỉ email đã đăng ký. Hệ thống sẽ hướng dẫn đặt lại mật khẩu cho bạn.
                  </p>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-[#0F172A]">Email tài khoản:</label>
                    <input
                      type="email"
                      required
                      placeholder="your.email@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotPw(false)}
                      className="text-xs text-[#475569] hover:text-[#0F172A] flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại</span>
                    </button>

                    <Button
                      type="submit"
                      className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-semibold"
                    >
                      Gửi yêu cầu
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-[4px] text-xs text-[#B91C1C]">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-semibold text-[#0F172A]">Email đăng nhập:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[#0F172A]">Mật khẩu:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPw(true);
                      setForgotEmail(email);
                    }}
                    className="text-[11px] text-[#075985] hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-9 pl-9 pr-9 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs font-semibold rounded-[6px]"
              >
                {isLoading ? "Đang xử lý..." : "Đăng nhập"}
              </Button>

              {onShowRegister && (
                <div className="text-center pt-2 text-xs text-[#475569]">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={onShowRegister}
                    className="text-[#075985] font-semibold hover:underline"
                  >
                    Đăng ký ngay
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Quick Demo Accounts Selection */}
          <div className="pt-4 border-t border-[#F1F5F9] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#475569]">
              <Info className="w-3.5 h-3.5 text-[#075985]" />
              <span>Tài khoản kiểm thử — mật khẩu: <code className="text-[#075985] font-mono font-bold">TripOps@123</code></span>
            </div>

            <div className="space-y-1.5">
              {demoAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("TripOps@123");
                  }}
                  className="w-full text-left px-2.5 py-1.5 bg-[#F8FAFC] hover:bg-[#F0F9FF] border border-[#CBD5E1] rounded-[4px] transition-colors flex items-center justify-between text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold text-[#0F172A] block leading-tight truncate">
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-[#475569] leading-tight block">
                      {acc.email}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#075985] shrink-0 font-medium">
                    {acc.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Back to Home Button */}
        {onBack && (
          <div className="text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-[#475569] hover:text-[#0F172A] inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Về trang chủ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
