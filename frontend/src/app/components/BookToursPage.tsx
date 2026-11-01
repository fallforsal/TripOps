import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Compass,
  ArrowUpDown,
} from "lucide-react";
import { Tour, User } from "@/app/types";
import { TourCard } from "@/app/components/customer/TourCard";
import { PageHeader } from "@/app/components/customer/PageHeader";
import { EmptyState } from "@/app/components/customer/EmptyState";
import { Button } from "@/app/components/ui/button";
import { matchesTourSearch, normalizeDestination, type TourSearchCriteria } from "@/app/components/customer/tour-search";

interface BookToursPageProps {
  initialSearch?: TourSearchCriteria;
  onClearSearch?: () => void;
  tours: Tour[];
  currentUser?: User | null;
  onShowLogin?: () => void;
  onBookTour?: (tourId: string, numberOfGuests: number, startDate: string) => void;
  onViewTour?: (tour: Tour) => void;
  onOpenBookingForm?: (tour: Tour) => void;
}

const ITEMS_PER_PAGE = 6;

const BOOK_TOURS_STORAGE_KEY = "tripops_book_tours_state";

interface SavedBookToursState {
  searchTerm?: string;
  searchGuests?: string;
  searchDeparture?: string;
  selectedDestination?: string;
  selectedCompany?: string;
  selectedPriceRange?: string;
  selectedDuration?: string;
  sortBy?: "featured" | "price-asc" | "price-desc" | "duration";
  currentPage?: number;
}

