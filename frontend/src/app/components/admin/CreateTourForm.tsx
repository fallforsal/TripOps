import { useState } from "react";
import {
  Service,
  Tour,
  DailyItinerary,
  Location,
} from "@/app/types";
import {
  X,
  Plus,
  Trash,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Star,
  Clock,
  Users,
  Sparkles,
  Upload,
  Home,
  UserCircle,
  Mail,
  Phone,
} from "lucide-react";

interface CreateTourFormProps {
  services: Service[];
  onSubmit: (tourData: Omit<Tour, "id">) => void;
  onClose: () => void;
}

export function CreateTourForm({
  services,
  onSubmit,
  onClose,
}: CreateTourFormProps) {
  // Mock current admin data
  const currentAdmin = {
    name: "Nguyễn Văn Admin",
    email: "admin@demo.com",
    phone: "0901234567",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
  };

  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    numberOfDays: "1", // Số ngày
    numberOfNights: "0", // Số đêm
    price: "",
    description: "",
    maxGuests: "",
    minGuests: "",
    image:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
  });

  const [highlights, setHighlights] = useState<string[]>([""]);
  const [itinerary, setItinerary] = useState<DailyItinerary[]>([
    {
      id: `day-1`,
      day: 1,
      date: "",
      title: "",
      description: "",
      locations: [],
    },
  ]);
  const [selectedAccommodation, setSelectedAccommodation] =
    useState<string>("");

  // Filter only accommodation services that are approved
  const accommodationServices = services.filter(
    (s) => s.status === "approved" && s.category === "Lưu trú",
  );

  const handleAddHighlight = () => {
    setHighlights([...highlights, ""]);
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleHighlightChange = (
    index: number,
    value: string,
  ) => {
    const updated = [...highlights];
    updated[index] = value;
    setHighlights(updated);
  };

  const handleAddDay = () => {
    const newDay: DailyItinerary = {
      id: `day-${itinerary.length + 1}`,
      day: itinerary.length + 1,
      date: "",
      title: "",
      description: "",
      locations: [],
    };
    setItinerary([...itinerary, newDay]);
  };

  const handleRemoveDay = (dayIndex: number) => {
    setItinerary(itinerary.filter((_, i) => i !== dayIndex));
  };

  const handleDayChange = (
    dayIndex: number,
    field: string,
    value: string,
  ) => {
    const updated = [...itinerary];
    updated[dayIndex] = {
      ...updated[dayIndex],
      [field]: value,
    };
    setItinerary(updated);
  };

  const handleAddLocation = (dayIndex: number) => {
    const updated = [...itinerary];
    const newLocation: Location = {
      id: `loc-${Date.now()}`,
      name: "",
      address: "",
      latitude: 0,
      longitude: 0,
      time: "",
    };
    updated[dayIndex].locations = [
      ...updated[dayIndex].locations,
      newLocation,
    ];
    setItinerary(updated);
  };

  const handleRemoveLocation = (
    dayIndex: number,
    locIndex: number,
  ) => {
    const updated = [...itinerary];
    updated[dayIndex].locations = updated[
      dayIndex
    ].locations.filter((_, i) => i !== locIndex);
    setItinerary(updated);
  };

  const handleLocationChange = (
    dayIndex: number,
    locIndex: number,
    field: string,
    value: string | number,
  ) => {
    const updated = [...itinerary];
    updated[dayIndex].locations[locIndex] = {
      ...updated[dayIndex].locations[locIndex],
      [field]: value,
    };
    setItinerary(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generate tour code (example: T001, T002, ...)
    const tourCode = `T${String(Date.now()).slice(-6)}`;

    const tourData: Omit<Tour, "id"> = {
      tourCode,
      name: formData.name,
      destination: formData.destination,
      duration: `${formData.numberOfDays} ngày ${formData.numberOfNights} đêm`,
      numberOfDays: parseInt(formData.numberOfDays),
      numberOfNights: parseInt(formData.numberOfNights),
      price: parseFloat(formData.price),
      description: formData.description,
      maxGuests: parseInt(formData.maxGuests),
      rating: 0, // New tours start with no rating
      image: formData.image,
      highlights: highlights.filter((h) => h.trim() !== ""),
      itinerary: itinerary,
      // Add admin creator info
      createdBy: "admin-1", // In real app, get from current user
      createdByName: currentAdmin.name,
      createdByEmail: currentAdmin.email,
      createdAt: new Date().toLocaleDateString("vi-VN"),
      bookings: 0,
    };

    onSubmit(tourData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="bg-[#075985] text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Tạo Tour Mới</h2>
            <p className="text-blue-100 text-sm mt-1">
              Điền thông tin chi tiết cho tour du lịch
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 max-h-[70vh] overflow-y-auto"
        >
          {/* Creator Info */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-indigo-200">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2 mb-4">
              <UserCircle className="w-5 h-5 text-indigo-600" />
              Người tạo tour
            </h3>
            <div className="flex items-center gap-4">
              <img
                src={currentAdmin.avatar}
                alt={currentAdmin.name}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-lg">
                  {currentAdmin.name}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>{currentAdmin.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span>{currentAdmin.email}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  Thời gian tạo
                </p>
                <p className="font-semibold text-gray-900">
                  {new Date().toLocaleDateString("vi-VN")}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date().toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-[#F0F9FF] rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#075985]" />
              Thông tin cơ bản
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tên tour{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: Hà Nội - Hạ Long 3N2Đ"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Điểm đến{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      destination: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: Hạ Long, Quảng Ninh"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số ngày{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.numberOfDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfDays: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: 3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số đêm ở{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.numberOfNights}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      numberOfNights: e.target.value,
                    });
                    // Reset accommodation if nights = 0
                    if (e.target.value === "0") {
                      setSelectedAccommodation("");
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: 2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nếu = 0 thì không cần chọn địa điểm lưu trú
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Giá (VNĐ/người){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: 3500000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số khách tối thiểu{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.minGuests}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minGuests: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: 4"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số khách tối đa{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.maxGuests}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxGuests: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  placeholder="VD: 20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mô tả <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                placeholder="Mô tả chi tiết về tour..."
              />
            </div>
          </div>

          {/* Upload Images */}
          <div className="bg-pink-50 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-pink-600" />
              Hình ảnh tour
            </h3>

            <div>
              <label className="block w-full cursor-pointer">
                <div className="border-2 border-dashed border-pink-300 rounded-lg p-6 text-center hover:border-pink-500 hover:bg-pink-100 transition-colors">
                  <Upload className="w-12 h-12 text-pink-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">
                    Click để upload hình ảnh
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, JPEG (tối đa 5MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Highlights */}
          <div className="bg-[#F0F9FF] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F97316]" />
                Điểm nổi bật
              </h3>
              <button
                type="button"
                onClick={handleAddHighlight}
                className="px-3 py-1 bg-[#F97316] text-white rounded-lg hover:bg-[#EA580C] transition-colors text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Thêm
              </button>
            </div>

            <div className="space-y-2">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) =>
                      handleHighlightChange(
                        index,
                        e.target.value,
                      )
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    placeholder="VD: Tham quan Vịnh Hạ Long"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Itinerary */}
          <div className="bg-green-50 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Lịch trình chi tiết
              </h3>
              <button
                type="button"
                onClick={handleAddDay}
                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Thêm ngày
              </button>
            </div>

            <div className="space-y-4">
              {itinerary.map((day, dayIndex) => (
                <div
                  key={day.id}
                  className="bg-white rounded-lg p-4 border-2 border-green-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-gray-900">
                      Ngày {day.day}
                    </h4>
                    {itinerary.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveDay(dayIndex)
                        }
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={day.date}
                        onChange={(e) =>
                          handleDayChange(
                            dayIndex,
                            "date",
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        placeholder="Ngày"
                      />
                      <input
                        type="text"
                        value={day.title}
                        onChange={(e) =>
                          handleDayChange(
                            dayIndex,
                            "title",
                            e.target.value,
                          )
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        placeholder="Tiêu đề (VD: Hà Nội - Hạ Long)"
                      />
                    </div>

                    <textarea
                      value={day.description}
                      onChange={(e) =>
                        handleDayChange(
                          dayIndex,
                          "description",
                          e.target.value,
                        )
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      placeholder="Mô tả ngày này..."
                    />

                    {/* Locations */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">
                          Địa điểm
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            handleAddLocation(dayIndex)
                          }
                          className="px-2 py-1 bg-[#075985] text-white rounded text-xs flex items-center gap-1 hover:bg-[#F97316]"
                        >
                          <Plus className="w-3 h-3" />
                          Thêm địa điểm
                        </button>
                      </div>

                      {day.locations.map(
                        (location, locIndex) => (
                          <div
                            key={location.id}
                            className="bg-gray-50 rounded p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-600">
                                Địa điểm {locIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveLocation(
                                    dayIndex,
                                    locIndex,
                                  )
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={location.name}
                                onChange={(e) =>
                                  handleLocationChange(
                                    dayIndex,
                                    locIndex,
                                    "name",
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                                placeholder="Tên địa điểm"
                              />
                              <input
                                type="text"
                                value={location.time || ""}
                                onChange={(e) =>
                                  handleLocationChange(
                                    dayIndex,
                                    locIndex,
                                    "time",
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                                placeholder="Thời gian (VD: 09:00)"
                              />
                            </div>

                            <input
                              type="text"
                              value={location.address}
                              onChange={(e) =>
                                handleLocationChange(
                                  dayIndex,
                                  locIndex,
                                  "address",
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="Địa chỉ"
                            />
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accommodation Selection */}
          {parseInt(formData.numberOfNights) > 0 && (
            <div className="bg-orange-50 rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-orange-600" />
                Chọn địa điểm lưu trú
              </h3>

              {accommodationServices.length === 0 ? (
                <p className="text-gray-600 text-sm">
                  Chưa có địa điểm lưu trú được duyệt
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Chọn 1 địa điểm lưu trú cho tour này
                  </p>
                  {accommodationServices.map((service) => (
                    <label
                      key={service.id}
                      className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAccommodation === service.id
                          ? "border-orange-600 bg-orange-100"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="accommodation"
                        checked={
                          selectedAccommodation === service.id
                        }
                        onChange={() =>
                          setSelectedAccommodation(service.id)
                        }
                        className="w-5 h-5 text-orange-600"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {service.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {service.location}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {service.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#075985] text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold shadow-lg"
            >
              Tạo Tour
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}