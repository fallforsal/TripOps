import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useState } from "react";
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { ProfileBankAccountCard } from "@/app/components/user/ProfileBankAccountCard";

interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  companyName: string;
  address: string;
  city: string;
}

const defaultProfile: UserProfileData = {
  name: "Tập đoàn FPT",
  email: "khachhang.fpt@gmail.com",
  phone: "0933 888 999",
  dateOfBirth: "1988-09-13",
  gender: "Khác",
  companyName: "Công ty Cổ phần FPT",
  address: "Tòa nhà FPT, Phố Duy Tân, Cầu Giấy",
  city: "Hà Nội",
};

export function UserProfile() {
  const [profile, setProfile] = useState<UserProfileData>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>(defaultProfile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(formData);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

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

      {saveSuccess && <NotificationMessage tone="success" message="Cập nhật thông tin cá nhân thành công!" />}

      {/* Main Profile Info Card */}
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[6px] bg-[#075985] text-white flex items-center justify-center text-2xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{profile.name}</h2>
              <p className="text-xs text-[#475569]">{profile.email}</p>
              <span className="inline-block mt-1 text-[11px] font-semibold text-[#075985] bg-[#F0F9FF] border border-[#BAE6FD] px-2 py-0.5 rounded-[4px]">
                Khách hàng doanh nghiệp (B2B)
              </span>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <Button
                type="button"
                onClick={() => {
                  setFormData(profile);
                  setIsEditing(true);
                }}
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px]"
              >
                Chỉnh sửa thông tin
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="border-[#CBD5E1] text-[#0F172A] text-xs h-9 px-4 rounded-[6px]"
              >
                Hủy thay đổi
              </Button>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">Họ và tên / Tên đại diện:</label>
              <input
                type="text"
                disabled={!isEditing}
                value={isEditing ? formData.name : profile.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 bg-white disabled:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">Tên cơ quan / Doanh nghiệp:</label>
              <input
                type="text"
                disabled={!isEditing}
                value={isEditing ? formData.companyName : profile.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full h-9 px-3 bg-white disabled:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">Email:</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full h-9 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#64748B] cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">Số điện thoại liên hệ:</label>
              <input
                type="text"
                disabled={!isEditing}
                value={isEditing ? formData.phone : profile.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-9 px-3 bg-white disabled:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">Địa chỉ:</label>
              <input
                type="text"
                disabled={!isEditing}
                value={isEditing ? formData.address : profile.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full h-9 px-3 bg-white disabled:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#0F172A]">Tỉnh / Thành phố:</label>
              <input
                type="text"
                disabled={!isEditing}
                value={isEditing ? formData.city : profile.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full h-9 px-3 bg-white disabled:bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end pt-3 border-t border-[#F1F5F9]">
              <Button
                type="submit"
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-5 rounded-[6px] font-semibold"
              >
                Lưu thay đổi
              </Button>
            </div>
          )}
        </form>
      </div>

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
