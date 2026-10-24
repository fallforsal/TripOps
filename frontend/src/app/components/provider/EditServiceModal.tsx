import { useState } from "react";
import {
  X,
  Hotel,
  Utensils,
  Car,
  Compass,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { Service, ProviderType } from "@/app/types";

interface EditServiceModalProps {
  service: Service;
  currentProvider: {
    id: string;
    name: string;
    providerType?: ProviderType;
  };
  handleUpdateService: (
    serviceId: string,
    serviceData: Omit<Service, "id">,
  ) => void;
  onClose: () => void;
}

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

export function EditServiceModal({
  service,
  currentProvider,
  handleUpdateService,
  onClose,
}: EditServiceModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Common fields
  const [name, setName] = useState(service.name || "");
  const [description, setDescription] = useState(service.description || "");
  const [price, setPrice] = useState(service.price?.toString() || "");
  const [pricePerPerson, setPricePerPerson] = useState(
    service.pricePerPerson?.toString() || "",
  );
  const [capacity, setCapacity] = useState(
    service.capacity?.toString() || "",
  );
  const [imageUrl, setImageUrl] = useState(service.image || "");

  // Address fields
  const [province, setProvince] = useState(service.province || "Lâm Đồng");
  const [district, setDistrict] = useState(service.district || "");
  const [ward, setWard] = useState(service.ward || "");
  const [street, setStreet] = useState(service.street || "");

  // Hotel fields
  const [roomType, setRoomType] = useState(service.roomType || "Phòng Deluxe");
  const [stars, setStars] = useState(service.stars?.toString() || "4");
  const [amenities, setAmenities] = useState<string[]>(service.amenities || []);
  const [checkInTime, setCheckInTime] = useState(
    service.checkInTime || "14:00",
  );
  const [checkOutTime, setCheckOutTime] = useState(
    service.checkOutTime || "12:00",
  );
  const [amenityInput, setAmenityInput] = useState("");

  // FnB fields
  const [subCategory, setSubCategory] = useState(
    service.subCategory || "restaurant",
  );
  const [cuisineType, setCuisineType] = useState(service.cuisineType || "");
  const [openingHours, setOpeningHours] = useState(
    service.openingHours || "07:00 - 22:00",
  );
  const [dietaryOptions, setDietaryOptions] = useState<string[]>(
    service.dietaryOptions || [],
  );
  const [dietaryInput, setDietaryInput] = useState("");

  // Attraction fields
  const [childPrice, setChildPrice] = useState(
    service.childPrice?.toString() || "",
  );
  const [ticketIncludes, setTicketIncludes] = useState(
    service.ticketIncludes || "Vé vào cổng tham quan",
  );

  // Transportation fields
  const [vehicleType, setVehicleType] = useState(
    service.vehicleType || "Xe ô tô 7 chỗ",
  );
  const [seats, setSeats] = useState(service.seats?.toString() || "7");

  // Activity fields
  const [duration, setDuration] = useState(service.duration || "2 giờ");
  const [difficultyLevel, setDifficultyLevel] = useState(
    service.difficultyLevel || "Dễ dàng",
  );
  const [ageRestriction, setAgeRestriction] = useState(
    service.ageRestriction || "Không giới hạn",
  );
  const [safetyGear, setSafetyGear] = useState(service.safetyGear || "");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const locationParts = [street, ward, district, province].filter(Boolean);
    const fullLocation = locationParts.join(", ") || service.location;

    const baseService = {
      providerId: service.providerId || currentProvider.id,
      providerName: service.providerName || currentProvider.name,
      name,
      category: service.category,
      description,
      price: parseFloat(price) || 0,
      pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : undefined,
      location: fullLocation,
      province,
      district,
      ward,
      street,
      image: imageUrl.trim() || service.image,
      images: service.images || [imageUrl.trim() || service.image],
      rating: service.rating || 5.0,
      capacity: capacity ? parseInt(capacity) : undefined,
      status: "pending" as const, // Re-submits to admin approval upon edit
      createdAt: service.createdAt,
    };

    let serviceData: Omit<Service, "id">;

    switch (service.category) {
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
      case "restaurant":
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

    handleUpdateService(service.id, serviceData);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  const getCategoryMeta = () => {
    switch (service.category) {
      case "hotel":
        return { label: "Lưu trú & Khách sạn", icon: Hotel, color: "text-[#075985] bg-[#F0F9FF]" };
      case "fnb":
      case "restaurant":
        return { label: "Ẩm thực & Nhà hàng", icon: Utensils, color: "text-amber-600 bg-amber-50" };
      case "attraction":
        return { label: "Điểm tham quan & Vé", icon: Compass, color: "text-teal-600 bg-teal-50" };
      case "activity":
        return { label: "Hoạt động & Trải nghiệm", icon: Sparkles, color: "text-[#F97316] bg-[#F0F9FF]" };
      case "transportation":
        return { label: "Phương tiện & Vận chuyển", icon: Car, color: "text-cyan-600 bg-cyan-50" };
      default:
        return { label: service.category, icon: Hotel, color: "text-gray-600 bg-gray-50" };
    }
  };

  const meta = getCategoryMeta();
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${meta.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Chỉnh sửa dịch vụ
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Mã: {service.id} • Loại hình: <strong>{meta.label}</strong>
              </p>
            </div>
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
          {!showSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                ⚠️ <strong>Lưu ý:</strong> Sau khi cập nhật, thông tin bài đăng sẽ được chuyển về trạng thái <strong>Chờ kiểm duyệt</strong> để Admin xác nhận trước khi hiển thị cho các đơn vị làm tour.
              </div>

              {/* 1. Basic Common Fields */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-[#075985]">
                  1. Thông tin chung & Đơn giá
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Tên dịch vụ *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Mô tả dịch vụ *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      {service.category === "hotel"
                        ? "Giá niêm yết (VNĐ/đêm) *"
                        : service.category === "attraction"
                        ? "Giá vé người lớn (VNĐ/vé) *"
                        : "Giá niêm yết (VNĐ) *"}
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      required
                      min="0"
                    />
                  </div>

                  {service.category !== "hotel" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        {service.category === "attraction"
                          ? "Giá vé trẻ em (VNĐ/vé)"
                          : "Giá tính theo người (VNĐ/người)"}
                      </label>
                      <input
                        type="number"
                        value={service.category === "attraction" ? childPrice : pricePerPerson}
                        onChange={(e) =>
                          service.category === "attraction"
                            ? setChildPrice(e.target.value)
                            : setPricePerPerson(e.target.value)
                        }
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        min="0"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      {service.category === "transportation"
                        ? "Số lượng chỗ ngồi *"
                        : "Sức chứa tối đa (Người)"}
                    </label>
                    <input
                      type="number"
                      value={service.category === "transportation" ? seats : capacity}
                      onChange={(e) =>
                        service.category === "transportation"
                          ? setSeats(e.target.value)
                          : setCapacity(e.target.value)
                      }
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Link ảnh đại diện (URL)
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Detailed Address */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-emerald-700">
                  2. Địa chỉ chi tiết
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
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Số nhà, Tên đường
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Category Specific Fields */}
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide text-[#EA580C]">
                  3. Thông số chuyên ngành [{meta.label}]
                </h3>

                {/* Hotel */}
                {service.category === "hotel" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Hạng sao
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
                          <span>-</span>
                          <input
                            type="time"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tiện nghi phòng
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={amenityInput}
                          onChange={(e) => setAmenityInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAmenity())}
                          className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Nhập tiện nghi..."
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

                {/* FnB */}
                {(service.category === "fnb" || service.category === "restaurant") && (
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
                          <option value="streetfood">Ẩm thực đường phố</option>
                          <option value="buffet">Nhà hàng Buffet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Phong cách món
                        </label>
                        <input
                          type="text"
                          value={cuisineType}
                          onChange={(e) => setCuisineType(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Khung giờ phục vụ
                        </label>
                        <input
                          type="text"
                          value={openingHours}
                          onChange={(e) => setOpeningHours(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tùy chọn ăn kiêng / thực đơn đặc biệt
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={dietaryInput}
                          onChange={(e) => setDietaryInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDietary())}
                          className="flex-1 px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                          placeholder="Thêm tùy chọn thực đơn..."
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

                {/* Attraction */}
                {service.category === "attraction" && (
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Vé bao gồm
                      </label>
                      <input
                        type="text"
                        value={ticketIncludes}
                        onChange={(e) => setTicketIncludes(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Activity */}
                {service.category === "activity" && (
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Mức độ thể lực
                      </label>
                      <select
                        value={difficultyLevel}
                        onChange={(e) => setDifficultyLevel(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      >
                        <option value="Dễ dàng">Dễ dàng</option>
                        <option value="Trung bình">Trung bình</option>
                        <option value="Thử thách">Thử thách</option>
                        <option value="Mạo hiểm cao">Mạo hiểm cao</option>
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Bảo hộ an toàn
                      </label>
                      <input
                        type="text"
                        value={safetyGear}
                        onChange={(e) => setSafetyGear(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Transportation */}
                {service.category === "transportation" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Dòng phương tiện
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
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                >
                  Lưu thay đổi & Gửi kiểm duyệt
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1.5">
                Cập nhật dịch vụ thành công!
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Thông tin dịch vụ đã được cập nhật và đang gửi Admin kiểm duyệt lại.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}