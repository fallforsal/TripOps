import { useState } from "react";
import {
  X,
  Hotel,
  Utensils,
  Car,
  Activity,
  Compass,
  CheckCircle,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Service, ProviderType } from "@/app/types";

interface CreatePostModalProps {
  currentProvider: {
    id: string;
    name: string;
    providerType?: ProviderType;
  };
  handleSubmitService: (
    serviceData: Omit<Service, "id">,
  ) => void;
  onClose: () => void;
}

export type ServiceCategory =
  | "hotel"
  | "fnb"
  | "attraction"
  | "activity"
  | "transportation";

const categoryOptions = [
  {
    value: "hotel" as ServiceCategory,
    label: "Lưu trú & Khách sạn",
    description: "Khách sạn, Resort, Homestay, Villa nguyên căn",
    icon: Hotel,
    color: "from-blue-500 to-indigo-600",
    bgHover: "hover:border-blue-500 hover:bg-[#F0F9FF]/60",
  },
  {
    value: "fnb" as ServiceCategory,
    label: "Ẩm thực & Nhà hàng",
    description: "Nhà hàng, Quán ăn đặc sản, Tiệc nướng, Quán Cafe",
    icon: Utensils,
    color: "from-amber-500 to-orange-600",
    bgHover: "hover:border-amber-500 hover:bg-amber-50/60",
  },
  {
    value: "attraction" as ServiceCategory,
    label: "Điểm tham quan & Vé",
    description: "Danh lam thắng cảnh, Di tích lịch sử, Khu sinh thái",
    icon: Compass,
    color: "from-teal-500 to-emerald-600",
    bgHover: "hover:border-teal-500 hover:bg-teal-50/60",
  },
  {
    value: "activity" as ServiceCategory,
    label: "Hoạt động & Trải nghiệm",
    description: "Tour trải nghiệm, Chèo Sup, Trekking, Thể thao mạo hiểm",
    icon: Sparkles,
    color: "from-purple-500 to-pink-600",
    bgHover: "hover:border-purple-500 hover:bg-[#F0F9FF]/60",
  },
  {
    value: "transportation" as ServiceCategory,
    label: "Phương tiện & Vận chuyển",
    description: "Xe du lịch 4-45 chỗ, Limousine, Tàu cano, Thuê xe máy",
    icon: Car,
    color: "from-cyan-500 to-blue-600",
    bgHover: "hover:border-cyan-500 hover:bg-cyan-50/60",
  },
];

