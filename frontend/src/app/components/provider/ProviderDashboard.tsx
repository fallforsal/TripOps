import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";
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

/** Một dòng từ GET /provider/booking-requests. */
export type ProviderInboxRow = {
  id: number; bookingId: number; serviceId: number; slotKey: string; serviceName: string;
  serviceDateFrom: string | null; serviceDateTo: string | null; quantity: number; unit: string;
  estimatedCost: number; quotedCost: number | null; status: string; note: string | null;
  createdAt: string; respondedAt: string | null; bookingCode: string; tourName: string;
  agencyName: string; agencyPhone: string | null; agencyEmail: string | null; mealType: string | null;
  specialRequests: string | null; cancelReason: string | null; cancelledAt: string | null;
  serviceTime?: string | null;
  guests: Array<{ age?: number | null; fullName: string; gender: string | null; tierName: string | null; roommateNote: string | null; restaurantNote: string | null }>;
};

const STATUS_MAP: Record<string, ProviderGroupReservationRequest["status"]> = {
  Pending: "pending", Confirmed: "confirmed", Rejected: "rejected", Cancelled: "cancelled",
};

/** Chuyển dữ liệu máy chủ sang mẫu giao diện yêu cầu dịch vụ (chia khách sạn / nhà hàng). */
export function toGroupRequest(r: ProviderInboxRow, providerId: string): ProviderGroupReservationRequest {
  const isHotel = r.slotKey.startsWith("hotel:");
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const isChild = (tier: string | null) => /tr[eẻ]|em b[eé]|child|infant/i.test(tier || "");
  const guests = r.guests ?? []; // máy chủ bản cũ chưa trả danh sách đoàn
  const children = guests.filter((g) => isChild(g.tierName)).length;
  const meal = r.mealType === "breakfast" || r.mealType === "lunch" || r.mealType === "dinner" ? r.mealType : undefined;
  const status = STATUS_MAP[r.status] ?? "pending";
  return {
    id: String(r.id),
    bookingId: String(r.bookingId),
    bookingCode: r.bookingCode || `#${r.bookingId}`,
    tourName: r.tourName || `Booking #${r.bookingId}`,
    serviceId: String(r.serviceId),
    serviceName: r.serviceName,
    providerId,
    agencyId: "",
    agencyName: r.agencyName || "Công ty lữ hành",
    agencyContactName: r.agencyName || "Công ty lữ hành",
    agencyPhone: r.agencyPhone || "",
    agencyEmail: r.agencyEmail || "",
    checkInDate: day(r.serviceDateFrom),
    checkOutDate: day(r.serviceDateTo || r.serviceDateFrom),
    numberOfNights: isHotel ? Number(r.quantity) || 1 : 0,
    numberOfGuests: guests.length || Number(r.quantity) || 0,
    adultGuests: guests.length - children,
    childGuests: children,
    passengers: guests.map((g, i) => ({
      id: i + 1,
      participantIndex: i + 1,
      fullName: g.fullName,
      gender: g.gender === "Nữ" || /^f/i.test(g.gender || "") ? "female" : "male",
      tierName: g.tierName || undefined,
      age: g.age ?? undefined,
      roommateNote: g.roommateNote || undefined,
      dietaryNote: g.restaurantNote || undefined,
    })),
    specialRequests: [r.specialRequests, `Giá tham khảo: ${r.estimatedCost.toLocaleString("vi-VN")} ₫ cho ${r.quantity} ${r.unit}`]
      .filter(Boolean).join(" · "),
    status,
    serviceType: isHotel ? "hotel" : "restaurant",
    mealType: isHotel ? undefined : meal,
    servingDate: isHotel ? undefined : day(r.serviceDateFrom),
    serviceTime: isHotel ? undefined : r.serviceTime?.slice(0,5) || undefined,
    quotedTotalPrice: r.quotedCost ?? undefined,
    providerNote: status === "confirmed" ? r.note || undefined : undefined,
    rejectionReason: status === "rejected" ? r.note || undefined : undefined,
    cancellationReason: status === "cancelled" ? r.cancelReason || "Booking đã bị hủy" : undefined,
    cancelledAt: r.cancelledAt || undefined,
    cancelledByName: status === "cancelled" ? "Booking đã hủy" : undefined,
    createdAt: r.createdAt || new Date().toISOString(),
    respondedAt: r.respondedAt || undefined,
  };
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
  const loadRequests = async () => {
    const rows = await http<ProviderInboxRow[]>("/provider/booking-requests");
    setApiRequests(rows.map((r) => toGroupRequest(r, currentUser.id)));
  };
  useEffect(() => {
    void loadRequests().catch((error) => {
      setApiRequests([]);
      toast.error(error instanceof Error ? `Không tải được yêu cầu dịch vụ: ${error.message}` : "Không tải được yêu cầu dịch vụ.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

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