function getSavedBookToursState(): SavedBookToursState | null {
  try {
    const raw = sessionStorage.getItem(BOOK_TOURS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function BookToursPage({
  initialSearch,
  onClearSearch,
  tours,
  currentUser,
  onShowLogin,
  onBookTour,
  onViewTour,
  onOpenBookingForm,
}: BookToursPageProps) {
  // Filter & Search states - initialized from props or persisted sessionStorage
  const [savedFilters] = useState<SavedBookToursState | null>(() => getSavedBookToursState());

  const hasExplicitInitialSearch = Boolean(
    initialSearch?.destination || initialSearch?.guests || initialSearch?.departureDate
  );

  const [searchTerm, setSearchTerm] = useState<string>(() => {
    if (hasExplicitInitialSearch) return initialSearch?.destination || "";
    return savedFilters?.searchTerm ?? initialSearch?.destination ?? "";
  });
  const [searchGuests, setSearchGuests] = useState<string>(() => {
    if (hasExplicitInitialSearch) return initialSearch?.guests || "";
    return savedFilters?.searchGuests ?? initialSearch?.guests ?? "";
  });
  const [searchDeparture, setSearchDeparture] = useState<string>(() => {
    if (hasExplicitInitialSearch) return initialSearch?.departureDate || "";
    return savedFilters?.searchDeparture ?? initialSearch?.departureDate ?? "";
  });
  const [selectedDestination, setSelectedDestination] = useState<string>(
    () => (hasExplicitInitialSearch ? "all" : savedFilters?.selectedDestination ?? "all")
  );
  const [selectedCompany, setSelectedCompany] = useState<string>(
    () => savedFilters?.selectedCompany ?? "all"
  );
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>(
    () => savedFilters?.selectedPriceRange ?? "all"
  );
  const [selectedDuration, setSelectedDuration] = useState<string>(
    () => savedFilters?.selectedDuration ?? "all"
  );
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc" | "duration">(
    () => savedFilters?.sortBy ?? "featured"
  );
  const [currentPage, setCurrentPage] = useState<number>(
    () => (hasExplicitInitialSearch ? 1 : savedFilters?.currentPage ?? 1)
  );

  // Sync when user executes a new search from elsewhere (e.g., header search or home search)
  useEffect(() => {
    if (initialSearch && (initialSearch.destination || initialSearch.guests || initialSearch.departureDate)) {
      setSearchTerm(initialSearch.destination || "");
      setSearchGuests(initialSearch.guests || "");
      setSearchDeparture(initialSearch.departureDate || "");
      setSelectedDestination("all");
      setCurrentPage(1);
    }
  }, [initialSearch?.destination, initialSearch?.guests, initialSearch?.departureDate]);

  // Persist current filters & pagination to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        BOOK_TOURS_STORAGE_KEY,
        JSON.stringify({
          searchTerm,
          searchGuests,
          searchDeparture,
          selectedDestination,
          selectedCompany,
          selectedPriceRange,
          selectedDuration,
          sortBy,
          currentPage,
        })
      );
    } catch {}
  }, [
    searchTerm,
    searchGuests,
    searchDeparture,
    selectedDestination,
    selectedCompany,
    selectedPriceRange,
    selectedDuration,
    sortBy,
    currentPage,
  ]);

  // Available filter options extracted from data
  const publicTours = useMemo(() => {
    return tours.filter(
      (t) =>
        t.tourType !== "custom_request" &&
        t.visibility !== "hidden" &&
        (t.status === "published" || t.status === "completed" || !t.status)
    );
  }, [tours]);

  const destinations = useMemo(() => {
    return Array.from(new Set(publicTours.map((t) => t.destination).filter(Boolean)));
  }, [publicTours]);

  const companies = useMemo(() => {
    return Array.from(
      new Set(publicTours.map((t) => t.companyName).filter((c): c is string => Boolean(c)))
    );
  }, [publicTours]);

  // Filter application
  const filteredTours = useMemo(() => {
    return publicTours.filter((tour) => {
      if (!matchesTourSearch(tour, { destination: "", guests: searchGuests, departureDate: searchDeparture })) return false;
      // Search term
      if (searchTerm.trim()) {
        const term = normalizeDestination(searchTerm);
        const matchName = normalizeDestination(tour.name).includes(term);
        const matchDest = normalizeDestination(tour.destination).includes(term);
        const matchCompany = normalizeDestination(tour.companyName || "").includes(term);
        if (!matchName && !matchDest && !matchCompany) return false;
      }

      // Destination filter
      if (selectedDestination !== "all" && tour.destination !== selectedDestination) {
        return false;
      }

      // Company filter
      if (selectedCompany !== "all" && tour.companyName !== selectedCompany) {
        return false;
      }

      // Duration filter
      if (selectedDuration !== "all") {
        const days = tour.numberOfDays || (tour.duration.includes("2N") ? 2 : tour.duration.includes("3N") ? 3 : tour.duration.includes("4N") ? 4 : 5);
        if (selectedDuration === "short" && days > 2) return false;
        if (selectedDuration === "medium" && (days < 3 || days > 4)) return false;
        if (selectedDuration === "long" && days < 5) return false;
      }

      // Price filter
      if (selectedPriceRange !== "all") {
        if (selectedPriceRange === "under3" && tour.price >= 3000000) return false;
        if (selectedPriceRange === "3to6" && (tour.price < 3000000 || tour.price > 6000000)) return false;
        if (selectedPriceRange === "above6" && tour.price <= 6000000) return false;
      }

      return true;
    });
  }, [publicTours, searchTerm, selectedDestination, selectedCompany, selectedDuration, selectedPriceRange, searchGuests, searchDeparture]);

  // Sort
  const sortedTours = useMemo(() => {
    const list = [...filteredTours];
    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "duration") {
      list.sort((a, b) => (b.numberOfDays || 0) - (a.numberOfDays || 0));
    }
    return list;
  }, [filteredTours, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedTours.length / ITEMS_PER_PAGE) || 1;
  const paginatedTours = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTours.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTours, currentPage]);

  const activeFiltersCount = [
    selectedDestination !== "all",
    selectedCompany !== "all",
    selectedPriceRange !== "all",
    selectedDuration !== "all",
    Boolean(searchTerm.trim()),
    Boolean(searchGuests),
    Boolean(searchDeparture),
  ].filter(Boolean).length;

  const handleClearAllFilters = () => {
    try {
      sessionStorage.removeItem(BOOK_TOURS_STORAGE_KEY);
    } catch {}
    onClearSearch?.();
    setSearchGuests("");
    setSearchDeparture("");
    setSearchTerm("");
    setSelectedDestination("all");
    setSelectedCompany("all");
    setSelectedPriceRange("all");
    setSelectedDuration("all");
    setSortBy("featured");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      <PageHeader
        title="Khám phá danh sách tour"
        subtitle="Tìm kiếm và đối chiếu các chương trình tour tiêu chuẩn từ các Travel Agency uy tín"
      />

      {(searchGuests || searchDeparture) && (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 space-y-2" aria-label="Nhu cầu tìm tour">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-slate-900">Nhu cầu của đoàn:</span>
            {searchGuests && <button className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1" onClick={() => { setSearchGuests(""); setCurrentPage(1); }} aria-label={`Bỏ lọc ${searchGuests} khách`}>{searchGuests} khách<X className="size-3" /></button>}
            {searchDeparture && <button className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1" onClick={() => { setSearchDeparture(""); setCurrentPage(1); }} aria-label="Bỏ ngày đi dự kiến">Ngày dự kiến: {searchDeparture.split("-").reverse().join("/")}<X className="size-3" /></button>}
          </div>
          {searchDeparture && <p className="text-xs leading-relaxed">Ngày đi dự kiến sẽ được công ty du lịch xác nhận. Với tour có lịch khởi hành cố định, kết quả được lọc theo ngày đã chọn.</p>}
        </div>
      )}

      {/* Filter and Search Bar Container */}
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 space-y-4">
        {/* Top search & Sort row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên tour, điểm đến, hoặc tên công ty lữ hành..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 pl-10 pr-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort selection */}
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs text-[#475569] font-medium shrink-0 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sắp xếp:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[6px] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              <option value="featured">Phổ biến nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
              <option value="duration">Thời lượng dài nhất</option>
            </select>
          </div>
        </div>

        {/* Filter Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#F1F5F9]">
          {/* Destination */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Điểm đến</label>
            <select
              value={selectedDestination}
              onChange={(e) => {
                setSelectedDestination(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              <option value="all">Tất cả điểm đến</option>
              {destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Agency */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Travel Agency</label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              <option value="all">Tất cả đơn vị</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Thời lượng</label>
            <select
              value={selectedDuration}
              onChange={(e) => {
                setSelectedDuration(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              <option value="all">Tất cả thời lượng</option>
              <option value="short">Dưới 3 ngày (1-2 ngày)</option>
              <option value="medium">3 đến 4 ngày</option>
              <option value="long">Từ 5 ngày trở lên</option>
            </select>
          </div>

          {/* Budget */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#475569]">Ngân sách / khách</label>
            <select
              value={selectedPriceRange}
              onChange={(e) => {
                setSelectedPriceRange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]"
            >
              <option value="all">Tất cả mức giá</option>
              <option value="under3">Dưới 3.000.000 ₫</option>
              <option value="3to6">3.000.000 – 6.000.000 ₫</option>
              <option value="above6">Trên 6.000.000 ₫</option>
            </select>
          </div>
        </div>

        {/* Applied Filters Tags & Clear Button */}
        {activeFiltersCount > 0 && (
          <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#475569]">
                Đang lọc ({activeFiltersCount}):
              </span>

              {selectedDestination !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F9FF] border border-[#BAE6FD] text-[#075985] text-xs rounded-[4px]">
                  Điểm đến: {selectedDestination}
                  <button onClick={() => setSelectedDestination("all")}>
                    <X className="w-3 h-3 text-[#075985] hover:text-[#0C4A6E]" />
                  </button>
                </span>
              )}

              {selectedCompany !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F9FF] border border-[#BAE6FD] text-[#075985] text-xs rounded-[4px]">
                  Agency: {selectedCompany}
                  <button onClick={() => setSelectedCompany("all")}>
                    <X className="w-3 h-3 text-[#075985] hover:text-[#0C4A6E]" />
                  </button>
                </span>
              )}

              {selectedDuration !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F9FF] border border-[#BAE6FD] text-[#075985] text-xs rounded-[4px]">
                  Thời lượng: {selectedDuration === "short" ? "< 3 ngày" : selectedDuration === "medium" ? "3-4 ngày" : ">= 5 ngày"}
                  <button onClick={() => setSelectedDuration("all")}>
                    <X className="w-3 h-3 text-[#075985] hover:text-[#0C4A6E]" />
                  </button>
                </span>
              )}

              {selectedPriceRange !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F9FF] border border-[#BAE6FD] text-[#075985] text-xs rounded-[4px]">
                  Ngân sách: {selectedPriceRange === "under3" ? "< 3 triệu" : selectedPriceRange === "3to6" ? "3 - 6 triệu" : "> 6 triệu"}
                  <button onClick={() => setSelectedPriceRange("all")}>
                    <X className="w-3 h-3 text-[#075985] hover:text-[#0C4A6E]" />
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0F9FF] border border-[#BAE6FD] text-[#075985] text-xs rounded-[4px]">
                  Từ khóa: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")}>
                    <X className="w-3 h-3 text-[#075985] hover:text-[#0C4A6E]" />
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={handleClearAllFilters}
              className="text-xs text-[#B91C1C] hover:underline font-medium inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Xóa toàn bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#475569]">
        <span>
          Hiển thị <strong>{sortedTours.length}</strong> tour phù hợp
        </span>
        <span>
          Trang {currentPage} / {totalPages}
        </span>
      </div>

      {/* Tours Grid */}
      {paginatedTours.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedTours.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              onViewTour={(t) => onViewTour && onViewTour(t)}
              onBookTour={(t) => {
                if (onOpenBookingForm) {
                  onOpenBookingForm(t);
                } else if (onBookTour) {
                  onBookTour(t.id, t.minGuests || 1, new Date().toISOString().split("T")[0]);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="Không tìm thấy tour phù hợp"
          description="Rất tiếc chúng tôi không tìm thấy chương trình tour nào khớp với bộ lọc của bạn. Bạn hãy thử điều chỉnh lại từ khóa hoặc mức giá."
          actionText="Xóa tất cả bộ lọc"
          onAction={handleClearAllFilters}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pt-6 border-t border-[#CBD5E1] flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => {
              setCurrentPage((prev) => Math.max(1, prev - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="border-[#CBD5E1] h-8 px-3 text-xs rounded-[6px]"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            <span>Trang trước</span>
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`w-8 h-8 rounded-[6px] text-xs font-semibold transition-colors ${
                  currentPage === page
                    ? "bg-[#075985] text-white"
                    : "bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-[#F8FAFC]"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => {
              setCurrentPage((prev) => Math.min(totalPages, prev + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="border-[#CBD5E1] h-8 px-3 text-xs rounded-[6px]"
          >
            <span>Trang sau</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
