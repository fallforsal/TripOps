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
  Upload,
  Camera,
  Languages,
  UserPlus,
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
  EyeOff,
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
  KeyRound,
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

export const COMMON_GUIDE_PROVINCES = [
  "Lâm Đồng",
  "Khánh Hòa",
  "Đà Nẵng",
  "Quảng Nam",
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Kiên Giang",
  "Lào Cai",
  "Thừa Thiên Huế",
  "Ninh Bình",
  "Quảng Ninh",
  "Bình Thuận",
  "Bà Rịa - Vũng Tàu",
  "Cần Thơ",
  "Hà Giang",
  "Phú Yên",
  "Bình Định",
];

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
  password?: string;
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

  // Modal Đổi mật khẩu cho HDV (Admin trực tiếp cập nhật khi HDV quên)
  const [changePasswordTarget, setChangePasswordTarget] =
    useState<AgencyGuideProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");

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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState("");

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Kích thước ảnh đại diện tối đa là 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };
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
        (guide.phone && guide.phone.replace(/\s+/g, "").includes(q.replace(/\s+/g, "")));

      const assignments = getGuideAssignments(guide.id);
      const workInfo = deriveGuideWorkInfo(guide, assignments);
      const matchesWorkStatus =
        workStatusFilter === "all" || workInfo.workStatus === workStatusFilter;

      return matchesSearch && matchesWorkStatus;
    });
  }, [
    agencyScopedGuides,
    searchQuery,
    workStatusFilter,
    guideAssignmentsMap,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    workStatusFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setWorkStatusFilter("all");
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
    setPassword("");
    setShowPassword(false);
    setAvatar("");
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
    setPassword("");
    setShowPassword(false);
    setAvatar(guide.avatar || "");
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

    if (!trimmedName) {
      errors.name = "Vui lòng nhập họ và tên hướng dẫn viên.";
    } else if (trimmedName.length < 3) {
      errors.name = "Họ và tên phải có ít nhất 3 ký tự.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.email = "Vui lòng nhập địa chỉ email liên hệ.";
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

    if (!editingGuide) {
      if (!password.trim()) {
        errors.password = "Vui lòng nhập mật khẩu đăng nhập.";
      } else if (password.trim().length < 8 || password.trim().length > 16) {
        errors.password = "Mật khẩu phải từ 8 đến 16 ký tự.";
      }
    } else if (password.trim() && (password.trim().length < 8 || password.trim().length > 16)) {
      errors.password = "Mật khẩu mới phải từ 8 đến 16 ký tự.";
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
    const trimmedLicense = licenseNumber.trim().toUpperCase() || "HDV-NOI-BO";
    const expYears = parseInt(experienceYears, 10) || 0;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    if (!editingGuide) {
      const createPayload: CreateAgencyGuideRequest = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        guideType: "domestic",
        licenseNumber: trimmedLicense,
        licenseExpiryDate: licenseExpiryDate || "2030-12-31",
        issuingAuthority: issuingAuthority.trim() || undefined,
        languages: selectedLanguages,
        routes: selectedRoutes,
        specialties: selectedSpecialties,
        experienceYears: expYears,
        bio: bio.trim() || undefined,
        sendActivationInviteImmediately: false,
      };

      const accountStatus: GuideMobileAccountStatus = "active";

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
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(
          createPayload.name
        )}&background=075985&color=fff`,
      };

      setLocalGuides((prev) => [newGuide, ...prev]);
      if (!isUnimplementedStub(onAddGuide)) {
        onAddGuide?.(newGuide);
      }
      setIsFormModalOpen(false);

      toast.success(
        `Đã thêm hướng dẫn viên ${newGuide.name} vào danh sách nhân sự.`
      );
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
      avatar: avatar || editingGuide.avatar,
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
  const handleOpenChangePasswordModal = (guide: AgencyGuideProfile) => {
    setChangePasswordTarget(guide);
    setNewPasswordInput("");
    setConfirmPasswordInput("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setChangePasswordError("");
  };

  const handleSubmitChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePasswordTarget) return;

    const trimmedPass = newPasswordInput.trim();
    const trimmedConfirm = confirmPasswordInput.trim();

    if (!trimmedPass) {
      setChangePasswordError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (trimmedPass.length < 8 || trimmedPass.length > 16) {
      setChangePasswordError("Mật khẩu mới phải từ 8 đến 16 ký tự.");
      return;
    }
    if (trimmedPass !== trimmedConfirm) {
      setChangePasswordError("Xác nhận mật khẩu không khớp.");
      return;
    }

    const nowIso = new Date().toISOString();
    const targetId = changePasswordTarget.id;

    const updatedTarget: AgencyGuideProfile = {
      ...changePasswordTarget,
      password: trimmedPass,
      mobileAccountStatus: "active",
      updatedAt: nowIso,
    };

    setLocalGuides((prev) =>
      prev.map((g) => (g.id === targetId ? updatedTarget : g))
    );

    if (!isUnimplementedStub(onUpdateGuide)) {
      onUpdateGuide?.(targetId, updatedTarget);
    }

    toast.success(
      `Đã cập nhật mật khẩu mới thành công cho HDV ${changePasswordTarget.name}!`
    );
    setChangePasswordTarget(null);
  };

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
      {/* Search & Filter Controls + Nút Thêm HDV */}
      <div className="bg-white p-4 rounded-2xl border border-[#CBD5E1] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên HDV, email, số điện thoại..."
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

          <Button
            onClick={handleOpenAddModal}
            className="bg-[#075985] hover:bg-[#F97316] text-white font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm HDV & Cấp tài khoản
          </Button>
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
          {/* BẢNG QUẢN LÝ HƯỚNG DẪN VIÊN                                      */}
          {/* ================================================================ */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-[#F0F9FF] text-[11px] font-bold text-[#075985] uppercase border-b border-[#CBD5E1] tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        Hướng dẫn viên
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Email
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Số điện thoại
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        TT Công việc
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Tour được phân công
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGuides.map((guide) => {
                      const assignments = getGuideAssignments(guide.id);
                      const workInfo = deriveGuideWorkInfo(guide, assignments);
                      const workBadge = WORK_STATUS_BADGE[workInfo.workStatus];
                      const nextUpcoming = workInfo.upcomingAssignments[0];

                      return (
                        <tr
                          key={guide.id}
                          className="hover:bg-[#F0F9FF]/40 transition-colors align-middle"
                        >
                          {/* 1. Avatar + Tên + Số năm kinh nghiệm nằm ở dưới tên */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={
                                  guide.avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    guide.name
                                  )}&background=075985&color=fff`
                                }
                                alt={guide.name}
                                className="w-11 h-11 rounded-full object-cover border-2 border-sky-100 shrink-0 shadow-2xs"
                              />
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailGuideId(guide.id);
                                    setDetailTab("profile");
                                  }}
                                  className="font-bold text-slate-900 hover:text-[#075985] text-left transition-colors cursor-pointer text-sm leading-tight block truncate max-w-[200px]"
                                >
                                  {guide.name}
                                </button>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {guide.experienceYears} năm kinh nghiệm
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Email */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                              <Mail className="w-3.5 h-3.5 text-[#075985] shrink-0" />
                              <span className="truncate max-w-[200px]" title={guide.email}>
                                {guide.email}
                              </span>
                            </div>
                          </td>

                          {/* 3. Số điện thoại */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{guide.phone || "—"}</span>
                            </div>
                          </td>

                          {/* 4. TT Công việc */}
                          <td className="px-4 py-4 whitespace-nowrap">
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
                            </div>
                          </td>

                          {/* 5. Tour được phân công */}
                          <td className="px-4 py-4 max-w-[240px]">
                            {workInfo.activeAssignment ? (
                              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] font-bold text-amber-800">
                                    {workInfo.activeAssignment.bookingCode}
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

                          {/* 6. Thao tác */}
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailGuideId(guide.id);
                                  setDetailTab("profile");
                                }}
                                className="p-2 hover:bg-[#F0F9FF] text-[#075985] rounded-lg transition-colors cursor-pointer"
                                title="Xem chi tiết hồ sơ & lịch tour"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(guide)}
                                className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa hồ sơ"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenAccountStatusDialog(guide)
                                }
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
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
                                  <Unlock className="w-4 h-4" />
                                ) : (
                                  <Lock className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTargetGuide(guide)}
                                className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors cursor-pointer"
                                title="Xóa hồ sơ"
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
                <span>Tổng cộng <strong>{filteredGuides.length}</strong> hướng dẫn viên</span>
              </div>
            </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: THÊM MỚI / CẬP NHẬT THÔNG TIN HƯỚNG DẪN VIÊN                  */}
      {/* ==================================================================== */}
      <Dialog
        open={isFormModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormModalOpen(false);
            setEditingGuide(null);
            setFormErrors({});
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl md:max-w-5xl lg:max-w-5xl w-full max-w-[96vw] bg-white max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
            <DialogTitle className="text-lg font-bold text-[#075985] flex items-center gap-2">
              {editingGuide ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#075985]" />
                  Cập nhật Hồ sơ Hướng dẫn viên: {editingGuide.name}
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 text-[#075985]" />
                  Thêm mới Hướng dẫn viên
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {editingGuide
                ? "Chỉnh sửa thông tin nhân sự và chuyên môn điều hành. Lịch sử các tour đã hoàn thành được giữ nguyên."
                : `Thêm nhân sự hướng dẫn viên vào đội ngũ ${companyName} để phục vụ công tác điều hành và phân công tour.`}
            </DialogDescription>
          </DialogHeader>

          <form
            id="guide-form"
            onSubmit={handleSubmitForm}
            noValidate
            className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          >
            {/* NHÓM 1: THÔNG TIN CÁ NHÂN & TÀI KHOẢN ĐĂNG NHẬP */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#075985] flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Thông tin cá nhân & Tài khoản đăng nhập
                </h3>
              </div>

              {/* Tải ảnh chân dung HDV (Avatar upload) */}
              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200/80">
                <div className="relative group shrink-0">
                  <img
                    src={
                      avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        name || "HDV"
                      )}&background=075985&color=fff&size=128`
                    }
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#075985]/30 shadow-xs"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[10px]"
                    title="Đổi ảnh đại diện"
                  >
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span>Đổi ảnh</span>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#075985]" />
                      Tải ảnh chân dung
                    </label>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => setAvatar("")}
                        className="text-xs text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                      >
                        Xóa ảnh
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hỗ trợ định dạng JPG, PNG, WEBP (tối đa 2MB). Hiển thị trong ứng dụng và hồ sơ nhân sự.
                  </p>
                </div>
              </div>

              {/* Hàng 1: Họ tên (col 1), Số điện thoại (col 2), Số năm kinh nghiệm (col 3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Họ và tên Hướng dẫn viên <span className="text-rose-500">*</span>
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
                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={phone}
                    maxLength={10}
                    onChange={(e) => {
                      const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhone(numericOnly);
                      if (formErrors.phone)
                        setFormErrors({ ...formErrors, phone: undefined });
                    }}
                    placeholder="VD: 0912345678 (10 số)"
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

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Số năm kinh nghiệm <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
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
                      placeholder="VD: 5"
                      className={`text-sm bg-white pr-12 ${
                        formErrors.experienceYears
                          ? "border-rose-500 focus:ring-rose-500"
                          : ""
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                      năm
                    </span>
                  </div>
                  {formErrors.experienceYears && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.experienceYears}
                    </p>
                  )}
                </div>
              </div>

              {/* Hàng 2: Email đăng nhập (col 1) & Mật khẩu đăng nhập (col 2) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email)
                        setFormErrors({ ...formErrors, email: undefined });
                    }}
                    placeholder="VD: hdv.hung@tripops.vn"
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
                    {editingGuide ? (
                      "Mật khẩu mới (tuỳ chọn)"
                    ) : (
                      <>
                        Mật khẩu đăng nhập <span className="text-rose-500">*</span>
                      </>
                    )}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      maxLength={16}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formErrors.password)
                          setFormErrors({ ...formErrors, password: undefined });
                      }}
                      placeholder={
                        editingGuide
                          ? "Để trống nếu không muốn đổi mật khẩu"
                          : "Từ 8 - 16 ký tự"
                      }
                      className={`text-sm bg-white pr-10 ${
                        formErrors.password
                          ? "border-rose-500 focus:ring-rose-500"
                          : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.password}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* NHÓM 2: CHUYÊN MÔN & ĐỊA BÀN PHÂN CÔNG (2 CỘT CÂN ĐỐI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cột Trái: Ngôn ngữ hướng dẫn */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#075985] flex items-center gap-1.5">
                      <Languages className="w-4 h-4 text-[#075985]" />
                      Ngôn ngữ hướng dẫn <span className="text-rose-500">*</span>
                    </Label>
                    <span className="text-[11px] font-semibold text-[#075985] bg-sky-100/70 px-2 py-0.5 rounded-full">
                      {selectedLanguages.length} đã chọn
                    </span>
                  </div>

                  {/* Danh sách ngôn ngữ ĐÃ CHỌN (có nút xóa X) */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 min-h-[52px]">
                    {selectedLanguages.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        Chưa chọn ngôn ngữ nào. Bấm gợi ý bên dưới hoặc tự nhập để thêm.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedLanguages.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#075985] text-white shadow-2xs font-medium"
                          >
                            <Check className="w-3 h-3 text-sky-200" />
                            {lang}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedLanguages(
                                  selectedLanguages.filter((l) => l !== lang)
                                )
                              }
                              className="hover:text-rose-200 ml-1 p-0.5 rounded cursor-pointer"
                              title={`Xóa ${lang}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gợi ý nhanh: click là insert lên danh sách */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-500">
                      Gợi ý (nhấp để chọn):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_GUIDE_LANGUAGES.filter(
                        (lang) => !selectedLanguages.includes(lang)
                      ).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setSelectedLanguages([...selectedLanguages, lang]);
                            if (formErrors.languages)
                              setFormErrors({
                                ...formErrors,
                                languages: undefined,
                              });
                          }}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-[#075985] hover:text-[#075985] hover:bg-sky-50/50 transition-all cursor-pointer"
                        >
                          <span className="text-slate-400 font-bold">+</span>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ô gõ thêm ngôn ngữ tùy chỉnh */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex gap-1.5">
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
                      placeholder="Gõ ngôn ngữ khác rồi nhấn Enter..."
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
                          setFormErrors({
                            ...formErrors,
                            languages: undefined,
                          });
                      }}
                      className="h-8 px-2.5 text-xs shrink-0 hover:bg-slate-100 cursor-pointer"
                    >
                      + Thêm
                    </Button>
                  </div>

                  {formErrors.languages && (
                    <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {formErrors.languages}
                    </p>
                  )}
                </div>
              </div>

              {/* Cột Phải: Tỉnh thành hoạt động */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-[#EA580C] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#EA580C]" />
                      Tỉnh thành hoạt động
                    </Label>
                    <span className="text-[11px] font-semibold text-[#EA580C] bg-orange-100/70 px-2 py-0.5 rounded-full">
                      {selectedRoutes.length} tỉnh thành
                    </span>
                  </div>

                  {/* Danh sách tỉnh thành ĐÃ CHỌN (có nút xóa X) */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 min-h-[52px]">
                    {selectedRoutes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">
                        Chưa chọn tỉnh thành nào. Bấm gợi ý bên dưới hoặc tự nhập để thêm.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRoutes.map((prov) => (
                          <span
                            key={prov}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[#EA580C] text-white shadow-2xs font-medium"
                          >
                            <MapPin className="w-3 h-3 text-orange-200" />
                            {prov}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRoutes(
                                  selectedRoutes.filter((p) => p !== prov)
                                )
                              }
                              className="hover:text-amber-200 ml-1 p-0.5 rounded cursor-pointer"
                              title={`Xóa ${prov}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gợi ý nhanh Tỉnh thành: click là insert lên danh sách */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <span className="text-[11px] font-medium text-slate-500">
                      Gợi ý tỉnh thành (nhấp để chọn):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {COMMON_GUIDE_PROVINCES.filter(
                        (prov) => !selectedRoutes.includes(prov)
                      ).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => {
                            setSelectedRoutes([...selectedRoutes, prov]);
                          }}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-[#EA580C] hover:text-[#EA580C] hover:bg-orange-50/50 transition-all cursor-pointer"
                        >
                          <span className="text-slate-400 font-bold">+</span>
                          {prov}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ô gõ thêm tỉnh thành tùy chỉnh */}
                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex gap-1.5">
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
                      placeholder="Gõ tỉnh thành khác rồi Enter..."
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
                      className="h-8 px-2.5 text-xs shrink-0 hover:bg-slate-100 cursor-pointer"
                    >
                      + Thêm
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* NHÓM 3: THẾ MẠNH SỞ TRƯỜNG & GHI CHÚ */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3.5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    Kỹ năng nghiệp vụ & Thế mạnh sở trường
                  </Label>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    {selectedSpecialties.length} kỹ năng
                  </span>
                </div>

                {/* Danh sách kỹ năng ĐÃ CHỌN (có nút xóa X) */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 min-h-[52px]">
                  {selectedSpecialties.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      Chưa chọn kỹ năng nào. Bấm gợi ý bên dưới hoặc tự nhập để thêm.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSpecialties.map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-700 text-white shadow-2xs font-medium"
                        >
                          <Check className="w-3 h-3 text-emerald-200" />
                          {spec}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSpecialties(
                                selectedSpecialties.filter((s) => s !== spec)
                              )
                            }
                            className="hover:text-emerald-200 ml-1 p-0.5 rounded cursor-pointer"
                            title={`Xóa ${spec}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gợi ý nhanh Kỹ năng: click là insert lên danh sách */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-medium text-slate-500">
                    Gợi ý kỹ năng (nhấp để chọn):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_GUIDE_SPECIALTIES.filter(
                      (spec) => !selectedSpecialties.includes(spec)
                    ).map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => {
                          setSelectedSpecialties([
                            ...selectedSpecialties,
                            spec,
                          ]);
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all cursor-pointer"
                      >
                        <span className="text-slate-400 font-bold">+</span>
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ô gõ thêm kỹ năng tùy chỉnh */}
                <div className="flex gap-1.5 pt-2 max-w-md">
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
                    placeholder="Gõ kỹ năng khác rồi Enter..."
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
                    className="h-8 px-2.5 text-xs shrink-0 hover:bg-slate-100 cursor-pointer"
                  >
                    + Thêm
                  </Button>
                </div>
              </div>
            </div>

            {/* Bio / Ghi chú */}
              <div className="pt-2 border-t border-slate-200/60">
                <Label className="text-xs font-semibold text-slate-700">
                  Ghi chú điều hành / Giới thiệu thêm (tùy chọn)
                </Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú về phong cách dẫn tour, điểm mạnh đặc biệt hoặc lưu ý khi phân công..."
                  className="mt-1 w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-[#075985] focus:outline-hidden resize-none"
                />
              </div>
          </form>

          {/* Sticky Footer Actions ngoài scroll container */}
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50/90 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormModalOpen(false);
                setEditingGuide(null);
              }}
              className="px-4 text-xs font-medium cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="guide-form"
              className="bg-[#075985] hover:bg-[#0c4a6e] text-white font-semibold text-xs px-5 shadow-xs transition-all cursor-pointer"
            >
              {editingGuide ? "Lưu cập nhật hồ sơ" : "Thêm Hướng dẫn viên"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

{/* ==================================================================== */}
      {/* MODAL 2: CHI TIẾT HỒ SƠ HDV, TÀI KHOẢN & LỊCH PHÂN CÔNG TOUR          */}
      {/* ==================================================================== */}
      <Dialog
        open={!!detailGuide}
        onOpenChange={(open) => !open && setDetailGuideId(null)}
      >
        <DialogContent className="sm:max-w-4xl md:max-w-4xl lg:max-w-4xl w-full max-w-[94vw] bg-white max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
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
                          <DialogDescription className="text-xs text-slate-500 mt-0.5">
                            Hướng dẫn viên • {detailGuide.experienceYears} năm kinh nghiệm
                          </DialogDescription>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${workBadge.bg} ${workBadge.text} ${workBadge.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${workBadge.dot}`} />
                              TT Công việc: {workInfo.workLabel}
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
                        Thông tin hồ sơ
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
                      <div className="space-y-4">
                        {/* Hàng 3 thẻ thông tin liên hệ & kinh nghiệm */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-sky-100/70 text-[#075985] flex items-center justify-center shrink-0">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-medium text-slate-400 block">Email</span>
                              <span className="text-xs font-semibold text-slate-800 truncate block" title={detailGuide.email}>
                                {detailGuide.email}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-medium text-slate-400 block">Số điện thoại</span>
                              <span className="text-xs font-semibold text-slate-800 block">
                                {detailGuide.phone || "Chưa cập nhật"}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0">
                              <Award className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-medium text-slate-400 block">Kinh nghiệm</span>
                              <span className="text-xs font-semibold text-slate-800 block">
                                {detailGuide.experienceYears} năm kinh nghiệm
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Grid chi tiết chuyên môn & khu vực */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Tỉnh thành hoạt động */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#EA580C] flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#EA580C]" />
                              Tỉnh thành hoạt động
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {detailGuide.routes && detailGuide.routes.length > 0 ? (
                                detailGuide.routes.map((p) => (
                                  <span
                                    key={p}
                                    className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"
                                  >
                                    <MapPin className="w-3 h-3 text-amber-600" />
                                    {p}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chưa cập nhật</span>
                              )}
                            </div>
                          </div>

                          {/* Ngôn ngữ hướng dẫn */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#075985] flex items-center gap-1.5">
                              <Languages className="w-4 h-4 text-[#075985]" />
                              Ngôn ngữ hướng dẫn
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {detailGuide.languages && detailGuide.languages.length > 0 ? (
                                detailGuide.languages.map((lang) => (
                                  <span
                                    key={lang}
                                    className="bg-sky-50 text-[#075985] border border-sky-200 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"
                                  >
                                    <Globe className="w-3 h-3 text-[#075985]" />
                                    {lang}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chưa cập nhật</span>
                              )}
                            </div>
                          </div>

                          {/* Kỹ năng nghiệp vụ & Thế mạnh */}
                          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-2 md:col-span-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-emerald-700" />
                              Kỹ năng nghiệp vụ & Thế mạnh sở trường
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {detailGuide.specialties && detailGuide.specialties.length > 0 ? (
                                detailGuide.specialties.map((spec) => (
                                  <span
                                    key={spec}
                                    className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    {spec}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chưa cập nhật</span>
                              )}
                            </div>
                          </div>

                          {/* Ghi chú điều hành (nếu có) */}
                          {detailGuide.bio && (
                            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-1.5 md:col-span-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                                Ghi chú điều hành / Giới thiệu
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed italic bg-white p-3 rounded-lg border border-slate-200">
                                {detailGuide.bio}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
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
