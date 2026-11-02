import { useState } from "react";
import { CustomTourRequest, TourCompany, User } from "@/app/types";
import {
  Send,
  Building2,
  MapPin,
  Users,
  Wallet,
  Star,
  FileText,
  Clock,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { VietnameseDatePicker } from "@/app/components/ui/VietnameseDatePicker";

interface CustomTourRequestPageProps {
  companies: TourCompany[];
  currentUser: User | null;
  onBack: () => void;
  onSubmit: (data: Omit<CustomTourRequest, "id" | "createdAt" | "status">) => void;
  onShowLogin: () => void;
  onViewMyRequests?: () => void;
}

const TODAY = new Date().toISOString().split("T")[0];

export function CustomTourRequestPage({
  companies,
  currentUser,
  onBack,
  onSubmit,
  onShowLogin,
  onViewMyRequests,
}: CustomTourRequestPageProps) {
  const [form, setForm] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    contactName: currentUser?.name ?? "",
    contactEmail: currentUser?.email ?? "",
    contactPhone: currentUser?.phone ?? "",
    destinations: "",
    departureDate: TODAY,
    returnDate: TODAY,
    numberOfPeople: "",
    budgetPerPerson: "",
    hotelStars: "4",
    additionalInfo: "",
    targetCompanyId: companies[0]?.id ?? "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-format currency VND helper
  const formatCurrencyVND = (digits: string): string => {
    if (!digits) return "";
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const [displayBudget, setDisplayBudget] = useState(() =>
    form.budgetPerPerson ? formatCurrencyVND(form.budgetPerPerson) : ""
  );

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawVal = input.value;
    const cursorPos = input.selectionStart ?? rawVal.length;

    // Count how many numeric digits were before the cursor
    const digitsBeforeCursor = rawVal.slice(0, cursorPos).replace(/\D/g, "").length;

    // Extract only digits (prevent negative, decimals, letters)
    const cleanDigits = rawVal.replace(/\D/g, "");

    // Format for display with dot separators (e.g. 5.000.000)
    const formatted = formatCurrencyVND(cleanDigits);

    // Update raw payload & display state
    setForm((prev) => ({ ...prev, budgetPerPerson: cleanDigits }));
    setDisplayBudget(formatted);

    // Preserve cursor position relative to the digits
    requestAnimationFrame(() => {
      let newPos = 0;
      let countedDigits = 0;
      while (newPos < formatted.length && countedDigits < digitsBeforeCursor) {
        if (/\d/.test(formatted[newPos])) {
          countedDigits++;
        }
        newPos++;
      }
      input.setSelectionRange(newPos, newPos);
    });
  };

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const selectedCompany = companies.find((c) => c.id === form.targetCompanyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentUser) {
      onShowLogin();
      return;
    }

    if (
      !form.contactName.trim() ||
      !form.contactEmail.trim() ||
      !form.contactPhone.trim() ||
      !form.destinations.trim() ||
      !form.numberOfPeople.trim()
    ) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    onSubmit({
      userId: currentUser.id,
      businessName: form.businessName.trim() || undefined,
      businessEmail: form.businessEmail.trim() || undefined,
      businessPhone: form.businessPhone.trim() || undefined,
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      destinations: form.destinations.trim(),
      departureDate: form.departureDate,
      returnDate: form.returnDate,
      numberOfPeople: form.numberOfPeople.trim(),
      budgetPerPerson: form.budgetPerPerson.trim() || undefined,
      hotelStars: form.hotelStars || undefined,
      additionalInfo: form.additionalInfo.trim() || undefined,
      targetCompanyId: form.targetCompanyId,
      targetCompanyName: selectedCompany?.name ?? "",
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6 font-sans">
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[6px] flex items-center justify-center mx-auto text-[#15803D]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#0F172A]">
              Gửi yêu cầu thiết kế tour thành công!
            </h2>
            <p className="text-sm text-[#475569] leading-relaxed max-w-lg mx-auto">
              Yêu cầu của bạn đã được chuyển tới Travel Agency{" "}
              <strong>{selectedCompany?.name}</strong>. Công ty sẽ liên hệ với các đơn vị dịch vụ địa phương để xây dựng lịch trình và gửi báo giá cho bạn.
            </p>
          </div>

          <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] max-w-md mx-auto text-left space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#475569]">Điểm đến mong muốn:</span>
              <strong className="font-semibold">{form.destinations}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#475569]">Số khách dự kiến:</span>
              <strong className="font-semibold">{form.numberOfPeople} người</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#475569]">Thời gian dự kiến:</span>
              <strong className="font-semibold">{form.departureDate} đến {form.returnDate}</strong>
            </div>
            {form.budgetPerPerson ? (
              <div className="flex justify-between">
                <span className="text-[#475569]">Ngân sách dự kiến:</span>
                <strong className="font-semibold">{formatCurrencyVND(form.budgetPerPerson)} VND / người</strong>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-[#CBD5E1] pt-1.5">
              <span className="text-[#475569]">Trạng thái:</span>
              <span className="text-[#B45309] font-bold">Chờ Agency thẩm định & báo giá</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            {onViewMyRequests ? (
              <Button
                type="button"
                onClick={onViewMyRequests}
                className="bg-[#075985] hover:bg-[#0C4A6E] text-white rounded-[6px] text-xs font-semibold px-4 py-2"
              >
                Xem danh sách yêu cầu của tôi
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC] rounded-[6px] text-xs font-semibold px-4 py-2"
            >
              Về trang chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 font-sans">
      <PageHeader
        title="Tạo yêu cầu thiết kế tour riêng"
        subtitle="Dành cho đoàn thể, doanh nghiệp cần lịch trình theo sở thích, ngân sách và thời gian tự chọn"
        onBack={onBack}
        backText="Quay lại"
      />

      {errorMsg && (
        <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-[6px] text-xs text-[#B91C1C]">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Chọn Agency */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Building2 className="w-4 h-4 text-[#075985]" />
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
              1. Chọn đơn vị lữ hành nhận yêu cầu (Travel Agency)
            </h2>
          </div>

          <p className="text-xs text-[#475569]">
            Chọn công ty du lịch uy tín trong hệ thống TripOps để thẩm định và thiết kế tour cho đoàn của bạn:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c) => {
              const isSelected = form.targetCompanyId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, targetCompanyId: c.id }))}
                  className={`text-left p-3.5 rounded-[6px] border transition-colors ${
                    isSelected
                      ? "border-[#075985] bg-[#F0F9FF]"
                      : "border-[#CBD5E1] bg-white hover:border-[#075985]"
                  }`}
                >
                  <p className="font-semibold text-xs text-[#0F172A]">{c.name}</p>
                  <p className="text-[11px] text-[#475569] mt-1 line-clamp-2">
                    {c.address}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Thông tin đoàn & Liên hệ */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Users className="w-4 h-4 text-[#075985]" />
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
              2. Thông tin đơn vị & Người đại diện liên hệ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Tên doanh nghiệp / Đoàn thể:
              </label>
              <input
                type="text"
                value={form.businessName}
                onChange={set("businessName")}
                placeholder="VD: Tập đoàn FPT, Công ty ABC..."
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Email công ty / đoàn:
              </label>
              <input
                type="email"
                value={form.businessEmail}
                onChange={set("businessEmail")}
                placeholder="contact@company.vn"
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Điện thoại cơ quan:
              </label>
              <input
                type="text"
                value={form.businessPhone}
                onChange={set("businessPhone")}
                placeholder="VD: (028) 7300 8888"
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F1F5F9]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Người đại diện liên hệ <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                value={form.contactName}
                onChange={set("contactName")}
                placeholder="Họ và tên người phụ trách"
                required
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Email người liên hệ <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={set("contactEmail")}
                placeholder="email@example.com"
                required
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Số điện thoại di động <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={set("contactPhone")}
                placeholder="VD: 0912 345 678"
                required
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Yêu cầu về lịch trình & Dịch vụ */}
        <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <MapPin className="w-4 h-4 text-[#075985]" />
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">
              3. Thông số lịch trình & Nhu cầu dịch vụ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Điểm đến mong muốn <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="text"
                value={form.destinations}
                onChange={set("destinations")}
                placeholder="VD: Đà Lạt – Nha Trang, Hà Giang..."
                required
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Ngày khởi hành dự kiến
              </label>
              <VietnameseDatePicker
                value={form.departureDate}
                onChange={(d) => setForm((p) => ({ ...p, departureDate: d }))}
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Ngày kết thúc dự kiến
              </label>
              <VietnameseDatePicker
                value={form.returnDate}
                onChange={(d) => setForm((p) => ({ ...p, returnDate: d }))}
                className="h-9 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#F1F5F9]">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Số lượng khách dự kiến <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={form.numberOfPeople}
                onChange={set("numberOfPeople")}
                placeholder="VD: 25"
                required
                className="w-full h-9 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Ngân sách dự kiến (VNĐ / một người)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayBudget}
                  onChange={handleBudgetChange}
                  placeholder="VD: 5.000.000"
                  className="w-full h-9 pl-3 pr-12 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#475569] pointer-events-none">
                  VND
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                Tiêu chuẩn khách sạn mong muốn
              </label>
              <select
                value={form.hotelStars}
                onChange={set("hotelStars")}
                className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              >
                <option value="3">Khách sạn 3 sao</option>
                <option value="4">Khách sạn / Resort 4 sao</option>
                <option value="5">Resort 5 sao cao cấp</option>
                <option value="homestay">Homestay / Trải nghiệm bản địa</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
            <label className="text-xs font-semibold text-[#0F172A]">
              Sở thích ẩm thực, hoạt động đặc thù hoặc lưu ý riêng của đoàn:
            </label>
            <textarea
              rows={3}
              value={form.additionalInfo}
              onChange={set("additionalInfo")}
              placeholder="VD: Đoàn có nhiều người lớn tuổi cần nghỉ ngơi, muốn tổ chức Gala Dinner đêm thứ 2, có 3 người ăn chay..."
              className="w-full p-3 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            />
          </div>
        </div>

        {/* Notice & Submit Action */}
        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5 max-w-xl">
            <Info className="w-4 h-4 text-[#0369A1] mt-0.5 shrink-0" />
            <p className="text-xs text-[#475569] leading-relaxed">
              <strong>Lưu ý:</strong> Sau khi gửi, Travel Agency sẽ thẩm định năng lực phòng và xe để gửi lại bản thảo lịch trình kèm báo giá chính thức. Yêu cầu này chưa phát sinh chi phí hoặc hợp đồng thanh toán.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-[#CBD5E1] text-[#0F172A] hover:bg-white text-xs h-9 px-4 rounded-[6px]"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-5 rounded-[6px] font-semibold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi yêu cầu thiết kế</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
