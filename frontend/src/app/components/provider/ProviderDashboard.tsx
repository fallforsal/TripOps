import { toGroupRequest, type ProviderInboxRow } from "@/app/services/providerRequests";
import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";
import { http } from "@/app/lib/http";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/app/lib/notifications";
import { Service, User, ProviderGroupReservationRequest } from "@/app/types";
import { ProviderLayout } from "./ProviderLayout";
import { ServicePostManagement } from "./ServicePostManagement";
import { ProviderServiceDetailPage } from "./ProviderServiceDetailPage";
import { ProviderOverview } from "./ProviderOverview";
import { ProviderCreateServicePage } from "./ProviderCreateServicePage";
import { ProviderProfilePage } from "./ProviderProfilePage";
import { BusinessProfileOnboardingPage } from "@/app/components/auth/BusinessProfileOnboardingPage";
import { ProviderGroupBookingRequests } from "./ProviderGroupBookingRequests";

interface ProviderDashboardProps {
  groupRequests?: ProviderGroupReservationRequest[];
  onApproveAndQuote?: (
    requestId: string,
    quotedTotalPrice: number,
    providerNote: string
  ) => void;
  onRejectRequest?: (requestId: string, rejectionReason: string) => void;
  currentUser: User;
  services: Service[];
  onCreateService?: () => void;
  onEditService?: (service: Service) => void;
  onDeleteService: (serviceId: string) => void | Promise<void>;
  onSetAvailability?: (serviceId: string, isPaused: boolean) => Promise<void>;
  onSubmitService?: (
    serviceData: Omit<Service, "id" | "status" | "createdAt">
  ) => void | Promise<void>;
  onUpdateService?: (
    serviceId: string,
    serviceData: Omit<Service, "id">
  ) => void | Promise<void>;
  onUpdateProfile?: (updatedUser: Partial<User>) => void;
  onLogout?: () => void;
}

