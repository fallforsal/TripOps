/**
 * Example Component: Tour List with API
 * Ví dụ sử dụng API services để fetch và hiển thị tours
 */

import { useEffect, useState } from "react";
import { useApi } from "@/app/hooks/useApi";
import { getAllTours, searchTours } from "@/app/services";
import { Tour } from "@/app/types";
import {
  Search,
  MapPin,
  Clock,
  Users,
  Star,
} from "lucide-react";

/**
 * Example 1: Sử dụng useApi hook (Recommended)
 */
export function TourListWithHook() {
  const [searchKeyword, setSearchKeyword] = useState("");

  // Fetch all tours on mount
  const {
    data: tours,
    loading,
    error,
    execute,
  } = useApi(getAllTours);

  useEffect(() => {
    execute();
  }, []);

  const handleSearch = () => {
    // Search with keyword
    const searchApi = useApi(searchTours);
    searchApi.execute({ keyword: searchKeyword });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#075985]"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Lỗi: {error}</p>
        <button
          onClick={() => execute()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // No data state
  if (!tours || tours.length === 0) {
    return (
      <div className="text-center p-12">
        <p className="text-gray-500">Không có tour nào</p>
      </div>
    );
  }

  // Success state - render tours
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Tìm kiếm tour..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985]"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Tìm
        </button>
      </div>

      {/* Tour Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
    </div>
  );
}

/**
 * Example 2: Sử dụng trực tiếp async/await
 */
export function TourListWithDirectCall() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTours = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllTours();

      if (response.success && response.data) {
        setTours(response.data);
      } else {
        setError(response.error || "Không thể tải tours");
      }
    } catch (err) {
      setError("Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map((tour) => (
        <TourCard key={tour.id} tour={tour} />
      ))}
    </div>
  );
}

/**
 * Tour Card Component
 */
function TourCard({ tour }: { tour: Tour }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      {/* Tour Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={tour.image}
          alt={tour.name}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-semibold">
            {tour.rating}
          </span>
        </div>
      </div>

      {/* Tour Info */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg text-gray-900">
          {tour.name}
        </h3>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{tour.destination}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{tour.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Tối đa {tour.maxGuests} người</span>
          </div>
        </div>

        <div className="pt-3 border-t flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Giá từ</p>
            <p className="text-xl font-bold text-[#075985]">
              {tour.price.toLocaleString("vi-VN")}đ
            </p>
          </div>
          <button className="px-4 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors text-sm font-semibold">
            Đặt ngay
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 3: Search with filters
 */
export function TourSearchExample() {
  const [filters, setFilters] = useState({
    keyword: "",
    destination: "",
    minPrice: 0,
    maxPrice: 10000000,
  });

  const { data: tours, loading, execute } = useApi(searchTours);

  const handleSearch = () => {
    execute(filters);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-bold text-lg mb-4">
          Tìm kiếm tour
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Từ khóa..."
            value={filters.keyword}
            onChange={(e) =>
              setFilters({
                ...filters,
                keyword: e.target.value,
              })
            }
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Điểm đến..."
            value={filters.destination}
            onChange={(e) =>
              setFilters({
                ...filters,
                destination: e.target.value,
              })
            }
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="number"
            placeholder="Giá tối thiểu"
            value={filters.minPrice}
            onChange={(e) =>
              setFilters({
                ...filters,
                minPrice: Number(e.target.value),
              })
            }
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="number"
            placeholder="Giá tối đa"
            value={filters.maxPrice}
            onChange={(e) =>
              setFilters({
                ...filters,
                maxPrice: Number(e.target.value),
              })
            }
            className="px-4 py-2 border rounded-lg"
          />
        </div>
        <button
          onClick={handleSearch}
          className="mt-4 px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316]"
        >
          Tìm kiếm
        </button>
      </div>

      {/* Results */}
      {loading && <div>Đang tìm kiếm...</div>}
      {tours && tours.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
      {tours && tours.length === 0 && (
        <div className="text-center p-12 text-gray-500">
          Không tìm thấy tour phù hợp
        </div>
      )}
    </div>
  );
}