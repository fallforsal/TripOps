import { useState } from "react";
import { Tour, User, GuideSchedule } from "@/app/types";
import {
  Users,
  MapPin,
  Star,
  Package,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Globe,
  Compass,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";

interface AgencyGuideManagementProps {
  guides: User[];
  tours: Tour[];
  guideSchedules: GuideSchedule[];
  companyId?: string;
  companyName?: string;
  onAddGuide?: (guideData: Omit<User, "id">) => void;
  onUpdateGuide?: (guideId: string, update: Partial<User>) => void;
  onRemoveGuide?: (guideId: string) => void;
}

export function AgencyGuideManagement({
  guides,
  tours,
  guideSchedules,
  companyId = "company-1",
  companyName = "Viettravel",
  onAddGuide,
  onUpdateGuide,
  onRemoveGuide,
}: AgencyGuideManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "on_tour" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "domestic" | "international">("all");
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<User | null>(null);
  const [viewHistoryGuide, setViewHistoryGuide] = useState<User | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("123456");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [guideType, setGuideType] = useState<"domestic" | "international">("domestic");
  const [languagesInput, setLanguagesInput] = useState("Tiếng Việt, Tiếng Anh");
  const [specialtiesInput, setSpecialtiesInput] = useState("Văn hóa, Tour đoàn doanh nghiệp");
  const [experienceYears, setExperienceYears] = useState("3");

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("123456");
    setLicenseNumber("");
    setLicenseExpiryDate("");
    setGuideType("domestic");
    setLanguagesInput("Tiếng Việt, Tiếng Anh");
    setSpecialtiesInput("Văn hóa, Tour đoàn doanh nghiệp");
    setExperienceYears("3");
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (guide: User) => {
    setEditingGuide(guide);
    setName(guide.name);
    setEmail(guide.email);
    setPhone(guide.phone || "");
    setLicenseNumber(guide.licenseNumber || "");
    setLicenseExpiryDate(guide.licenseExpiryDate || "");
    setGuideType(guide.guideType || "domestic");
    setLanguagesInput(guide.languages?.join(", ") || "Tiếng Việt");
    setSpecialtiesInput(guide.specialties?.join(", ") || "");
    setExperienceYears(guide.experienceYears?.toString() || "3");
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const langs = languagesInput.split(",").map((s) => s.trim()).filter(Boolean);
    const specs = specialtiesInput.split(",").map((s) => s.trim()).filter(Boolean);

    onAddGuide?.({
      name,
      email,
      role: "guide",
      phone,
      companyId,
      companyName,
      licenseNumber: licenseNumber || `HDV-${guideType === "international" ? "QT" : "ND"}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      licenseExpiryDate: licenseExpiryDate || "2029-12-31",
      guideType,
      languages: langs.length > 0 ? langs : ["Tiếng Việt"],
      specialties: specs.length > 0 ? specs : ["Tour đoàn"],
      experienceYears: parseInt(experienceYears, 10) || 1,
      guideStatus: "active",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0284c7&color=fff`,
    });

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuide) return;

    const langs = languagesInput.split(",").map((s) => s.trim()).filter(Boolean);
    const specs = specialtiesInput.split(",").map((s) => s.trim()).filter(Boolean);

    onUpdateGuide?.(editingGuide.id, {
      name,
      phone,
      licenseNumber,
      licenseExpiryDate,
      guideType,
      languages: langs,
      specialties: specs,
      experienceYears: parseInt(experienceYears, 10) || 1,
    });

    setEditingGuide(null);
  };

  const getGuideSchedules = (guideId: string) =>
    guideSchedules.filter((s) => s.booking.guideId === guideId);

  // Compute metrics
  const totalGuides = guides.length;
  const onTourCount = guides.filter((g) => {
    const schedules = getGuideSchedules(g.id);
    return schedules.some((s) => ["pending", "confirmed"].includes(s.booking.status));
  }).length;
  const activeAvailableCount = guides.filter((g) => {
    const schedules = getGuideSchedules(g.id);
    const hasTour = schedules.some((s) => ["pending", "confirmed"].includes(s.booking.status));
    return !hasTour && g.guideStatus !== "inactive";
  }).length;
  const internationalCount = guides.filter((g) => g.guideType === "international").length;

  // Filtered guides
  const filteredGuides = guides.filter((guide) => {
    const matchesSearch =
      guide.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (guide.phone && guide.phone.includes(searchQuery)) ||
      (guide.licenseNumber && guide.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const schedules = getGuideSchedules(guide.id);
    const isOnTour = schedules.some((s) => ["pending", "confirmed"].includes(s.booking.status));
    const isInactive = guide.guideStatus === "inactive";

    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = !isOnTour && !isInactive;
    else if (statusFilter === "on_tour") matchesStatus = isOnTour;
    else if (statusFilter === "inactive") matchesStatus = isInactive;

    let matchesType = true;
    if (typeFilter !== "all") {
      matchesType = guide.guideType === typeFilter;
    }

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#075985]" />
            Đội ngũ Hướng dẫn viên nội bộ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý thông tin, thẻ hành nghề và phân bổ nhân sự dẫn tour cho {companyName}
          </p>
        </div>
        <Button
          onClick={handleOpenAddModal}
          className="bg-[#075985] hover:bg-[#F97316] text-white font-medium px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm Hướng dẫn viên
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F0F9FF] text-[#075985] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng HDV công ty</p>
            <p className="text-xl font-bold text-gray-900">{totalGuides}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang sẵn sàng / Rảnh</p>
            <p className="text-xl font-bold text-emerald-600">{activeAvailableCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang dẫn đoàn</p>
            <p className="text-xl font-bold text-amber-600">{onTourCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Thẻ Quốc tế</p>
            <p className="text-xl font-bold text-indigo-600">{internationalCount} HDV</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT hoặc số thẻ HDV..."
            className="pl-9 bg-gray-50/50 border-gray-200 rounded-lg text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 border border-gray-200 p-1 rounded-lg bg-gray-50 text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "all" ? "bg-white text-gray-900 shadow-2xs font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "active" ? "bg-white text-emerald-700 shadow-2xs font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Sẵn sàng
            </button>
            <button
              onClick={() => setStatusFilter("on_tour")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "on_tour" ? "bg-white text-amber-700 shadow-2xs font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Đang dẫn tour
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === "inactive" ? "bg-white text-red-700 shadow-2xs font-semibold" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Tạm ngưng
            </button>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-gray-700 focus:outline-hidden"
          >
            <option value="all">Tất cả loại thẻ</option>
            <option value="international">Thẻ Quốc tế</option>
            <option value="domestic">Thẻ Nội địa</option>
          </select>
        </div>
      </div>

      {/* Guide Cards Grid */}
      {filteredGuides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Không tìm thấy hướng dẫn viên nào phù hợp</p>
          <p className="text-gray-400 text-xs mt-1">
            Thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Thêm Hướng dẫn viên&quot; để tạo hồ sơ mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGuides.map((guide) => {
            const schedules = getGuideSchedules(guide.id);
            const activeSchedules = schedules.filter((s) =>
              ["pending", "confirmed"].includes(s.booking.status)
            );
            const isOnTour = activeSchedules.length > 0;
            const isInactive = guide.guideStatus === "inactive";

            return (
              <div
                key={guide.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-5">
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          guide.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(guide.name)}&background=3b82f6&color=fff`
                        }
                        alt={guide.name}
                        className="w-13 h-13 rounded-full object-cover border-2 border-white shadow-xs"
                      />
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">
                          {guide.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-blue-500" />
                          {guide.guideType === "international" ? "Thẻ Quốc tế" : "Thẻ Nội địa"} • {guide.experienceYears || 3} năm KN
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                        isInactive
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : isOnTour
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isInactive ? "Tạm ngưng" : isOnTour ? "Đang dẫn đoàn" : "Sẵn sàng"}
                    </span>
                  </div>

                  {/* Credentials Box */}
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-1.5 text-xs text-gray-600 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Số thẻ hành nghề:</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {guide.licenseNumber || "Chưa cập nhật"}
                      </span>
                    </div>
                    {guide.licenseExpiryDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Hạn thẻ:</span>
                        <span className="text-gray-700">
                          {guide.licenseExpiryDate}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Điện thoại:</span>
                      <span className="font-medium text-gray-900">{guide.phone || "Chưa có"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Email tài khoản:</span>
                      <span className="text-gray-900 truncate max-w-[160px]">{guide.email}</span>
                    </div>
                  </div>

                  {/* Languages & Specialties */}
                  <div className="space-y-2">
                    {guide.languages && guide.languages.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <Globe className="w-3.5 h-3.5 text-gray-400 mr-1" />
                        {guide.languages.map((lang, idx) => (
                          <span
                            key={idx}
                            className="bg-[#F0F9FF] text-[#075985] text-[11px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}

                    {guide.specialties && guide.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <Compass className="w-3.5 h-3.5 text-gray-400 mr-1" />
                        {guide.specialties.map((spec, idx) => (
                          <span
                            key={idx}
                            className="bg-[#F0F9FF] text-[#EA580C] text-[11px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setViewHistoryGuide(guide)}
                    className="text-[#075985] hover:text-[#075985] font-medium flex items-center gap-1"
                  >
                    <Package className="w-3.5 h-3.5" />
                    {schedules.length} tour đã giao
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(guide)}
                      className="p-1.5 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
                      title="Chỉnh sửa thông tin"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={() => {
                        const newStatus = guide.guideStatus === "inactive" ? "active" : "inactive";
                        onUpdateGuide?.(guide.id, { guideStatus: newStatus });
                      }}
                      className={`p-1.5 rounded-md transition-colors ${
                        isInactive ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"
                      }`}
                      title={isInactive ? "Kích hoạt lại" : "Tạm ngưng hoạt động"}
                    >
                      {isInactive ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setConfirmDeleteId(guide.id)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                      title="Xóa / Hủy liên kết"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Thêm Hướng Dẫn Viên Mới */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#075985]" />
              Thêm Hướng dẫn viên mới
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Cấp tài khoản đăng nhập và ghi nhận thông tin thẻ hành nghề cho HDV nội bộ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Họ và tên HDV *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn Hùng"
                className="mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Email đăng nhập *</Label>
                <Input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hdv.hung@gmail.com"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Số điện thoại</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Loại thẻ HDV</Label>
                <select
                  value={guideType}
                  onChange={(e) => setGuideType(e.target.value as any)}
                  className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white"
                >
                  <option value="domestic">Thẻ Nội địa</option>
                  <option value="international">Thẻ Quốc tế</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Số thẻ hành nghề</Label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="VD: HDV-QT-2024-102"
                  className="mt-1 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Hạn thẻ hành nghề</Label>
                <Input
                  type="date"
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-700">Số năm kinh nghiệm</Label>
                <Input
                  type="number"
                  min="0"
                  max="40"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Ngoại ngữ (ngăn cách bằng dấu phẩy)</Label>
              <Input
                value={languagesInput}
                onChange={(e) => setLanguagesInput(e.target.value)}
                placeholder="Tiếng Việt, Tiếng Anh, Tiếng Hàn..."
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-700">Tuyến & Kỹ năng sở trường</Label>
              <Input
                value={specialtiesInput}
                onChange={(e) => setSpecialtiesInput(e.target.value)}
                placeholder="Văn hóa - Lịch sử, Trekking leo núi, Hoạt náo..."
                className="mt-1 text-sm"
              />
            </div>

            <div className="bg-[#F0F9FF] p-3 rounded-lg border border-blue-100 text-xs text-[#075985]">
              <span className="font-semibold">Mật khẩu mặc định:</span> <code>123456</code>. Hướng dẫn viên có thể dùng email này để đăng nhập vào Ứng dụng Di động chuyên dụng.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" className="bg-[#075985] hover:bg-[#F97316] text-white">
                Lưu HDV
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Chỉnh Sửa Thông Tin HDV */}
      <Dialog open={!!editingGuide} onOpenChange={(open) => !open && setEditingGuide(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              Cập nhật thông tin Hướng dẫn viên
            </DialogTitle>
          </DialogHeader>

          {editingGuide && (
            <form onSubmit={handleSubmitEdit} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Họ và tên</Label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Số điện thoại</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Loại thẻ</Label>
                  <select
                    value={guideType}
                    onChange={(e) => setGuideType(e.target.value as any)}
                    className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white"
                  >
                    <option value="domestic">Thẻ Nội địa</option>
                    <option value="international">Thẻ Quốc tế</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Số thẻ hành nghề</Label>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Hạn thẻ</Label>
                  <Input
                    type="date"
                    value={licenseExpiryDate}
                    onChange={(e) => setLicenseExpiryDate(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Ngoại ngữ</Label>
                <Input
                  value={languagesInput}
                  onChange={(e) => setLanguagesInput(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Kỹ năng & Tuyến sở trường</Label>
                <Input
                  value={specialtiesInput}
                  onChange={(e) => setSpecialtiesInput(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingGuide(null)}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-[#075985] hover:bg-[#F97316] text-white">
                  Cập nhật
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Xem Lịch Sử Tour Của HDV */}
      <Dialog open={!!viewHistoryGuide} onOpenChange={(open) => !open && setViewHistoryGuide(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#075985]" />
              Lịch sử dẫn tour: {viewHistoryGuide?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Danh sách các tour đã và đang được phân công cho hướng dẫn viên này
            </DialogDescription>
          </DialogHeader>

          {viewHistoryGuide && (
            <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {getGuideSchedules(viewHistoryGuide.id).length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm bg-gray-50 rounded-xl">
                  Chưa có tour nào được gán cho HDV này.
                </div>
              ) : (
                getGuideSchedules(viewHistoryGuide.id).map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {schedule.booking.tour.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Khởi hành: <strong>{schedule.booking.tourStartDate}</strong> • Đoàn: {schedule.booking.numberOfGuests} khách ({schedule.booking.userName})
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        schedule.booking.status === "completed"
                          ? "bg-[#E0F2FE] text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {schedule.booking.status === "completed" ? "Đã xong" : "Đang chạy"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Delete Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Xác nhận xóa Hướng dẫn viên
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 mt-2">
              Bạn có chắc chắn muốn hủy liên kết và xóa hướng dẫn viên này khỏi công ty? Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (confirmDeleteId) {
                  onRemoveGuide?.(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
            >
              Xác nhận xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
