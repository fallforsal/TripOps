import { Tour, Service } from "@/app/types";
import {
  Plus,
  Edit,
  Trash,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Package,
  TrendingUp,
  Star,
  Eye,
  User,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { CreateTourForm } from "./CreateTourForm";
import { EditTourForm } from "./EditTourForm";
import { TourDetailModal } from "./TourDetailModal";

interface AdminTourManagementProps {
  tours: Tour[];
  services: Service[];
  onCreateTour: (tourData: Omit<Tour, "id">) => void;
  onEditTour: (tour: Tour) => void;
  onDeleteTour: (tourId: string) => void;
}

export function AdminTourManagement({
  tours,
  services,
  onCreateTour,
  onEditTour,
  onDeleteTour,
}: AdminTourManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(
    null,
  );
  const [selectedTour, setSelectedTour] = useState<Tour | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const filteredTours = tours.filter(
    (tour) =>
      tour.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      tour.destination
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (tour.tourCode &&
        tour.tourCode
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  );

  // Pagination logic
  const totalPages = Math.ceil(
    filteredTours.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTours = filteredTours.slice(
    startIndex,
    endIndex,
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Statistics
  const totalTours = tours.length;
  const totalLocations = tours.reduce(
    (sum, tour) =>
      sum +
      tour.itinerary.reduce(
        (s, day) => s + day.locations.length,
        0,
      ),
    0,
  );
  const averagePrice =
    tours.length > 0
      ? tours.reduce((sum, t) => sum + t.price, 0) /
        tours.length
      : 0;
  const totalBookings = tours.reduce(
    (sum, tour) => sum + (tour.bookings || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý Tour
        </h1>
        <p className="text-gray-600">
          Tạo, chỉnh sửa và quản lý các tour du lịch
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            {totalTours}
          </p>
          <p className="text-sm text-blue-100">Tổng số tour</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            {totalLocations}
          </p>
          <p className="text-sm text-purple-100">
            Tổng địa điểm
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            {totalBookings}
          </p>
          <p className="text-sm text-yellow-100">
            Tổng booking
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-2xl font-bold mb-1">
            {formatPrice(averagePrice)}
          </p>
          <p className="text-sm text-green-100">
            Giá trung bình
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1 w-full">
          <input
            type="text"
            placeholder="Tìm kiếm tour theo tên, điểm đến hoặc mã tour..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-4 bg-[#075985] text-white rounded-xl hover:bg-[#F97316] transition-colors flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Tạo tour mới
        </button>
      </div>

      {/* Tours List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-[#075985]" />
          Danh sách tour ({filteredTours.length})
        </h2>

        {filteredTours.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy tour nào
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? "Thử tìm kiếm với từ khóa khác"
                : "Bắt đầu tạo tour mới"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedTours.map((tour) => (
              <div
                key={tour.id}
                className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-full lg:w-64 h-40 object-cover rounded-lg"
                  />

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xl text-gray-900">
                            {tour.name}
                          </h3>
                          {tour.tourCode && (
                            <span className="px-3 py-1 bg-[#E0F2FE] text-[#075985] rounded-full text-xs font-bold">
                              {tour.tourCode}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mt-1">
                          {tour.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{tour.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{tour.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Users className="w-4 h-4" />
                        <span>Max {tour.maxGuests} người</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold text-[#075985]">
                          {formatPrice(tour.price)}
                        </span>
                      </div>
                    </div>

                    {tour.itinerary &&
                      tour.itinerary.length > 0 && (
                        <div className="text-sm text-gray-600 bg-[#F0F9FF] px-3 py-2 rounded-lg">
                          <span className="font-semibold">
                            Lịch trình:
                          </span>{" "}
                          {tour.itinerary.length} ngày với{" "}
                          {tour.itinerary.reduce(
                            (sum, day) =>
                              sum +
                              (day.locations?.length || 0),
                            0,
                          )}{" "}
                          địa điểm
                        </div>
                      )}

                    {/* Admin Creator Info */}
                    {tour.createdByName && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 rounded-lg border border-[#F97316]/30">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-[#F97316] flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-medium">
                              Người tạo tour
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {tour.createdByName}
                            </p>
                            {tour.createdByEmail && (
                              <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {tour.createdByEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => setEditingTour(tour)}
                        className="px-4 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors flex items-center gap-2 font-semibold"
                      >
                        <Edit className="w-4 h-4" />
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Bạn có chắc chắn muốn xóa tour "${tour.name}"?`,
                            )
                          ) {
                            onDeleteTour(tour.id);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <Trash className="w-4 h-4" />
                        Xóa
                      </button>
                      <button
                        onClick={() => setSelectedTour(tour)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Trước
            </button>
            <span className="mx-4 text-gray-600">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Create Tour Form */}
      {showCreateForm && !editingTour && (
        <CreateTourForm
          services={services}
          onSubmit={(tourData) => {
            onCreateTour(tourData);
            setShowCreateForm(false);
          }}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Tour Form */}
      {editingTour && (
        <EditTourForm
          tour={editingTour}
          services={services}
          onSubmit={(updatedTour) => {
            onEditTour(updatedTour);
            setEditingTour(null);
          }}
          onClose={() => setEditingTour(null)}
        />
      )}

      {/* Tour Detail Modal */}
      {selectedTour && (
        <TourDetailModal
          tour={selectedTour}
          onClose={() => setSelectedTour(null)}
        />
      )}
    </div>
  );
}