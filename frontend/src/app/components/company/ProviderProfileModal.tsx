import React, { useState } from "react";
import { User, Service } from "@/app/types";
import {
  X,
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  Sparkles,
  Info,
  Navigation,
  Share2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface ProviderProfileModalProps {
  provider: User | null;
  isOpen: boolean;
  onClose: () => void;
  serviceContext?: {
    serviceName?: string;
    category?: "hotel" | "fnb" | "meal" | string;
    dayNumber?: number;
    destination?: string;
  };
}

export function ProviderProfileModal({
  provider,
  isOpen,
  onClose,
  serviceContext,
}: ProviderProfileModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !provider) return null;

  const lat = provider.latitude || 11.9404;
  const lng = provider.longitude || 108.4583;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=vi&z=15&output=embed`;
  const googleMapsExternalUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenNewTab = () => {
    // Open a standalone window/tab with the provider profile
    const htmlContent = `
      <html>
        <head>
          <title>Hồ sơ Đối tác: ${provider.businessName || provider.name}</title>
          <meta charset="utf-8"/>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; background: #f8fafc; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .card { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
            h1 { color: #1e3a8a; margin-top: 0; font-size: 24px; }
            .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
            .section { margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
            .label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
            .value { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
            a { color: #2563eb; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">ĐỐI TÁC CUNG CẤP DỊCH VỤ NỀN TẢNG</span>
            <h1>${provider.businessName || "Tổ hợp Dịch vụ Du lịch Heritage"}</h1>
            <p style="color: #64748b; margin-top: -10px;">${provider.businessDescription || ""}</p>
            
            <div class="section">
              <div class="label">Người đại diện liên hệ:</div>
              <div class="value">${provider.name}</div>

              <div class="label">Hotline B2B:</div>
              <div class="value"><a href="tel:${provider.businessPhone || provider.phone}">${provider.businessPhone || provider.phone || "0263 3825 444"}</a></div>

              <div class="label">Email giao dịch:</div>
              <div class="value"><a href="mailto:${provider.businessEmail || provider.email}">${provider.businessEmail || provider.email || "contact@provider.com"}</a></div>

              <div class="label">Mã số thuế:</div>
              <div class="value">${provider.taxCode || "0123456789"}</div>

              <div class="label">Trụ sở kinh doanh:</div>
              <div class="value">${provider.businessAddress || provider.street || "02 Trần Phú, Phường 3, Lâm Đồng"}</div>
            </div>
          </div>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Building2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Hồ sơ Đối tác Cung cấp Dịch vụ
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full font-semibold">
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  Đã xác minh B2B
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Thông tin liên hệ trực tiếp dành cho Công ty lữ hành đối soát và thương lượng giá
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleOpenNewTab}
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
              title="Mở trong tab mới"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {/* Service context alert if opened from a specific booking item */}
          {serviceContext && serviceContext.serviceName && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">
                  Dịch vụ được khách chọn trong đơn này:
                </p>
                <p className="text-amber-800 mt-0.5">
                  <span className="font-semibold text-gray-900">{serviceContext.serviceName}</span>
                  {serviceContext.destination && ` (Khu vực: ${serviceContext.destination})`}
                  {serviceContext.dayNumber && ` — Ngày ${serviceContext.dayNumber}`}
                </p>
              </div>
            </div>
          )}

          {/* Provider Primary Identity */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#075985] bg-[#F0F9FF] px-2 py-0.5 rounded border border-[#CBD5E1]">
                  Nhà cung cấp nền tảng
                </span>
                <h4 className="text-lg sm:text-xl font-black text-gray-900 mt-1">
                  {provider.businessName || "Tổ hợp Dịch vụ Du lịch Heritage"}
                </h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {provider.businessDescription ||
                    "Đơn vị chuyên cung cấp dịch vụ lưu trú cao cấp, ẩm thực bản địa và các tour trải nghiệm thiên nhiên uy tín tại Đà Lạt và khu vực Tây Nguyên."}
                </p>
              </div>
            </div>

            {/* Quick stats or verification info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-gray-200 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                <span className="text-gray-400 block text-[10px]">MÃ SỐ THUẾ</span>
                <span className="font-bold text-gray-800">{provider.taxCode || "0123456789"}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                <span className="text-gray-400 block text-[10px]">ĐẠI DIỆN PHÁP LÝ</span>
                <span className="font-bold text-gray-800">{provider.name}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-gray-100 col-span-2 sm:col-span-1">
                <span className="text-gray-400 block text-[10px]">TRẠNG THÁI</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đối tác tích cực
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details with Quick Actions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#075985]" />
              Kênh liên lạc trực tiếp B2B
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Hotline B2B */}
              <div className="p-3.5 rounded-xl border border-[#CBD5E1] bg-[#F0F9FF]/50 flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[11px] font-medium">Hotline B2B / Đặt đoàn:</p>
                  <a
                    href={`tel:${provider.businessPhone || provider.phone || "02633825444"}`}
                    className="text-base font-extrabold text-[#075985] hover:text-blue-900 hover:underline block mt-0.5"
                  >
                    {provider.businessPhone || provider.phone || "0263 3825 444"}
                  </a>
                </div>
                <button
                  onClick={() => copyToClipboard(provider.businessPhone || provider.phone || "0263 3825 444", "phone")}
                  className="p-2 rounded-lg bg-white hover:bg-[#E0F2FE] border border-[#CBD5E1] text-[#075985] transition-colors shadow-2xs"
                  title="Sao chép số điện thoại"
                >
                  {copiedField === "phone" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Email B2B */}
              <div className="p-3.5 rounded-xl border border-[#F97316]/30 bg-[#F0F9FF]/50 flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[11px] font-medium">Email đối soát &amp; Hợp đồng:</p>
                  <a
                    href={`mailto:${provider.businessEmail || provider.email || "contact@provider.com"}`}
                    className="text-sm font-bold text-[#EA580C] hover:text-purple-900 hover:underline block mt-0.5 truncate max-w-[190px]"
                  >
                    {provider.businessEmail || provider.email || "contact@provider.com"}
                  </a>
                </div>
                <button
                  onClick={() => copyToClipboard(provider.businessEmail || provider.email || "contact@provider.com", "email")}
                  className="p-2 rounded-lg bg-white hover:bg-[#F97316]/15 border border-[#F97316]/30 text-[#EA580C] transition-colors shadow-2xs"
                  title="Sao chép email"
                >
                  {copiedField === "email" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-400 text-[11px] font-medium">Địa chỉ trụ sở / Cơ sở chính:</p>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {provider.businessAddress || provider.street ? `${provider.street || ""}, ${provider.ward || ""}, ${provider.province || ""}` : "02 Trần Phú, Phường 3, Lâm Đồng"}
                  </p>
                </div>
              </div>
              <a
                href={googleMapsExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#075985] hover:text-blue-800 bg-[#F0F9FF] px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] flex-shrink-0"
              >
                <Navigation className="w-3 h-3" />
                Mở Maps
              </a>
            </div>
          </div>

          {/* Embedded Google Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#075985]" />
                Vị trí toạ độ GPS của Đối tác:
              </span>
              <span className="text-gray-400 font-mono text-[11px]">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
            <div className="relative w-full h-56 rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100">
              <iframe
                title="Bản đồ Đối tác"
                src={mapEmbedUrl}
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          {/* B2B Guidance note for company */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-[#CBD5E1] rounded-xl p-4 text-xs text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#075985]" />
              Hướng dẫn thực hiện dành cho Công ty lữ hành:
            </p>
            <p className="text-blue-800 leading-relaxed pl-5">
              1. Gọi điện thoại hoặc gửi email đến Đối tác theo thông tin ở trên để xác nhận khả năng đáp ứng dịch vụ cho đoàn khách.
              <br />
              2. Thương lượng chính sách giá đại lý lữ hành (giá B2B) và các ưu đãi đoàn.
              <br />
              3. Quay lại trang chi tiết đơn hàng để cập nhật giá chốt chính thức cho khách hàng trước khi bấm Duyệt đơn.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenNewTab}
            className="gap-1.5 text-xs text-[#075985] border-[#CBD5E1] hover:bg-[#F0F9FF]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở xem hồ sơ ở tab mới
          </Button>

          <Button
            onClick={onClose}
            className="bg-[#075985] hover:bg-[#F97316] text-white font-bold text-xs px-5 py-2 rounded-xl"
          >
            Đã hiểu &amp; Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
