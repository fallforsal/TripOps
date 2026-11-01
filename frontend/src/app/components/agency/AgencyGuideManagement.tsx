import { useState, useMemo, useEffect } from "react";
import { Booking, GuideSchedule, Tour, User } from "@/app/types";
import {
  Users,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Globe,
  Compass,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  LayoutGrid,
  List,
  ExternalLink,
  Smartphone,
  Check,
  X,
  MapPin,
  Sparkles,
  FileBadge,
  Info,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import {
  AgencyGuideProfile,
  COMMON_GUIDE_LANGUAGES,
  COMMON_GUIDE_ROUTES,
  COMMON_GUIDE_SPECIALTIES,
  CreateAgencyGuideRequest,
  GuideAssignedTourItem,
  GuideMobileAccountStatus,
  GuideWorkStatus,
  SendGuideInvitationRequest,
  UpdateAgencyGuideRequest,
  UpdateGuideAccountStatusRequest,
  createSeedAgencyGuides,
  createSeedGuideAssignments,
  deriveGuideWorkInfo,
  evaluateGuideEligibility,
  evaluateLicenseExpiry,
  formatDateTimeVN,
  formatDateVN,
  mergeGuideAssignments,
  normalizeToAgencyGuideProfile,
} from "./agencyGuideTypesAndMock";

export interface AgencyGuideManagementProps {
  guides: User[];
  tours: Tour[];
  guideSchedules: GuideSchedule[];
  bookings?: Booking[];
  companyId?: string;
  companyName?: string;
  onAddGuide?: (guideData: Omit<User, "id">) => void;
  onUpdateGuide?: (guideId: string, update: Partial<User>) => void;
  onRemoveGuide?: (guideId: string) => void;
  onNavigateToBookings?: () => void;
  onViewBookingDetail?: (bookingId: string) => void;
}

interface GuideFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  experienceYears?: string;
  languages?: string;
}

const ACCOUNT_STATUS_BADGE: Record<
  GuideMobileAccountStatus,
  {
    label: string;
    shortDesc: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  not_invited: {
    label: "Chưa gửi lời mời",
    shortDesc: "Chưa cấp link kích hoạt",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    dot: "bg-slate-400",
  },
  pending_activation: {
    label: "Chờ kích hoạt",
    shortDesc: "Chờ HDV đặt mật khẩu qua email",
    bg: "bg-[#E0F2FE]",
    text: "text-[#075985]",
    border: "border-sky-300",
    dot: "bg-[#0284C7]",
  },
  active: {
    label: "Đã kích hoạt",
    shortDesc: "Đăng nhập được Tour Guide App",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  suspended: {
    label: "Tạm khóa",
    shortDesc: "Agency đang khóa quyền truy cập",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
  },
};

const WORK_STATUS_BADGE: Record<
  GuideWorkStatus,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  available: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  on_tour: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  unavailable: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    dot: "bg-slate-400",
  },
};

