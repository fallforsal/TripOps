import { useState } from "react";
import { DailyItinerary, Location, TourMeal } from "@/app/types";
import {
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Compass,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Utensils,
  Clock,
  Layers,
  Check,
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

interface AIItineraryPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyItinerary: (generated: {
    name: string;
    destination: string;
    duration: string;
    highlights: string[];
    description: string;
    itinerary: DailyItinerary[];
  }) => void;
  initialDestination?: string;
}

export function AIItineraryPlannerModal({
  isOpen,
  onClose,
  onApplyItinerary,
  initialDestination = "",
}: AIItineraryPlannerModalProps) {
  const [destination, setDestination] = useState(initialDestination || "Đà Lạt");
  const [daysCount, setDaysCount] = useState<number>(3);
  const [targetAudience, setTargetAudience] = useState<string>("company");
  const [theme, setTheme] = useState<string>("nature_teambuilding");
  const [extraRequests, setExtraRequests] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<{
    name: string;
    destination: string;
    duration: string;
    highlights: string[];
    description: string;
    itinerary: DailyItinerary[];
  } | null>(null);

  const quickDestinations = [
    "Đà Lạt",
    "Phú Quốc",
    "Hà Giang",
    "Đà Nẵng - Hội An",
    "Hạ Long",
    "Nha Trang",
    "Sapa",
  ];

  const handleGenerate = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const nights = Math.max(1, daysCount - 1);
      const durationStr = `${daysCount} ngày ${nights} đêm`;

      // Generate context-aware tour content based on destination
      let tourName = `Hành Trình Khám Phá ${destination} - Gắn Kết Doanh Nghiệp ${durationStr}`;
      let highlights = [
        `Khám phá trọn vẹn cảnh sắc thiên nhiên nổi tiếng tại ${destination}`,
        `Chương trình Teambuilding gắn kết tinh thần đồng đội chuyên nghiệp`,
        `Thưởng thức ẩm thực đặc sản bản địa độc đáo và tiệc Gala ấm cúng`,
        `Lưu trú chuẩn 3-4 sao với dịch vụ hỗ trợ chu đáo từ đối tác địa phương`,
      ];
      let description = `Chuyến du lịch đoàn được AI tối ưu hóa lộ trình dành riêng cho doanh nghiệp tại ${destination}. Lịch trình kết hợp hài hòa giữa các điểm tham quan biểu tượng, thời gian thư giãn nghỉ ngơi và hoạt động tập thể sôi nổi giúp tối đa hóa trải nghiệm của từng thành viên.`;

      // Build daily itineraries dynamically
      const itinerary: DailyItinerary[] = [];

      for (let day = 1; day <= daysCount; day++) {
        let dayTitle = `Ngày ${day}: Khám phá ${destination} - Chặng ${day}`;
        let dayDesc = `Khởi hành theo lịch trình, tham gia các hoạt động trải nghiệm đặc sắc và thưởng thức ẩm thực bản địa.`;
        let locations: Location[] = [];

        if (destination.toLowerCase().includes("đà lạt")) {
          if (day === 1) {
            dayTitle = `Ngày 1: Đón đoàn - Quảng trường Lâm Viên - Hồ Xuân Hương`;
            dayDesc = `Đón đoàn tại điểm hẹn, di chuyển tham quan biểu tượng Đà Lạt và thưởng thức lẩu gà lá é.`;
            locations = [
              {
                id: `ai-loc-1-1`,
                name: "Quảng trường Lâm Viên & Nụ hoa Atiso",
                address: "Trần Quốc Toản, Phường 10, TP. Đà Lạt",
                time: "09:30",
                latitude: 11.9367,
                longitude: 108.4452,
                image: "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?w=400",
                notes: "Check-in chụp ảnh kỷ niệm toàn đoàn với biểu tượng bông Atiso khổng lồ",
              },
              {
                id: `ai-loc-1-2`,
                name: "Dạo quanh Hồ Xuân Hương & Vườn hoa thành phố",
                address: "Đường Bà Huyện Thanh Quan, Phường 8, Đà Lạt",
                time: "14:30",
                latitude: 11.9404,
                longitude: 108.4385,
                image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400",
                notes: "Đi dạo ngắm cảnh chiều Đà Lạt, đạp vịt hoặc uống cafe ven hồ",
              },
            ];
          } else if (day === 2) {
            dayTitle = `Ngày 2: Teambuilding Rừng Thông - Đỉnh Langbiang Huyền Thoại`;
            dayDesc = `Chương trình trò chơi tập thể gắn kết đồng đội tại thung lũng, buổi chiều chinh phục nóc nhà Đà Lạt.`;
            locations = [
              {
                id: `ai-loc-2-1`,
                name: "Thung lũng Vàng & Rừng Thông Xanh",
                address: "Thôn Lạt Đồng, Lạc Dương, Lâm Đồng",
                time: "08:00",
                latitude: 11.9889,
                longitude: 108.3842,
                image: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=400",
                notes: "Tổ chức hoạt động Teambuilding gắn kết tinh thần đoàn kết",
              },
              {
                id: `ai-loc-2-2`,
                name: "Đỉnh Núi Langbiang - Xe Jeep địa hình",
                address: "Thị trấn Lạc Dương, Lâm Đồng",
                time: "14:00",
                latitude: 12.0458,
                longitude: 108.4358,
                image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
                notes: "Trải nghiệm xe Jeep leo dốc ngắm trọn vẹn toàn cảnh TP. Đà Lạt từ trên cao",
              },
            ];
          } else {
            dayTitle = `Ngày ${day}: Chợ Đà Lạt - Mua sắm đặc sản - Tiễn đoàn`;
            dayDesc = `Thưởng thức cafe sáng, mua sắm mứt trà và hoa tươi tại chợ Đà Lạt trước khi chia tay.`;
            locations = [
              {
                id: `ai-loc-${day}-1`,
                name: "Chợ Đà Lạt & Cơ sở mứt L'angfarm",
                address: "Nguyễn Thị Minh Khai, Phường 1, Đà Lạt",
                time: "08:30",
                latitude: 11.9424,
                longitude: 108.4376,
                image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
                notes: "Mua đặc sản mứt dâu tây, trà atiso, rượu cần về làm quà",
              },
            ];
          }
        } else if (destination.toLowerCase().includes("phú quốc")) {
          if (day === 1) {
            dayTitle = `Ngày 1: Đón đoàn - Dinh Cậu - Làng chài Hàm Ninh`;
            locations = [
              {
                id: `ai-loc-1-1`,
                name: "Dinh Cậu & Ngắm hoàng hôn biển Tây",
                address: "Khu phố 2, Dương Đông, Phú Quốc",
                time: "15:30",
                latitude: 10.2173,
                longitude: 103.9572,
                image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
              },
            ];
          } else if (day === 2) {
            dayTitle = `Ngày 2: Cano 4 Đảo Nam Phú Quốc & Teambuilding Bãi Sao`;
            locations = [
              {
                id: `ai-loc-2-1`,
                name: "Hòn Mây Rút - Lặn ngắm san hô tự nhiên",
                address: "Quần đảo An Thới, Nam Phú Quốc",
                time: "08:30",
                latitude: 10.0215,
                longitude: 104.0153,
                image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400",
              },
              {
                id: `ai-loc-2-2`,
                name: "Bãi Sao cát trắng & Hoạt động Teambuilding bãi biển",
                address: "Ấp Bãi Sao, An Thới, Phú Quốc",
                time: "14:30",
                latitude: 10.0521,
                longitude: 104.0321,
                image: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400",
              },
            ];
          } else {
            dayTitle = `Ngày ${day}: Khám phá Grand World Phú Quốc - Tiễn sân bay`;
            locations = [
              {
                id: `ai-loc-${day}-1`,
                name: "Thành phố không ngủ Grand World",
                address: "Gành Dầu, Phú Quốc, Kiên Giang",
                time: "09:00",
                latitude: 10.3245,
                longitude: 103.8562,
                image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400",
              },
            ];
          }
        } else {
          // Generic high quality template
          dayTitle = `Ngày ${day}: Trải nghiệm điểm nhấn ${destination} (Chặng ${day})`;
          locations = [
            {
              id: `ai-loc-${day}-1`,
              name: `Điểm tham quan trung tâm ${destination} - Buổi sáng`,
              address: `Khu du lịch trung tâm, ${destination}`,
              time: "08:30",
              latitude: 12.0,
              longitude: 108.0,
              notes: `Tham quan thắng cảnh tiêu biểu nhất của ${destination}`,
            },
            {
              id: `ai-loc-${day}-2`,
              name: `Không gian văn hóa & trải nghiệm bản địa - Buổi chiều`,
              address: `Khu bảo tồn văn hoá, ${destination}`,
              time: "14:00",
              latitude: 12.05,
              longitude: 108.05,
              notes: `Giao lưu văn hoá và chụp hình lưu niệm tập thể`,
            },
          ];
        }

        const meals: TourMeal[] = [
          {
            type: "breakfast",
            serviceName: day === 1 ? "Ăn sáng tự túc / trên đường đi" : `Buffet sáng tại khách sạn`,
            pricePerPerson: 50000,
          },
          {
            type: "lunch",
            serviceName: `Bữa trưa đặc sản vùng miền tại nhà hàng địa phương`,
            pricePerPerson: 150000,
          },
          {
            type: "dinner",
            serviceName: day === daysCount - 1 ? `Tiệc tối Gala Dinner ấm cúng toàn đoàn` : `Bữa tối ẩm thực truyền thống`,
            pricePerPerson: 200000,
          },
        ];

        itinerary.push({
          id: `day-${day}`, date: "",
          day,
          title: dayTitle,
          description: dayDesc,
          locations,
          meals,
        });
      }

      setGeneratedData({
        name: tourName,
        destination,
        duration: durationStr,
        highlights,
        description,
        itinerary,
      });

      setIsGenerating(false);
    }, 1100);
  };

  const handleApply = () => {
    if (!generatedData) return;
    onApplyItinerary(generatedData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        {/* Header with AI Gradient */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-amber-200">
                  AI Itinerary Architect
                </span>
                <span className="text-xs text-white/80">· Dành cho Công ty Lữ hành</span>
              </div>
              <h2 className="text-xl font-extrabold mt-0.5">Lên Lịch Trình Tour Tự Động Bằng AI</h2>
            </div>
          </div>
          <p className="text-xs text-white/90 mt-2 max-w-2xl">
            Tự động khởi tạo cấu trúc lịch trình nhiều ngày chuyên nghiệp, tích hợp giờ giấc di chuyển hợp lý, gợi ý các bữa ăn và điểm tham quan phù hợp cho khách đoàn.
          </p>
        </div>

        <div className="p-6 space-y-6 bg-slate-50">
          {!generatedData ? (
            /* Input Settings */
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
              {/* Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#075985]" />
                  Điểm đến của Tour
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ví dụ: Đà Lạt, Phú Quốc, Hà Giang, Đà Nẵng..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-[#075985] focus:outline-hidden mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] text-slate-400 self-center mr-1">Gợi ý nhanh:</span>
                  {quickDestinations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDestination(d)}
                      className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                        destination === d
                          ? "bg-[#075985] text-white font-bold"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid configs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Số ngày lịch trình
                  </label>
                  <select
                    value={daysCount}
                    onChange={(e) => setDaysCount(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-[#075985] focus:outline-hidden"
                  >
                    <option value={2}>2 Ngày 1 Đêm (Cuối tuần)</option>
                    <option value={3}>3 Ngày 2 Đêm (Phổ biến nhất)</option>
                    <option value={4}>4 Ngày 3 Đêm (Trọn gói)</option>
                    <option value={5}>5 Ngày 4 Đêm (Dài ngày)</option>
                  </select>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#F97316]" />
                    Đối tượng du khách
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-[#075985] focus:outline-hidden"
                  >
                    <option value="company">Đoàn Doanh nghiệp & Teambuilding</option>
                    <option value="family">Gia đình nhiều thế hệ</option>
                    <option value="young">Nhóm trẻ khám phá & mạo hiểm</option>
                    <option value="vip">Đoàn VIP / Nghỉ dưỡng cao cấp</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-pink-600" />
                    Phong cách chủ đạo
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:ring-2 focus:ring-[#075985] focus:outline-hidden"
                  >
                    <option value="nature_teambuilding">Thiên nhiên & Teambuilding</option>
                    <option value="culture_food">Văn hoá bản địa & Ẩm thực</option>
                    <option value="beach_leisure">Biển đảo & Nghỉ dưỡng</option>
                    <option value="trekking">Trekking & Trải nghiệm mới lạ</option>
                  </select>
                </div>
              </div>

              {/* Extra wishes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Ghi chú hoặc yêu cầu lịch trình riêng cho AI (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={extraRequests}
                  onChange={(e) => setExtraRequests(e.target.value)}
                  placeholder="Ví dụ: Buổi tối ngày 2 cần tiệc BBQ ngoài trời, hạn chế di chuyển dốc cao..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3.5 py-2.5 bg-white focus:ring-2 focus:ring-[#075985] focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !destination.trim()}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>AI đang kiến tạo lịch trình...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Kiến Tạo Lịch Trình Với AI</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Result Preview */
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 px-4 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã tạo thành công lịch trình {generatedData.itinerary.length} ngày cho "{generatedData.destination}"!</span>
                </div>
                <button
                  onClick={() => setGeneratedData(null)}
                  className="text-xs text-[#075985] hover:text-blue-900 font-bold underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Tạo lại cấu hình khác
                </button>
              </div>

              {/* Proposed Tour Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                    Tên Tour Đề Xuất
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{generatedData.name}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{generatedData.description}</p>

                {/* Highlights */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
                    Điểm nhấn nổi bật (Highlights)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {generatedData.highlights.map((h, i) => (
                      <div key={i} className="text-xs text-slate-700 flex items-start gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Day-by-day Itinerary Accordions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Chi tiết {generatedData.itinerary.length} ngày lịch trình đề xuất
                </h4>

                {generatedData.itinerary.map((day) => (
                  <div key={day.day} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-[#E0F2FE] text-blue-800 text-xs font-extrabold flex items-center justify-center">
                          {day.day}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900">{day.title}</h5>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {day.locations.length} điểm tham quan
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 italic">{day.description}</p>

                    {/* Locations */}
                    <div className="space-y-2">
                      {day.locations.map((loc, lIdx) => (
                        <div key={lIdx} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-start gap-2.5">
                          <span className="text-[11px] font-mono font-bold bg-white text-[#075985] border border-[#CBD5E1] px-1.5 py-0.5 rounded shrink-0">
                            {loc.time || "08:30"}
                          </span>
                          <div className="text-xs">
                            <span className="font-bold text-slate-800 block">{loc.name}</span>
                            <span className="text-slate-500 text-[11px] block">{loc.address}</span>
                            {loc.notes && <span className="text-indigo-600 text-[11px] block mt-0.5">📌 {loc.notes}</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Meals */}
                    {day.meals && day.meals.length > 0 && (
                      <div className="bg-amber-50/60 rounded-lg p-2.5 border border-amber-100 text-xs text-amber-900 flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px]">
                          <strong>Bữa ăn đề xuất:</strong>{" "}
                          {day.meals.map((m) => `${m.type === "breakfast" ? "Sáng" : m.type === "lunch" ? "Trưa" : "Tối"}: ${m.serviceName}`).join(" • ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <Button variant="outline" onClick={() => setGeneratedData(null)} className="text-xs">
                  Chỉnh sửa yêu cầu
                </Button>
                <Button
                  onClick={handleApply}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Áp Dụng Vào Form Tour Ngay</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
