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
  BedDouble,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

interface ProviderOverviewProps {
  currentUser: User;
  services: Service[];
  onCreateService: () => void;
  onNavigateToServices: () => void;
  onViewDetail: (service: Service) => void;
  pendingGroupRequestsCount?: number;
  onNavigateToRoomRequests?: () => void;
}

export function ProviderOverview({
  currentUser,
  services,
  onCreateService,
  onNavigateToServices,
  onViewDetail,
  pendingGroupRequestsCount = 0,
  onNavigateToRoomRequests,
}: ProviderOverviewProps) {
  const providerServices = services.filter((s) => s.providerId === currentUser.id);

  const stats = {
    total: providerServices.length,
    approved: providerServices.filter((s) => s.status === "approved" && !s.isPaused).length,
    pending: providerServices.filter((s) => s.status === "pending").length,
    rejected: providerServices.filter((s) => s.status === "rejected").length,
    avgRating: (() => {
      const rated = providerServices.filter((s) => Number(s.rating) > 0);
      return rated.length > 0
        ? (rated.reduce((sum, s) => sum + Number(s.rating), 0) / rated.length).toFixed(1)
        : null;
    })(),
  };

  const categoryLabel: Record<string, string> = {
    hotel: "Lưu trú",
    fnb: "Ẩm thực",
    restaurant: "Ẩm thực",
    transportation: "Vận chuyển",
    attraction: "Tham quan",
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
      {/* Welcome */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#075985]">Đối tác cung ứng dịch vụ</p>
          <h1 className="text-2xl font-bold text-slate-900">
            Xin chào, {currentUser.businessName || currentUser.name}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Quản lý dịch vụ lưu trú, ẩm thực, vận chuyển, tham quan và phản hồi yêu cầu từ các công ty lữ hành.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCreateService} className="h-10 bg-[#075985] hover:bg-[#0C4A6E] text-white font-semibold">
            <Plus className="w-4 h-4" />
            Đăng dịch vụ mới
          </Button>
          <Button onClick={onNavigateToServices} variant="outline" className="h-10 border-slate-300 text-[#075985] font-semibold hover:bg-sky-50">
            Quản lý dịch vụ
          </Button>
        </div>
      </div>

      {/* Pending requests */}
      {pendingGroupRequestsCount > 0 && onNavigateToRoomRequests && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-900">
              Bạn có {pendingGroupRequestsCount} yêu cầu dịch vụ mới cần báo giá
            </p>
            <p className="text-sm text-amber-800/80 mt-0.5">
              Các công ty lữ hành đang chờ bạn xác nhận khả năng cung cấp và báo giá cho booking.
            </p>
          </div>
          <Button onClick={onNavigateToRoomRequests} className="h-10 shrink-0 bg-[#075985] hover:bg-[#0C4A6E] text-white font-semibold">
            Xem yêu cầu
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng dịch vụ", value: stats.total, note: "Dịch vụ trên hệ thống", icon: Layers, tone: "text-slate-900" },
          { label: "Đang hoạt động", value: stats.approved, note: "Đã được admin duyệt", icon: CheckCircle2, tone: "text-emerald-700" },
          { label: "Chờ kiểm duyệt", value: stats.pending, note: "Đang được xét duyệt", icon: Clock, tone: "text-amber-700" },
          { label: "Đánh giá trung bình", value: stats.avgRating ?? "—", note: stats.avgRating ? "Trên thang điểm 5" : "Chưa có đánh giá", icon: Star, tone: "text-slate-900" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{card.label}</span>
                <Icon className="w-5 h-5 text-slate-400" />
              </div>
              <div className={`mt-3 text-3xl font-bold ${card.tone}`}>{card.value}</div>
              <p className="mt-1 text-xs text-slate-500">{card.note}</p>
            </div>
          );
        })}
      </div>

      {/* Category Breakdown Cards */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">
              Phân loại danh mục dịch vụ của bạn
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Số dịch vụ theo từng loại hình
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToServices}
            className="text-sm font-semibold text-[#075985] hover:text-[#0C4A6E] hover:bg-sky-50"
          >
            Quản lý tất cả
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {[
            {
              category: "hotel",
              label: "Lưu trú & Khách sạn",
              count: categoriesCount.hotel,
              icon: Hotel,
              bg: "bg-sky-50 text-[#075985]",
            },
            {
              category: "fnb",
              label: "Ẩm thực & Nhà hàng",
              count: categoriesCount.fnb,
              icon: Utensils,
              bg: "bg-sky-50 text-[#075985]",
            },
            {
              category: "transportation",
              label: "Phương tiện & Vận chuyển",
              count: categoriesCount.transportation,
              icon: Car,
              bg: "bg-sky-50 text-[#075985]",
            },
            {
              category: "attraction",
              label: "Điểm tham quan & Vé",
              count: categoriesCount.attraction,
              icon: Compass,
              bg: "bg-sky-50 text-[#075985]",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.category}
                onClick={onNavigateToServices}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#075985] hover:bg-sky-50/40 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">
                    {item.count}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Services List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-gray-900">
              Dịch vụ đăng gần đây
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Bấm vào một dịch vụ để xem chi tiết
            </p>
          </div>
          <Button
            size="sm"
            onClick={onNavigateToServices}
            variant="outline"
            className="h-9 border-slate-300 text-[#075985] font-semibold hover:bg-sky-50"
          >
            Xem tất cả
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
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-200 "
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#075985] transition-colors truncate">
                      {service.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{categoryLabel[service.category] || service.category}</span>
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
                  </div>

                  <div>
                    {service.status === "approved" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                        Đã duyệt
                      </Badge>
                    ) : service.status === "hidden" ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs">Admin đã ẩn</Badge>
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

                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
