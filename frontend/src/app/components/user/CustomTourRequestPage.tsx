import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { CustomerPlanEditor } from "@/app/components/customer/CustomerPlanEditor";
import { useEffect, useRef, useState } from "react";
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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { VietnameseDatePicker } from "@/app/components/ui/VietnameseDatePicker";
import { AgencyDiscoveryPicker } from "@/app/components/common/AgencyDiscoveryPicker";
import { SearchableCombobox } from "@/app/components/common/SearchableCombobox";
import { getProvinceName, VIETNAM_PROVINCES } from "@/app/data/vietnamProvinces";

interface CustomTourRequestPageProps {
  sourceTour?: import("@/app/types").Tour;
  companies: TourCompany[];
  currentUser: User | null;
  onBack: () => void;
  onSubmit: (data: Omit<CustomTourRequest, "id" | "createdAt" | "status">) => Promise<void>;
  onShowLogin: () => void;
  onViewMyRequests?: () => void;
}

const TODAY = new Date().toISOString().split("T")[0];
const formatDateDisplay = (value: string) => value.split("-").reverse().join("/");

export function CustomTourRequestPage({
  companies,
  sourceTour,
  currentUser,
  onBack,
  onSubmit,
  onShowLogin,
  onViewMyRequests,
}: CustomTourRequestPageProps) {
  const [form, setForm] = useState({
    businessName: "",
    contactName: currentUser?.name ?? "",
    contactEmail: currentUser?.email ?? "",
    contactPhone: currentUser?.phone ?? "",
    destinations: sourceTour?.destination || "",
    departureProvinceCode: "",
    departurePoint: "",
    departureDate: TODAY,
    returnDate: TODAY,
    numberOfPeople: "",
    budgetPerPerson: "",
    hotelStars: "Khách sạn / Resort 4 sao",
    additionalInfo: "",
    targetCompanyId: sourceTour?.companyId || "",
  });

  const [initialChanges, setInitialChanges] = useState<CustomTourRequest["initialChanges"]>();
  const [editTemplate, setEditTemplate] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [chosenAgency, setChosenAgency] = useState<TourCompany | null>(null);
  const [hotelDropdownOpen, setHotelDropdownOpen] = useState(false);
  const hotelComboRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (hotelComboRef.current && !hotelComboRef.current.contains(e.target as Node)) {
        setHotelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);
  useEffect(() => {
    if (sourceTour?.companyId) { setForm((previous) => ({ ...previous, targetCompanyId: sourceTour.companyId! })); return; }
  }, [sourceTour?.companyId]);

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

  const selectedCompany = chosenAgency?.id === form.targetCompanyId ? chosenAgency : companies.find((c) => c.id === form.targetCompanyId);

  const handleSubmit = async (e: React.FormEvent) => {
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
      !form.departureProvinceCode ||
      !form.numberOfPeople.trim()
    ) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    if (!form.targetCompanyId || !selectedCompany) {
      setErrorMsg("Vui lòng chọn Agency nhận yêu cầu."); return;
    }
    if (form.returnDate < form.departureDate || form.departureDate < TODAY) {
      setErrorMsg("Ngày đi và ngày về không hợp lệ."); return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        initialChanges, sourceTourId: sourceTour?.id, userId: currentUser.id,
        businessName: form.businessName.trim() || undefined,
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        destinations: form.destinations.trim(),
        departureProvinceCode: form.departureProvinceCode,
        departurePoint: form.departurePoint.trim() || undefined,
        departureDate: form.departureDate,
        returnDate: form.returnDate,
        numberOfPeople: form.numberOfPeople.trim(),
        budgetPerPerson: form.budgetPerPerson.trim() || undefined,
        hotelStars: form.hotelStars || undefined,
        additionalInfo: form.additionalInfo.trim() || undefined,
        targetCompanyId: form.targetCompanyId,
        targetCompanyName: selectedCompany?.name ?? "",
      }); setSubmitted(true);
    }
    catch (error) { setErrorMsg(error instanceof Error ? error.message : "Không thể gửi yêu cầu."); }
    finally { setSubmitting(false); }
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
            <div className="flex justify-between gap-3">
              <span className="text-[#475569]">Khởi hành từ:</span>
              <strong className="text-right font-semibold">
                {getProvinceName(form.departureProvinceCode)}{form.departurePoint.trim() ? ` · ${form.departurePoint.trim()}` : ""}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#475569]">Số khách dự kiến:</span>
              <strong className="font-semibold">{form.numberOfPeople} người</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#475569]">Thời gian dự kiến:</span>
              <strong className="font-semibold">{formatDateDisplay(form.departureDate)} đến {formatDateDisplay(form.returnDate)}</strong>
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
    <div className="mx-auto max-w-7xl px-4 pb-16 font-sans sm:px-6 lg:px-8">
      <PageHeader
        title="Tạo yêu cầu thiết kế tour riêng"
        subtitle="Dành cho đoàn thể, doanh nghiệp cần lịch trình theo sở thích, ngân sách và thời gian tự chọn"
        onBack={onBack}
        backText="Quay lại"
      />

      {errorMsg && <NotificationMessage tone="error" message={errorMsg} />}

      {sourceTour && <section className="mb-6 rounded-xl border border-sky-200 bg-[#F0F9FF] p-5 space-y-3 text-sm">
        <h3 className="font-semibold text-[#0C4A6E]">Tùy chỉnh từ Tour: {sourceTour.name}</h3>
        <p className="text-slate-600">Tour gốc được giữ nguyên. Agency sẽ thiết kế và xác nhận lại theo đề xuất của bạn.</p>
        <Button type="button" variant="outline" onClick={() => setEditTemplate(true)}>Chỉnh sửa lịch trình mẫu</Button>
        {initialChanges && <p className="text-[#075985]">Đã lưu đề xuất: {initialChanges.message}</p>}
        {editTemplate && <CustomerPlanEditor requestId="" plan={initialChanges ? { ...sourceTour, ...initialChanges } : sourceTour} onSaveDraft={setInitialChanges} onCancel={() => setEditTemplate(false)} onDone={() => setEditTemplate(false)} />}
      </section>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* 1. Hành trình mong muốn */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <SectionTitle step={1} icon={<MapPin className="h-4 w-4" />} title="Hành trình mong muốn" />
            <label className="block space-y-1.5 text-xs font-semibold text-[#0F172A]">Điểm đến mong muốn <span className="text-[#B91C1C]">*</span>
              <input type="text" value={form.destinations} onChange={set("destinations")} placeholder="VD: Đà Lạt – Nha Trang, Hà Giang..." required className="h-10 w-full rounded-[6px] border border-[#CBD5E1] px-3 text-sm font-normal text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]" />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="departure-province" className="text-xs font-semibold text-[#0F172A]">
                  Khởi hành từ (tỉnh/thành) <span className="text-[#B91C1C]">*</span>
                </label>
                <SearchableCombobox
                  id="departure-province"
                  options={VIETNAM_PROVINCES.map((p) => ({ value: p.code, label: p.name }))}
                  value={form.departureProvinceCode}
                  onChange={(code) => setForm((p) => ({ ...p, departureProvinceCode: code }))}
                  placeholder="Chọn tỉnh/thành nơi đoàn xuất phát"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="departure-point" className="text-xs font-semibold text-[#0F172A]">
                  Điểm đón cụ thể
                </label>
                <input
                  id="departure-point"
                  type="text"
                  value={form.departurePoint}
                  onChange={set("departurePoint")}
                  maxLength={255}
                  placeholder="VD: Sân bay Tân Sơn Nhất, văn phòng công ty tại Quận 1..."
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Ngày khởi hành dự kiến
                </label>
                <VietnameseDatePicker
                  value={form.departureDate}
                  onChange={(d) =>
                    setForm((p) => ({
                      ...p,
                      departureDate: d,
                      returnDate: d && p.returnDate && p.returnDate < d ? d : p.returnDate,
                    }))
                  }
                  min={TODAY}
                  placeholder="dd/MM/yyyy"
                  className="h-10 text-sm bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Ngày kết thúc dự kiến
                </label>
                <VietnameseDatePicker
                  value={form.returnDate}
                  onChange={(d) => setForm((p) => ({ ...p, returnDate: d }))}
                  min={form.departureDate || TODAY}
                  placeholder="dd/MM/yyyy"
                  className="h-10 text-sm bg-white"
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
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
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
                    className="w-full h-9 pl-3 pr-12 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#475569] pointer-events-none">
                    VND
                  </span>
                </div>
              </div>

              <div className="space-y-1.5" ref={hotelComboRef}>
                <label className="text-xs font-semibold text-[#0F172A]">
                  Tiêu chuẩn khách sạn mong muốn
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.hotelStars}
                    onFocus={() => setHotelDropdownOpen(true)}
                    onChange={set("hotelStars")}
                    placeholder="Chọn gợi ý hoặc tự nhập (VD: Khách sạn 4 sao, Villa...)"
                    maxLength={100}
                    className="w-full h-9 pl-2.5 pr-8 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                  />
                  <button
                    type="button"
                    aria-label="Mở danh sách tiêu chuẩn khách sạn"
                    onClick={() => setHotelDropdownOpen((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {hotelDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#CBD5E1] rounded-[6px] shadow-lg py-1 max-h-48 overflow-y-auto">
                      {[
                        "Khách sạn 3 sao",
                        "Khách sạn / Resort 4 sao",
                        "Resort 5 sao cao cấp",
                        "Homestay / Trải nghiệm bản địa",
                      ].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, hotelStars: opt }));
                            setHotelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-sky-50 transition-colors ${form.hotelStars === opt
                            ? "bg-sky-50 font-semibold text-[#075985]"
                            : "text-[#0F172A]"
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                className="w-full p-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
              />
            </div>
          </section>

          {/* 2. Chọn Travel Agency */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <SectionTitle step={2} icon={<Building2 className="h-4 w-4" />} title="Chọn Travel Agency nhận yêu cầu" />
            {sourceTour && <p className="text-xs text-slate-500">Yêu cầu từ tour có sẵn sẽ gửi đến Agency tổ chức tour này.</p>}
            <AgencyDiscoveryPicker value={form.targetCompanyId} onSelect={agency => { setChosenAgency(agency); setForm(p => ({ ...p, targetCompanyId: agency.id })); }} destination={form.destinations} initialProvinceCodes={sourceTour?.provinceCodes} onlyAgencyId={sourceTour?.companyId} disabled={submitting} />
          </section>

          {/* 3. Người đại diện liên hệ */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <SectionTitle step={3} icon={<Users className="h-4 w-4" />} title="Đơn vị & người đại diện liên hệ" />
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">
                  Tên doanh nghiệp / Đoàn thể:
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={set("businessName")}
                  placeholder="VD: Tập đoàn FPT, Công ty ABC..."
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
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
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
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
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
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
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Tóm tắt & gửi */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-[#0F172A]">Tóm tắt yêu cầu</h3>
            <dl className="mt-3 divide-y divide-slate-100 text-sm">
              <SummaryRow label="Điểm đến" value={form.destinations.trim()} />
              <SummaryRow label="Khởi hành từ" value={form.departureProvinceCode ? getProvinceName(form.departureProvinceCode) : ""} />
              <SummaryRow label="Thời gian" value={form.departureDate ? `${formatDateDisplay(form.departureDate)} – ${formatDateDisplay(form.returnDate || form.departureDate)}` : ""} />
              <SummaryRow label="Số khách" value={form.numberOfPeople ? `${form.numberOfPeople} người` : ""} />
              <SummaryRow label="Ngân sách" value={displayBudget ? `${displayBudget} đ/người` : ""} />
              <SummaryRow label="Agency nhận" value={selectedCompany?.name ?? ""} />
            </dl>
            <div className="mt-4 space-y-2">
              <Button
                type="submit"
                disabled={submitting}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[6px] bg-[#075985] text-sm font-semibold text-white hover:bg-[#0C4A6E]"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? "Đang gửi..." : "Gửi yêu cầu thiết kế"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="h-10 w-full rounded-[6px] border-[#CBD5E1] text-sm text-[#0F172A] hover:bg-[#F8FAFC]"
              >
                Hủy bỏ
              </Button>
            </div>
          </div>

        </aside>
      </form>
    </div>
  );
}

function SectionTitle({ step, icon, title }: { step: number; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E0F2FE] text-xs font-bold text-[#075985]">{step}</span>
      <h2 className="flex items-center gap-2 text-base font-semibold text-[#0F172A]">
        <span className="text-[#075985]">{icon}</span>
        {title}
      </h2>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`text-right font-medium ${value ? "text-[#0F172A]" : "text-slate-400"}`}>{value || "Chưa nhập"}</dd>
    </div>
  );
}
