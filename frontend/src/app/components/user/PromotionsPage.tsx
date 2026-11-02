import { Tag, Copy, Check, Clock, Percent } from "lucide-react";
import { useState } from "react";

interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: string;
  minSpend?: number;
  maxDiscount?: number;
  validUntil: string;
  type: "percentage" | "fixed" | "special";
  image?: string;
}

const mockPromotions: Promotion[] = [
  {
    id: "promo-1",
    code: "DALAT2026",
    title: "Giảm 20% Tour Đà Lạt",
    description:
      "Áp dụng cho tất cả các tour Đà Lạt trong tháng 2/2026",
    discount: "20%",
    minSpend: 3000000,
    maxDiscount: 1000000,
    validUntil: "28/02/2026",
    type: "percentage",
  },
  {
    id: "promo-2",
    code: "SUMMER500",
    title: "Giảm 500K Tour Biển",
    description:
      "Giảm ngay 500.000đ cho tour biển từ 3 ngày 2 đêm",
    discount: "500.000đ",
    minSpend: 5000000,
    validUntil: "31/03/2026",
    type: "fixed",
  },
  {
    id: "promo-3",
    code: "FIRSTBOOK",
    title: "Ưu đãi lần đầu đặt tour",
    description:
      "Giảm 15% cho khách hàng đặt tour lần đầu tiên",
    discount: "15%",
    maxDiscount: 800000,
    validUntil: "31/12/2026",
    type: "special",
  },
  {
    id: "promo-4",
    code: "GROUP10",
    title: "Ưu đãi nhóm từ 10 người",
    description:
      "Giảm 25% khi đặt tour cho nhóm từ 10 người trở lên",
    discount: "25%",
    minSpend: 10000000,
    maxDiscount: 3000000,
    validUntil: "30/06/2026",
    type: "percentage",
  },
];

export function PromotionsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(
    null,
  );

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Tag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Khuyến mãi
              </h1>
              <p className="text-gray-600">
                Ưu đãi và mã giảm giá dành cho bạn
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Mã khả dụng
                </p>
                <p className="text-3xl font-bold text-[#075985]">
                  {mockPromotions.length}
                </p>
              </div>
              <Tag className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Đã sử dụng
                </p>
                <p className="text-3xl font-bold text-green-600">
                  2
                </p>
              </div>
              <Check className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Tiết kiệm
                </p>
                <p className="text-2xl font-bold text-[#F97316]">
                  1.2M
                </p>
              </div>
              <Percent className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Promotions List */}
        <div className="space-y-4">
          {mockPromotions.map((promo) => (
            <div
              key={promo.id}
              className="bg-white rounded-xl p-6 shadow-md border-2 border-gray-200 hover:border-blue-500 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left side - Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`px-4 py-2 rounded-lg font-bold text-lg ${
                        promo.type === "percentage"
                          ? "bg-[#075985] text-white"
                          : promo.type === "fixed"
                            ? "bg-gradient-to-r from-green-500 to-teal-500 text-white"
                            : "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                      }`}
                    >
                      {promo.discount}
                    </div>
                    {promo.type === "special" && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        Đặc biệt
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {promo.title}
                  </h3>

                  <p className="text-gray-600 mb-3">
                    {promo.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {promo.minSpend && (
                      <span>
                        • Chi tiêu tối thiểu:{" "}
                        {formatPrice(promo.minSpend)}
                      </span>
                    )}
                    {promo.maxDiscount && (
                      <span>
                        • Giảm tối đa:{" "}
                        {formatPrice(promo.maxDiscount)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Hết hạn: {promo.validUntil}
                    </span>
                  </div>
                </div>

                {/* Right side - Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg px-6 py-3">
                    <p className="text-xs text-gray-500 mb-1 text-center">
                      Mã giảm giá
                    </p>
                    <p className="text-xl font-bold text-gray-900 tracking-wider">
                      {promo.code}
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(promo.code)}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      copiedCode === promo.code
                        ? "bg-green-500 text-white"
                        : "bg-[#075985] text-white hover:bg-[#F97316]"
                    }`}
                  >
                    {copiedCode === promo.code ? (
                      <>
                        <Check className="w-4 h-4" />
                        Đã sao chép
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Sao chép mã
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state if no promotions */}
        {mockPromotions.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Chưa có khuyến mãi nào
            </h3>
            <p className="text-gray-600">
              Các mã giảm giá sẽ được cập nhật thường xuyên. Hãy
              quay lại sau nhé!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}