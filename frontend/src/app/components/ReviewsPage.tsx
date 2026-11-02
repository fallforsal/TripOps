import { useState } from "react";
import { Star, MapPin, Calendar, Quote, CheckCircle2 } from "lucide-react";

interface ReviewsPageProps {
  onShowLogin: () => void;
}

export function ReviewsPage({ onShowLogin }: ReviewsPageProps) {
  const [selectedDestination, setSelectedDestination] = useState<string>("all");

  const reviews = [
    {
      id: 1,
      name: "Hoàng Minh Trí (34 tuổi)",
      role: "Giám đốc sáng tạo, Hà Nội",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80",
      rating: 5,
      tour: "Hành trình di sản cố đô Ninh Bình - 3N2Đ",
      destination: "Ninh Bình",
      date: "Tháng 02, 2026",
      comment:
        "Điều tôi hài lòng nhất ở TripOps là nhịp độ chuyến đi. Không hề có cảm giác bị giục giã hay chụp ảnh vội vàng. Resort được chọn rất tinh tế, hướng dẫn viên am hiểu sâu sắc về lịch sử cố đô. Một kỳ nghỉ trọn vẹn đúng nghĩa.",
    },
    {
      id: 2,
      name: "Lê Phương Thảo (29 tuổi)",
      role: "Chuyên viên truyền thông, TP. HCM",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
      rating: 5,
      tour: "Nghỉ dưỡng tĩnh lặng ven vịnh Phú Quốc - 4N3Đ",
      destination: "Phú Quốc",
      date: "Tháng 01, 2026",
      comment:
        "Khu nghỉ tách biệt, dịch vụ ẩm thực bản địa hữu cơ tươi sạch và đội ngũ chăm sóc khách hàng 1:1 rất chu đáo. TripOps tạo cho mình cảm giác an tâm tuyệt đối về chất lượng ngay từ khi xác nhận lịch trình.",
    },
    {
      id: 3,
      name: "Trần Bảo Nam (38 tuổi)",
      role: "Kiến trúc sư, Đà Nẵng",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
      rating: 5,
      tour: "Khám phá bản sắc văn hóa Tây Bắc - 4N3Đ",
      destination: "Hà Giang",
      date: "Tháng 12, 2025",
      comment:
        "Cách TripOps thiết kế lộ trình rất có gu. Tiếp cận được những bản làng người H'Mông nguyên bản, không bị thương mại hóa xô bồ. Chi phí hoàn toàn xứng đáng với giá trị trải nghiệm nhận lại.",
    },
  ];

  const destinations = ["all", "Ninh Bình", "Phú Quốc", "Hà Giang"];

  const filteredReviews = reviews.filter((r) =>
    selectedDestination === "all" ? true : r.destination === selectedDestination,
  );

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A] font-sans antialiased">
      {/* Header */}
      <section className="pt-32 pb-16 border-b border-[#CBD5E1] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
              Trải nghiệm thực tế
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif text-[#075985] tracking-tight">
              Những cảm nhận chân thực từ du khách TripOps
            </h1>
            <p className="text-base text-[#475569] font-light leading-relaxed">
              Mỗi chia sẻ là động lực để chúng tôi tiếp tục duy trì chuẩn mực dịch vụ tinh tế và bảo tồn giá trị nguyên bản của du lịch.
            </p>
          </div>
        </div>
      </section>

      {/* Filter & Reviews List */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Destination tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#CBD5E1] pb-4">
            <span className="text-xs text-[#475569] mr-2">Lọc theo điểm đến:</span>
            {destinations.map((dest) => (
              <button
                key={dest}
                onClick={() => setSelectedDestination(dest)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedDestination === dest
                    ? "bg-[#075985] text-white"
                    : "bg-white text-[#475569] border border-[#CBD5E1] hover:border-[#075985]"
                }`}
              >
                {dest === "all" ? "Tất cả phản hồi" : dest}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white p-8 rounded-2xl border border-[#CBD5E1] shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-[#075985] transition-all duration-300 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-[#F97316] font-semibold">
                      {rev.destination}
                    </span>
                    <span className="text-xs text-[#475569] font-light">{rev.date}</span>
                  </div>

                  <p className="text-xs text-[#075985] font-medium">
                    Hành trình: <span className="font-serif italic text-sm">{rev.tour}</span>
                  </p>

                  <p className="text-xs text-[#475569] font-light leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                <div className="pt-4 border-t border-[#CBD5E1] flex items-center gap-3">
                  <img
                    src={rev.avatar}
                    alt={rev.name}
                    className="w-10 h-10 rounded-full object-cover filter saturate-[0.9]"
                  />
                  <div>
                    <h4 className="text-xs font-semibold text-[#075985]">{rev.name}</h4>
                    <p className="text-[10px] text-[#475569]">{rev.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
