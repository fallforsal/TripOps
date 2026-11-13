import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { ProfileBankAccountCard } from "@/app/components/user/ProfileBankAccountCard";
import { CustomerProfileCard } from "@/app/components/user/CustomerProfileCard";

export function UserProfile() {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (!currentPassword) {
      setPwMessage({ type: "error", text: "Vui lòng nhập mật khẩu hiện tại" });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Mật khẩu xác nhận không khớp" });
      return;
    }

    setPwMessage({ type: "success", text: "Đổi mật khẩu thành công!" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => setPwMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 font-sans">
      <PageHeader
        title="Thông tin tài khoản"
        subtitle="Quản lý hồ sơ khách hàng, thông tin doanh nghiệp và bảo mật tài khoản"
      />

      <CustomerProfileCard />

      <ProfileBankAccountCard />

      {/* Password Change Card */}
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
          <Lock className="w-4 h-4 text-[#075985]" />
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
            Đổi mật khẩu
          </h3>
        </div>

        {pwMessage && <NotificationMessage tone={pwMessage.type} message={pwMessage.text} />}

        <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-md text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-[#0F172A]">Mật khẩu hiện tại:</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[#0F172A]">Mật khẩu mới:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[#0F172A]">Xác nhận mật khẩu mới:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px] font-semibold"
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
