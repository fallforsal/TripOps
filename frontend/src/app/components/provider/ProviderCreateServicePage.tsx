import { useState, useEffect, useRef } from "react";
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
  UploadCloud,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
  ShieldCheck,
  Building2,
  DollarSign,
  FileText,
  BadgeCheck,
  Layers,
  Clock,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { GoogleMapLocationPicker } from "./GoogleMapLocationPicker";
import { ProviderServiceDetailPage } from "./ProviderServiceDetailPage";
import {
  allVietnamProvinces,
  getWardsForProvince,
  getCoordinatesForProvince,
} from "@/app/data/vietnamAdministrative";

import { uploadServiceImage } from "@/app/services/servicePosts";
import { DeferredImageUploads } from "@/app/lib/deferredImageUploads";

interface ProviderCreateServicePageProps {
  currentUser: User;
  onSaveService: (serviceData: Omit<Service, "id">) => void | Promise<void>;
  onBack: () => void;
  initialService?: Service;
}

export type ServiceCategory = "hotel" | "fnb" | "transportation" | "attraction";

interface CategoryMeta {
  value: ServiceCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  color: string;
  bgLight: string;
  borderColor: string;
  defaultName: string;
  subCategories: string[];
  capacityLabel: string;
  capacityUnit: string;
  capacityPlaceholder: string;
  defaultCapacity: string;
  defaultPolicies: string[];
  policySuggestions: string[];
  policyPlaceholder: string;
  amenities: string[];
  sampleImages: string[];
}

