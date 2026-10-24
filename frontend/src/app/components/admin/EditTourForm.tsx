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
  Save,
} from "lucide-react";

interface EditTourFormProps {
  tour: Tour;
  services: Service[];
  onSubmit: (tourData: Tour) => void;
  onClose: () => void;
}

export function EditTourForm({
  tour,
  services,
  onSubmit,
  onClose,
}: EditTourFormProps) {
  const [formData, setFormData] = useState({
    name: tour.name,
    destination: tour.destination,
    numberOfDays: (tour.numberOfDays || 1).toString(),
    numberOfNights: (tour.numberOfNights || 0).toString(),
    price: tour.price.toString(),
    description: tour.description,
    maxGuests: tour.maxGuests.toString(),
    rating: tour.rating.toString(),
    image: tour.image,
  });

  const [highlights, setHighlights] = useState<string[]>(
    tour.highlights.length > 0 ? tour.highlights : [""],
  );
  const [itinerary, setItinerary] = useState<DailyItinerary[]>(
    tour.itinerary.length > 0
      ? tour.itinerary
      : [
          {
            id: `day-1`,
            day: 1,
            date: "",
            title: "",
            description: "",
            locations: [],
          },
        ],
  );
  const [selectedServices, setSelectedServices] = useState<
    string[]
  >([]);

  const approvedServices = services.filter(
    (s) => s.status === "approved",
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

  const handleToggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(
        selectedServices.filter((id) => id !== serviceId),
      );
    } else {
      setSelectedServices([...selectedServices, serviceId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTour: Tour = {
      ...tour,
      name: formData.name,
      destination: formData.destination,
      numberOfDays: parseInt(formData.numberOfDays),
      numberOfNights: parseInt(formData.numberOfNights),
      price: parseFloat(formData.price),
      description: formData.description,
      maxGuests: parseInt(formData.maxGuests),
      rating: parseFloat(formData.rating),
      image: formData.image,
      highlights: highlights.filter((h) => h.trim() !== ""),
      itinerary: itinerary,
    };

    onSubmit(updatedTour);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Chỉnh sửa Tour
            </h2>
            <p className="text-green-100 text-sm mt-1">
              {tour.name}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  value={formData.numberOfDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfDays: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="VD: 3"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số đêm <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={formData.numberOfNights}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfNights: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="VD: 2"
                />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="VD: 3500000"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="VD: 20"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Đánh giá
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rating: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="VD: 4.5"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Mô tả chi tiết về tour..."
              />
            </div>
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

          {/* Services Selection */}
          <div className="bg-yellow-50 rounded-xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Chọn dịch vụ từ các nhà cung cấp
            </h3>

            {approvedServices.length === 0 ? (
              <p className="text-gray-600 text-sm">
                Chưa có dịch vụ được duyệt
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {approvedServices.map((service) => (
                  <label
                    key={service.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedServices.includes(service.id)
                        ? "border-yellow-600 bg-yellow-100"
                        : "border-gray-200 hover:border-yellow-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(
                        service.id,
                      )}
                      onChange={() =>
                        handleToggleService(service.id)
                      }
                      className="w-5 h-5 text-yellow-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        {service.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {service.category} - {service.location}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}