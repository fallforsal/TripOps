import { useState } from "react";
import {
  Tour,
  Booking,
  User,
  Service,
  GuideSchedule,
  TourCompany,
  PaymentRequest,
  CustomTourRequest,
  BookingAgencyShare,
  BookingAssignedGuide,
  BookingAttractionCheckin,
  BookingIncident,
} from "@/app/types";
import { mockTourCompanies } from "@/app/data/mockData";
import { CompanyLayout } from "./CompanyLayout";
import { CompanyOverview } from "./CompanyOverview";
import { CompanyTourManagement, TourFormPage } from "./CompanyTourManagement";
import { CompanyBookingManagement } from "./CompanyBookingManagement";
import { CompanyGuideManagement } from "./CompanyGuideManagement";
import { CompanyCustomRequests } from "./CompanyCustomRequests";
import { CompanyBookingDetailPage } from "./CompanyBookingDetailPage";
import { CompanyCoHostManagement } from "./CompanyCoHostManagement";
import { CompanyServicesExplorer } from "./CompanyServicesExplorer";

interface CompanyDashboardProps {
  currentUser: User;
  company: TourCompany;
  tours: Tour[];
  bookings: Booking[];
  services?: Service[];
  guides: User[];
  guideSchedules: GuideSchedule[];
  customTourRequests?: CustomTourRequest[];
  allCompanies?: TourCompany[];
  onCreateTour: (tour: Omit<Tour, "id">) => void;
  onEditTour: (tourId: string, tour: Partial<Tour>) => void;
  onDeleteTour: (tourId: string) => void;
  onApproveBooking: (bookingId: string) => void;
  onRejectBooking: (bookingId: string, reason?: string) => void;
  onAssignGuide: (bookingId: string, guideId: string) => void;
  onUpdateAssignedGuides?: (bookingId: string, guides: BookingAssignedGuide[]) => void;
  onCreatePaymentRequest: (bookingId: string, request: Omit<PaymentRequest, "id" | "bookingId" | "createdAt" | "status">) => void;
  onMarkDepositPaid?: (bookingId: string) => void;
  onMarkFullyPaid?: (bookingId: string) => void;
  onUpdateBookingPrice?: (bookingId: string, newPrice: number, note?: string) => void;
  onUpdateBookingPassengers?: (bookingId: string, updatedPassengers: any[]) => void;
  onUpdateBookingAgencies?: (bookingId: string, agencies: BookingAgencyShare[]) => void;
  onUpdateAttractionCheckins?: (bookingId: string, checkins: BookingAttractionCheckin[]) => void;
  onUpdateIncidents?: (bookingId: string, incidents: BookingIncident[]) => void;
  onUpdateCustomRequest?: (id: string, update: Partial<CustomTourRequest>) => void;
  onRestoreTourVersion?: (tourId: string, versionNumber: number) => void;
  onViewTour?: (tour: Tour) => void;
  onAddGuide?: (guideData: Omit<User, "id">) => void;
  onUpdateGuide?: (guideId: string, update: Partial<User>) => void;
  onRemoveGuide?: (guideId: string) => void;
  onLogout?: () => void;
}