export function ProviderDashboard({
  groupRequests: externalGroupRequests,
  onApproveAndQuote: externalApproveAndQuote,
  onRejectRequest: externalRejectRequest,
  currentUser,
  services,
  onCreateService,
  onEditService,
  onDeleteService,
  onSetAvailability,
  onSubmitService,
  onUpdateService,
  onUpdateProfile,
  onLogout,
}: ProviderDashboardProps) {
  const [activeSection, setActiveSection] = useState<
    "overview" | "services" | "create" | "detail" | "profile" | "room-requests"
  >("overview");

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  // Hash routing for reload / Back / Forward
  useEffect(() => {
    const handleHash = () => {
      const match = window.location.hash.match(/^#\/?provider\/([^/?]+)(?:\/([^/?]+))?/);
      if (match) {
        const sec = match[1] as any;
        const sId = match[2] || null;
        setActiveSection(sec);
        if (sId) setSelectedServiceId(sId);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);
  const [editingService, setEditingService] = useState<Service | null>(null);
  // Yêu cầu dịch vụ thật từ máy chủ (khách sạn + nhà hàng), hiển thị bằng giao diện chia Lưu trú / Nhà hàng.
  const [apiRequests, setApiRequests] = useState<ProviderGroupReservationRequest[]>([]);
  const knownRequestIds = useRef<Set<string> | null>(null);
  const requestLoadInFlight = useRef(false);
  const loadRequests = useCallback(async () => {
    if (requestLoadInFlight.current) return;
    requestLoadInFlight.current = true;
    try {
      const rows = await http<ProviderInboxRow[]>("/provider/booking-requests");
      const next = rows.map((r) => toGroupRequest(r, currentUser.id));
      const added = next.filter(r => r.status === "pending" && knownRequestIds.current && !knownRequestIds.current.has(r.id));
      knownRequestIds.current = new Set(next.map(r => r.id));
      setApiRequests(next);
      if (added.length) toast.info(`Có ${added.length} yêu cầu dịch vụ mới: ${added.map(r => r.serviceName).join(", ")}`);
    } finally {
      requestLoadInFlight.current = false;
    }
  }, [currentUser.id]);
  useEffect(() => { knownRequestIds.current = null; }, [currentUser.id]);
  useEffect(() => {
    void loadRequests().catch((error) => {
      toast.error(error instanceof Error ? `Không tải được yêu cầu dịch vụ: ${error.message}` : "Không tải được yêu cầu dịch vụ.");
    });
    // Cập nhật cả badge lẫn danh sách khi Agency đổi dịch vụ ở một phiên đăng nhập khác.
    const reload = () => { if (document.visibilityState !== "hidden") void loadRequests().catch(() => undefined); };
    const timer = window.setInterval(reload, 15000);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, [loadRequests, activeSection]);

  const activeRequestsList = apiRequests;
  const pendingGroupCount = activeRequestsList.filter((r) => r.status === "pending").length;

  const respond = async (requestId: string, body: { decision: "confirm" | "reject"; quotedCost: number | null; note: string | null }) => {
    try {
      await http(`/provider/booking-requests/${requestId}/respond`, { method: "POST", body: JSON.stringify(body) });
      toast.success(body.decision === "confirm" ? "Đã xác nhận và gửi báo giá cho công ty lữ hành." : "Đã từ chối yêu cầu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không gửi được phản hồi.");
    } finally {
      await loadRequests().catch(() => undefined);
    }
  };

  const handleApproveAndQuote = (requestId: string, quotedTotalPrice: number, providerNote: string) => {
    void respond(requestId, { decision: "confirm", quotedCost: quotedTotalPrice, note: providerNote || null });
  };

  const handleRejectRequest = (requestId: string, rejectionReason: string) => {
    void respond(requestId, { decision: "reject", quotedCost: null, note: rejectionReason || null });
  };

  // Find currently selected service for detail view
  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId)
    : null;

  const handleNavigateSection = (section: string) => {
    if (section === "create") {
      setEditingService(null);
      setSelectedServiceId(null);
      setActiveSection("create");
    } else {
      setSelectedServiceId(null);
      setEditingService(null);
      setActiveSection(
        section as "overview" | "services" | "create" | "detail" | "profile" | "room-requests"
      );
    }
  };

  const handleStartCreateService = () => {
    setEditingService(null);
    setSelectedServiceId(null);
    setActiveSection("create");
  };

  const handleStartEditService = (service: Service) => {
    if (service.status === "hidden") {
      toast.error("Bài đăng đã bị Admin ẩn. Vui lòng tạo bài đăng mới để gửi duyệt.");
      return;
    }
    setEditingService(service);
    setSelectedServiceId(null);
    setActiveSection("create");
  };

  const handleViewDetail = (service: Service) => {
    setSelectedServiceId(service.id);
    setEditingService(null);
    setActiveSection("detail");
  };

  const handleSaveServiceFromPage = async (serviceData: Omit<Service, "id">) => {
    if (editingService) {
      // Editing existing service
      if (onUpdateService) {
        await onUpdateService(editingService.id, serviceData);
      } else if (onEditService) {
        onEditService({ ...serviceData, id: editingService.id });
      }
    } else {
      // Creating new service
      if (onSubmitService) {
        await onSubmitService(serviceData);
      } else if (onCreateService) {
        onCreateService();
      }
    }
    // Return to services list
    setEditingService(null);
    setSelectedServiceId(null);
    setActiveSection("services");
  };

  // Nếu nhà cung cấp chưa cập nhật hồ sơ pháp nhân / chưa duyệt: CHỈ HIỂN THỊ TRANG CẬP NHẬT HỒ SƠ
  if (currentUser.businessProfile?.status !== "approved") {
    return (
      <BusinessProfileOnboardingPage
        currentUser={currentUser}
        onLogout={onLogout}
      />
    );
  }

  return (
    <ProviderLayout
      activeSection={activeSection}
      onNavigate={handleNavigateSection}
      currentUser={currentUser}
      onLogout={onLogout}
      onCreateService={handleStartCreateService}
      pendingRequestsCount={pendingGroupCount}
    >
      {/* 1. Dedicated Service Detail Page */}
      {activeSection === "detail" && selectedService ? (
        <ProviderServiceDetailPage
          service={selectedService}
          onBack={() => {
            setSelectedServiceId(null);
            setActiveSection("services");
          }}
          onEdit={(svc) => handleStartEditService(svc)}
          onSetAvailability={onSetAvailability}
          onDelete={async (id) => {
            await onDeleteService(id);
            setSelectedServiceId(null);
            setActiveSection("services");
          }}
        />
      ) : activeSection === "create" ? (
        /* 2. Dedicated Create / Edit Service Page (NOT A POPUP) */
        <ProviderCreateServicePage
          currentUser={currentUser}
          initialService={editingService || undefined}
          onSaveService={handleSaveServiceFromPage}
          onBack={() => {
            setEditingService(null);
            setActiveSection("services");
          }}
        />
      ) : activeSection === "profile" ? (
        /* 3. Provider Business Profile Page */
        <ProviderProfilePage
          currentUser={currentUser}
          onUpdateProfile={onUpdateProfile}
        />
      ) : activeSection === "room-requests" ? (
        <ErrorBoundary fallbackTitle="Không thể tải trang Yêu cầu dịch vụ">
          <ProviderGroupBookingRequests
            requests={activeRequestsList}
            providerServices={services.filter((s) => s.providerId === currentUser.id)}
            currentProviderId={currentUser.id}
            onApproveAndQuote={handleApproveAndQuote}
            onRejectRequest={handleRejectRequest}
          />
        </ErrorBoundary>
      ) : activeSection === "services" ? (
        /* 4. Services Management - Table View */
        <ServicePostManagement
          services={services}
          providerId={currentUser.id}
          onCreateService={handleStartCreateService}
          onEditService={handleStartEditService}
          onDeleteService={onDeleteService}
          onViewDetail={handleViewDetail}
          onSetAvailability={onSetAvailability}
        />
      ) : (
        /* 5. Provider Overview Dashboard (KPIs, Charts, Recent items) */
        <ProviderOverview
          currentUser={currentUser}
          services={services}
          onCreateService={handleStartCreateService}
          onNavigateToServices={() => {
            setSelectedServiceId(null);
            setActiveSection("services");
          }}
          onViewDetail={handleViewDetail}
          pendingGroupRequestsCount={pendingGroupCount}
          onNavigateToRoomRequests={() => {
            setSelectedServiceId(null);
            setEditingService(null);
            setActiveSection("room-requests");
          }}
        />
      )}
    </ProviderLayout>
  );
}
