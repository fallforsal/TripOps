import { useState, useRef, useEffect, type FormEvent } from "react";
import { format, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Compass,
  MapPin,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Palmtree,
  Mountain,
  Landmark,
  Briefcase,
  Users,
  X,
  Play,
  Pause,
} from "lucide-react";
import type { Tour } from "@/app/types";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { HomeTourCard } from "@/app/components/customer/HomeTourCard";
import {
  heroImage,
  homeDestinations,
} from "@/app/components/customer/homepage-media";
import type { TourSearchCriteria } from "@/app/components/customer/tour-search";
import "@/styles/customer-home.css";

interface HomePageProps {
  onShowLogin: () => void;
  popularTours: Tour[];
  onNavigate?: (page: string) => void;
  onViewTour?: (tour: Tour) => void;
  onBookTour?: (tour: Tour) => void;
  onOpenAIAdvisor?: () => void;
  onSearchTours?: (criteria: TourSearchCriteria) => void;
}

export function HomePage({
  popularTours,
  onNavigate,
  onViewTour,
  onBookTour,
  onOpenAIAdvisor,
  onSearchTours,
}: HomePageProps) {
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState<Date>();
  const [guests, setGuests] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = startOfDay(new Date());

  // Video Flycam Background State & Controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check system prefers-reduced-motion: if active, never download/play video
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const publicTours = popularTours.filter(
    (tour) =>
      tour.tourType !== "custom_request" &&
      tour.visibility !== "hidden" &&
      (tour.status === "published" ||
        tour.status === "completed" ||
        !tour.status),
  );

  const featuredTours = publicTours.slice(0, 6);

  const destinations = homeDestinations.filter((place) =>
    publicTours.some((tour) =>
      tour.destination?.toLowerCase().includes(place.name.toLowerCase()) ||
      place.name.toLowerCase().includes(tour.destination?.toLowerCase()),
    ),
  );

  const quickDestinations = [
    "Ninh Bình",
    "Sapa",
    "Đà Nẵng",
    "Phú Quốc",
    "Đà Lạt",
    "Nha Trang",
  ];

  const travelThemes = [
    {
      title: "Biển đảo & Nghỉ dưỡng",
      dest: "Phú Quốc",
      desc: "Làn nước ngọc bích & bãi cát trắng mịn",
      image: `${import.meta.env.BASE_URL}images/destinations/phu-quoc.webp`,
      icon: Palmtree,
    },
    {
      title: "Di sản văn hóa & Cố đô",
      dest: "Ninh Bình",
      desc: "Quần thể danh thắng Tràng An & Hoa Lư",
      image: `${import.meta.env.BASE_URL}images/destinations/ninh-binh.webp`,
      icon: Landmark,
    },
    {
      title: "Núi rừng & Chinh phục",
      dest: "Sapa",
      desc: "Ruộng bậc thang vàng óng & nóc nhà Đông Dương",
      image: `${import.meta.env.BASE_URL}images/destinations/sapa.webp`,
      icon: Mountain,
    },
    {
      title: "Team Building doanh nghiệp",
      dest: "Đà Nẵng",
      desc: "Bãi biển Mỹ Khê & không gian gala gắn kết",
      image: `${import.meta.env.BASE_URL}images/destinations/da-nang.webp`,
      icon: Briefcase,
    },
  ];

  function search(place = destination) {
    const criteria: TourSearchCriteria = {
      destination: place.trim(),
      departureDate: departure ? format(departure, "yyyy-MM-dd") : "",
      guests,
    };
    if (onSearchTours) {
      onSearchTours(criteria);
    } else {
      onNavigate?.("book-tours");
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    search();
  }

  return (
    <div className="trip-home font-sans bg-[#FAFBF9]">
      {/* ============================================================== */}
      {/* SECTION B: HERO — Ảnh phong cảnh lớn phủ ngang, nội dung căn giữa */}
      {/* ============================================================== */}
      <section
        className="home-hero-full relative w-full overflow-hidden bg-slate-900"
        aria-labelledby="home-title"
      >
        {/* Background Landscape Photo: Poster / Fallback when video fails or prefers-reduced-motion */}
        <img
          src={heroImage}
          alt="Phong cảnh non nước Ninh Bình, Việt Nam"
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

        {/* Scenic Flycam Video: Only loaded and mounted when prefers-reduced-motion is false */}
        {!prefersReducedMotion && !videoError && (
          <video
            ref={videoRef}
            src={`${import.meta.env.BASE_URL}videos/ninh-binh-hero.mp4`}
            poster={heroImage}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setVideoLoaded(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setVideoError(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-opacity duration-1000 ${
              videoLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Accessible Play/Pause Button */}
        {!prefersReducedMotion && !videoError && (
          <button
            type="button"
            onClick={toggleVideoPlayback}
            aria-label={isPlaying ? "Tạm dừng video nền" : "Phát tiếp video nền"}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-xs font-medium border border-white/20 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-white shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tạm dừng video</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Phát video</span>
              </>
            )}
          </button>
        )}

        {/* Balanced Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-900/40 to-slate-950/75 pointer-events-none z-10" />

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-16 lg:pt-20 lg:pb-20 flex flex-col items-center text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-medium mb-4 shadow-xs">
            <Compass className="w-3.5 h-3.5 text-teal-300" />
            <span>NỀN TẢNG DU LỊCH ĐOÀN & DOANH NGHIỆP</span>
          </div>

          {/* Main Title: 56-64px Desktop, split into 2 lines */}
          <h1
            id="home-title"
            className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-bold tracking-tight leading-[1.18] max-w-3xl drop-shadow-md"
          >
            Khám phá Việt Nam,
            <span className="block text-teal-200 mt-1">cùng đoàn của bạn.</span>
          </h1>

          {/* Description (max 2 lines) */}
          <p className="text-slate-100 text-sm sm:text-base md:text-lg max-w-xl mt-4 leading-relaxed font-normal drop-shadow-xs">
            Tìm tour phù hợp hoặc cùng công ty lữ hành thiết kế hành trình riêng cho gia đình, nhóm bạn và doanh nghiệp.
          </p>

          {/* ============================================================== */}
          {/* WHITE FLOATING SEARCH BAR — Khối tìm kiếm nổi bật trong Hero    */}
          {/* ============================================================== */}
          <div className="w-full max-w-[980px] mt-8">
            <form
              onSubmit={submitSearch}
              className="bg-white rounded-[16px] p-3 sm:p-4 shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-[#E5EAE7] flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 text-left"
              aria-label="Tìm kiếm tour"
            >
              {/* Field 1: Điểm đến */}
              <div className="flex-1 min-w-0 px-3.5 py-1.5 lg:border-r border-[#E5EAE7]">
                <label
                  htmlFor="home-destination"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#172523] mb-1"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Bạn muốn đi đâu?</span>
                </label>
                <Input
                  id="home-destination"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Địa danh hoặc tên tour"
                  className="h-8 border-0 p-0 text-sm font-medium text-[#172523] placeholder:text-[#62706C]/70 focus-visible:ring-0 shadow-none bg-transparent"
                  autoComplete="off"
                  list="home-destination-suggestions"
                />
                <datalist id="home-destination-suggestions">
                  {quickDestinations.map((place) => (
                    <option key={place} value={place} />
                  ))}
                </datalist>
              </div>

              {/* Field 2: Ngày đi dự kiến */}
              <div className="flex-1 min-w-0 px-3.5 py-1.5 lg:border-r border-[#E5EAE7] relative">
                <label
                  htmlFor="home-departure"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#172523] mb-1"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Ngày khởi hành</span>
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger
                    id="home-departure"
                    className="flex items-center justify-between w-full h-8 p-0 text-sm font-medium text-[#172523] text-left bg-transparent hover:bg-transparent shadow-none"
                  >
                    <span>
                      {departure ? (
                        format(departure, "dd/MM/yyyy")
                      ) : (
                        <span className="text-[#62706C]/70 font-normal">
                          Chọn ngày đi
                        </span>
                      )}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    className="w-auto p-0 bg-white border border-[#E5EAE7] rounded-[10px] shadow-xl z-50"
                  >
                    <Calendar
                      locale={vi}
                      labels={{
                        labelPrevious: () => "Tháng trước",
                        labelNext: () => "Tháng sau",
                      }}
                      mode="single"
                      selected={departure}
                      onSelect={(date) => {
                        setDeparture(date);
                        setCalendarOpen(false);
                      }}
                      disabled={{ before: today }}
                      fromDate={today}
                      defaultMonth={departure || today}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {departure && (
                  <button
                    type="button"
                    onClick={() => setDeparture(undefined)}
                    className="absolute right-3 top-6 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Xóa ngày đã chọn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Field 3: Số khách */}
              <div className="w-full lg:w-44 px-3.5 py-1.5">
                <label
                  htmlFor="home-guests"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#172523] mb-1"
                >
                  <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Số lượng khách</span>
                </label>
                <Input
                  id="home-guests"
                  type="number"
                  min="1"
                  step="1"
                  value={guests}
                  onChange={(event) => setGuests(event.target.value)}
                  placeholder="VD: 10 khách"
                  className="h-8 border-0 p-0 text-sm font-medium text-[#172523] placeholder:text-[#62706C]/70 focus-visible:ring-0 shadow-none bg-transparent"
                />
              </div>

              {/* Button: Tìm tour */}
              <Button
                type="submit"
                className="h-11 px-7 bg-[#0F766E] hover:bg-[#115E59] text-white text-sm font-semibold rounded-[8px] shadow-sm flex items-center justify-center gap-2 shrink-0 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Tìm tour</span>
              </Button>
            </form>

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-xs text-white">
              <span className="text-white/80 font-medium">Gợi ý phổ biến:</span>
              {quickDestinations.map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => search(place)}
                  className="px-2.5 py-1 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-sm border border-white/20 text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {place}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION C: ĐIỂM ĐẾN NỔI BẬT                                    */}
      {/* ============================================================== */}
      {destinations.length > 0 && (
        <section
          id="home-destinations"
          className="max-w-[1300px] mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20"
          aria-labelledby="destinations-title"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] flex items-center gap-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
                BẮT ĐẦU TỪ MỘT ĐIỂM ĐẾN
              </p>
              <h2
                id="destinations-title"
                className="text-2xl sm:text-3xl font-bold text-[#172523] tracking-tight"
              >
                Điểm đến nổi bật tại Việt Nam
              </h2>
            </div>
            <p className="text-sm text-[#62706C] max-w-md">
              Khám phá các vùng đất tuyệt đẹp được các đoàn khách yêu thích nhất.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((place) => (
              <button
                key={place.name}
                onClick={() => search(place.name)}
                className="group relative rounded-[12px] overflow-hidden text-left bg-white border border-[#E5EAE7] hover:border-slate-300 shadow-xs hover:shadow-md transition-all cursor-pointer aspect-[4/3] flex flex-col justify-end p-5"
                aria-label={`Khám phá tour tại ${place.name}`}
              >
                <img
                  src={place.image}
                  alt={`Phong cảnh ${place.name}`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

                {/* Region Tag */}
                <span className="absolute top-3.5 left-3.5 px-2.5 py-0.5 rounded-full bg-white/95 text-[11px] font-semibold text-slate-800 shadow-xs backdrop-blur-xs">
                  {place.region}
                </span>

                {/* Bottom Caption on Image */}
                <div className="relative z-10 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg sm:text-xl text-white group-hover:text-teal-200 transition-colors">
                      {place.name}
                    </h3>
                    <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center group-hover:bg-[#0F766E] transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-xs text-slate-200/90 mt-1 line-clamp-1">
                    {place.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* SECTION D: TOUR CHO CHUYẾN ĐI SẮP TỚI                          */}
      {/* ============================================================== */}
      <section
        className="max-w-[1300px] mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20 border-t border-[#E5EAE7]"
        aria-labelledby="featured-title"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-9">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
              HÀNH TRÌNH ĐẶC SẮC
            </p>
            <h2
              id="featured-title"
              className="text-2xl sm:text-3xl font-bold text-[#172523] tracking-tight"
            >
              Hành trình sẵn sàng cho chuyến đi sắp tới
            </h2>
            <p className="text-sm text-[#62706C] mt-1">
              Lịch trình trọn gói, khởi hành định kỳ và được điều hành bởi các đơn vị lữ hành uy tín.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigate?.("book-tours")}
            className="border-[#E5EAE7] hover:border-[#0F766E] text-[#0F766E] font-semibold text-xs h-9 px-4 rounded-[8px] flex items-center gap-1.5 shrink-0 bg-white"
          >
            <span>Xem tất cả tour</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {featuredTours.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {featuredTours.map((tour) => (
              <HomeTourCard
                key={tour.id}
                tour={tour}
                onView={(selected) => onViewTour?.(selected)}
                onBook={onBookTour}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[12px] border border-[#E5EAE7] p-12 text-center max-w-md mx-auto shadow-xs">
            <Compass className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#172523]">Chưa có tour hiển thị</h3>
            <p className="text-xs text-[#62706C] mt-1 mb-4">
              Bạn có thể gửi yêu cầu để công ty du lịch thiết kế lịch trình riêng cho đoàn.
            </p>
            <Button
              onClick={() => onNavigate?.("custom-tour")}
              className="bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold rounded-[8px] h-9"
            >
              Gửi yêu cầu thiết kế tour
            </Button>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* SECTION E: KHÁM PHÁ THEO PHONG CÁCH DU LỊCH                    */}
      {/* ============================================================== */}
      <section
        className="max-w-[1300px] mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20 border-t border-[#E5EAE7]"
        aria-labelledby="themes-title"
      >
        <div className="mb-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
            CẢM HỨNG DU LỊCH
          </p>
          <h2
            id="themes-title"
            className="text-2xl sm:text-3xl font-bold text-[#172523] tracking-tight"
          >
            Khám phá theo phong cách du lịch
          </h2>
          <p className="text-sm text-[#62706C] mt-1">
            Lựa chọn chủ đề trải nghiệm phù hợp với mục tiêu và sở thích của các thành viên trong đoàn.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {travelThemes.map((theme) => (
            <button
              key={theme.title}
              type="button"
              onClick={() => search(theme.dest)}
              className="group relative rounded-[12px] overflow-hidden text-left bg-white border border-[#E5EAE7] hover:border-slate-300 shadow-xs hover:shadow-md transition-all cursor-pointer aspect-[3/4] flex flex-col justify-end p-5"
            >
              <img
                src={theme.image}
                alt={theme.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

              <div className="relative z-10 text-white">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mb-2.5">
                  <theme.icon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-teal-200 transition-colors leading-snug">
                  {theme.title}
                </h3>
                <p className="text-[11px] text-slate-200/90 mt-1 line-clamp-2">
                  {theme.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION F: BỐ CỤC BẤT ĐỐI XỨNG — THIẾT KẾ TOUR THEO YÊU CẦU    */}
      {/* ============================================================== */}
      <section
        className="max-w-[1300px] mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20 border-t border-[#E5EAE7]"
        aria-labelledby="custom-title"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Large Landscape Photo on the Left (7 cols) */}
          <div className="lg:col-span-7 relative rounded-[12px] overflow-hidden bg-slate-100 border border-[#E5EAE7] aspect-[16/11] shadow-xs">
            <img
              src={`${import.meta.env.BASE_URL}images/destinations/da-lat.webp`}
              alt="Hành trình du lịch thiết kế theo đoàn"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-xs p-4 rounded-[10px] border border-white/40 shadow-md flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-[8px] bg-[#0F766E] text-white flex items-center justify-center shrink-0">
                <Route className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#172523]">Hành trình riêng biệt cho đoàn</p>
                <p className="text-[11px] text-[#62706C]">Chủ động ngày đi, điểm dừng và mức ngân sách</p>
              </div>
            </div>
          </div>

          {/* Short Copy & CTA on the Right (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] flex items-center gap-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
              THIẾT KẾ THEO YÊU CẦU ĐOÀN
            </p>
            <h2
              id="custom-title"
              className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-[#172523] tracking-tight leading-snug"
            >
              Một hành trình riêng
              <br />
              cho đoàn của bạn.
            </h2>
            <p className="text-sm text-[#62706C] mt-3.5 leading-relaxed">
              Tự do lựa chọn ngày khởi hành, điểm tham quan yêu thích và mức ngân sách phù hợp. Các công ty lữ hành uy tín trên TripOps sẽ trực tiếp khảo sát và đề xuất phương án tối ưu trong 24 giờ.
            </p>

            {/* Checklist */}
            <div className="space-y-2.5 my-6">
              <div className="flex items-center gap-2.5 text-xs text-[#172523] font-medium">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Chủ động lịch trình, nâng cấp khách sạn và thực đơn ẩm thực</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#172523] font-medium">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Nhận nhiều báo giá cạnh tranh, minh bạch từ các đơn vị lữ hành</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-[#172523] font-medium">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Hỗ trợ hợp đồng du lịch, xuất hóa đơn VAT và bảo hiểm đầy đủ</span>
              </div>
            </div>

            <Button
              onClick={() => onNavigate?.("custom-tour")}
              className="h-11 px-6 bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs rounded-[8px] shadow-xs flex items-center gap-2 transition-colors"
            >
              <span>Yêu cầu thiết kế tour</span>
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION G: QUY TRÌNH 3 BƯỚC MINH BẠCH                          */}
      {/* ============================================================== */}
      <section
        id="home-how-it-works"
        className="max-w-[1300px] mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20 border-t border-[#E5EAE7]"
        aria-labelledby="how-title"
      >
        <div className="text-center max-w-xl mx-auto mb-11">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0F766E] mb-1.5">
            QUY TRÌNH MINH BẠCH
          </p>
          <h2
            id="how-title"
            className="text-2xl sm:text-3xl font-bold text-[#172523] tracking-tight"
          >
            Quy trình 3 bước đơn giản
          </h2>
          <p className="text-sm text-[#62706C] mt-1">
            Quy trình chuẩn hóa giúp khách đoàn dễ dàng lên kế hoạch và an tâm khởi hành.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              icon: Search,
              title: "Chọn tour hoặc gửi yêu cầu",
              text: "Khám phá hàng chục tour có sẵn hoặc gửi thông tin để các công ty lữ hành tư vấn phương án riêng cho đoàn.",
            },
            {
              step: "02",
              icon: SlidersHorizontal,
              title: "Công ty lữ hành xác nhận phương án",
              text: "Trao đổi chi tiết lịch trình, danh sách khách, dịch vụ nâng cấp và nhận xác nhận chính thức.",
            },
            {
              step: "03",
              icon: Compass,
              title: "Đặt cọc và chuẩn bị chuyến đi",
              text: "Thanh toán đặt cọc an tâm, theo dõi tiến độ chuẩn bị và khởi hành cùng hướng dẫn viên suốt tuyến.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white border border-[#E5EAE7] rounded-[12px] p-6 sm:p-7 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#E5EAE7] pb-4 mb-4">
                  <div className="w-10 h-10 rounded-[8px] bg-teal-50 text-[#0F766E] flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-slate-300 font-mono">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#172523] mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-[#62706C] leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION: AI TOUR ADVISOR BANNER                                */}
      {/* ============================================================== */}
      {onOpenAIAdvisor && (
        <section
          className="max-w-[1300px] mx-auto px-6 sm:px-8 lg:px-12 pb-16 lg:pb-20"
          aria-labelledby="ai-title"
        >
          <div className="rounded-[12px] bg-teal-50/80 border border-teal-200/80 p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-[8px] bg-[#0F766E] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="ai-title"
                  className="text-base sm:text-lg font-bold text-[#172523]"
                >
                  Chưa biết lựa chọn hành trình nào?
                </h3>
                <p className="text-xs sm:text-sm text-[#62706C] mt-0.5">
                  Trò chuyện cùng trợ lý AI của TripOps để nhận gợi ý tour và dự toán chi phí phù hợp nhất cho đoàn trong 1 phút.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onOpenAIAdvisor}
              className="border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E] hover:text-white font-semibold text-xs h-10 px-5 rounded-[8px] shrink-0 transition-colors flex items-center gap-1.5 bg-white"
            >
              <span>Tìm tour cùng AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