export const CATEGORY_CONFIGS: Record<ServiceCategory, CategoryMeta> = {
  hotel: {
    value: "hotel",
    label: "Lưu trú & Khách sạn",
    shortLabel: "Khách sạn",
    description: "Khách sạn, Resort nghỉ dưỡng, Homestay, Biệt thự villa, Glamping",
    icon: Hotel,
    color: "from-blue-600 to-indigo-600",
    bgLight: "bg-blue-50 text-blue-700",
    borderColor: "border-blue-500",
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
      "Nhận phòng (Check-in) từ 14:00 - Trả phòng (Check-out) trước 12:00",
      "Miễn phí phòng ngủ & buffet sáng FOC cho HDV/Trưởng đoàn (tỷ lệ 15 khách trả phí/1 suất)",
      "Miễn phí cho tối đa 01 trẻ em dưới 6 tuổi ngủ chung giường với bố mẹ",
      "Hỗ trợ nhận phòng sớm nếu phòng đã sẵn sàng và hỗ trợ gửi hành lý miễn phí",
      "Phụ thu thêm người (Extra bed): 250.000đ/đêm bao gồm bữa sáng",
      "Miễn phí hủy hoặc giảm số lượng phòng trước 7 ngày",
    ],
    policySuggestions: [
      "Nhận phòng (Check-in) từ 14:00 - Trả phòng (Check-out) trước 12:00",
      "Miễn phí phòng ngủ & buffet sáng FOC cho HDV/Trưởng đoàn (tỷ lệ 15 khách trả phí/1 suất)",
      "Miễn phí cho tối đa 01 trẻ em dưới 6 tuổi ngủ chung giường với bố mẹ",
      "Hỗ trợ nhận phòng sớm nếu phòng đã sẵn sàng và hỗ trợ gửi hành lý miễn phí",
      "Phụ thu thêm người (Extra bed): 250.000đ/đêm bao gồm bữa sáng",
      "Phụ thu phòng đơn (Single Supplement) cho khách lẻ nam/nữ trong đoàn",
      "Miễn phí hủy hoặc giảm số lượng phòng trước 7 ngày so với ngày check-in",
      "Chính sách công nợ thanh toán sau tour cho đối tác lữ hành ký hợp đồng nguyên tắc",
      "Xuất hóa đơn GTGT (VAT) điện tử đầy đủ theo booking tour của công ty",
      "Yêu cầu xuất trình CCCD/Hộ chiếu bản gốc đối với tất cả thành viên khi nhận phòng",
    ],
    policyPlaceholder:
      "Nhập điều kiện nhận/trả phòng, FOC hướng dẫn viên, chính sách trẻ em, phụ thu, hoàn hủy...",
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
      "Dọn phòng hàng ngày",
    ],
    sampleImages: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800",
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
    ],
  },
  fnb: {
    value: "fnb",
    label: "Ẩm thực & Nhà hàng",
    shortLabel: "Ẩm thực",
    description: "Nhà hàng, Quán ăn đặc sản, Cà phê, Buffet tiệc đoàn lữ hành",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    bgLight: "bg-orange-50 text-orange-700",
    borderColor: "border-orange-500",
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
      "Khung giờ đón khách đoàn: 10:00 - 22:00 hàng ngày",
      "Set menu đoàn 6 - 8 món tiêu chuẩn, định lượng đầy đủ cho 6-8 khách/bàn",
      "Miễn phí 01 suất ăn tương đương cho Hướng dẫn viên và Lái xe (đoàn từ 15 khách)",
      "Hỗ trợ đổi món chay hoặc chuẩn bị thực đơn dị ứng/ăn kiêng khi báo trước 12h",
      "Có phòng VIP máy lạnh riêng cho đoàn từ 15 - 50 khách không tính phí phụ thu",
      "Chính sách hủy bàn: Miễn phí trước 4 tiếng giờ khách đến",
      "Xuất hóa đơn VAT đầy đủ ngay sau bữa ăn cho công ty du lịch",
    ],
    policySuggestions: [
      "Khung giờ đón khách đoàn: 10:00 - 22:00 hàng ngày",
      "Set menu đoàn 6 - 8 món tiêu chuẩn, định lượng đầy đủ cho 6-8 khách/bàn",
      "Miễn phí 01 suất ăn tương đương cho Hướng dẫn viên và Lái xe (đoàn từ 15 khách)",
      "Hỗ trợ đổi món chay hoặc chuẩn bị thực đơn dị ứng/ăn kiêng khi báo trước 12h",
      "Có phòng VIP máy lạnh riêng cho đoàn từ 15 - 50 khách không tính phí phụ thu",
      "Linh hoạt giữ bàn tối đa 45 phút khi đoàn gặp sự cố giao thông trên đường di chuyển",
      "Chính sách hủy bàn: Miễn phí trước 4 tiếng giờ khách đến",
      "Cho phép điều chỉnh số lượng suất ăn (+/- 5%) trước 3 tiếng",
      "Miễn phí mang đồ uống vào nhà hàng hoặc tính phí mở chai ưu đãi đoàn",
      "Xuất hóa đơn VAT đầy đủ ngay sau bữa ăn cho công ty du lịch",
    ],
    policyPlaceholder:
      "Nhập khung giờ đón khách, quy cách set menu, suất FOC cho HDV/lái xe, phòng VIP, hóa đơn VAT, hủy bàn...",
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
    sampleImages: [
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=800",
      "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800",
    ],
  },
  transportation: {
    value: "transportation",
    label: "Phương tiện & Vận chuyển",
    shortLabel: "Vận chuyển",
    description: "Xe du lịch 4-45 chỗ, Xe Limousine VIP, Tàu cano cao tốc",
    icon: Car,
    color: "from-cyan-500 to-blue-600",
    bgLight: "bg-cyan-50 text-cyan-700",
    borderColor: "border-cyan-500",
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
      "Cam kết đời xe mới 2022 - 2024, điều hòa mát sâu, nội thất sạch sẽ",
      "Giá đã bao gồm toàn bộ xăng dầu, phí cầu đường cao tốc và lương tài xế",
      "Tài xế nhiều năm kinh nghiệm lái tour, nhiệt tình, lịch sự, đúng giờ",
      "Miễn phí nước suối đóng chai (01 chai/khách/ngày) và khăn lạnh suốt hành trình",
      "Bao gồm bảo hiểm trách nhiệm dân sự hành khách tối đa theo luật định",
      "Hủy xe trước 24 giờ hoàn 100% tiền cọc; hỗ trợ đổi lịch xe linh hoạt",
    ],
    policySuggestions: [
      "Cam kết đời xe mới 2022 - 2024, điều hòa mát sâu, nội thất sạch sẽ",
      "Giá đã bao gồm toàn bộ xăng dầu, phí cầu đường cao tốc và lương tài xế",
      "Tài xế nhiều năm kinh nghiệm lái tour, nhiệt tình, lịch sự, đúng giờ",
      "Miễn phí nước suối đóng chai (01 chai/khách/ngày) và khăn lạnh suốt hành trình",
      "Bao gồm bảo hiểm trách nhiệm dân sự hành khách tối đa theo luật định",
      "Phụ thu vượt thời gian: 150.000đ/giờ; phụ thu vượt km: 12.000đ/km",
      "Miễn phí ăn ngủ cho tài xế hoặc phụ thu theo thỏa thuận hợp đồng",
      "Hủy xe trước 24 giờ hoàn 100% tiền cọc; hỗ trợ đổi lịch xe linh hoạt",
      "Hỗ trợ đón/trả khách tại nhiều điểm hẹn trong lộ trình đã thỏa thuận",
    ],
    policyPlaceholder:
      "Nhập đời xe, chi phí xăng dầu cầu đường, nước suối, bảo hiểm hành khách, phụ thu, hoàn cọc...",
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
    sampleImages: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800",
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800",
    ],
  },
  attraction: {
    value: "attraction",
    label: "Điểm tham quan & Vé",
    shortLabel: "Tham quan",
    description: "Danh lam thắng cảnh, Di tích lịch sử, Khu du lịch sinh thái",
    icon: Compass,
    color: "from-teal-500 to-emerald-600",
    bgLight: "bg-teal-50 text-teal-700",
    borderColor: "border-teal-500",
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
      "Giờ mở cửa đón khách: 07:30 - 17:30 (Ngừng bán vé lúc 17:00)",
      "Quyền lợi vé bao gồm vào cổng toàn khu và các điểm check-in nội khu",
      "Chính sách trẻ em: Dưới 1m miễn phí; từ 1m - 1m4 tính 50% vé người lớn",
      "Miễn phí vé vào cổng (FOC) cho Hướng dẫn viên có thẻ HDV quốc tế/nội địa",
      "Hỗ trợ công ty du lịch đổi ngày tham quan trước 24 giờ không mất phí",
      "Có lối đi ưu tiên check-in nhanh (Fast-track) cho đoàn tour đông khách",
    ],
    policySuggestions: [
      "Giờ mở cửa đón khách: 07:30 - 17:30 (Ngừng bán vé lúc 17:00)",
      "Quyền lợi vé bao gồm vào cổng toàn khu và các điểm check-in nội khu",
      "Chính sách trẻ em: Dưới 1m miễn phí; từ 1m - 1m4 tính 50% vé người lớn",
      "Miễn phí vé vào cổng (FOC) cho Hướng dẫn viên có thẻ HDV quốc tế/nội địa",
      "Hỗ trợ công ty du lịch đổi ngày tham quan trước 24 giờ không mất phí",
      "Có lối đi ưu tiên check-in nhanh (Fast-track) cho đoàn tour đông khách",
      "Hỗ trợ xe điện trung chuyển và thuyết minh viên tại điểm cho đoàn",
      "Có bãi đỗ xe rộng rãi miễn phí cho xe du lịch 16 - 45 chỗ",
    ],
    policyPlaceholder:
      "Nhập giờ mở cửa, quyền lợi vé, chính sách trẻ em, vé FOC cho hướng dẫn viên, đổi ngày...",
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
    sampleImages: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
      "https://images.unsplash.com/photo-1528127269322-539801943592?w=800",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
    ],
  },
};

