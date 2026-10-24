import { Service } from "@/app/types";
import {
  Plus,
  Edit,
  Trash,
  MapPin,
  DollarSign,
  Star,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { CreateServiceForm } from "./CreateServiceForm";

interface ServiceManagementProps {
  services: Service[];
  currentProviderId: string;
  onCreateService: () => void;
  onEditService: (service: Service) => void;
  onDeleteService: (serviceId: string) => void;
}

export function ServiceManagement({
  services,
  currentProviderId,
  onCreateService,
  onEditService,
  onDeleteService,
}: ServiceManagementProps) {
  const [filterCategory, setFilterCategory] =
    useState<string>("all");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const categoryLabels = {
    hotel: "Khách sạn",
    restaurant: "Nhà hàng",
    transportation: "Vận chuyển",
    activity: "Hoạt động",
  };

  const categoryColors = {
    hotel: "bg-[#E0F2FE] text-blue-800",
    restaurant: "bg-orange-100 text-orange-800",
    transportation: "bg-green-100 text-green-800",
    activity: "bg-[#F97316]/15 text-purple-800",
  };

  const myServices = services.filter(
    (service) => service.providerId === currentProviderId,
  );

  const filteredServices =
    filterCategory === "all"
      ? myServices
      : myServices.filter(
          (service) => service.category === filterCategory,
        );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Quản lý Dịch vụ
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {myServices.length} dịch vụ đang hoạt động
          </p>
        </div>
        <button
          onClick={onCreateService}
          className="px-4 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Tạo dịch vụ mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all", label: "Tất cả" },
            { value: "hotel", label: "Khách sạn" },
            { value: "restaurant", label: "Nhà hàng" },
            { value: "transportation", label: "Vận chuyển" },
            { value: "activity", label: "Hoạt động" },
          ].map((category) => (
            <button
              key={category.value}
              onClick={() => setFilterCategory(category.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === category.value
                  ? "bg-[#075985] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <img
              src={service.image}
              alt={service.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg text-gray-900 flex-1">
                  {service.name}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    categoryColors[service.category]
                  }`}
                >
                  {categoryLabels[service.category]}
                </span>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2">
                {service.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{service.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium text-gray-900">
                      {service.rating}
                    </span>
                  </div>
                  {service.capacity && (
                    <div className="text-sm text-gray-600">
                      Sức chứa: {service.capacity}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xl font-bold text-[#075985]">
                    {formatPrice(service.price)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditService(service)}
                    className="flex-1 px-3 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Sửa
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Bạn có chắc chắn muốn xóa dịch vụ "${service.name}"?`,
                        )
                      ) {
                        onDeleteService(service.id);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Trash className="w-4 h-4" />
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">
            Chưa có dịch vụ nào
          </p>
          <button
            onClick={onCreateService}
            className="px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316]"
          >
            Tạo dịch vụ đầu tiên
          </button>
        </div>
      )}
    </div>
  );
}