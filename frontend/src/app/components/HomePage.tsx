import { useState } from "react";
import {
  MapPin,
  Clock,
  Users,
  Compass,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Search,
  Loader2,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { Tour } from "@/app/types";
import { PublicTourDetailModal } from "./user/PublicTourDetailModal";

interface HomePageProps {
  onShowLogin: () => void;
  popularTours: Tour[];
  onNavigate?: (page: string) => void;
  onViewTour?: (tour: Tour) => void;
}

export function HomePage({
  onShowLogin,
  popularTours,
  onNavigate,
  onViewTour,
}: HomePageProps) {
  const [aiQuery, setAiQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Tour[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleAISearch = async (customPrompt?: string) => {
    const textToSearch = customPrompt ?? aiQuery;
    if (!textToSearch.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      const query = textToSearch.toLowerCase();
      const results = popularTours.filter((tour) => {
        const matchesDestination = tour.destination.toLowerCase().includes(query);
        const matchesName = tour.name.toLowerCase().includes(query);
        const matchesDescription = tour.description.toLowerCase().includes(query);

        // Budget matching
        const budgetMatch = query.match(/(\d+)\s*(triệu|tr|trieu|million)/i);
        if (budgetMatch) {
          const budget = parseInt(budgetMatch[1]) * 1000000;
          return tour.price <= budget;
        }

        // Days matching
        const daysMatch = query.match(/(\d+)\s*(ngày|ngay|day)/i);
        if (daysMatch) {
          const days = parseInt(daysMatch[1]);
          return tour.duration.includes(`${days} ngày`);
        }

        return matchesDestination || matchesName || matchesDescription;
      });

      setSearchResults(results.length > 0 ? results : popularTours);
      setIsSearching(false);

      setTimeout(() => {
        document.getElementById("curated-results")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }, 900);
  };

  const curatedHighlights = [
    {
      title: "Cá nhân hóa theo nhịp sống",
      description:
        "Tối ưu hóa lịch trình để bạn tận hưởng sự thư thái, không vội vã, cân bằng giữa nghỉ ngơi và khám phá bản địa sâu sắc.",
      tag: "Trải nghiệm may đo",
    },
    {
      title: "Bản địa hóa nguyên bản",
      description:
        "Kết nối trực tiếp cùng hướng dẫn viên kinh nghiệm và cộng đồng địa phương, tiếp cận các địa điểm ẩn mình ít xô bồ.",
      tag: "Văn hóa & Đời sống",
    },
    {
      title: "Minh bạch & An tâm tuyệt đối",
      description:
        "Chính sách bảo hiểm du lịch toàn diện, hợp đồng rõ ràng và hỗ trợ điều phối viên 1:1 trong suốt hành trình.",
      tag: "Cam kết cao cấp",
    },
  ];

  const quickFilters = [
    "Nghỉ dưỡng biển Phú Quốc 3N2Đ",
    "Tour văn hóa & di sản Huế - Hội An",
    "Trải nghiệm thiên nhiên Tây Bắc yên tĩnh",
    "Hành trình ẩm thực & cà phê Đà Lạt",
  ];

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A] font-sans antialiased selection:bg-[#F97316]/20 selection:text-[#075985]">
      {/* 1. HERO SECTION (EDITORIAL & ARCHITECTURAL SPLIT) */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 border-b border-[#CBD5E1] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E0F2FE] border border-[#075985]/10 text-xs font-medium tracking-wide uppercase text-[#075985]">
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                Nền tảng hành trình du lịch chọn lọc
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-[#075985] leading-[1.12]">
                  Khám phá Việt Nam <br />
                  <span className="italic font-normal text-[#F97316]">với chiều sâu văn hóa</span>
                </h1>
                <p className="text-base sm:text-lg text-[#475569] max-w-xl font-normal leading-relaxed">
                  Dành riêng cho những tâm hồn trân trọng trải nghiệm tĩnh lặng, độc bản và tính nguyên bản của từng vùng đất. Không xô bồ, không rập khuôn.
                </p>
              </div>

              {/* Minimalist Smart Search Box */}
              <div className="bg-[#FFFFFF] rounded-2xl p-4 sm:p-5 border border-[#CBD5E1] shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#075985]">
                  <Compass className="w-4 h-4 text-[#F97316]" />
                  <span>Trợ lý điều phối hành trình TripOps AI</span>
                </div>

                <div className="relative">
                  <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAISearch();
                      }
                    }}
                    placeholder="Mô tả phong cách du lịch của bạn (ví dụ: Chuyến đi nghỉ ngơi 3 ngày tại Quy Nhơn, ưu tiên biển vắng, ẩm thực hải sản tươi...)"
                    className="w-full p-3.5 text-sm sm:text-base bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl text-[#0F172A] placeholder:text-[#475569]/70 focus:outline-none focus:ring-1 focus:ring-[#075985] focus:border-[#075985] transition-all resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-[#475569]">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Gợi ý nhanh theo gu:</span>
                  </div>

                  <button
                    onClick={() => handleAISearch()}
                    disabled={isSearching || !aiQuery.trim()}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#075985] text-[#F0F9FF] text-sm font-medium hover:bg-[#F97316] disabled:opacity-40 disabled:hover:bg-[#075985] transition-all duration-300 shadow-sm"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang tinh lọc...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Tìm hành trình phù hợp</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Micro tags */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-[#CBD5E1]/60">
                  {quickFilters.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setAiQuery(tag);
                        handleAISearch(tag);
                      }}
                      className="text-xs px-3 py-1 rounded-full bg-[#F0F9FF] text-[#475569] border border-[#CBD5E1] hover:text-[#075985] hover:border-[#075985] transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-6 pt-2 border-t border-[#CBD5E1]">
                <div>
                  <div className="text-2xl font-serif text-[#075985]">100%</div>
                  <div className="text-xs text-[#475569] mt-0.5 font-medium">Bảo hiểm & Pháp lý</div>
                </div>
                <div>
                  <div className="text-2xl font-serif text-[#075985]">4.92 / 5</div>
                  <div className="text-xs text-[#475569] mt-0.5 font-medium">Độ hài lòng du khách</div>
                </div>
                <div>
                  <div className="text-2xl font-serif text-[#075985]">1:1</div>
                  <div className="text-xs text-[#475569] mt-0.5 font-medium">Hỗ trợ riêng suốt tuyến</div>
                </div>
              </div>
            </div>

            {/* Right Curated Visual Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-[0_12px_40px_rgb(0,0,0,0.06)] aspect-[4/5] bg-[#CBD5E1]/30">
                <img
                  src="https://images.unsplash.com/photo-1528127269322-539801943592?w=1000&auto=format&fit=crop&q=85"
                  alt="Tràng An, Ninh Bình - TripOps"
                  className="w-full h-full object-cover object-center filter saturate-[0.9] hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#075985]/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                  <div className="inline-block px-2.5 py-1 rounded bg-[#F97316] text-[11px] font-medium uppercase tracking-wider">
                    Điểm đến mùa thu
                  </div>
                  <h3 className="text-xl font-serif font-light leading-snug">
                    Ninh Bình: Bản hòa ca non nước & di sản
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2 font-light">
                    Hành trình chèo thuyền qua những thung lũng đá vôi ngập nước, thưởng thức trà sen và ẩm thực cố đô thanh tao.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. SEARCH RESULTS (IF TRIGGERED) */}
      {hasSearched && (
        <section id="curated-results" className="py-16 md:py-24 border-b border-[#CBD5E1] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">
                  Bộ sưu tập chọn lọc
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif text-[#075985] mt-1">
                  {searchResults.length} hành trình phù hợp với tiêu chí của bạn
                </h2>
                <p className="text-sm text-[#475569] mt-1">
                  Kết quả đề xuất dựa trên nhu cầu: &ldquo;{aiQuery}&rdquo;
                </p>
              </div>

              <button
                onClick={() => {
                  setHasSearched(false);
                  setSearchResults([]);
                  setAiQuery("");
                }}
                className="text-xs tracking-wider uppercase underline underline-offset-4 text-[#475569] hover:text-[#F97316] self-start md:self-auto transition-colors"
              >
                Đặt lại tìm kiếm
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {searchResults.map((tour) => (
                <article
                  key={tour.id}
                  onClick={() => onViewTour ? onViewTour(tour) : (setSelectedTour(tour), setShowDetailModal(true))}
                  className="group bg-[#F0F9FF] rounded-xl overflow-hidden border border-[#CBD5E1] hover:border-[#075985] transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                    <img
                      src={tour.image}
                      alt={tour.name}
                      className="w-full h-full object-cover filter saturate-[0.95] group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-3 left-3 bg-[#075985]/95 backdrop-blur-sm text-white px-2.5 py-1 rounded text-xs font-medium">
                      {tour.destination}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-xs text-[#475569]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#F97316]" />
                          {tour.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-[#F97316]" />
                          Tối đa {tour.maxGuests} khách
                        </span>
                      </div>

                      <h3 className="text-lg font-serif text-[#075985] group-hover:text-[#F97316] transition-colors line-clamp-1">
                        {tour.name}
                      </h3>

                      <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                        {tour.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#CBD5E1] flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-[#475569] block">Chi phí từ</span>
                        <span className="text-lg font-serif font-semibold text-[#075985]">
                          {formatPrice(tour.price)}
                        </span>
                      </div>
                      
                      <div className="w-8 h-8 rounded-full border border-[#CBD5E1] group-hover:border-[#F97316] group-hover:bg-[#F97316] group-hover:text-white flex items-center justify-center transition-all duration-300">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. CURATED SIGNATURE TOURS SECTION */}
      <section id="tours" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase font-medium tracking-widest text-[#F97316]">
                Tuyển tập đặc biệt
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#075985] tracking-tight">
                Những hành trình giàu tính trải nghiệm
              </h2>
            </div>
            
            <button
              onClick={() => onNavigate?.("book-tours")}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#075985] hover:text-[#F97316] transition-colors self-start md:self-auto"
            >
              <span>Xem tất cả danh mục hành trình</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {popularTours.slice(0, 3).map((tour) => (
              <article
                key={tour.id}
                onClick={() => onViewTour ? onViewTour(tour) : (setSelectedTour(tour), setShowDetailModal(true))}
                className="group bg-[#FFFFFF] rounded-2xl overflow-hidden border border-[#CBD5E1] hover:border-[#075985] hover:shadow-[0_12px_30px_rgb(0,0,0,0.05)] transition-all duration-300 cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-full h-full object-cover filter saturate-[0.9] group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-4 left-4 bg-[#F0F9FF]/90 backdrop-blur-md text-[#075985] px-3 py-1 rounded-full text-xs font-medium border border-[#CBD5E1]">
                    {tour.destination}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-4 text-xs text-[#475569]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#F97316]" />
                        {tour.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#F97316]" />
                        Nhóm tối đa {tour.maxGuests} người
                      </span>
                    </div>

                    <h3 className="text-xl font-serif text-[#075985] group-hover:text-[#F97316] transition-colors leading-snug line-clamp-1">
                      {tour.name}
                    </h3>

                    <p className="text-sm text-[#475569] line-clamp-2 font-normal leading-relaxed">
                      {tour.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#CBD5E1] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#475569] block">Trọn gói từ</span>
                      <span className="text-xl font-serif font-medium text-[#075985]">
                        {formatPrice(tour.price)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewTour ? onViewTour(tour) : (setSelectedTour(tour), setShowDetailModal(true));
                      }}
                      className="px-4 py-2 rounded-full border border-[#075985] text-xs font-medium text-[#075985] group-hover:bg-[#075985] group-hover:text-white transition-all duration-300"
                    >
                      Chi tiết hành trình
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE TRIPOPS PILLARS (EDITORIAL MINIMALIST GRID) */}
      <section className="py-20 md:py-28 bg-[#075985] text-[#F0F9FF] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mb-16 space-y-3">
            <span className="text-xs uppercase tracking-widest text-[#F97316] font-semibold">
              Triết lý hành trình
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight leading-tight">
              Chúng tôi định nghĩa lại cách bạn cảm nhận từng chuyến đi
            </h2>
            <p className="text-sm sm:text-base text-[#F0F9FF]/70 leading-relaxed font-light">
              Du lịch ở độ tuổi trưởng thành không đơn thuần là điểm danh các danh lam thắng cảnh, mà là hành trình nạp lại năng lượng tinh thần và thấu hiểu chiều sâu đời sống.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {curatedHighlights.map((pillar, idx) => (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-[#FFFFFF]/[0.03] border border-[#FFFFFF]/10 hover:border-[#F97316]/50 transition-colors duration-300 space-y-4"
              >
                <div className="text-[11px] tracking-widest uppercase font-semibold text-[#F97316]">
                  0{idx + 1} — {pillar.tag}
                </div>
                <h3 className="text-xl font-serif text-white">
                  {pillar.title}
                </h3>
                <p className="text-sm text-[#F0F9FF]/70 leading-relaxed font-light">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. GENTLE CALL TO ACTION */}
      <section className="py-20 md:py-28 border-t border-[#CBD5E1] bg-[#F0F9FF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <span className="text-xs uppercase tracking-widest text-[#F97316] font-semibold">
            Bắt đầu chuyến đi của riêng bạn
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif text-[#075985] tracking-tight leading-tight">
            Sẵn sàng cho một kỳ nghỉ <br />
            <span className="italic font-normal">đích thực và trọn vẹn?</span>
          </h2>
          <p className="text-base text-[#475569] max-w-xl mx-auto font-light leading-relaxed">
            Đăng nhập tài khoản để nhận lịch trình được cá nhân hóa, hoặc trao đổi trực tiếp với chuyên gia tư vấn hành trình của TripOps.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onShowLogin}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#075985] text-white text-sm font-medium tracking-wide hover:bg-[#F97316] transition-all duration-300 shadow-sm"
            >
              Đăng nhập tài khoản
            </button>
            <button
              onClick={() => onNavigate?.("contact")}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-[#CBD5E1] bg-white text-[#075985] text-sm font-medium hover:border-[#075985] transition-all duration-300"
            >
              Yêu cầu tư vấn riêng
            </button>
          </div>
        </div>
      </section>

      {/* Tour Detail Modal */}
      {showDetailModal && selectedTour && (
        <PublicTourDetailModal
          tour={selectedTour}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}
