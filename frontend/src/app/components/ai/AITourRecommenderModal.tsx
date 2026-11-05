import { useState } from "react";
import { Tour } from "@/app/types";
import {
  Sparkles,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

function PreferenceSelect({ id, label, value, onChange, options }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full min-h-12 data-[size=default]:h-auto rounded-md border-slate-300 bg-white py-2 text-left text-sm whitespace-normal [&_[data-slot=select-value]]:line-clamp-none [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:leading-5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72 max-w-[calc(100vw-2rem)] bg-white">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="py-2.5 [&_[data-slot=select-item-text]]:whitespace-normal">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

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
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto gap-0 p-0 rounded-xl border border-slate-200 bg-white">
        <DialogHeader className="border-b border-slate-200 px-5 py-5 pr-12 text-left sm:px-6 sm:pr-12">
          <DialogTitle className="text-xl font-semibold leading-7 text-slate-900">Tìm tour cùng AI</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-slate-600">
            Chọn nhu cầu của đoàn để tìm những tour phù hợp.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 sm:p-6">
          {!results ? (
            /* Input Form */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 items-start">
                {/* Destination */}
                <PreferenceSelect id="ai-destination" label="Điểm đến" value={destinationGroup} onChange={setDestinationGroup} options={[
                  { value: "all", label: "Để AI gợi ý điểm đến" },
                  { value: "beach", label: "Biển đảo" },
                  { value: "mountain", label: "Vùng cao và Tây Bắc" },
                  { value: "dalat", label: "Đà Lạt" },
                  { value: "heritage", label: "Miền Trung và di sản" },
                ]} />

                {/* Budget */}
                <PreferenceSelect id="ai-budget" label="Ngân sách / người" value={budgetRange} onChange={setBudgetRange} options={[
                  { value: "all", label: "Mọi mức giá" },
                  { value: "under3", label: "Dưới 3.000.000đ" },
                  { value: "3to6", label: "3.000.000đ – 6.000.000đ" },
                  { value: "6to10", label: "6.000.000đ – 10.000.000đ" },
                  { value: "over10", label: "Trên 10.000.000đ" },
                ]} />

                {/* Group type */}
                <PreferenceSelect id="ai-group" label="Loại đoàn" value={groupType} onChange={setGroupType} options={[
                  { value: "company", label: "Doanh nghiệp / Team building" },
                  { value: "family", label: "Gia đình / Nghỉ dưỡng" },
                  { value: "adventure", label: "Bạn bè / Khám phá" },
                  { value: "couples", label: "Cặp đôi / Nghỉ dưỡng" },
                ]} />

                {/* Duration */}
                <PreferenceSelect id="ai-duration" label="Thời lượng" value={durationPref} onChange={setDurationPref} options={[
                  { value: "all", label: "Thời lượng linh hoạt" },
                  { value: "short", label: "2 ngày 1 đêm" },
                  { value: "medium", label: "3 ngày 2 đêm" },
                  { value: "long", label: "Từ 4 ngày 3 đêm" },
                ]} />
              </div>

              {/* Free-text wishes */}
              <div>
                <label htmlFor="ai-custom-wish" className="block text-sm font-medium text-slate-700 mb-2">
                  Yêu cầu thêm <span className="font-normal text-slate-500">(tùy chọn)</span>
                </label>
                <Textarea
                  id="ai-custom-wish"
                  rows={3}
                  value={customWish}
                  onChange={(e) => setCustomWish(e.target.value)}
                  placeholder="Ví dụ: Khách sạn 4 sao gần biển, có bữa chay và xe đón tại sân bay."
                  className="w-full resize-y rounded-md border-slate-300 bg-white px-3 py-3 text-sm leading-6 focus-visible:ring-[#075985]"
                />
              </div>

              <div className="border-t border-slate-200 pt-5 flex justify-end">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="h-11 w-full sm:w-auto bg-[#075985] hover:bg-[#0C4A6E] text-white font-semibold text-sm px-6 rounded-md"
                >
                  {isAnalyzing ? "Đang tìm tour…" : "Tìm tour phù hợp"}
                </Button>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl p-3 px-4">
                <div className="flex items-center gap-2 text-[#0C4A6E] text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-[#075985]" />
                  <span>AI đã phân tích và tìm thấy {results.length} tour tối ưu nhất cho đoàn của bạn!</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#075985] hover:text-[#0C4A6E] font-bold underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Điều chỉnh tiêu chí
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map(({ tour, matchScore, matchReasons, aiSummary }) => (
                  <div
                    key={tour.id}
                    onClick={() => {
                      onClose();
                      onSelectTour(tour);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClose();
                        onSelectTour(tour);
                      }
                    }}
                    aria-label={`Xem chi tiết tour ${tour.name}`}
                    className="bg-white rounded-xl border border-slate-200 hover:border-[#075985] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#075985]"
                  >
                    <div>
                      {/* Image & Match Score Badge */}
                      <div className="relative h-40">
                        <img
                          src={tour.image || (tour.images && tour.images[0])}
                          alt={tour.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 right-2.5 bg-[#075985] text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-yellow-300" />
                          <span>{matchScore}% Phù hợp</span>
                        </div>
                        <div className="absolute bottom-2.5 left-2.5 bg-black/75 text-white text-[11px] px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <span>{tour.destination}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-[#075985]">{tour.companyName || "Công ty lữ hành"}</span>
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3 h-3 fill-amber-400" />
                            {tour.rating}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                          {tour.name}
                        </h4>

                        {/* AI insight box */}
                        <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg p-2.5 text-[11px] text-slate-700">
                          <p className="font-semibold text-[#0C4A6E] flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3 text-[#075985]" />
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
                            onClick={(e) => {
                              e.stopPropagation();
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                onBookTour(tour);
                              }}
                              className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-8 px-3"
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
