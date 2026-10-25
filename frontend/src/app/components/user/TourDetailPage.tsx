import { useState, useEffect } from "react";
import {
  Tour,
  Service,
  TourHotel,
  CustomHotelChange,
  CustomLocationChange,
  CustomMealChange,
} from "@/app/types";
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Utensils,
  ChevronDown,
  ChevronUp,
  Info,
  Edit3,
  RefreshCw,
  Sun,
  UtensilsCrossed,
  Phone,
  Mail,
  Share2,
  Heart,
  Sparkles,
  Handshake,
  ShieldCheck,
  Check,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { mockUsers } from "@/app/data/mockData";
import { ServiceBlogDetailModal } from "@/app/components/service/ServiceBlogDetailModal";
import { formatTourCode } from "@/app/components/ui/utils";

export interface TourDetailCustomData {
  customHotelChanges?: CustomHotelChange[];
  customMealChanges?: CustomMealChange[];
  locationChanges?: CustomLocationChange[];
  hasLocationCustomization?: boolean;
  estimatedPrice?: number;
}

interface TourDetailPageProps {
  tour: Tour;
  services: Service[];
  currentUser?: { id: string; name: string } | null;
  onBack: () => void;
  onBookNow?: (tour: Tour, customData?: TourDetailCustomData) => void;
  onShowLogin?: () => void;
  isAdmin?: boolean;
  onToggleHideTour?: (tourId: string, reason?: string) => void;
  onDeleteTour?: (tourId: string) => void;
}

type TabId = "program" | "regulations" | "pricing" | "custom" | "reviews";

const TABS: { id: TabId; label: string }[] = [
  { id: "program", label: "Chương trình tour" },
  { id: "regulations", label: "Quy định" },
  { id: "pricing", label: "Bảng giá" },
  { id: "custom", label: "Lịch trình tùy chỉnh" },
  { id: "reviews", label: "Nhận xét" },
];

const MEAL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  breakfast: { label: "Sáng", icon: Sun, color: "text-amber-600 bg-amber-50" },
  lunch: { label: "Trưa", icon: Utensils, color: "text-emerald-600 bg-emerald-50" },
  dinner: { label: "Tối", icon: UtensilsCrossed, color: "text-[#F97316] bg-[#F0F9FF]" },
};

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

