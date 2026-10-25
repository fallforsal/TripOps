import { companyFromUser } from '@/app/services/authService';
import { agencyTours, archiveAgencyTour, createAgencyTour, duplicateAgencyTour, fromApiTour, fromConfiguration, getPublicTour,
  hideAgencyTour, hideModeratedTour, moderationTours, publicTours, publishAgencyTour,
  restoreAgencyTour, updateAgencyTour } from '@/app/services/wf02Tours';
import { assignGuide, cancelBooking, createBooking, decideBooking, depositBooking, fromApiBooking, getAgencyBookingDetail, getAgencyBookings, getBookingDetail, getCustomerBookings, getGuideBookingDetail, getGuideBookings, recordAttendance, reportIncident, BookingDto } from '@/app/services/wf05Bookings';
import { useAuth } from '@/app/contexts/AuthContext';
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoginScreen } from "@/app/components/LoginScreen";
import { RegisterScreen } from "@/app/components/RegisterScreen";
import { UnifiedHeader } from "@/app/components/UnifiedHeader";
import { HomePage } from "@/app/components/HomePage";
import { PublicFooter } from "@/app/components/PublicFooter";
import { UserDashboard } from "@/app/components/user/UserDashboard";
import { GuideDashboard } from "@/app/components/guide/GuideDashboard";
import { AdminDashboard } from "@/app/components/admin/AdminDashboard";
import { ProviderDashboard } from "@/app/components/provider/ProviderDashboard";
import { ServicePostManagement } from "@/app/components/provider/ServicePostManagement";
import { CreatePostModal } from "@/app/components/provider/CreatePostModal";
import { EditServiceModal } from "@/app/components/provider/EditServiceModal";
import { AgencyDashboard } from "@/app/components/agency/AgencyDashboard";
import { BookToursPage } from "@/app/components/BookToursPage";
import { ContactPage } from "@/app/components/ContactPage";
import { AboutPage } from "@/app/components/AboutPage";
import { ReviewsPage } from "@/app/components/ReviewsPage";
import { PromotionsPage } from "@/app/components/user/PromotionsPage";
import { MessagesPage } from "@/app/components/user/MessagesPage";
import { WishlistPage } from "@/app/components/user/WishlistPage";
import { MyReviewsPage } from "@/app/components/user/MyReviewsPage";
import { NotificationsPage } from "@/app/components/user/NotificationsPage";
import { HelpCenterPage } from "@/app/components/user/HelpCenterPage";
import { MyBookings } from "@/app/components/user/MyBookings";
import { UserProfile } from "@/app/components/user/UserProfile";
import { TourDetailPage } from "@/app/components/user/TourDetailPage";
import { BookingFormPage, BookingSubmitData } from "@/app/components/user/BookingFormPage";
import { CustomTourRequestPage } from "@/app/components/user/CustomTourRequestPage";
import { UserBookingDetailPage } from "@/app/components/user/UserBookingDetailPage";
import { AITourRecommenderModal } from "@/app/components/ai/AITourRecommenderModal";
import {
  User,
  Tour,
  Booking,
  BookingPassenger,
  IncidentReport,
  Service,
  GuideSchedule,
  RoomBooking,
  TourCompany,
  PaymentRequest,
  CustomTourRequest,
  CustomHotelChange,
  CustomMealChange,
  CustomLocationChange,
  SystemBankAccount,
  BookingPriceAdjustment,
  BookingAgencyShare,
  BookingAssignedGuide,
  BookingAttractionCheckin,
  BookingIncident,
} from "@/app/types";
import {
  mockBookings,
  mockServices,
  mockGuideSchedules,
  mockRoomBookings,
  mockCustomTourRequests,
  defaultSystemBankAccount,
} from "@/app/data/mockData";

