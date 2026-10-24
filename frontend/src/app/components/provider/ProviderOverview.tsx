import { Service, User } from "@/app/types";
import {
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Plus,
  Hotel,
  Utensils,
  Compass,
  Sparkles,
  Car,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

interface ProviderOverviewProps {
  currentUser: User;
  services: Service[];
  onCreateService: () => void;
  onNavigateToServices: () => void;
  onViewDetail: (service: Service) => void;
}

export function ProviderOverview({
  currentUser,
  services,
  onCreateService,
  onNavigateToServices,
  onViewDetail,
}: ProviderOverviewProps) {
  const providerServices = services.filter((s) => s.providerId === currentUser.id);

  const stats = {
    total: providerServices.length,
    approved: providerServices.filter((s) => s.status === "approved").length,
    pending: providerServices.filter((s) => s.status === "pending").length,
    rejected: providerServices.filter((s) => s.status === "rejected").length,
    avgRating:
      providerServices.length > 0
        ? (
            providerServices.reduce((sum, s) => sum + (s.rating || 5), 0) /
            providerServices.length
          ).toFixed(1)
        : "5.0",
  };

  const categoriesCount = {
    hotel: providerServices.filter((s) => s.category === "hotel").length,
    fnb: providerServices.filter((s) => s.category === "fnb" || s.category === "restaurant").length,
    transportation: providerServices.filter((s) => s.category === "transportation").length,
    attraction: providerServices.filter((s) => s.category === "attraction").length,
  };

  const recentServices = providerServices.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 md:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100 border border-white/20">
              <Building2 className="w-3.5 h-3.5" />
              <span>Đối tác Cung ứng Du lịch</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Xin chào, {currentUser.businessName || currentUser.name}!
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Chào mừng bạn đến với Cổng thông tin Đối tác. Quản lý toàn bộ danh mục dịch vụ (Lưu trú, Ẩm thực, Vận chuyển, Tham quan) và sẵn sàng liên kết với các công ty lữ hành.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={onCreateService}
              className="bg-white text-[#075985] hover:bg-[#F0F9FF] font-bold shadow-lg text-sm rounded-xl px-4 py-2.5 h-auto transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Đăng dịch vụ mới
            </Button>
            <Button
              onClick={onNavigateToServices}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-sm rounded-xl px-4 py-2.5 h-auto backdrop-blur-sm"
            >
              Xem danh sách bảng
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Decorative blur circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
        <div className="absolute right-32 -bottom-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng dịch vụ
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#F0F9FF] text-[#075985] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            {stats.total}
          </div>
          <p className="text-xs text-[#075985] font-medium mt-1">
            Dịch vụ trên hệ thống
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Đang hoạt động
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            {stats.approved}
          </div>
          <p className="text-xs text-emerald-700 font-medium mt-1">
            Đã được admin duyệt
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Chờ kiểm duyệt
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            {stats.pending}
          </div>
          <p className="text-xs text-amber-700 font-medium mt-1">
            Đang được xét duyệt
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Đánh giá TB
            </span>
            <div className="w-9 h-9 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-500" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 flex items-baseline gap-1">
            {stats.avgRating}
            <span className="text-sm font-normal text-gray-500">/ 5.0</span>
          </div>
          <p className="text-xs text-yellow-700 font-medium mt-1">
            Từ khách du lịch & tour
          </p>
        </div>
      </div>

      {/* Category Breakdown Cards */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">
              Phân loại danh mục dịch vụ của bạn
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Bạn có thể cung cấp đa dạng loại hình mà không bị giới hạn
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToServices}
            className="text-xs text-[#075985] hover:text-[#075985]"
          >
            Quản lý tất cả →
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {[
            {
              category: "hotel",
              label: "Lưu trú & Khách sạn",
              count: categoriesCount.hotel,
              icon: Hotel,
              bg: "bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]",
            },
            {
              category: "fnb",
              label: "Ẩm thực & Nhà hàng",
              count: categoriesCount.fnb,
              icon: Utensils,
              bg: "bg-orange-50 text-orange-700 border-orange-200",
            },
            {
              category: "transportation",
              label: "Phương tiện & Vận chuyển",
              count: categoriesCount.transportation,
              icon: Car,
              bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
            },
            {
              category: "attraction",
              label: "Điểm tham quan & Vé",
              count: categoriesCount.attraction,
              icon: Compass,
              bg: "bg-teal-50 text-teal-700 border-teal-200",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.category}
                onClick={onNavigateToServices}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {item.count}
                  </span>
                </div>
                <div className="text-xs font-semibold text-gray-800">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Services List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">
              Dịch vụ đăng gần đây
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Bấm vào bất kỳ dịch vụ nào để xem toàn bộ thông tin chi tiết
            </p>
          </div>
          <Button
            size="sm"
            onClick={onNavigateToServices}
            variant="outline"
            className="text-xs rounded-xl"
          >
            Mở bảng quản lý đầy đủ
          </Button>
        </div>

        <div className="divide-y divide-gray-100">
          {recentServices.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Chưa có dịch vụ nào được tạo.
              <div className="mt-2">
                <Button size="sm" onClick={onCreateService}>
                  Đăng dịch vụ đầu tiên
                </Button>
              </div>
            </div>
          ) : (
            recentServices.map((service) => (
              <div
                key={service.id}
                onClick={() => onViewDetail(service)}
                className="p-4 flex items-center justify-between gap-4 hover:bg-[#F0F9FF]/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-200 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#075985] transition-colors truncate">
                      {service.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="capitalize">{service.category}</span>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">
                        {service.province || service.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="font-bold text-sm text-gray-900">
                      {service.price?.toLocaleString("vi-VN")}đ
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Mã: {service.id}
                    </span>
                  </div>

                  <div>
                    {service.status === "approved" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                        Đã duyệt
                      </Badge>
                    ) : service.status === "rejected" ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs">
                        Từ chối
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                        Chờ duyệt
                      </Badge>
                    )}
                  </div>

                  <span className="text-gray-400 group-hover:text-[#075985] transition-colors">
                    →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
