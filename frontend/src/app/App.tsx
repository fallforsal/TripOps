import { ChatTourPage } from "@/app/components/chat/ChatTourPage";
import { getAllAgencyGuides } from "@/app/services/agencyGuides";
import { http } from "@/app/lib/http";
import { completeAgencyTour } from "@/app/services/wf02Tours";
import { requestAgencies, customerDesignRequests, agencyDesignRequests, submitDesignRequest,
  cancelDesignRequest, actOnDesignRequest, saveDesignTour, customerRequestPlans } from "@/app/services/customTourRequests";
import { toast } from "@/app/lib/notifications";
import { fetchServicePosts, createServicePost, updateServicePost, deleteServicePost,
  approveServicePost, rejectServicePost, toggleServicePost, setServiceAvailability } from "@/app/services/servicePosts";
import { ServiceCatalogueProvider } from "@/app/contexts/ServiceCatalogue";
import { SignContractPage } from "@/app/components/sign/SignContractPage";
import { parseSignRoute } from "@/app/services/contractSigning";
import { companyFromUser } from "@/app/services/authService";
import {
  agencyTours,
  archiveAgencyTour,
  createAgencyTour,
  duplicateAgencyTour,
  fromApiTour,
  fromConfiguration,
  getPublicTour,
  hideAgencyTour,
  hideModeratedTour,
  moderationTours,
  publicTours,
  publishAgencyTour,
  updateAgencyTour,
} from "@/app/services/wf02Tours";
import {
  assignGuide,
  cancelBooking,
  createBooking,
  decideBooking,
  depositBooking,
  fromApiBooking,
  getAgencyBookingDetail,
  getAgencyBookings,
  getBookingDetail,
  getCustomerBookings,
  getGuideBookingDetail,
  getGuideBookings,
  recordAttendance,
  reportIncident,
  BookingDto,
  getAllBookingDetails,
  getAvailableGuides,
  isPayOsUrl,
  startPayOsPayment,
  syncPayOsPayment,
  requestCancellation,
  updateRefundAccount,
  agencyCancelBooking,
  getAdminRefunds,
  approveAdminRefund,
  rejectAdminRefund,
  getPayoutAccount,
  payoutAdminRefund,
  syncAdminPayout,
  type PayoutAccountDto,
  fromAdminRefund,
  uploadSignedContract,
  reviewContract,
  startSignSession,
  type SignSessionStartDto,
  type RefundAccountInput,
  type CancellationReason,
} from "@/app/services/wf05Bookings";
import type { PaymentOutcome } from "@/app/services/payos";

interface PaymentCheckState {
  bookingId: string;
  phase: "checking" | PaymentOutcome | "error";
  message: string;
  attempts: number;
}
import { useAuth } from "@/app/contexts/AuthContext";
import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";
import { useState, useEffect, useRef } from "react";
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
import {
  BookingFormPage,
  BookingSubmitData,
} from "@/app/components/user/BookingFormPage";
import { CustomTourRequestPage } from "@/app/components/user/CustomTourRequestPage";
import { UserBookingDetailPage } from "@/app/components/user/UserBookingDetailPage";
import { AITourRecommenderModal } from "@/app/components/ai/AITourRecommenderModal";
import { CustomerHeader } from "@/app/components/customer/CustomerHeader";
import { CustomerFooter } from "@/app/components/customer/CustomerFooter";
import {
  emptyTourSearch,
  type TourSearchCriteria,
} from "@/app/components/customer/tour-search";
import { useHistoryScroll } from "@/app/components/customer/useHistoryScroll";
import { MyRequestsPage } from "@/app/components/customer/MyRequestsPage";
import { MyComplaintsPage } from "@/app/components/customer/MyComplaintsPage";
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
  ProviderGroupReservationRequest,
  CustomTourRequest,
  CustomHotelChange,
  CustomMealChange,
  CustomLocationChange,
  SystemBankAccount,
  TourVersion,
  BookingPriceAdjustment,
  BookingAgencyShare,
  BookingAssignedGuide,
  BookingAttractionCheckin,
  BookingIncident,
  RefundRequest,
  RefundReasonType,
} from "@/app/types";
import {
  mockTours,
  mockBookings,
  mockServices,
  mockGuideSchedules,
  mockRoomBookings,
  mockUsers,
  mockTourCompanies,
  mockCustomTourRequests,
  defaultSystemBankAccount,
  mockComplaints,
} from "@/app/data/mockData";
import { mockRefundRequests } from "@/app/data/mockRefundRequests";
import { mockProviderGroupRequests } from "@/app/data/mockProviderGroupRequests";

