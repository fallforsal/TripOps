import { useState } from "react";
import { Service } from "@/app/types";
import {
  CheckCircle,
  XCircle,
  Clock,
  Hotel,
  Utensils,
  Coffee,
  Car,
  Activity,
  MapPin,
  Calendar,
  User,
  Star,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { RejectServiceModal } from "./RejectServiceModal";

interface ServiceModerationProps {
  services: Service[];
  onApproveService: (serviceId: string) => void;
  onRejectService: (serviceId: string, reason: string) => void;
}

export function ServiceModeration({
  services,
  onApproveService,
  onRejectService,
}: ServiceModerationProps) {
  const [expandedService, setExpandedService] = useState<
    string | null
  >(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [filterCategory, setFilterCategory] = useState<
    | "all"
    | "hotel"
    | "fnb"
    | "transportation"
    | "activity"
  >("all");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [serviceToReject, setServiceToReject] =
    useState<Service | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<{
    [key: string]: number;
  }>({});

  const pendingServices = services.filter(
    (s) => s.status === "pending",
  );
  const approvedServices = services.filter(
    (s) => s.status === "approved",
  );
  const rejectedServices = services.filter(
    (s) => s.status === "rejected",
  );

  const filteredServices = services.filter((s) => {
    const matchesStatus =
      filterStatus === "all" || s.status === filterStatus;
    const matchesCategory =
      filterCategory === "all" || s.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "hotel":
        return Hotel;
      case "fnb":
        return Utensils;
      case "transportation":
        return Car;
      case "activity":
        return Activity;
      default:
        return Hotel;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "hotel":
        return "Khách sạn";
      case "fnb":
        return "Ẩm thực";
      case "transportation":
        return "Lữ hành";
      case "activity":
        return "Khu vui chơi";
      default:
        return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hotel":
        return "blue";
      case "fnb":
        return "purple";
      case "transportation":
        return "green";
      case "activity":
        return "pink";
      default:
        return "gray";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const renderServiceDetails = (service: Service) => {
    const details: {
      label: string;
      value: string | number | undefined;
    }[] = [
      {
        label: "Giá",
        value: service.price
          ? formatPrice(service.price)
          : undefined,
      },
      { label: "Địa điểm", value: service.location },
      { label: "Sức chứa", value: service.capacity },
    ];

    // Category specific details
    if (service.category === "hotel") {
      details.push(
        {
          label: "Xếp hạng",
          value: service.stars
            ? `${service.stars} sao`
            : undefined,
        },
        { label: "Check-in", value: service.checkInTime },
        { label: "Check-out", value: service.checkOutTime },
      );
    } else if (
      service.category === "fnb"
    ) {
      details.push(
        { label: "Ẩm thực", value: service.cuisine },
        { label: "Giờ mở cửa", value: service.openingHours },
        { label: "Mức giá", value: service.priceRange },
      );
    } else if (service.category === "transportation") {
      details.push(
        { label: "Loại xe", value: service.vehicleType },
        { label: "Số chỗ", value: service.seats },
      );
    } else if (service.category === "activity") {
      details.push(
        { label: "Thời gian", value: service.duration },
        { label: "Độ khó", value: service.difficulty },
        {
          label: "Giới hạn tuổi",
          value: service.ageRestriction,
        },
      );
    }

    return details.filter((d) => d.value);
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= count
                ? "text-yellow-500 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const ServiceCard = ({
    service,
    showActions = false,
  }: {
    service: Service;
    showActions?: boolean;
  }) => {
    const Icon = getCategoryIcon(service.category);
    const color = getCategoryColor(service.category);
    const isExpanded = expandedService === service.id;

    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-all">
        <div className="p-6">
          <div className="flex gap-4">
            {/* Service Image */}
            <div className="w-32 h-32 flex-shrink-0 relative">
              <img
                src={
                  service.images &&
                  service.images.length > 0
                    ? service.images[
                        selectedImageIndex[service.id] || 0
                      ]
                    : service.image
                }
                alt={service.name}
                className="w-full h-full object-cover rounded-xl"
              />
              {service.images && service.images.length > 1 && (
                <div className="absolute bottom-1 right-1 bg-black/50 text-white px-2 py-0.5 rounded-full text-xs">
                  {(selectedImageIndex[service.id] || 0) + 1} /{" "}
                  {service.images.length}
                </div>
              )}
            </div>

            {/* Service Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 bg-gradient-to-br from-${color}-400 to-${color}-600 rounded-lg flex items-center justify-center`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {service.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getCategoryLabel(service.category)}
                    </p>
                  </div>
                </div>
                {service.status === "pending" && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Chờ duyệt
                  </span>
                )}
                {service.status === "approved" && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Đã duyệt
                  </span>
                )}
                {service.status === "rejected" && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Đã từ chối
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-3 line-clamp-2">
                {service.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{service.providerName}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">
                    {service.location}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(
                      service.createdAt,
                    ).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="text-[#075985] font-bold">
                  {service.price
                    ? formatPrice(service.price)
                    : "Liên hệ"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setExpandedService(
                      isExpanded ? null : service.id,
                    )
                  }
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Ẩn chi tiết
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Xem chi tiết
                    </>
                  )}
                </button>

                {showActions &&
                  service.status === "pending" && (
                    <>
                      <button
                        onClick={() =>
                          onApproveService(service.id)
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Chấp nhận
                      </button>
                      <button
                        onClick={() => {
                          setServiceToReject(service);
                          setRejectModalOpen(true);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Từ chối
                      </button>
                    </>
                  )}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <h4 className="font-bold text-gray-900 mb-3">
                Chi tiết dịch vụ
              </h4>

              {/* Image Gallery */}
              {service.images && service.images.length > 1 && (
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-900 mb-2">
                    Hình ảnh ({service.images.length})
                  </h5>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {service.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          setSelectedImageIndex({
                            ...selectedImageIndex,
                            [service.id]: idx,
                          })
                        }
                        className={`flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${
                          (selectedImageIndex[service.id] || 0) === idx
                            ? "border-[#075985] ring-2 ring-blue-200"
                            : "border-gray-300 hover:border-blue-400"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${service.name} - Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {renderServiceDetails(service).map(
                  (detail, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <p className="text-xs text-gray-600 mb-1">
                        {detail.label}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {detail.value}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {/* Amenities for hotels */}
              {service.category === "hotel" &&
                service.amenities &&
                service.amenities.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-gray-900 mb-2">
                      Tiện nghi
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {service.amenities.map(
                        (amenity, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-[#E0F2FE] text-[#075985] rounded-full text-sm"
                          >
                            {amenity}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Stars for hotels */}
              {service.category === "hotel" &&
                service.stars && (
                  <div className="mt-4">
                    <h5 className="font-semibold text-gray-900 mb-2">
                      Xếp hạng
                    </h5>
                    {renderStars(service.stars)}
                  </div>
                )}

              {/* Rejection Reason */}
              {service.status === "rejected" &&
                service.rejectionReason && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="font-semibold text-red-800 mb-2">
                      Lý do từ chối
                    </h5>
                    <p className="text-red-700 text-sm">
                      {service.rejectionReason}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {pendingServices.length}
              </p>
              <p className="text-sm text-yellow-100">
                Chờ duyệt
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {approvedServices.length}
              </p>
              <p className="text-sm text-green-100">Đã duyệt</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {rejectedServices.length}
              </p>
              <p className="text-sm text-red-100">Đã từ chối</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          Dịch vụ
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 ${
              filterStatus === "all"
                ? "bg-[#075985] text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 ${
              filterStatus === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Chờ duyệt
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`px-4 py-2 ${
              filterStatus === "approved"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => setFilterStatus("rejected")}
            className={`px-4 py-2 ${
              filterStatus === "rejected"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Đã từ chối
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">
          Danh mục
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-4 py-2 ${
              filterCategory === "all"
                ? "bg-[#075985] text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterCategory("hotel")}
            className={`px-4 py-2 ${
              filterCategory === "hotel"
                ? "bg-[#075985] text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Khách sạn
          </button>
          <button
            onClick={() => setFilterCategory("fnb")}
            className={`px-4 py-2 ${
              filterCategory === "fnb"
                ? "bg-[#F97316] text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Ẩm thực
          </button>
          <button
            onClick={() => setFilterCategory("transportation")}
            className={`px-4 py-2 ${
              filterCategory === "transportation"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Vận chuyển
          </button>
          <button
            onClick={() => setFilterCategory("attraction")}
            className={`px-4 py-2 ${
              filterCategory === "attraction"
                ? "bg-teal-600 text-white"
                : "bg-gray-100 text-gray-700"
            } rounded-lg hover:bg-gray-200 transition-colors font-semibold`}
          >
            Tham quan
          </button>
        </div>
      </div>

      {/* Services */}
      {filteredServices.length > 0 && (
        <div>
          <div className="space-y-4">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                showActions={service.status === "pending"}
              />
            ))}
          </div>
        </div>
      )}

      {filteredServices.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Không có dịch vụ nào chờ duyệt
          </h3>
          <p className="text-gray-600">
            Tất cả dịch vụ đã được xử lý
          </p>
        </div>
      )}

      {/* Reject Service Modal */}
      {rejectModalOpen && serviceToReject && (
        <RejectServiceModal
          isOpen={rejectModalOpen}
          onClose={() => {
            setRejectModalOpen(false);
            setServiceToReject(null);
          }}
          onConfirm={(reason) => {
            onRejectService(serviceToReject.id, reason);
            setRejectModalOpen(false);
            setServiceToReject(null);
          }}
          serviceName={serviceToReject.name}
        />
      )}
    </div>
  );
}