export function CompanyDashboard({
  currentUser,
  company,
  tours,
  bookings,
  services = [],
  guides,
  guideSchedules,
  customTourRequests = [],
  allCompanies,
  onCreateTour,
  onEditTour,
  onDeleteTour,
  onApproveBooking,
  onRejectBooking,
  onAssignGuide,
  onUpdateAssignedGuides,
  onCreatePaymentRequest,
  onMarkDepositPaid,
  onMarkFullyPaid,
  onUpdateBookingPrice,
  onUpdateBookingPassengers,
  onUpdateBookingAgencies,
  onUpdateAttractionCheckins,
  onUpdateIncidents,
  onUpdateCustomRequest,
  onRestoreTourVersion,
  onViewTour,
  onAddGuide,
  onUpdateGuide,
  onRemoveGuide,
  onLogout,
}: CompanyDashboardProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [editingCoHostItem, setEditingCoHostItem] = useState<{
    tour?: Tour | null;
    customRequest?: CustomTourRequest | null;
  } | null>(null);

  const companyTours = tours.filter(
    (t) =>
      t.companyId === company.id ||
      t.coHosts?.some((ch) => ch.companyId === company.id)
  );
  const companyBookings = bookings.filter(
    (b) =>
      b.companyId === company.id ||
      b.coHosts?.some((ch) => ch.companyId === company.id) ||
      b.tour?.coHosts?.some((ch) => ch.companyId === company.id)
  );
  const companyGuides = guides.filter(
    (g) => g.companyId === company.id,
  );
  const companyCustomRequests = customTourRequests.filter(
    (r) =>
      r.targetCompanyId === company.id ||
      r.coHosts?.some((ch) => ch.companyId === company.id)
  );
  const pendingCustomRequestsCount = companyCustomRequests.filter(
    (r) => r.status === "pending" && r.targetCompanyId === company.id,
  ).length;

  // Count incoming pending co-host invitations for this company
  const pendingCoHostInvitesCount =
    customTourRequests.filter((r) =>
      r.coHosts?.some(
        (ch) => ch.companyId === company.id && ch.status === "pending"
      )
    ).length +
    tours.filter((t) =>
      t.coHosts?.some(
        (ch) => ch.companyId === company.id && ch.status === "pending"
      )
    ).length;

  const currentSelectedBooking = selectedBookingId
    ? companyBookings.find((b) => b.id === selectedBookingId) || bookings.find((b) => b.id === selectedBookingId)
    : null;

  const handleNavigateSection = (section: string) => {
    setActiveSection(section);
    setSelectedBookingId(null);
    setEditingCoHostItem(null);
  };

  const handleEditTourSegment = (item: Tour | CustomTourRequest) => {
    if ("customerName" in item || "contactName" in item) {
      // It's a CustomTourRequest
      const req = item as CustomTourRequest;
      const matchingTour = tours.find(
        (t) => t.id === req.designedTourId || t.customRequestId === req.id
      );
      setEditingCoHostItem({ tour: matchingTour || null, customRequest: req });
    } else {
      // It's a Tour
      const tour = item as Tour;
      const matchingReq = customTourRequests.find(
        (r) => r.id === tour.customRequestId || r.designedTourId === tour.id
      );
      setEditingCoHostItem({ tour, customRequest: matchingReq || null });
    }
  };

  const handleAcceptCoHostInvitation = (requestIdOrTourId: string, isTour: boolean) => {
    if (!isTour) {
      const targetReq = customTourRequests.find((r) => r.id === requestIdOrTourId);
      if (targetReq && targetReq.coHosts) {
        const updatedCoHosts = targetReq.coHosts.map((ch) =>
          ch.companyId === company.id
            ? { ...ch, status: "accepted" as const, respondedAt: new Date().toISOString() }
            : ch
        );
        onUpdateCustomRequest?.(requestIdOrTourId, {
          coHosts: updatedCoHosts,
          companyNote: `${company.name} đã chấp nhận tham gia liên minh dẫn tour.`,
        });

        // Also sync to matching tour if exists
        const matchingTour = tours.find(
          (t) => t.id === targetReq.designedTourId || t.customRequestId === targetReq.id
        );
        if (matchingTour && matchingTour.coHosts) {
          const updatedTourCoHosts = matchingTour.coHosts.map((ch) =>
            ch.companyId === company.id
              ? { ...ch, status: "accepted" as const, respondedAt: new Date().toISOString() }
              : ch
          );
          onEditTour(matchingTour.id, {
            coHosts: updatedTourCoHosts,
          });
        }
      }
    } else {
      const targetTour = tours.find((t) => t.id === requestIdOrTourId);
      if (targetTour && targetTour.coHosts) {
        const updatedTourCoHosts = targetTour.coHosts.map((ch) =>
          ch.companyId === company.id
            ? { ...ch, status: "accepted" as const, respondedAt: new Date().toISOString() }
            : ch
        );
        onEditTour(requestIdOrTourId, {
          coHosts: updatedTourCoHosts,
        });
      }
    }
  };

  const handleRejectCoHostInvitation = (requestIdOrTourId: string, isTour: boolean, reason?: string) => {
    if (!isTour) {
      const targetReq = customTourRequests.find((r) => r.id === requestIdOrTourId);
      if (targetReq && targetReq.coHosts) {
        const updatedCoHosts = targetReq.coHosts.map((ch) =>
          ch.companyId === company.id
            ? {
                ...ch,
                status: "rejected" as const,
                notes: reason ? `${ch.notes || ""}\nLý do từ chối: ${reason}` : ch.notes,
                respondedAt: new Date().toISOString(),
              }
            : ch
        );
        onUpdateCustomRequest?.(requestIdOrTourId, {
          coHosts: updatedCoHosts,
          companyNote: `${company.name} đã từ chối lời mời: ${reason || "Không thể sắp xếp lịch"}`,
        });
      }
    } else {
      const targetTour = tours.find((t) => t.id === requestIdOrTourId);
      if (targetTour && targetTour.coHosts) {
        const updatedTourCoHosts = targetTour.coHosts.map((ch) =>
          ch.companyId === company.id
            ? {
                ...ch,
                status: "rejected" as const,
                notes: reason ? `${ch.notes || ""}\nLý do từ chối: ${reason}` : ch.notes,
                respondedAt: new Date().toISOString(),
              }
            : ch
        );
        onEditTour(requestIdOrTourId, {
          coHosts: updatedTourCoHosts,
        });
      }
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <CompanyOverview
            company={company}
            tours={companyTours}
            bookings={companyBookings}
            guides={companyGuides}
            onNavigate={setActiveSection}
          />
        );
      case "tours":
        return (
          <CompanyTourManagement
            tours={companyTours}
            company={company}
            onCreateTour={onCreateTour}
            onEditTour={onEditTour}
            onDeleteTour={onDeleteTour}
            onRestoreTourVersion={onRestoreTourVersion}
          />
        );
      case "bookings":
        if (currentSelectedBooking) {
          return (
            <CompanyBookingDetailPage
              booking={currentSelectedBooking}
              guides={companyGuides}
              companyName={company.name}
              companyId={company.id}
              onBack={() => setSelectedBookingId(null)}
              onApproveBooking={onApproveBooking}
              onRejectBooking={onRejectBooking}
              onAssignGuide={onAssignGuide}
              onUpdateAssignedGuides={onUpdateAssignedGuides}
              onCreatePaymentRequest={onCreatePaymentRequest}
              onMarkDepositPaid={onMarkDepositPaid}
              onMarkFullyPaid={onMarkFullyPaid}
              onUpdateBookingPrice={onUpdateBookingPrice}
              onUpdateBookingPassengers={onUpdateBookingPassengers}
              onUpdateBookingAgencies={onUpdateBookingAgencies}
              onUpdateAttractionCheckins={onUpdateAttractionCheckins}
              onUpdateIncidents={onUpdateIncidents}
            />
          );
        }
        return (
          <CompanyBookingManagement
            bookings={companyBookings}
            guides={companyGuides}
            companyName={company.name}
            onApproveBooking={onApproveBooking}
            onRejectBooking={onRejectBooking}
            onAssignGuide={onAssignGuide}
            onCreatePaymentRequest={onCreatePaymentRequest}
            onMarkDepositPaid={onMarkDepositPaid}
            onMarkFullyPaid={onMarkFullyPaid}
            onGenerateContract={(id) => {}}
            onViewBookingDetail={(b) => setSelectedBookingId(b.id)}
          />
        );
      case "services":
      case "provider-services":
        return (
          <CompanyServicesExplorer
            services={services}
            companyName={company.name}
          />
        );
      case "guides":
        return (
          <CompanyGuideManagement
            guides={companyGuides}
            tours={companyTours}
            guideSchedules={guideSchedules}
            companyId={company.id}
            companyName={company.name}
            onAddGuide={onAddGuide}
            onUpdateGuide={onUpdateGuide}
            onRemoveGuide={onRemoveGuide}
          />
        );
      case "custom-requests":
        return (
          <CompanyCustomRequests
            requests={companyCustomRequests}
            company={company}
            tours={companyTours}
            allCompanies={allCompanies || mockTourCompanies}
            onUpdateRequest={(id, update) => onUpdateCustomRequest?.(id, update)}
            onCreateTour={onCreateTour}
            onEditTour={onEditTour}
            onRestoreTourVersion={onRestoreTourVersion}
            onViewTour={onViewTour}
          />
        );
      case "co-hosting":
        if (editingCoHostItem) {
          return (
            <TourFormPage
              tour={editingCoHostItem.tour || null}
              company={company}
              customRequest={editingCoHostItem.customRequest || null}
              isCustomTour={
                !!editingCoHostItem.customRequest ||
                editingCoHostItem.tour?.tourType === "custom_request"
              }
              onBack={() => setEditingCoHostItem(null)}
              onSubmit={(data) => {
                if (editingCoHostItem.tour) {
                  onEditTour(editingCoHostItem.tour.id, data);
                  if (editingCoHostItem.customRequest) {
                    onUpdateCustomRequest?.(editingCoHostItem.customRequest.id, {
                      status: "designed",
                      currentVersion: data.version,
                      companyNote: data.changeNote,
                      quotedPricePerPerson: data.price,
                      responseAt: new Date().toISOString(),
                    });
                  }
                } else if (editingCoHostItem.customRequest) {
                  const newTourId = `tour-custom-${Date.now().toString().slice(-6)}`;
                  const newTourPayload: any = {
                    ...data,
                    id: newTourId,
                    tourType: "custom_request",
                    customRequestId: editingCoHostItem.customRequest.id,
                    targetUserId: editingCoHostItem.customRequest.userId,
                    targetCustomerName: editingCoHostItem.customRequest.contactName,
                    targetCustomerPhone: editingCoHostItem.customRequest.contactPhone,
                    targetCustomerEmail: editingCoHostItem.customRequest.contactEmail,
                    version: 1,
                    changeNote: data.changeNote || "Bản thiết kế ban đầu theo yêu cầu liên minh",
                    versionHistory: [],
                  };
                  onCreateTour(newTourPayload);
                  onUpdateCustomRequest?.(editingCoHostItem.customRequest.id, {
                    status: "designed",
                    designedTourId: newTourId,
                    currentVersion: 1,
                    companyNote: data.changeNote || "Bản thiết kế ban đầu theo yêu cầu liên minh",
                    quotedPricePerPerson: data.price,
                    responseAt: new Date().toISOString(),
                  });
                }
                setEditingCoHostItem(null);
              }}
            />
          );
        }
        return (
          <CompanyCoHostManagement
            company={company}
            tours={tours}
            customTourRequests={customTourRequests}
            bookings={bookings}
            allCompanies={allCompanies || mockTourCompanies}
            onAcceptInvitation={handleAcceptCoHostInvitation}
            onRejectInvitation={handleRejectCoHostInvitation}
            onViewTour={onViewTour}
            onEditTourSegment={handleEditTourSegment}
          />
        );
      default:
        return null;
    }
  };

  return (
    <CompanyLayout
      activeSection={activeSection}
      onNavigate={handleNavigateSection}
      company={company}
      currentUser={currentUser}
      coHostingBadgeCount={pendingCoHostInvitesCount}
      onLogout={onLogout}
    >
      {renderContent()}
    </CompanyLayout>
  );
}
