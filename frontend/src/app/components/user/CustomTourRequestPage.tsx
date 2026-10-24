import { useState } from "react";
import { CustomTourRequest, TourCompany, User } from "@/app/types";
import { ArrowLeft, Send, Building2, MapPin, Users, Wallet, Star, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface CustomTourRequestPageProps {
  companies: TourCompany[];
  currentUser: User | null;
  onBack: () => void;
  onSubmit: (data: Omit<CustomTourRequest, "id" | "createdAt" | "status">) => void;
  onShowLogin: () => void;
}

const TODAY = new Date().toISOString().split("T")[0];

export function CustomTourRequestPage({
  companies,
  currentUser,
  onBack,
  onSubmit,
  onShowLogin,
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
    hotelStars: "",
    additionalInfo: "",
    targetCompanyId: companies[0]?.id ?? "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const selectedCompany = companies.find((c) => c.id === form.targetCompanyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) { onShowLogin(); return; }
    if (!form.contactName || !form.contactEmail || !form.contactPhone || !form.destinations) return;
    onSubmit({
      userId: currentUser.id,
      businessName: form.businessName || undefined,
      businessEmail: form.businessEmail || undefined,
      businessPhone: form.businessPhone || undefined,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      destinations: form.destinations,
      departureDate: form.departureDate,
      returnDate: form.returnDate,
      numberOfPeople: form.numberOfPeople,
      budgetPerPerson: form.budgetPerPerson || undefined,
      hotelStars: form.hotelStars || undefined,
      additionalInfo: form.additionalInfo || undefined,
      targetCompanyId: form.targetCompanyId,
      targetCompanyName: selectedCompany?.name ?? "",
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Send className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Gửi yêu cầu thành công!</h2>
          <p className="text-gray-600">
            Yêu cầu thiết kế tour của bạn đã được gửi đến <strong>{selectedCompany?.name}</strong>.
            Công ty sẽ liên hệ lại với bạn trong vòng 1–2 ngày làm việc.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} variant="outline">Về trang chủ</Button>
            <Button onClick={() => setSubmitted(false)} className="bg-[#075985] hover:bg-[#F97316]">
              Gửi yêu cầu khác
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-teal-700 border-l-4 border-teal-500 pl-3">
            Thiết kế tour theo yêu cầu
          </h1>
          <p className="text-sm text-gray-500 mt-1 pl-3">
            Điền thông tin để công ty du lịch liên hệ tư vấn và báo giá cho bạn.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company selector */}
        <Section icon={<Building2 className="w-4 h-4 text-[#075985]" />} title="CHỌN CÔNG TY DU LỊCH">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {companies.map((c) => {
              const isSel = form.targetCompanyId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, targetCompanyId: c.id }))}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    isSel ? "border-blue-500 bg-[#F0F9FF]" : "border-gray-200 bg-white hover:border-[#CBD5E1]"
                  }`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{c.description ?? c.address}</p>
                </button>
              );
            })}
          </div>
          {/* Hidden dropdown fallback for many companies */}
          {companies.length > 6 && (
            <div className="relative mt-2">
              <select
                value={form.targetCompanyId}
                onChange={set("targetCompanyId")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
              >
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </Section>

        {/* Business info */}
        <Section icon={<Building2 className="w-4 h-4 text-gray-500" />} title="THÔNG TIN DOANH NGHIỆP">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tên doanh nghiệp, tổ chức của bạn:" placeholder="Tên đầy đủ, viết tắt, Tiếng Anh hoặc Tiếng Việt">
              <input type="text" value={form.businessName} onChange={set("businessName")} placeholder="Tên đầy đủ, viết tắt, Tiếng Anh hoặc Tiếng Việt" className={inputCls} />
            </Field>
            <Field label="Email liên hệ (email công ty):">
              <input type="email" value={form.businessEmail} onChange={set("businessEmail")} placeholder="Email Address" className={inputCls} />
            </Field>
            <Field label="Số điện thoại công ty:">
              <input type="text" value={form.businessPhone} onChange={set("businessPhone")} placeholder="Ví dụ (08) 21 868 86" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Field label={<>Người liên hệ, đại diện đặt tour <span className="text-red-500">*</span>:</>}>
              <input type="text" value={form.contactName} onChange={set("contactName")} placeholder="Tên của bạn" required className={inputCls} />
            </Field>
            <Field label={<>Email cá nhân người đại diện <span className="text-red-500">*</span>:</>}>
              <input type="email" value={form.contactEmail} onChange={set("contactEmail")} placeholder="Email Address" required className={inputCls} />
            </Field>
            <Field label={<>Hotline người liên hệ <span className="text-red-500">*</span>:</>}>
              <input type="text" value={form.contactPhone} onChange={set("contactPhone")} placeholder="Ví dụ (08) 21 868 86" required className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Tour design */}
        <Section icon={<MapPin className="w-4 h-4 text-emerald-600" />} title="THÔNG TIN THIẾT KẾ TOUR">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label={<>Điểm đến mong muốn <span className="text-red-500">*</span>:</>}>
              <input type="text" value={form.destinations} onChange={set("destinations")} placeholder="Nhập những nơi muốn đến" required className={inputCls} />
            </Field>
            <Field label="Ngày khởi hành dự kiến:">
              <input type="date" value={form.departureDate} onChange={set("departureDate")} className={inputCls} />
            </Field>
            <Field label="Ngày về:">
              <input type="date" value={form.returnDate} onChange={set("returnDate")} min={form.departureDate} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Field label={<><Users className="w-3.5 h-3.5 inline mr-1" />Số người tham gia:</>}>
              <input type="number" min={1} value={form.numberOfPeople} onChange={set("numberOfPeople")} placeholder="Nhập số người sẽ đi" className={inputCls} />
            </Field>
            <Field label={<><Wallet className="w-3.5 h-3.5 inline mr-1" />Chi phí dự kiến cho 1 người:</>}>
              <input type="text" value={form.budgetPerPerson} onChange={set("budgetPerPerson")} placeholder="Chi phí dự kiến của bạn" className={inputCls} />
            </Field>
            <Field label={<><Star className="w-3.5 h-3.5 inline mr-1" />Khách sạn lưu trú:</>}>
              <input type="text" value={form.hotelStars} onChange={set("hotelStars")} placeholder="Số sao khách sạn bạn muốn" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Additional info */}
        <Section icon={<FileText className="w-4 h-4 text-[#F97316]" />} title="THÔNG TIN BỔ SUNG THÊM">
          <textarea
            value={form.additionalInfo}
            onChange={set("additionalInfo")}
            rows={5}
            placeholder="Vui lòng bổ sung thông tin tour: các điểm tham quan, các hoạt động tour, lửa trại…hay bất kỳ ghi chú nào khác."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </Section>

        {/* Submit */}
        <div className="flex justify-center pt-2">
          {!currentUser ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">Bạn cần đăng nhập để gửi yêu cầu.</p>
              <Button type="button" onClick={onShowLogin} className="bg-teal-600 hover:bg-teal-700 px-8">
                Đăng nhập để gửi yêu cầu
              </Button>
            </div>
          ) : (
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 px-12 py-3 text-base font-semibold gap-2">
              <Send className="w-4 h-4" />
              GỬI YÊU CẦU
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white placeholder:text-gray-400";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-200 bg-gray-50">
        {icon}
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-700 block">{label}</label>
      {children}
    </div>
  );
}
