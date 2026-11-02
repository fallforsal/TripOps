import { useState, useEffect } from "react";
import {
  Building2,
  Mail,
  Phone,
  FileText,
  MapPin,
  Save,
  CheckCircle2,
  ShieldCheck,
  User as UserIcon,
  Globe,
} from "lucide-react";
import { User } from "@/app/types";
import { Button } from "@/app/components/ui/button";

interface ProviderProfilePageProps {
  currentUser: User;
  onUpdateProfile?: (updatedUser: Partial<User>) => void;
}

export function ProviderProfilePage({
  currentUser,
  onUpdateProfile,
}: ProviderProfilePageProps) {
  const [businessName, setBusinessName] = useState(
    currentUser.businessName || "Tổ hợp Dịch vụ Du lịch Heritage"
  );
  const [contactName, setContactName] = useState(currentUser.name || "");
  const [email, setEmail] = useState(
    currentUser.businessEmail || currentUser.email || ""
  );
  const [phone, setPhone] = useState(
    currentUser.businessPhone || currentUser.phone || "0263 3825 444"
  );
  const [taxCode, setTaxCode] = useState(currentUser.taxCode || "0123456789");
  const [street, setStreet] = useState(
    currentUser.street || currentUser.businessAddress || "450 - 451 Đ. Lê Văn Việt, Tăng Nhơn Phú, Hồ Chí Minh"
  );
  const [description, setDescription] = useState(
    currentUser.businessDescription ||
      "Đơn vị chuyên cung cấp dịch vụ lưu trú cao cấp, ẩm thực bản địa và các tour trải nghiệm thiên nhiên uy tín tại Đà Lạt và khu vực Tây Nguyên."
  );

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedData: Partial<User> = {
      businessName,
      name: contactName,
      businessEmail: email,
      email,
      businessPhone: phone,
      phone,
      taxCode,
      street,
      businessAddress: street,
      businessDescription: description,
    };

    if (onUpdateProfile) {
      onUpdateProfile(updatedData);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#075985]" />
            Hồ sơ Doanh nghiệp & Nhà cung cấp
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Cập nhật thông tin pháp lý, mã số thuế, địa chỉ trụ sở và giới thiệu doanh nghiệp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Tài khoản đã xác thực
          </span>
        </div>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Đã lưu và cập nhật thông tin hồ sơ doanh nghiệp thành công!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Legal and Business Information */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-[#075985] flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building2 className="w-4 h-4 text-[#075985]" />
            1. Thông tin định danh & Pháp lý
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tên Doanh nghiệp / Tổ chức cung ứng *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Người đại diện pháp luật / Liên hệ *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Mã số thuế doanh nghiệp (MST) *
              </label>
              <input
                type="text"
                required
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email liên hệ kinh doanh *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Số điện thoại đường dây nóng *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Số nhà, Tên đường / Tòa nhà (Địa chỉ trụ sở) *
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Ví dụ: 450 - 451 Đ. Lê Văn Việt, Tăng Nhơn Phú, Hồ Chí Minh, Việt Nam"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Giới thiệu năng lực doanh nghiệp & dịch vụ
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Save button footer */}
        <div className="flex justify-end bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <Button
            type="submit"
            className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold rounded-xl text-sm px-8 py-2.5 h-auto shadow-md"
          >
            <Save className="w-4 h-4 mr-2" />
            Lưu thay đổi hồ sơ
          </Button>
        </div>
      </form>
    </div>
  );
}
