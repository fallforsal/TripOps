import {
  HelpCircle,
  Search,
  Phone,
  Mail,
  MessageCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { useState } from "react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    id: "faq-1",
    question: "Làm thế nào để đặt tour?",
    answer:
      "Bạn có thể đặt tour bằng cách: 1) Chọn tour từ danh sách tour có sẵn, 2) Sử dụng AI search để tìm tour phù hợp, 3) Liên hệ trực tiếp với quản trị viên. Sau khi chọn tour, điền thông tin và thanh toán để hoàn tất đặt tour.",
    category: "Đặt tour",
  },
  {
    id: "faq-2",
    question: "Tôi có thể hủy tour đã đặt không?",
    answer:
      "Có, bạn có thể hủy tour. Tuy nhiên, chính sách hoàn tiền phụ thuộc vào thời gian hủy: Hủy trước 7 ngày: hoàn 100%, Hủy trước 3-6 ngày: hoàn 50%, Hủy trong vòng 2 ngày: không hoàn tiền.",
    category: "Đặt tour",
  },
  {
    id: "faq-3",
    question: "Tôi có thể thanh toán bằng cách nào?",
    answer:
      "Chúng tôi chấp nhận nhiều phương thức thanh toán: Thẻ tín dụng/ghi nợ (Visa, Mastercard, JCB, Amex), Ví điện tử (MoMo, ZaloPay, VNPay), Chuyển khoản ngân hàng.",
    category: "Thanh toán",
  },
  {
    id: "faq-4",
    question: "Làm thế nào để sử dụng mã khuyến mãi?",
    answer:
      'Khi đặt tour, bạn sẽ thấy ô "Nhập mã khuyến mãi" trong bước thanh toán. Nhập mã và nhấn "Áp dụng". Giá tour sẽ được tự động giảm theo mã khuyến mãi.',
    category: "Khuyến mãi",
  },
  {
    id: "faq-5",
    question: "Tôi có thể đổi ngày khởi hành không?",
    answer:
      "Có, bạn có thể đổi ngày khởi hành bằng cách liên hệ với chúng tôi ít nhất 5 ngày trước ngày khởi hành. Có thể áp dụng phí thay đổi tùy thuộc vào tour.",
    category: "Đặt tour",
  },
];

const categories = Array.from(
  new Set(faqs.map((faq) => faq.category)),
);

export function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] =
    useState<string>("all");

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      faq.answer
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Trung tâm trợ giúp
              </h1>
              <p className="text-gray-600">
                Câu hỏi thường gặp và hỗ trợ khách hàng
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-[#075985] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Tất cả
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? "bg-[#075985] text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-3 mb-8">
          {filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedFAQ(
                    expandedFAQ === faq.id ? null : faq.id,
                  )
                }
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <BookOpen className="w-5 h-5 text-[#075985] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {faq.question}
                    </h3>
                    <span className="text-xs text-[#075985] mt-1 inline-block">
                      {faq.category}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedFAQ === faq.id ? "rotate-90" : ""
                  }`}
                />
              </button>
              {expandedFAQ === faq.id && (
                <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="bg-white rounded-xl p-12 text-center mb-8">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy kết quả
            </h3>
            <p className="text-gray-600">
              Thử tìm kiếm với từ khóa khác hoặc liên hệ với
              chúng tôi
            </p>
          </div>
        )}

        {/* Contact Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-[#E0F2FE] rounded-lg flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-[#075985]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Hotline 24/7
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Gọi ngay để được hỗ trợ
            </p>
            <a
              href="tel:1900123456"
              className="text-[#075985] font-semibold hover:underline"
            >
              1900 123 456
            </a>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Email
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Gửi email cho chúng tôi
            </p>
            <a
              href="mailto:support@TripOps.com"
              className="text-green-600 font-semibold hover:underline text-sm"
            >
              support@TripOps.com
            </a>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-[#F97316]/15 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-[#F97316]" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Live Chat
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Chat trực tuyến với tư vấn viên
            </p>
            <button className="text-[#F97316] font-semibold hover:underline">
              Bắt đầu chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}