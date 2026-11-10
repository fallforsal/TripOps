import { AgencyDesignCoHosting } from "./DesignCollaborationPanel";
import { useEffect, useState } from "react";
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
  ProviderGroupReservationRequest,
} from "@/app/types";
import { mockTourCompanies } from "@/app/data/mockData";
import { AgencyLayout } from "./AgencyLayout";
import { AgencyOverview } from "./AgencyOverview";
import { AgencyTourManagement } from "./AgencyTourManagement";
import { AgencyBookingManagement } from "./AgencyBookingManagement";
import { AgencyGuideManagement } from "./AgencyGuideManagement";
import { AgencyCustomRequests } from "./AgencyCustomRequests";
import { AgencyBookingDetailPage } from "./AgencyBookingDetailPage";
import { AgencyServicesExplorer } from "./AgencyServicesExplorer";
import { AgencySupplierDirectory } from "./AgencySupplierDirectory";
import { BusinessProfileOnboardingPage } from "@/app/components/auth/BusinessProfileOnboardingPage";
import { BusinessAccountContainer } from "@/app/components/agency/BusinessAccountContainer";

interface AgencyDashboardProps {
  providerGroupRequests?: ProviderGroupReservationRequest[];
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
  onDuplicateTour?: (tourId:string,name:string)=>Promise<void>;
  onApproveBooking: (bookingId: string) => void;
  onRejectBooking: (bookingId: string, reason?: string) => void;
  onAssignGuide: (bookingId: string, guideId: string) => void;
  onUpdateAssignedGuides?: (bookingId: string, guides: BookingAssignedGuide[]) => void;
  onCreatePaymentRequest: (bookingId: string, request: Omit<PaymentRequest, "id" | "bookingId" | "createdAt" | "status">) => void;
  onMarkDepositPaid?: (bookingId: string) => void;
  onMarkFullyPaid?: (bookingId: string) => void;
  onBookingChanged?: (booking: import("@/app/services/wf05Bookings").BookingDto) => void;
  onUpdateBookingPrice?: (bookingId: string, newPrice: number, note?: string) => void | Promise<boolean>;
  onUpdateBookingPassengers?: (bookingId: string, updatedPassengers: any[]) => void;
  onUpdateBookingAgencies?: (bookingId: string, agencies: BookingAgencyShare[]) => void;
  onUpdateAttractionCheckins?: (bookingId: string, checkins: BookingAttractionCheckin[]) => void;
  onUpdateIncidents?: (bookingId: string, incidents: BookingIncident[]) => void;
  onCancelBooking?: (bookingId: string, reason: string) => Promise<boolean>;
  onReviewContract?: (bookingId: string, decision: "verify" | "resign", note?: string) => Promise<boolean>;
  onUpdateCustomRequest?: (id: string, update: Partial<CustomTourRequest>) => void;
  onRestoreTourVersion?: (tourId: string, versionNumber: number) => void;
  onViewTour?: (tour: Tour) => void;
  onGuidesChanged?: () => void | Promise<void>;
  onLogout?: () => void;
}

export function AgencyDashboard({
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
  onDuplicateTour,
  onApproveBooking,
  onRejectBooking,
  onAssignGuide,
  onUpdateAssignedGuides,
  onCreatePaymentRequest,
  onMarkDepositPaid,
  onMarkFullyPaid,
  onUpdateBookingPrice,
  onBookingChanged,
  onUpdateBookingPassengers,
  onUpdateBookingAgencies,
  onUpdateAttractionCheckins,
  onUpdateIncidents,
  onCancelBooking,
  onReviewContract,
  onUpdateCustomRequest,
  onRestoreTourVersion,
  onViewTour,
  onGuidesChanged,
  onLogout,
}: AgencyDashboardProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  // Hash routing for reload / Back / Forward
  useEffect(() => {
    const handleHash = () => {
      const match = window.location.hash.match(/^#\/?agency\/([^/?]+)(?:\/([^/?]+))?/);
      if (match) {
        const sec = match[1];
        const bId = match[2] || null;
        setActiveSection(sec);
        if (bId) setSelectedBookingId(bId);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

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
    window.location.hash = `#/agency/${section}`;
  };

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <AgencyOverview
            company={company}
            tours={companyTours}
            bookings={companyBookings}
            guides={companyGuides}
            onNavigate={setActiveSection}
          />
        );
      case "tours":
        return (
          <AgencyTourManagement
            tours={companyTours}
            company={company}
            onCreateTour={onCreateTour}
            onEditTour={onEditTour}
            onDeleteTour={onDeleteTour} onDuplicateTour={onDuplicateTour}
            onRestoreTourVersion={onRestoreTourVersion}
          />
        );
      case "bookings":
        if (currentSelectedBooking) {
          return (
            <AgencyBookingDetailPage
              booking={currentSelectedBooking}
              guides={companyGuides.filter(g => g.guideStatus !== "inactive")}
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
              onBookingChanged={onBookingChanged}
              onUpdateBookingPassengers={onUpdateBookingPassengers}
              onUpdateBookingAgencies={onUpdateBookingAgencies}
              onUpdateAttractionCheckins={onUpdateAttractionCheckins}
              onUpdateIncidents={onUpdateIncidents}
              onCancelBooking={onCancelBooking}
              onReviewContract={onReviewContract}
            />
          );
        }
        return (
          <AgencyBookingManagement
            bookings={companyBookings}
            guides={companyGuides.filter(g => g.guideStatus !== "inactive")}
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
          <AgencyServicesExplorer
            services={services}
            companyName={company.name}
          />
        );
      case "supplier-directory":
        return (
          <AgencySupplierDirectory key={company.id} />
        );
      case "guides":
        return (
          <AgencyGuideManagement
            companyId={company.id} companyName={company.name}
            onGuidesChanged={onGuidesChanged}
            onNavigateToBookings={() => setActiveSection("bookings")}
            onViewBookingDetail={(id) => { setSelectedBookingId(id); setActiveSection("bookings"); }}
          />
        );
      case "custom-requests":
        return (
          <AgencyCustomRequests
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
      
      case "business-account":
  return <BusinessAccountContainer />;

      case "co-hosting":
        return <AgencyDesignCoHosting requests={companyCustomRequests} company={company} onChanged={async () => { await onUpdateCustomRequest?.("", {}); }}/>;
      default:
        return null;
    }
  };

  // Nếu doanh nghiệp chưa được duyệt: CHỈ HIỂN THỊ DUY NHẤT TRANG BẮT BUỘC CẬP NHẬT HỒ SƠ
  if (company.status !== "approved") {
    return (
      <BusinessProfileOnboardingPage
        currentUser={currentUser}
        company={company}
        onLogout={onLogout}
      />
    );
  }

  return (
    <AgencyLayout
      activeSection={activeSection}
      onNavigate={handleNavigateSection}
      company={company}
      currentUser={currentUser}
      coHostingBadgeCount={pendingCoHostInvitesCount}
      onLogout={onLogout}
    >
      {renderContent()}
    </AgencyLayout>
  );
}

// Backwards compatibility alias
export const CompanyDashboard = AgencyDashboard;
