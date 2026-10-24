import { useState, useEffect } from "react";
import { User, Service } from "@/app/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  MapPin,
  Star,
  Hotel,
  Utensils,
  Compass,
  Car,
  CheckCircle2,
  Check,
  Eye,
  Edit3,
  Image as ImageIcon,
  Info,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { GoogleMapLocationPicker } from "./GoogleMapLocationPicker";
import {
  allVietnamProvinces,
  getWardsForProvince,
  getCoordinatesForProvince,
} from "@/app/data/vietnamAdministrative";

interface ProviderCreateServicePageProps {
  currentUser: User;
  onSaveService: (serviceData: Omit<Service, "id">) => void;
  onBack: () => void;
  initialService?: Service; // If editing
}

export type ServiceCategory = "hotel" | "fnb" | "transportation" | "attraction";

interface CategoryMeta {
  value: ServiceCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  color: string;
  defaultName: string;
  subCategories: string[];
  capacityLabel: string;
  capacityUnit: string;
  capacityPlaceholder: string;
  defaultCapacity: string;
  defaultPolicies: string[];
  policyPlaceholder: string;
  amenities: string[];
}

export const CATEGORY_CONFIGS: Record<ServiceCategory, CategoryMeta> = {
  hotel: {
    value: "hotel",
    label: "Lưu trú & Khách sạn",
    shortLabel: "Lưu trú",
    description: "Khách sạn, Resort, Homestay, Villa nghỉ dưỡng, Glamping",
    icon: Hotel,
    color: "from-blue-600 to-indigo-600",
    defaultName: "Khách Sạn Heritage Đà Lạt",
    subCategories: [
      "Khách sạn (Hotel)",
      "Resort & Nghỉ dưỡng",
      "Homestay & Nhà dân",
      "Biệt thự / Villa nguyên căn",
      "Căn hộ dịch vụ (Apartment)",
      "Glamping & Cắm trại cao cấp",
    ],
    capacityLabel: "Tổng số lượng phòng tại cơ sở",
    capacityUnit: "phòng",
    capacityPlaceholder: "VD: 45",
    defaultCapacity: "45",
    defaultPolicies: [
      "Nhận phòng từ 14:00 - Trả phòng trước 12:00",
      "Đã bao gồm buffet sáng hàng ngày tại nhà hàng tầng 1",
      "Miễn phí cho tối đa 01 trẻ em dưới 6 tuổi ngủ chung giường với bố mẹ",
      "Hỗ trợ phụ thu thêm người: 250.000đ/đêm",
      "Miễn phí hủy phòng trước 48 giờ so với ngày nhận phòng",
    ],
    policyPlaceholder:
      "Nhập điều kiện nhận/trả phòng, bữa sáng, phụ thu thêm người, hoàn hủy...",
    amenities: [
      "Wifi tốc độ cao miễn phí",
      "Điều hòa 2 chiều",
      "Smart TV 50 inch",
      "Bồn tắm nằm cao cấp",
      "Ban công ngắm cảnh riêng",
      "Thang máy",
      "Bãi đỗ xe 45 chỗ",
      "Bể bơi vô cực",
      "Minibar & Nước suối",
      "Máy sấy tóc & Đồ vệ sinh",
      "Quầy Bar / Cafe tầng thượng",
      "Dọn phòng hàng ngày",
    ],
  },
  fnb: {
    value: "fnb",
    label: "Ẩm thực & Nhà hàng",
    shortLabel: "Ẩm thực",
    description: "Nhà hàng, Quán ăn đặc sản, Cà phê, Buffet, Tiệc đoàn tour",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    defaultName: "Nhà hàng Hải Sản Biển Xanh Phú Quốc",
    subCategories: [
      "Nhà hàng phục vụ đoàn tour lữ hành",
      "Nhà hàng hải sản tươi sống",
      "Nhà hàng ẩm thực đặc sản địa phương",
      "Nhà hàng Buffet / Lẩu Nướng BBQ",
      "Quán Cà phê & Điểm tâm sáng",
      "Nhà hàng ẩm thực chay thanh tịnh",
    ],
    capacityLabel: "Sức chứa tối đa (Khách đoàn)",
    capacityUnit: "khách",
    capacityPlaceholder: "VD: 150",
    defaultCapacity: "150",
    defaultPolicies: [
      "Khung giờ đón khách: 10:00 - 22:30 hàng ngày",
      "Set menu đoàn 6 - 8 món tiêu chuẩn, hỗ trợ đổi món chay khi báo trước 24h",
      "Có 3 phòng VIP máy lạnh riêng cho đoàn từ 15 - 50 khách",
      "Xuất hóa đơn VAT đầy đủ cho công ty du lịch",
      "Chính sách hủy bàn: Miễn phí trước 3 tiếng",
    ],
    policyPlaceholder:
      "Nhập khung giờ đón khách, quy cách set menu, phòng VIP, hóa đơn VAT, hủy bàn...",
    amenities: [
      "Bãi đỗ xe 45 chỗ rộng rãi",
      "Có phòng VIP máy lạnh riêng cho đoàn",
      "Có sân khấu & Âm thanh Gala",
      "Xuất hóa đơn VAT đầy đủ",
      "Hỗ trợ món chay thanh tịnh",
      "Có thực đơn riêng cho trẻ em",
      "Wifi miễn phí",
      "Không gian mở thoáng mát",
    ],
  },
  transportation: {
    value: "transportation",
    label: "Phương tiện & Vận chuyển",
    shortLabel: "Vận chuyển",
    description: "Xe du lịch 4-45 chỗ, Limousine, Tàu cano cao tốc",
    icon: Car,
    color: "from-cyan-500 to-blue-600",
    defaultName: "Nhà Xe Limousine Heritage VIP",
    subCategories: [
      "Xe 16 chỗ Limousine VIP",
      "Xe du lịch 16 chỗ tiêu chuẩn (Transit/Solati)",
      "Xe du lịch 29 chỗ (Thaco/Samco)",
      "Xe du lịch 45 chỗ Universe",
      "Xe du lịch 7 chỗ (Carnival/Fortuner)",
      "Xe du lịch 4 chỗ cao cấp (Sedan)",
      "Tàu / Cano cao tốc du lịch",
    ],
    capacityLabel: "Số chỗ ngồi thực tế của xe",
    capacityUnit: "ghế",
    capacityPlaceholder: "VD: 16",
    defaultCapacity: "16",
    defaultPolicies: [
      "Dòng xe đời mới 2023 - 2024 chất lượng cao, tài xế lịch sự, nhiều năm kinh nghiệm",
      "Giá đã bao gồm chi phí xăng dầu, phí cầu đường cao tốc và lương tài xế",
      "Miễn phí nước suối đóng chai và khăn lạnh suốt hành trình",
      "Phụ thu vượt thời gian: 150.000đ/giờ",
      "Hủy hợp đồng trước 24 giờ hoàn 100% tiền cọc",
    ],
    policyPlaceholder:
      "Nhập đời xe, tài xế, chi phí xăng dầu cầu đường, nước suối, phụ thu, hoàn cọc...",
    amenities: [
      "Ghế da cao cấp có ngả lưng",
      "Wifi 4G tốc độ cao miễn phí",
      "Cổng sạc điện thoại USB tại từng vị trí ngồi",
      "Nước suối đóng chai & khăn lạnh",
      "Màn hình TV giải trí & Micro HDV",
      "Cốp hành lý rộng rãi",
      "Bảo hiểm hành khách đầy đủ",
      "Ghế massage thư giãn",
    ],
  },
  attraction: {
    value: "attraction",
    label: "Điểm tham quan & Vé",
    shortLabel: "Tham quan",
    description: "Danh lam thắng cảnh, Di tích lịch sử, Khu du lịch sinh thái",
    icon: Compass,
    color: "from-teal-500 to-emerald-600",
    defaultName: "Khu Du Lịch Thung Lũng Tình Yêu Đà Lạt",
    subCategories: [
      "Khu du lịch sinh thái & Danh lam thắng cảnh",
      "Công viên chủ đề & Vui chơi giải trí",
      "Di tích lịch sử & Văn hóa tâm linh",
      "Bảo tàng & Làng nghề truyền thống",
      "Điểm check-in & Ngắm cảnh",
      "Vườn thú & Nông trại trải nghiệm",
    ],
    capacityLabel: "Sức chứa tối đa / lượt tiếp đón",
    capacityUnit: "khách",
    capacityPlaceholder: "VD: 500",
    defaultCapacity: "300",
    defaultPolicies: [
      "Giờ đón khách / mở cửa: 07:30 - 17:30 (Ngừng bán vé lúc 17:00)",
      "Quyền lợi vé: Vào cổng toàn khu, xe điện di chuyển không giới hạn, xem show nghệ thuật",
      "Chính sách trẻ em: Dưới 1m miễn phí; từ 1m - 1m4 tính 50% vé người lớn",
      "Vé đoàn được đổi ngày trước 24h không mất phí phát sinh",
    ],
    policyPlaceholder:
      "Nhập giờ mở cửa, quyền lợi vé bao gồm, chính sách trẻ em, đổi ngày, lưu ý...",
    amenities: [
      "Bãi đỗ xe du lịch lớn",
      "Nhà hàng & Trạm dừng nghỉ nội khu",
      "Khu vệ sinh đạt chuẩn du lịch",
      "Cửa hàng đặc sản lưu niệm",
      "Trạm y tế sơ cấp cứu",
      "Hướng dẫn viên tại điểm",
      "Hỗ trợ xe lăn người khuyết tật",
      "Tủ gửi đồ tư trang an toàn",
    ],
  },
};