// -------- Program Tab --------
function ProgramTab({ tour }: { tour: Tour }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(tour.itinerary.slice(0, 1).map((d) => d.id)),
  );

  const toggle = (id: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Operation period */}
      {tour.operationPeriod && (
        <section className="bg-[#F0F9FF] border border-blue-100 rounded-xl p-4">
          <h3 className="text-sm font-bold text-[#075985] uppercase tracking-wide mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Thời gian hoạt động
          </h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <span className="text-gray-500">Mùa tour / Thời gian hoạt động:</span>{" "}
              <strong>{tour.operationPeriod}</strong>
            </p>
          </div>
        </section>
      )}

      {/* Điểm khởi hành */}
      {(tour.departureLocation || tour.departureCity) && (
        <section className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Điểm khởi hành
          </h3>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <span className="text-gray-500">Nơi xuất phát / Khởi hành:</span>{" "}
              <strong>{tour.departureLocation || tour.departureCity}</strong>
            </p>
          </div>
        </section>
      )}

      {/* Highlights */}
      {tour.highlights.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5" />
            ĐIỂM NỔI BẬT:
          </h3>
          <ul className="space-y-1.5">
            {tour.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span dangerouslySetInnerHTML={{ __html: h }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Day-by-day itinerary */}
      <section>
        <h3 className="text-lg font-bold text-red-600 mb-4">LỊCH TRÌNH CHI TIẾT:</h3>
        <div className="space-y-3">
          {tour.itinerary.map((day) => {
            const isOpen = expandedDays.has(day.id);
            return (
              <div key={day.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggle(day.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        NGÀY {day.day}: {day.title.toUpperCase()}
                      </p>
                      {tour.isCoHosted && tour.coHosts && (() => {
                        const dayCompanies = new Map<string, string>();
                        if (day.createdByCompanyId) {
                          dayCompanies.set(day.createdByCompanyId, day.createdByCompanyName || "Công ty điều phối");
                        }
                        if (day.hotel?.createdByCompanyId) {
                          dayCompanies.set(day.hotel.createdByCompanyId, day.hotel.createdByCompanyName || "Công ty lưu trú");
                        }
                        day.meals?.forEach((m) => {
                          if (m.createdByCompanyId) {
                            dayCompanies.set(m.createdByCompanyId, m.createdByCompanyName || "Công ty ẩm thực");
                          }
                        });
                        day.locations?.forEach((loc) => {
                          if (loc.createdByCompanyId) {
                            dayCompanies.set(loc.createdByCompanyId, loc.createdByCompanyName || "Công ty tham quan");
                          }
                        });

                        if (dayCompanies.size === 0) {
                          tour.coHosts.forEach((ch) => {
                            if (ch.assignedDays?.includes(day.day)) {
                              dayCompanies.set(ch.companyId, ch.companyName);
                            }
                          });
                        }

                        const list = Array.from(dayCompanies.entries());
                        if (list.length > 1) {
                          return (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                              <Handshake className="w-3 h-3 text-amber-700" />
                              🤝 Đồng phụ trách ({list.map(([_, n]) => n).join(" & ")})
                            </span>
                          );
                        }

                        if (list.length === 1) {
                          const [_, cName] = list[0];
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F97316]/15 text-purple-800 border border-[#F97316]/30 flex items-center gap-1 shadow-2xs">
                              <Handshake className="w-3 h-3" />
                              Phụ trách: {cName}
                            </span>
                          );
                        }

                        return null;
                      })()}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 py-4 space-y-3.5">
                    <p className="text-gray-700 leading-relaxed text-sm">{day.description}</p>
                    {day.locations.length > 0 && (
                      <div className="space-y-1.5">
                        {day.locations.map((loc) => (
                          <div key={loc.id} className="flex items-center justify-between text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-gray-900">{loc.name}</span>
                            </div>
                            {loc.createdByCompanyName && (
                              <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded font-normal">
                                Tạo bởi: {loc.createdByCompanyName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chế độ ẩm thực & Bữa ăn (Chỗ ăn) trong ngày */}
                    {day.meals && day.meals.length > 0 && (
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                          Chế độ ẩm thực &amp; Bữa ăn (Chỗ ăn)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {day.meals.map((meal, mIdx) => {
                            const mealType = meal.type;
                            const label = mealType === "breakfast" ? "Ăn sáng" : mealType === "lunch" ? "Ăn trưa" : "Ăn tối";
                            const isBreakfast = mealType === "breakfast";
                            const isLunch = mealType === "lunch";
                            return (
                              <div
                                key={mIdx}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                                  isBreakfast
                                    ? "bg-amber-50/60 border-amber-200/80"
                                    : isLunch
                                    ? "bg-emerald-50/60 border-emerald-200/80"
                                    : "bg-[#F0F9FF]/60 border-[#F97316]/30/80"
                                }`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isBreakfast
                                      ? "bg-amber-100 text-amber-700"
                                      : isLunch
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-[#F97316]/15 text-[#EA580C]"
                                  }`}
                                >
                                  {isBreakfast ? <Sun className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-bold text-gray-900">{label}</p>
                                    {meal.createdByCompanyName && (
                                      <span className="text-[10px] text-emerald-700 bg-white border border-emerald-200 px-1 py-0.2 rounded font-normal">
                                        Tạo bởi: {meal.createdByCompanyName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-800 font-semibold truncate">
                                    {meal.serviceName || "Nhà hàng theo chương trình"}
                                  </p>
                                  {meal.description && (
                                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                                      {meal.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}


                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {tour.companyNote && (
        <p className="text-center text-red-600 font-bold text-lg py-4">{tour.companyNote}</p>
      )}
    </div>
  );
}

// -------- Regulations Tab --------
function RegulationsTab({ tour }: { tour: Tour }) {
  return (
    <div className="space-y-8">
      {tour.inclusions && tour.inclusions.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            GIÁ TOUR BAO GỒM:
          </h3>
          <ul className="space-y-2">
            {tour.inclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tour.exclusions && tour.exclusions.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            GIÁ TOUR KHÔNG BAO GỒM:
          </h3>
          <ul className="space-y-2">
            {tour.exclusions.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {tour.regulations && tour.regulations.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            ĐIỀU KIỆN & LƯU Ý:
          </h3>
          <ul className="space-y-2">
            {tour.regulations.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tour.companyNote && (
        <p className="text-center text-red-600 font-bold text-lg py-6 border-t border-gray-200">
          {tour.companyNote}
        </p>
      )}
    </div>
  );
}

// -------- Pricing Tab --------
function PricingTab({ tour }: { tour: Tour }) {
  if (!tour.priceTable || tour.priceTable.length === 0) {
    return <div className="text-gray-500 py-8 text-center">Chưa có bảng giá chi tiết.</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-red-600">BẢNG GIÁ CHI TIẾT:</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Loại khách</th>
              
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Giá tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tour.priceTable.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-4 py-3 font-medium text-gray-900">{row.ageGroupLabel ?? row.ageGroup}</td>
                
                <td className="px-4 py-3 text-right font-bold text-[#075985]">
                  {row.price === 0 ? "Miễn phí" : formatVND(row.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Lưu ý:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Giá trên là giá cơ bản. Xem "Lịch trình tùy chỉnh" để tính giá nâng cấp.</li>
          <li>Giá dịp Tết/lễ có thể tăng theo lịch khởi hành thực tế.</li>
        </ul>
      </div>
    </div>
  );
}

// -------- Custom Tab --------

interface HotelChoice {
  mode: "system" | "custom" | "provider";
  systemName?: string;
  systemStars?: number;
  systemPricePerNight?: number;
  priceDifference?: number;
  customName?: string;
  customAddress?: string;
  customNote?: string;
  // Platform provider metadata
  isProviderService?: boolean;
  serviceId?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  providerRepresentative?: string;
  serviceImage?: string;
  latitude?: number;
  longitude?: number;
}

interface MealChoice {
  mealType: "breakfast" | "lunch" | "dinner";
  mode: "system" | "custom" | "provider";
  systemName?: string;
  systemPrice?: number;
  priceDifference?: number;
  customName?: string;
  // Platform provider metadata
  isProviderService?: boolean;
  serviceId?: string;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  providerRepresentative?: string;
  serviceImage?: string;
  latitude?: number;
  longitude?: number;
}

interface LocationChoice {
  locationId: string;
  locationName: string;
  changed: boolean;
  changeRequest: string;
}

interface DestinationHotelState {
  destination: string; // city/stop name, e.g. "Đà Lạt"
  nightCount: number;
  defaultHotel?: TourHotel;
  hotelChoice: HotelChoice;
}

interface DayState {
  locations: LocationChoice[];
  mealChoices: MealChoice[];
}

// Derive distinct destination groups from tour.hotels or itinerary
function getDestinationGroups(tour: Tour): DestinationHotelState[] {
  // If tour has explicit hotels array (supports multiple hotels per tour)
  if (tour.hotels && tour.hotels.length > 0) {
    return tour.hotels.map((h, idx) => ({
      destination: h.destination || (tour.destination ? `${tour.destination} (${idx + 1})` : `Chặng ${idx + 1}`),
      nightCount: h.nights || 1,
      defaultHotel: h,
      hotelChoice: {
        mode: "system",
        systemName: h.name,
        systemStars: h.stars || 4,
        systemPricePerNight: h.pricePerNight,
      },
    }));
  }

  const globalDefault = tour.itinerary.find((d) => d.hotel)?.hotel;
  const mainDest = tour.destination ?? "Điểm đến";

  // Build ordered list of (destination, day) pairs
  const dayDests = tour.itinerary.map((day) => ({
    dest: day.destinationCity ?? mainDest,
    hotel: day.hotel,
  }));

  // Group consecutive days with the same destination
  const groups: DestinationHotelState[] = [];
  dayDests.forEach((entry, idx) => {
    const last = groups[groups.length - 1];
    // Nights = days spent sleeping there (all except last day of tour)
    const isLastDay = idx === dayDests.length - 1;
    if (last && last.destination === entry.dest) {
      if (!isLastDay) last.nightCount++;
      if (!last.defaultHotel) last.defaultHotel = entry.hotel;
    } else {
      const defHotel = entry.hotel ?? globalDefault;
      groups.push({
        destination: entry.dest,
        nightCount: isLastDay ? 0 : 1,
        defaultHotel: defHotel,
        hotelChoice: defHotel
          ? { mode: "system", systemName: defHotel.name, systemStars: defHotel.stars || 4, systemPricePerNight: defHotel.pricePerNight }
          : { mode: "system", systemName: "", systemStars: 0, systemPricePerNight: 0 },
      });
    }
  });
  return groups.filter((g) => g.nightCount > 0);
}

function CustomTab({
  tour,
  services = [],
  basePrice,
  onBookCustom,
  onCustomChange,
}: {
  tour: Tour;
  services?: Service[];
  basePrice: number;
  onBookCustom?: (customData: TourDetailCustomData) => void;
  onCustomChange?: (customData: TourDetailCustomData, currentPrice: number) => void;
}) {
  const initDestHotels = (): Record<string, DestinationHotelState> => {
    const groups = getDestinationGroups(tour);
    const s: Record<string, DestinationHotelState> = {};
    groups.forEach((g) => { s[g.destination] = g; });
    return s;
  };

  const initDays = (): Record<string, DayState> => {
    const s: Record<string, DayState> = {};
    tour.itinerary.forEach((day) => {
      s[day.id] = {
        locations: day.locations.map((loc) => ({
          locationId: loc.id,
          locationName: loc.name,
          changed: false,
          changeRequest: "",
        })),
        mealChoices: (day.meals ?? [])
          .map((m) => ({
            mealType: m.type as "breakfast" | "lunch" | "dinner",
            mode: "system" as const,
            systemName: m.serviceName ?? "",
            systemPrice: m.pricePerPerson ?? 0,
          })),
      };
    });
    return s;
  };

  const [destHotels, setDestHotels] = useState(initDestHotels);
  const [days, setDays] = useState(initDays);
  const [expandedHotelDest, setExpandedHotelDest] = useState<string | null>("Đà Lạt");
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null); // "dayId-mealType"

  // Service Blog Modal state
  const [modalService, setModalService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    type: "hotel" | "meal";
    destination?: string;
    dayId?: string;
    mealType?: "breakfast" | "lunch" | "dinner";
  } | null>(null);

  const updateDestHotel = (dest: string, choice: HotelChoice) =>
    setDestHotels((prev) => ({ ...prev, [dest]: { ...prev[dest], hotelChoice: choice } }));

  const updateDay = (dayId: string, update: Partial<DayState>) =>
    setDays((prev) => ({ ...prev, [dayId]: { ...prev[dayId], ...update } }));

  const updateLocation = (dayId: string, locId: string, update: Partial<LocationChoice>) => {
    setDays((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        locations: prev[dayId].locations.map((l) =>
          l.locationId === locId ? { ...l, ...update } : l,
        ),
      },
    }));
  };

  const updateMealChoice = (dayId: string, mealType: "breakfast" | "lunch" | "dinner", update: Partial<MealChoice>) => {
    setDays((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        mealChoices: prev[dayId].mealChoices.map((m) =>
          m.mealType === mealType ? { ...m, ...update } : m,
        ),
      },
    }));
  };

  const handleSelectProviderHotel = (dest: string, serv: Service) => {
    const providerUser = mockUsers.find(
      (u) =>
        u.id === serv.providerId ||
        u.email === "provider.heritage@gmail.com" ||
        u.email === "provider@demo.com" ||
        u.aliasEmails?.includes("provider.heritage@gmail.com") ||
        u.aliasEmails?.includes("provider@demo.com")
    );
    updateDestHotel(dest, {
      mode: "provider",
      systemName: serv.name,
      systemStars: serv.stars || 4,
      systemPricePerNight: serv.pricePerPerson || serv.price,
      customAddress: serv.street ? `${serv.street}, ${serv.ward || ""}, ${serv.province || serv.location}` : serv.location,
      customNote: `Dịch vụ đối tác nền tảng: ${serv.name} (${serv.providerName})`,
      isProviderService: true,
      serviceId: serv.id,
      providerId: serv.providerId,
      providerName: serv.providerName,
      providerPhone: providerUser?.businessPhone || providerUser?.phone || "0263 3825 444",
      providerEmail: providerUser?.businessEmail || providerUser?.email || "provider.heritage@gmail.com",
      providerAddress: providerUser?.businessAddress || providerUser?.street || serv.location,
      providerRepresentative: providerUser?.name || "Nguyễn Thị Mai (Heritage Provider)",
      serviceImage: serv.image,
      latitude: serv.latitude,
      longitude: serv.longitude,
    });
  };

  const handleSelectProviderMeal = (dayId: string, mealType: "breakfast" | "lunch" | "dinner", serv: Service) => {
    const providerUser = mockUsers.find(
      (u) =>
        u.id === serv.providerId ||
        u.email === "provider.heritage@gmail.com" ||
        u.email === "provider@demo.com" ||
        u.aliasEmails?.includes("provider.heritage@gmail.com") ||
        u.aliasEmails?.includes("provider@demo.com")
    );
    updateMealChoice(dayId, mealType, {
      mode: "provider",
      systemName: serv.name,
      systemPrice: serv.pricePerPerson || serv.price,
      customName: serv.name,
      isProviderService: true,
      serviceId: serv.id,
      providerId: serv.providerId,
      providerName: serv.providerName,
      providerPhone: providerUser?.businessPhone || providerUser?.phone || "0263 3825 444",
      providerEmail: providerUser?.businessEmail || providerUser?.email || "provider.heritage@gmail.com",
      providerAddress: providerUser?.businessAddress || providerUser?.street || serv.location,
      providerRepresentative: providerUser?.name || "Nguyễn Thị Mai (Heritage Provider)",
      serviceImage: serv.image,
      latitude: serv.latitude,
      longitude: serv.longitude,
    });
  };

  const hasAnyLocationChange = Object.values(days).some((d) =>
    d.locations.some((l) => l.changed && l.changeRequest.trim()),
  );

  const hasAnyCustomHotel = Object.values(destHotels).some(
    (n) => n.hotelChoice.mode === "custom" || n.hotelChoice.mode === "provider"
  );

  // Tăng giá chênh lệch trực tiếp giữa khách sạn được chọn và khách sạn mặc định, không nhân theo số đêm
  const calcHotelDelta = (): number => {
    let delta = 0;
    Object.values(destHotels).forEach((g) => {
      const choice = g.hotelChoice;
      if (choice.mode === "system") {
        if (choice.priceDifference !== undefined) {
          delta += choice.priceDifference;
        } else if (g.defaultHotel && choice.systemPricePerNight !== undefined) {
          delta += choice.systemPricePerNight - g.defaultHotel.pricePerNight;
        }
      }
    });
    return delta;
  };

  const calcMealDelta = (): number => {
    let delta = 0;
    tour.itinerary.forEach((day) => {
      const dayState = days[day.id];
      dayState?.mealChoices.forEach((mc) => {
        if (mc.mode === "custom" || mc.mode === "provider") return;
        if (mc.priceDifference !== undefined) {
          delta += mc.priceDifference;
        } else {
          const defaultMeal = day.meals?.find((m) => m.type === mc.mealType);
          delta += (mc.systemPrice ?? 0) - (defaultMeal?.pricePerPerson ?? 0);
        }
      });
    });
    return delta;
  };

  const hasAnyCustomMeal = Object.values(days).some((d) =>
    d.mealChoices.some((m) => (m.mode === "custom" && Boolean(m.customName?.trim())) || m.mode === "provider")
  );
  const needsCompanyQuote = hasAnyLocationChange || hasAnyCustomHotel || hasAnyCustomMeal;
  const hotelDelta = calcHotelDelta();
  const mealDelta = calcMealDelta();
  const knownDelta = hotelDelta + mealDelta;
  const estimatedTotal = basePrice + knownDelta;

  // Tự động đồng bộ các lựa chọn tùy chỉnh và tổng giá dự kiến sang TourDetailPage (và sidebar)
  useEffect(() => {
    const customHotelChanges: CustomHotelChange[] = [];
    Object.values(destHotels).forEach((g) => {
      const choice = g.hotelChoice;
      const def = g.defaultHotel;
      const isCustomMode = choice.mode === "custom" && Boolean(choice.customName?.trim());
      const isProviderMode = choice.mode === "provider" && Boolean(choice.serviceId);
      const isSystemChanged =
        choice.mode === "system" &&
        Boolean(choice.systemName) &&
        Boolean(def) &&
        choice.systemName !== def?.name;

      if (isCustomMode || isProviderMode || isSystemChanged) {
        customHotelChanges.push({
          destination: g.destination,
          originalHotelName: def ? `${def.name} (${def.stars || 4}★)` : "Khách sạn mặc định của tour",
          originalPricePerNight: def?.pricePerNight ?? 0,
          newHotelName:
            choice.mode === "custom"
              ? (choice.customName || "Khách sạn tự đề xuất")
              : choice.mode === "provider"
              ? `${choice.systemName || "Khách sạn đối tác"}${choice.systemStars ? ` (${choice.systemStars}★)` : ""}`
              : `${choice.systemName} (${choice.systemStars ?? 4}★)`,
          mode: choice.mode,
          stars: choice.systemStars || 4,
          newPricePerNight: choice.systemPricePerNight,
          address: choice.customAddress,
          note: choice.customNote,
          isProviderService: choice.isProviderService,
          serviceId: choice.serviceId,
          providerId: choice.providerId,
          providerName: choice.providerName,
          providerPhone: choice.providerPhone,
          providerEmail: choice.providerEmail,
          providerAddress: choice.providerAddress,
          providerRepresentative: choice.providerRepresentative,
          serviceImage: choice.serviceImage,
          latitude: choice.latitude,
          longitude: choice.longitude,
        });
      }
    });

    const customMealChanges: CustomMealChange[] = [];
    tour.itinerary.forEach((day) => {
      const dayState = days[day.id];
      if (!dayState) return;
      dayState.mealChoices.forEach((mc) => {
        const defaultMeal = day.meals?.find((m) => m.type === mc.mealType);
        const isCustom = mc.mode === "custom" && Boolean(mc.customName?.trim());
        const isProvider = mc.mode === "provider" && Boolean(mc.serviceId);
        const isSystemChanged =
          mc.mode === "system" &&
          Boolean(mc.systemName) &&
          Boolean(defaultMeal?.serviceName) &&
          mc.systemName !== defaultMeal?.serviceName;

        if (isCustom || isProvider || isSystemChanged) {
          customMealChanges.push({
            dayNumber: day.day,
            mealType: mc.mealType,
            originalMealName: defaultMeal?.serviceName || "Nhà hàng theo tour",
            newMealName:
              mc.mode === "custom"
                ? (mc.customName || "Nhà hàng tự chọn")
                : mc.systemName || "",
            mode: mc.mode,
            pricePerPerson: mc.systemPrice,
            isProviderService: mc.isProviderService,
            serviceId: mc.serviceId,
            providerId: mc.providerId,
            providerName: mc.providerName,
            providerPhone: mc.providerPhone,
            providerEmail: mc.providerEmail,
            providerAddress: mc.providerAddress,
            providerRepresentative: mc.providerRepresentative,
            serviceImage: mc.serviceImage,
            latitude: mc.latitude,
            longitude: mc.longitude,
          });
        }
      });
    });

    const locationChanges: CustomLocationChange[] = [];
    tour.itinerary.forEach((day) => {
      const dayState = days[day.id];
      if (!dayState) return;
      const changedLocs = dayState.locations.filter((l) => l.changed && l.changeRequest.trim());
      changedLocs.forEach((changedLoc) => {
        locationChanges.push({
          dayId: day.id,
          dayNumber: day.day,
          locationId: changedLoc.locationId,
          originalLocationName: changedLoc.locationName,
          originalLocations: [changedLoc.locationName],
          requestedLocations: changedLoc.changeRequest.trim(),
          note: `Đổi "${changedLoc.locationName}" sang "${changedLoc.changeRequest.trim()}"`,
        });
      });
    });

    const hasRealCustomization =
      customHotelChanges.some((h) => h.mode !== "system") ||
      customMealChanges.some((m) => m.mode !== "system") ||
      locationChanges.length > 0;

    onCustomChange?.({
      customHotelChanges,
      customMealChanges,
      locationChanges,
      hasLocationCustomization: hasRealCustomization,
      estimatedPrice: estimatedTotal,
    }, estimatedTotal);
  }, [destHotels, days, basePrice, knownDelta]);

  const reset = () => { setDestHotels(initDestHotels()); setDays(initDays()); };

  return (
    <div className="space-y-6">
      {/* Price banner matching thaydoikhachsan.png */}
      <div className="rounded-2xl p-5 bg-[#075985] text-white shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-blue-100 font-medium">Giá cơ bản / người</p>
            <p className="text-3xl font-extrabold tracking-tight">{formatVND(basePrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100 font-medium">Tổng dự kiến / người</p>
            <p className="text-3xl font-extrabold tracking-tight">{formatVND(estimatedTotal)}</p>
            {needsCompanyQuote && (
              <span className="inline-block text-[11px] bg-amber-400 text-amber-950 font-semibold px-2 py-0.5 rounded mt-1">
                Lịch trình có yêu cầu tự nhập – chờ công ty báo giá
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Chọn khách sạn và tùy chỉnh lịch trình. Thay đổi địa điểm hoặc tự nhập khách sạn → công ty sẽ báo giá.
        </p>
        <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Đặt lại
        </Button>
      </div>

      {/* ===== HOTEL SECTION ===== */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#075985]" />
          Khách sạn lưu trú
        </h3>

        {Object.values(destHotels).map((group) => {
          const { destination, nightCount, defaultHotel: defHotel, hotelChoice: choice } = group;
          const isExpanded = expandedHotelDest === destination;
          const priceDiffPerNight = choice.priceDifference || 0;

          return (
            <div key={destination} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedHotelDest(isExpanded ? null : destination)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#F0F9FF] hover:bg-[#E0F2FE] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-[#075985] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{destination}</p>
                    <p className="text-xs text-gray-500">
                      {nightCount} đêm •{" "}
                      {choice.mode === "system"
                        ? `${choice.systemName ?? "Chưa chọn"}${choice.systemStars ? ` (${choice.systemStars}★)` : ""}`
                        : choice.mode === "provider"
                        ? `🌟 Đối tác: ${choice.systemName || "Khách sạn đối tác"}${choice.systemStars ? ` (${choice.systemStars}★)` : ""}`
                        : choice.customName
                          ? `Tự nhập: ${choice.customName}`
                          : "Tự nhập (chưa điền)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {choice.mode === "custom" && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      Tự nhập – chờ báo giá
                    </span>
                  )}
                  {choice.mode === "provider" && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Đối tác Nền tảng
                    </span>
                  )}
                  {choice.mode === "system" && (priceDiffPerNight !== 0) && (
                    <span className={`text-xs font-bold ${(choice.priceDifference ?? priceDiffPerNight) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {(choice.priceDifference ?? priceDiffPerNight) > 0 ? "+" : ""}{formatVND(choice.priceDifference ?? priceDiffPerNight)}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-4 space-y-4">
                  {/* Mode tabs (Tour / Provider / Custom) */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => updateDestHotel(destination, { ...choice, mode: "system" })}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        choice.mode === "system"
                          ? "bg-white text-[#075985] shadow-xs border border-[#CBD5E1]"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Khách sạn theo Tour
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDestHotel(destination, { ...choice, mode: "provider" })}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        choice.mode === "provider"
                          ? "bg-white text-indigo-700 shadow-xs border border-indigo-300"
                          : "text-gray-600 hover:text-indigo-700"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      🌟 Đối tác Nền tảng
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDestHotel(destination, { ...choice, mode: "custom" })}
                      className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        choice.mode === "custom"
                          ? "bg-white text-amber-700 shadow-xs border border-amber-300"
                          : "text-gray-600 hover:text-amber-700"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Tự đề xuất
                    </button>
                  </div>

                  {/* System / Configured hotel cards */}
                  {choice.mode === "system" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(() => {
                        const options: Array<{ name: string; stars?: number; description?: string; diff: number; pricePerNight?: number }> = [];

                        // 1. Default Tour Hotel (0đ)
                        if (defHotel) {
                          options.push({
                            name: defHotel.name,
                            stars: defHotel.stars || 4,
                            description: defHotel.description || defHotel.address || "Khách sạn tiêu chuẩn theo tour",
                            diff: 0,
                            pricePerNight: defHotel.pricePerNight,
                          });
                        }

                        // 2. If defHotel has configured alternativeHotels from company
                        if (defHotel?.alternativeHotels && defHotel.alternativeHotels.length > 0) {
                          defHotel.alternativeHotels.forEach((alt) => {
                            options.push({
                              name: alt.name,
                              stars: alt.stars || 4,
                              description: alt.description || alt.address || "",
                              diff: alt.priceDifference,
                              pricePerNight: (defHotel.pricePerNight || 0) + alt.priceDifference,
                            });
                          });
                        }

                        return options.map((opt) => {
                          const isSel = choice.systemName === opt.name;
                          return (
                            <button
                              key={opt.name}
                              onClick={() => updateDestHotel(destination, {
                                mode: "system",
                                systemName: opt.name,
                                systemStars: opt.stars,
                                systemPricePerNight: opt.pricePerNight,
                                priceDifference: opt.diff,
                              })}
                              className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                                isSel ? "border-blue-500 bg-white ring-1 ring-blue-400/30" : "border-gray-200 bg-white hover:border-[#CBD5E1]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-semibold text-gray-900 text-sm">{opt.name}</p>
                                    {opt.stars && (
                                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                        {opt.stars} <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                      </span>
                                    )}
                                  </div>
                                  {opt.description && <p className="text-xs text-gray-400 mt-1">{opt.description}</p>}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {opt.diff === 0 ? (
                                    <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">
                                      Tiêu chuẩn tour (0đ)
                                    </span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] text-gray-400 uppercase font-medium">CHÊNH LỆCH</p>
                                      <p className={`text-sm font-bold ${opt.diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                        {opt.diff > 0 ? "+" : ""}{formatVND(opt.diff)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {/* Provider hotel list */}
                  {choice.mode === "provider" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                        <span className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          Khách sạn &amp; Resort Đối tác Nền tảng tại {destination}
                        </span>
                        <span className="text-[11px] text-gray-500 hidden sm:inline">
                          Xem bài viết blog &amp; toạ độ Google Maps trước khi chọn
                        </span>
                      </div>

                      {(() => {
                        const providerHotels = services.filter((s) => {
                          if (s.category !== "hotel" || s.status !== "approved") return false;
                          if (!destination) return true;
                          const destLower = destination.toLowerCase();
                          const locLower = (s.location || "").toLowerCase();
                          const provLower = (s.province || "").toLowerCase();
                          return locLower.includes(destLower) || provLower.includes(destLower) || destLower.includes(locLower) || destLower.includes(provLower);
                        });
                        const displayHotels = providerHotels.length > 0 ? providerHotels : services.filter((s) => s.category === "hotel" && s.status === "approved");

                        if (displayHotels.length === 0) {
                          return (
                            <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                              Chưa có khách sạn đối tác nào tại khu vực này. Bạn có thể chọn tab "Tự đề xuất" để nhập khách sạn mong muốn.
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {displayHotels.map((serv) => {
                              const isSel = choice.mode === "provider" && choice.serviceId === serv.id;
                              return (
                                <div
                                  key={serv.id}
                                  className={`rounded-xl border-2 transition-all p-3.5 flex flex-col justify-between gap-3 ${
                                    isSel
                                      ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-300"
                                      : "border-gray-200 bg-white hover:border-indigo-200 shadow-2xs"
                                  }`}
                                >
                                  <div className="flex gap-3">
                                    <div className="relative w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                                      <img src={serv.image} alt={serv.name} className="w-full h-full object-cover" />
                                      {serv.stars && (
                                        <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-amber-400 font-bold text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                          {serv.stars}★
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded mb-1">
                                        {serv.providerName}
                                      </span>
                                      <h5 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-1 leading-tight">
                                        {serv.name}
                                      </h5>
                                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1 truncate">
                                        <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                                        {serv.location}
                                      </p>
                                      <p className="text-xs font-bold text-blue-900 mt-1">
                                        {formatVND(serv.pricePerPerson || serv.price)}
                                        <span className="text-[10px] font-normal text-gray-400"> (giá tham khảo)</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setModalService(serv);
                                        setModalTarget({ type: "hotel", destination });
                                        setIsModalOpen(true);
                                      }}
                                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 bg-white hover:bg-indigo-50 text-[11px] font-semibold text-gray-700 flex items-center justify-center gap-1 transition-colors"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                      Xem bài viết &amp; Bản đồ
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSelectProviderHotel(destination, serv)}
                                      className={`py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                                        isSel
                                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                      }`}
                                    >
                                      {isSel ? (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          Đã chọn
                                        </>
                                      ) : (
                                        "Chọn khách sạn"
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Custom hotel form */}
                  {choice.mode === "custom" && (
                    <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs text-amber-700 flex items-start gap-1.5">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        Nhập thông tin khách sạn bạn muốn tại {destination}. Công ty sẽ xác nhận và báo giá.
                      </p>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Tên khách sạn *</label>
                        <input
                          type="text"
                          value={choice.customName ?? ""}
                          onChange={(e) => updateDestHotel(destination, { ...choice, customName: e.target.value })}
                          placeholder={`VD: Khách sạn Hoa ${destination}`}
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Địa chỉ</label>
                        <input
                          type="text"
                          value={choice.customAddress ?? ""}
                          onChange={(e) => updateDestHotel(destination, { ...choice, customAddress: e.target.value })}
                          placeholder={`VD: 123 Đường Nguyễn Văn Trỗi, ${destination}`}
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-1">Ghi chú thêm</label>
                        <input
                          type="text"
                          value={choice.customNote ?? ""}
                          onChange={(e) => updateDestHotel(destination, { ...choice, customNote: e.target.value })}
                          placeholder="VD: Yêu cầu phòng view hồ, loại phòng superior…"
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* ===== ITINERARY TIMELINE (THÔNG TIN THAM QUAN CƠ BẢN CỦA TOUR) ===== */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#F97316]" />
            Lịch trình chi tiết (Lộ trình tham quan cơ bản của công ty)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Lộ trình các điểm tham quan do công ty thiết lập. Bạn có thể xem hoặc gửi yêu cầu đổi địa điểm tham quan nếu muốn.
          </p>
        </div>

        {tour.itinerary.map((day) => {
          const dayState = days[day.id];
          const locations = dayState?.locations ?? [];
          const mealChoices = dayState?.mealChoices ?? [];
          const hasLocationChanges = locations.some((l) => l.changed && l.changeRequest.trim());
          const hasMealChanges = mealChoices.some(
            (mc) =>
              (mc.mode === "custom" && Boolean(mc.customName?.trim())) ||
              (mc.mode === "system" && Boolean(mc.systemName) && mc.systemName !== day.meals?.find((m) => m.type === mc.mealType)?.serviceName)
          );
          const hasChanges = hasLocationChanges || hasMealChanges;

          return (
            <div key={day.id} className={`rounded-xl border overflow-hidden ${hasChanges ? "border-amber-300" : "border-gray-200"}`}>
              {/* Day header */}
              <div className={`px-4 py-3 flex items-center justify-between ${hasChanges ? "bg-amber-50" : "bg-gray-50"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#F97316] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-xs">
                    {day.day}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      Ngày {day.day}: {day.title}
                      {day.meals && day.meals.length > 0 && (
                        <span className="text-xs text-gray-500 font-normal ml-1.5">
                          (Ăn {day.meals.map((m) => m.type === "breakfast" ? "sáng" : m.type === "lunch" ? "trưa" : "tối").join(", ")})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasLocationChanges && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-medium border border-amber-300">
                      Đổi điểm tham quan
                    </span>
                  )}
                  {hasMealChanges && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-300">
                      Đổi bữa ăn
                    </span>
                  )}
                </div>
              </div>

              {/* Day description & Sightseeing locations */}
              <div className="px-4 py-3.5 space-y-3 bg-white">
                {day.description && (
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    {day.description}
                  </p>
                )}

                {/* Pure locations timeline (No meal changes here) */}
                <div className="relative pl-1">
                  <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-200" />

                  <div className="space-y-2.5">
                    {locations.map((loc) => (
                      <div key={loc.locationId} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <div className={`relative z-10 flex-shrink-0 mt-3 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                          loc.changed ? "bg-amber-400 border-amber-400" : "bg-white border-blue-400"
                        }`}>
                          <MapPin className={`w-3.5 h-3.5 ${loc.changed ? "text-white" : "text-blue-500"}`} />
                        </div>

                        {/* Content */}
                        <div className={`flex-1 rounded-xl border p-3 ${
                          loc.changed ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              {loc.changed ? (
                                <p className="text-xs text-gray-400 line-through">{loc.locationName}</p>
                              ) : (
                                <p className="font-medium text-gray-900 text-sm">{loc.locationName}</p>
                              )}
                              {loc.changed && loc.changeRequest && (
                                <p className="text-sm font-medium text-amber-800 mt-0.5">
                                  → {loc.changeRequest}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => updateLocation(day.id, loc.locationId, {
                                changed: !loc.changed,
                                changeRequest: loc.changed ? "" : loc.changeRequest,
                              })}
                              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                                loc.changed
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-gray-100 text-gray-600 hover:bg-[#F97316]/15 hover:text-[#EA580C]"
                              }`}
                            >
                              {loc.changed ? "Huỷ thay đổi" : "Thay đổi"}
                            </button>
                          </div>

                          {loc.changed && (
                            <div className="mt-2">
                              <textarea
                                value={loc.changeRequest}
                                onChange={(e) => updateLocation(day.id, loc.locationId, { changeRequest: e.target.value })}
                                placeholder={`Thay thế "${loc.locationName}" bằng địa điểm nào? (VD: Vườn hoa thành phố Đà Lạt, Ga Đà Lạt, ...)`}
                                className="w-full border border-amber-300 rounded-lg p-2.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                rows={2}
                              />
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3 flex-shrink-0" />
                                Công ty sẽ xem xét và báo giá sau khi nhận booking.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day Meals Section (Chế độ ẩm thực & Bữa ăn trong ngày) */}
                {day.meals && day.meals.length > 0 && (
                  <div className="pt-3 border-t border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                        Chế độ ẩm thực &amp; Bữa ăn Ngày {day.day}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        (Có thể đổi nhà hàng hoặc yêu cầu riêng)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {day.meals.map((defaultMeal) => {
                        const mealType = defaultMeal.type as "breakfast" | "lunch" | "dinner";
                        const mealChoice = mealChoices.find((mc) => mc.mealType === mealType);
                        const mealKey = `${day.id}-${mealType}`;
                        const isExpanded = expandedMeal === mealKey;
                        const mealLabel = mealType === "breakfast" ? "Bữa sáng" : mealType === "lunch" ? "Bữa trưa" : "Bữa tối";
                        const isCustom = mealChoice?.mode === "custom" && Boolean(mealChoice.customName?.trim());
                        const isSystemChanged =
                          mealChoice?.mode === "system" &&
                          Boolean(mealChoice.systemName) &&
                          Boolean(defaultMeal.serviceName) &&
                          mealChoice.systemName !== defaultMeal.serviceName;

                        return (
                          <div key={mealKey} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setExpandedMeal(isExpanded ? null : mealKey)}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-left ${
                                mealType === "breakfast"
                                  ? "bg-amber-50/60 hover:bg-amber-100/50"
                                  : mealType === "lunch"
                                  ? "bg-emerald-50/60 hover:bg-emerald-100/50"
                                  : "bg-[#F0F9FF]/60 hover:bg-[#F97316]/15/50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  mealType === "breakfast"
                                    ? "bg-amber-100 text-amber-700"
                                    : mealType === "lunch"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-[#F97316]/15 text-[#EA580C]"
                                }`}>
                                  {mealType === "breakfast" ? <Sun className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-900">
                                    {mealLabel}:{" "}
                                    <span className="font-bold text-gray-900">
                                      {mealChoice?.mode === "custom"
                                        ? (mealChoice.customName || "Tự nhập (chưa điền)")
                                        : mealChoice?.mode === "provider"
                                        ? `🌟 Đối tác: ${mealChoice.systemName || "Nhà hàng đối tác"}`
                                        : (mealChoice?.systemName || defaultMeal.serviceName || "Nhà hàng theo tour")}
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    Mặc định: {defaultMeal.serviceName || "Nhà hàng địa phương"}
                                  </p>
                                </div>
                              </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {isCustom && (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium border border-amber-200">
                                      Tự nhập – chờ báo giá
                                    </span>
                                  )}
                                  {mealChoice?.mode === "provider" && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      Đối tác Nền tảng
                                    </span>
                                  )}
                                  {isSystemChanged && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                                        Đã đổi
                                      </span>
                                      {mealChoice?.priceDifference !== undefined ? (
                                        mealChoice.priceDifference !== 0 && (
                                          <span className={`text-xs font-bold ${mealChoice.priceDifference > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                            {mealChoice.priceDifference > 0 ? "+" : ""}{formatVND(mealChoice.priceDifference)}
                                          </span>
                                        )
                                      ) : (
                                        mealChoice?.systemPrice !== undefined && defaultMeal.pricePerPerson !== undefined && (
                                          <span className={`text-xs font-bold ${
                                            mealChoice.systemPrice - defaultMeal.pricePerPerson > 0 ? "text-amber-600" : "text-emerald-600"
                                          }`}>
                                            {mealChoice.systemPrice - defaultMeal.pricePerPerson > 0 ? "+" : ""}
                                            {formatVND(mealChoice.systemPrice - defaultMeal.pricePerPerson)}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}
                                  {!isCustom && !isSystemChanged && mealChoice?.mode !== "provider" && (
                                    <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                                      Theo tour (0đ)
                                    </span>
                                  )}
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="p-3.5 space-y-3 bg-white border-t border-gray-100">
                                  {/* Mode tabs (Tour / Provider / Custom) */}
                                  <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => updateMealChoice(day.id, mealType, { mode: "system" })}
                                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                        mealChoice?.mode === "system"
                                          ? "bg-white text-emerald-700 shadow-xs border border-emerald-200"
                                          : "text-gray-600 hover:text-gray-900"
                                      }`}
                                    >
                                      <Utensils className="w-3.5 h-3.5" />
                                      Nhà hàng theo Tour
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateMealChoice(day.id, mealType, { mode: "provider" })}
                                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                        mealChoice?.mode === "provider"
                                          ? "bg-white text-indigo-700 shadow-xs border border-indigo-300"
                                          : "text-gray-600 hover:text-indigo-700"
                                      }`}
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                      🌟 Đối tác Nền tảng
                                    </button>
                                    {defaultMeal.allowCustomMealRequest !== false && (
                                      <button
                                        type="button"
                                        onClick={() => updateMealChoice(day.id, mealType, { mode: "custom" })}
                                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                                          mealChoice?.mode === "custom"
                                            ? "bg-white text-amber-700 shadow-xs border border-amber-300"
                                            : "text-gray-600 hover:text-amber-700"
                                        }`}
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Tự đề xuất
                                      </button>
                                    )}
                                  </div>

                                  {/* System restaurant list */}
                                  {mealChoice?.mode === "system" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {(() => {
                                        const options: Array<{ name: string; description?: string; diff: number; pricePerPerson?: number }> = [];

                                        // 1. Mặc định theo tour (0đ)
                                        options.push({
                                          name: defaultMeal.serviceName || "Nhà hàng theo tour",
                                          description: defaultMeal.description || "Thực đơn tiêu chuẩn của chương trình",
                                          diff: 0,
                                          pricePerPerson: defaultMeal.pricePerPerson,
                                        });

                                        // 2. Nếu tour đã cấu hình danh sách alternativeMeals
                                        if (defaultMeal.alternativeMeals && defaultMeal.alternativeMeals.length > 0) {
                                          defaultMeal.alternativeMeals.forEach((alt) => {
                                            options.push({
                                              name: alt.restaurantName,
                                              description: alt.description || alt.address || "",
                                              diff: alt.priceDifference,
                                              pricePerPerson: (defaultMeal.pricePerPerson || 0) + alt.priceDifference,
                                            });
                                          });
                                        }

                                        return options.map((opt) => {
                                          const isSel = (mealChoice?.systemName || defaultMeal.serviceName) === opt.name;
                                          return (
                                            <button
                                              type="button"
                                              key={opt.name}
                                              onClick={() => updateMealChoice(day.id, mealType, {
                                                mode: "system",
                                                systemName: opt.name,
                                                systemPrice: opt.pricePerPerson,
                                                priceDifference: opt.diff,
                                              })}
                                              className={`text-left p-2.5 rounded-xl border transition-all ${
                                                isSel
                                                  ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-400"
                                                  : "border-gray-200 bg-white hover:border-emerald-200"
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div>
                                                  <p className="font-semibold text-gray-900 text-xs">{opt.name}</p>
                                                  {opt.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{opt.description}</p>}
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                  {opt.diff === 0 ? (
                                                    <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">Mặc định (0đ)</span>
                                                  ) : (
                                                    <div className="space-y-0.5">
                                                      <p className="text-[9px] text-gray-400 uppercase font-medium">Chênh lệch</p>
                                                      <span className={`text-xs font-bold ${opt.diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                                        {opt.diff > 0 ? "+" : ""}{formatVND(opt.diff)}/người
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </button>
                                          );
                                        });
                                      })()}
                                    </div>
                                  )}

                                  {/* Provider restaurant list */}
                                  {mealChoice?.mode === "provider" && (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between text-xs text-gray-500 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100">
                                        <span className="flex items-center gap-1.5 text-indigo-900 font-semibold">
                                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                          Nhà hàng &amp; Ẩm thực Đối tác Nền tảng (Ngày {day.day})
                                        </span>
                                        <span className="text-[11px] text-gray-500 hidden sm:inline">
                                          Xem bài viết blog &amp; toạ độ Google Maps trước khi chọn
                                        </span>
                                      </div>

                                      {(() => {
                                        const destCity = day.destinationCity || tour.destination || "";
                                        const providerMeals = services.filter((s) => {
                                          if ((s.category !== "fnb" && s.category !== "restaurant") || s.status !== "approved") return false;
                                          if (!destCity) return true;
                                          const destLower = destCity.toLowerCase();
                                          const locLower = (s.location || "").toLowerCase();
                                          const provLower = (s.province || "").toLowerCase();
                                          return locLower.includes(destLower) || provLower.includes(destLower) || destLower.includes(locLower) || destLower.includes(provLower);
                                        });
                                        const displayMeals = providerMeals.length > 0 ? providerMeals : services.filter((s) => (s.category === "fnb" || s.category === "restaurant") && s.status === "approved");

                                        if (displayMeals.length === 0) {
                                          return (
                                            <div className="p-5 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                              Chưa có nhà hàng đối tác nào cho khu vực này. Bạn có thể chọn tab "Tự đề xuất" để nhập địa điểm muốn đến.
                                            </div>
                                          );
                                        }

                                        return (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {displayMeals.map((serv) => {
                                              const isSel = mealChoice?.mode === "provider" && mealChoice.serviceId === serv.id;
                                              return (
                                                <div
                                                  key={serv.id}
                                                  className={`rounded-xl border-2 transition-all p-3 flex flex-col justify-between gap-2.5 ${
                                                    isSel
                                                      ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-300"
                                                      : "border-gray-200 bg-white hover:border-indigo-200 shadow-2xs"
                                                  }`}
                                                >
                                                  <div className="flex gap-2.5">
                                                    <div className="relative w-20 h-18 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                                                      <img src={serv.image} alt={serv.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <span className="inline-block text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded mb-0.5">
                                                        {serv.providerName}
                                                      </span>
                                                      <h6 className="font-bold text-gray-900 text-xs line-clamp-1 leading-snug">
                                                        {serv.name}
                                                      </h6>
                                                      <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                                                        {serv.cuisineType || serv.subCategory || "Ẩm thực truyền thống"}
                                                      </p>
                                                      <p className="text-xs font-bold text-emerald-700 mt-1">
                                                        {formatVND(serv.pricePerPerson || serv.price)}
                                                        <span className="text-[10px] font-normal text-gray-400">/suất (tham khảo)</span>
                                                      </p>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setModalService(serv);
                                                        setModalTarget({ type: "meal", dayId: day.id, mealType });
                                                        setIsModalOpen(true);
                                                      }}
                                                      className="flex-1 py-1.5 px-2 rounded-lg border border-gray-200 hover:border-indigo-300 bg-white hover:bg-indigo-50 text-[10px] font-semibold text-gray-700 flex items-center justify-center gap-1 transition-colors"
                                                    >
                                                      <FileText className="w-3 h-3 text-indigo-600" />
                                                      Xem bài viết &amp; Bản đồ
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleSelectProviderMeal(day.id, mealType, serv)}
                                                      className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                                                        isSel
                                                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                          : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                      }`}
                                                    >
                                                      {isSel ? (
                                                        <>
                                                          <Check className="w-3 h-3" />
                                                          Đã chọn
                                                        </>
                                                      ) : (
                                                        "Chọn nhà hàng"
                                                      )}
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {/* Custom restaurant form */}
                                  {mealChoice?.mode === "custom" && (
                                    <div className="space-y-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                                      <label className="font-semibold text-gray-800 block">Tên nhà hàng / quán ăn hoặc ghi chú khẩu vị:</label>
                                      <input
                                        type="text"
                                        value={mealChoice.customName ?? ""}
                                        onChange={(e) => updateMealChoice(day.id, mealType, { customName: e.target.value })}
                                        placeholder={`VD: Quán nướng ngói Đà Lạt, yêu cầu ăn chay, hoặc nhà hàng bạn muốn...`}
                                        className="w-full border border-amber-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                      />
                                      <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-1">
                                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                        Công ty du lịch sẽ liên hệ kiểm tra với nhà hàng và báo giá chốt cho bạn.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Price summary */}
      {!needsCompanyQuote && knownDelta !== 0 && (
        <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-5">
          <h4 className="font-bold text-gray-900 mb-3 text-sm">Tóm tắt điều chỉnh / người:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Giá tour cơ bản</span>
              <span className="font-medium">{formatVND(basePrice)}</span>
            </div>
            {hotelDelta !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Điều chỉnh khách sạn</span>
                <span className={`font-semibold ${hotelDelta > 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {hotelDelta > 0 ? "+" : ""}{formatVND(hotelDelta)}
                </span>
              </div>
            )}
            {mealDelta !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Điều chỉnh bữa ăn</span>
                <span className={`font-semibold ${mealDelta > 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {mealDelta > 0 ? "+" : ""}{formatVND(mealDelta)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
              <span>Tổng dự kiến / người</span>
              <span className="text-[#075985] text-base">{formatVND(estimatedTotal ?? basePrice)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">* Giá chính thức xác nhận khi công ty duyệt booking.</p>
        </div>
      )}

      {/* Action button to book with customized itinerary */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 border border-blue-500">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Lịch trình theo ý muốn
          </span>
          <h4 className="text-lg font-bold">
            Hoàn tất tùy chỉnh &amp; Đặt tour ngay
          </h4>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Toàn bộ thông tin thay đổi về chỗ ở/khách sạn, chế độ ẩm thực (chỗ ăn) và địa điểm tham quan sẽ được gửi trực tiếp đến công ty du lịch để đối soát và chốt giá.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            const customHotelChanges: CustomHotelChange[] = [];
            Object.values(destHotels).forEach((g) => {
              const choice = g.hotelChoice;
              const def = g.defaultHotel;
              const isCustomMode = choice.mode === "custom" && Boolean(choice.customName?.trim());
              const isProviderMode = choice.mode === "provider" && Boolean(choice.serviceId);
              const isSystemChanged =
                choice.mode === "system" &&
                Boolean(choice.systemName) &&
                Boolean(def) &&
                choice.systemName !== def?.name;

              if (isCustomMode || isProviderMode || isSystemChanged) {
                customHotelChanges.push({
                  destination: g.destination,
                  originalHotelName: def ? `${def.name} (${def.stars || 4}★)` : "Khách sạn mặc định của tour",
                  originalPricePerNight: def?.pricePerNight ?? 0,
                  newHotelName:
                    choice.mode === "custom"
                      ? (choice.customName || "Khách sạn tự đề xuất")
                      : choice.mode === "provider"
                      ? `${choice.systemName || "Khách sạn đối tác"}${choice.systemStars ? ` (${choice.systemStars}★)` : ""}`
                      : `${choice.systemName} (${choice.systemStars ?? 4}★)`,
                  mode: choice.mode,
                  stars: choice.systemStars || 4,
                  newPricePerNight: choice.systemPricePerNight,
                  address: choice.customAddress,
                  note: choice.customNote,
                  isProviderService: choice.isProviderService,
                  serviceId: choice.serviceId,
                  providerId: choice.providerId,
                  providerName: choice.providerName,
                  providerPhone: choice.providerPhone,
                  providerEmail: choice.providerEmail,
                  providerAddress: choice.providerAddress,
                  providerRepresentative: choice.providerRepresentative,
                  serviceImage: choice.serviceImage,
                  latitude: choice.latitude,
                  longitude: choice.longitude,
                });
              }
            });

            // Gather custom meal changes
            const customMealChanges: CustomMealChange[] = [];
            tour.itinerary.forEach((day) => {
              const dayState = days[day.id];
              if (!dayState) return;
              dayState.mealChoices.forEach((mc) => {
                const defaultMeal = day.meals?.find((m) => m.type === mc.mealType);
                const isCustom = mc.mode === "custom" && Boolean(mc.customName?.trim());
                const isProvider = mc.mode === "provider" && Boolean(mc.serviceId);
                const isSystemChanged =
                  mc.mode === "system" &&
                  Boolean(mc.systemName) &&
                  Boolean(defaultMeal?.serviceName) &&
                  mc.systemName !== defaultMeal?.serviceName;

                if (isCustom || isProvider || isSystemChanged) {
                  customMealChanges.push({
                    dayNumber: day.day,
                    mealType: mc.mealType,
                    originalMealName: defaultMeal?.serviceName || "Nhà hàng theo tour",
                    newMealName:
                      mc.mode === "custom"
                        ? (mc.customName || "Nhà hàng tự chọn")
                        : mc.systemName || "",
                    mode: mc.mode,
                    pricePerPerson: mc.systemPrice,
                    isProviderService: mc.isProviderService,
                    serviceId: mc.serviceId,
                    providerId: mc.providerId,
                    providerName: mc.providerName,
                    providerPhone: mc.providerPhone,
                    providerEmail: mc.providerEmail,
                    providerAddress: mc.providerAddress,
                    providerRepresentative: mc.providerRepresentative,
                    serviceImage: mc.serviceImage,
                    latitude: mc.latitude,
                    longitude: mc.longitude,
                  });
                }
              });
            });

            const locationChanges: CustomLocationChange[] = [];
            tour.itinerary.forEach((day) => {
              const dayState = days[day.id];
              if (!dayState) return;
              const changedLocs = dayState.locations.filter((l) => l.changed && l.changeRequest.trim());
              changedLocs.forEach((changedLoc) => {
                locationChanges.push({
                  dayId: day.id,
                  dayNumber: day.day,
                  locationId: changedLoc.locationId,
                  originalLocationName: changedLoc.locationName,
                  originalLocations: [changedLoc.locationName],
                  requestedLocations: changedLoc.changeRequest.trim(),
                  note: `Đổi "${changedLoc.locationName}" sang "${changedLoc.changeRequest.trim()}"`,
                });
              });
            });

            const hasRealCustomization =
              customHotelChanges.some((h) => h.mode !== "system") ||
              customMealChanges.some((m) => m.mode !== "system") ||
              locationChanges.length > 0;

            onBookCustom?.({
              customHotelChanges,
              customMealChanges,
              locationChanges,
              hasLocationCustomization: hasRealCustomization,
              estimatedPrice: estimatedTotal ?? basePrice,
            });
          }}
          className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-6 py-3 rounded-xl shadow-lg whitespace-nowrap text-sm flex-shrink-0"
        >
          Đặt tour theo lịch trình này →
        </Button>
      </div>

      {/* Service Blog Detail Modal */}
      <ServiceBlogDetailModal
        service={modalService}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalService(null);
          setModalTarget(null);
        }}
        isSelected={
          modalService
            ? (modalTarget?.type === "hotel" && modalTarget.destination
                ? destHotels[modalTarget.destination]?.hotelChoice.serviceId === modalService.id
                : modalTarget?.type === "meal" && modalTarget.dayId && modalTarget.mealType
                ? days[modalTarget.dayId]?.mealChoices.find((m) => m.mealType === modalTarget.mealType)?.serviceId === modalService.id
                : false)
            : false
        }
        onSelect={(serv) => {
          if (modalTarget?.type === "hotel" && modalTarget.destination) {
            handleSelectProviderHotel(modalTarget.destination, serv);
          } else if (modalTarget?.type === "meal" && modalTarget.dayId && modalTarget.mealType) {
            handleSelectProviderMeal(modalTarget.dayId, modalTarget.mealType, serv);
          }
        }}
      />
    </div>
  );
}

// -------- Reviews Tab --------
function ReviewsTab({ tour }: { tour: Tour }) {
  const reviews = tour.reviews ?? [];
  const avg = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : tour.rating;

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="text-center">
          <p className="text-6xl font-bold text-[#075985]">{avg.toFixed(1)}</p>
          <div className="flex justify-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-5 h-5 ${i < Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">{reviews.length} đánh giá</p>
        </div>
        <div className="flex-1 w-full space-y-1.5">
          {dist.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-4">{star}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full"
                  style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs text-gray-500 w-4">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>Chưa có đánh giá nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {r.userAvatar ? (
                    <img src={r.userAvatar} alt={r.userName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#E0F2FE] flex items-center justify-center font-bold text-[#075985]">
                      {r.userName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{r.userName}</p>
                    <p className="text-xs text-gray-400">
                      {r.tourDate && `Đi tour: ${r.tourDate} · `}Đăng: {r.date}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------- Main Component --------
export function TourDetailPage({
  tour,
  services,
  currentUser,
  onBack,
  onBookNow,
  onShowLogin,
  isAdmin,
  onToggleHideTour,
  onDeleteTour,
}: TourDetailPageProps) {
  const [showHideModal, setShowHideModal] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const quickReasonSuggestions = [
    "Thông tin lộ trình sai lệch, nhảm nhí không đúng thực tế.",
    "Giá tour ảo hoặc chênh lệch bất thường so với thị trường.",
    "Hình ảnh bài đăng tour vi phạm tiêu chuẩn cộng đồng.",
    "Nội dung trùng lặp hoặc spam trên sàn du lịch.",
    "Công ty đăng thông tin dịch vụ ảo chưa được xác thực.",
  ];

  const isCustomTour = tour.tourType === "custom_request";
  const visibleTabs = isCustomTour
    ? TABS.filter((t) => t.id !== "custom" && t.id !== "reviews")
    : TABS;
  const basePrice = tour.priceTable?.find((r) => r.ageGroup === "adult")?.price ?? tour.price;
  const [activeTab, setActiveTab] = useState<TabId>("program");
  const [liked, setLiked] = useState(false);
  const [customData, setCustomData] = useState<TourDetailCustomData | null>(null);
  const [customPrice, setCustomPrice] = useState<number>(basePrice);

  useEffect(() => {
    setCustomPrice(basePrice);
  }, [basePrice]);

  const handleBook = () => {
    if (!currentUser) {
      onShowLogin?.();
      return;
    }
    if (customData && (customData.customHotelChanges?.length || customData.customMealChanges?.length || customData.locationChanges?.length)) {
      onBookNow?.(tour, customData);
    } else {
      onBookNow?.(tour);
    }
  };

  const handleBookWithCustom = (cData: TourDetailCustomData) => {
    if (!currentUser) {
      onShowLogin?.();
      return;
    }
    onBookNow?.(tour, cData);
  };

  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    tour.image || (tour.images && tour.images[0]) || ""
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 border-gray-200 hover:bg-gray-100 rounded-xl font-medium text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {isAdmin ? "Quay lại danh sách Quản lý Tour" : "Quay lại"}
            </Button>

            {isAdmin && (
              <div className="flex items-center gap-2">
                {tour.status === "hidden" ? (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 font-semibold gap-1.5 py-1 px-2.5 text-xs">
                    <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                    Đã tạm ẩn trên sàn (Xàm / Vi phạm)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold gap-1.5 py-1 px-2.5 text-xs">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Đang hiển thị công khai trên sàn
                  </Badge>
                )}
              </div>
            )}
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-2">
              {tour.status === "hidden" ? (
                <Button
                  size="sm"
                  onClick={() => onToggleHideTour?.(tour.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Mở hiển thị lại
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHideModal(true)}
                  className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  Tạm ẩn tour (Xàm / Vi phạm)
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa vĩnh viễn
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLiked(!liked)}
                className={`p-2 rounded-full transition-colors ${liked ? "text-red-500 bg-red-50" : "text-gray-400 hover:bg-gray-100"}`}
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
              </button>
              <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && tour.status === "hidden" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <h4 className="font-bold text-rose-900">Tour đang bị tạm ẩn khỏi sàn</h4>
              <p className="text-xs text-rose-700 mt-1">
                <strong>Lý do kiểm duyệt:</strong> {tour.hiddenReason || "Thông tin tour không chính xác, thiếu căn cứ hoặc không phù hợp với tiêu chuẩn sàn."}
              </p>
              <p className="text-xs text-rose-600 mt-0.5">
                Tour này hiện không hiển thị trên danh sách tìm kiếm tour công khai và khách hàng không thể đặt chỗ.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg h-72 sm:h-96">
              <img src={selectedPhoto || tour.image} alt={tour.name} className="w-full h-full object-cover transition-all duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {tour.companyName && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5">
                  {tour.companyLogo && (
                    <img src={tour.companyLogo} alt="" className="w-5 h-5 rounded object-cover" />
                  )}
                  <span className="text-xs font-semibold text-gray-800">{tour.companyName}</span>
                </div>
              )}
              <div className="absolute top-4 right-4 bg-amber-400 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-white" />
                {tour.rating}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs text-white/70 font-medium mb-1">MÃ TOUR: {formatTourCode(tour.tourCode)}</p>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{tour.name}</h1>
              </div>
            </div>

            {/* Gallery thumbnails switcher if tour has multiple images */}
            {tour.images && tour.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {tour.images.map((img, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSelectedPhoto(img)}
                    className={`relative rounded-xl overflow-hidden border-2 flex-shrink-0 w-20 h-14 transition-all ${
                      (selectedPhoto === img)
                        ? "border-[#075985] ring-2 ring-blue-500/50 scale-105"
                        : "border-gray-200 hover:border-blue-300 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Meta strip */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="w-4 h-4 text-blue-500" />
                {tour.destination}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="w-4 h-4 text-blue-500" />
                {tour.duration}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users className="w-4 h-4 text-blue-500" />
                {tour.minGuests}–{tour.maxGuests} khách
              </div>
              {tour.operationPeriod && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {tour.operationPeriod}
                </div>
              )}
              {(tour.departureLocation || tour.departureCity) && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Khởi hành: <strong>{tour.departureLocation || tour.departureCity}</strong></span>
                </div>
              )}
            </div>

            {/* Custom Tour Banner */}
            {isCustomTour && (
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white rounded-2xl p-4.5 shadow-md space-y-2 border border-purple-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-purple-500/40 text-purple-200 border border-purple-400/50 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔒</span> TOUR THIẾT KẾ RIÊNG THEO YÊU CẦU
                  </span>
                  <span className="bg-purple-800 text-purple-200 text-xs px-2.5 py-0.5 rounded font-mono font-bold">
                    Phiên bản: v{tour.version || 1}
                  </span>
                  {tour.targetCustomerName && (
                    <span className="text-xs text-purple-200 font-semibold">
                      Dành riêng cho: {tour.targetCustomerName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-200 leading-relaxed">
                  Chương trình tour này đã được thiết kế riêng theo mong muốn của quý khách. Lịch trình, khách sạn và các dịch vụ cố định không chỉnh sửa trực tiếp trên hệ thống. Nếu quý khách muốn thay đổi bất kỳ nội dung nào, vui lòng liên hệ công ty du lịch để thống nhất và tạo phiên bản mới.
                </p>
                {tour.changeNote && (
                  <div className="bg-black/30 rounded-lg p-2.5 text-xs text-amber-300 italic border border-white/10">
                    Ghi chú phiên bản v{tour.version || 1}: "{tour.changeNote}"
                  </div>
                )}
              </div>
            )}

            {/* Co-Hosting Alliance Banner */}
            {tour.isCoHosted && tour.coHosts && tour.coHosts.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-300 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-purple-700 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                    <Handshake className="w-4 h-4 text-amber-300" />
                    TOUR LIÊN MINH ĐỐI TÁC CHUYÊN NGHIỆP
                  </span>
                  <span className="text-xs text-purple-900 font-semibold">
                    Đồng tổ chức bởi 2 thương hiệu uy tín
                  </span>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">
                  Để đảm bảo chất lượng phục vụ vượt trội tại từng điểm đến, tour này được liên kết điều hành giữa <strong>đơn vị điều hành chính</strong> và <strong>công ty lữ hành bản địa chuyên tuyến</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {tour.coHosts.map((ch) => (
                    <div
                      key={ch.id}
                      className="bg-white rounded-xl p-3 border border-purple-100 shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          {ch.companyLogo && (
                            <img
                              src={ch.companyLogo}
                              alt=""
                              className="w-6 h-6 rounded-md object-cover"
                            />
                          )}
                          {ch.companyName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            ch.role === "lead"
                              ? "bg-[#E0F2FE] text-blue-800"
                              : "bg-[#F97316]/15 text-purple-800"
                          }`}
                        >
                          {ch.role === "lead" ? "Đơn vị Chủ trì" : "Đối tác Bản địa"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        <strong>Phụ trách:</strong> {ch.assignedSegments}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-900 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>Bảo chứng thanh toán Ký quỹ (Escrow):</strong> 100% tiền tour được bảo lưu an toàn tại Tài khoản ký quỹ của Sàn cho tới khi quý khách hoàn thành hành trình.
                  </span>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex overflow-x-auto border-b border-gray-200">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                      activeTab === tab.id
                        ? "border-[#075985] text-[#075985] bg-[#F0F9FF]/50"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {activeTab === "program" && <ProgramTab tour={tour} />}
                {activeTab === "regulations" && <RegulationsTab tour={tour} />}
                {activeTab === "pricing" && <PricingTab tour={tour} />}
                {activeTab === "custom" && !isCustomTour && (
                  <CustomTab
                    tour={tour}
                    services={services}
                    basePrice={basePrice}
                    onBookCustom={handleBookWithCustom}
                    onCustomChange={(cData, price) => {
                      setCustomData(cData);
                      setCustomPrice(price);
                    }}
                  />
                )}
                {activeTab === "reviews" && !isCustomTour && <ReviewsTab tour={tour} />}
              </div>
            </div>
          </div>

          {/* Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 sticky top-20 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Giá tour / người</p>
                <p className="text-3xl font-bold text-[#075985]">{formatVND(customPrice)}</p>
                <p className="text-xs text-gray-400">/ người lớn</p>
                {customPrice !== basePrice && (
                  <p className={`text-xs font-semibold mt-1 ${customPrice > basePrice ? "text-amber-600" : "text-emerald-600"}`}>
                    {customPrice > basePrice ? "+" : ""}{formatVND(customPrice - basePrice)} (chênh lệch tùy chỉnh)
                  </p>
                )}
              </div>

              {isCustomTour && (
                <div className="bg-[#F0F9FF] border border-[#F97316]/30 rounded-xl p-3 text-xs text-purple-900 space-y-1">
                  <p className="font-bold flex items-center gap-1 text-purple-950">
                    <span>🔒</span> Tour thiết kế riêng độc quyền
                  </p>
                  <p className="text-[11px] text-[#EA580C] leading-relaxed">
                    Giá và dịch vụ đã chốt theo yêu cầu riêng. Quý khách bấm đặt tour bên dưới để hoàn tất giữ chỗ.
                  </p>
                </div>
              )}

              {tour.operationPeriod && (
                <div className="bg-[#F0F9FF] rounded-xl p-3 text-sm">
                  <p className="text-xs text-blue-500 font-medium mb-1">Thời gian hoạt động</p>
                  <p className="text-gray-800">{tour.operationPeriod}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Thời gian</span>
                  <span className="font-medium">{tour.duration}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Điểm đến</span>
                  <span className="font-medium">{tour.destination}</span>
                </div>
                {(tour.departureLocation || tour.departureCity) && (
                  <div className="flex justify-between text-gray-600">
                    <span>Khởi hành từ</span>
                    <span className="font-medium text-emerald-700">{tour.departureLocation || tour.departureCity}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Nhóm khách</span>
                  <span className="font-medium">{tour.minGuests}–{tour.maxGuests} người</span>
                </div>
              </div>

              {isAdmin ? (
                <div className="space-y-2.5 pt-2 border-t border-gray-100">
                  <div className="p-3 bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl text-xs text-blue-900">
                    <p className="font-semibold text-blue-950 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-4 h-4 text-[#075985]" /> Bảng điều khiển Admin
                    </p>
                    <p className="text-[#075985] text-[11px] leading-relaxed">
                      Bạn đang xem toàn bộ thông tin chi tiết tour. Nếu nội dung sai sự thật, xàm hoặc vi phạm, bạn có thể tạm ẩn hoặc xóa khỏi hệ thống.
                    </p>
                  </div>

                  {tour.status === "hidden" ? (
                    <Button
                      onClick={() => onToggleHideTour?.(tour.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs text-xs"
                    >
                      <Eye className="w-4 h-4" />
                      Mở hiển thị lại tour
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowHideModal(true)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs text-xs"
                    >
                      <EyeOff className="w-4 h-4" />
                      Tạm ẩn tour (Xàm / Vi phạm)
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa vĩnh viễn tour này
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleBook}
                    className={`w-full ${
                      isCustomTour
                        ? "bg-[#F97316] hover:bg-[#EA580C] text-white"
                        : "bg-red-600 hover:bg-red-700 text-white"
                    } font-semibold py-3 text-base rounded-xl`}
                  >
                    {currentUser ? (isCustomTour ? "Đặt Tour Thiết Kế Này Ngay" : "Đặt tour ngay") : "Đăng nhập để đặt"}
                  </Button>

                  {!currentUser && (
                    <p className="text-center text-xs text-gray-400">
                      Đã có tài khoản?{" "}
                      <button onClick={onShowLogin} className="text-[#075985] hover:underline">
                        Đăng nhập
                      </button>
                    </p>
                  )}
                </>
              )}

              {tour.companyName && (() => {
                const companyPhone = tour.companyPhone;
                const companyEmail = tour.companyEmail;

                return (
                  <div className="border-t border-gray-100 pt-4 space-y-2.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Liên hệ công ty</p>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-800">
                      <Building2 className="w-4 h-4 text-[#075985] flex-shrink-0" />
                      <span className="font-semibold">{tour.companyName}</span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600 pl-0.5">
                      {companyPhone && <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>SĐT: <strong className="text-gray-900 font-medium">{companyPhone}</strong></span>
                      </div>}
                      {companyEmail && <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>Email: <strong className="text-gray-900 font-medium">{companyEmail}</strong></span>
                      </div>}
                    </div>

                    {companyPhone && <a
                      href={`tel:${companyPhone.replace(/\s+/g, "")}`}
                      className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                      Gọi tư vấn miễn phí
                    </a>}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Hide Tour Modal */}
      {isAdmin && (
        <>
          <Dialog open={showHideModal} onOpenChange={setShowHideModal}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-700 text-base">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Tạm ẩn tour khỏi sàn du lịch
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Chọn hoặc nhập lý do tạm ẩn tour "<strong>{tour.name}</strong>". Tour bị ẩn sẽ không hiển thị trên sàn cho khách hàng.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">
                    Lý do thường gặp (bấm để chọn nhanh):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReasonSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setHideReason(suggestion)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all ${
                          hideReason === suggestion
                            ? "bg-amber-100 border-amber-400 text-amber-900 font-semibold"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Nội dung chi tiết lý do ẩn:
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Nhập lý do chi tiết để công ty biết và chỉnh sửa lại..."
                    value={hideReason}
                    onChange={(e) => setHideReason(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHideModal(false)}
                    className="rounded-xl text-xs"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const reason = hideReason.trim() || "Thông tin tour bị tạm ẩn do không chính xác hoặc không phù hợp.";
                      onToggleHideTour?.(tour.id, reason);
                      setShowHideModal(false);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Xác nhận Tạm ẩn tour
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Admin Delete Confirmation Modal */}
          <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <DialogContent className="max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-700 text-base">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  Xác nhận xóa vĩnh viễn tour
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-600">
                  Bạn có chắc chắn muốn xóa tour <strong>"{tour.name}"</strong>? Tour này sẽ bị gỡ bỏ hoàn toàn khỏi hệ thống sàn và không thể khôi phục.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-xl text-xs"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onDeleteTour?.(tour.id);
                    setShowDeleteModal(false);
                    onBack();
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
                >
                  Xác nhận Xóa vĩnh viễn
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