// Helper to format money numbers with dot separator (e.g. 500000 -> "500.000")
const formatMoneyDisplay = (val: string | number | undefined): string => {
  if (val === undefined || val === null || val === "") return "";
  const clean = val.toString().replace(/\D/g, "");
  if (!clean) return "";
  return parseInt(clean, 10).toLocaleString("vi-VN");
};

// Helper to parse formatted money string to number (e.g. "500.000" -> 500000)
const parseMoneyNumber = (formatted: string): number => {
  const clean = formatted.replace(/\D/g, "");
  return clean ? parseInt(clean, 10) : 0;
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

  // Step state: 1: Loại hình & Ảnh | 2: Thông tin & Giá | 3: Vị trí & Bản đồ
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Category
  const [category, setCategory] = useState<ServiceCategory>(
    ((initialService?.category as ServiceCategory) &&
    CATEGORY_CONFIGS[initialService?.category as ServiceCategory]
      ? initialService?.category
      : "hotel") as ServiceCategory
  );

  const currentConfig = CATEGORY_CONFIGS[category];

  // Common Form Fields - Dùng placeholder, không tự điền trước theo yêu cầu
  const [name, setName] = useState(initialService?.name || "");
  const [subCategory, setSubCategory] = useState(
    initialService?.subCategory || currentConfig.subCategories[0]
  );
  const [capacity, setCapacity] = useState(
    initialService?.capacity?.toString() ||
      initialService?.totalRooms?.toString() ||
      initialService?.seats?.toString() ||
      ""
  );
  const [stars, setStars] = useState(initialService?.stars?.toString() || "4");
  const [description, setDescription] = useState(initialService?.description || "");
  const [operatingHours, setOperatingHours] = useState(
    initialService?.operatingHours || ""
  );

  // Policies (stored as string[])
  const normalizePolicies = (raw: any): string[] => {
    if (Array.isArray(raw))
      return raw.filter((item) => typeof item === "string" && item.trim().length > 0);
    if (typeof raw === "string" && raw.trim()) {
      const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      return lines.length > 0 ? lines : [raw.trim()];
    }
    return [];
  };

  const [policies, setPolicies] = useState<string[]>(() => {
    return initialService ? normalizePolicies(initialService.policies) : [];
  });
  const [customPolicyInput, setCustomPolicyInput] = useState("");

  // Amenities tags (stored as string[])
  const [amenities, setAmenities] = useState<string[]>(() => {
    return initialService?.amenities || [];
  });
  const [customAmenityInput, setCustomAmenityInput] = useState("");

  // Price range with dot formatting (e.g. "500.000") - Dùng placeholder
  const [priceFromDisplay, setPriceFromDisplay] = useState(
    initialService ? formatMoneyDisplay(initialService.priceFrom || initialService.price) : ""
  );
  const [priceToDisplay, setPriceToDisplay] = useState(
    initialService?.priceTo ? formatMoneyDisplay(initialService.priceTo) : ""
  );

  // Address: Province & Ward (strictly 2 levels)
  const [province, setProvince] = useState(initialService?.province || "Lâm Đồng");
  const [ward, setWard] = useState(initialService?.ward || "Phường 3");
  const [street, setStreet] = useState(initialService?.street || "");

  // GPS Map Coordinates
  const [latitude, setLatitude] = useState<number>(
    initialService?.latitude || 11.9404
  );
  const [longitude, setLongitude] = useState<number>(
    initialService?.longitude || 108.4583
  );

  // Photo Gallery & Thumbnail Selector (File only - URL input removed completely)
  const [images, setImages] = useState<string[]>(() => initialService
    ? [...new Set([initialService.thumbnailUrl || initialService.image, ...(initialService.images || [])].filter(Boolean))]
    : []);
  const [imageDrafts] = useState(() => new DeferredImageUploads());
  useEffect(() => () => imageDrafts.dispose(), [imageDrafts]);
  const [thumbnailIndex, setThumbnailIndex] = useState<number>(
    initialService?.thumbnailIndex || 0
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousProvince = useRef(initialService ? province : null);

  // Auto-sync wards and map coordinates when province changes
  useEffect(() => {
    if (previousProvince.current === province) return;
    previousProvince.current = province;
    const coords = getCoordinatesForProvince(province);
    setLatitude(coords.lat);
    setLongitude(coords.lng);
    const availableWards = getWardsForProvince(province);
    if (!availableWards.includes(ward)) {
      setWard(availableWards[0] || "Phường 1");
    }
  }, [province]);

  // Handle category switch - Giữ nguyên các trường người dùng nhập, chỉ cập nhật placeholder
  const handleSelectCategory = (newCat: ServiceCategory) => {
    setCategory(newCat);
    const cfg = CATEGORY_CONFIGS[newCat];
    if (!isEditing) {
      setSubCategory(cfg.subCategories[0]);
      // Tuyệt đối không tự động ghi đè hoặc tự nhập trước tên, giá, số phòng, tiện ích, chính sách
    }
  };

  // Selecting files only creates browser previews. Upload happens on Save / Submit for review.
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (saving || uploading) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSaveError("");
    try {
      if (images.length + files.length > 21) throw new Error("Tối đa 21 ảnh gồm ảnh đại diện.");
      const previews = imageDrafts.stage(Array.from(files));
      setImages((previous) => [...previous, ...previews]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Không thể đọc ảnh đã chọn.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    if (saving || uploading) return;
    if (images.length <= 1) {
      alert("Cần giữ lại ít nhất 1 hình ảnh cho bài đăng dịch vụ.");
      return;
    }
    const filtered = images.filter((_, i) => i !== index);
    imageDrafts.retain(filtered);
    setImages(filtered);
    if (thumbnailIndex === index) {
      setThumbnailIndex(0);
    } else if (thumbnailIndex > index) {
      setThumbnailIndex(thumbnailIndex - 1);
    }
  };

  // Policy actions (NO numbering, card row)
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

  // Amenity actions (NO numbering, card row with Emerald theme)
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

  // Form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving || uploading) return;
    if (initialService?.status === "hidden") {
      setSaveError("Bài đăng đã bị Admin ẩn, không thể chỉnh sửa. Vui lòng tạo bài đăng mới để gửi duyệt.");
      return;
    }
    setSaveError("");

    if (!name.trim()) {
      alert("Vui lòng nhập tên dịch vụ / cơ sở.");
      setCurrentStep(2);
      return;
    }

    if (images.length === 0) {
      alert("Vui lòng tải lên ít nhất 1 hình ảnh.");
      setCurrentStep(1);
      return;
    }

    const fromVal = parseMoneyNumber(priceFromDisplay);
    const toVal = parseMoneyNumber(priceToDisplay) || fromVal;
    const locationParts = [street, ward, province].filter(Boolean);
    const fullLocation = locationParts.join(", ");
    const thumbnailPhoto = images[thumbnailIndex] || images[0] || "";
    // Theo yêu cầu: ảnh thumbnail lưu ở thumbnail_url, các ảnh còn lại lưu trong cột images
    const remainingImages = images.filter((_, idx) => idx !== thumbnailIndex);
    const capacityVal = parseInt(capacity) || 0;

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
      stars: category === "hotel" ? parseInt(stars) || 4 : undefined,
      policies,
      amenities,
      location: fullLocation,
      fullAddress: fullLocation,
      province,
      ward,
      street,
      latitude,
      longitude,
      image: thumbnailPhoto,
      thumbnailUrl: thumbnailPhoto,
      images: remainingImages,
      operatingHours: operatingHours.trim(),
      rating: initialService?.rating ?? 5.0,
      status: "pending",
      createdAt: initialService?.createdAt || new Date().toISOString().split("T")[0],
    };

    setSaving(true);
    try {
      setUploading(true);
      const uploadedImages = await imageDrafts.resolve(images, uploadServiceImage);
      setUploading(false);
      const primaryIndex = Math.min(thumbnailIndex, uploadedImages.length - 1);
      const thumbnailUrl = uploadedImages[primaryIndex];
      await onSaveService({ ...fullPayload, image: thumbnailUrl, thumbnailUrl,
        images: uploadedImages.filter((_, index) => index !== primaryIndex) });
    }
    catch (error) { setSaveError(error instanceof Error ? error.message : "Không thể lưu bài đăng."); }
    finally { setUploading(false); setSaving(false); }
  };

  const formatPriceRangeDisplay = () => {
    const fromVal = parseMoneyNumber(priceFromDisplay);
    const toVal = parseMoneyNumber(priceToDisplay);
    const unit = category === "hotel" ? "phòng" : "người";
    if (fromVal > 0 && toVal > fromVal) {
      return `${fromVal.toLocaleString("vi-VN")}đ - ${toVal.toLocaleString("vi-VN")}đ / ${unit}`;
    }
    if (fromVal > 0) {
      return `Từ ${fromVal.toLocaleString("vi-VN")}đ / ${unit}`;
    }
    return "Liên hệ báo giá";
  };

  const ActiveIcon = currentConfig.icon;

  // Build full preview object matching Service type for ProviderServiceDetailPage
  const previewThumbnail = images[thumbnailIndex] || images[0] || "";
  const previewServiceObj: Service = {
    id: initialService?.id || "preview-service-id",
    providerId: currentUser.id,
    providerName: currentUser.businessName || currentUser.name,
    name: name || currentConfig.defaultName,
    category,
    subCategory,
    description: description || "Chưa có mô tả chi tiết cho dịch vụ này.",
    price: parseMoneyNumber(priceFromDisplay),
    priceFrom: parseMoneyNumber(priceFromDisplay),
    priceTo: parseMoneyNumber(priceToDisplay) || parseMoneyNumber(priceFromDisplay),
    pricePerPerson: parseMoneyNumber(priceFromDisplay),
    capacity: parseInt(capacity) || 0,
    stars: category === "hotel" ? parseInt(stars) || 4 : undefined,
    policies,
    amenities,
    location: [street, ward, province].filter(Boolean).join(", "),
    fullAddress: [street, ward, province].filter(Boolean).join(", "),
    province,
    ward,
    street,
    latitude,
    longitude,
    image: previewThumbnail,
    thumbnailUrl: previewThumbnail,
    images: images,
    operatingHours: operatingHours.trim(),
    rating: initialService?.rating ?? 5.0,
    status: "pending",
    createdAt: initialService?.createdAt || new Date().toISOString().split("T")[0],
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200 max-w-6xl mx-auto">
      {saveError && <div role="alert" className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">{saveError}</div>}
      {(saving || uploading) && <p role="status" className="text-sm text-sky-800">{uploading ? "Đang tải ảnh lên Cloudinary…" : "Đang lưu bài đăng…"}</p>}
      {/* Top Header Bar */}
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
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {isEditing ? "Chỉnh sửa bài đăng dịch vụ" : "Đăng Dịch Vụ Mới"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Cung cấp dịch vụ lên sàn TripOps để các công ty lữ hành dễ dàng tìm kiếm và tích hợp tour
            </p>
          </div>
        </div>

        {/* Form vs Preview Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-full sm:w-auto justify-end">
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
            Nhập liệu biểu mẫu
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
      {/* VIEW MODE 1: FORM WITH STREAMLINED 3-STEP WIZARD         */}
      {/* ========================================================= */}
      {viewMode === "form" && (
        <div className="space-y-6">
          {/* Stepper Navigation Indicator - NO NUMERIC 1,2,3 LABELS IN HEADINGS */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2.5 p-2 sm:p-3 rounded-xl text-left transition-all ${
                  currentStep === 1
                    ? "bg-[#F0F9FF] border border-[#CBD5E1] text-[#075985]"
                    : currentStep > 1
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    currentStep === 1
                      ? "bg-[#075985] text-white"
                      : currentStep > 1
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold leading-none">
                    Loại hình & Hình ảnh
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">
                    Chọn dịch vụ & Chọn Thumbnail
                  </div>
                </div>
                <div className="sm:hidden text-xs font-bold truncate">Dịch vụ & Ảnh</div>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`flex items-center gap-2.5 p-2 sm:p-3 rounded-xl text-left transition-all ${
                  currentStep === 2
                    ? "bg-[#F0F9FF] border border-[#CBD5E1] text-[#075985]"
                    : currentStep > 2
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    currentStep === 2
                      ? "bg-[#075985] text-white"
                      : currentStep > 2
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold leading-none">
                    Thông tin & Bảng giá
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">
                    Tên, phân loại, giá, tiện ích & quy định
                  </div>
                </div>
                <div className="sm:hidden text-xs font-bold truncate">Thông tin & Giá</div>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`flex items-center gap-2.5 p-2 sm:p-3 rounded-xl text-left transition-all ${
                  currentStep === 3
                    ? "bg-[#F0F9FF] border border-[#CBD5E1] text-[#075985]"
                    : "text-gray-400 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    currentStep === 3
                      ? "bg-[#075985] text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold leading-none">
                    Vị trí & Bản đồ
                  </div>
                  <div className="text-[11px] opacity-75 mt-0.5">
                    Click ghim trên bản đồ GPS
                  </div>
                </div>
                <div className="sm:hidden text-xs font-bold truncate">Bản đồ GPS</div>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 1: CHỌN DỊCH VỤ & QUẢN LÝ ẢNH (CHỌN THUMBNAIL)       */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Section: 4 Loại hình dịch vụ (NO 1234 numbering in title) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#075985]" />
                      Chọn loại hình dịch vụ du lịch
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Chọn đúng danh mục giúp hệ thống phân phối tới đúng các công ty lữ hành phù hợp
                    </p>
                  </div>
                  <Badge className={`${currentConfig.bgLight} border-0 text-xs font-semibold`}>
                    <ActiveIcon className="w-3.5 h-3.5 mr-1" />
                    {currentConfig.shortLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(Object.keys(CATEGORY_CONFIGS) as ServiceCategory[]).map((catKey) => {
                    const opt = CATEGORY_CONFIGS[catKey];
                    const Icon = opt.icon;
                    const isSelected = category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelectCategory(opt.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-32 relative overflow-hidden group ${
                          isSelected
                            ? "border-[#075985] bg-[#F0F9FF]/80 shadow-xs ring-2 ring-[#075985]/20"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#075985] text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${opt.color} shadow-xs`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-gray-900">
                            {opt.label}
                          </div>
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {opt.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section: Quản lý ảnh & Chọn Thumbnail (NO 1234, URL removed) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#075985]" />
                      Bộ sưu tập hình ảnh & Chọn ảnh đại diện (Thumbnail)
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Tải lên hình ảnh từ máy tính. Bấm vào nút <strong>"Đặt làm Thumbnail"</strong> hoặc click trực tiếp vào ảnh để chọn làm ảnh bìa chính trên sàn.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#075985] border border-blue-100">
                      {images.length} hình ảnh • Ảnh bìa số {thumbnailIndex + 1}
                    </span>

                  </div>
                </div>

                {/* File Upload Box (URL box removed completely) */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    disabled={saving || uploading}
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="service-image-file-input"
                  />
                  <label
                    htmlFor="service-image-file-input"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#CBD5E1] hover:border-[#075985] rounded-2xl cursor-pointer bg-gradient-to-b from-[#F0F9FF]/30 to-gray-50/50 hover:bg-[#F0F9FF]/60 transition-all text-center h-28 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#075985] group-hover:scale-110 transition-transform mb-1.5 border border-blue-100">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-gray-800">
                      Nhấp để chọn ảnh từ máy tính của bạn
                    </span>
                    <span className="text-[11px] text-gray-500 mt-0.5">
                      Hỗ trợ PNG, JPG, JPEG, tối đa 5 MB/ảnh (Có thể chọn cùng lúc nhiều ảnh)
                    </span>
                  </label>
                </div>

                {/* Images Grid with Thumbnail Selection */}
                <div className="pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {images.length === 0 ? (
                      <div className="col-span-full py-10 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/60 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#075985] flex items-center justify-center mb-2">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-gray-700">Chưa có hình ảnh nào được tải lên</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Vui lòng bấm vào khung phía trên để tải lên ít nhất 1 hình ảnh từ thiết bị của bạn
                        </p>
                      </div>
                    ) : (
                      images.map((img, idx) => {
                      const isThumbnail = thumbnailIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => setThumbnailIndex(idx)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group h-44 bg-gray-100 ${
                            isThumbnail
                              ? "border-[#075985] ring-4 ring-[#075985]/20 shadow-md"
                              : "border-gray-200 hover:border-gray-400 hover:shadow-xs"
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Ảnh ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Gradient shade */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                          {/* Thumbnail Badge (Always visible on thumbnail) */}
                          {isThumbnail ? (
                            <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                              <Star className="w-3.5 h-3.5 fill-white" />
                              Ảnh đại diện chính (Thumbnail)
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setThumbnailIndex(idx);
                              }}
                              className="absolute top-2.5 left-2.5 bg-black/60 hover:bg-[#075985] text-white text-[10px] font-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                            >
                              <Star className="w-3 h-3" />
                              Đặt làm Thumbnail
                            </button>
                          )}

                          {/* Image index indicator */}
                          <div className="absolute bottom-2.5 left-2.5 text-white/90 text-[11px] font-semibold bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-xs">
                            Ảnh {idx + 1}
                          </div>

                          {/* Delete button */}
                          {images.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(idx);
                              }}
                              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm"
                              title="Xóa hình ảnh này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                </div>
              </div>

              {/* Bottom Next Step Bar */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  className="rounded-xl border-gray-300 text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#075985] hover:bg-[#0369a1] text-white rounded-xl text-xs font-semibold px-6 shadow-xs"
                >
                  Tiếp tục: Thông tin & Bảng giá
                  <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: THÔNG TIN DỊCH VỤ, BẢNG GIÁ, TIỆN ÍCH & CHÍNH SÁCH */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Card 1: Thông tin cơ bản & Quy mô (NO 1234 in title) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#075985]" />
                      Thông tin nhận diện & Quy mô cơ sở
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Các trường thông tin sẽ lưu trực tiếp xuống bảng <strong>service</strong> trong cơ sở dữ liệu
                    </p>
                  </div>
                  <Badge className={`${currentConfig.bgLight} border-0 text-xs font-semibold`}>
                    <ActiveIcon className="w-3.5 h-3.5 mr-1" />
                    {currentConfig.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Tên cơ sở / Dịch vụ */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tên dịch vụ / Cơ sở đăng tải *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={`Ví dụ: ${currentConfig.defaultName}`}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      required
                    />
                  </div>

                  {/* Phân loại chi tiết (subCategory) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Phân loại chi tiết *
                    </label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white"
                    >
                      {currentConfig.subCategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sức chứa / Quy mô (capacity) */}
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
                        className="w-full pl-3.5 pr-14 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                        {currentConfig.capacityUnit}
                      </span>
                    </div>
                  </div>

                  {/* Hạng sao (nếu là khách sạn) */}
                  {category === "hotel" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Xếp hạng sao
                      </label>
                      <select
                        value={stars}
                        onChange={(e) => setStars(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white"
                      >
                        <option value="5">5 Sao ⭐⭐⭐⭐⭐ (Sang trọng quốc tế)</option>
                        <option value="4">4 Sao ⭐⭐⭐⭐ (Cao cấp)</option>
                        <option value="3">3 Sao ⭐⭐⭐ (Tiêu chuẩn)</option>
                        <option value="2">2 Sao ⭐⭐ (Kinh tế)</option>
                        <option value="1">1 Sao ⭐</option>
                        <option value="0">Tiêu chuẩn du lịch (Chưa xếp sao)</option>
                      </select>
                    </div>
                  )}

                  {/* Khung giờ hoạt động / đón khách (operating_hours) */}
                  <div className={category === "hotel" ? "md:col-span-2 lg:col-span-3" : ""}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {category === "hotel" ? "Khung giờ nhận / trả phòng" : "Khung giờ hoạt động & đón khách"}
                    </label>
                    <input
                      type="text"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      placeholder={
                        category === "hotel"
                          ? "VD: Nhận phòng: 14:00 - Trả phòng: 12:00"
                          : "VD: 07:30 - 22:00 hàng ngày"
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white"
                    />
                  </div>

                  {/* Mô tả giới thiệu */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Mô tả giới thiệu dịch vụ
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Giới thiệu đôi nét nổi bật về không gian, thực đơn, tiện nghi phòng, phong cách phục vụ..."
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Bảng giá niêm yết (Formatted with dot separator: 500.000, NO 1234 in title) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#075985]" />
                      Khoảng giá tham khảo niêm yết
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Mức giá giúp các công ty lữ hành ước tính chi phí khi lên chương trình tour
                    </p>
                  </div>
                  <div className="text-xs font-bold text-[#075985] bg-[#F0F9FF] px-3 py-1 rounded-xl border border-blue-100">
                    {formatPriceRangeDisplay()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mức giá từ */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Mức giá từ (Tối thiểu / {category === "hotel" ? "phòng" : "người"}) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceFromDisplay}
                        onChange={(e) => {
                          const formatted = formatMoneyDisplay(e.target.value);
                          setPriceFromDisplay(formatted);
                        }}
                        placeholder={category === "hotel" ? "VD: 600.000" : "VD: 200.000"}
                        className="w-full pl-3.5 pr-20 py-2.5 text-base font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none font-mono"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold">
                        VNĐ / {category === "hotel" ? "phòng" : "người"}
                      </span>
                    </div>
                  </div>

                  {/* Mức giá đến */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Mức giá đến (Tối đa / {category === "hotel" ? "phòng" : "người"})
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={priceToDisplay}
                        onChange={(e) => {
                          const formatted = formatMoneyDisplay(e.target.value);
                          setPriceToDisplay(formatted);
                        }}
                        placeholder="VD: 950.000"
                        className="w-full pl-3.5 pr-20 py-2.5 text-base font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none font-mono"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-semibold">
                        VNĐ / {category === "hotel" ? "phòng" : "người"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Tiện ích & Tiện nghi cơ sở (NO 1234, INDIVIDUAL CARDS, EMERALD COLOR THEME) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Tiện ích & Tiện nghi cơ sở
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Các tiện nghi phòng, trang thiết bị, dịch vụ gia tăng phục vụ khách đoàn
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Đã thêm {amenities.length} tiện ích
                  </span>
                </div>

                {/* Input new amenity */}
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
                    placeholder="Nhập tiện ích/tiện nghi mới (VD: Trạm sạc xe điện, Ghế massage, Bể bơi vô cực, Menu ăn kiêng...)"
                    className="flex-1 px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddAmenity()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm tiện ích
                  </Button>
                </div>

                {/* Amenities List - Rendered as individual cards, Emerald color theme, NO numbering */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {amenities.length > 0 ? (
                    amenities.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 p-2.5 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-xl border border-emerald-200 text-xs text-emerald-950 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 flex-1">
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span className="leading-relaxed font-semibold text-emerald-900">
                            {item}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAmenity(item)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                          title={`Xóa tiện ích "${item}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      Chưa có tiện ích nào. Hãy nhập tiện ích ở trên hoặc chọn nhanh từ danh mục gợi ý bên dưới.
                    </div>
                  )}
                </div>

                {/* Quick Add Preset Amenities Chips */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                    Gợi ý tiện ích theo ngành (Bấm để thêm nhanh):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentConfig.amenities.map((sug) => {
                      const isAdded = amenities.includes(sug);
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            if (isAdded) {
                              handleRemoveAmenity(sug);
                            } else {
                              handleAddAmenity(sug);
                            }
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition-all flex items-center gap-1 ${
                            isAdded
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                              : "bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border-gray-200"
                          }`}
                        >
                          <span>{isAdded ? "✓" : "+"}</span>
                          <span>{sug}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 4: Chính sách, điều kiện & Quy định phục vụ (NO 1234 numbering in title or cards, "Áp dụng mẫu chuẩn" removed) */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#075985]" />
                      Chính sách, điều kiện & Quy định phục vụ
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Khung giờ phục vụ, chính sách FOC cho HDV/lái xe, điều kiện hủy đổi, trẻ em và xuất hóa đơn VAT
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-[#075985] border border-blue-100">
                    Đã thêm {policies.length} điều khoản
                  </span>
                </div>

                {/* Input new policy */}
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
                    className="flex-1 px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddPolicy()}
                    className="bg-[#075985] hover:bg-[#0369a1] text-white rounded-xl text-xs font-semibold px-4 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm điều khoản
                  </Button>
                </div>

                {/* Policies List - NO NUMBERS (1, 2, 3, 4 replaced with bullet icon) */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {policies.map((pol, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 p-2.5 bg-gray-50/90 hover:bg-gray-100/90 rounded-xl border border-gray-200 text-xs text-gray-800 transition-colors"
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <div className="w-4 h-4 rounded-full bg-[#E0F2FE] text-[#075985] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#075985]" />
                        </div>
                        <span className="leading-relaxed font-medium text-gray-800">{pol}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePolicy(idx)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                        title="Xóa điều khoản này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Rich industry suggestions from research (Google/Hospitality standard) */}
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                    Gợi ý chính sách thực tế theo ngành du lịch (Bấm để thêm nhanh vào danh sách):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentConfig.policySuggestions.map((sug) => {
                      const isAdded = policies.includes(sug);
                      return (
                        <button
                          key={sug}
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
                              ? "bg-blue-100 text-[#075985] border-blue-300 font-semibold"
                              : "bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-[#075985] border-gray-200"
                          }`}
                        >
                          <span>{isAdded ? "✓" : "+"}</span>
                          <span>{sug}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="rounded-xl border-gray-300 text-xs gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Quay lại: Ảnh & Dịch vụ
                </Button>
                <Button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="bg-[#075985] hover:bg-[#0369a1] text-white rounded-xl text-xs font-semibold px-6 shadow-xs"
                >
                  Tiếp tục: Vị trí & Bản đồ
                  <ChevronRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: VỊ TRÍ, ĐỊA CHỈ & BẢN ĐỒ LEAFLET CLICK-TO-PIN     */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#075985]" />
                    Địa chỉ hành chính & Định vị bản đồ GPS
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Chọn Tỉnh/Thành, Phường/Xã và nhấp chuột trực tiếp lên bản đồ để lấy tọa độ chính xác cho cơ sở
                  </p>
                </div>

                {/* 2-level address: Province & Ward */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tỉnh / Thành phố *
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white font-medium"
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
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Phường / Xã *
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none bg-white font-medium"
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
                      placeholder="Ví dụ: 02 Trần Phú, Đèo Prenn, Khu vực Bãi Dài..."
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Interactive Leaflet Map with Click-to-pin */}
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

              {/* Summary review before submit */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5 rounded-2xl border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-blue-950">
                      Sẵn sàng đăng tải dịch vụ "{name}"
                    </h4>
                    <p className="text-xs text-blue-800 mt-0.5">
                      {currentConfig.label} • {images.length} hình ảnh (Ảnh bìa đã chọn) • {formatPriceRangeDisplay()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewMode("preview")}
                    className="rounded-xl border-blue-300 text-blue-900 hover:bg-blue-100/70 text-xs font-semibold"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Xem trước bài đăng
                  </Button>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="rounded-xl border-gray-300 text-xs gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Quay lại: Thông tin & Giá
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={saving || uploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-6 shadow-xs gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isEditing ? "Cập nhật bài đăng" : "Hoàn tất & Gửi duyệt"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW MODE 2: EXACT MATCH WITH ProviderServiceDetailPage  */}
      {/* ========================================================= */}
      {viewMode === "preview" && (
        <div className="space-y-4">
          {/* Top Banner Alert for Live Preview */}
          <div className="p-4 bg-gradient-to-r from-[#075985] to-[#0369a1] text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  Chế độ mô phỏng trực tiếp (Live Preview)
                </h3>
                <p className="text-xs text-blue-100">
                  Giao diện hiển thị giống 100% trang chi tiết bài đăng trong mục Quản lý dịch vụ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setViewMode("form")}
                size="sm"
                className="bg-white text-[#075985] hover:bg-blue-50 font-bold rounded-xl text-xs"
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                Quay lại chỉnh sửa
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={saving || uploading}
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                {isEditing ? "Cập nhật bài đăng" : "Gửi duyệt ngay"}
              </Button>
            </div>
          </div>

          {/* Render the EXACT ProviderServiceDetailPage from Service Management (Quản lý ảnh already removed) */}
          <ProviderServiceDetailPage
            service={previewServiceObj}
            onBack={() => setViewMode("form")}
            backTitle="Quay lại biểu mẫu đăng bài"
          />
        </div>
      )}
    </div>
  );
}
