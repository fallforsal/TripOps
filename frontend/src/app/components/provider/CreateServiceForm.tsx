import { useState } from "react";
import {
  X,
  Upload,
  Hotel,
  Utensils,
  Coffee,
  Car,
  Activity,
  CheckCircle,
} from "lucide-react";
import { Service } from "@/app/types";

interface CreateServiceFormProps {
  currentProvider: { id: string; name: string };
  handleSubmitService: (
    serviceData: Omit<Service, "id">,
  ) => void;
  onCloseServiceForm?: () => void;
}

type ServiceCategory =
  | "hotel"
  | "restaurant"
  | "eatery"
  | "transportation"
  | "activity";

const categoryOptions = [
  {
    value: "hotel",
    label: "Khách sạn",
    icon: Hotel,
    color: "blue",
  },
  {
    value: "restaurant",
    label: "Nhà hàng",
    icon: Utensils,
    color: "purple",
  },
  {
    value: "eatery",
    label: "Quán ăn",
    icon: Coffee,
    color: "orange",
  },
  {
    value: "transportation",
    label: "Lữ hành",
    icon: Car,
    color: "green",
  },
  {
    value: "activity",
    label: "Khu vui chơi",
    icon: Activity,
    color: "pink",
  },
];

export function CreateServiceForm({
  currentProvider,
  handleSubmitService,
  onCloseServiceForm,
}: CreateServiceFormProps) {
  const [step, setStep] = useState<"category" | "form">(
    "category",
  );
  const [category, setCategory] =
    useState<ServiceCategory | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Common fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");

  // Hotel fields
  const [stars, setStars] = useState("3");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [amenityInput, setAmenityInput] = useState("");

  // Restaurant/Eatery fields
  const [cuisine, setCuisine] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [priceRange, setPriceRange] = useState("");

  // Transportation fields
  const [vehicleType, setVehicleType] = useState("");
  const [seats, setSeats] = useState("");

  // Activity fields
  const [duration, setDuration] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [ageRestriction, setAgeRestriction] = useState("");

  const handleCategorySelect = (
    selectedCategory: ServiceCategory,
  ) => {
    setCategory(selectedCategory);
    setStep("form");
  };

  const handleAddAmenity = () => {
    if (
      amenityInput.trim() &&
      !amenities.includes(amenityInput.trim())
    ) {
      setAmenities([...amenities, amenityInput.trim()]);
      setAmenityInput("");
    }
  };

  const handleRemoveAmenity = (amenity: string) => {
    setAmenities(amenities.filter((a) => a !== amenity));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const baseService = {
      providerId: currentProvider.id,
      providerName: currentProvider.name,
      name,
      category: category!,
      description,
      price: parseFloat(price),
      location,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      rating: 0,
      capacity: capacity ? parseInt(capacity) : undefined,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    let serviceData: Omit<Service, "id">;

    switch (category) {
      case "hotel":
        serviceData = {
          ...baseService,
          stars: parseInt(stars),
          amenities,
          checkInTime,
          checkOutTime,
        };
        break;
      case "restaurant":
      case "eatery":
        serviceData = {
          ...baseService,
          cuisine,
          openingHours,
          priceRange,
        };
        break;
      case "transportation":
        serviceData = {
          ...baseService,
          vehicleType,
          seats: parseInt(seats),
        };
        break;
      case "activity":
        serviceData = {
          ...baseService,
          duration,
          difficulty,
          ageRestriction,
        };
        break;
      default:
        serviceData = baseService;
    }

    handleSubmitService(serviceData);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onCloseServiceForm?.();
    }, 2000);
  };

  const getCategoryIcon = (cat: ServiceCategory) => {
    const option = categoryOptions.find((o) => o.value === cat);
    return option?.icon || Hotel;
  };

  const getCategoryLabel = (cat: ServiceCategory) => {
    const option = categoryOptions.find((o) => o.value === cat);
    return option?.label || "";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Tạo dịch vụ mới
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === "category"
                ? "Chọn loại dịch vụ bạn muốn đăng ký"
                : `Loại: ${getCategoryLabel(category!)}`}
            </p>
          </div>
          <button
            onClick={onCloseServiceForm}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Category Selection */}
          {step === "category" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleCategorySelect(
                        option.value as ServiceCategory,
                      )
                    }
                    className={`p-6 rounded-2xl border-2 hover:border-${option.color}-500 hover:bg-${option.color}-50 transition-all group`}
                  >
                    <div
                      className={`w-16 h-16 bg-gradient-to-br from-${option.color}-400 to-${option.color}-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {option.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {option.value === "hotel" &&
                        "Đăng ký khách sạn, resort, homestay"}
                      {option.value === "restaurant" &&
                        "Đăng ký nhà hàng, buffet"}
                      {option.value === "eatery" &&
                        "Đăng ký quán ăn, cafe, ăn vặt"}
                      {option.value === "transportation" &&
                        "Đăng ký dịch vụ vận chuyển"}
                      {option.value === "activity" &&
                        "Đăng ký khu vui chơi, giải trí"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Service Form */}
          {step === "form" && category && !showSuccess && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Common Fields */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-[#CBD5E1]">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Thông tin cơ bản
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tên dịch vụ *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder={`Nhập tên ${getCategoryLabel(category).toLowerCase()}`}
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mô tả *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                      rows={4}
                      placeholder="Mô tả chi tiết về dịch vụ của bạn"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Giá (VNĐ) *
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Địa điểm *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) =>
                        setLocation(e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Địa chỉ cụ thể"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sức chứa/Số lượng
                    </label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) =>
                        setCapacity(e.target.value)
                      }
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder="Số người tối đa"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Hotel Specific Fields */}
              {category === "hotel" && (
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Thông tin khách sạn
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Xếp hạng sao
                      </label>
                      <select
                        value={stars}
                        onChange={(e) =>
                          setStars(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="1">1 sao</option>
                        <option value="2">2 sao</option>
                        <option value="3">3 sao</option>
                        <option value="4">4 sao</option>
                        <option value="5">5 sao</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Giờ check-in
                      </label>
                      <input
                        type="time"
                        value={checkInTime}
                        onChange={(e) =>
                          setCheckInTime(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Giờ check-out
                      </label>
                      <input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) =>
                          setCheckOutTime(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tiện nghi
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={amenityInput}
                          onChange={(e) =>
                            setAmenityInput(e.target.value)
                          }
                          onKeyPress={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(),
                            handleAddAmenity())
                          }
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                          placeholder="Nhập tiện nghi (VD: Wifi, Bể bơi, Gym)"
                        />
                        <button
                          type="button"
                          onClick={handleAddAmenity}
                          className="px-4 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors"
                        >
                          Thêm
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((amenity) => (
                          <span
                            key={amenity}
                            className="px-3 py-1 bg-[#E0F2FE] text-[#075985] rounded-full text-sm flex items-center gap-2"
                          >
                            {amenity}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAmenity(amenity)
                              }
                              className="hover:text-blue-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Restaurant/Eatery Specific Fields */}
              {(category === "restaurant" ||
                category === "eatery") && (
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border-2 border-orange-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Thông tin{" "}
                    {category === "restaurant"
                      ? "nhà hàng"
                      : "quán ăn"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Loại ẩm thực
                      </label>
                      <input
                        type="text"
                        value={cuisine}
                        onChange={(e) =>
                          setCuisine(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="VD: Việt Nam, Hàn Quốc, Nhật Bản"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Giờ mở cửa
                      </label>
                      <input
                        type="text"
                        value={openingHours}
                        onChange={(e) =>
                          setOpeningHours(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="VD: 8:00 - 22:00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Mức giá
                      </label>
                      <select
                        value={priceRange}
                        onChange={(e) =>
                          setPriceRange(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">
                          -- Chọn mức giá --
                        </option>
                        <option value="$">$ - Bình dân</option>
                        <option value="$$">
                          $$ - Trung bình
                        </option>
                        <option value="$$$">
                          $$$ - Cao cấp
                        </option>
                        <option value="$$$$">
                          $$$$ - Sang trọng
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Transportation Specific Fields */}
              {category === "transportation" && (
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Thông tin phương tiện
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Loại phương tiện
                      </label>
                      <select
                        value={vehicleType}
                        onChange={(e) =>
                          setVehicleType(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">
                          -- Chọn loại --
                        </option>
                        <option value="car">Ô tô</option>
                        <option value="bus">Xe buýt</option>
                        <option value="van">Xe Van</option>
                        <option value="minibus">
                          Xe 16 chỗ
                        </option>
                        <option value="motorcycle">
                          Xe máy
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Số chỗ ngồi
                      </label>
                      <input
                        type="number"
                        value={seats}
                        onChange={(e) =>
                          setSeats(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Số chỗ"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Specific Fields */}
              {category === "activity" && (
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-pink-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Thông tin hoạt động
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Thời gian
                      </label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) =>
                          setDuration(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="VD: 2 giờ, Cả ngày"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Độ khó
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) =>
                          setDifficulty(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">
                          -- Chọn độ khó --
                        </option>
                        <option value="easy">Dễ</option>
                        <option value="medium">
                          Trung bình
                        </option>
                        <option value="hard">Khó</option>
                        <option value="extreme">Rất khó</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Giới hạn độ tuổi
                      </label>
                      <input
                        type="text"
                        value={ageRestriction}
                        onChange={(e) =>
                          setAgeRestriction(e.target.value)
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="VD: 6+, 18+, Không giới hạn"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep("category")}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[#075985] text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold"
                >
                  Gửi dịch vụ để kiểm duyệt
                </button>
              </div>
            </form>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Tạo dịch vụ thành công!
              </h3>
              <p className="text-gray-600">
                Dịch vụ của bạn đã được gửi và đang chờ admin
                kiểm duyệt.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}