function Application() {
  const {
    user: currentUser,
    setUser: setCurrentUser,
    loading: sessionLoading,
    error: authError,
    signOut,
  } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [previousPage, setPreviousPage] = useState<string>("home");
  const [tours, setTours] = useState<Tour[]>([]);
  const [toursLoaded, setToursLoaded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [guideSchedules, setGuideSchedules] = useState<GuideSchedule[]>([]);
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<TourCompany[]>([]);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [selectedUserBooking, setSelectedUserBooking] =
    useState<Booking | null>(null);
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  const [bookingCustomData, setBookingCustomData] = useState<{
    customHotelChanges?: CustomHotelChange[];
    customMealChanges?: CustomMealChange[];
    locationChanges?: CustomLocationChange[];
    hasLocationCustomization?: boolean;
  } | null>(null);
  const [providerGroupRequests, setProviderGroupRequests] = useState<
    ProviderGroupReservationRequest[]
  >([]);
  const [sourceDesignTour, setSourceDesignTour] = useState<Tour | undefined>();
  const [customTourRequests, setCustomTourRequests] = useState<
    CustomTourRequest[]
  >([]);
  // Booking được chọn sẵn khi mở "Gửi khiếu nại" từ chi tiết booking hoặc từ đánh giá 1–2 sao.
  const [complaintBookingId, setComplaintBookingId] = useState<number | null>(null);
  const [systemBankAccount, setSystemBankAccount] = useState<SystemBankAccount>(
    defaultSystemBankAccount,
  );
  const [showAIAdvisor, setShowAIAdvisor] = useState(false);
  const [tourSearch, setTourSearch] =
    useState<TourSearchCriteria>(emptyTourSearch);

  const [bookingReload, setBookingReload] = useState(0);
  const [tourNotice, setTourNotice] = useState("");
  const [availableGuides, setAvailableGuides] = useState<User[]>([]);
  const [apiError, setApiError] = useState("");
  const [sessionError, setSessionError] = useState("");
  async function refreshTours() {
    const publicItems = await publicTours();
    const privateItems =
      currentUser?.role === "agency"
        ? await agencyTours()
        : currentUser?.role === "admin"
          ? await moderationTours()
          : [];
    const byId = new Map<string, Tour>();
    for (const tour of publicItems) byId.set(tour.id, tour);
    for (const tour of privateItems) byId.set(tour.id, tour);
    setTours([...byId.values()]);
  }
  const handleCompanyDuplicateTour = async (tourId: string, name: string) => {
    await duplicateAgencyTour(tourId, name);
    await refreshTours();
    setTourNotice("Đã tạo bản nháp từ tour này.");
  };
  useEffect(() => {
    if (tourNotice) {
      toast.success(tourNotice);
      setTourNotice("");
    }
  }, [tourNotice]);
  useEffect(() => {
    let active = true;
    refreshTours().then(() => refreshCustomRequests()).catch((e) => active && setApiError(e.message))
      .finally(() => active && setToursLoaded(true));
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role]);
  useEffect(() => {
    setUsers(currentUser ? [currentUser] : []);
  }, [currentUser]);
  useEffect(() => {
    let active = true;
    requestAgencies().then((rows) => { if (active) setCompanies(rows); })
      .catch((e) => { if (active) setApiError(e.message); });
    return () => { active = false; };
  }, []);
  //để company (trạng thái, logo) theo kịp currentUser sau khi lưu hồ sơ doanh nghiệp.
  useEffect(() => {
  if (currentUser?.role !== "agency") return;
  setCompanies((previous) => [
    ...previous.filter((item) => item.id !== currentUser.id),
    companyFromUser(currentUser),
  ]);
}, [currentUser]);

  async function refreshCustomRequests() {
    if (currentUser?.role === "agency") {
      setCustomTourRequests(await agencyDesignRequests());
    } else if (currentUser?.role === "user") {
      const requests = await customerDesignRequests();
      setCustomTourRequests(requests);
      const privateTours = (await Promise.all(requests.filter((r) => r.designedTourId)
        .map((r) => customerRequestPlans(r.id)))).flat();
      setTours((previous) => {
        const byId = new Map(previous.map((tour) => [tour.id, tour]));
        for (const tour of [...privateTours].reverse()) byId.set(tour.id, tour);
        return [...byId.values()];
      });
    } else setCustomTourRequests([]);
  }
  useEffect(() => {
    let active = true;
    setBookings([]);
    setGuideSchedules([]);
    setAvailableGuides([]);
    const role = currentUser?.role;
    if (role !== "user" && role !== "agency" && role !== "guide") return;
    Promise.all([
      getAllBookingDetails(role),
      role === "agency" ? getAllAgencyGuides() : Promise.resolve([]),
    ])
      .then(([details, guides]) => {
        if (!active) return;
        const rows = details.map((d) => fromApiBooking(d, tours, currentUser));
        setBookings(rows);
        const mapped = guides.map((g) => ({
          ...g,
          role: "guide" as const,
          companyId: currentUser?.id,
        }));
        setAvailableGuides(mapped.filter(g => g.guideStatus !== "inactive"));
        setUsers((previous) => [
          ...previous.filter((u) => u.role !== "guide"),
          ...mapped,
        ]);
        if (role === "guide")
          setGuideSchedules(
            rows.map((b) => ({
              id: "schedule-" + b.id,
              booking: b,
              completedLocations: b.tour.itinerary.flatMap((d) =>
                d.locations.filter((l) => l.checkedIn).map((l) => l.id),
              ),
              departureRollCallCompleted:
                !!b.passengers?.length &&
                b.passengers.every((p) => p.attendanceStatus !== "PENDING"),
              incidents: b.guideIncidents || [],
            })),
          );
      })
      .catch((e) => active && setApiError(e.message));
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role, tours, bookingReload]);
  useEffect(() => {
    if (apiError || authError || sessionError)
      toast.error(apiError || authError || sessionError);
  }, [apiError, authError, sessionError]);

  useEffect(() => {
    let active = true;
    setServices([]);
    const load = () => {
      if (currentUser?.role === "provider" && currentUser.businessProfile?.status !== "approved") return;
      fetchServicePosts(currentUser?.role)
        .then((items) => { if (active) setServices(items); })
        .catch((e) => { if (active) setApiError(e.message); });
    };
    load();
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, [currentUser?.id, currentUser?.role, currentUser?.businessProfile?.status]);
  useEffect(() => {
    const error = (event: PromiseRejectionEvent) => {
      toast.error(
        event.reason instanceof Error
          ? event.reason.message
          : "Thao tác không thành công",
      );
    };
    window.addEventListener("unhandledrejection", error);
    return () => window.removeEventListener("unhandledrejection", error);
  }, []);
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setUsers((previous) => [
      ...previous.filter((item) => item.id !== user.id),
      user,
    ]);
    if (user.role === "agency")
      setCompanies((previous) => [
        ...previous.filter((item) => item.id !== user.id),
        companyFromUser(user),
      ]);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Không thể đăng xuất");
      return;
    }
    setUsers([]);
    setCompanies([]);
    setCurrentUser(null);
    setShowLogin(false);
    setShowRegister(false);
    setSelectedUserBooking(null);
    setSelectedTour(null);
    setBookingTour(null);
    setCurrentPage("home");
    // Đăng xuất ở bất kỳ vai trò nào cũng về trang chủ ngay; thay địa chỉ (không thêm lịch sử) để nút Back không mở lại trang cần đăng nhập.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/`);
    window.scrollTo({ top: 0 });
  };

  const { navigateForward, restoreHistoryPosition, goBack } =
    useHistoryScroll();


  // URL Hash Sync for direct testing and browser back/forward
  useEffect(() => {
    const handleUrlChange = () => {
      restoreHistoryPosition();
      const [rawHash, query = ""] = window.location.hash
        .replace(/^#\/?/, "")
        .split("?");

      if (!rawHash || rawHash === "" || rawHash === "home") {
        setCurrentPage("home");
        setSelectedTour(null);
        setSelectedUserBooking(null);
      } else if (rawHash === "tours" || rawHash === "book-tours") {
        const params = new URLSearchParams(query);
        const requestedGuests = params.get("guests") || "";
        const requestedDate = params.get("date") || "";
        setTourSearch({
          destination: params.get("destination") || "",
          departureDate: /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
            ? requestedDate
            : "",
          guests: /^[1-9]\d*$/.test(requestedGuests) ? requestedGuests : "",
        });
        setCurrentPage("book-tours");
        setSelectedTour(null);
      } else if (rawHash.startsWith("tours/")) {
        const tourId = rawHash.replace("tours/", "");
        const found = tours.find(
          (t) => t.id === tourId || t.tourCode === tourId,
        );
        if (found) {
          setSelectedTour(found);
          setCurrentPage("tour-detail");
        }
      } else if (rawHash.startsWith("booking/")) {
        const tourId = rawHash.replace("booking/", "");
        const params = new URLSearchParams(query);
        const requestId=params.get("requestId"), version=Number(params.get("version"));
        if(requestId && version>0) {
          setBookingTour(null);
          const expectedHash=window.location.hash;
          void customerRequestPlans(requestId).then(plans=>{
            if(window.location.hash!==expectedHash)return;
            const selected=plans.find(p=>p.id===tourId && p.version===version);
            if(!selected){toast.error("Phiên bản này chưa được Agency cho phép đặt.");return;}
            setBookingTour(selected);setCurrentPage("booking-form");
          }).catch(e=>toast.error(e instanceof Error?e.message:"Không tải được phiên bản tour."));
          return;
        }
        const found = tours.find(
          (t) => t.id === tourId || t.tourCode === tourId,
        );
        if (found) {
          setBookingTour(found);
          setCurrentPage("booking-form");
        }
      } else if (rawHash === "my-bookings") {
        setCurrentPage("my-bookings");
        setSelectedUserBooking(null);
      } else if (rawHash.startsWith("my-bookings/")) {
        // "my-bookings/{id}" hoặc "my-bookings/{id}/payos" (quay về từ payOS).
        const bId = rawHash.replace("my-bookings/", "").split("/")[0];
        const foundB = bookings.find((b) => b.id === bId);
        if (foundB) {
          setSelectedUserBooking(foundB);
          setCurrentPage("user-booking-detail");
        } else {
          const numId = Number(bId);
          if (Number.isSafeInteger(numId) && numId > 0) {
            setCurrentPage("user-booking-detail");
            getBookingDetail(numId)
              .then((dto) => {
                const converted = fromApiBooking(dto, tours, currentUser);
                setSelectedUserBooking(converted);
              })
              .catch(() => {
                if (bookings.length > 0) {
                  toast.error("Không tìm thấy đơn đặt tour.");
                  setCurrentPage("my-bookings");
                }
              });
          }
        }
      } else if (rawHash === "custom-tour") {
        setCurrentPage("custom-tour");
      } else if (rawHash === "my-requests") {
        setCurrentPage("my-requests");
      } else if (rawHash === "my-complaints") {
        setCurrentPage("my-complaints");
      } else if (rawHash === "messages") {
        setCurrentPage("messages");
      } else if (rawHash === "my-reviews") {
        setCurrentPage("my-reviews");
      } else if (rawHash === "user-profile" || rawHash === "account") {
        setCurrentPage("user-profile");
      }
    };

    handleUrlChange();
    window.addEventListener("hashchange", handleUrlChange);
    return () => window.removeEventListener("hashchange", handleUrlChange);
  }, [tours, bookings, restoreHistoryPosition]);

  // ------------------------------------------------------------ payOS
  // Kết quả thanh toán chỉ lấy từ backend (backend tra cứu payOS và xác minh chữ ký),
  // không dựa vào tham số trên URL quay về.
  const [paymentCheck, setPaymentCheck] = useState<PaymentCheckState | null>(null);
  const paymentPollTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(paymentPollTimer.current), []);

  const checkPayment = async (bookingId: string): Promise<PaymentOutcome | "error"> => {
    setPaymentCheck((prev) => ({
      bookingId,
      phase: "checking",
      message: "Đang xác nhận kết quả với payOS...",
      attempts: prev?.bookingId === bookingId ? prev.attempts : 0,
    }));
    try {
      const result = await syncPayOsPayment(Number(bookingId));
      const converted = fromApiBooking(result.booking, tours, currentUser);
      setBookings((prev) => prev.map((b) => (b.id === converted.id ? converted : b)));
      setSelectedUserBooking((prev) => (prev?.id === converted.id ? converted : prev));
      setPaymentCheck((prev) => ({
        bookingId,
        phase: result.outcome,
        message: result.message,
        attempts: (prev?.bookingId === bookingId ? prev.attempts : 0) + 1,
      }));
      return result.outcome;
    } catch (err) {
      setPaymentCheck((prev) => ({
        bookingId,
        phase: "error",
        message: err instanceof Error ? err.message : "Không kiểm tra được trạng thái thanh toán.",
        attempts: (prev?.bookingId === bookingId ? prev.attempts : 0) + 1,
      }));
      return "error";
    }
  };

  // Sau khi quay về từ payOS: kiểm tra ngay, nếu payOS còn "đang chờ" thì kiểm tra lại tối đa 6 lần, mỗi lần cách 5 giây.
  const autoCheckPayment = (bookingId: string) => {
    window.clearTimeout(paymentPollTimer.current);
    let attempts = 0;
    const run = async () => {
      attempts++;
      const outcome = await checkPayment(bookingId);
      if (outcome === "paid") toast.success("payOS đã xác nhận nhận tiền cọc.");
      if (outcome === "pending" && attempts < 6)
        paymentPollTimer.current = window.setTimeout(run, 5000);
    };
    void run();
  };

  const handledPaymentReturn = useRef<string | null>(null);
  useEffect(() => {
    if (currentUser?.role !== "user" || bookings.length === 0) return;
    const route = window.location.hash.replace(/^#\/?/, "").split("?")[0];
    const match = /^my-bookings\/([^/]+)\/payos$/.exec(route);
    if (!match || handledPaymentReturn.current === window.location.hash) return;
    handledPaymentReturn.current = window.location.hash;
    // Bỏ đoạn "/payos" khỏi URL để tải lại trang không kiểm tra lặp.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#/my-bookings/${match[1]}`);
    autoCheckPayment(match[1]);
  }, [currentUser?.role, bookings]);

  const handleNavigate = (page: string, criteria?: TourSearchCriteria, designSource?: Tour) => {
    if (page === "custom-tour") setSourceDesignTour(designSource);
    navigateForward(() => {
      setCurrentPage(page);
      setSelectedTour(null);
      setSelectedUserBooking(null);
      setComplaintBookingId(null);
      const params = new URLSearchParams();
      if (page === "book-tours") {
        const search = criteria || emptyTourSearch;
        setTourSearch(search);
        if (search.destination) params.set("destination", search.destination);
        if (search.departureDate) params.set("date", search.departureDate);
        if (search.guests) params.set("guests", search.guests);
      }
      const targetHash =
        page === "home"
          ? ""
          : `#/${page === "book-tours" ? "tours" : page}${params.size ? `?${params}` : ""}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    });
  };

  const handleViewUserBookingDetail = async (booking: Booking) => {
    const detailHash = `#/my-bookings/${encodeURIComponent(booking.id)}`;
    navigateForward(() => {
      setSelectedUserBooking(booking);
      setCurrentPage("user-booking-detail");
      if (window.location.hash !== detailHash) window.location.hash = detailHash;
    });
    const numericId = Number(booking.id);
    if (Number.isSafeInteger(numericId) && numericId > 0) {
      try {
        const detail = await getBookingDetail(numericId);
        const converted = fromApiBooking(detail, tours, currentUser);
        // Do not reopen the detail if the user returned to the list meanwhile.
        if (window.location.hash === detailHash) setSelectedUserBooking(converted);
        setBookings((prev) =>
          prev.map((b) => (b.id === booking.id ? converted : b)),
        );
      } catch (err) {
        console.error("Failed to fetch fresh booking detail", err);
        if (window.location.hash === detailHash)
          toast.error(err instanceof Error ? err.message : "Không thể tải thông tin đơn đặt tour.");
      }
    }
  };

  const handleViewTour = (tour: Tour) => {
    setPreviousPage(currentPage);
    setSelectedTour(tour);
    setCurrentPage("tour-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (tour.visibility === "public") {
      void getPublicTour(tour.id)
        .then((latest) =>
          setSelectedTour(
            fromConfiguration(
              latest.id,
              latest.code,
              latest.version,
              latest.configuration,
              { agencyId: latest.agencyId, agency: latest.agency },
            ),
          ),
        )
        .catch((error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "Không tải được chi tiết tour.",
          ),
        );
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
    navigateForward(() => {
      setBookingTour(tour);
      setBookingCustomData(customData ?? null);
      setCurrentPage("booking-form");
      window.location.hash = `#/booking/${tour.id}${tour.is_request && tour.customRequestId ? `?requestId=${tour.customRequestId}&version=${tour.version}` : ""}`;
    });
  };

  const handleBookingSubmit = async (data: BookingSubmitData) => {
    if (!currentUser) throw new Error("Vui lòng đăng nhập trước khi đặt tour.");
    const tourId = Number(data.tourId);
    if (!Number.isSafeInteger(tourId) || tourId <= 0)
      throw new Error("Mã tour không hợp lệ.");
    const dto = await createBooking({
      tourId,
      tourVersion: bookingTour?.version,
      tourRevision: bookingTour?.revision,
      startDate: `${data.tourStartDate}T00:00:00`,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      contactEmail: data.contactEmail,
      specialRequests: data.bookingNotes,
      hotelChoices: (data.customHotelChanges || []).map((h) => ({
        destination: h.destination,
        name: h.newHotelName,
        serviceId:
          h.serviceId && /^\d+$/.test(h.serviceId)
            ? Number(h.serviceId)
            : undefined,
      })),
      mealChoices: (data.customMealChanges || []).map((m) => ({
        dayNumber: m.dayNumber,
        mealType: m.mealType,
        name: m.newMealName,
        serviceId:
          m.serviceId && /^\d+$/.test(m.serviceId)
            ? Number(m.serviceId)
            : undefined,
      })),
      participants: data.passengers.map((p) => ({
        fullName: p.fullName,
        phoneNumber: p.phone?.trim() || undefined,
        note: p.notes,
        roommateNote: p.roommateNote || p.roomingPreference,
        restaurantNote: p.dietaryNote,
        dateOfBirth: p.dateOfBirth ? `${p.dateOfBirth}T00:00:00` : undefined,
        gender: p.gender === "female" ? "Nữ" : "Nam",
        identityNumber: p.idNumber || undefined,
      })),
    });
    const booking = fromApiBooking(dto, tours, currentUser);
    setBookings((prev) => [
      booking,
      ...prev.filter((b) => b.id !== booking.id),
    ]);
    toast.success(`Đặt tour thành công! Mã đơn: ${dto.bookingCode}`);
  };

  // User actions
  const handleBookTour = (tourId: string, _guests: number, _date: string) => {
    const tour = tours.find((t) => t.id === tourId);
    if (tour) handleOpenBookingForm(tour);
  };

  const handleCancelBooking = async (bookingId: string, reason?: string) => {
    try {
      const updated = fromApiBooking(
        await cancelBooking(
          Number(bookingId),
          reason || "Khách hàng yêu cầu hủy đơn",
        ),
        tours,
        currentUser,
      );
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      if (selectedUserBooking?.id === bookingId) setSelectedUserBooking(updated);
      toast.success("Đã hủy đơn đặt tour trên máy chủ.");
    } catch (err) {
      // Ví dụ: đơn đã có tiền (409) — máy chủ không cho tự hủy.
      toast.error(err instanceof Error ? err.message : "Không thể hủy đơn đặt tour.");
    }
  };

  /** Cập nhật một đơn trong danh sách và trang chi tiết đang mở sau khi máy chủ trả về dữ liệu mới. */
  const applyServerBooking = (dto: BookingDto) => {
    const updated = fromApiBooking(dto, tours, currentUser);
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedUserBooking((current) => (current?.id === updated.id ? updated : current));
    return updated;
  };

  /** Khách gửi yêu cầu hủy cho đơn đã thanh toán. Phí và số hoàn do máy chủ tính; đơn chỉ hủy khi Admin duyệt. */
  const handleCreateRefundRequest = async (data: {
    bookingId: string;
    reason: RefundReasonType;
    reasonDetail: string;
    refundBankName: string;
    refundAccountNumber: string;
    refundAccountHolder: string;
  }): Promise<boolean> => {
    try {
      applyServerBooking(
        await requestCancellation(Number(data.bookingId), {
          reason: data.reason as CancellationReason,
          reasonDetail: data.reasonDetail,
          bankName: data.refundAccountNumber ? data.refundBankName : undefined,
          accountNumber: data.refundAccountNumber || undefined,
          accountHolder: data.refundAccountNumber ? data.refundAccountHolder : undefined,
        }),
      );
      toast.success("Đã gửi yêu cầu hủy. Đơn sẽ được hủy và hoàn tiền sau khi Admin duyệt.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không gửi được yêu cầu hủy.");
      return false;
    }
  };

  const handleUpdateRefundAccount = async (bookingId: string, input: RefundAccountInput): Promise<boolean> => {
    try {
      applyServerBooking(await updateRefundAccount(Number(bookingId), input));
      toast.success("Đã lưu tài khoản nhận hoàn tiền.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được tài khoản nhận hoàn tiền.");
      return false;
    }
  };

  /** Khách tải bản hợp đồng đã ký; ký xong mới mở thanh toán đợt đầu. */
  const handleUploadSignedContract = async (bookingId: string, file: File): Promise<boolean> => {
    try {
      applyServerBooking(await uploadSignedContract(Number(bookingId), file));
      toast.success("Đã tải bản hợp đồng đã ký. Bạn có thể thanh toán.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải được bản hợp đồng đã ký.");
      return false;
    }
  };

  /** Khách bắt đầu ký trực tuyến: tạo mã một lần để hiện QR (mã cũ hết hiệu lực). */
  const handleStartWebSign = async (bookingId: string): Promise<SignSessionStartDto | null> => {
    try {
      return await startSignSession(Number(bookingId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tạo được mã ký hợp đồng.");
      return null;
    }
  };

  /** Hỏi lại máy chủ trạng thái đơn (khi đang chờ khách ký trên điện thoại). Trả về hợp đồng mới nhất. */
  const handleRefreshContract = async (bookingId: string) => {
    try {
      return applyServerBooking(await getBookingDetail(Number(bookingId))).travelContract ?? null;
    } catch {
      return null;
    }
  };

  const handleReviewContract = async (bookingId: string, decision: "verify" | "resign", note?: string): Promise<boolean> => {
    try {
      applyServerBooking(await reviewContract(Number(bookingId), decision, note));
      toast.success(decision === "verify" ? "Đã xác nhận hợp đồng hợp lệ." : "Đã yêu cầu khách ký lại hợp đồng.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không cập nhật được hợp đồng.");
      return false;
    }
  };

  /** Agency hủy đơn: chưa có tiền thì hủy ngay; đã có tiền thì gửi yêu cầu chờ Admin duyệt. */
  const handleAgencyCancelBooking = async (bookingId: string, reason: string): Promise<boolean> => {
    try {
      const updated = applyServerBooking(await agencyCancelBooking(Number(bookingId), reason));
      toast.success(
        updated.status === "cancelled"
          ? "Đã hủy đơn đặt tour."
          : "Đã gửi yêu cầu hủy. Đơn sẽ được hủy sau khi Admin duyệt và hoàn tiền cho khách.",
      );
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không hủy được đơn.");
      return false;
    }
  };

  const [payoutAccount, setPayoutAccount] = useState<PayoutAccountDto | null>(null);

  const loadAdminRefunds = async () => {
    try {
      const rows = (await getAdminRefunds()).map(fromAdminRefund);
      setRefundRequests(rows);
      setPayoutAccount(await getPayoutAccount().catch(() => null));
      return rows;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải được danh sách yêu cầu hoàn tiền.");
      return [];
    }
  };

  useEffect(() => {
    if (currentUser?.role !== "admin") {
      setRefundRequests([]);
      return;
    }
    void (async () => {
      // Lệnh chi hộ còn đang chạy: hỏi payOS kết quả thật ngay khi mở trang.
      const rows = await loadAdminRefunds();
      const running = rows.filter((r) => r.status === "APPROVED");
      if (running.length === 0) return;
      await Promise.allSettled(running.map((r) => syncAdminPayout(Number(r.id))));
      await loadAdminRefunds();
    })();
  }, [currentUser?.role]);

  /** Duyệt và hoàn tự động qua chi hộ payOS. Đơn chỉ hủy khi payOS báo thành công. */
  const handlePayoutRefund = async (refundId: string, refundAmount: number, note?: string): Promise<boolean> => {
    try {
      const result = await payoutAdminRefund(Number(refundId), { refundAmount, note });
      toast.success(
        result.status === "Completed"
          ? "payOS đã chuyển tiền thành công. Đơn đã chuyển sang Đã hủy."
          : "Đã gửi lệnh chi cho payOS. Bấm \"Kiểm tra chi hộ\" sau ít phút để cập nhật kết quả.",
      );
      await loadAdminRefunds();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không chi hộ được qua payOS.");
      await loadAdminRefunds();
      return false;
    }
  };

  const handleSyncPayout = async (refundId: string) => {
    try {
      const result = await syncAdminPayout(Number(refundId));
      if (result.status === "Completed") toast.success("payOS đã chuyển tiền thành công. Đơn đã chuyển sang Đã hủy.");
      else if (result.status === "Pending") toast.error(result.lastPayoutError || "Lệnh chi không thành công, yêu cầu đã trở lại chờ duyệt.");
      else toast.info("payOS vẫn đang xử lý lệnh chi. Vui lòng kiểm tra lại sau.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không kiểm tra được lệnh chi.");
    }
    await loadAdminRefunds();
  };

  const handleApproveRefund = async (
    refundId: string,
    bankTransactionCode: string,
    note?: string,
    refundAmount?: number,
  ): Promise<boolean> => {
    const target = refundRequests.find((r) => r.id === refundId);
    try {
      await approveAdminRefund(Number(refundId), {
        refundAmount: refundAmount ?? target?.suggestedRefundAmount ?? target?.approvedRefundAmount ?? 0,
        transactionCode: bankTransactionCode || undefined,
        note,
      });
      toast.success("Đã duyệt yêu cầu: đơn đã chuyển sang Đã hủy.");
      await loadAdminRefunds();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không duyệt được yêu cầu.");
      return false;
    }
  };

  const handleRejectRefund = async (refundId: string, reason: string) => {
    try {
      await rejectAdminRefund(Number(refundId), reason);
      toast.success("Đã từ chối yêu cầu hủy. Đơn giữ nguyên trạng thái.");
      await loadAdminRefunds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không từ chối được yêu cầu.");
    }
  };

  const handleReviewRefund = (..._args: any[]) => {
    toast.info("Yêu cầu chỉ cần duyệt hoặc từ chối; không có bước kiểm tra riêng.");
  };

  const handleRejectBooking = async (bookingId: string, reason?: string) => {
    const updated = fromApiBooking(
      await decideBooking(Number(bookingId), "reject", reason),
      tours,
      currentUser,
    );
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    toast.success("Đã từ chối đơn đặt tour trên máy chủ.");
  };

  const handleApproveAndQuoteProviderRequest = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleRejectProviderRequest = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Guide actions
  const handleCheckIn = async (
    scheduleId: string,
    locationId: string,
    _image?: string,
    note?: string,
  ) => {
    const schedule = guideSchedules.find((s) => s.id === scheduleId);
    if (!schedule) throw new Error("Không tìm thấy lịch");
    const dto = await http<BookingDto>(
      "/guide/bookings/" +
        schedule.booking.id +
        "/locations/" +
        locationId +
        "/check-in",
      { method: "POST", body: JSON.stringify({ status: "CheckedIn", note }) },
    );
    const booking = fromApiBooking(dto, tours, currentUser);
    setGuideSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              booking,
              completedLocations: [
                ...new Set([...s.completedLocations, locationId]),
              ],
            }
          : s,
      ),
    );
    toast.success("Đã lưu check-in điểm tham quan");
  };

  // Admin / Company actions
  const handleApproveBooking = async (bookingId: string) => {
    try {
      const updated = fromApiBooking(
        await decideBooking(Number(bookingId), "approve"),
        tours,
        currentUser,
      );
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      toast.success("Đã xác nhận đơn đặt tour trên máy chủ.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không duyệt được đơn. Vui lòng thử lại.");
      return false;
    }
  };

  const handleUpdateBookingAgencies = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleUpdateAttractionCheckins = async (bookingId:string,checkins:BookingAttractionCheckin[]) => {
    const groups=new Map<string,string[]>();
    for(const row of checkins.filter(c=>c.agencyId===currentUser?.id))groups.set(row.bookingTimelineAttractionId,[...(groups.get(row.bookingTimelineAttractionId)||[]),row.guideId]);
    const current=bookings.find(b=>b.id===bookingId);
    const locations=(current?.tour.itinerary||[]).flatMap(d=>d.locations.filter(l=>(l.createdByCompanyId||current?.companyId)===currentUser?.id).map(l=>({locationId:Number(l.id),guideIds:groups.get(l.id)||[]})));
    const dto=await http<BookingDto>(`/agency/bookings/${bookingId}/guide-routing`,{method:"PUT",body:JSON.stringify({locations})});
    setBookings(previous=>previous.map(b=>b.id===bookingId?fromApiBooking(dto,tours,currentUser):b));
  };

  const handleUpdateIncidents = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleMarkDepositPaid = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleMarkFullyPaid = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleAssignGuide = async (
    bookingId: string,
    guideId: string,
    role = "Lead",
    notes?: string,
  ) => {
    const updated = fromApiBooking(
      await assignGuide(Number(bookingId), guideId, role, notes),
      tours,
      currentUser,
    );
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
    toast.success("Đã phân công hướng dẫn viên trên máy chủ.");
  };

  const handleUpdateAssignedGuides = async (
    bookingId: string,
    updatedGuides: BookingAssignedGuide[],
  ) => {
    const current = bookings.find((b) => b.id === bookingId);
    if (!current) throw new Error("Không tìm thấy booking");
    for (const g of current.assignedGuides || [])
      if (g.companyId===currentUser?.id && !updatedGuides.some((x) => x.guideId === g.guideId))
        await http(
          "/bookings/" + bookingId + "/guide-assignments/" + g.guideId,
          { method: "DELETE" },
        );
    for (const g of updatedGuides.filter(g=>g.companyId===currentUser?.id))
      await assignGuide(
        Number(bookingId),
        g.guideId,
        g.role || "lead_guide",
        g.notes,
      );
    setBookingReload((v) => v + 1);
    toast.success("Đã lưu phân công HDV");
  };

  const handleCreateTour = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleEditTour = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleDeleteTour = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Provider actions
  const [showCreateServiceForm, setShowCreateServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const handleCreateService = () => {
    setShowCreateServiceForm(true);
  };

  const handleSubmitService = async (data: Omit<Service, "id" | "status" | "createdAt">) => {
    const created = await createServicePost({ ...data, status: "pending" });
    setServices((previous) => [created, ...previous]);
    toast.success("Đã gửi bài đăng lên máy chủ, đang chờ Admin duyệt.");
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
  };

  const handleUpdateService = async (id: string, data: Omit<Service, "id">) => {
    const updated = await updateServicePost(id, data);
    setServices((previous) => previous.map((item) => item.id === id ? updated : item));
    toast.success(updated.status === "hidden" ? "Đã lưu. Bài đăng vẫn đang bị Admin tạm ẩn." : "Đã cập nhật và gửi bài đăng chờ duyệt lại.");
  };

  const handleServiceAvailability = async (id: string, isPaused: boolean) => {
    const updated = await setServiceAvailability(id, isPaused);
    setServices((previous) => previous.map((item) => item.id === id ? updated : item));
    toast.success(isPaused ? "Đã tạm ngừng cung cấp dịch vụ." : updated.status === "approved"
      ? "Đã mở cung cấp lại dịch vụ." : "Đã mở cung cấp lại. Bài đăng vẫn giữ trạng thái kiểm duyệt của Admin.");
  };

  const handleDeleteService = async (id: string) => {
    await deleteServicePost(id);
    setServices((previous) => previous.filter((item) => item.id !== id));
    toast.success("Đã xóa bài đăng dịch vụ.");
  };

  const handleUpdateProviderProfile = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Service moderation actions (for Admin)
  const handleApproveService = async (id: string) => {
    const result = await approveServicePost(id);
    setServices((previous) => previous.map((item) => item.id === id ? result.service : item));
    toast.success(result.message);
  };

  const handleToggleHideService = async (id: string, reason?: string) => {
    const current = services.find((item) => item.id === id);
    if (!current) throw new Error("Không tìm thấy bài đăng.");
    const result = await toggleServicePost(id, current.status === "hidden" ? "unhide" : "hide", reason);
    setServices((previous) => previous.map((item) => item.id === id ? result.service : item));
    toast.success(result.message);
  };

  const handleRejectService = async (id: string, reason: string) => {
    const result = await rejectServicePost(id, reason);
    setServices((previous) => previous.map((item) => item.id === id ? result.service : item));
    toast.success(result.message);
  };

  // Provider actions - Room bookings
  const handleApproveRoomBooking = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleRejectRoomBooking = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Admin actions - Provider approval
  const handleApproveProvider = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleRejectProvider = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Admin actions - User status update
  const handleUpdateUserStatus = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Platform admin - Company management
  const handleApproveCompany = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleRejectCompany = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleSuspendCompany = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Admin updates system bank account
  const handleUpdateSystemBank = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Admin settles completed tour payment to company
  const handleSettleBooking = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Company adjusts total booking price & logs adjustment history
  const handleBookingChanged = (dto: import("@/app/services/wf05Bookings").BookingDto) => {
    const updated = fromApiBooking(dto, tours, currentUser);
    setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
  };
  const handleUpdateBookingPrice = async (bookingId: string, newPrice: number, note?: string): Promise<boolean> => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return false;
    if (booking.hasBeenApproved || booking.status !== "pending") { toast.error("Giá tour đã khóa sau khi duyệt. Vui lòng tạo phụ thu riêng."); return false; }
    try {
      const updated = await http<import("@/app/services/wf05Bookings").BookingDto>(`/agency/bookings/${bookingId}/price-adjustments`, {
        method: "POST", body: JSON.stringify({ newPrice, reason: note, expectedTotal: booking.totalPrice }),
      });
      handleBookingChanged(updated);
      toast.success("Đã lưu giá mới và nhật ký trước khi duyệt booking.");
      return true;
    } catch (e) { toast.error(e instanceof Error ? e.message : "Không lưu được giá mới."); return false; }
  };

  // Mã giao dịch mô phỏng cố định cho mỗi đợt: bấm lại / mạng chập chờn không ghi tiền hai lần.
  const demoPaymentKeys = useRef(new Map<string, string>());

  // Thanh toán cọc MÔ PHỎNG (chỉ Development, không qua ngân hàng hay payOS).
  const handlePayPaymentRequest = async (
    bookingId: string,
    paymentRequestId: string,
  ): Promise<boolean> => {
    const target = bookings.find((b) => b.id === bookingId);
    const request = target?.paymentRequests?.find(
      (pr) => pr.id === paymentRequestId,
    );
    if (!request || request.status === "paid" || request.status === "scheduled") {
      toast.error("Đợt thanh toán không còn hợp lệ. Vui lòng tải lại đơn.");
      return false;
    }
    const keyId = `${bookingId}:${paymentRequestId}:${request.amount}`;
    let reference = demoPaymentKeys.current.get(keyId);
    if (!reference) {
      reference = `DEMO-${crypto.randomUUID()}`;
      demoPaymentKeys.current.set(keyId, reference);
    }
    try {
      const updated = fromApiBooking(
        await depositBooking(Number(bookingId), request.amount, reference, undefined, Number(paymentRequestId)),
        tours,
        currentUser,
      );
      demoPaymentKeys.current.delete(keyId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      if (selectedUserBooking?.id === bookingId) setSelectedUserBooking(updated);
      toast.success("Đã ghi nhận khoản thanh toán (mô phỏng).");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể ghi nhận thanh toán.");
      return false;
    }
  };

  // Thanh toán cọc qua payOS: backend tính số tiền và tạo (hoặc dùng lại) link, trình duyệt chuyển sang payOS.
  const handlePayWithPayOs = async (bookingId: string, paymentRequestId: string): Promise<void> => {
    try {
      const checkout = await startPayOsPayment(Number(bookingId), Number(paymentRequestId));
      if (!isPayOsUrl(checkout.checkoutUrl)) {
        toast.error("Địa chỉ thanh toán không hợp lệ.");
        return;
      }
      if (checkout.reused) toast.info("Mở lại link thanh toán payOS còn hiệu lực.");
      window.location.assign(checkout.checkoutUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể tạo link thanh toán payOS.");
    }
  };

  // Custom tour requests
  const handleSubmitCustomTourRequest = async (data: Omit<CustomTourRequest, "id" | "createdAt" | "status">) => {
    await submitDesignRequest(data);
    await refreshCustomRequests();
  };

  const handleCancelCustomTourRequest = async (id: string) => {
    await cancelDesignRequest(id);
    await refreshCustomRequests();
  };

  const handleUpdateCustomTourRequest = async (id: string, update: Partial<CustomTourRequest>) => {
    if (update.status === "reviewing" || update.status === "rejected")
      await actOnDesignRequest(id, update.status === "reviewing" ? "review" : "reject", update.rejectionReason);
    await refreshCustomRequests();
  };

  // Company admin - tour CRUD
  const handleCompanyCreateTour = async (
    tourData: Omit<Tour, "id"> & { id?: string },
  ) => {
    if (tourData.is_request) {
      const saved = await saveDesignTour(tourData.customRequestId || "", tourData);
      await refreshTours();
      setTourNotice("Tour thiết kế đã được lưu. Bấm Chia sẻ để gửi phương án cho khách.");
      return saved;
    }
    const created = await createAgencyTour(tourData);
    const result =
      tourData.visibility === "public"
        ? await publishAgencyTour(String(created.id), created.revision || 1)
        : tourData.status === "completed"
          ? await completeAgencyTour(String(created.id), created.revision || 1)
          : created;
    await refreshTours();
    setTourNotice(
      tourData.is_request && tourData.status === "completed"
        ? "Tour thiết kế đã được lưu. Bấm Chia sẻ để gửi phương án cho khách."
        : result.visibility === "public"
        ? "Tour đã được đăng bán."
        : "Bản nháp đã được lưu.",
    );
    return fromApiTour(result);
  };

  const handleCompanyEditTour = async (
    tourId: string,
    tourData: Partial<Tour>,
  ) => {
    const current = tours.find((t) => t.id === tourId);
    if (!current) throw new Error("Không tìm thấy tour.");
    if (current.is_request && current.customRequestId) {
      await saveDesignTour(current.customRequestId, { ...current, ...tourData }, current.revision || 1);
      await refreshTours();
      setTourNotice("Tour thiết kế đã được lưu. Bấm Chia sẻ để gửi phương án cho khách.");
      return;
    }
    const visibilityOnly = Object.keys(tourData).every((key) =>
      ["status", "visibility"].includes(key),
    );
    if (visibilityOnly) {
      if (tourData.visibility === "public")
        await publishAgencyTour(tourId, current.revision || 1);
      else if (tourData.visibility === "hidden")
        await hideAgencyTour(
          tourId,
          current.revision || 1,
          "Agency tạm ẩn tour.",
        );
    } else {
      const updated = await updateAgencyTour(tourId, current.revision || 1, {
        ...current,
        ...tourData,
      });
      if (tourData.is_request && tourData.status === "completed")
        await completeAgencyTour(tourId, updated.revision || 1);
      else if (tourData.visibility === "public" && updated.visibility !== "public")
        await publishAgencyTour(tourId, updated.revision || 1);
      else if (tourData.status === "completed" && updated.status !== "completed")
        await completeAgencyTour(tourId, updated.revision || 1);
    }
    await refreshTours();
    setTourNotice("Tour đã được cập nhật.");
  };

  const handleCompanyDeleteTour = async (tourId: string) => {
    const current = tours.find((t) => t.id === tourId);
    if (!current) throw new Error("Không tìm thấy tour.");
    const version =
      current.visibility === "public"
        ? (
            await hideAgencyTour(
              tourId,
              current.revision || 1,
              "Agency lưu trữ tour.",
            )
          ).revision || 1
        : current.revision || 1;
    await archiveAgencyTour(tourId, version);
    await refreshTours();
    setTourNotice("Tour đã được lưu trữ.");
  };

  const handleGuidesChanged = async () => {
    const guides = await getAllAgencyGuides();
    setAvailableGuides(guides.filter(g => g.mobileAccountStatus === "active"));
    setUsers(previous => [...previous.filter(u => u.role !== "guide"), ...guides]);
  };

  // Tour moderation handlers (Admin)
  const handleApproveTour = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  const handleToggleHideTour = async (id: string, reason?: string) => {
    const tour = tours.find((t) => t.id === id);
    if (!tour) return;
    try {
      await hideModeratedTour(
        id,
        tour.revision || 1,
        reason || "Admin tạm ẩn tour",
      );
      await refreshTours();
      toast.success("Đã tạm ẩn tour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thể ẩn tour");
    }
  };

  const handleRejectTour = (..._args: any[]) => {
    toast.error("Chức năng này chưa được triển khai API trong đợt hiện tại.");
  };

  // Departure roll call handler (Guide)
  const handleDepartureRollCall = async (
    scheduleId: string,
    passengers: BookingPassenger[],
  ) => {
    const schedule = guideSchedules.find((s) => s.id === scheduleId);
    if (!schedule) throw new Error("Không tìm thấy chuyến đi.");
    for (const p of passengers) {
      await recordAttendance(
        Number(schedule.booking.id),
        Number(p.id),
        p.departureAttendance === "present" || p.departureAttendance === "late"
          ? "CheckedIn"
          : p.departureAttendance === "absent"
            ? "Absent"
            : "Pending",
      );
    }
    if (
      new Date(schedule.booking.tourStartDate).getTime() <= Date.now() &&
      ["confirmed", "paid"].includes(schedule.booking.status)
    )
      await http("/guide/bookings/" + schedule.booking.id + "/start", {
        method: "POST",
      });
    const booking = fromApiBooking(
      await getGuideBookingDetail(Number(schedule.booking.id)),
      tours,
      currentUser,
    );
    setGuideSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              booking,
              departureRollCallCompleted: (booking.passengers || []).every(
                (p) => p.attendanceStatus !== "PENDING",
              ),
              departureRollCallTime: new Date().toLocaleTimeString("vi-VN"),
            }
          : s,
      ),
    );
    toast.success("Đã lưu điểm danh trên máy chủ.");
  };

  // Report incident handler (Guide)
  const handleReportIncident = async (
    scheduleId: string,
    incident: Omit<IncidentReport, "id" | "reportedAt">,
  ) => {
    const schedule = guideSchedules.find((s) => s.id === scheduleId);
    if (!schedule) throw new Error("Không tìm thấy chuyến đi.");
    await reportIncident(
      Number(schedule.booking.id),
      incident.category || "OTHER",
      incident.title || `Sự cố ${incident.category}`,
      incident.location
        ? `Địa điểm: ${incident.location}\n${incident.description}`
        : incident.description || "Không có mô tả",
    );
    const booking = fromApiBooking(
      await getGuideBookingDetail(Number(schedule.booking.id)),
      tours,
      currentUser,
    );
    setGuideSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? { ...s, booking, incidents: booking.guideIncidents || [] }
          : s,
      ),
    );
    toast.success("Đã lưu báo cáo sự cố trên máy chủ.");
  };

  // Passenger update handler (User / Company)
  const handleUpdateBookingPassengers = async (
    bookingId: string,
    passengers: BookingPassenger[],
  ) => {
    const dto = await http<BookingDto>(
      "/bookings/" + bookingId + "/participants",
      {
        method: "PUT",
        body: JSON.stringify({
          participants: passengers.map((p) => ({
            id: Number(p.id),
            phoneNumber: p.phone?.trim() || null,
            fullName: p.fullName,
            dateOfBirth: p.dateOfBirth || null,
            gender: p.gender === "female" ? "Nữ" : "Nam",
            identityNumber: p.idNumber,
            note: p.notes,
            roommateNote: p.roommateNote || p.roomingPreference,
            restaurantNote: p.dietaryNote,
          })),
        }),
      },
    );
    const booking = fromApiBooking(dto, tours, currentUser);
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? booking : b)));
    if (selectedUserBooking?.id === bookingId) setSelectedUserBooking(booking);
    toast.success("Đã lưu hồ sơ hành khách");
  };

  // Auth restoring loading screen
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-[#075985]/20 border-t-[#075985] rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Đang khôi phục phiên làm việc...</p>
      </div>
    );
  }

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
          onShowLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
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
      const company =
        companies.find((c) => c.id === currentUser.companyId) || companies[0];
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
          <ErrorBoundary fallbackTitle="Không thể tải giao diện Quản lý Agency">
            <AgencyDashboard
              providerGroupRequests={providerGroupRequests}
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
              onGuidesChanged={handleGuidesChanged}
              onApproveBooking={handleApproveBooking}
              onRejectBooking={handleRejectBooking}
              onAssignGuide={handleAssignGuide}
              onUpdateAssignedGuides={handleUpdateAssignedGuides}

              onMarkDepositPaid={handleMarkDepositPaid}
              onMarkFullyPaid={handleMarkFullyPaid}
              onUpdateBookingPrice={handleUpdateBookingPrice}
              onBookingChanged={handleBookingChanged}
              onUpdateBookingPassengers={handleUpdateBookingPassengers}
              onUpdateBookingAgencies={handleUpdateBookingAgencies}
              onUpdateAttractionCheckins={handleUpdateAttractionCheckins}
              onUpdateIncidents={handleUpdateIncidents}
              onCancelBooking={handleAgencyCancelBooking}
              onReviewContract={handleReviewContract}
              onUpdateCustomRequest={handleUpdateCustomTourRequest}
              onViewTour={handleViewTour}
              onLogout={handleLogout}
            />
          </ErrorBoundary>
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
              onUpdateNotes={(scheduleId, personalNotes, guideNotesList) => {
                setGuideSchedules((prev) =>
                  prev.map((s) =>
                    s.id === scheduleId
                      ? { ...s, personalNotes, guideNotesList }
                      : s,
                  ),
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
              providers={users.filter((u) => u.role === "provider")}
              users={users}
              companies={companies}
              onApproveTour={handleApproveTour}
              onRejectTour={handleRejectTour}
              onToggleHideTour={handleToggleHideTour}
              onDeleteTour={handleDeleteTour}
              onApproveBooking={handleApproveBooking}
              onRejectBooking={handleRejectBooking}
              onAssignGuide={handleAssignGuide}
              onApproveService={handleApproveService}
              onRejectService={handleRejectService}
              onToggleHideService={handleToggleHideService}
              onDeleteService={undefined}
              onApproveProvider={handleApproveProvider}
              onRejectProvider={handleRejectProvider}
              //onUpdateUserStatus={handleUpdateUserStatus}
              onApproveCompany={handleApproveCompany}
              onRejectCompany={handleRejectCompany}
              refundRequests={refundRequests}
              onApproveRefund={handleApproveRefund}
              onRejectRefund={handleRejectRefund}
              onReviewRefund={handleReviewRefund}
              payoutAccount={payoutAccount}
              onPayoutRefund={handlePayoutRefund}
              onSyncPayout={handleSyncPayout}
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
              onSetAvailability={handleServiceAvailability}
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans antialiased text-[#0F172A]">
      <CustomerHeader
        currentUser={currentUser}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onShowLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
        onOpenAIAdvisor={() => setShowAIAdvisor(true)}
      />

      <main
        className={
          currentPage === "home" || currentPage === "user-booking-detail"
            ? "flex-1 w-full min-w-0"
            : "flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6"
        }
      >
        {currentPage === "custom-tour" ? (
          <CustomTourRequestPage
            sourceTour={sourceDesignTour}
            companies={companies}
            currentUser={currentUser}
            onBack={() => goBack(() => handleNavigate("home"))}
            onSubmit={handleSubmitCustomTourRequest}
            onShowLogin={() => setShowLogin(true)}
            onViewMyRequests={() => handleNavigate("my-requests")}
          />
        ) : currentPage === "booking-form" && bookingTour ? (
          <ErrorBoundary fallbackTitle="Không thể tải form đặt tour">
            <BookingFormPage
              tour={bookingTour}
              currentUser={currentUser as any}
              hasLocationCustomization={
                bookingCustomData?.hasLocationCustomization
              }
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
              onSubmit={handleBookingSubmit}
              onViewMyBookings={() => {
                handleNavigate("my-bookings");
              }}
              onGoHome={() => {
                handleNavigate("home");
              }}
            />
          </ErrorBoundary>
        ) : currentPage === "tour-detail" && selectedTour ? (
          <TourDetailPage
            tour={selectedTour}
            previewOnly={selectedTour.designReadOnly}
            services={services}
            currentUser={currentUser}
            onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                handleNavigate("book-tours");
              }
            }}
            onBookNow={handleOpenBookingForm}
            onOpenRequest={() => handleNavigate("my-requests")}
            onShowLogin={() => setShowLogin(true)}
          />
        ) : currentPage === "home" ? (
          <HomePage
            onShowLogin={() => setShowLogin(true)}
            popularTours={tours.filter(
              (t) =>
                t.tourType !== "custom_request" &&
                (t.status === "completed" ||
                  t.status === "published" ||
                  !t.status) &&
                (t.visibility === "public" || !t.visibility),
            )}
            onNavigate={handleNavigate}
            onViewTour={handleViewTour}
            onBookTour={(t) => handleOpenBookingForm(t)}
            onOpenAIAdvisor={() => setShowAIAdvisor(true)}
            onSearchTours={(criteria) => handleNavigate("book-tours", criteria)}
            loading={!toursLoaded}
          />
        ) : currentPage === "book-tours" ? (
          <BookToursPage
            initialSearch={tourSearch}
            onClearSearch={() => handleNavigate("book-tours")}
            tours={tours.filter(
              (t) =>
                t.tourType !== "custom_request" &&
                (t.status === "completed" ||
                  t.status === "published" ||
                  !t.status) &&
                (t.visibility === "public" || !t.visibility),
            )}
            currentUser={currentUser}
            onShowLogin={() => setShowLogin(true)}
            onBookTour={(tourId) => {
              const tour = tours.find((t) => t.id === tourId);
              if (tour) {
                handleOpenBookingForm(tour);
              }
            }}
            onViewTour={handleViewTour}
            onOpenBookingForm={(t) => handleOpenBookingForm(t)}
          />
        ) : currentPage === "my-bookings" ? (
          <MyBookings
            bookings={userBookings}
            onCancelBooking={handleCancelBooking}
            onViewBookingDetail={handleViewUserBookingDetail}
            onSubmitRefundRequest={handleCreateRefundRequest}
            onNavigateToExplore={() => handleNavigate("book-tours")}
          />
        ) : currentPage === "user-booking-detail" && selectedUserBooking ? (
          <ErrorBoundary fallbackTitle="Không thể tải chi tiết đơn đặt tour">
            <UserBookingDetailPage
              booking={
                bookings.find((b) => b.id === selectedUserBooking.id) ||
                selectedUserBooking
              }
              systemBank={systemBankAccount}
              onSubmitRefundRequest={handleCreateRefundRequest}
              onUpdateRefundAccount={handleUpdateRefundAccount}
              onUploadSignedContract={handleUploadSignedContract}
              onStartWebSign={handleStartWebSign}
              onRefreshContract={handleRefreshContract}
              onBack={() => {
                goBack(() => handleNavigate("my-bookings"));
              }}
              onCancelBooking={handleCancelBooking}
              onPayPaymentRequest={handlePayPaymentRequest}
              onPayWithPayOs={handlePayWithPayOs}
              paymentCheck={
                paymentCheck?.bookingId === selectedUserBooking.id ? paymentCheck : null
              }
              onCheckPayment={(id) => {
                window.clearTimeout(paymentPollTimer.current);
                void checkPayment(id);
              }}
              onNavigateToComplaint={(b) => {
                setComplaintBookingId(Number(b.id));
                setCurrentPage("my-complaints");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </ErrorBoundary>
        ) : currentPage === "my-requests" ? (
          <MyRequestsPage
            onViewBooking={id=>{window.location.hash=`#/my-bookings/${encodeURIComponent(id)}`;}}
            services={services}
            requests={customTourRequests.filter(
              (r) => !currentUser || r.userId === currentUser.id,
            )}
            tours={tours}
            onCancelRequest={handleCancelCustomTourRequest}
            onNavigateToCreate={() => handleNavigate("custom-tour")}
            onViewTour={handleViewTour}
            onBookTour={async (t) => {
              const existing = userBookings.find((b) => b.tour?.customRequestId === t.customRequestId && b.status !== "cancelled" && b.status !== "rejected");
              if (existing) {
                await handleViewUserBookingDetail(existing);
              } else handleOpenBookingForm(t);
            }}
          />
        ) : currentPage === "my-complaints" ? (
          <MyComplaintsPage
            initialBookingId={complaintBookingId}
            onViewBookingDetail={(id) => {
              const booking = userBookings.find((b) => Number(b.id) === id);
              if (booking) void handleViewUserBookingDetail(booking);
            }}
          />
        ) : currentPage === "messages" ? (
          <MessagesPage />
        ) : currentPage === "my-reviews" ? (
          <MyReviewsPage
            onComplain={(id) => {
              setComplaintBookingId(id);
              setCurrentPage("my-complaints");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : currentPage === "user-profile" ? (
          <UserProfile />
        ) : currentPage === "contact" ? (
          <ContactPage onShowLogin={() => setShowLogin(true)} />
        ) : currentPage === "about" ? (
          <AboutPage onShowLogin={() => setShowLogin(true)} />
        ) : currentPage === "reviews" ? (
          <ReviewsPage onShowLogin={() => setShowLogin(true)} />
        ) : (
          <HomePage
            onShowLogin={() => setShowLogin(true)}
            popularTours={tours.filter(
              (t) =>
                t.tourType !== "custom_request" &&
                (t.status === "completed" ||
                  t.status === "published" ||
                  !t.status) &&
                (t.visibility === "public" || !t.visibility),
            )}
            onNavigate={handleNavigate}
            onViewTour={handleViewTour}
            onBookTour={(t) => handleOpenBookingForm(t)}
            onOpenAIAdvisor={() => setShowAIAdvisor(true)}
            loading={!toursLoaded}
          />
        )}
      </main>

      <CustomerFooter
        onNavigate={handleNavigate}
        onOpenAIAdvisor={() => setShowAIAdvisor(true)}
      />

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
    </div>
  );
}

/** Trang ký hợp đồng từ mã QR (#/sign/{mã}) chạy riêng, không cần đăng nhập. */
function useSignToken(): string | null {
  const [token, setToken] = useState(() => parseSignRoute(window.location.hash));
  useEffect(() => {
    const onHash = () => setToken(parseSignRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return token;
}

export default function App() {
  const signToken = useSignToken();
  const [chatHash,setChatHash]=useState(window.location.hash);
  useEffect(()=>{const sync=()=>setChatHash(window.location.hash);window.addEventListener("hashchange",sync);return()=>window.removeEventListener("hashchange",sync);},[]);
  const chatTour=/^#\/chat-tour\/(\d+)\/(\d+)$/.exec(chatHash);
  if(chatTour) return <ServiceCatalogueProvider><ChatTourPage reference={{conversationId:Number(chatTour[1]),messageId:Number(chatTour[2])}} onClose={()=>{window.location.hash="#/tours";}}/></ServiceCatalogueProvider>;
  if (signToken) return <SignContractPage token={signToken} />;
  return (
    <ServiceCatalogueProvider>
      <Application />
    </ServiceCatalogueProvider>
  );
}