const vietnamProvinces = [
  "Lâm Đồng",
  "Khánh Hòa",
  "Kiên Giang",
  "Đà Nẵng",
  "Quảng Nam",
  "Hà Nội",
  "Hồ Chí Minh",
  "Thừa Thiên Huế",
  "Bình Thuận",
  "Bà Rịa - Vũng Tàu",
  "Quảng Ninh",
  "Ninh Bình",
  "Hải Phòng",
  "Cần Thơ",
  "An Giang",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Kon Tum",
  "Lai Châu",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Ngãi",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

export function CreatePostModal({
  currentProvider,
  handleSubmitService,
  onClose,
}: CreatePostModalProps) {
  const [step, setStep] = useState<"category" | "form">("category");
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Common fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [capacity, setCapacity] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Detailed Address fields
  const [province, setProvince] = useState("Lâm Đồng");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [street, setStreet] = useState("");

  // Hotel fields
  const [roomType, setRoomType] = useState("Phòng Deluxe Hướng Phố");
  const [stars, setStars] = useState("4");
  const [amenities, setAmenities] = useState<string[]>([
    "Wifi miễn phí",
    "Điều hòa nhiệt độ",
    "Phòng tắm riêng",
    "Tivi truyền hình cáp",
  ]);
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [amenityInput, setAmenityInput] = useState("");

  // FnB fields
  const [subCategory, setSubCategory] = useState("restaurant");
  const [cuisineType, setCuisineType] = useState("Món ăn đặc sản địa phương");
  const [openingHours, setOpeningHours] = useState("07:00 - 22:00");
  const [dietaryOptions, setDietaryOptions] = useState<string[]>([
    "Có món chay",
    "Hải sản tươi sống",
  ]);
  const [dietaryInput, setDietaryInput] = useState("");

  // Attraction fields
  const [childPrice, setChildPrice] = useState("");
  const [ticketIncludes, setTicketIncludes] = useState(
    "Vé vào cổng tham quan, xe điện nội khu, hướng dẫn viên giới thiệu",
  );

  // Transportation fields
  const [vehicleType, setVehicleType] = useState("Xe 16 chỗ Limousine");
  const [seats, setSeats] = useState("16");

  // Activity fields
  const [duration, setDuration] = useState("3 - 4 giờ");
  const [difficultyLevel, setDifficultyLevel] = useState("Trung bình");
  const [ageRestriction, setAgeRestriction] = useState("Từ 6 tuổi trở lên");
  const [safetyGear, setSafetyGear] = useState("Áo phao, mũ bảo hiểm, dây bảo hiểm chuyên dụng");

  const handleCategorySelect = (selectedCategory: ServiceCategory) => {
    setCategory(selectedCategory);
    setStep("form");
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim()) {
      const items = amenityInput
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a && !amenities.includes(a));
      if (items.length > 0) {
        setAmenities([...amenities, ...items]);
        setAmenityInput("");
      }
    }
  };

  const handleRemoveAmenity = (item: string) => {
    setAmenities(amenities.filter((a) => a !== item));
  };

  const handleAddDietary = () => {
    if (dietaryInput.trim() && !dietaryOptions.includes(dietaryInput.trim())) {
      setDietaryOptions([...dietaryOptions, dietaryInput.trim()]);
      setDietaryInput("");
    }
  };

  const handleRemoveDietary = (item: string) => {
    setDietaryOptions(dietaryOptions.filter((d) => d !== item));
  };

  const getDefaultCoverImage = (cat: ServiceCategory) => {
    switch (cat) {
      case "hotel":
        return "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800";
      case "fnb":
        return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800";
      case "attraction":
        return "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800";
      case "activity":
        return "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800";
      case "transportation":
        return "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const locationParts = [street, ward, district, province].filter(Boolean);
    const fullLocation = locationParts.join(", ");
    const finalImage = imageUrl.trim() || getDefaultCoverImage(category!);

    const baseService = {
      providerId: currentProvider.id,
      providerName: currentProvider.name,
      name,
      category: category!,
      description,
      price: parseFloat(price) || 0,
      pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : undefined,
      location: fullLocation,
      province,
      district,
      ward,
      street,
      image: finalImage,
      images: [finalImage],
      rating: 5.0,
      capacity: capacity ? parseInt(capacity) : undefined,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    let serviceData: Omit<Service, "id">;

    switch (category) {
      case "hotel":
        serviceData = {
          ...baseService,
          stars: parseInt(stars) || 3,
          roomType,
          amenities,
          checkInTime,
          checkOutTime,
        };
        break;
      case "fnb":
        serviceData = {
          ...baseService,
          subCategory,
          cuisineType,
          openingHours,
          dietaryOptions,
        };
        break;
      case "attraction":
        serviceData = {
          ...baseService,
          childPrice: childPrice ? parseFloat(childPrice) : undefined,
          ticketIncludes,
          openingHours,
        };
        break;
      case "activity":
        serviceData = {
          ...baseService,
          duration,
          difficultyLevel,
          ageRestriction,
          safetyGear,
        };
        break;
      case "transportation":
        serviceData = {
          ...baseService,
          vehicleType,
          seats: parseInt(seats) || 4,
          amenities,
        };
        break;
      default:
        serviceData = baseService;
    }

    handleSubmitService(serviceData);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  const selectedCategoryMeta = categoryOptions.find((o) => o.value === category);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Đăng Dịch Vụ Mới
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === "category"
                ? "Bước 1: Chọn loại hình dịch vụ bạn muốn đăng (không giới hạn loại tài khoản)"
                : `Bước 2: Điền thông tin chuẩn hóa cho [${selectedCategoryMeta?.label}]`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: CATEGORY SELECTION */}
          {step === "category" && (
            <div className="space-y-4">
              <div className="bg-[#F0F9FF]/70 border border-[#CBD5E1] rounded-xl p-4 text-xs text-blue-800">
                💡 <strong>Hệ thống mở:</strong> Bất kỳ Nhà cung cấp nào cũng có thể đăng nhiều loại dịch vụ khác nhau (Khách sạn, Nhà hàng ẩm thực, Điểm tham quan, Tour trải nghiệm, Vận chuyển) để kết nối trực tiếp với các đơn vị tổ chức Tour.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {categoryOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleCategorySelect(option.value)}
                      className={`p-5 rounded-2xl border-2 border-gray-200 ${option.bgHover} transition-all text-left group flex flex-col justify-between h-52`}
                    >
                      <div>
                        <div
                          className={`w-12 h-12 bg-gradient-to-br ${option.color} rounded-xl flex items-center justify-center mb-4 text-white shadow-md group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          {option.label}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-[#075985] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Chọn loại này →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: DYNAMIC FORM */}
          {step === "form" && category && !showSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Indicator Banner */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedCategoryMeta?.color} text-white`}>
                    {selectedCategoryMeta && <selectedCategoryMeta.icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Đang đăng loại hình</div>
                    <div className="text-sm font-bold text-gray-900">{selectedCategoryMeta?.label}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("category")}
                  className="text-xs text-[#075985] hover:underline font-semibold"
                >
                  Đổi loại hình khác
                </button>
              </div>

              {/* 1. Basic Common Fields */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-[#075985] flex items-center gap-2">
                  <span>1. Thông tin giới thiệu chung</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Tên dịch vụ / Cơ sở *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder={`Ví dụ: ${
                        category === "hotel"
                          ? "Khách sạn Sunrise Beach Resort & Spa"
                          : category === "fnb"
                          ? "Nhà hàng Hải Sản Gió Biển"
                          : category === "attraction"
                          ? "Vé tham quan Thung lũng Tình Yêu"
                          : category === "activity"
                          ? "Trải nghiệm Chèo Sup & Ngắm Bình Minh Hồ Tuyền Lâm"
                          : "Xe Limousine 16 chỗ đưa đón sân bay"
                      }`}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Mô tả chi tiết dịch vụ *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none resize-none"
                      placeholder="Mô tả các điểm nổi bật, chất lượng phục vụ, không gian..."
                      required
                    />
                  </div>

                  {/* Giá cơ bản */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      {category === "hotel"
                        ? "Giá niêm yết (VNĐ/đêm) *"
                        : category === "attraction"
                        ? "Giá vé người lớn (VNĐ/vé) *"
                        : category === "transportation"
                        ? "Giá thuê (VNĐ/ngày hoặc chuyến) *"
                        : "Giá niêm yết (VNĐ) *"}
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>

                  {/* Giá theo người (nếu có) */}
                  {category !== "hotel" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {category === "attraction"
                          ? "Giá vé trẻ em (VNĐ/vé)"
                          : "Giá tính theo người (VNĐ/người)"}
                      </label>
                      <input
                        type="number"
                        value={category === "attraction" ? childPrice : pricePerPerson}
                        onChange={(e) =>
                          category === "attraction"
                            ? setChildPrice(e.target.value)
                            : setPricePerPerson(e.target.value)
                        }
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Để trống nếu không áp dụng"
                        min="0"
                      />
                    </div>
                  )}

                  {/* Sức chứa */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      {category === "hotel"
                        ? "Sức chứa tối đa (Khách/phòng)"
                        : category === "transportation"
                        ? "Số lượng chỗ ngồi (Ghế) *"
                        : "Sức chứa tối đa / Lượt đón (Người)"}
                    </label>
                    <input
                      type="number"
                      value={category === "transportation" ? seats : capacity}
                      onChange={(e) =>
                        category === "transportation"
                          ? setSeats(e.target.value)
                          : setCapacity(e.target.value)
                      }
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder="Ví dụ: 2, 4, 16, 50..."
                      min="1"
                    />
                  </div>

                  {/* Ảnh đại diện URL */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Link ảnh đại diện (URL)
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder="https://images.unsplash.com/... (để trống sẽ dùng ảnh mẫu)"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Detailed Address */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-emerald-700 flex items-center gap-2">
                  <span>2. Địa chỉ & Khu vực hoạt động</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Tỉnh / Thành phố *
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      required
                    >
                      {vietnamProvinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Quận / Huyện *
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder="Ví dụ: TP. Đà Lạt, Quận 1, Huyện Phú Quốc..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Phường / Xã
                    </label>
                    <input
                      type="text"
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder="Ví dụ: Phường 1, Xã Gành Dầu..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Số nhà, Tên đường / Địa danh
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      placeholder="Ví dụ: 12 Trần Phú, Bãi Dài..."
                    />
                  </div>
                </div>
              </div>

              {/* 3. CATEGORY SPECIFIC FIELDS */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-[#EA580C] flex items-center gap-2">
                  <span>3. Thông số chuyên ngành [{selectedCategoryMeta?.label}]</span>
                </h3>

                {/* HOTEL */}
                {category === "hotel" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Hạng sao khách sạn
                        </label>
                        <select
                          value={stars}
                          onChange={(e) => setStars(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        >
                          <option value="1">1 Sao ⭐</option>
                          <option value="2">2 Sao ⭐⭐</option>
                          <option value="3">3 Sao ⭐⭐⭐</option>
                          <option value="4">4 Sao ⭐⭐⭐⭐</option>
                          <option value="5">5 Sao ⭐⭐⭐⭐⭐</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Tên hạng phòng
                        </label>
                        <input
                          type="text"
                          value={roomType}
                          onChange={(e) => setRoomType(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Deluxe, Superior, Suite..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Giờ nhận / trả phòng
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Amenities tag manager */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tiện nghi phòng & khách sạn
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={amenityInput}
                          onChange={(e) => setAmenityInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAmenity())}
                          className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Nhập tiện nghi (VD: Bể bơi vô cực, Buffet sáng, Gym...) rồi bấm Thêm"
                        />
                        <button
                          type="button"
                          onClick={handleAddAmenity}
                          className="px-4 py-2 bg-[#075985] text-white rounded-lg text-xs font-semibold hover:bg-[#F97316]"
                        >
                          Thêm
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {amenities.map((item) => (
                          <span
                            key={item}
                            className="px-2.5 py-1 bg-[#F0F9FF] text-[#075985] rounded-lg text-xs flex items-center gap-1.5 border border-[#CBD5E1]"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => handleRemoveAmenity(item)}
                              className="text-blue-500 hover:text-blue-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* FNB */}
                {category === "fnb" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Phân loại hình ẩm thực
                        </label>
                        <select
                          value={subCategory}
                          onChange={(e) => setSubCategory(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        >
                          <option value="restaurant">Nhà hàng ăn uống</option>
                          <option value="cafe">Quán Cà phê & Trà</option>
                          <option value="streetfood">Ẩm thực địa phương / Đường phố</option>
                          <option value="buffet">Nhà hàng Buffet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Phong cách ẩm thực
                        </label>
                        <input
                          type="text"
                          value={cuisineType}
                          onChange={(e) => setCuisineType(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Món Việt, Hải sản tươi sống, Món Á/Âu..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Khung giờ phục vụ / mở cửa
                        </label>
                        <input
                          type="text"
                          value={openingHours}
                          onChange={(e) => setOpeningHours(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Ví dụ: 06:30 - 22:30"
                        />
                      </div>
                    </div>

                    {/* Dietary options */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tùy chọn thực đơn ăn kiêng / đặc thù
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={dietaryInput}
                          onChange={(e) => setDietaryInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDietary())}
                          className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Ví dụ: Có món chay, Thực đơn Halal, Set ăn gia đình..."
                        />
                        <button
                          type="button"
                          onClick={handleAddDietary}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
                        >
                          Thêm
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {dietaryOptions.map((item) => (
                          <span
                            key={item}
                            className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs flex items-center gap-1.5 border border-amber-200"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => handleRemoveDietary(item)}
                              className="text-amber-500 hover:text-amber-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ATTRACTION */}
                {category === "attraction" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Giờ đón khách / Mở cửa
                      </label>
                      <input
                        type="text"
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Ví dụ: 07:30 - 17:30 hàng ngày"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Vé bao gồm những quyền lợi gì?
                      </label>
                      <input
                        type="text"
                        value={ticketIncludes}
                        onChange={(e) => setTicketIncludes(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Vé vào cổng, xe điện, quà lưu niệm..."
                      />
                    </div>
                  </div>
                )}

                {/* ACTIVITY */}
                {category === "activity" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Thời lượng hoạt động
                      </label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Ví dụ: 2 giờ, Nửa ngày, 1 ngày..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Mức độ thể lực / Độ khó
                      </label>
                      <select
                        value={difficultyLevel}
                        onChange={(e) => setDifficultyLevel(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      >
                        <option value="Dễ dàng">Dễ dàng (Thích hợp mọi lứa tuổi)</option>
                        <option value="Trung bình">Trung bình (Cần thể lực cơ bản)</option>
                        <option value="Thử thách">Thử thách (Đòi hỏi rèn luyện)</option>
                        <option value="Mạo hiểm cao">Mạo hiểm cao (Chuyên nghiệp)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Giới hạn độ tuổi
                      </label>
                      <input
                        type="text"
                        value={ageRestriction}
                        onChange={(e) => setAgeRestriction(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Ví dụ: Từ 6 tuổi trở lên, Không dành cho trẻ dưới 10 tuổi..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Trang thiết bị an toàn đi kèm
                      </label>
                      <input
                        type="text"
                        value={safetyGear}
                        onChange={(e) => setSafetyGear(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Áo phao, mũ bảo hiểm, dây bảo hiểm..."
                      />
                    </div>
                  </div>
                )}

                {/* TRANSPORTATION */}
                {category === "transportation" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Dòng phương tiện vận chuyển
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      >
                        <option value="Xe ô tô 4-7 chỗ">Xe ô tô 4 - 7 chỗ</option>
                        <option value="Xe 16 chỗ Limousine">Xe 16 chỗ Limousine VIP</option>
                        <option value="Xe du lịch 29-35 chỗ">Xe du lịch 29 - 35 chỗ</option>
                        <option value="Xe du lịch 45 chỗ">Xe du lịch Universe 45 chỗ</option>
                        <option value="Cano cao tốc">Cano cao tốc / Tàu du lịch</option>
                        <option value="Xe máy tay ga / số">Thuê xe máy tự lái</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tiện ích trên xe
                      </label>
                      <input
                        type="text"
                        value={amenities.join(", ")}
                        onChange={(e) =>
                          setAmenities(e.target.value.split(",").map((s) => s.trim()))
                        }
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        placeholder="Ghế bọc da, máy lạnh, wifi, nước suối, cổng sạc..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep("category")}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-semibold"
                >
                  ← Quay lại chọn loại
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                >
                  Gửi bài đăng để kiểm duyệt
                </button>
              </div>
            </form>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5">
                Đăng bài dịch vụ thành công!
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Dịch vụ của bạn đã được đưa vào danh sách kiểm duyệt. Admin sẽ phê duyệt trong vòng 24 giờ.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}