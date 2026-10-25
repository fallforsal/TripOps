import { useState } from "react";
import { Service, User } from "@/app/types";
import { ProviderLayout } from "./ProviderLayout";
import { ServicePostManagement } from "./ServicePostManagement";
import { ProviderServiceDetailPage } from "./ProviderServiceDetailPage";
import { ProviderOverview } from "./ProviderOverview";
import { ProviderCreateServicePage } from "./ProviderCreateServicePage";
import { ProviderProfilePage } from "./ProviderProfilePage";
import { BusinessProfileOnboardingPage } from "@/app/components/auth/BusinessProfileOnboardingPage";

interface ProviderDashboardProps {
  currentUser: User;
  services: Service[];
  onCreateService?: () => void;
  onEditService?: (service: Service) => void;
  onDeleteService: (serviceId: string) => void;
  onSubmitService?: (
    serviceData: Omit<Service, "id" | "status" | "createdAt">
  ) => void;
  onUpdateService?: (
    serviceId: string,
    serviceData: Omit<Service, "id">
  ) => void;
  onUpdateProfile?: (updatedUser: Partial<User>) => void;
  onLogout?: () => void;
}

export function ProviderDashboard({
  currentUser,
  services,
  onCreateService,
  onEditService,
  onDeleteService,
  onSubmitService,
  onUpdateService,
  onUpdateProfile,
  onLogout,
}: ProviderDashboardProps) {
  const [activeSection, setActiveSection] = useState<
    "overview" | "services" | "create" | "detail" | "profile"
  >("overview");

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

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
        section as "overview" | "services" | "create" | "detail" | "profile"
      );
    }
  };

  const handleStartCreateService = () => {
    setEditingService(null);
    setSelectedServiceId(null);
    setActiveSection("create");
  };

  const handleStartEditService = (service: Service) => {
    setEditingService(service);
    setSelectedServiceId(null);
    setActiveSection("create");
  };

  const handleViewDetail = (service: Service) => {
    setSelectedServiceId(service.id);
    setEditingService(null);
    setActiveSection("detail");
  };

  const handleSaveServiceFromPage = (serviceData: Omit<Service, "id">) => {
    if (editingService) {
      // Editing existing service
      if (onUpdateService) {
        onUpdateService(editingService.id, serviceData);
      } else if (onEditService) {
        onEditService({ ...serviceData, id: editingService.id });
      }
    } else {
      // Creating new service
      if (onSubmitService) {
        onSubmitService(serviceData);
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
          onDelete={(id) => {
            onDeleteService(id);
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
      ) : activeSection === "services" ? (
        /* 4. Services Management - Table View */
        <ServicePostManagement
          services={services}
          providerId={currentUser.id}
          onCreateService={handleStartCreateService}
          onEditService={handleStartEditService}
          onDeleteService={onDeleteService}
          onViewDetail={handleViewDetail}
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
        />
      )}
    </ProviderLayout>
  );
}