function App() {
  const {user: currentUser, setUser: setCurrentUser, loading: sessionLoading, error: authError, signOut} = useAuth();
  const [sessionError, setSessionError] = useState('');
  useEffect(() => {
    if (!currentUser) return;
    setUsers(previous => [...previous.filter(item => item.id !== currentUser.id), currentUser]);
    if (currentUser.role === 'agency') setCompanies(previous => [...previous.filter(item => item.id !== currentUser.id), companyFromUser(currentUser)]);
  }, [currentUser]);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentPage, setCurrentPage] =
    useState<string>("home");
  const [previousPage, setPreviousPage] = useState<string>("home");
  const [tours, setTours] = useState<Tour[]>([]);
  const [tourLoading, setTourLoading] = useState(true);
  const [tourError, setTourError] = useState("");
  const [tourNotice, setTourNotice] = useState("");
  useEffect(() => { if (tourNotice) { toast.success(tourNotice); setTourNotice(""); } }, [tourNotice]);
  async function refreshTours() {
    const publicItems = await publicTours();
    const privateItems = currentUser?.role === "agency" ? await agencyTours()
      : currentUser?.role === "admin" ? await moderationTours() : [];
    const byId = new Map<string, Tour>();
    for (const tour of publicItems) byId.set(tour.id, tour);
    for (const tour of privateItems) byId.set(tour.id, tour);
    setTours([...byId.values()]);
  }
  useEffect(() => {
    let active = true;
    setTourLoading(true);
    setTourError("");
    (async () => {
      const publicItems = await publicTours();
      const privateItems = currentUser?.role === "agency" ? await agencyTours()
        : currentUser?.role === "admin" ? await moderationTours() : [];
      if (!active) return;
      const byId = new Map<string, Tour>();
      for (const tour of publicItems) byId.set(tour.id, tour);
      for (const tour of privateItems) byId.set(tour.id, tour);
      setTours([...byId.values()]);
    })().catch(error => { if (active) setTourError(error instanceof Error ? error.message : "Không tải được tour."); })
      .finally(() => { if (active) setTourLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.role]);
  const [bookings, setBookings] =
    useState<Booking[]>(mockBookings);

  async function refreshCustomerBookings() {
    if (!currentUser || currentUser.role !== "user") return;
    try {
      const pageData = await getCustomerBookings();
      if (!pageData?.items) return;
      const details = await Promise.all(
        pageData.items.map(async (item) => {
          try {
            return await getBookingDetail(item.id);
          } catch {
            return null;
          }
        }),
      );
      const apiBookings = details
        .filter((d): d is BookingDto => d !== null)
        .map((dto) => fromApiBooking(dto, tours, currentUser));

      setBookings((prev) => {
        const apiIds = new Set(apiBookings.map((b) => b.id));
        const nonApiBookings = prev.filter((b) => !apiIds.has(b.id));
        return [...apiBookings, ...nonApiBookings];
      });
    } catch (err) {
      console.error("Failed to load customer bookings", err);
    }
  }

  async function refreshAgencyBookings() {
    if (!currentUser || (currentUser.role !== "agency" && currentUser.role !== "company_admin")) return;
    try {
      const pageData = await getAgencyBookings();
      if (!pageData?.items) return;
      const details = await Promise.all(
        pageData.items.map(async (item) => {
          try {
            return await getAgencyBookingDetail(item.id);
          } catch {
            return null;
          }
        }),
      );
      const apiBookings = details
        .filter((d): d is BookingDto => d !== null)
        .map((dto) => fromApiBooking(dto, tours, currentUser));

      setBookings((prev) => {
        const apiIds = new Set(apiBookings.map((b) => b.id));
        const nonApiBookings = prev.filter((b) => !apiIds.has(b.id));
        return [...apiBookings, ...nonApiBookings];
      });
    } catch (err) {
      console.error("Failed to load agency bookings", err);
    }
  }

  async function refreshGuideBookings() {
    if (!currentUser || currentUser.role !== "guide") return;
    try {
      const pageData = await getGuideBookings();
      if (!pageData?.items) return;
      const details = await Promise.all(
        pageData.items.map(async (item) => {
          try {
            return await getGuideBookingDetail(item.id);
          } catch {
            return null;
          }
        }),
      );
      const apiBookings = details
        .filter((d): d is BookingDto => d !== null)
        .map((dto) => fromApiBooking(dto, tours, currentUser));

      setBookings((prev) => {
        const apiIds = new Set(apiBookings.map((b) => b.id));
        const nonApiBookings = prev.filter((b) => !apiIds.has(b.id));
        return [...apiBookings, ...nonApiBookings];
      });

      // Synchronize guideSchedules with assigned trips
      setGuideSchedules((prev) => {
        const newSchedules: GuideSchedule[] = apiBookings.map((b) => {
          const existing = prev.find((s) => s.booking.id === b.id);
          if (existing) {
            return {
              ...existing,
              booking: b,
              tour: b.tour,
            };
          }
          return {
            id: `schedule-${b.id}`,
            guideId: currentUser.id,
            guideName: currentUser.name,
            tour: b.tour,
            booking: b,
            startDate: b.tourStartDate,
            endDate: b.tourStartDate,
            status: "confirmed",
            completedLocations: [],
            departureRollCallCompleted: b.passengers?.some((p) => (p as any).attendanceStatus === "CheckedIn") || false,
            incidents: [],
          };
        });
        const scheduleIds = new Set(newSchedules.map((s) => s.id));
        const remaining = prev.filter((s) => !scheduleIds.has(s.id));
        return [...newSchedules, ...remaining];
      });
    } catch (err) {
      console.error("Failed to load guide bookings", err);
    }
  }

  useEffect(() => {
    refreshCustomerBookings();
    refreshAgencyBookings();
    refreshGuideBookings();
  }, [currentUser?.id, currentUser?.role, tours]);
  const [services, setServices] =
    useState<Service[]>(mockServices);
  const [guideSchedules, setGuideSchedules] = useState<
    GuideSchedule[]
  >(mockGuideSchedules);
  const [roomBookings, setRoomBookings] =
    useState<RoomBooking[]>(mockRoomBookings);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] =
    useState<TourCompany[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [selectedUserBooking, setSelectedUserBooking] = useState<Booking | null>(null);
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  const [bookingCustomData, setBookingCustomData] = useState<{
    customHotelChanges?: CustomHotelChange[];
    customMealChanges?: CustomMealChange[];
    locationChanges?: CustomLocationChange[];
    hasLocationCustomization?: boolean;
  } | null>(null);
  const [customTourRequests, setCustomTourRequests] = useState<CustomTourRequest[]>(mockCustomTourRequests);
  const [systemBankAccount, setSystemBankAccount] = useState<SystemBankAccount>(defaultSystemBankAccount);
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setUsers(previous => [...previous.filter(item => item.id !== user.id), user]);
    if (user.role === 'agency') setCompanies(previous => [...previous.filter(item => item.id !== user.id), companyFromUser(user)]);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = async () => {
    try { await signOut(); } catch (e) { setSessionError(e instanceof Error ? e.message : 'Không thể đăng xuất'); return; }
    setUsers([]); setCompanies([]);
    setCurrentUser(null);
    setShowLogin(false);
    setShowRegister(false);
    setCurrentPage("home");
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedTour(null);
    setSelectedUserBooking(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewUserBookingDetail = async (booking: Booking) => {
    setSelectedUserBooking(booking);
    setCurrentPage("user-booking-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
    const numericId = Number(booking.id);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const detail = await getBookingDetail(numericId);
        const converted = fromApiBooking(detail, tours, currentUser);
        setSelectedUserBooking(converted);
        setBookings((prev) => prev.map((b) => (b.id === booking.id ? converted : b)));
      } catch (err) {
        console.error("Failed to fetch fresh booking detail", err);
      }
    }
  };

  const handleViewTour = (tour: Tour) => {
    setPreviousPage(currentPage);
    setSelectedTour(tour);
    setCurrentPage("tour-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (tour.visibility === "public") {
      void getPublicTour(tour.id).then(latest =>
        setSelectedTour(fromConfiguration(latest.id, latest.code, latest.version, latest.configuration)))
        .catch(error => toast.error(error instanceof Error ? error.message : "Không tải được chi tiết tour."));
    }
  };

  const handleOpenBookingForm = (
    tour: Tour,
    customData?: {
      customHotelChanges?: CustomHotelChange[];
      customMealChanges?: CustomMealChange[];
      locationChanges?: CustomLocationChange[];
      hasLocationCustomization?: boolean;
    },
  ) => {
    setBookingTour(tour);
    setBookingCustomData(customData ?? null);
    setCurrentPage("booking-form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBookingSubmit = async (data: BookingSubmitData) => {
    if (!currentUser) return;
    const tour = tours.find((t) => t.id === data.tourId);
    if (!tour) return;

    let apiBookingCode = `BK${Date.now()}`;
    let apiBookingId = `booking-${Date.now()}`;
    let apiDepositAmount = 0;

    const tourIdNum = Number(data.tourId);
    if (Number.isSafeInteger(tourIdNum) && tourIdNum > 0) {
      try {
        const departureIso = data.tourStartDate ? new Date(data.tourStartDate).toISOString() : new Date().toISOString();
        const apiRes = await createBooking({
          tourId: tourIdNum,
          startDate: departureIso,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          specialRequests: data.bookingNotes,
          participants: data.passengers.map((p) => ({
            fullName: p.fullName,
            phoneNumber: p.phone,
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString() : undefined,
            gender: p.gender === "female" ? "Nữ" : "Nam",
            identityNumber: p.idNumber,
          })),
        });
        apiBookingCode = apiRes.bookingCode;
        apiBookingId = apiRes.id.toString();
        apiDepositAmount = apiRes.depositAmount;
        toast.success(`Đặt tour thành công! Mã đơn: ${apiRes.bookingCode}`);
        const apiBooking = fromApiBooking(apiRes, tours, currentUser);
        setBookings((prev) => [apiBooking, ...prev]);
        return;
      } catch (err: any) {
        toast.error(err?.message || "Không thể gửi đơn đặt tour lên máy chủ");
      }
    }

    const newBooking = {
      id: apiBookingId,
      bookingCode: apiBookingCode,
      tourId: tour.id,
      tour,
      userId: currentUser.id,
      userName: data.contactName,
      userEmail: data.contactEmail,
      numberOfGuests: data.passengers.length,
      totalPrice: data.totalPrice,
      status: "pending" as const,
      bookingDate: new Date().toISOString().split("T")[0],
      tourStartDate: data.tourStartDate || new Date().toISOString().split("T")[0],
      companyId: tour.companyId,
      companyName: tour.companyName,
      isCoHosted: tour.isCoHosted,
      coHosts: tour.coHosts,
      passengers: data.passengers,
      contactName: data.contactName,
      contactAddress: data.contactAddress,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      bookingNotes: data.bookingNotes,
      hasLocationCustomization: data.hasLocationCustomization,
      customHotelChanges: data.customHotelChanges,
      customMealChanges: data.customMealChanges,
      locationChanges: data.locationChanges,
      depositAmount: apiDepositAmount || 0,
      depositPaid: false,
      remainingAmount: data.totalPrice,
      paymentStatus: "unpaid" as const,
      paymentRequests: [],
    };
    setBookings([newBooking, ...bookings]);
  };

  // User actions
  const handleBookTour = (
    tourId: string,
    numberOfGuests: number,
    startDate: string,
  ) => {
    if (!currentUser) return;

    const tour = tours.find((t) => t.id === tourId);
    if (!tour) return;

    const newBooking: Booking = {
      id: `booking-${Date.now()}`,
      tourId: tour.id,
      tour: tour,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      numberOfGuests,
      totalPrice: tour.price * numberOfGuests,
      status: "pending",
      bookingDate: new Date().toISOString().split("T")[0],
      tourStartDate: startDate,
      companyId: tour.companyId,
      companyName: tour.companyName,
      isCoHosted: tour.isCoHosted,
      coHosts: tour.coHosts,
      depositAmount: 0,
      depositPaid: false,
      remainingAmount: tour.price * numberOfGuests,
      paymentStatus: "unpaid",
      paymentRequests: [],
    };

    setBookings([...bookings, newBooking]);
  };

  const handleCancelBooking = async (
    bookingId: string,
    reason?: string,
  ) => {
    const numericId = Number(bookingId);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const updatedDto = await cancelBooking(numericId, reason || "Khách hàng yêu cầu hủy đơn");
        toast.success("Hủy đơn đặt tour thành công");
        const converted = fromApiBooking(updatedDto, tours, currentUser);
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? converted : b)));
        if (selectedUserBooking?.id === bookingId) {
          setSelectedUserBooking(converted);
        }
        return;
      } catch (err: any) {
        toast.error(err?.message || "Không thể hủy đơn đặt tour trên máy chủ");
      }
    }

    setBookings(
      bookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "cancelled" as const,
              cancellationReason: reason,
              rejectedBy: "customer" as const,
            }
          : booking,
      ),
    );
    if (selectedUserBooking?.id === bookingId) {
      setSelectedUserBooking((prev) =>
        prev
          ? {
              ...prev,
              status: "cancelled" as const,
              cancellationReason: reason,
              rejectedBy: "customer" as const,
            }
          : null,
      );
    }
  };

  const handleRejectBooking = async (
    bookingId: string,
    reason?: string,
  ) => {
    const numericId = Number(bookingId);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const updatedDto = await decideBooking(numericId, "reject", reason);
        toast.success(`Đã từ chối đơn đặt tour #${updatedDto.bookingCode || updatedDto.id}`);
        const converted = fromApiBooking(updatedDto, tours, currentUser);
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? converted : b)));
        if (selectedUserBooking?.id === bookingId) {
          setSelectedUserBooking(converted);
        }
        return;
      } catch (err: any) {
        toast.error(err?.message || "Không thể từ chối đơn đặt tour trên máy chủ");
      }
    }

    setBookings(
      bookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "cancelled" as const,
              rejectionReason: reason,
            }
          : booking,
      ),
    );
  };

  // Guide actions
  const handleCheckIn = (
    scheduleId: string,
    locationId: string,
    image?: string,
    note?: string,
  ) => {
    setGuideSchedules(
      guideSchedules.map((schedule) => {
        if (schedule.id === scheduleId) {
          // Add location to completed locations
          const completedLocations = [
            ...schedule.completedLocations,
            locationId,
          ];

          // Update the location's check-in time in the tour itinerary
          const updatedBooking = {
            ...schedule.booking,
            tour: {
              ...schedule.booking.tour,
              itinerary: schedule.booking.tour.itinerary.map(
                (day) => ({
                  ...day,
                  locations: day.locations.map((loc) =>
                    loc.id === locationId
                      ? {
                          ...loc,
                          checkedIn: true,
                          checkInTime:
                            new Date().toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            ),
                          checkInImage: image,
                          checkInNote: note,
                        }
                      : loc,
                  ),
                }),
              ),
            },
          };

          return {
            ...schedule,
            completedLocations,
            booking: updatedBooking,
          };
        }
        return schedule;
      }),
    );
  };

  // Admin / Company actions
  const handleApproveBooking = async (bookingId: string) => {
    const numericId = Number(bookingId);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const updatedDto = await decideBooking(numericId, "approve");
        toast.success(`Đã phê duyệt đơn đặt tour #${updatedDto.bookingCode || updatedDto.id}!`);
        const converted = fromApiBooking(updatedDto, tours, currentUser);
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? converted : b)));
        if (selectedUserBooking?.id === bookingId) {
          setSelectedUserBooking(converted);
        }
        return;
      } catch (err: any) {
        toast.error(err?.message || "Không thể phê duyệt đơn đặt tour trên máy chủ");
      }
    }

    setBookings((prev) =>
      prev.map((booking) => {
        if (booking.id !== bookingId) return booking;

        // Auto-confirm all agency quotes in Happy Case approval
        const updatedAgencies = booking.bookingAgencies?.map((a) => ({
          ...a,
          confirmationStatus: "confirmed" as const,
          quoteConfirmed: true,
          confirmedAt: a.confirmedAt || new Date().toISOString(),
        }));

        return {
          ...booking,
          status: "confirmed" as const,
          bookingAgencies: updatedAgencies || booking.bookingAgencies,
          paymentRequests: booking.paymentRequests || [],
        };
      })
    );
  };

  const handleUpdateBookingAgencies = (
    bookingId: string,
    agencies: BookingAgencyShare[],
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, bookingAgencies: agencies } : b))
    );
  };

  const handleUpdateAttractionCheckins = (
    bookingId: string,
    checkins: BookingAttractionCheckin[],
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, attractionCheckins: checkins } : b))
    );
  };

  const handleUpdateIncidents = (
    bookingId: string,
    incidents: BookingIncident[],
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, incidents: incidents } : b))
    );
  };

  const handleMarkDepositPaid = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              depositPaid: true,
              paymentStatus: "paid" as const,
            }
          : b,
      ),
    );
  };

  const handleMarkFullyPaid = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              depositPaid: true,
              remainingAmount: 0,
              paymentStatus: "paid" as const,
            }
          : b,
      ),
    );
  };

  const handleAssignGuide = async (
    bookingId: string,
    guideId: string,
  ) => {
    const numericId = Number(bookingId);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const updatedDto = await assignGuide(numericId, guideId, "Lead", "Hướng dẫn viên phụ trách chính đoàn khách");
        toast.success(`Đã phân công HDV cho đơn booking #${updatedDto.bookingCode || updatedDto.id}!`);
        const converted = fromApiBooking(updatedDto, tours, currentUser);
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? converted : b)));
        if (selectedUserBooking?.id === bookingId) {
          setSelectedUserBooking(converted);
        }
        return;
      } catch (err: any) {
        toast.error(err?.message || "Không thể phân công HDV trên máy chủ");
      }
    }

    const guide = users.find((u) => u.id === guideId && u.role === "guide") ||
      users.find((u) => u.id === guideId && u.role === "guide");
    if (!guide) return;

    setBookings((prev) =>
      prev.map((booking) => {
        if (booking.id !== bookingId) return booking;
        const currentGuides = booking.assignedGuides || [];
        const existingIdx = currentGuides.findIndex((ag) => ag.guideId === guide.id);
        let updatedGuides: BookingAssignedGuide[];
        if (existingIdx >= 0) {
          updatedGuides = [...currentGuides];
        } else {
          updatedGuides = [
            ...currentGuides,
            {
              id: `bag-${Date.now()}`,
              guideId: guide.id,
              guideName: guide.name,
              guidePhone: guide.phone,
              guideAvatar: guide.avatar,
              companyId: guide.companyId || booking.companyId || "",
              companyName: guide.companyName || booking.companyName || "",
              role: currentGuides.length === 0 ? "lead_guide" : "support_guide",
              assignedAt: new Date().toISOString().split("T")[0],
            },
          ];
        }
        return {
          ...booking,
          guideId: guide.id,
          guideName: guide.name,
          guideAvatar: guide.avatar,
          guidePhone: guide.phone,
          assignedGuides: updatedGuides,
        };
      })
    );

    // Add to guide schedules
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      const existingSchedule = guideSchedules.find(
        (s) => s.booking.id === bookingId && (s.booking.guideId === guide.id || s.id.includes(guide.id))
      );
      if (!existingSchedule) {
        const newSchedule: GuideSchedule = {
          id: `schedule-${bookingId}-${guide.id}`,
          booking: {
            ...booking,
            guideId: guide.id,
            guideName: guide.name,
            guideAvatar: guide.avatar,
            guidePhone: guide.phone,
          },
          currentDay: 1,
          completedLocations: [],
        };
        setGuideSchedules((prev) => [...prev, newSchedule]);
      }
    }
  };

  const handleUpdateAssignedGuides = (
    bookingId: string,
    updatedGuides: BookingAssignedGuide[],
  ) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        const primary = updatedGuides[0];
        return {
          ...b,
          assignedGuides: updatedGuides,
          guideId: primary?.guideId,
          guideName: primary?.guideName,
          guideAvatar: primary?.guideAvatar,
          guidePhone: primary?.guidePhone,
        };
      })
    );

    // Synchronize guide schedules for assigned guides
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      updatedGuides.forEach((g) => {
        const exists = guideSchedules.some(
          (s) => s.booking.id === bookingId && (s.booking.guideId === g.guideId || s.id.includes(g.guideId))
        );
        if (!exists) {
          const newSchedule: GuideSchedule = {
            id: `schedule-${bookingId}-${g.guideId}`,
            booking: {
              ...booking,
              guideId: g.guideId,
              guideName: g.guideName,
              guideAvatar: g.guideAvatar,
              guidePhone: g.guidePhone,
            },
            currentDay: 1,
            completedLocations: [],
          };
          setGuideSchedules((prev) => [...prev, newSchedule]);
        }
      });
    }
  };

  const handleCreateTour = (tourData: Omit<Tour, "id">) => {
    const newTour: Tour = {
      ...tourData,
      id: `tour-${Date.now()}`,
      bookings: 0,
    };
    setTours([...tours, newTour]);
  };

  const handleEditTour = (tour: Tour) => {
    alert(
      `Chỉnh sửa tour: ${tour.name}\n\nDemo đã bao gồm đầy đủ luồng hoạt động.`,
    );
  };

  const handleDeleteTour = (tourId: string) => {
    setTours((prev) => prev.filter((t) => t.id !== tourId));
  };

  // Provider actions
  const [showCreateServiceForm, setShowCreateServiceForm] =
    useState(false);
  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const handleCreateService = () => {
    setShowCreateServiceForm(true);
  };

  const handleSubmitService = (
    serviceData: Omit<Service, "id" | "status" | "createdAt">,
  ) => {
    const newService: Service = {
      ...serviceData,
      id: `service-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setServices([...services, newService]);
    setShowCreateServiceForm(false);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
  };

  const handleUpdateService = (
    serviceId: string,
    serviceData: Omit<Service, "id">,
  ) => {
    setServices(
      services.map((service) =>
        service.id === serviceId
          ? { ...serviceData, id: serviceId }
          : service,
      ),
    );
    setEditingService(null);
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const handleUpdateProviderProfile = (updatedUser: Partial<User>) => {
    if (!currentUser) return;
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === currentUser.id ? { ...u, ...updatedUser } : u
      )
    );
    setCurrentUser((prev) =>
      prev ? ({ ...prev, ...updatedUser } as User) : null
    );
  };

  // Service moderation actions (for Admin)
  const handleApproveService = (serviceId: string) => {
    setServices(
      services.map((service) =>
        service.id === serviceId
          ? { ...service, status: "approved" as const, hiddenReason: undefined }
          : service,
      ),
    );
  };

  const handleToggleHideService = (serviceId: string, reason?: string) => {
    setServices((prev) =>
      prev.map((service) => {
        if (service.id !== serviceId) return service;
        const willHide = service.status !== "hidden";
        return {
          ...service,
          status: willHide ? ("hidden" as const) : ("approved" as const),
          hiddenReason: willHide
            ? (reason || "Thông tin dịch vụ bị tạm ẩn do không chính xác hoặc không phù hợp")
            : undefined,
        };
      })
    );
  };

  const handleRejectService = (
    serviceId: string,
    reason: string,
  ) => {
    setServices(
      services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              status: "rejected" as const,
              rejectionReason: reason,
            }
          : service,
      ),
    );
  };

  // Provider actions - Room bookings
  const handleApproveRoomBooking = (bookingId: string) => {
    setRoomBookings(
      roomBookings.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: "confirmed" as const }
          : booking,
      ),
    );
  };

  const handleRejectRoomBooking = (
    bookingId: string,
    reason?: string,
  ) => {
    setRoomBookings(
      roomBookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: "cancelled" as const,
              rejectionReason: reason,
            }
          : booking,
      ),
    );
  };

  // Admin actions - User status update
  const handleUpdateUserStatus = (
    userId: string,
    isLocked: boolean,
  ) => {
    console.log(
      `User ${userId} status updated: ${isLocked ? "locked" : "active"}`,
    );
  };

  const handleSuspendCompany = (
    companyId: string,
    reason: string,
  ) => {
    setCompanies(
      companies.map((c) =>
        c.id === companyId
          ? {
              ...c,
              status: "suspended" as const,
              rejectionReason: reason,
            }
          : c,
      ),
    );
  };

  // Company admin - payment requests
  const handleCreatePaymentRequest = (
    bookingId: string,
    request: Omit<PaymentRequest, "id" | "bookingId" | "createdAt" | "status">,
  ) => {
    const newRequest: PaymentRequest = {
      id: `pr-${Date.now()}`,
      bookingId,
      ...request,
      status: "pending",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? { ...b, paymentRequests: [...(b.paymentRequests ?? []), newRequest] }
          : b,
      ),
    );
  };

  // Admin updates system bank account
  const handleUpdateSystemBank = (bank: SystemBankAccount) => {
    setSystemBankAccount(bank);
  };

  // Admin settles completed tour payment to company
  const handleSettleBooking = (
    bookingId: string,
    settledAmount: number,
    platformFee: number,
    targetAgencyId?: string,
    bankReference?: string,
  ) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;

        let updatedAgencies = b.bookingAgencies;
        if (targetAgencyId && updatedAgencies) {
          updatedAgencies = updatedAgencies.map((a) =>
            a.agencyId === targetAgencyId
              ? {
                  ...a,
                  settlementStatus: "PAID" as const,
                  settlementAmount: settledAmount,
                  bankReference: bankReference || `UNC-${Date.now().toString().slice(-6)}`,
                  settledAt: new Date().toISOString().split("T")[0],
                }
              : a
          );
        } else if (updatedAgencies) {
          updatedAgencies = updatedAgencies.map((a) => ({
            ...a,
            settlementStatus: "PAID" as const,
            settlementAmount: a.finalAmount - Math.round(a.finalAmount * (b.platformFeeRate || 8) / 100),
            bankReference: bankReference || `UNC-${Date.now().toString().slice(-6)}`,
            settledAt: new Date().toISOString().split("T")[0],
          }));
        }

        const allSettled = !updatedAgencies || updatedAgencies.every((a) => a.settlementStatus === "PAID");

        return {
          ...b,
          settlementStatus: allSettled ? ("settled" as const) : ("partially_settled" as any),
          settledAmount: (b.settledAmount || 0) + settledAmount,
          settledAt: new Date().toISOString().split("T")[0],
          platformFeeAmount: (b.platformFeeAmount || 0) + platformFee,
          platformFeeRate: systemBankAccount.defaultCommissionRate || 8,
          bookingAgencies: updatedAgencies,
        };
      })
    );
  };

  // Company adjusts total booking price & logs adjustment history
  const handleUpdateBookingPrice = (
    bookingId: string,
    newPrice: number,
    note?: string,
    adjustment?: Partial<BookingPriceAdjustment>,
  ) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        const originalPrice = b.originalTotalPrice ?? b.totalPrice;
        const paidAmount = (b.paymentRequests ?? [])
          .filter((pr) => pr.status === "paid")
          .reduce((sum, pr) => sum + pr.amount, 0);
        const remaining = Math.max(0, newPrice - paidAmount);
        const diff = newPrice - b.totalPrice;
        const newAdj: BookingPriceAdjustment = {
          id: adjustment?.id || `adj-${Date.now()}`,
          bookingId: b.id,
          adjustedBy: adjustment?.adjustedBy || currentUser?.name || "Công ty lữ hành",
          previousTotalPrice: b.totalPrice,
          adjustmentAmount: adjustment?.adjustmentAmount ?? diff,
          newTotalPrice: newPrice,
          reason: adjustment?.reason || note || (diff > 0 ? `Điều chỉnh tăng giá tour (+${diff.toLocaleString("vi-VN")}đ)` : `Điều chỉnh giảm giá tour (${diff.toLocaleString("vi-VN")}đ)`),
          createdAt: adjustment?.createdAt || new Date().toISOString().split("T")[0],
          paymentRequestId: adjustment?.paymentRequestId,
        };
        return {
          ...b,
          originalTotalPrice: originalPrice,
          totalPrice: newPrice,
          priceAdjustmentNote: note || newAdj.reason,
          priceAdjustedAt: new Date().toISOString().split("T")[0],
          remainingAmount: remaining,
          priceAdjustments: [...(b.priceAdjustments ?? []), newAdj],
        };
      }),
    );
  };

  // Customer pays a payment request (into System Escrow Account)
  const handlePayPaymentRequest = async (
    bookingId: string,
    paymentRequestId: string,
  ) => {
    const numericId = Number(bookingId);
    const targetBooking = bookings.find((b) => b.id === bookingId);
    const targetRequest = targetBooking?.paymentRequests?.find((pr) => pr.id === paymentRequestId);
    const payAmount = targetRequest ? targetRequest.amount : (targetBooking?.depositAmount || targetBooking?.totalPrice || 1000000);

    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const updatedDto = await depositBooking(numericId, payAmount, `PAY-${Date.now()}`);
        toast.success(`Thanh toán thành công ${payAmount.toLocaleString("vi-VN")}đ!`);
        const converted = fromApiBooking(updatedDto, tours, currentUser);
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? converted : b)));
        if (selectedUserBooking?.id === bookingId) {
          setSelectedUserBooking(converted);
        }
        return;
      } catch (err: any) {
        toast.error(err?.message || "Không thể thực hiện thanh toán lên máy chủ");
      }
    }

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== bookingId) return b;
        let found = false;
        let updatedPaymentRequests = (b.paymentRequests ?? []).map((pr) => {
          if (pr.id === paymentRequestId) {
            found = true;
            return {
              ...pr,
              status: "paid" as const,
              paidAt: new Date().toISOString().split("T")[0],
            };
          }
          return pr;
        });

        if (!found) {
          // Dynamic full payment request
          updatedPaymentRequests.push({
            id: paymentRequestId,
            bookingId: b.id,
            amount: b.totalPrice,
            description: "Thanh toán 100% qua Ký quỹ Hệ thống (Escrow)",
            dueDate: b.tourStartDate || new Date().toISOString().split("T")[0],
            status: "paid" as const,
            paidAt: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString().split("T")[0],
          });
        }

        const totalPaid = updatedPaymentRequests
          .filter((pr) => pr.status === "paid")
          .reduce((sum, pr) => sum + pr.amount, 0);
        const remaining = Math.max(0, b.totalPrice - totalPaid);
        const isFullyPaid = remaining === 0;
        const nextStatus = isFullyPaid ? ("paid" as const) : ("deposited" as const);

        return {
          ...b,
          status: b.status === "confirmed" ? (isFullyPaid ? ("paid" as const) : "confirmed") : nextStatus,
          paymentRequests: updatedPaymentRequests,
          remainingAmount: remaining,
          paymentStatus: "paid" as const,
          depositPaid: true,
          depositAmount: totalPaid,
        };
      }),
    );
  };

  // Custom tour requests
  const handleSubmitCustomTourRequest = (
    data: Omit<CustomTourRequest, "id" | "createdAt" | "status">,
  ) => {
    const req: CustomTourRequest = {
      ...data,
      id: `ctr-${Date.now()}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setCustomTourRequests((prev) => [req, ...prev]);
    setCurrentPage("home");
  };

  const handleCancelCustomTourRequest = (id: string) => {
    setCustomTourRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r)),
    );
  };

  const handleUpdateCustomTourRequest = (id: string, update: Partial<CustomTourRequest>) => {
    setCustomTourRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...update } : r)),
    );
  };

  // Company admin - tour CRUD
  const handleCompanyCreateTour = async (
    tourData: Omit<Tour, "id"> & { id?: string },
  ) => {
    if (tourData.is_request) throw new Error("Tour theo yêu cầu chưa có API tạo riêng.");
    const created = await createAgencyTour(tourData);
    const result = tourData.visibility === "public" ? await publishAgencyTour(String(created.id), created.version) : created;
    await refreshTours();
    setTourNotice(result.visibility === "public" ? "Tour đã được đăng bán." : "Bản nháp đã được lưu.");
    return fromApiTour(result);
  };

  const handleCompanyEditTour = async (
    tourId: string,
    tourData: Partial<Tour>,
  ) => {
    const current = tours.find(t => t.id === tourId);
    if (!current) throw new Error("Không tìm thấy tour.");
    if (tourData.is_request) throw new Error("Tour theo yêu cầu chưa có API chỉnh sửa riêng.");
    const visibilityOnly = Object.keys(tourData).every(key => ["status", "visibility"].includes(key));
    if (visibilityOnly) {
      if (tourData.visibility === "public") await publishAgencyTour(tourId, current.version || 1);
      else if (tourData.visibility === "hidden") await hideAgencyTour(tourId, current.version || 1, "Agency tạm ẩn tour.");
    } else {
      const updated = await updateAgencyTour(tourId, current.version || 1, { ...current, ...tourData });
      if (tourData.visibility === "public") await publishAgencyTour(tourId, updated.version);
    }
    await refreshTours();
    setTourNotice("Tour đã được cập nhật.");
  };

  const handleCompanyDeleteTour = async (tourId: string) => {
    const current = tours.find(t => t.id === tourId);
    if (!current) throw new Error("Không tìm thấy tour.");
    const version = current.visibility === "public"
      ? (await hideAgencyTour(tourId, current.version || 1, "Agency lưu trữ tour.")).version
      : current.version || 1;
    await archiveAgencyTour(tourId, version);
    await refreshTours();
    setTourNotice("Tour đã được lưu trữ.");
  };
  const handleCompanyDuplicateTour = async (tourId: string, name: string) => {
    await duplicateAgencyTour(tourId, name);
    await refreshTours();
    setTourNotice("Đã tạo bản nháp từ tour này.");
  };

  // Company Guide workforce handlers
  const handleAddGuide = (guideData: Partial<User>) => {
    const newGuide: User = {
      id: `guide-${Date.now()}`,
      name: guideData.name || "Hướng dẫn viên mới",
      email: guideData.email || `guide-${Date.now()}@tour.com`,
      phone: guideData.phone,
      role: "guide",
      companyId: guideData.companyId,
      companyName: guideData.companyName,
      licenseNumber: guideData.licenseNumber,
      licenseExpiry: guideData.licenseExpiry,
      languages: guideData.languages || ["Tiếng Việt"],
      specialties: guideData.specialties || ["Tour văn hóa", "Tour sinh thái"],
      status: guideData.status || "active",
      avatar:
        guideData.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    };
    setUsers((prev) => [...prev, newGuide]);
  };

  const handleUpdateGuide = (guideId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === guideId ? { ...u, ...updates } : u))
    );
  };

  const handleRemoveGuide = (guideId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== guideId));
  };

  // Admin moderation happens after publication; it never grants publication.
  const handleToggleHideTour = async (tourId: string, reason?: string) => {
    const current = tours.find(t => t.id === tourId);
    if (!current || current.visibility !== "public") throw new Error("Tour không còn công khai.");
    await hideModeratedTour(tourId, current.version || 1, reason?.trim() || "Thông tin tour cần được kiểm tra.");
    await refreshTours();
    setTourNotice("Tour đã được tạm ẩn để kiểm tra.");
  };

  // Departure roll call handler (Guide)
  const handleDepartureRollCall = async (
    scheduleId: string,
    passengers: BookingPassenger[]
  ) => {
    const currentSchedule = guideSchedules.find((s) => s.id === scheduleId);
    const bookingIdNum = Number(currentSchedule?.booking?.id);

    if (Number.isSafeInteger(bookingIdNum) && bookingIdNum > 0) {
      try {
        await Promise.all(
          passengers.map(async (p) => {
            const partId = Number(p.id);
            if (Number.isSafeInteger(partId) && partId > 0) {
              const status =
                p.departureAttendance === "present"
                  ? "CheckedIn"
                  : p.departureAttendance === "absent"
                  ? "Absent"
                  : "CheckedIn";
              await recordAttendance(bookingIdNum, partId, status);
            }
          })
        );
        toast.success("Đã ghi nhận điểm danh hành khách lên máy chủ!");
      } catch (err: any) {
        toast.error(err?.message || "Không thể đồng bộ điểm danh lên máy chủ");
      }
    }

    setGuideSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          return {
            ...s,
            departureRollCallCompleted: true,
            departureRollCallTime: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            booking: {
              ...s.booking,
              passengers,
            },
          };
        }
        return s;
      })
    );
  };

  // Report incident handler (Guide)
  const handleReportIncident = async (
    scheduleId: string,
    incident: Omit<IncidentReport, "id" | "reportedAt">
  ) => {
    const currentSchedule = guideSchedules.find((s) => s.id === scheduleId);
    const bookingIdNum = Number(currentSchedule?.booking?.id);

    if (Number.isSafeInteger(bookingIdNum) && bookingIdNum > 0) {
      try {
        await reportIncident(
          bookingIdNum,
          incident.category || "Operational",
          incident.location ? `[${incident.category || "Sự cố"}] Tại ${incident.location}` : `Sự cố ${incident.category || "vận hành"}`,
          incident.description,
          incident.severity === "high" ? "High" : incident.severity === "low" ? "Low" : "Medium"
        );
        toast.success("Báo cáo sự cố tour đã được gửi đến bộ phận điều hành!");
      } catch (err: any) {
        toast.error(err?.message || "Không thể gửi báo cáo sự cố lên máy chủ");
      }
    }

    setGuideSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          const newIncident: IncidentReport = {
            id: `inc-${Date.now()}`,
            reportedAt: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            ...incident,
          };
          return {
            ...s,
            incidents: [newIncident, ...(s.incidents || [])],
          };
        }
        return s;
      })
    );
  };

  // Wrap up tour handler (Guide)
  const handleWrapUpTour = (
    scheduleId: string,
    wrapUpReport: { rating: number; notes: string }
  ) => {
    setGuideSchedules((prev) =>
      prev.map((s) => {
        if (s.id === scheduleId) {
          return {
            ...s,
            wrapUpReport: {
              ...wrapUpReport,
              completedAt: new Date().toLocaleDateString("vi-VN"),
            },
          };
        }
        return s;
      })
    );
  };

  // Passenger update handler (User / Company)
  const handleUpdateBookingPassengers = (
    bookingId: string,
    updatedPassengers: BookingPassenger[]
  ) => {
    const primaryActiveCount = updatedPassengers.filter(
      (p) => p.isPrimary !== false && p.status !== "INACTIVE"
    ).length;
    const finalGuestCount = primaryActiveCount > 0 ? primaryActiveCount : updatedPassengers.length;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              passengers: updatedPassengers,
              numberOfGuests: finalGuestCount,
            }
          : b
      )
    );
    if (selectedUserBooking && selectedUserBooking.id === bookingId) {
      setSelectedUserBooking({
        ...selectedUserBooking,
        passengers: updatedPassengers,
        numberOfGuests: finalGuestCount,
      });
    }
  };

  const handleRestoreTourVersion = async (tourId: string, versionNumber: number) => {
    const currentTour = tours.find(t => t.id === tourId);
    if (!currentTour) throw new Error("Không tìm thấy tour.");
    await restoreAgencyTour(tourId, versionNumber, currentTour.version || 1);
    await refreshTours();
    setTourNotice(`Đã khôi phục v${versionNumber} thành bản nháp mới.`);
  };

  if (sessionLoading) return <div className="p-10 text-center">Đang kiểm tra phiên đăng nhập...</div>;
  if (sessionError || authError) return <div role="alert" className="p-10 text-center text-red-700">{sessionError || authError}<button className="block mx-auto mt-4 underline" onClick={() => window.location.reload()}>Thử lại</button></div>;
  if (tourLoading) return <div role="status" className="p-10 text-center text-[#075985]">Đang tải tour từ máy chủ...</div>;
  if (tourError) return <div role="alert" className="p-10 text-center text-red-700">{tourError}<button className="block mx-auto mt-4 underline" onClick={() => window.location.reload()}>Thử lại</button></div>;

  // Show register screen
  if (showRegister) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <RegisterScreen
          onRegisterSuccess={(registeredUser?: User) => {
            if (registeredUser) {
              handleLogin(registeredUser);
            } else {
              setShowRegister(false);
              setShowLogin(true);
            }
          }}
          onShowLogin={() => { setShowRegister(false); setShowLogin(true); }}
          onBack={() => setShowRegister(false)}
        />
      </div>
    );
  }

  // Show login screen
  if (showLogin) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <LoginScreen
          onLogin={handleLogin}
          onBack={() => setShowLogin(false)}
          onShowRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      </div>
    );
  }

  // For non-user roles (guide, admin, provider, company_admin), show their dashboard
  if (currentUser && currentUser.role !== "user") {
    const allGuides = users.filter((u) => u.role === "guide");
    const userGuideSchedules = guideSchedules.filter(
      (s) => s.booking.guideId === currentUser.id,
    );
    const displayedGuideSchedules =
      userGuideSchedules.length > 0 ? userGuideSchedules : guideSchedules;

    // Agency view
    if (currentUser.role === "company_admin" || currentUser.role === "agency") {
      const company = companies.find(
        (c) => c.id === currentUser.companyId,
      );
      if (company) {
        const companyGuides = users.filter(
          (u) => u.role === "guide" && u.companyId === company.id,
        );
        const companyBookings = bookings.filter(
          (b) =>
            b.companyId === company.id ||
            b.coHosts?.some((ch) => ch.companyId === company.id),
        );
        return (
          <AgencyDashboard
            currentUser={currentUser}
            company={company}
            tours={tours}
            bookings={companyBookings}
            services={services}
            guides={companyGuides}
            guideSchedules={guideSchedules}
            customTourRequests={customTourRequests}
            allCompanies={companies}
            onCreateTour={handleCompanyCreateTour}
            onEditTour={handleCompanyEditTour}
            onDeleteTour={handleCompanyDeleteTour}
            onDuplicateTour={handleCompanyDuplicateTour}
            onAddGuide={handleAddGuide}
            onUpdateGuide={handleUpdateGuide}
            onRemoveGuide={handleRemoveGuide}
            onApproveBooking={handleApproveBooking}
            onRejectBooking={handleRejectBooking}
            onAssignGuide={handleAssignGuide}
            onUpdateAssignedGuides={handleUpdateAssignedGuides}
            onCreatePaymentRequest={handleCreatePaymentRequest}
            onMarkDepositPaid={handleMarkDepositPaid}
            onMarkFullyPaid={handleMarkFullyPaid}
            onUpdateBookingPrice={handleUpdateBookingPrice}
            onUpdateBookingPassengers={handleUpdateBookingPassengers}
            onUpdateBookingAgencies={handleUpdateBookingAgencies}
            onUpdateAttractionCheckins={handleUpdateAttractionCheckins}
            onUpdateIncidents={handleUpdateIncidents}
            onUpdateCustomRequest={handleUpdateCustomTourRequest}
            onRestoreTourVersion={handleRestoreTourVersion}
            onViewTour={handleViewTour}
            onLogout={handleLogout}
          />
        );
      }
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {currentUser.role !== "admin" && currentUser.role !== "provider" && (
          <UnifiedHeader
            currentUser={currentUser}
            onShowLogin={() => setShowLogin(true)}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            currentPage={currentPage}
            
          />
        )}

        <main
          className={
            currentUser.role === "admin" || currentUser.role === "provider"
              ? "min-h-screen"
              : "w-full px-4 sm:px-6 lg:px-8 py-8 pt-24"
          }
        >
          {currentUser.role === "guide" && (
            <GuideDashboard
              schedules={displayedGuideSchedules}
              onCheckIn={handleCheckIn}
              onDepartureRollCall={handleDepartureRollCall}
              onReportIncident={handleReportIncident}
              onWrapUpTour={handleWrapUpTour}
              onUpdateNotes={(scheduleId, personalNotes, guideNotesList) => {
                setGuideSchedules((prev) =>
                  prev.map((s) =>
                    s.id === scheduleId
                      ? { ...s, personalNotes, guideNotesList }
                      : s
                  )
                );
              }}
            />
          )}

          {currentUser.role === "admin" && (
            <AdminDashboard
              currentUser={currentUser}
              tours={tours}
              bookings={bookings}
              services={services}
              guides={allGuides}
              guideSchedules={guideSchedules}
              providers={users.filter(
                (u) => u.role === "provider",
              )}
              users={users}
              companies={companies}
              onToggleHideTour={handleToggleHideTour}
              onApproveBooking={handleApproveBooking}
              onRejectBooking={handleRejectBooking}
              onAssignGuide={handleAssignGuide}
              onApproveService={handleApproveService}
              onRejectService={handleRejectService}
              onToggleHideService={handleToggleHideService}
              onDeleteService={handleDeleteService}
              onUpdateUserStatus={handleUpdateUserStatus}
              systemBank={systemBankAccount}
              onUpdateSystemBank={handleUpdateSystemBank}
              onSettleBooking={handleSettleBooking}
              onSuspendCompany={handleSuspendCompany}
              onLogout={handleLogout}
            />
          )}

          {currentUser.role === "provider" && (
            <ProviderDashboard
              currentUser={currentUser}
              services={services}
              onDeleteService={handleDeleteService}
              onSubmitService={handleSubmitService}
              onUpdateService={handleUpdateService}
              onUpdateProfile={handleUpdateProviderProfile}
              onLogout={handleLogout}
            />
          )}
        </main>

        {currentUser.role !== "admin" && currentUser.role !== "provider" && (
          <PublicFooter />
        )}
      </div>
    );
  }

  // For users (logged in or not), show public pages with navigation
  const userBookings = currentUser
    ? bookings.filter((b) => b.userId === currentUser.id)
    : [];

  return (
    <>
      <UnifiedHeader
        currentUser={currentUser}
        onShowLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentPage={currentPage}
        
      />
      <div className="pt-16">
        {currentPage === "custom-tour" ? (
          <CustomTourRequestPage
            companies={companies}
            currentUser={currentUser}
            onBack={() => handleNavigate("home")}
            onSubmit={handleSubmitCustomTourRequest}
            onShowLogin={() => setShowLogin(true)}
          />
        ) : currentPage === "booking-form" && bookingTour ? (
          <BookingFormPage
            tour={bookingTour}
            currentUser={currentUser as any}
            hasLocationCustomization={bookingCustomData?.hasLocationCustomization}
            customHotelChanges={bookingCustomData?.customHotelChanges}
            customMealChanges={bookingCustomData?.customMealChanges}
            locationChanges={bookingCustomData?.locationChanges}
            onBack={() => {
              if (selectedTour) {
                setCurrentPage("tour-detail");
              } else {
                setCurrentPage(previousPage || "home");
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onSubmit={(data) => {
              handleBookingSubmit(data);
            }}
            onViewMyBookings={() => {
              handleNavigate("my-bookings");
            }}
            onGoHome={() => {
              handleNavigate("home");
            }}
          />
        ) : currentPage === "tour-detail" && selectedTour ? (
          <TourDetailPage
            tour={selectedTour}
            services={[]}
            currentUser={currentUser}
            onBack={() => {
              setSelectedTour(null);
              setCurrentPage(previousPage || "home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onBookNow={handleOpenBookingForm}
            onShowLogin={() => setShowLogin(true)}
          />
        ) : currentPage === "home" && currentUser?.role === "user" ? (
          // Logged in user sees their dashboard on home page
          <div className="min-h-screen bg-gray-50">
            <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
              <UserDashboard
                tours={tours}
                userBookings={userBookings}
                customTourRequests={customTourRequests.filter((r) => r.userId === currentUser?.id)}
                onBookTour={handleOpenBookingForm}
                onCancelBooking={handleCancelBooking}
                onViewTour={handleViewTour}
                onCancelCustomRequest={handleCancelCustomTourRequest}
                onNavigateToCustomTourForm={() => handleNavigate("custom-tour")}
                onViewBookingDetail={handleViewUserBookingDetail}
              />
            </main>
          </div>
        ) : currentPage === "home" ? (
          // Not logged in, show public home page
          <HomePage
            onShowLogin={() => setShowLogin(true)}
            popularTours={tours.filter((t) => t.tourType !== "custom_request" && ((t.status === "completed" || t.status === "published" || !t.status) && (t.visibility === "public" || !t.visibility)))}
            onNavigate={handleNavigate}
            onViewTour={handleViewTour}
          />
        ) : currentPage === "book-tours" ? (
          <BookToursPage
            tours={tours.filter((t) => t.tourType !== "custom_request" && ((t.status === "completed" || t.status === "published" || !t.status) && (t.visibility === "public" || !t.visibility)))}
            currentUser={currentUser}
            onShowLogin={() => setShowLogin(true)}
            onBookTour={(tourId) => {
              const tour = tours.find((t) => t.id === tourId);
              if (tour) {
                handleOpenBookingForm(tour);
              }
            }}
            onViewTour={handleViewTour}
          />
        ) : currentPage === "contact" ? (
          <ContactPage onShowLogin={() => setShowLogin(true)} />
        ) : currentPage === "about" ? (
          <AboutPage onShowLogin={() => setShowLogin(true)} />
        ) : currentPage === "reviews" ? (
          <ReviewsPage onShowLogin={() => setShowLogin(true)} />
        ) : currentPage === "promotions" ? (
          <PromotionsPage />
        ) : currentPage === "messages" ? (
          <MessagesPage />
        ) : currentPage === "wishlist" ? (
          <WishlistPage />
        ) : currentPage === "my-reviews" ? (
          <MyReviewsPage />
        ) : currentPage === "notifications" ? (
          <NotificationsPage />
        ) : currentPage === "help-center" ? (
          <HelpCenterPage />
        ) : currentPage === "my-bookings" ? (
          <MyBookings
            bookings={userBookings}
            onCancelBooking={handleCancelBooking}
            onViewBookingDetail={handleViewUserBookingDetail}
          />
        ) : currentPage === "user-booking-detail" && selectedUserBooking ? (
          <UserBookingDetailPage
            booking={
              bookings.find((b) => b.id === selectedUserBooking.id) ||
              selectedUserBooking
            }
            systemBank={systemBankAccount}
            onBack={() => {
              setSelectedUserBooking(null);
              setCurrentPage("my-bookings");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onCancelBooking={handleCancelBooking}
            onPayPaymentRequest={handlePayPaymentRequest}
            onUpdateBookingPassengers={handleUpdateBookingPassengers}
          />
        ) : currentPage === "user-profile" ? (
          <UserProfile />
        ) : null}
      </div>
      <PublicFooter />

      {/* AI Tour Recommender Modal for Customers & Businesses */}
      {showAIAdvisor && (
        <AITourRecommenderModal
          isOpen={showAIAdvisor}
          onClose={() => setShowAIAdvisor(false)}
          tours={tours}
          onSelectTour={handleViewTour}
          onBookTour={handleOpenBookingForm}
        />
      )}
    </>
  );
}

export default App;
