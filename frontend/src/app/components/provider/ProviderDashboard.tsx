import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";
import { ProviderBookingConfirmations } from "@/app/components/provider/ProviderBookingConfirmations";
import { http } from "@/app/lib/http";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Service, User, ProviderGroupReservationRequest } from "@/app/types";
import { ProviderLayout } from "./ProviderLayout";
import { ServicePostManagement } from "./ServicePostManagement";
import { ProviderServiceDetailPage } from "./ProviderServiceDetailPage";
import { ProviderOverview } from "./ProviderOverview";
import { ProviderCreateServicePage } from "./ProviderCreateServicePage";
import { ProviderProfilePage } from "./ProviderProfilePage";
import { BusinessProfileOnboardingPage } from "@/app/components/auth/BusinessProfileOnboardingPage";
import { ProviderGroupBookingRequests } from "./ProviderGroupBookingRequests";
import { mockProviderGroupRequests } from "@/app/data/mockProviderGroupRequests";

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
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  useEffect(() => {
    void http<Array<{ status: string }>>("/provider/booking-requests")
      .then((rows) => setPendingBookingCount(rows.filter((r) => r.status === "Pending").length))
      .catch(() => setPendingBookingCount(0));
  }, [currentUser.id]);

  // Quản lý Yêu cầu Dịch vụ Đoàn từ các Agency (Chỉ lấy yêu cầu thuộc Provider đăng nhập, không fallback sang người khác)
  const [internalRequests, setInternalRequests] = useState<ProviderGroupReservationRequest[]>(() => {
    return mockProviderGroupRequests.filter((r) => r.providerId === currentUser.id);
  });

  const activeRequestsList = (externalGroupRequests || [])
    .filter((r) => r.providerId === currentUser.id);

  const pendingGroupCount = activeRequestsList.filter((r) => r.status === "pending").length + pendingBookingCount;

  const handleApproveAndQuote = (
    requestId: string,
    quotedTotalPrice: number,
    providerNote: string
  ) => {
    if (externalApproveAndQuote) {
      externalApproveAndQuote(requestId, quotedTotalPrice, providerNote);
    }
    setInternalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "confirmed" as const,
              quotedTotalPrice,
              providerNote,
              respondedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const handleRejectRequest = (requestId: string, rejectionReason: string) => {
    if (externalRejectRequest) {
      externalRejectRequest(requestId, rejectionReason);
    }
    setInternalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "rejected" as const,
              rejectionReason,
              respondedAt: new Date().toISOString(),
            }
          : r
      )
    );
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
          <ProviderBookingConfirmations onPendingChange={setPendingBookingCount} />
          {activeRequestsList.length > 0 &&
          <ProviderGroupBookingRequests
            requests={activeRequestsList}
            providerServices={services.filter((s) => s.providerId === currentUser.id)}
            currentProviderId={currentUser.id}
            onApproveAndQuote={handleApproveAndQuote}
            onRejectRequest={handleRejectRequest}
          />
          }
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
