import { useState } from "react";
import { Tour } from "@/app/types";
import {
  Sparkles,
  Search,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Compass,
  Star,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

interface AITourRecommenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tours: Tour[];
  onSelectTour: (tour: Tour) => void;
  onBookTour?: (tour: Tour) => void;
}

interface RecommendationResult {
  tour: Tour;
  matchScore: number;
  matchReasons: string[];
  aiSummary: string;
}

export function AITourRecommenderModal({
  isOpen,
  onClose,
  tours,
  onSelectTour,
  onBookTour,
}: AITourRecommenderModalProps) {
  const [destinationGroup, setDestinationGroup] = useState<string>("all");
  const [budgetRange, setBudgetRange] = useState<string>("all");
  const [groupType, setGroupType] = useState<string>("company");
  const [durationPref, setDurationPref] = useState<string>("all");
  const [customWish, setCustomWish] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<RecommendationResult[] | null>(null);

  // Available tours (only published ones, or tours without explicit draft status)
  const publishedTours = tours.filter(
    (t) => (!t.status || t.status === "completed" || t.status === "published") && t.visibility !== "hidden" && t.tourType !== "custom_request"
  );

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setResults(null);

    setTimeout(() => {
      // Intelligent matching algorithm
      const scored: RecommendationResult[] = publishedTours.map((tour) => {
        let score = 70; // Base score
        const reasons: string[] = [];

        // Destination match
        if (destinationGroup !== "all") {
          const destLower = tour.destination.toLowerCase();
          const nameLower = tour.name.toLowerCase();
          if (
            (destinationGroup === "beach" && (destLower.includes("phú quốc") || destLower.includes("nha trang") || destLower.includes("hạ long") || nameLower.includes("biển") || nameLower.includes("đảo"))) ||
            (destinationGroup === "mountain" && (destLower.includes("hà giang") || destLower.includes("sapa") || destLower.includes("bắc cạn") || nameLower.includes("núi") || nameLower.includes("tây bắc"))) ||
            (destinationGroup === "dalat" && (destLower.includes("đà lạt") || destLower.includes("lâm đồng") || nameLower.includes("đà lạt"))) ||
            (destinationGroup === "heritage" && (destLower.includes("đà nẵng") || destLower.includes("hội an") || destLower.includes("huế") || destLower.includes("quảng nam")))
          ) {
            score += 15;
            reasons.push("Đúng điểm đến & địa danh mong muốn");
          }
        }

        // Budget match
        if (budgetRange !== "all") {
          const price = tour.price;
          if (budgetRange === "under3" && price < 3000000) {
            score += 10;
            reasons.push("Chi phí tiết kiệm dưới 3.000.000đ/khách");
          } else if (budgetRange === "3to6" && price >= 3000000 && price <= 6000000) {
            score += 10;
            reasons.push("Mức giá tối ưu 3 - 6 triệu/khách");
          } else if (budgetRange === "6to10" && price > 6000000 && price <= 10000000) {
            score += 10;
            reasons.push("Tiêu chuẩn cao cấp 6 - 10 triệu/khách");
          } else if (budgetRange === "over10" && price > 10000000) {
            score += 10;
            reasons.push("Tour trọn gói chuẩn VIP trên 10 triệu/khách");
          }
        }

        // Group type match
        if (groupType === "company") {
          if (tour.maxGuests >= 20 || tour.highlights.some((h) => h.toLowerCase().includes("teambuilding") || h.toLowerCase().includes("gala") || h.toLowerCase().includes("doanh nghiệp"))) {
            score += 10;
            reasons.push("Tối ưu hoạt động gắn kết doanh nghiệp, sức chứa đoàn lớn");
          }
        } else if (groupType === "family") {
          if (tour.highlights.some((h) => h.toLowerCase().includes("nghỉ dưỡng") || h.toLowerCase().includes("gia đình") || h.toLowerCase().includes("ẩm thực"))) {
            score += 10;
            reasons.push("Lịch trình thư thả, phù hợp gia đình có trẻ em và người lớn tuổi");
          }
        } else if (groupType === "adventure") {
          if (tour.highlights.some((h) => h.toLowerCase().includes("trekking") || h.toLowerCase().includes("chinh phục") || h.toLowerCase().includes("khám phá"))) {
            score += 10;
            reasons.push("Nhiều cung đường trải nghiệm, khám phá thiên nhiên ấn tượng");
          }
        }

        // Custom keyword matching
        if (customWish.trim().length > 0) {
          const wishLower = customWish.toLowerCase();
          const combinedText = `${tour.name} ${tour.description} ${tour.highlights.join(" ")}`.toLowerCase();
          const words = wishLower.split(" ").filter((w) => w.length > 2);
          const matchedWords = words.filter((w) => combinedText.includes(w));
          if (matchedWords.length > 0) {
            score += Math.min(10, matchedWords.length * 3);
            reasons.push(`Khớp yêu cầu riêng: "${matchedWords.join(", ")}"`);
          }
        }

        // Cap score at 99
        score = Math.min(99, Math.max(72, score));

        let aiSummary = `Lựa chọn hàng đầu dựa trên tiêu chí ngân sách và loại đoàn. Hành trình ${tour.duration} mang lại trải nghiệm tối ưu với đánh giá ${tour.rating}★ từ các đoàn trước.`;
        if (reasons.length > 0) {
          aiSummary = `Được AI chấm điểm cao nhờ: ${reasons.join(". ")}. Phù hợp quy mô đoàn từ ${tour.minGuests} đến ${tour.maxGuests} khách.`;
        }

        return {
          tour,
          matchScore: score,
          matchReasons: reasons.length > 0 ? reasons : ["Lịch trình phong phú, đối tác vận hành uy tín"],
          aiSummary,
        };
      });

      scored.sort((a, b) => b.matchScore - a.matchScore);
      setResults(scored.slice(0, 4));
      setIsAnalyzing(false);
    }, 900);
  };

  const handleReset = () => {
    setDestinationGroup("all");
    setBudgetRange("all");
    setGroupType("company");
    setDurationPref("all");
    setCustomWish("");
    setResults(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header with AI Gradient */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full text-yellow-200">
                  AI Tour Assistant
                </span>
                <span className="text-xs text-white/80">· Dành cho khách hàng & doanh nghiệp</span>
              </div>
              <h2 className="text-xl font-extrabold mt-0.5">Trợ Lý AI Tư Vấn & Gợi Ý Tour Thông Minh</h2>
            </div>
          </div>
          <p className="text-xs text-white/90 mt-2 max-w-xl">
            Nhập nhanh mong muốn của đoàn bạn, AI của nền tảng sẽ đối chiếu toàn bộ các tour đã kiểm định để gợi ý hành trình tối ưu nhất về giá, lịch trình và trải nghiệm!
          </p>
        </div>

        <div className="p-6 space-y-6 bg-slate-50">
          {!results ? (
            /* Input Form */
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Destination */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Khu vực / Điểm đến mong muốn
                  </label>
                  <select
                    value={destinationGroup}
                    onChange={(e) => setDestinationGroup(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">🌟 Bất kỳ điểm đến nào (Để AI gợi ý)</option>
                    <option value="beach">🏝️ Biển đảo (Phú Quốc, Nha Trang, Hạ Long)</option>
                    <option value="mountain">⛰️ Vùng cao Tây Bắc (Hà Giang, Sapa)</option>
                    <option value="dalat">🌸 Đà Lạt - Phố núi ngàn hoa</option>
                    <option value="heritage">🏮 Miền Trung di sản (Đà Nẵng, Hội An, Huế)</option>
                  </select>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Ngân sách dự kiến mỗi người
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">💰 Mọi mức giá</option>
                    <option value="under3">Tiết kiệm (Dưới 3.000.000đ)</option>
                    <option value="3to6">Tiêu chuẩn (3.000.000đ - 6.000.000đ)</option>
                    <option value="6to10">Cao cấp (6.000.000đ - 10.000.000đ)</option>
                    <option value="over10">VIP / Nghỉ dưỡng sang trọng (Trên 10.000.000đ)</option>
                  </select>
                </div>

                {/* Group type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#075985]" />
                    Đặc thù đoàn & Mục đích chuyến đi
                  </label>
                  <select
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="company">🏢 Doanh nghiệp / Teambuilding & Gala Dinner</option>
                    <option value="family">👨‍👩‍👧‍👦 Gia đình nhiều thế hệ (Nghỉ dưỡng nhẹ nhàng)</option>
                    <option value="adventure">🧗 Bạn bè trẻ / Khám phá & Trekking</option>
                    <option value="couples">✨ Cặp đôi / Nghỉ dưỡng riêng tư cao cấp</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                    Thời lượng tour
                  </label>
                  <select
                    value={durationPref}
                    onChange={(e) => setDurationPref(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">⏱️ Thời lượng linh hoạt</option>
                    <option value="short">2 Ngày 1 Đêm (Cuối tuần)</option>
                    <option value="medium">3 Ngày 2 Đêm</option>
                    <option value="long">4 Ngày 3 Đêm trở lên</option>
                  </select>
                </div>
              </div>

              {/* Free-text wishes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-pink-600" />
                  Yêu cầu hoặc sở thích đặc biệt (AI tự động trích xuất từ khóa)
                </label>
                <input
                  type="text"
                  value={customWish}
                  onChange={(e) => setCustomWish(e.target.value)}
                  placeholder="Ví dụ: Cần khách sạn 4 sao view biển, ăn hải sản, xe đời mới đón tại sân bay..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>AI đang phân tích & đối chiếu tour...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>Tìm Tour Phù Hợp Với AI</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl p-3 px-4">
                <div className="flex items-center gap-2 text-indigo-900 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>AI đã phân tích và tìm thấy {results.length} tour tối ưu nhất cho đoàn của bạn!</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Điều chỉnh tiêu chí
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map(({ tour, matchScore, matchReasons, aiSummary }) => (
                  <div
                    key={tour.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Image & Match Score Badge */}
                      <div className="relative h-40">
                        <img
                          src={tour.image || (tour.images && tour.images[0])}
                          alt={tour.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-300" />
                          <span>{matchScore}% Phù hợp</span>
                        </div>
                        <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-xs text-white text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <span>{tour.destination}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-indigo-600">{tour.companyName || "Công ty lữ hành"}</span>
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {tour.rating}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                          {tour.name}
                        </h4>

                        {/* AI insight box */}
                        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/70 border border-indigo-100/80 rounded-lg p-2.5 text-[11px] text-slate-700">
                          <p className="font-semibold text-indigo-800 flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            Phân tích từ AI:
                          </p>
                          <p className="line-clamp-2 italic text-slate-600">{aiSummary}</p>
                        </div>

                        {/* Key tags */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {matchReasons.slice(0, 2).map((reason, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 pt-0">
                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Giá từ</span>
                          <span className="text-sm font-extrabold text-[#075985]">
                            {tour.price.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onClose();
                              onSelectTour(tour);
                            }}
                            className="text-xs h-8 px-2.5"
                          >
                            Chi tiết
                          </Button>
                          {onBookTour && (
                            <Button
                              size="sm"
                              onClick={() => {
                                onClose();
                                onBookTour(tour);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3"
                            >
                              Đặt ngay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