export function AgencyGuideManagement({
  guides: propGuides,
  tours,
  guideSchedules,
  bookings = [],
  companyId = "company-1",
  companyName = "Viettravel",
  onAddGuide,
  onUpdateGuide,
  onRemoveGuide,
  onNavigateToBookings,
  onViewBookingDetail,
}: AgencyGuideManagementProps) {
  const isUnimplementedStub = (fn?: (...args: any[]) => any): boolean => {
    if (!fn) return true;
    try {
      return fn
        .toString()
        .includes("Chức năng này chưa được triển khai API");
    } catch {
      return false;
    }
  };

  // Khởi tạo danh sách HDV nội bộ của đúng Agency hiện tại (kết hợp dữ liệu mẫu đầy đủ kịch bản)
  const buildInitialGuides = (
    cId: string,
    cName: string,
    incomingGuides: User[]
  ): AgencyGuideProfile[] => {
    const seeded = createSeedAgencyGuides(cId, cName);
    const scopedIncoming = incomingGuides
      .filter((g) => !g.companyId || g.companyId === cId)
      .filter((g) => g.email && g.licenseNumber)
      .map((g) => normalizeToAgencyGuideProfile(g, cId, cName));

    const mergedMap = new Map<string, AgencyGuideProfile>();
    for (const item of seeded) {
      mergedMap.set(item.id, item);
    }
    for (const item of scopedIncoming) {
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
      }
    }
    return Array.from(mergedMap.values());
  };

  const [localGuides, setLocalGuides] = useState<AgencyGuideProfile[]>(() =>
    buildInitialGuides(companyId, companyName, propGuides)
  );

  // Đồng bộ khi đổi companyId
  useEffect(() => {
    setLocalGuides(buildInitialGuides(companyId, companyName, propGuides));
  }, [companyId, companyName]);

  // Kết hợp lịch phân công mẫu và lịch thực tế từ props (không tự ý sửa dữ liệu tour gốc)
  const guideAssignmentsMap = useMemo(() => {
    const seedMap = createSeedGuideAssignments(companyName);
    return mergeGuideAssignments(seedMap, guideSchedules, bookings, tours);
  }, [companyName, guideSchedules, bookings, tours]);

  const getGuideAssignments = (guideId: string): GuideAssignedTourItem[] => {
    return guideAssignmentsMap[guideId] || [];
  };

  // Bộ lọc & Tìm kiếm & Chế độ xem
  const [searchQuery, setSearchQuery] = useState("");
  const [workStatusFilter, setWorkStatusFilter] = useState<
    "all" | GuideWorkStatus
  >("all");
  const [accountFilter, setAccountFilter] = useState<
    "all" | GuideMobileAccountStatus
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "domestic" | "international"
  >("all");
  const [licenseAlertFilter, setLicenseAlertFilter] = useState<
    "all" | "expiring_or_expired"
  >("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<AgencyGuideProfile | null>(
    null
  );
  const [detailGuideId, setDetailGuideId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "schedule">("profile");

  // Modal Tạm khóa / Mở khóa tài khoản
  const [accountActionTarget, setAccountActionTarget] = useState<{
    guide: AgencyGuideProfile;
    action: "suspend" | "reactivate";
  } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  // Modal Xóa / Hủy liên kết HDV
  const [deleteTargetGuide, setDeleteTargetGuide] =
    useState<AgencyGuideProfile | null>(null);

  // Modal kết quả gửi lời mời kích hoạt (Mock Email Invite Preview)
  const [invitePreviewInfo, setInvitePreviewInfo] = useState<{
    guide: AgencyGuideProfile;
    isResend: boolean;
    sentAt: string;
    expiresAt: string;
  } | null>(null);

  // Form states (Tuyệt đối KHÔNG có trường hay biến mật khẩu mặc định)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guideType, setGuideType] = useState<"domestic" | "international">(
    "domestic"
  );
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState(
    "Sở Du lịch TP. Hồ Chí Minh"
  );
  const [experienceYears, setExperienceYears] = useState("3");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    "Tiếng Việt",
    "Tiếng Anh",
  ]);
  const [customLanguageInput, setCustomLanguageInput] = useState("");
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([
    "Đà Lạt – Tây Nguyên",
  ]);
  const [customRouteInput, setCustomRouteInput] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    "Văn hóa – Lịch sử",
  ]);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");
  const [bio, setBio] = useState("");
  const [initialInviteMode, setInitialInviteMode] = useState<
    "send_invite" | "save_only"
  >("send_invite");
  const [editAccountStatus, setEditAccountStatus] =
    useState<GuideMobileAccountStatus>("active");
  const [formErrors, setFormErrors] = useState<GuideFormErrors>({});

  // HDV đang mở trong modal Chi tiết
  const detailGuide = useMemo(
    () => localGuides.find((g) => g.id === detailGuideId) || null,
    [localGuides, detailGuideId]
  );

  // Chỉ lấy HDV thuộc đúng agency hiện tại
  const agencyScopedGuides = useMemo(
    () =>
      localGuides.filter((g) => !g.companyId || g.companyId === companyId),
    [localGuides, companyId]
  );

  // Thống kê tổng quan
  const metrics = useMemo(() => {
    let availableCount = 0;
    let onTourCount = 0;
    let pendingInviteCount = 0;
    let suspendedCount = 0;
    let licenseAlertCount = 0;
    let internationalCount = 0;

    for (const g of agencyScopedGuides) {
      const assignments = getGuideAssignments(g.id);
      const workInfo = deriveGuideWorkInfo(g, assignments);
      const licenseCheck = evaluateLicenseExpiry(g.licenseExpiryDate);

      if (workInfo.workStatus === "available") availableCount++;
      if (workInfo.workStatus === "on_tour") onTourCount++;
      if (
        g.mobileAccountStatus === "not_invited" ||
        g.mobileAccountStatus === "pending_activation"
      ) {
        pendingInviteCount++;
      }
      if (g.mobileAccountStatus === "suspended") suspendedCount++;
      if (
        licenseCheck.status === "expiring_soon" ||
        licenseCheck.status === "expired"
      ) {
        licenseAlertCount++;
      }
      if (g.guideType === "international") internationalCount++;
    }

    return {
      total: agencyScopedGuides.length,
      availableCount,
      onTourCount,
      pendingInviteCount,
      suspendedCount,
      licenseAlertCount,
      internationalCount,
    };
  }, [agencyScopedGuides, guideAssignmentsMap]);

  // Lọc danh sách HDV
  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return agencyScopedGuides.filter((guide) => {
      const matchesSearch =
        !q ||
        guide.name.toLowerCase().includes(q) ||
        guide.email.toLowerCase().includes(q) ||
        (guide.phone && guide.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, ""))) ||
        guide.licenseNumber.toLowerCase().includes(q);

      const assignments = getGuideAssignments(guide.id);
      const workInfo = deriveGuideWorkInfo(guide, assignments);
      const licenseCheck = evaluateLicenseExpiry(guide.licenseExpiryDate);

      const matchesWorkStatus =
        workStatusFilter === "all" || workInfo.workStatus === workStatusFilter;

      const matchesAccountStatus =
        accountFilter === "all" || guide.mobileAccountStatus === accountFilter;

      const matchesType =
        typeFilter === "all" || guide.guideType === typeFilter;

      const matchesLicenseAlert =
        licenseAlertFilter === "all" ||
        licenseCheck.status === "expiring_soon" ||
        licenseCheck.status === "expired";

      return (
        matchesSearch &&
        matchesWorkStatus &&
        matchesAccountStatus &&
        matchesType &&
        matchesLicenseAlert
      );
    });
  }, [
    agencyScopedGuides,
    searchQuery,
    workStatusFilter,
    accountFilter,
    typeFilter,
    licenseAlertFilter,
    guideAssignmentsMap,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    workStatusFilter !== "all" ||
    accountFilter !== "all" ||
    typeFilter !== "all" ||
    licenseAlertFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setWorkStatusFilter("all");
    setAccountFilter("all");
    setTypeFilter("all");
    setLicenseAlertFilter("all");
  };

  // ============================================================================
  // TAG / MULTI-SELECT HELPERS
  // ============================================================================
  const toggleItemInList = (
    item: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const addCustomTag = (
    rawInput: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: () => void
  ) => {
    const cleaned = rawInput.trim();
    if (!cleaned) return;
    if (!list.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
      setter([...list, cleaned]);
    }
    clearInput();
  };

  // ============================================================================
  // FORM HANDLERS & VALIDATION
  // ============================================================================
  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setGuideType("domestic");
    setLicenseNumber("");
    setLicenseExpiryDate("");
    setIssuingAuthority("Sở Du lịch TP. Hồ Chí Minh");
    setExperienceYears("3");
    setSelectedLanguages(["Tiếng Việt", "Tiếng Anh"]);
    setCustomLanguageInput("");
    setSelectedRoutes(["Đà Lạt – Tây Nguyên"]);
    setCustomRouteInput("");
    setSelectedSpecialties(["Văn hóa – Lịch sử"]);
    setCustomSpecialtyInput("");
    setBio("");
    setInitialInviteMode("send_invite");
    setEditAccountStatus("active");
    setFormErrors({});
  };

  const handleOpenAddModal = () => {
    setEditingGuide(null);
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (guide: AgencyGuideProfile) => {
    setEditingGuide(guide);
    setName(guide.name);
    setEmail(guide.email);
    setPhone(guide.phone || "");
    setGuideType(guide.guideType);
    setLicenseNumber(guide.licenseNumber);
    setLicenseExpiryDate(guide.licenseExpiryDate);
    setIssuingAuthority(
      guide.issuingAuthority ||
        (guide.guideType === "international"
          ? "Cục Du lịch Quốc gia Việt Nam"
          : "Sở Du lịch TP. Hồ Chí Minh")
    );
    setExperienceYears(String(guide.experienceYears ?? 3));
    setSelectedLanguages(
      guide.languages && guide.languages.length > 0
        ? [...guide.languages]
        : ["Tiếng Việt"]
    );
    setCustomLanguageInput("");
    setSelectedRoutes(
      guide.routes && guide.routes.length > 0 ? [...guide.routes] : []
    );
    setCustomRouteInput("");
    setSelectedSpecialties(
      guide.specialties && guide.specialties.length > 0
        ? [...guide.specialties]
        : []
    );
    setCustomSpecialtyInput("");
    setBio(guide.bio || "");
    setEditAccountStatus(guide.mobileAccountStatus);
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  const validateGuideForm = (): boolean => {
    const errors: GuideFormErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim().replace(/\s+/g, "");
    const trimmedLicense = licenseNumber.trim().toUpperCase();

    if (!trimmedName) {
      errors.name = "Vui lòng nhập họ và tên hướng dẫn viên.";
    } else if (trimmedName.length < 3) {
      errors.name = "Họ và tên phải có ít nhất 3 ký tự.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = "Vui lòng nhập email đăng nhập ứng dụng Mobile.";
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Định dạng email không hợp lệ (VD: hdv.ten@congty.vn).";
    } else {
      const duplicateEmailGuide = localGuides.find(
        (g) =>
          g.id !== editingGuide?.id &&
          g.email.trim().toLowerCase() === trimmedEmail
      );
      if (duplicateEmailGuide) {
        errors.email = `Email này đã được đăng ký cho HDV "${duplicateEmailGuide.name}".`;
      }
    }

    const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
    if (!trimmedPhone) {
      errors.phone = "Vui lòng nhập số điện thoại liên hệ.";
    } else if (!vnPhoneRegex.test(trimmedPhone)) {
      errors.phone =
        "Số điện thoại không hợp lệ (gồm 10 số bắt đầu bằng 03, 05, 07, 08, 09 hoặc +84).";
    }

    if (!trimmedLicense) {
      errors.licenseNumber = "Vui lòng nhập số thẻ hành nghề HDV.";
    } else if (trimmedLicense.length < 5) {
      errors.licenseNumber =
        "Số thẻ hành nghề quá ngắn (VD: HDV-QT-2025-0102).";
    } else {
      const duplicateLicenseGuide = localGuides.find(
        (g) =>
          g.id !== editingGuide?.id &&
          g.licenseNumber.trim().toUpperCase() === trimmedLicense
      );
      if (duplicateLicenseGuide) {
        errors.licenseNumber = `Số thẻ này đã trùng với hồ sơ của HDV "${duplicateLicenseGuide.name}".`;
      }
    }

    if (!licenseExpiryDate) {
      errors.licenseExpiryDate = "Vui lòng chọn ngày hết hạn thẻ hành nghề.";
    } else {
      const check = evaluateLicenseExpiry(licenseExpiryDate);
      // Khi tạo hồ sơ mới, không cho phép nhập thẻ đã hết hạn
      if (!editingGuide && check.status === "expired") {
        errors.licenseExpiryDate =
          "Thẻ hành nghề đã hết hạn. Vui lòng nhập thẻ còn thời hạn hiệu lực khi thêm mới.";
      }
    }

    const expNum = Number(experienceYears);
    if (
      experienceYears.trim() === "" ||
      Number.isNaN(expNum) ||
      !Number.isInteger(expNum) ||
      expNum < 0 ||
      expNum > 50
    ) {
      errors.experienceYears =
        "Số năm kinh nghiệm phải là số nguyên từ 0 đến 50 năm.";
    }

    if (selectedLanguages.length === 0) {
      errors.languages = "Vui lòng chọn ít nhất 1 ngôn ngữ hướng dẫn.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateGuideForm()) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedLicense = licenseNumber.trim().toUpperCase();
    const expYears = parseInt(experienceYears, 10) || 0;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    if (!editingGuide) {
      // ======================================================================
      // LUỒNG TẠO HỒ SƠ MỚI & CẤP TÀI KHOẢN AN TOÀN (KHÔNG DÙNG MẬT KHẨU MẶC ĐỊNH)
      // TODO: Integrate backend API `POST /api/agency/guides` (CreateAgencyGuideRequest)
      // Backend tạo hồ sơ nhân sự + sinh activation token có hạn 48h và gửi email
      // để HDV tự thiết lập mật khẩu trên ứng dụng Mobile Tour Guide.
      // ======================================================================
      const createPayload: CreateAgencyGuideRequest = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        guideType,
        licenseNumber: trimmedLicense,
        licenseExpiryDate,
        issuingAuthority: issuingAuthority.trim() || undefined,
        languages: selectedLanguages,
        routes: selectedRoutes,
        specialties: selectedSpecialties,
        experienceYears: expYears,
        bio: bio.trim() || undefined,
        sendActivationInviteImmediately: initialInviteMode === "send_invite",
      };

      const accountStatus: GuideMobileAccountStatus =
        createPayload.sendActivationInviteImmediately
          ? "pending_activation"
          : "not_invited";

      const newGuide: AgencyGuideProfile = {
        id: `guide-${Date.now().toString().slice(-6)}`,
        role: "guide",
        companyId,
        companyName,
        name: createPayload.name,
        email: createPayload.email,
        phone: createPayload.phone,
        guideType: createPayload.guideType,
        licenseNumber: createPayload.licenseNumber,
        licenseExpiryDate: createPayload.licenseExpiryDate,
        issuingAuthority: createPayload.issuingAuthority,
        languages: createPayload.languages,
        routes: createPayload.routes,
        specialties: createPayload.specialties,
        experienceYears: createPayload.experienceYears,
        bio: createPayload.bio,
        guideStatus: "active",
        mobileAccountStatus: accountStatus,
        invitationSentAt: createPayload.sendActivationInviteImmediately
          ? nowIso
          : undefined,
        invitationExpiresAt: createPayload.sendActivationInviteImmediately
          ? expiresIso
          : undefined,
        invitationCount: createPayload.sendActivationInviteImmediately ? 1 : 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          createPayload.name
        )}&background=075985&color=fff`,
      };

      setLocalGuides((prev) => [newGuide, ...prev]);
      if (!isUnimplementedStub(onAddGuide)) {
        onAddGuide?.(newGuide);
      }
      setIsFormModalOpen(false);

      if (createPayload.sendActivationInviteImmediately) {
        setInvitePreviewInfo({
          guide: newGuide,
          isResend: false,
          sentAt: nowIso,
          expiresAt: expiresIso,
        });
        toast.success(
          `Đã tạo hồ sơ HDV ${newGuide.name} và khởi tạo lời mời kích hoạt (Mô phỏng FE).`
        );
      } else {
        toast.success(
          `Đã lưu hồ sơ nhân sự HDV ${newGuide.name} (Chưa gửi lời mời kích hoạt).`
        );
      }
      resetForm();
      return;
    }

    // ========================================================================
    // LUỒNG CẬP NHẬT HỒ SƠ HDV (KHÔNG TỰ Ý SỬA ĐỔI DỮ LIỆU TOUR/BOOKING ĐÃ GIAO)
    // TODO: Integrate backend API `PUT /api/agency/guides/:guideId` (UpdateAgencyGuideRequest)
    // ========================================================================
    const updatePayload: UpdateAgencyGuideRequest = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      guideType,
      licenseNumber: trimmedLicense,
      licenseExpiryDate,
      issuingAuthority: issuingAuthority.trim() || undefined,
      languages: selectedLanguages,
      routes: selectedRoutes,
      specialties: selectedSpecialties,
      experienceYears: expYears,
      bio: bio.trim() || undefined,
    };

    const updatedGuide: AgencyGuideProfile = {
      ...editingGuide,
      ...updatePayload,
      mobileAccountStatus: editAccountStatus,
      guideStatus: editAccountStatus === "suspended" ? "inactive" : "active",
      updatedAt: nowIso,
    };

    setLocalGuides((prev) =>
      prev.map((g) => (g.id === editingGuide.id ? updatedGuide : g))
    );
    if (!isUnimplementedStub(onUpdateGuide)) {
      onUpdateGuide?.(editingGuide.id, updatedGuide);
    }
    setIsFormModalOpen(false);
    setEditingGuide(null);
    toast.success(
      `Đã cập nhật hồ sơ HDV ${updatedGuide.name}. Dữ liệu các tour đã phân công được giữ nguyên.`
    );
  };

  // ============================================================================
  // THAO TÁC TÀI KHOẢN MOBILE: GỬI / GỬI LẠI LỜI MỜI, MÔ PHỎNG KÍCH HOẠT, KHÓA/MỞ
  // ============================================================================
  const handleSendOrResendInvitation = (guide: AgencyGuideProfile) => {
    // TODO: Integrate backend API `POST /api/agency/guides/:guideId/send-invitation` (SendGuideInvitationRequest)
    // Khi backend có API, gọi endpoint này để thu hồi token cũ và gửi email chứa link đặt mật khẩu mới.
    const _requestContract: SendGuideInvitationRequest = {
      guideId: guide.id,
    };
    void _requestContract;

    const isResend = guide.mobileAccountStatus === "pending_activation";
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    const updated: AgencyGuideProfile = {
      ...guide,
      mobileAccountStatus: "pending_activation",
      invitationSentAt: nowIso,
      invitationExpiresAt: expiresIso,
      invitationCount: (guide.invitationCount || 0) + 1,
      updatedAt: nowIso,
    };

    setLocalGuides((prev) =>
      prev.map((g) => (g.id === guide.id ? updated : g))
    );
    if (!isUnimplementedStub(onUpdateGuide)) {
      onUpdateGuide?.(guide.id, updated);
    }

    setInvitePreviewInfo({
      guide: updated,
      isResend,
      sentAt: nowIso,
      expiresAt: expiresIso,
    });

    toast.success(
      isResend
        ? `[Mô phỏng FE] Đã làm mới liên kết kích hoạt (48h) cho ${guide.email}.`
        : `[Mô phỏng FE] Đã tạo lời mời kích hoạt tài khoản cho ${guide.email}.`
    );
  };

  const handleSimulateGuideCompletedActivation = (
    guide: AgencyGuideProfile
  ) => {
    const nowIso = new Date().toISOString();
    const updated: AgencyGuideProfile = {
      ...guide,
      mobileAccountStatus: "active",
      guideStatus: "active",
      activatedAt: nowIso,
      lastLoginAt: nowIso,
      updatedAt: nowIso,
    };

    setLocalGuides((prev) =>
      prev.map((g) => (g.id === guide.id ? updated : g))
    );
    if (!isUnimplementedStub(onUpdateGuide)) {
      onUpdateGuide?.(guide.id, updated);
    }
    if (invitePreviewInfo?.guide.id === guide.id) {
      setInvitePreviewInfo(null);
    }
    toast.success(
      `[Mô phỏng] HDV ${guide.name} đã tự đặt mật khẩu thành công. Tài khoản chuyển sang "Đã kích hoạt".`
    );
  };

  const handleOpenAccountStatusDialog = (guide: AgencyGuideProfile) => {
    const action =
      guide.mobileAccountStatus === "suspended" ? "reactivate" : "suspend";
    setSuspendReason(
      action === "suspend"
        ? guide.suspendedReason || "Tạm ngưng phân công theo kế hoạch nhân sự"
        : ""
    );
    setAccountActionTarget({ guide, action });
  };

  const handleConfirmAccountStatusChange = () => {
    if (!accountActionTarget) return;
    const { guide, action } = accountActionTarget;
    const assignments = getGuideAssignments(guide.id);
    const activeOrUpcoming = assignments.filter(
      (a) => a.status === "in_progress" || a.status === "upcoming"
    );

    // TODO: Integrate backend API `PATCH /api/agency/guides/:guideId/account-status` (UpdateGuideAccountStatusRequest)
    const _requestContract: UpdateGuideAccountStatusRequest = {
      guideId: guide.id,
      action,
      reason: suspendReason.trim() || undefined,
      confirmWithUpcomingTours: activeOrUpcoming.length > 0,
    };
    void _requestContract;

    const nowIso = new Date().toISOString();

    if (action === "suspend") {
      const previousStatus: Exclude<GuideMobileAccountStatus, "suspended"> =
        guide.mobileAccountStatus === "suspended"
          ? guide.previousAccountStatus || "active"
          : guide.mobileAccountStatus;

      const updated: AgencyGuideProfile = {
        ...guide,
        previousAccountStatus: previousStatus,
        mobileAccountStatus: "suspended",
        guideStatus: "inactive",
        suspendedAt: nowIso,
        suspendedReason:
          suspendReason.trim() || "Tạm khóa quyền truy cập ứng dụng Mobile",
        updatedAt: nowIso,
      };

      setLocalGuides((prev) =>
        prev.map((g) => (g.id === guide.id ? updated : g))
      );
      if (!isUnimplementedStub(onUpdateGuide)) {
        onUpdateGuide?.(guide.id, updated);
      }
      setAccountActionTarget(null);
      toast.success(
        `Đã tạm khóa tài khoản Mobile của HDV ${guide.name}. Không cho phép phân công tour mới.`
      );
    } else {
      const restoredStatus: Exclude<GuideMobileAccountStatus, "suspended"> =
        guide.previousAccountStatus ||
        (guide.activatedAt ? "active" : "pending_activation");

      const updated: AgencyGuideProfile = {
        ...guide,
        mobileAccountStatus: restoredStatus,
        guideStatus: "active",
        suspendedAt: undefined,
        suspendedReason: undefined,
        updatedAt: nowIso,
      };

      setLocalGuides((prev) =>
        prev.map((g) => (g.id === guide.id ? updated : g))
      );
      if (!isUnimplementedStub(onUpdateGuide)) {
        onUpdateGuide?.(guide.id, updated);
      }
      setAccountActionTarget(null);
      toast.success(
        `Đã mở khóa tài khoản của HDV ${guide.name} (Trạng thái: ${ACCOUNT_STATUS_BADGE[restoredStatus].label}).`
      );
    }
  };

  // ============================================================================
  // XÓA HỒ SƠ (CHẶN XÓA CỨNG NẾU ĐÃ CÓ LỊCH SỬ TOUR)
  // ============================================================================
  const handleConfirmRemoveGuide = () => {
    if (!deleteTargetGuide) return;
    const assignments = getGuideAssignments(deleteTargetGuide.id);

    if (assignments.length > 0) {
      toast.error(
        "Không thể xóa cứng HDV đã có lịch sử phân công tour. Vui lòng dùng tính năng Tạm khóa tài khoản."
      );
      return;
    }

    setLocalGuides((prev) =>
      prev.filter((g) => g.id !== deleteTargetGuide.id)
    );
    if (!isUnimplementedStub(onRemoveGuide)) {
      onRemoveGuide?.(deleteTargetGuide.id);
    }
    if (detailGuideId === deleteTargetGuide.id) {
      setDetailGuideId(null);
    }
    toast.success(
      `Đã xóa hồ sơ HDV ${deleteTargetGuide.name} (chưa có lịch sử dẫn tour).`
    );
    setDeleteTargetGuide(null);
  };

  // ============================================================================
  // KIỂM TRA ĐIỀU KIỆN PHÂN CÔNG & ĐIỀU HƯỚNG TỚI MÀN HÌNH ĐẶT TOUR
  // ============================================================================
  const handleNavigateAssignmentForGuide = (guide: AgencyGuideProfile) => {
    const eligibility = evaluateGuideEligibility(guide);
    if (!eligibility.canAssign) {
      toast.error(
        `Không thể phân công HDV ${guide.name}: ${eligibility.reasons.join(" ")}`
      );
      return;
    }

    if (onNavigateToBookings) {
      setDetailGuideId(null);
      onNavigateToBookings();
      toast.info(
        `Đang chuyển tới màn hình Đặt tour & Khách để phân công cho HDV ${guide.name}.`
      );
    } else {
      toast.info(
        `HDV ${guide.name} đủ điều kiện nhận đoàn. Hãy mở mục "Đặt tour & Khách" trên thanh menu để gán vào booking.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#075985] flex items-center gap-2.5">
              <Compass className="w-6 h-6 text-[#075985]" />
              Quản lý Đội ngũ Hướng dẫn viên
            </h2>
            <span className="text-xs font-semibold bg-[#F0F9FF] text-[#075985] border border-sky-200 px-2.5 py-0.5 rounded-full">
              Nội bộ {companyName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Quản lý hồ sơ nhân sự, thời hạn thẻ hành nghề, cấp quyền đăng nhập{" "}
            <strong className="text-[#075985]">Tour Guide Mobile App</strong> và
            theo dõi lịch dẫn đoàn độc lập của {companyName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          {agencyScopedGuides.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLocalGuides([])}
              className="text-xs border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
              title="Kiểm tra giao diện khi Agency chưa có HDV nào"
            >
              Xem thử Empty State
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLocalGuides(
                  buildInitialGuides(companyId, companyName, propGuides)
                )
              }
              className="text-xs border-sky-200 text-[#075985] bg-[#F0F9FF] hover:bg-[#E0F2FE] rounded-xl flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục dữ liệu mẫu
            </Button>
          )}

          <Button
            onClick={handleOpenAddModal}
            className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm HDV & Cấp tài khoản
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#F0F9FF] text-[#075985] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">
              Tổng HDV đội ngũ
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-bold text-slate-900">{metrics.total}</p>
              <span className="text-[11px] text-[#075985] font-medium">
                ({metrics.internationalCount} thẻ QT)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">
              Sẵn sàng nhận đoàn
            </p>
            <p className="text-xl font-bold text-emerald-600">
              {metrics.availableCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">
              Đang dẫn đoàn
            </p>
            <p className="text-xl font-bold text-amber-600">
              {metrics.onTourCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] flex items-center gap-3 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] text-[#075985] flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">
              Chưa / Chờ kích hoạt App
            </p>
            <p className="text-xl font-bold text-[#075985]">
              {metrics.pendingInviteCount}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] flex items-center gap-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium truncate">
              Cảnh báo thẻ / Tạm khóa
            </p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-bold text-rose-600">
                {metrics.licenseAlertCount}
              </p>
              <span className="text-[11px] text-slate-500">
                hạn thẻ • {metrics.suspendedCount} khóa TK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên HDV, email đăng nhập, số điện thoại hoặc số thẻ hành nghề..."
              className="pl-10 bg-[#F0F9FF]/60 border-[#CBD5E1] focus:bg-white rounded-xl text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                title="Xóa từ khóa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Toggle (Desktop) */}
          <div className="flex items-center justify-between lg:justify-end gap-2">
            <div className="flex items-center gap-1 border border-[#CBD5E1] p-1 rounded-xl bg-[#F0F9FF]/50 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#075985] text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-[#075985]"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Bảng chi tiết
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-[#075985] text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-[#075985]"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Thẻ nhân sự
              </button>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#075985]" />
            Bộ lọc:
          </span>

          {/* Lọc theo Trạng thái công việc */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-xs">
            {[
              { id: "all", label: "Mọi TT công việc" },
              { id: "available", label: "Sẵn sàng" },
              { id: "on_tour", label: "Đang dẫn đoàn" },
              { id: "unavailable", label: "Ngừng / Chưa khả dụng" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setWorkStatusFilter(item.id as "all" | GuideWorkStatus)
                }
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  workStatusFilter === item.id
                    ? "bg-white text-[#075985] shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Lọc theo Trạng thái tài khoản Mobile */}
          <select
            value={accountFilter}
            onChange={(e) =>
              setAccountFilter(
                e.target.value as "all" | GuideMobileAccountStatus
              )
            }
            aria-label="Lọc theo trạng thái tài khoản"
            className="text-xs bg-[#F0F9FF]/70 border border-[#CBD5E1] rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#075985]"
          >
            <option value="all">Tất cả TT tài khoản Mobile</option>
            <option value="active">TK: Đã kích hoạt</option>
            <option value="pending_activation">TK: Chờ kích hoạt</option>
            <option value="not_invited">TK: Chưa gửi lời mời</option>
            <option value="suspended">TK: Tạm khóa</option>
          </select>

          {/* Lọc theo Loại thẻ HDV */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value as "all" | "domestic" | "international"
              )
            }
            aria-label="Lọc theo loại thẻ HDV"
            className="text-xs bg-[#F0F9FF]/70 border border-[#CBD5E1] rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#075985]"
          >
            <option value="all">Tất cả loại thẻ HDV</option>
            <option value="international">Thẻ Quốc tế</option>
            <option value="domestic">Thẻ Nội địa</option>
          </select>

          {/* Lọc nhanh Cảnh báo hạn thẻ */}
          <button
            type="button"
            onClick={() =>
              setLicenseAlertFilter((prev) =>
                prev === "all" ? "expiring_or_expired" : "all"
              )
            }
            className={`text-xs px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              licenseAlertFilter === "expiring_or_expired"
                ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                : "bg-white text-slate-600 border-[#CBD5E1] hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Thẻ sắp / đã hết hạn ({metrics.licenseAlertCount})
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-[#EA580C] hover:underline font-semibold ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EMPTY STATES: 1. CHƯA CÓ HDV vs 2. BỘ LỌC KHÔNG CÓ KẾT QUẢ           */}
      {/* ==================================================================== */}
      {agencyScopedGuides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD5E1] p-12 text-center shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F9FF] text-[#075985] flex items-center justify-center mx-auto mb-4 border border-sky-200">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Đội ngũ {companyName} chưa có Hướng dẫn viên nào
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1.5">
            Hãy đăng ký hồ sơ nhân sự hướng dẫn viên nội bộ và gửi lời mời kích
            hoạt để họ đăng nhập ứng dụng di động{" "}
            <strong>TripOps Tour Guide</strong>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button
              onClick={handleOpenAddModal}
              className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm Hướng dẫn viên đầu tiên
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLocalGuides(
                  buildInitialGuides(companyId, companyName, propGuides)
                )
              }
              className="rounded-xl border-[#CBD5E1] text-[#075985] hover:bg-[#F0F9FF] flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Nạp dữ liệu mẫu kiểm thử (7 HDV)
            </Button>
          </div>
        </div>
      ) : filteredGuides.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#CBD5E1] p-12 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Không tìm thấy hướng dẫn viên phù hợp với bộ lọc
          </h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
            Không có hồ sơ HDV nào khớp với từ khóa hoặc tổ hợp bộ lọc trạng
            thái hiện tại.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilters}
              className="rounded-xl border-[#CBD5E1] text-[#075985] hover:bg-[#F0F9FF] text-xs font-semibold"
            >
              Xóa bộ lọc & Xem tất cả ({agencyScopedGuides.length} HDV)
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ================================================================ */}
          {/* DESKTOP TABLE VIEW (Hiển thị trên màn hình >= lg khi chọn Table) */}
          {/* ================================================================ */}
          {viewMode === "table" && (
            <div className="hidden lg:block bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#F0F9FF] text-[11px] font-bold text-[#075985] uppercase border-b border-[#CBD5E1] tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">
                        Hướng dẫn viên
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Email & Điện thoại
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Thẻ HDV & Hạn thẻ
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Ngôn ngữ & Tuyến
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        TT Tài khoản Mobile
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        TT Công việc
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Tour được phân công
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGuides.map((guide) => {
                      const assignments = getGuideAssignments(guide.id);
                      const workInfo = deriveGuideWorkInfo(guide, assignments);
                      const licenseCheck = evaluateLicenseExpiry(
                        guide.licenseExpiryDate
                      );
                      const eligibility = evaluateGuideEligibility(guide);
                      const accBadge =
                        ACCOUNT_STATUS_BADGE[guide.mobileAccountStatus];
                      const workBadge = WORK_STATUS_BADGE[workInfo.workStatus];
                      const nextUpcoming = workInfo.upcomingAssignments[0];

                      return (
                        <tr
                          key={guide.id}
                          className="hover:bg-[#F0F9FF]/40 transition-colors align-top"
                        >
                          {/* 1. Tên & Kinh nghiệm */}
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-3">
                              <img
                                src={
                                  guide.avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    guide.name
                                  )}&background=075985&color=fff`
                                }
                                alt={guide.name}
                                className="w-10 h-10 rounded-full object-cover border border-[#CBD5E1] shrink-0"
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailGuideId(guide.id);
                                    setDetailTab("profile");
                                  }}
                                  className="font-bold text-slate-900 hover:text-[#075985] text-left transition-colors cursor-pointer"
                                >
                                  {guide.name}
                                </button>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {guide.experienceYears} năm kinh nghiệm
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Email đăng nhập & SĐT */}
                          <td className="px-4 py-4">
                            <div className="space-y-1 text-xs">
                              <div
                                className="flex items-center gap-1.5 text-slate-800 font-medium"
                                title="Email đăng nhập Tour Guide App"
                              >
                                <Mail className="w-3.5 h-3.5 text-[#075985] shrink-0" />
                                <span className="truncate max-w-[180px]">
                                  {guide.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{guide.phone || "Chưa cập nhật"}</span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Loại thẻ, Số thẻ & Hạn thẻ */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                    guide.guideType === "international"
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                      : "bg-sky-50 text-[#075985] border-sky-200"
                                  }`}
                                >
                                  {guide.guideType === "international"
                                    ? "Thẻ Quốc tế"
                                    : "Thẻ Nội địa"}
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-800">
                                  {guide.licenseNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span>
                                  Hạn: {formatDateVN(guide.licenseExpiryDate)}
                                </span>
                              </div>

                              {licenseCheck.status === "expired" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3" />
                                  {licenseCheck.label}
                                </span>
                              )}
                              {licenseCheck.status === "expiring_soon" && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md">
                                  <AlertTriangle className="w-3 h-3" />
                                  {licenseCheck.label}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. Ngôn ngữ & Tuyến */}
                          <td className="px-4 py-4 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {guide.languages.map((lang) => (
                                <span
                                  key={lang}
                                  className="bg-[#F0F9FF] text-[#075985] border border-sky-200 text-[11px] px-2 py-0.5 rounded-md font-medium"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                            {guide.routes && guide.routes.length > 0 && (
                              <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-1">
                                Tuyến: {guide.routes.join(", ")}
                              </p>
                            )}
                          </td>

                          {/* 5. Trạng thái tài khoản Mobile */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${accBadge.bg} ${accBadge.text} ${accBadge.border}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${accBadge.dot}`}
                                />
                                {accBadge.label}
                              </span>
                              <p className="text-[11px] text-slate-500">
                                {accBadge.shortDesc}
                              </p>
                              {(guide.mobileAccountStatus === "not_invited" ||
                                guide.mobileAccountStatus ===
                                  "pending_activation") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendOrResendInvitation(guide)
                                  }
                                  className="text-[11px] font-semibold text-[#075985] hover:text-[#EA580C] flex items-center gap-1 pt-0.5 cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  {guide.mobileAccountStatus === "not_invited"
                                    ? "Gửi lời mời ngay"
                                    : "Gửi lại lời mời"}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 6. Trạng thái công việc */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${workBadge.bg} ${workBadge.text} ${workBadge.border}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${workBadge.dot}`}
                                />
                                {workInfo.workLabel}
                              </span>
                              <p className="text-[11px] text-slate-500">
                                {workInfo.workSubLabel}
                              </p>
                              {!eligibility.canAssign && (
                                <p className="text-[11px] text-rose-600 font-medium">
                                  Khóa phân công mới
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 7. Tour đang được phân công */}
                          <td className="px-4 py-4 max-w-[230px]">
                            {workInfo.activeAssignment ? (
                              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] font-bold text-amber-800">
                                    {workInfo.activeAssignment.bookingCode}
                                  </span>
                                  <span className="text-[10px] font-semibold text-amber-700">
                                    Đang chạy
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-900 line-clamp-1 mt-0.5">
                                  {workInfo.activeAssignment.tourName}
                                </p>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  {formatDateVN(
                                    workInfo.activeAssignment.startDate
                                  )}{" "}
                                  –{" "}
                                  {formatDateVN(
                                    workInfo.activeAssignment.endDate
                                  )}
                                </p>
                              </div>
                            ) : nextUpcoming ? (
                              <div className="bg-[#F0F9FF] border border-sky-200 rounded-xl p-2.5 text-xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] font-bold text-[#075985]">
                                    {nextUpcoming.bookingCode}
                                  </span>
                                  <span className="text-[10px] font-semibold text-[#075985]">
                                    Sắp khởi hành
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-900 line-clamp-1 mt-0.5">
                                  {nextUpcoming.tourName}
                                </p>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  KH: {formatDateVN(nextUpcoming.startDate)}
                                </p>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400">
                                Chưa có lịch đang chạy
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setDetailGuideId(guide.id);
                                setDetailTab("schedule");
                              }}
                              className="mt-1.5 text-[11px] font-semibold text-[#075985] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3 h-3" />
                              Xem lịch ({assignments.length} chuyến)
                            </button>
                          </td>

                          {/* 8. Thao tác */}
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailGuideId(guide.id);
                                  setDetailTab("profile");
                                }}
                                className="p-1.5 hover:bg-[#F0F9FF] text-[#075985] rounded-lg transition-colors cursor-pointer"
                                title="Xem chi tiết hồ sơ & lịch tour"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(guide)}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa hồ sơ nhân sự"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {(guide.mobileAccountStatus === "not_invited" ||
                                guide.mobileAccountStatus ===
                                  "pending_activation") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendOrResendInvitation(guide)
                                  }
                                  className="p-1.5 hover:bg-sky-50 text-[#0284C7] rounded-lg transition-colors cursor-pointer"
                                  title={
                                    guide.mobileAccountStatus === "not_invited"
                                      ? "Gửi lời mời kích hoạt Mobile App"
                                      : "Gửi lại lời mời kích hoạt"
                                  }
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenAccountStatusDialog(guide)
                                }
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  guide.mobileAccountStatus === "suspended"
                                    ? "text-emerald-600 hover:bg-emerald-50"
                                    : "text-amber-600 hover:bg-amber-50"
                                }`}
                                title={
                                  guide.mobileAccountStatus === "suspended"
                                    ? "Mở khóa tài khoản Mobile"
                                    : "Tạm khóa tài khoản Mobile"
                                }
                              >
                                {guide.mobileAccountStatus === "suspended" ? (
                                  <Unlock className="w-4 h-4" />
                                ) : (
                                  <Lock className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTargetGuide(guide)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Xóa / Hủy liên kết hồ sơ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 bg-[#F0F9FF]/70 border-t border-[#CBD5E1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Hiển thị <strong>{filteredGuides.length}</strong> /{" "}
                  {agencyScopedGuides.length} hướng dẫn viên thuộc đội ngũ{" "}
                  <strong>{companyName}</strong>
                </span>
                <span>
                  Chỉ HDV có tài khoản <strong>Đã kích hoạt</strong> và{" "}
                  <strong>Thẻ còn hạn</strong> mới được phép phân công dẫn đoàn.
                </span>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* RESPONSIVE CARDS VIEW (Luôn hiện trên < lg, hoặc khi chọn Cards)  */}
          {/* ================================================================ */}
          <div
            className={`${
              viewMode === "table" ? "lg:hidden" : "block"
            } grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`}
          >
            {filteredGuides.map((guide) => {
              const assignments = getGuideAssignments(guide.id);
              const workInfo = deriveGuideWorkInfo(guide, assignments);
              const licenseCheck = evaluateLicenseExpiry(
                guide.licenseExpiryDate
              );
              const eligibility = evaluateGuideEligibility(guide);
              const accBadge = ACCOUNT_STATUS_BADGE[guide.mobileAccountStatus];
              const workBadge = WORK_STATUS_BADGE[workInfo.workStatus];
              const featuredTour =
                workInfo.activeAssignment || workInfo.upcomingAssignments[0];

              return (
                <div
                  key={guide.id}
                  className="bg-white rounded-2xl border border-[#CBD5E1] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-5 space-y-3.5">
                    {/* Card Header: Avatar, Tên, Loại thẻ */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            guide.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              guide.name
                            )}&background=075985&color=fff`
                          }
                          alt={guide.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#E0F2FE] shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailGuideId(guide.id);
                              setDetailTab("profile");
                            }}
                            className="font-bold text-slate-900 hover:text-[#075985] text-base leading-tight truncate block text-left cursor-pointer"
                          >
                            {guide.name}
                          </button>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-[#075985]" />
                            {guide.guideType === "international"
                              ? "Thẻ Quốc tế"
                              : "Thẻ Nội địa"}{" "}
                            • {guide.experienceYears} năm KN
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hai trạng thái riêng biệt: Trạng thái Công việc & Trạng thái Tài khoản */}
                    <div className="grid grid-cols-2 gap-2 bg-[#F0F9FF]/60 p-2.5 rounded-xl border border-sky-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                          TT Công việc
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${workBadge.bg} ${workBadge.text} ${workBadge.border}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${workBadge.dot}`}
                          />
                          {workInfo.workLabel}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                          TT Tài khoản App
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${accBadge.bg} ${accBadge.text} ${accBadge.border}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${accBadge.dot}`}
                          />
                          {accBadge.label}
                        </span>
                      </div>
                    </div>

                    {/* Thông tin thẻ, hạn thẻ, email, SĐT */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Số thẻ HDV:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {guide.licenseNumber}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Hạn thẻ:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">
                            {formatDateVN(guide.licenseExpiryDate)}
                          </span>
                          {licenseCheck.status === "expired" && (
                            <span className="bg-rose-100 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              Đã hết hạn
                            </span>
                          )}
                          {licenseCheck.status === "expiring_soon" && (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {licenseCheck.shortLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Email App:</span>
                        <span className="font-medium text-slate-900 truncate max-w-[180px]">
                          {guide.email}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">Điện thoại:</span>
                        <span className="font-medium text-slate-900">
                          {guide.phone}
                        </span>
                      </div>
                    </div>

                    {/* Ngôn ngữ & Tuyến sở trường */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1 items-center">
                        <Globe className="w-3.5 h-3.5 text-[#075985] mr-1 shrink-0" />
                        {guide.languages.map((lang) => (
                          <span
                            key={lang}
                            className="bg-[#F0F9FF] text-[#075985] border border-sky-200 text-[11px] px-2 py-0.5 rounded-md font-medium"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                      {guide.routes && guide.routes.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center">
                          <MapPin className="w-3.5 h-3.5 text-[#EA580C] mr-1 shrink-0" />
                          {guide.routes.map((route) => (
                            <span
                              key={route}
                              className="bg-orange-50 text-[#EA580C] border border-orange-200 text-[11px] px-2 py-0.5 rounded-md font-medium"
                            >
                              {route}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tour đang được phân công */}
                    <div className="pt-1">
                      {featuredTour ? (
                        <div
                          className={`p-2.5 rounded-xl border text-xs ${
                            featuredTour.status === "in_progress"
                              ? "bg-amber-50/70 border-amber-200"
                              : "bg-[#F0F9FF] border-sky-200"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-[#075985] font-mono">
                              {featuredTour.bookingCode}
                            </span>
                            <span
                              className={
                                featuredTour.status === "in_progress"
                                  ? "text-amber-800"
                                  : "text-[#075985]"
                              }
                            >
                              {featuredTour.status === "in_progress"
                                ? "Đang dẫn đoàn"
                                : "Lịch sắp tới"}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 line-clamp-1 mt-0.5">
                            {featuredTour.tourName}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {formatDateVN(featuredTour.startDate)} –{" "}
                            {formatDateVN(featuredTour.endDate)} (
                            {featuredTour.guestCount} khách)
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                          Hiện không có tour đang chạy ({assignments.length}{" "}
                          chuyến trong lịch sử)
                        </div>
                      )}
                    </div>

                    {!eligibility.canAssign && (
                      <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 text-[11px] text-rose-700 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Không thể phân công:</strong>{" "}
                          {eligibility.primaryBlocker}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="bg-slate-50 border-t border-slate-200/80 px-4 py-3 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailGuideId(guide.id);
                        setDetailTab("schedule");
                      }}
                      className="text-[#075985] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Chi tiết & Lịch ({assignments.length})
                    </button>

                    <div className="flex items-center gap-1">
                      {(guide.mobileAccountStatus === "not_invited" ||
                        guide.mobileAccountStatus === "pending_activation") && (
                        <button
                          type="button"
                          onClick={() => handleSendOrResendInvitation(guide)}
                          className="px-2 py-1 bg-[#E0F2FE] hover:bg-sky-200 text-[#075985] rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Gửi lời mời kích hoạt"
                        >
                          <Send className="w-3 h-3" />
                          {guide.mobileAccountStatus === "not_invited"
                            ? "Mời"
                            : "Gửi lại"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(guide)}
                        className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa hồ sơ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAccountStatusDialog(guide)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          guide.mobileAccountStatus === "suspended"
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-amber-600 hover:bg-amber-50"
                        }`}
                        title={
                          guide.mobileAccountStatus === "suspended"
                            ? "Mở khóa tài khoản"
                            : "Tạm khóa tài khoản"
                        }
                      >
                        {guide.mobileAccountStatus === "suspended" ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTargetGuide(guide)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                        title="Xóa hồ sơ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: THÊM MỚI / CẬP NHẬT HƯỚNG DẪN VIÊN & CẤP TÀI KHOẢN MOBILE   */}
      {/* ==================================================================== */}
      <Dialog
        open={isFormModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormModalOpen(false);
            setEditingGuide(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl bg-white max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-[#CBD5E1]">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 bg-[#F0F9FF]/60 shrink-0">
            <DialogTitle className="text-lg font-bold text-[#075985] flex items-center gap-2">
              {editingGuide ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#075985]" />
                  Cập nhật Hồ sơ Hướng dẫn viên: {editingGuide.name}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-[#075985]" />
                  Đăng ký Hướng dẫn viên & Cấp tài khoản Tour Guide App
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-1">
              {editingGuide
                ? "Chỉnh sửa thông tin nhân sự, thẻ hành nghề và trạng thái tài khoản. Thay đổi hồ sơ không làm xáo trộn lịch sử các tour đã phân công."
                : `Đăng ký nhân sự thuộc đội ngũ ${companyName}. Hệ thống gửi lời mời kích hoạt qua email để HDV tự thiết lập mật khẩu bảo mật.`}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitForm}
            noValidate
            className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
          >
            {/* NHÓM 1: THÔNG TIN CÁ NHÂN & ĐĂNG NHẬP */}
            <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#075985] flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                1. Thông tin cá nhân & Định danh đăng nhập
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Họ và tên Hướng dẫn viên{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formErrors.name)
                        setFormErrors({ ...formErrors, name: undefined });
                    }}
                    placeholder="VD: Nguyễn Văn Hùng"
                    className={`mt-1 text-sm bg-white ${
                      formErrors.name ? "border-rose-500 focus:ring-rose-500" : ""
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Email đăng nhập Mobile App{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email)
                        setFormErrors({ ...formErrors, email: undefined });
                    }}
                    placeholder="hdv.hung@viettravel.com.vn"
                    className={`mt-1 text-sm bg-white ${
                      formErrors.email
                        ? "border-rose-500 focus:ring-rose-500"
                        : ""
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Số điện thoại liên hệ{" "}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (formErrors.phone)
                        setFormErrors({ ...formErrors, phone: undefined });
                    }}
                    placeholder="0912345678"
                    className={`mt-1 text-sm bg-white ${
                      formErrors.phone
                        ? "border-rose-500 focus:ring-rose-500"
                        : ""
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* NHÓM 2: HỒ SƠ NGHIỆP VỤ & THẺ HÀNH NGHỀ */}
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#075985] flex items-center gap-1.5">
                <FileBadge className="w-4 h-4" />
                2. Nghiệp vụ & Thẻ hành nghề HDV
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Loại thẻ hành nghề <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={guideType}
                    onChange={(e) =>
                      setGuideType(
                        e.target.value as "domestic" | "international"
                      )
                    }
                    className="mt-1 w-full text-sm border border-slate-200 rounded-lg p-2 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#075985]"
                  >
                    <option value="domestic">Thẻ Hướng dẫn viên Nội địa</option>
                    <option value="international">
                      Thẻ Hướng dẫn viên Quốc tế
                    </option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Số thẻ hành nghề <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value);
                      if (formErrors.licenseNumber)
                        setFormErrors({
                          ...formErrors,
                          licenseNumber: undefined,
                        });
                    }}
                    placeholder="VD: HDV-QT-2025-0102"
                    className={`mt-1 text-sm font-mono bg-white uppercase ${
                      formErrors.licenseNumber
                        ? "border-rose-500 focus:ring-rose-500"
                        : ""
                    }`}
                  />
                  {formErrors.licenseNumber && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.licenseNumber}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Ngày hết hạn thẻ <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={licenseExpiryDate}
                    onChange={(e) => {
                      setLicenseExpiryDate(e.target.value);
                      if (formErrors.licenseExpiryDate)
                        setFormErrors({
                          ...formErrors,
                          licenseExpiryDate: undefined,
                        });
                    }}
                    className={`mt-1 text-sm bg-white ${
                      formErrors.licenseExpiryDate
                        ? "border-rose-500 focus:ring-rose-500"
                        : ""
                    }`}
                  />
                  {formErrors.licenseExpiryDate && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.licenseExpiryDate}
                    </p>
                  )}
                  {!formErrors.licenseExpiryDate && licenseExpiryDate && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Trạng thái hạn thẻ:{" "}
                      <strong>
                        {evaluateLicenseExpiry(licenseExpiryDate).label}
                      </strong>
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Số năm kinh nghiệm <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={experienceYears}
                    onChange={(e) => {
                      setExperienceYears(e.target.value);
                      if (formErrors.experienceYears)
                        setFormErrors({
                          ...formErrors,
                          experienceYears: undefined,
                        });
                    }}
                    className={`mt-1 text-sm bg-white ${
                      formErrors.experienceYears
                        ? "border-rose-500 focus:ring-rose-500"
                        : ""
                    }`}
                  />
                  {formErrors.experienceYears && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.experienceYears}
                    </p>
                  )}
                </div>
              </div>

              {/* Ngôn ngữ dạng Tag / Multi-select */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Ngôn ngữ hướng dẫn (Chọn nhanh hoặc thêm tag){" "}
                  <span className="text-rose-500">*</span>
                </Label>

                {/* Các ngôn ngữ đã chọn */}
                <div className="flex flex-wrap gap-1.5 mt-1.5 min-h-[34px] p-2 bg-white rounded-xl border border-slate-200">
                  {selectedLanguages.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Chưa chọn ngôn ngữ nào...
                    </span>
                  ) : (
                    selectedLanguages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 bg-[#075985] text-white text-xs font-medium px-2.5 py-1 rounded-lg"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLanguages(
                              selectedLanguages.filter((l) => l !== lang)
                            )
                          }
                          className="hover:text-amber-200 cursor-pointer"
                          title={`Bỏ ${lang}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Gợi ý chọn nhanh ngôn ngữ */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {COMMON_GUIDE_LANGUAGES.map((lang) => {
                    const active = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          toggleItemInList(
                            lang,
                            selectedLanguages,
                            setSelectedLanguages
                          );
                          if (formErrors.languages)
                            setFormErrors({
                              ...formErrors,
                              languages: undefined,
                            });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? "bg-[#E0F2FE] text-[#075985] border-sky-300 font-semibold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {lang}
                      </button>
                    );
                  })}
                </div>

                {/* Ô nhập thêm ngôn ngữ khác */}
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customLanguageInput}
                    onChange={(e) => setCustomLanguageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag(
                          customLanguageInput,
                          selectedLanguages,
                          setSelectedLanguages,
                          () => setCustomLanguageInput("")
                        );
                        if (formErrors.languages)
                          setFormErrors({
                            ...formErrors,
                            languages: undefined,
                          });
                      }
                    }}
                    placeholder="Nhập thêm ngôn ngữ khác rồi nhấn Enter..."
                    className="text-xs bg-white h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addCustomTag(
                        customLanguageInput,
                        selectedLanguages,
                        setSelectedLanguages,
                        () => setCustomLanguageInput("")
                      );
                      if (formErrors.languages)
                        setFormErrors({ ...formErrors, languages: undefined });
                    }}
                    className="h-8 text-xs shrink-0"
                  >
                    Thêm tag
                  </Button>
                </div>

                {formErrors.languages && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formErrors.languages}
                  </p>
                )}
              </div>

              {/* Tuyến / Địa bàn hoạt động (Multi-select Tags) */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Tuyến / Địa bàn phụ trách
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COMMON_GUIDE_ROUTES.map((route) => {
                    const active = selectedRoutes.includes(route);
                    return (
                      <button
                        key={route}
                        type="button"
                        onClick={() =>
                          toggleItemInList(
                            route,
                            selectedRoutes,
                            setSelectedRoutes
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? "bg-orange-50 text-[#EA580C] border-orange-300 font-semibold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {route}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customRouteInput}
                    onChange={(e) => setCustomRouteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag(
                          customRouteInput,
                          selectedRoutes,
                          setSelectedRoutes,
                          () => setCustomRouteInput("")
                        );
                      }
                    }}
                    placeholder="Thêm tuyến/địa bàn khác..."
                    className="text-xs bg-white h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addCustomTag(
                        customRouteInput,
                        selectedRoutes,
                        setSelectedRoutes,
                        () => setCustomRouteInput("")
                      )
                    }
                    className="h-8 text-xs shrink-0"
                  >
                    Thêm tuyến
                  </Button>
                </div>
              </div>

              {/* Kỹ năng sở trường (Multi-select Tags) */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Kỹ năng nghiệp vụ sở trường
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {COMMON_GUIDE_SPECIALTIES.map((spec) => {
                    const active = selectedSpecialties.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() =>
                          toggleItemInList(
                            spec,
                            selectedSpecialties,
                            setSelectedSpecialties
                          )
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          active
                            ? "bg-[#E0F2FE] text-[#075985] border-sky-300 font-semibold"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {spec}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customSpecialtyInput}
                    onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag(
                          customSpecialtyInput,
                          selectedSpecialties,
                          setSelectedSpecialties,
                          () => setCustomSpecialtyInput("")
                        );
                      }
                    }}
                    placeholder="Thêm kỹ năng khác..."
                    className="text-xs bg-white h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addCustomTag(
                        customSpecialtyInput,
                        selectedSpecialties,
                        setSelectedSpecialties,
                        () => setCustomSpecialtyInput("")
                      )
                    }
                    className="h-8 text-xs shrink-0"
                  >
                    Thêm kỹ năng
                  </Button>
                </div>
              </div>
            </div>

            {/* NHÓM 3: TÀI KHOẢN ỨNG DỤNG MOBILE (TOUR GUIDE APP) */}
            <div className="space-y-3 bg-[#F0F9FF] p-4 rounded-xl border border-sky-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#075985] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                3. Tài khoản ứng dụng Mobile (Tour Guide App)
              </h3>

              {!editingGuide ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Cơ chế bảo mật không mật khẩu mặc định:</strong> Hệ
                    thống không khởi tạo mật khẩu cố định. Sau khi tạo hồ sơ, hệ
                    thống phát hành liên kết kích hoạt có thời hạn (48 giờ) gửi
                    tới email để Hướng dẫn viên tự thiết lập mật khẩu cá nhân.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        initialInviteMode === "send_invite"
                          ? "bg-white border-[#075985] ring-1 ring-[#075985]"
                          : "bg-white/60 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="inviteMode"
                        checked={initialInviteMode === "send_invite"}
                        onChange={() => setInitialInviteMode("send_invite")}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-bold text-[#075985]">
                          Tạo hồ sơ & Gửi lời mời kích hoạt ngay
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          Trạng thái tài khoản chuyển sang{" "}
                          <strong>Chờ kích hoạt</strong>.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        initialInviteMode === "save_only"
                          ? "bg-white border-[#075985] ring-1 ring-[#075985]"
                          : "bg-white/60 border-slate-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="inviteMode"
                        checked={initialInviteMode === "save_only"}
                        onChange={() => setInitialInviteMode("save_only")}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-bold text-slate-800">
                          Chỉ lưu hồ sơ nhân sự (Gửi lời mời sau)
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          Trạng thái tài khoản là{" "}
                          <strong>Chưa gửi lời mời</strong>.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Trạng thái tài khoản Mobile hiện tại
                  </Label>
                  <select
                    value={editAccountStatus}
                    onChange={(e) =>
                      setEditAccountStatus(
                        e.target.value as GuideMobileAccountStatus
                      )
                    }
                    className="w-full text-sm border border-sky-200 rounded-lg p-2 bg-white text-slate-800"
                  >
                    <option value="not_invited">Chưa gửi lời mời</option>
                    <option value="pending_activation">
                      Chờ kích hoạt (Đã gửi link qua email)
                    </option>
                    <option value="active">
                      Đã kích hoạt (Đang hoạt động)
                    </option>
                    <option value="suspended">
                      Tạm khóa (Ngừng đăng nhập & phân công)
                    </option>
                  </select>
                  <p className="text-[11px] text-slate-600">
                    Lưu ý: Chỉnh sửa hồ sơ nhân sự tại đây không tự động sửa đổi
                    dữ liệu lịch sử của các tour đã phân công.
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 bg-white sticky bottom-0 pb-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormModalOpen(false);
                  setEditingGuide(null);
                }}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold"
              >
                {editingGuide
                  ? "Lưu cập nhật hồ sơ"
                  : initialInviteMode === "send_invite"
                  ? "Tạo hồ sơ & Gửi lời mời (Mock)"
                  : "Lưu hồ sơ nhân sự"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: CHI TIẾT HỒ SƠ HDV, TÀI KHOẢN & LỊCH PHÂN CÔNG TOUR          */}
      {/* ==================================================================== */}
      <Dialog
        open={!!detailGuide}
        onOpenChange={(open) => !open && setDetailGuideId(null)}
      >
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-[#CBD5E1]">
          {detailGuide &&
            (() => {
              const assignments = getGuideAssignments(detailGuide.id);
              const workInfo = deriveGuideWorkInfo(detailGuide, assignments);
              const licenseCheck = evaluateLicenseExpiry(
                detailGuide.licenseExpiryDate
              );
              const eligibility = evaluateGuideEligibility(detailGuide);
              const accBadge =
                ACCOUNT_STATUS_BADGE[detailGuide.mobileAccountStatus];
              const workBadge = WORK_STATUS_BADGE[workInfo.workStatus];

              return (
                <>
                  {/* Header */}
                  <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 bg-[#F0F9FF]/60 shrink-0">
                    <div className="flex items-start justify-between gap-4 pr-6">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            detailGuide.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              detailGuide.name
                            )}&background=075985&color=fff`
                          }
                          alt={detailGuide.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                        />
                        <div>
                          <DialogTitle className="text-lg font-bold text-slate-900">
                            {detailGuide.name}
                          </DialogTitle>
                          <DialogDescription className="text-xs text-slate-600 mt-0.5">
                            {detailGuide.guideType === "international"
                              ? "Hướng dẫn viên Quốc tế"
                              : "Hướng dẫn viên Nội địa"}{" "}
                            • Mã thẻ:{" "}
                            <strong className="font-mono">
                              {detailGuide.licenseNumber}
                            </strong>{" "}
                            • {detailGuide.experienceYears} năm kinh nghiệm
                          </DialogDescription>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${workBadge.bg} ${workBadge.text} ${workBadge.border}`}
                            >
                              TT Công việc: {workInfo.workLabel}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${accBadge.bg} ${accBadge.text} ${accBadge.border}`}
                            >
                              TK Mobile: {accBadge.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mt-4 border-t border-sky-200/60 pt-3">
                      <button
                        type="button"
                        onClick={() => setDetailTab("profile")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          detailTab === "profile"
                            ? "bg-[#075985] text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:text-[#075985] border border-slate-200"
                        }`}
                      >
                        Hồ sơ & Tài khoản Mobile
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailTab("schedule")}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          detailTab === "schedule"
                            ? "bg-[#075985] text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:text-[#075985] border border-slate-200"
                        }`}
                      >
                        Lịch phân công & Lịch sử tour ({assignments.length})
                      </button>
                    </div>
                  </DialogHeader>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {detailTab === "profile" ? (
                      <>
                        {/* Trạng thái đủ điều kiện phân công */}
                        <div
                          className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                            eligibility.canAssign
                              ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                              : "bg-rose-50/80 border-rose-200 text-rose-900"
                          }`}
                        >
                          <div className="space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              {eligibility.canAssign ? (
                                <>
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  Đủ điều kiện phân công dẫn đoàn
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-rose-600" />
                                  Không đủ điều kiện phân công tour mới
                                </>
                              )}
                            </p>
                            {eligibility.canAssign ? (
                              <p className="text-emerald-700">
                                Tài khoản ứng dụng Mobile đã kích hoạt và thẻ
                                hành nghề còn hiệu lực (
                                {licenseCheck.shortLabel}).
                              </p>
                            ) : (
                              <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                                {eligibility.reasons.map((r, idx) => (
                                  <li key={idx}>{r}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Quản lý tài khoản Mobile App */}
                        <div className="bg-[#F0F9FF]/70 rounded-xl p-4 border border-sky-200 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[#075985]">
                                Tài khoản ứng dụng Tour Guide Mobile
                              </h4>
                              <p className="text-xs text-slate-600 mt-0.5">
                                Email đăng nhập:{" "}
                                <strong className="text-slate-900">
                                  {detailGuide.email}
                                </strong>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {(detailGuide.mobileAccountStatus ===
                                "not_invited" ||
                                detailGuide.mobileAccountStatus ===
                                  "pending_activation") && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleSendOrResendInvitation(detailGuide)
                                    }
                                    className="bg-[#075985] hover:bg-[#F97316] text-white text-xs h-8"
                                  >
                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                    {detailGuide.mobileAccountStatus ===
                                    "not_invited"
                                      ? "Gửi lời mời kích hoạt"
                                      : "Gửi lại lời mời"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleSimulateGuideCompletedActivation(
                                        detailGuide
                                      )
                                    }
                                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs h-8"
                                    title="Dùng để kiểm thử chuyển trạng thái sang Đã kích hoạt"
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    Mô phỏng HDV đã kích hoạt
                                  </Button>
                                </>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleOpenAccountStatusDialog(detailGuide)
                                }
                                className={`text-xs h-8 ${
                                  detailGuide.mobileAccountStatus ===
                                  "suspended"
                                    ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    : "border-amber-300 text-amber-800 hover:bg-amber-50"
                                }`}
                              >
                                {detailGuide.mobileAccountStatus ===
                                "suspended" ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 mr-1" />
                                    Mở khóa tài khoản
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 mr-1" />
                                    Tạm khóa tài khoản
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-sky-200/60 text-xs">
                            <div>
                              <span className="text-slate-500 block">
                                Lời mời gần nhất:
                              </span>
                              <span className="font-medium text-slate-800">
                                {formatDateTimeVN(detailGuide.invitationSentAt)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">
                                Thời điểm kích hoạt:
                              </span>
                              <span className="font-medium text-slate-800">
                                {formatDateTimeVN(detailGuide.activatedAt)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">
                                Đăng nhập gần nhất:
                              </span>
                              <span className="font-medium text-slate-800">
                                {formatDateTimeVN(detailGuide.lastLoginAt)}
                              </span>
                            </div>
                          </div>

                          {detailGuide.mobileAccountStatus === "suspended" &&
                            detailGuide.suspendedReason && (
                              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-800">
                                <strong>Lý do tạm khóa:</strong>{" "}
                                {detailGuide.suspendedReason}
                              </div>
                            )}
                        </div>

                        {/* Thông tin nghiệp vụ & Thẻ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-slate-400 block">
                              Số điện thoại:
                            </span>
                            <span className="font-semibold text-slate-900">
                              {detailGuide.phone}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">
                              Cơ quan cấp thẻ:
                            </span>
                            <span className="font-semibold text-slate-900">
                              {detailGuide.issuingAuthority ||
                                "Sở Du lịch / Cục Du lịch Quốc gia"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">
                              Hạn thẻ hành nghề:
                            </span>
                            <span className="font-semibold text-slate-900">
                              {formatDateVN(detailGuide.licenseExpiryDate)} (
                              {licenseCheck.label})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">
                              Ngôn ngữ hướng dẫn:
                            </span>
                            <span className="font-semibold text-[#075985]">
                              {detailGuide.languages.join(", ")}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-400 block">
                              Tuyến / Địa bàn sở trường:
                            </span>
                            <span className="font-medium text-slate-800">
                              {detailGuide.routes?.join(" • ") ||
                                "Chưa cập nhật"}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-slate-400 block">
                              Kỹ năng nghiệp vụ:
                            </span>
                            <span className="font-medium text-slate-800">
                              {detailGuide.specialties?.join(" • ") ||
                                "Chưa cập nhật"}
                            </span>
                          </div>
                          {detailGuide.bio && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block">
                                Ghi chú nhân sự:
                              </span>
                              <p className="text-slate-700 mt-0.5">
                                {detailGuide.bio}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      /* Tab Lịch phân công & Lịch sử dẫn đoàn */
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F0F9FF] p-3.5 rounded-xl border border-sky-200 text-xs">
                          <div>
                            <p className="font-bold text-[#075985]">
                              Điều phối & Phân công Hướng dẫn viên
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              Việc gán hoặc thay đổi HDV cho từng đoàn khách
                              được thực hiện tại màn hình{" "}
                              <strong>Đặt tour & Khách</strong>.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleNavigateAssignmentForGuide(detailGuide)
                            }
                            className="bg-[#075985] hover:bg-[#F97316] text-white text-xs shrink-0 flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Đi tới Phân công Tour
                          </Button>
                        </div>

                        {assignments.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Hướng dẫn viên này chưa có lịch phân công tour nào.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {assignments.map((item) => (
                              <div
                                key={item.id}
                                className="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-300 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-[#075985] bg-[#F0F9FF] px-2 py-0.5 rounded border border-sky-200">
                                      {item.bookingCode}
                                    </span>
                                    <span
                                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                        item.status === "in_progress"
                                          ? "bg-amber-100 text-amber-800"
                                          : item.status === "upcoming"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {item.status === "in_progress"
                                        ? "Đang dẫn đoàn"
                                        : item.status === "upcoming"
                                        ? "Sắp khởi hành"
                                        : "Đã hoàn thành"}
                                    </span>
                                    {item.stageName && (
                                      <span className="text-[11px] bg-orange-50 text-[#EA580C] px-2 py-0.5 rounded border border-orange-200 font-medium">
                                        {item.stageName}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-sm">
                                    {item.tourName}
                                  </h4>
                                  <p className="text-xs text-slate-600">
                                    Lịch trình:{" "}
                                    <strong>
                                      {formatDateVN(item.startDate)} –{" "}
                                      {formatDateVN(item.endDate)}
                                    </strong>{" "}
                                    • Đoàn {item.guestCount} khách (
                                    {item.customerName})
                                  </p>
                                  {item.notes && (
                                    <p className="text-[11px] text-slate-500 italic">
                                      Ghi chú: {item.notes}
                                    </p>
                                  )}
                                </div>

                                {onViewBookingDetail && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setDetailGuideId(null);
                                      onViewBookingDetail(item.bookingId);
                                    }}
                                    className="text-xs border-[#CBD5E1] text-[#075985] hover:bg-[#F0F9FF] shrink-0"
                                  >
                                    Mở đơn đặt tour
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTargetGuide(detailGuide)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Xóa / Hủy liên kết
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailGuideId(null)}
                      >
                        Đóng
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const target = detailGuide;
                          setDetailGuideId(null);
                          handleOpenEditModal(target);
                        }}
                        className="bg-[#075985] hover:bg-[#F97316] text-white text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Chỉnh sửa hồ sơ
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3: XÁC NHẬN TẠM KHÓA / MỞ KHÓA TÀI KHOẢN (CẢNH BÁO TOUR SẮP ĐI) */}
      {/* ==================================================================== */}
      <Dialog
        open={!!accountActionTarget}
        onOpenChange={(open) => !open && setAccountActionTarget(null)}
      >
        <DialogContent className="max-w-md bg-white rounded-2xl border border-[#CBD5E1]">
          {accountActionTarget &&
            (() => {
              const { guide, action } = accountActionTarget;
              const assignments = getGuideAssignments(guide.id);
              const activeOrUpcoming = assignments.filter(
                (a) => a.status === "in_progress" || a.status === "upcoming"
              );

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      {action === "suspend" ? (
                        <>
                          <Lock className="w-5 h-5 text-amber-600" />
                          Xác nhận Tạm khóa Tài khoản HDV
                        </>
                      ) : (
                        <>
                          <Unlock className="w-5 h-5 text-emerald-600" />
                          Mở khóa Tài khoản Mobile HDV
                        </>
                      )}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-600 mt-1">
                      Hướng dẫn viên: <strong>{guide.name}</strong> (
                      {guide.email})
                    </DialogDescription>
                  </DialogHeader>

                  {action === "suspend" ? (
                    <div className="space-y-3 mt-2 text-xs">
                      {activeOrUpcoming.length > 0 && (
                        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-900 space-y-1.5">
                          <p className="font-bold flex items-center gap-1.5 text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            Cảnh báo: HDV đang có {activeOrUpcoming.length} lịch
                            tour đang/sắp diễn ra!
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-[11px]">
                            {activeOrUpcoming.map((t) => (
                              <li key={t.id}>
                                <strong>{t.bookingCode}</strong> – {t.tourName}{" "}
                                (KH: {formatDateVN(t.startDate)})
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-amber-800 pt-1">
                            Nếu tạm khóa tài khoản, HDV sẽ không thể đăng nhập
                            ứng dụng Mobile để điểm danh khách. Hãy nhớ điều
                            phối HDV thay thế tại mục{" "}
                            <strong>Đặt tour & Khách</strong>.
                          </p>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs font-semibold text-slate-700">
                          Lý do tạm khóa tài khoản
                        </Label>
                        <Textarea
                          rows={2}
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          placeholder="VD: Nghỉ phép cá nhân / Chờ gia hạn thẻ hành nghề..."
                          className="mt-1 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 mt-2">
                      Khôi phục quyền đăng nhập ứng dụng Mobile cho{" "}
                      <strong>{guide.name}</strong>. Nếu thẻ hành nghề còn hạn,
                      HDV có thể được phân công dẫn đoàn trở lại.
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAccountActionTarget(null)}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmAccountStatusChange}
                      className={
                        action === "suspend"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }
                    >
                      {action === "suspend"
                        ? "Xác nhận tạm khóa"
                        : "Mở khóa ngay"}
                    </Button>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4: XÁC NHẬN XÓA HỒ SƠ (CHẶN XÓA CỨNG KHI ĐÃ CÓ LỊCH SỬ TOUR)    */}
      {/* ==================================================================== */}
      <Dialog
        open={!!deleteTargetGuide}
        onOpenChange={(open) => !open && setDeleteTargetGuide(null)}
      >
        <DialogContent className="max-w-md bg-white rounded-2xl border border-[#CBD5E1]">
          {deleteTargetGuide &&
            (() => {
              const assignments = getGuideAssignments(deleteTargetGuide.id);
              const hasTourHistory = assignments.length > 0;

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <AlertCircle
                        className={`w-5 h-5 ${
                          hasTourHistory ? "text-amber-600" : "text-rose-600"
                        }`}
                      />
                      {hasTourHistory
                        ? "Không thể xóa cứng Hướng dẫn viên đã có lịch sử tour"
                        : "Xác nhận xóa hồ sơ Hướng dẫn viên"}
                    </DialogTitle>
                  </DialogHeader>

                  {hasTourHistory ? (
                    <div className="space-y-3 text-xs text-slate-600 mt-1">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900">
                        Hướng dẫn viên <strong>{deleteTargetGuide.name}</strong>{" "}
                        đã có <strong>{assignments.length} chuyến tour</strong>{" "}
                        trong lịch sử điều hành của công ty. Để bảo toàn dữ liệu
                        đối soát, điểm danh và biên bản sự cố, hệ thống{" "}
                        <strong>không cho phép xóa cứng</strong> hồ sơ này.
                      </div>
                      <p>
                        Thay vào đó, bạn có thể chuyển tài khoản sang trạng thái{" "}
                        <strong>Tạm khóa</strong> để ngừng cấp quyền truy cập
                        ứng dụng và ngừng phân công tour mới.
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTargetGuide(null)}
                        >
                          Đóng
                        </Button>
                        {deleteTargetGuide.mobileAccountStatus !==
                          "suspended" && (
                          <Button
                            size="sm"
                            className="bg-[#075985] hover:bg-[#F97316] text-white"
                            onClick={() => {
                              const target = deleteTargetGuide;
                              setDeleteTargetGuide(null);
                              handleOpenAccountStatusDialog(target);
                            }}
                          >
                            <Lock className="w-3.5 h-3.5 mr-1.5" />
                            Chuyển sang Tạm khóa tài khoản
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs text-slate-600 mt-1">
                      <p>
                        Hồ sơ của <strong>{deleteTargetGuide.name}</strong> (
                        {deleteTargetGuide.email}) chưa phát sinh lịch sử dẫn
                        tour nào. Bạn có chắc chắn muốn xóa hồ sơ này khỏi danh
                        sách của {companyName}?
                      </p>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTargetGuide(null)}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="sm"
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={handleConfirmRemoveGuide}
                        >
                          Xác nhận xóa hồ sơ
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 5: THÔNG BÁO MÔ PHỎNG LỜI MỜI KÍCH HOẠT QUA EMAIL              */}
      {/* ==================================================================== */}
      <Dialog
        open={!!invitePreviewInfo}
        onOpenChange={(open) => !open && setInvitePreviewInfo(null)}
      >
        <DialogContent className="max-w-md bg-white rounded-2xl border border-[#CBD5E1]">
          {invitePreviewInfo && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#075985] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#075985]" />
                  {invitePreviewInfo.isResend
                    ? "Đã tạo lại lời mời kích hoạt (Mô phỏng FE)"
                    : "Đã khởi tạo lời mời kích hoạt (Mô phỏng FE)"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 mt-1">
                  Trạng thái mô phỏng luồng bảo mật khi chưa tích hợp dịch vụ
                  gửi email từ Backend.
                </DialogDescription>
              </DialogHeader>

              <div className="bg-[#F0F9FF] border border-sky-200 rounded-xl p-3.5 text-xs space-y-2 text-slate-700">
                <p>
                  <strong>Người nhận:</strong> {invitePreviewInfo.guide.name} (
                  <span className="font-mono text-[#075985]">
                    {invitePreviewInfo.guide.email}
                  </span>
                  )
                </p>
                <p>
                  <strong>Trạng thái tài khoản:</strong>{" "}
                  <span className="font-semibold text-[#075985]">
                    Chờ kích hoạt (pending_activation)
                  </span>
                </p>
                <p>
                  <strong>Hiệu lực liên kết đặt mật khẩu:</strong> Đến{" "}
                  {formatDateTimeVN(invitePreviewInfo.expiresAt)} (48 giờ)
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-sky-100 text-[11px] text-slate-600">
                  <strong>Quy trình thực tế khi nối API Backend:</strong> Hệ
                  thống gửi email chứa one-time token tới{" "}
                  <code>{invitePreviewInfo.guide.email}</code>. Hướng dẫn viên
                  mở liên kết và tự đặt mật khẩu riêng để đăng nhập ứng dụng{" "}
                  <strong>TripOps Tour Guide</strong> (Agency không biết và
                  không lưu mật khẩu của HDV).
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleSimulateGuideCompletedActivation(
                      invitePreviewInfo.guide
                    )
                  }
                  className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Mô phỏng HDV đã đặt mật khẩu
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setInvitePreviewInfo(null)}
                  className="bg-[#075985] hover:bg-[#F97316] text-white text-xs"
                >
                  Đã hiểu
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
