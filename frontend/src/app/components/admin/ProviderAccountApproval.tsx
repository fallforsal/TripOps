import { useState } from "react";
import { User } from "@/app/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Eye,
  CheckCircle,
  XCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";

interface ProviderAccountApprovalProps {
  providers: User[];
  onApproveProvider: (providerId: string) => void;
  onRejectProvider: (
    providerId: string,
    reason?: string,
  ) => void;
}

export function ProviderAccountApproval({
  providers,
  onApproveProvider,
  onRejectProvider,
}: ProviderAccountApprovalProps) {
  const [selectedProvider, setSelectedProvider] =
    useState<User | null>(null);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [rejectingProvider, setRejectingProvider] =
    useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const pendingProviders = providers.filter(
    (p) => p.accountStatus === "pending",
  ).length;
  const approvedProviders = providers.filter(
    (p) => p.accountStatus === "approved",
  ).length;
  const rejectedProviders = providers.filter(
    (p) => p.accountStatus === "rejected",
  ).length;

  const filteredProviders =
    filter === "all"
      ? providers
      : providers.filter((p) => p.accountStatus === filter);

  // Pagination
  const totalPages = Math.ceil(
    filteredProviders.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProviders = filteredProviders.slice(
    startIndex,
    endIndex,
  );

  // Reset to page 1 when filter changes
  const handleFilterChange = (
    newFilter: "all" | "pending" | "approved" | "rejected",
  ) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleReject = () => {
    if (rejectingProvider) {
      onRejectProvider(rejectingProvider.id, rejectReason);
      setRejectingProvider(null);
      setRejectReason("");
    }
  };

  const getStatusBadge = (status: User["accountStatus"]) => {
    if (!status) return null;
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels = {
      pending: "Chờ phê duyệt",
      approved: "Đã phê duyệt",
      rejected: "Đã từ chối",
    };
    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getProviderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      accommodation: "Dịch vụ lưu trú",
      guide: "Cung cấp hướng dẫn viên",
      food: "Dịch vụ ăn uống",
      attraction: "Điểm tham quan & Giải trí",
      adventure: "Hoạt động trải nghiệm",
      support: "Dịch vụ hỗ trợ",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Phê duyệt Tài khoản
        </h1>
        <p className="text-gray-600 mt-2">
          Quản lý và phê duyệt tài khoản nhà cung cấp
        </p>
      </div>

      {/* Stats Cards - Now clickable */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button
          onClick={() => handleFilterChange("all")}
          className={`bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg transition-all hover:scale-105 text-left ${
            filter === "all" ? "ring-4 ring-blue-300" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            {providers.length}
          </p>
          <p className="text-sm text-blue-100">
            Tổng tài khoản
          </p>
        </button>

        <button
          onClick={() => handleFilterChange("pending")}
          className={`bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg transition-all hover:scale-105 text-left ${
            filter === "pending" ? "ring-4 ring-yellow-300" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            {pendingProviders > 0 && (
              <span className="px-3 py-1 bg-white/30 rounded-full text-sm font-bold">
                Mới!
              </span>
            )}
          </div>
          <p className="text-3xl font-bold mb-1">
            {pendingProviders}
          </p>
          <p className="text-sm text-yellow-100">
            Chờ phê duyệt
          </p>
        </button>

        <button
          onClick={() => handleFilterChange("approved")}
          className={`bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg transition-all hover:scale-105 text-left ${
            filter === "approved" ? "ring-4 ring-green-300" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            {approvedProviders}
          </p>
          <p className="text-sm text-green-100">Đã phê duyệt</p>
        </button>

        <button
          onClick={() => handleFilterChange("rejected")}
          className={`bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg transition-all hover:scale-105 text-left ${
            filter === "rejected" ? "ring-4 ring-red-300" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-3xl font-bold mb-1">
            {rejectedProviders}
          </p>
          <p className="text-sm text-red-100">Đã từ chối</p>
        </button>
      </div>

      {/* Filter and List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tài khoản</CardTitle>
          <CardDescription>
            Xem và phê duyệt tài khoản nhà cung cấp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paginatedProviders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>Không có tài khoản nào</p>
              </div>
            ) : (
              paginatedProviders.map((provider) => (
                <Card
                  key={provider.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        {/* Avatar */}
                        {provider.avatar && (
                          <img
                            src={provider.avatar}
                            alt={provider.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg">
                              {provider.businessName}
                            </h3>
                            {getStatusBadge(
                              provider.accountStatus,
                            )}
                            <Badge variant="outline">
                              {getProviderTypeLabel(
                                provider.providerType!,
                              )}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 font-medium mb-2">
                                Thông tin người đại diện
                              </p>
                              <div className="space-y-1">
                                <p>
                                  <strong>Tên:</strong>{" "}
                                  {provider.name}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {provider.email}
                                </p>
                                {provider.phone && (
                                  <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {provider.phone}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-gray-600 font-medium mb-2">
                                Thông tin doanh nghiệp
                              </p>
                              <div className="space-y-1">
                                {provider.businessAddress && (
                                  <p className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    {provider.businessAddress}
                                  </p>
                                )}
                                {provider.businessPhone && (
                                  <p className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {provider.businessPhone}
                                  </p>
                                )}
                                {provider.businessEmail && (
                                  <p className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {provider.businessEmail}
                                  </p>
                                )}
                                {provider.taxCode && (
                                  <p className="flex items-center gap-2">
                                    <Hash className="w-4 h-4" />
                                    MST: {provider.taxCode}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedProvider(provider)
                          }
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Chi tiết
                        </Button>
                        {provider.accountStatus ===
                          "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() =>
                                onApproveProvider(provider.id)
                              }
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Phê duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => {
                                setRejectingProvider(provider);
                                setRejectReason("");
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Từ chối
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Hiển thị {startIndex + 1}-
                {Math.min(endIndex, filteredProviders.length)}{" "}
                trong tổng số {filteredProviders.length} tài
                khoản
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Trước
                </Button>
                <div className="flex gap-1">
                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1,
                  ).map((page) => (
                    <Button
                      key={page}
                      variant={
                        currentPage === page
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[40px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(totalPages, p + 1),
                    )
                  }
                  disabled={currentPage === totalPages}
                >
                  Sau
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectingProvider}
        onOpenChange={() => {
          setRejectingProvider(null);
          setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối tài khoản</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối tài khoản{" "}
              {rejectingProvider?.businessName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">
                Lý do từ chối
              </Label>
              <Textarea
                id="reject-reason"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) =>
                  setRejectReason(e.target.value)
                }
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectingProvider(null);
                  setRejectReason("");
                }}
              >
                Hủy
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleReject}
              >
                Xác nhận từ chối
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedProvider}
        onOpenChange={() => setSelectedProvider(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProvider?.businessName}
            </DialogTitle>
            <DialogDescription>
              Chi tiết tài khoản nhà cung cấp
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-4">
              {/* Avatar at top */}
              {selectedProvider.avatar && (
                <div className="flex justify-center">
                  <img
                    src={selectedProvider.avatar}
                    alt={selectedProvider.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 justify-center">
                <Badge variant="outline">
                  {getProviderTypeLabel(
                    selectedProvider.providerType!,
                  )}
                </Badge>
                {getStatusBadge(selectedProvider.accountStatus)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">
                    Thông tin người đại diện
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Họ tên:</strong>{" "}
                      {selectedProvider.name}
                    </p>
                    <p>
                      <strong>Email cá nhân:</strong>{" "}
                      {selectedProvider.email}
                    </p>
                    {selectedProvider.phone && (
                      <p>
                        <strong>Điện thoại:</strong>{" "}
                        {selectedProvider.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">
                    Thông tin doanh nghiệp
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Tên doanh nghiệp:</strong>{" "}
                      {selectedProvider.businessName}
                    </p>
                    {selectedProvider.businessEmail && (
                      <p>
                        <strong>Email:</strong>{" "}
                        {selectedProvider.businessEmail}
                      </p>
                    )}
                    {selectedProvider.businessPhone && (
                      <p>
                        <strong>Điện thoại:</strong>{" "}
                        {selectedProvider.businessPhone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedProvider.businessAddress && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Địa chỉ
                  </h4>
                  <p className="text-sm">
                    {selectedProvider.businessAddress}
                  </p>
                </div>
              )}

              {selectedProvider.taxCode && (
                <div>
                  <h4 className="font-semibold mb-2">
                    Mã số thuế
                  </h4>
                  <p className="text-sm">
                    {selectedProvider.taxCode}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">
                  Loại dịch vụ cung cấp
                </h4>
                <Badge>
                  {getProviderTypeLabel(
                    selectedProvider.providerType!,
                  )}
                </Badge>
              </div>

              {selectedProvider.accountStatus === "rejected" &&
                selectedProvider.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-red-800">
                      Lý do từ chối
                    </h4>
                    <p className="text-sm text-red-700">
                      {selectedProvider.rejectionReason}
                    </p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}