export function ProviderCreateServicePage({
  currentUser,
  onSaveService,
  onBack,
  initialService,
}: ProviderCreateServicePageProps) {
  const isEditing = !!initialService;

  // View mode: 'form' or 'preview'
  const [viewMode, setViewMode] = useState<"form" | "preview">("form");

  // Category
  const [category, setCategory] = useState<ServiceCategory>(
    ((initialService?.category as ServiceCategory) &&
    CATEGORY_CONFIGS[initialService.category as ServiceCategory]
      ? initialService.category
      : "hotel") as ServiceCategory
  );

  const currentConfig = CATEGORY_CONFIGS[category];

  // Common Unified Fields (Saved in 1 single table)
  const [name, setName] = useState(initialService?.name || currentConfig.defaultName);
  const [subCategory, setSubCategory] = useState(
    initialService?.subCategory || currentConfig.subCategories[0]
  );
  const [capacity, setCapacity] = useState(
    initialService?.capacity?.toString() ||
      initialService?.totalRooms?.toString() ||
      initialService?.seats?.toString() ||
      currentConfig.defaultCapacity
  );
  const [stars, setStars] = useState(initialService?.stars?.toString() || "4");
  const [description, setDescription] = useState(
    initialService?.description || ""
  );

  // Helper to normalize policies into string[]
  const normalizePolicies = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw.filter((item) => typeof item === "string" && item.trim().length > 0);
    if (typeof raw === "string" && raw.trim()) {
      const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      return lines.length > 0 ? lines : [raw.trim()];
    }
    return [];
  };

  // Unified Policies & Specialized Specs (Stored as string[])
  const [policies, setPolicies] = useState<string[]>(() => {
    const norm = normalizePolicies(initialService?.policies);
    return norm.length > 0 ? norm : currentConfig.defaultPolicies;
  });
  const [customPolicyInput, setCustomPolicyInput] = useState("");

  // Amenities tags (Stored as string[])
  const [amenities, setAmenities] = useState<string[]>(() => {
    if (initialService?.amenities && initialService.amenities.length > 0) {
      return initialService.amenities;
    }
    return currentConfig.amenities.slice(0, 7);
  });
  const [customAmenityInput, setCustomAmenityInput] = useState("");

  // Price range
  const [priceFrom, setPriceFrom] = useState(
    initialService?.priceFrom?.toString() ||
      initialService?.price?.toString() ||
      (category === "hotel" ? "600000" : "250000")
  );
  const [priceTo, setPriceTo] = useState(
    initialService?.priceTo?.toString() ||
      (category === "hotel" ? "950000" : "450000")
  );

  // 2-level administrative address (Province & Ward)
  const [province, setProvince] = useState(initialService?.province || "Lâm Đồng");
  const [ward, setWard] = useState(initialService?.ward || "Phường 3");
  const [street, setStreet] = useState(initialService?.street || "02 Trần Phú");

  // GPS Map Coordinates
  const [latitude, setLatitude] = useState<number>(
    initialService?.latitude || 11.9404
  );
  const [longitude, setLongitude] = useState<number>(
    initialService?.longitude || 108.4583
  );

  // Photo Gallery & Thumbnail Selector
  const defaultImages = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
  ];

  const [images, setImages] = useState<string[]>(
    initialService?.images && initialService.images.length > 0
      ? initialService.images
      : initialService?.image
      ? [initialService.image]
      : defaultImages
  );
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(
    initialService?.thumbnailIndex || 0
  );
  const [newImageUrl, setNewImageUrl] = useState("");

  // Auto-sync wards and map coordinates when province changes
  useEffect(() => {
    const coords = getCoordinatesForProvince(province);
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    const availableWards = getWardsForProvince(province);
    if (!availableWards.includes(ward)) {
      setWard(availableWards[0] || "Phường 1");
    }
  }, [province]);

  // Handle category switch: load defaults if not editing
  const handleSelectCategory = (newCat: ServiceCategory) => {
    setCategory(newCat);
    const cfg = CATEGORY_CONFIGS[newCat];
    if (!isEditing) {
      setName(cfg.defaultName);
      setSubCategory(cfg.subCategories[0]);
      setCapacity(cfg.defaultCapacity);
      setPolicies([...cfg.defaultPolicies]);
      setAmenities(cfg.amenities.slice(0, 7));
      if (newCat === "hotel") {
        setPriceFrom("600000");
        setPriceTo("950000");
      } else {
        setPriceFrom("200000");
        setPriceTo("350000");
      }
    }
  };

  const handleApplyTemplatePolicies = () => {
    setPolicies([...currentConfig.defaultPolicies]);
  };

  const handleAddPolicy = (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : customPolicyInput).trim();
    if (text && !policies.includes(text)) {
      setPolicies([...policies, text]);
      if (textToAdd === undefined) {
        setCustomPolicyInput("");
      }
    }
  };

  const handleRemovePolicy = (index: number) => {
    setPolicies(policies.filter((_, i) => i !== index));
  };

  const handleAddAmenity = (textToAdd?: string) => {
    const text = (textToAdd !== undefined ? textToAdd : customAmenityInput).trim();
    if (text && !amenities.includes(text)) {
      setAmenities([...amenities, text]);
      if (textToAdd === undefined) {
        setCustomAmenityInput("");
      }
    }
  };

  const handleRemoveAmenity = (item: string) => {
    setAmenities(amenities.filter((x) => x !== item));
  };

  const toggleAmenity = (item: string) => {
    if (amenities.includes(item)) {
      setAmenities(amenities.filter((x) => x !== item));
    } else {
      setAmenities([...amenities, item]);
    }
  };

  const handleAddImage = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (!images.includes(trimmed)) {
      setImages([...images, trimmed]);
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    if (images.length <= 1) {
      alert("Cần giữ lại ít nhất 1 hình ảnh cho bài đăng dịch vụ.");
      return;
    }
    const filtered = images.filter((_, i) => i !== index);
    setImages(filtered);
    if (thumbnailIndex >= filtered.length) {
      setThumbnailIndex(0);
    }
  };

  // Submit unified single table payload
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fromVal = parseFloat(priceFrom) || 0;
    const toVal = priceTo ? parseFloat(priceTo) : fromVal;
    const locationParts = [street, ward, province].filter(Boolean);
    const fullLocation = locationParts.join(", ");
    const thumbnailPhoto = images[thumbnailIndex] || images[0];
    const capacityVal = parseInt(capacity) || 0;

    // Single unified payload saved to 1 table
    const fullPayload: Omit<Service, "id"> = {
      providerId: currentUser.id,
      providerName: currentUser.businessName || currentUser.name,
      name,
      category,
      subCategory,
      description,
      price: fromVal,
      priceFrom: fromVal,
      priceTo: toVal,
      pricePerPerson: fromVal,
      capacity: capacityVal,
      // Compatibility helpers for legacy fields
      totalRooms: category === "hotel" ? capacityVal : undefined,
      seats: category === "transportation" ? capacityVal : undefined,
      stars: category === "hotel" ? parseInt(stars) || 3 : undefined,
      policies,
      amenities,
      location: fullLocation,
      province,
      ward,
      street,
      latitude,
      longitude,
      image: thumbnailPhoto,
      images,
      thumbnailIndex,
      status: "pending",
      createdAt: initialService?.createdAt || new Date().toISOString().split("T")[0],
    };

    onSaveService(fullPayload);
  };

  const formatPriceRangeDisplay = () => {
    const fromVal = parseFloat(priceFrom);
    const toVal = parseFloat(priceTo);
    const unit = category === "hotel" ? "phòng" : "người";
    if (!isNaN(fromVal) && !isNaN(toVal) && toVal > fromVal) {
      return `${fromVal.toLocaleString("vi-VN")}đ - ${toVal.toLocaleString("vi-VN")}đ / ${unit}`;
    }
    if (!isNaN(fromVal)) {
      return `Từ ${fromVal.toLocaleString("vi-VN")}đ / ${unit}`;
    }
    return "Liên hệ báo giá";
  };

  const ActiveIcon = currentConfig.icon;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl border-gray-200 hover:bg-gray-100 text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Quay lại danh sách
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isEditing ? "Chỉnh sửa bài đăng dịch vụ" : "Đăng Dịch Vụ Mới"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Hệ thống lưu trữ đồng nhất một bảng, tối ưu cho các đơn vị lữ hành liên kết tour
            </p>
          </div>
        </div>

        {/* Form vs Preview Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("form")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "form"
                ? "bg-white text-[#075985] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Nhập liệu thông tin
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === "preview"
                ? "bg-[#075985] text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Xem trước (Preview)
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: FORM INPUT MODE (UNIFIED SINGLE TABLE FORM)       */}
      {/* ========================================================= */}
      {viewMode === "form" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category Picker */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#075985] text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Chọn loại hình dịch vụ
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Lựa chọn 1 trong 4 loại hình dịch vụ du lịch cốt lõi
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {(Object.keys(CATEGORY_CONFIGS) as ServiceCategory[]).map((catKey) => {
                const opt = CATEGORY_CONFIGS[catKey];
                const Icon = opt.icon;
                const isSelected = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectCategory(opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-32 ${
                      isSelected
                        ? "border-[#075985] bg-[#F0F9FF]/70 shadow-sm ring-2 ring-blue-600/20"
                        : "border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br ${opt.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-900 leading-snug">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: UNIFIED SERVICE DETAILS & MERGED POLICIES */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#075985] text-white text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  Thông tin dịch vụ & Quy định đặc thù
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Các thông số vận hành và điều kiện phục vụ được lưu gộp trực tiếp vào mục Chính sách
                </p>
              </div>
              <Badge className="bg-[#F0F9FF] text-[#075985] border-[#CBD5E1] font-semibold text-xs">
                <ActiveIcon className="w-3.5 h-3.5 mr-1" />
                {currentConfig.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tên cơ sở / Dịch vụ */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tên cơ sở / Dịch vụ đăng tải *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Ví dụ: ${currentConfig.defaultName}`}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                  required
                />
              </div>

              {/* Loại hình chi tiết (subCategory) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Phân loại chi tiết *
                </label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                >
                  {currentConfig.subCategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quy mô / Sức chứa (Dùng chung trường capacity) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {currentConfig.capacityLabel} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder={currentConfig.capacityPlaceholder}
                    className="w-full pl-3.5 pr-14 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                    {currentConfig.capacityUnit}
                  </span>
                </div>
              </div>

              {/* Hạng sao (nếu là Hotel) */}
              {category === "hotel" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Hạng sao cơ sở
                  </label>
                  <select
                    value={stars}
                    onChange={(e) => setStars(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                  >
                    <option value="5">5 Sao ⭐⭐⭐⭐⭐ (Sang trọng)</option>
                    <option value="4">4 Sao ⭐⭐⭐⭐ (Cao cấp)</option>
                    <option value="3">3 Sao ⭐⭐⭐ (Tiêu chuẩn)</option>
                    <option value="2">2 Sao ⭐⭐ (Kinh tế)</option>
                    <option value="1">1 Sao ⭐</option>
                    <option value="0">Tiêu chuẩn du lịch (Chưa gắn sao)</option>
                  </select>
                </div>
              )}

              {/* CHÍNH SÁCH, ĐIỀU KIỆN & THÔNG SỐ ĐẶC THÙ (Lưu dạng mảng string[]) */}
              <div className="md:col-span-2 lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-blue-900">
                      Chính sách, điều kiện & Thông số phục vụ đặc thù *
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0F2FE] text-blue-800">
                      {policies.length} điều khoản
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyTemplatePolicies}
                    className="inline-flex items-center gap-1.5 text-xs text-[#075985] hover:text-blue-800 font-semibold bg-[#F0F9FF] hover:bg-[#E0F2FE]/70 px-2.5 py-1 rounded-lg border border-[#CBD5E1] transition-colors"
                    title="Nạp mẫu gợi ý chuẩn mực cho loại hình này"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Áp dụng mẫu gợi ý chuẩn
                  </button>
                </div>

                <p className="text-[11px] text-gray-500">
                  Nhập tự do các điều kiện vận hành chuyên biệt: giờ nhận/trả phòng, khung giờ đón khách, set menu, loại xe, quyền lợi vé, phụ thu trẻ em và điều kiện hoàn hủy...
                </p>

                {/* Input to type custom policy */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPolicyInput}
                    onChange={(e) => setCustomPolicyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPolicy();
                      }
                    }}
                    placeholder={currentConfig.policyPlaceholder}
                    className="flex-1 px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-[#F0F9FF]/20 text-gray-800"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddPolicy()}
                    className="bg-[#075985] hover:bg-[#F97316] text-white rounded-xl px-4 flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm chính sách
                  </Button>
                </div>

                {/* List of currently added policies */}
                {policies.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {policies.map((pol, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 p-3 bg-[#F0F9FF]/40 hover:bg-[#F0F9FF]/70 rounded-xl border border-[#CBD5E1]/60 transition-colors text-xs text-gray-800 group"
                      >
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="w-5 h-5 rounded-full bg-[#075985] text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed font-medium">{pol}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePolicy(idx)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                          title="Xóa điều khoản này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                    Chưa có chính sách nào. Hãy nhập nội dung ở trên và nhấn <strong>Thêm chính sách</strong> hoặc bấm <strong>"Áp dụng mẫu gợi ý chuẩn"</strong>.
                  </div>
                )}

                {/* Quick Add Suggestions Chips */}
                <div className="pt-2 border-t border-blue-100">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                    Mẫu gợi ý theo ngành (Bấm để thêm / gỡ nhanh):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentConfig.defaultPolicies.map((sug, i) => {
                      const isAdded = policies.includes(sug);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (isAdded) {
                              setPolicies(policies.filter((p) => p !== sug));
                            } else {
                              handleAddPolicy(sug);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all flex items-center gap-1 ${
                            isAdded
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-medium"
                              : "bg-gray-50 hover:bg-[#F0F9FF] text-gray-600 hover:text-[#075985] border-gray-200"
                          }`}
                        >
                          <span>{isAdded ? "✓" : "+"}</span>
                          <span className="line-clamp-1 max-w-[280px]">{sug}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Giới thiệu tổng quan */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Mô tả giới thiệu dịch vụ (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Giới thiệu đôi nét nổi bật về không gian, phong cảnh, chất lượng dịch vụ..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 3: AMENITIES & FACILITIES (Lưu dạng mảng string[], cho phép tự nhập) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#075985] text-white text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  Tiện ích & Dịch vụ đi kèm
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Nhập thêm tiện ích mới hoặc chọn nhanh từ danh sách gợi ý sẵn có
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E0F2FE] text-blue-800">
                Đã chọn {amenities.length} tiện ích
              </span>
            </div>

            {/* Custom Amenity Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customAmenityInput}
                onChange={(e) => setCustomAmenityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAmenity();
                  }
                }}
                placeholder="Nhập tiện ích/tiện nghi mới (VD: Ghế massage, Trạm sạc xe điện, Menu ăn kiêng...) rồi nhấn Thêm"
                className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
              <Button
                type="button"
                onClick={() => handleAddAmenity()}
                className="bg-[#075985] hover:bg-[#F97316] text-white rounded-xl px-4 flex items-center gap-1.5 flex-shrink-0 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                Thêm tiện ích
              </Button>
            </div>

            {/* Currently Selected Amenities as Removable Tags */}
            {amenities.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-gray-700 block">
                  Tiện ích đã gắn vào bài đăng ({amenities.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F9FF] text-blue-800 text-xs font-medium rounded-xl border border-[#CBD5E1]"
                    >
                      <span>✓ {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(item)}
                        className="text-blue-400 hover:text-rose-600 ml-1 rounded-full hover:bg-[#E0F2FE] p-0.5 transition-colors"
                        title={`Xóa ${item}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Amenities Grid */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <span className="text-xs font-semibold text-gray-500 block">
                Gợi ý tiện ích phổ biến (Bấm để thêm / gỡ nhanh):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {currentConfig.amenities.map((item) => {
                  const checked = amenities.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAmenity(item)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium text-left border flex items-center justify-between transition-all ${
                        checked
                          ? "bg-[#075985] text-white border-[#075985] shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {checked && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 4: PRICE RANGE */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#075985] text-white text-xs flex items-center justify-center font-bold">
                  4
                </span>
                {category === "hotel"
                  ? "Khoảng giá dự kiến tính theo phòng (VNĐ / Phòng)"
                  : "Khoảng giá dự kiến tính trên đầu người (VNĐ / Người)"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {currentConfig.priceHint} giúp các đơn vị lữ hành ước lượng chi phí khi thiết kế tour
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F0F9FF]/70 border border-blue-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Giá từ (Mức tối thiểu / {category === "hotel" ? "phòng" : "người"}) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={priceFrom}
                      onChange={(e) => setPriceFrom(e.target.value)}
                      placeholder={category === "hotel" ? "VD: 600000" : "VD: 200000"}
                      className="w-full pl-3 pr-20 py-2.5 text-base font-bold border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white text-blue-900"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#075985] font-bold">
                      VNĐ / {category === "hotel" ? "phòng" : "người"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Giá đến (Mức tối đa / {category === "hotel" ? "phòng" : "người"})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={priceTo}
                      onChange={(e) => setPriceTo(e.target.value)}
                      placeholder={category === "hotel" ? "VD: 950000" : "VD: 350000"}
                      className="w-full pl-3 pr-20 py-2.5 text-base font-bold border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white text-blue-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#075985] font-bold">
                      VNĐ / {category === "hotel" ? "phòng" : "người"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#CBD5E1] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-xs text-gray-600">
                  Hiển thị niêm yết cho các công ty lữ hành:
                </span>
                <span className="text-base font-extrabold text-[#075985] bg-[#F0F9FF] px-3 py-1 rounded-lg border border-blue-100">
                  {formatPriceRangeDisplay()}
                </span>
              </div>
            </div>
          </div>

          {/* Step 5: PHOTO GALLERY & SET THUMBNAIL */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#075985] text-white text-xs flex items-center justify-center font-bold">
                    5
                  </span>
                  Bộ sưu tập hình ảnh & Chọn ảnh đại diện (Thumbnail)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Đăng tải nhiều góc chụp thực tế và bấm nút ngôi sao để chọn ảnh làm bìa đại diện
                </p>
              </div>
              <span className="text-xs font-semibold text-gray-600">
                {images.length} hình ảnh
              </span>
            </div>

            {/* Add Image Input */}
            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImage())}
                placeholder="Dán đường dẫn ảnh (URL) và bấm Thêm ảnh..."
                className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
              />
              <Button
                type="button"
                onClick={handleAddImage}
                className="bg-[#075985] hover:bg-[#F97316] text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Thêm ảnh
              </Button>
            </div>

            {/* Images Grid with Thumbnail Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {images.map((img, idx) => {
                const isThumbnail = thumbnailIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all group h-40 bg-gray-100 ${
                      isThumbnail
                        ? "border-[#075985] ring-2 ring-blue-600/30 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Actions Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setThumbnailIndex(idx)}
                        className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 shadow-md transition-all ${
                          isThumbnail
                            ? "bg-amber-500 text-white"
                            : "bg-white/90 text-gray-800 hover:bg-white"
                        }`}
                        title="Đặt làm ảnh bìa bài đăng"
                      >
                        <Star className={`w-3.5 h-3.5 ${isThumbnail ? "fill-white" : ""}`} />
                        {isThumbnail ? "Ảnh bìa" : "Làm bìa"}
                      </button>

                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-md"
                          title="Xóa ảnh"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Badge if thumbnail */}
                    {isThumbnail && (
                      <div className="absolute top-2 left-2 bg-[#075985] text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                        <Star className="w-3 h-3 fill-white" />
                        Ảnh bìa
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 6: ADDRESS & GOOGLE MAPS GPS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#075985] text-white text-xs flex items-center justify-center font-bold">
                  6
                </span>
                Địa chỉ
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Cung cấp địa chỉ chính xác và vị trí bản đồ để các đối tác và du khách dễ dàng tìm đến
              </p>
            </div>

            {/* 2-level address: Province & Ward */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tỉnh / Thành phố *
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                  required
                >
                  {allVietnamProvinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Phường / Xã *
                </label>
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                  required
                >
                  {getWardsForProvince(province).map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Số nhà, Tên đường / Khu vực cụ thể
                </label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Ví dụ: 02 Trần Phú, Đèo Prenn, Bãi Dài..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                />
              </div>
            </div>

            {/* Google Map Location Picker */}
            <GoogleMapLocationPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              addressLabel={[street, ward, province].filter(Boolean).join(", ")}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="rounded-xl border-gray-300"
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewMode("preview")}
              className="rounded-xl border-[#CBD5E1] text-[#075985] hover:bg-[#F0F9FF]"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Mô phỏng bài đăng
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md font-semibold px-6"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {isEditing ? "Cập nhật bài đăng" : "Gửi duyệt bài đăng"}
            </Button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* MODE 2: LIVE PREVIEW MODE                                 */}
      {/* ========================================================= */}
      {viewMode === "preview" && (
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-sm">
                  Chế độ mô phỏng trực tiếp (Live Preview)
                </h3>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Giao diện hiển thị trực quan thông tin dịch vụ theo chuẩn một bảng dữ liệu thống nhất
              </p>
            </div>
            <Button
              onClick={() => setViewMode("form")}
              size="sm"
              className="bg-white text-[#075985] hover:bg-[#F0F9FF] font-bold rounded-xl"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Quay lại chỉnh sửa
            </Button>
          </div>

          {/* Preview Detail View */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Photo Showcase */}
              <div className="lg:col-span-7 space-y-2">
                <div className="h-80 w-full rounded-2xl overflow-hidden bg-gray-100 relative border border-gray-200">
                  <img
                    src={images[thumbnailIndex] || images[0]}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-[#075985]/95 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                    <ActiveIcon className="w-4 h-4" />
                    {currentConfig.label}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Ảnh bìa (Thumbnail chính)
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`w-20 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 relative ${
                          thumbnailIndex === idx ? "border-[#075985] ring-2 ring-blue-600/20" : "border-gray-200"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {thumbnailIndex === idx && (
                          <div className="absolute top-1 left-1 bg-[#075985] text-white p-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Info Box */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Sẵn sàng liên kết tour
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 leading-snug">
                    {name || "Tên dịch vụ chưa đặt"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Cung cấp bởi: <strong>{currentUser.businessName || currentUser.name}</strong>
                  </p>

                  <div className="flex items-start gap-1.5 mt-3 text-xs text-gray-600">
                    <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{[street, ward, province].filter(Boolean).join(", ")}</span>
                  </div>

                  {/* Price Banner */}
                  <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-100 space-y-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {category === "hotel"
                        ? "Khoảng giá ước lượng tính theo phòng"
                        : "Khoảng giá ước lượng trên đầu người"}
                    </span>
                    <div className="text-2xl font-extrabold text-[#075985]">
                      {formatPriceRangeDisplay()}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Mức giá giúp các đơn vị lữ hành thiết kế giá tour trọn gói chuẩn xác.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Tọa độ Google Maps:</span>
                    <strong className="font-mono text-gray-900">{latitude.toFixed(4)}, {longitude.toFixed(4)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Khu vực:</span>
                    <strong className="text-gray-900">{ward}, {province}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Category Details Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-xs">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#075985]" />
                  Mô tả dịch vụ
                </h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {description || "Chưa có mô tả giới thiệu."}
                </p>
              </div>

              <div className="p-4 bg-[#F0F9FF]/40 rounded-xl border border-blue-100 space-y-2.5">
                <h4 className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <ActiveIcon className="w-4 h-4 text-[#075985]" />
                  Thông số chi tiết [{currentConfig.label}]
                </h4>
                <div className="space-y-1.5 text-gray-700">
                  <div>• Phân loại: <strong>{subCategory}</strong></div>
                  <div>• {currentConfig.capacityLabel}: <strong>{capacity} {currentConfig.capacityUnit}</strong></div>
                  {category === "hotel" && (
                    <div>• Hạng sao: <strong>{stars === "0" ? "Tiêu chuẩn du lịch" : `${stars} Sao ⭐`}</strong></div>
                  )}
                  <div className="pt-1">
                    <span className="font-semibold text-blue-950 block mb-1">
                      Chính sách & Quy định đặc thù ({policies.length}):
                    </span>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-blue-100 space-y-1">
                      {policies.map((pol, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-gray-800 text-[11px] leading-relaxed">
                          <span className="text-[#075985] font-bold">•</span>
                          <span>{pol}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {amenities.length > 0 && (
                    <div className="pt-1">
                      <span className="font-semibold text-blue-950 block mb-1">Tiện ích đi kèm:</span>
                      <div className="flex flex-wrap gap-1">
                        {amenities.map((a, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#E0F2FE]/70 text-blue-800 rounded text-[11px]">
                            ✓ {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewMode("form")}
                className="rounded-xl"
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                Quay lại sửa thông tin
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Xác nhận & Gửi duyệt bài đăng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
