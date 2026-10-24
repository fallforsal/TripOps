import { useState } from "react";
import { User, Service } from "@/app/types";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  Utensils,
  Bed,
  Car,
  Tent,
  LifeBuoy,
  User as UserIcon,
  Search,
  Eye,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  FileText,
  Shield,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

interface ProviderManagementProps {
  providers: User[];
  services: Service[];
}

export function ProviderManagement({
  providers,
  services,
}: ProviderManagementProps) {
  const [selectedProvider, setSelectedProvider] =
    useState<User | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter providers based on search and type
  const filteredProviders = providers.filter((provider) => {
    const matchesSearch =
      provider.businessName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      provider.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      provider.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" ||
      provider.providerType === filterType;
    return matchesSearch && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(
    filteredProviders.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProviders = filteredProviders.slice(
    startIndex,
    endIndex,
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  // Count by type
  const allCount = providers.length;
  const accommodationCount = providers.filter(
    (p) => p.providerType === "accommodation",
  ).length;
  const fnbCount = providers.filter(
    (p) => p.providerType === "fnb",
  ).length;
  const attractionCount = providers.filter(
    (p) => p.providerType === "attraction",
  ).length;
  const adventureCount = providers.filter(
    (p) => p.providerType === "adventure",
  ).length;
  const supportCount = providers.filter(
    (p) => p.providerType === "support",
  ).length;
  const guideCount = providers.filter(
    (p) => p.providerType === "guide",
  ).length;

  const getProviderIcon = (type?: string) => {
    switch (type) {
      case "accommodation":
        return <Bed className="w-5 h-5" />;
      case "fnb":
        return <Utensils className="w-5 h-5" />;
      case "attraction":
        return <Star className="w-5 h-5" />;
      case "adventure":
        return <Tent className="w-5 h-5" />;
      case "guide":
        return <UserIcon className="w-5 h-5" />;
      case "support":
        return <LifeBuoy className="w-5 h-5" />;
      default:
        return <Building2 className="w-5 h-5" />;
    }
  };

  const getProviderTypeLabel = (type?: string) => {
    switch (type) {
      case "accommodation":
        return "Lưu trú";
      case "fnb":
        return "Ăn uống";
      case "attraction":
        return "Tham quan";
      case "adventure":
        return "Hoạt động";
      case "guide":
        return "Cung cấp HDV";
      case "support":
        return "Hỗ trợ";
      default:
        return type;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const variants = {
      pending:
        "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const labels = {
      pending: "Chờ duyệt",
      approved: "Đã duyệt",
      rejected: "Từ chối",
    };
    return (
      <Badge
        variant="outline"
        className={`${variants[status as keyof typeof variants]} px-2 py-1`}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Quản lý Nhà cung cấp
        </h1>
        <p className="text-gray-600 mt-2">
          Danh sách và thông tin chi tiết các đối tác cung cấp
          dịch vụ
        </p>
      </div>

      {/* Type Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          {
            id: "all",
            icon: Package,
            label: "Tất cả",
            count: allCount,
            color: "blue",
          },
          {
            id: "accommodation",
            icon: Bed,
            label: "Lưu trú",
            count: accommodationCount,
            color: "purple",
          },
          {
            id: "fnb",
            icon: Utensils,
            label: "Ăn uống",
            count: fnbCount,
            color: "orange",
          },
          {
            id: "attraction",
            icon: Star,
            label: "Tham quan",
            count: attractionCount,
            color: "yellow",
          },
          {
            id: "adventure",
            icon: Tent,
            label: "Hoạt động",
            count: adventureCount,
            color: "green",
          },
          {
            id: "support",
            icon: LifeBuoy,
            label: "Hỗ trợ",
            count: supportCount,
            color: "red",
          },
          {
            id: "guide",
            icon: UserIcon,
            label: "HDV",
            count: guideCount,
            color: "indigo",
          },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleFilterChange(item.id)}
            className={`p-4 rounded-xl border transition-all text-left relative overflow-hidden group ${
              filterType === item.id
                ? `border-${item.color}-500 bg-${item.color}-50 ring-2 ring-${item.color}-200`
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
            }`}
          >
            <div
              className={`flex items-center justify-between mb-3`}
            >
              <div
                className={`p-2 rounded-lg bg-${item.color}-100 text-${item.color}-600`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              <span
                className={`text-2xl font-bold text-gray-900`}
              >
                {item.count}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600">
              {item.label}
            </p>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, tên doanh nghiệp..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#075985] focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500 ml-auto">
          Hiển thị {startIndex + 1}-
          {Math.min(endIndex, filteredProviders.length)} trong
          tổng số {filteredProviders.length} kết quả
        </div>
      </div>

      {/* Providers Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 font-semibold"
                >
                  Nhà cung cấp
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 font-semibold"
                >
                  Loại hình
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 font-semibold"
                >
                  Địa chỉ / Liên hệ
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 font-semibold text-center"
                >
                  Dịch vụ
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 font-semibold text-center"
                >
                  Trạng thái
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 font-semibold text-right"
                >
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedProviders.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-10 h-10 text-gray-300" />
                      <p>
                        Không tìm thấy nhà cung cấp nào phù hợp
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProviders.map((provider) => (
                  <tr
                    key={provider.id}
                    className="bg-white hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {provider.avatar ? (
                          <img
                            src={provider.avatar}
                            alt={provider.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center ring-2 ring-gray-100">
                            <UserIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {provider.businessName ||
                              provider.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {provider.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-gray-100 text-gray-600">
                          {getProviderIcon(
                            provider.providerType,
                          )}
                        </div>
                        <span className="font-medium">
                          {getProviderTypeLabel(
                            provider.providerType,
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div
                          className="flex items-center gap-1.5 text-gray-600"
                          title={provider.businessAddress}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {provider.businessAddress ||
                              "Chưa cập nhật"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {provider.businessPhone ||
                              provider.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant="secondary"
                        className="bg-[#F0F9FF] text-[#075985] hover:bg-[#E0F2FE]"
                      >
                        {
                          services.filter(
                            (s) => s.providerId === provider.id,
                          ).length
                        }{" "}
                        bài đăng
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(provider.accountStatus)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#075985] hover:text-blue-800 hover:bg-[#F0F9FF] font-medium"
                        onClick={() =>
                          setSelectedProvider(provider)
                        }
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="bg-white"
            >
              Trước
            </Button>
            <span className="text-sm font-medium text-gray-700">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="bg-white"
            >
              Sau
            </Button>
          </div>
        )}
      </Card>

      {/* Improved Provider Detail Dialog */}
      <Dialog
        open={!!selectedProvider}
        onOpenChange={() => setSelectedProvider(null)}
      >
        <DialogContent
          className="max-w-[95vw] w-[95vw] h-[95vh] p-0 overflow-hidden flex flex-col gap-0"
          aria-describedby="provider-detail-description"
        >
          {selectedProvider && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>
                  Chi tiết nhà cung cấp:{" "}
                  {selectedProvider.businessName ||
                    selectedProvider.name}
                </DialogTitle>
                <DialogDescription id="provider-detail-description">
                  Xem thông tin chi tiết và dịch vụ của nhà cung
                  cấp
                </DialogDescription>
              </DialogHeader>

              {/* Header Banner */}
              <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-600 relative shrink-0">
                <div className="absolute -bottom-16 left-10 flex items-end gap-6">
                  <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                    {selectedProvider.avatar ? (
                      <img
                        src={selectedProvider.avatar}
                        alt={selectedProvider.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <UserIcon className="w-14 h-14 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <h2 className="text-3xl font-bold text-white shadow-black/20 drop-shadow-md">
                      {selectedProvider.businessName ||
                        selectedProvider.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className="bg-white/90 text-gray-900 hover:bg-white border-0 shadow-sm text-sm px-3 py-1">
                        {getProviderTypeLabel(
                          selectedProvider.providerType,
                        )}
                      </Badge>
                      {getStatusBadge(
                        selectedProvider.accountStatus,
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                  onClick={() => setSelectedProvider(null)}
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden pt-16 px-8 pb-8 bg-gray-50/50">
                <Tabs
                  defaultValue="info"
                  className="h-full flex flex-col"
                >
                  <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6 space-x-6">
                    <TabsTrigger
                      value="info"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#075985] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 font-medium"
                    >
                      Thông tin hồ sơ
                    </TabsTrigger>
                    <TabsTrigger
                      value="services"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#075985] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 py-2 font-medium"
                    >
                      Dịch vụ / Bài đăng (
                      {
                        services.filter(
                          (s) =>
                            s.providerId ===
                            selectedProvider.id,
                        ).length
                      }
                      )
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-y-auto pr-2">
                    <TabsContent
                      value="info"
                      className="mt-0 space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column: Quick Actions & Status */}
                        <div className="space-y-6">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">
                                Trạng thái tài khoản
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                  <span className="text-sm text-gray-500">
                                    Trạng thái
                                  </span>
                                  {getStatusBadge(
                                    selectedProvider.accountStatus,
                                  )}
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                  <span className="text-sm text-gray-500">
                                    Ngày tham gia
                                  </span>
                                  <span className="text-sm font-medium">
                                    20/05/2024
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                  <span className="text-sm text-gray-500">
                                    Xác thực
                                  </span>
                                  <div className="flex items-center text-green-600 text-sm font-medium gap-1">
                                    <Shield className="w-4 h-4" />{" "}
                                    Đã xác thực
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">
                                Liên hệ
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">
                                  {selectedProvider.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">
                                  {selectedProvider.businessPhone ||
                                    selectedProvider.phone}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right Column: Detailed Info */}
                        <div className="md:col-span-2 space-y-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-gray-400" />
                                Thông tin doanh nghiệp
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Tên doanh nghiệp
                                  </label>
                                  <p className="mt-1 font-medium">
                                    {selectedProvider.businessName ||
                                      "Chưa cập nhật"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Loại hình kinh doanh
                                  </label>
                                  <p className="mt-1 font-medium">
                                    {getProviderTypeLabel(
                                      selectedProvider.providerType,
                                    )}
                                  </p>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Địa chỉ kinh doanh
                                  </label>
                                  <div className="flex items-start gap-2 mt-1">
                                    <MapPin className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                                    <p className="font-medium">
                                      {selectedProvider.businessAddress ||
                                        "Chưa cập nhật"}
                                    </p>
                                  </div>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs font-semibold text-gray-500 uppercase">
                                    Mô tả / Giới thiệu
                                  </label>
                                  <p className="mt-1 text-gray-600 text-sm leading-relaxed">
                                    {selectedProvider.bio ||
                                      "Chưa có thông tin giới thiệu."}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-400" />
                                Giấy phép & Chứng chỉ
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center">
                                <p className="text-sm text-gray-500">
                                  Chưa có tài liệu nào được tải
                                  lên.
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="services"
                      className="mt-0"
                    >
                      <Card>
                        <CardHeader className="border-b bg-gray-50/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>
                                Danh sách dịch vụ
                              </CardTitle>
                              <CardDescription>
                                Tất cả các dịch vụ được cung cấp
                                bởi{" "}
                                {selectedProvider.businessName ||
                                  selectedProvider.name}
                              </CardDescription>
                            </div>
                            <Button size="sm">
                              Xuất báo cáo
                            </Button>
                          </div>
                        </CardHeader>
                        <div className="p-0">
                          <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                              <tr>
                                <th className="px-6 py-3">
                                  Dịch vụ
                                </th>
                                <th className="px-6 py-3">
                                  Danh mục
                                </th>
                                <th className="px-6 py-3">
                                  Giá niêm yết
                                </th>
                                <th className="px-6 py-3">
                                  Ngày tạo
                                </th>
                                <th className="px-6 py-3">
                                  Trạng thái
                                </th>
                                <th className="px-6 py-3 text-right">
                                  Hành động
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {services.filter(
                                (s) =>
                                  s.providerId ===
                                  selectedProvider.id,
                              ).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-gray-500"
                                  >
                                    <div className="flex flex-col items-center justify-center gap-2">
                                      <Package className="w-10 h-10 text-gray-300" />
                                      <p>
                                        Nhà cung cấp này chưa có
                                        dịch vụ nào.
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                services
                                  .filter(
                                    (s) =>
                                      s.providerId ===
                                      selectedProvider.id,
                                  )
                                  .map((service) => (
                                    <tr
                                      key={service.id}
                                      className="hover:bg-gray-50 transition-colors"
                                    >
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <img
                                            src={service.image}
                                            alt={service.name}
                                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                          />
                                          <div>
                                            <p className="font-semibold text-gray-900">
                                              {service.name}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                              <span>
                                                4.8 (12 đánh
                                                giá)
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <Badge
                                          variant="secondary"
                                          className="font-normal"
                                        >
                                          {getProviderTypeLabel(
                                            selectedProvider.providerType,
                                          )}
                                        </Badge>
                                      </td>
                                      <td className="px-6 py-4 font-medium text-[#075985]">
                                        {service.price.toLocaleString(
                                          "vi-VN",
                                        )}
                                        đ
                                      </td>
                                      <td className="px-6 py-4 text-gray-500">
                                        20/10/2024
                                      </td>
                                      <td className="px-6 py-4">
                                        {getStatusBadge(
                                          service.status,
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-gray-400 hover:text-gray-900"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}