import { useState } from "react";
import { Tour, Booking, CustomTourRequest } from "@/app/types";
import { TourList } from "./TourList";
import { MyBookings } from "./MyBookings";
import { UserCustomRequests } from "./UserCustomRequests";
import { Compass, Calendar, PenSquare } from "lucide-react";

interface UserDashboardProps {
  tours: Tour[];
  userBookings: Booking[];
  customTourRequests?: CustomTourRequest[];
  initialTab?: "explore" | "mybookings" | "custom-requests";
  onBookTour: (tour: Tour) => void;
  onCancelBooking: (bookingId: string, reason: string) => void;
  onViewTour?: (tour: Tour) => void;
  onCancelCustomRequest?: (id: string) => void;
  onNavigateToCustomTourForm?: () => void;
  onViewBookingDetail?: (booking: Booking) => void;
}

export function UserDashboard({
  tours,
  userBookings,
  customTourRequests = [],
  initialTab,
  onBookTour,
  onCancelBooking,
  onViewTour,
  onCancelCustomRequest,
  onNavigateToCustomTourForm,
  onViewBookingDetail,
}: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "explore" | "mybookings" | "custom-requests"
  >(initialTab || "explore");

  const tabs = [
    { id: "explore", label: "Khám phá Tour", icon: Compass },
    { id: "mybookings", label: "Tour của tôi", icon: Calendar },
    { id: "custom-requests", label: "Yêu cầu thiết kế", icon: PenSquare, badge: customTourRequests.filter((r) => r.status === "quoted" || r.status === "designed").length },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-sm">
        <div className="flex border-b border-[#CBD5E1]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 text-sm ${
                  activeTab === tab.id
                    ? "text-[#075985] font-semibold border-b-2 border-[#075985]"
                    : "text-[#475569] hover:text-[#075985]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {"badge" in tab && (tab.badge ?? 0) > 0 && (
                  <span className="bg-[#F97316] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "explore" && (
        <TourList
          tours={tours.filter((t) => t.tourType !== "custom_request")}
          onBookTour={onBookTour}
          onViewTour={onViewTour}
        />
      )}

      {activeTab === "mybookings" && (
        <MyBookings
          bookings={userBookings}
          onCancelBooking={onCancelBooking}
          onViewBookingDetail={(booking) => {
            if (onViewBookingDetail) {
              onViewBookingDetail(booking);
            }
          }}
        />
      )}

      {activeTab === "custom-requests" && (
        <UserCustomRequests
          requests={customTourRequests}
          tours={tours}
          onCancel={(id) => onCancelCustomRequest?.(id)}
          onNavigateToForm={() => onNavigateToCustomTourForm?.()}
          onViewTour={onViewTour}
          onBookTour={onBookTour}
        />
      )}
    </div>
  );
}