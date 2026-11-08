import { useState, useEffect } from "react";
import {
  Tour,
  Booking,
  Service,
  User,
  GuideSchedule,
  TourCompany,
  SystemBankAccount,
} from "@/app/types";
import { AdminLayout } from "./AdminLayout";
import { AdminDashboardOverview } from "./AdminDashboardOverview";
import { AdminFinancialManagement } from "./AdminFinancialManagement";
import { ServicePostApproval } from "./ServicePostApproval";
import { ProviderManagement } from "./ProviderManagement";
import { UserManagement } from "./UserManagement";
import { PartnerApprovalManagement } from "./PartnerApprovalManagement";
import { AdminRefundManagement } from "./AdminRefundManagement";
import { RefundRequest } from "@/app/types";
import type { PayoutAccountDto } from "@/app/services/wf05Bookings";
import { AdminTourModeration } from "./AdminTourModeration";

interface AdminDashboardProps {
  currentUser: User;
  tours: Tour[];
  bookings: Booking[];
  services: Service[];
  guides: User[];
  providers: User[];
  users: User[];
  guideSchedules: GuideSchedule[];
  companies: TourCompany[];
  onApproveTour?: (tourId: string) => void;
  onRejectTour?: (tourId: string, reason: string) => void;
  onToggleHideTour?: (tourId: string, reason?: string) => void;
  onDeleteTour?: (tourId: string) => void;
  onApproveBooking?: (bookingId: string) => void;
  onRejectBooking?: (bookingId: string, reason?: string) => void;
  onAssignGuide?: (bookingId: string, guideId: string) => void;
  onApproveService?: (serviceId: string) => void;
  onRejectService?: (serviceId: string, reason: string) => void;
  onToggleHideService?: (serviceId: string, reason?: string) => void;
  onDeleteService?: (serviceId: string) => void;
  onApproveProvider: (providerId: string) => void;
  onRejectProvider: (
    providerId: string,
    reason?: string,
  ) => void;
  // onUpdateUserStatus: (userId: string, isLocked: boolean) => void;
  onApproveCompany: (companyId: string) => void;
  onRejectCompany: (companyId: string, reason: string) => void;
  systemBank: SystemBankAccount;
  onUpdateSystemBank: (bank: SystemBankAccount) => void;
  onSettleBooking: (
    bookingId: string,
    settledAmount: number,
    platformFee: number,
    targetAgencyId?: string,
    bankReference?: string
  ) => void;
  onSuspendCompany: (companyId: string, reason: string) => void;
  refundRequests?: RefundRequest[];
  onApproveRefund?: (refundId: string, bankTransactionCode: string, note?: string, refundAmount?: number) => void | Promise<boolean | void>;
  onRejectRefund?: (refundId: string, reason: string) => void;
  onReviewRefund?: (refundId: string, note?: string) => void;
  payoutAccount?: PayoutAccountDto | null;
  onPayoutRefund?: (refundId: string, refundAmount: number, note?: string) => Promise<boolean>;
  onSyncPayout?: (refundId: string) => Promise<void>;
  onLogout?: () => void;
}

export function AdminDashboard({
  currentUser,
  tours,
  bookings,
  services,
  guides,
  providers,
  users,
  guideSchedules,
  companies,
  onApproveTour,
  onRejectTour,
  onToggleHideTour,
  onDeleteTour,
  onApproveBooking,
  onRejectBooking,
  onAssignGuide,
  onApproveService,
  onRejectService,
  onToggleHideService,
  onDeleteService,
  onApproveProvider,
  onRejectProvider,
  //onUpdateUserStatus,
  onApproveCompany,
  onRejectCompany,
  systemBank,
  onUpdateSystemBank,
  onSettleBooking,
  onSuspendCompany,
  refundRequests = [],
  onApproveRefund = () => { },
  onRejectRefund = () => { },
  onReviewRefund = () => { },
  payoutAccount,
  onPayoutRefund,
  onSyncPayout,
  onLogout,
}: AdminDashboardProps) {
  // Hash routing for reload / Back / Forward
  useEffect(() => {
    const handleHash = () => {
      const match = window.location.hash.match(/^#\/?admin\/([^/?]+)/);
      if (match) {
        setActiveSection(match[1] === "service-approvals" || match[1] === "services" ? "approve-posts" : match[1]);
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const [activeSection, setActiveSection] =
    useState<string>("partner-approvals");

  const [focusPartnerUserId, setFocusPartnerUserId] = useState<string | null>(null);

  const companyAdmins = users.filter(
    (u) => u.role === "company_admin",
  );

  const pendingToursCount = tours.filter(
    (t) => t.status === "pending_approval"
  ).length;

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <AdminDashboardOverview
            tours={tours}
            bookings={bookings}
            services={services}
            guides={guides}
            guideSchedules={guideSchedules}
          />
        );
      case "partner-approvals":
      case "companies":
      case "approve-providers":
        return (
          <PartnerApprovalManagement
            focusUserId={focusPartnerUserId}
            onFocusHandled={() => setFocusPartnerUserId(null)}
          />
        );
      case "tours":
      case "approve-tours":
        return (
          <AdminTourModeration
            tours={tours}
            services={services}
            onToggleHideTour={onToggleHideTour}
            onDeleteTour={onDeleteTour}
            onApproveTour={onApproveTour || (() => { })}
            onRejectTour={onRejectTour || (() => { })}
          />
        );
      case "refund-requests":
        return (
          <AdminRefundManagement
            refundRequests={refundRequests}
            onApproveRefund={onApproveRefund}
            onRejectRefund={onRejectRefund}
            onReviewRefund={onReviewRefund}
            payoutAccount={payoutAccount}
            onPayoutRefund={onPayoutRefund}
            onSyncPayout={onSyncPayout}
          />
        );

      case "finance":
        return (
          <AdminFinancialManagement
            systemBank={systemBank}
            onUpdateSystemBank={onUpdateSystemBank}
            bookings={bookings}
            onSettleBooking={onSettleBooking}
          />
        );

      case "service-approvals":
      case "services":
      case "approve-posts":
        return (
          <ServicePostApproval
            services={services}
            onApproveService={onApproveService}
            onRejectService={onRejectService}
            onToggleHideService={onToggleHideService}
            onDeleteService={onDeleteService}
          />
        );
      case "providers":
        return (
          <ProviderManagement
            providers={providers.filter(
              (p) => p.accountStatus === "approved",
            )}
            services={services}
          />
        );
      case "users":
        return (
          <UserManagement
            onOpenBusiness={(userId) => {
              setFocusPartnerUserId(userId);
              setActiveSection("partner-approvals");
              window.location.hash = "#/admin/partner-approvals";
            }}
          />
        );
      case "partner-approvals":
      case "companies":
      case "approve-providers":
        return (
          <PartnerApprovalManagement
            focusUserId={focusPartnerUserId}
            onFocusHandled={() => setFocusPartnerUserId(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout
      activeSection={activeSection}
      onNavigate={(section) => {
        setActiveSection(section);
        window.location.hash = `#/admin/${section}`;
      }}
      onLogout={onLogout}
      pendingToursCount={pendingToursCount}
      pendingRefundsCount={refundRequests.filter((r) => r.status === "PENDING").length}
      pendingServicesCount={services.filter((s) => s.status === "pending").length}
    >
      {renderContent()}
    </AdminLayout>
  );
}
