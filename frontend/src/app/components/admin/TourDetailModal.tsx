import { Tour } from "@/app/types";
import {
  X,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Star,
  Calendar,
  User,
  Mail,
} from "lucide-react";

interface TourDetailModalProps {
  tour: Tour;
  onClose: () => void;
}

export function TourDetailModal({
  tour,
  onClose,
}: TourDetailModalProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Chi tiết tour
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tour Image */}
          <div className="rounded-xl overflow-hidden">
            <img
              src={tour.image}
              alt={tour.name}
              className="w-full h-64 object-cover"
            />
          </div>

          {/* Tour Name and Description */}
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              {tour.name}
            </h3>
            <p className="text-gray-600">{tour.description}</p>
          </div>

          {/* Tour Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#F0F9FF] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#075985] mb-1">
                <MapPin className="w-5 h-5" />
                <span className="font-semibold">Điểm đến</span>
              </div>
              <p className="text-gray-900">
                {tour.destination}
              </p>
            </div>

            <div className="bg-[#F0F9FF] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#F97316] mb-1">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Thời gian</span>
              </div>
              <p className="text-gray-900">{tour.duration}</p>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <DollarSign className="w-5 h-5" />
                <span className="font-semibold">Giá</span>
              </div>
              <p className="text-gray-900 font-bold">
                {formatPrice(tour.price)}
              </p>
            </div>

            <div className="bg-orange-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Users className="w-5 h-5" />
                <span className="font-semibold">
                  Số khách tối thiểu
                </span>
              </div>
              <p className="text-gray-900">
                {tour.minGuests} người
              </p>
            </div>

            <div className="bg-pink-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-pink-600 mb-1">
                <Users className="w-5 h-5" />
                <span className="font-semibold">
                  Số khách tối đa
                </span>
              </div>
              <p className="text-gray-900">
                {tour.maxGuests} người
              </p>
            </div>

            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-yellow-600 mb-1">
                <Star className="w-5 h-5" />
                <span className="font-semibold">Đánh giá</span>
              </div>
              <p className="text-gray-900">
                {tour.rating} / 5.0
              </p>
            </div>

            {tour.createdAt && (
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Calendar className="w-5 h-5" />
                  <span className="font-semibold">
                    Ngày tạo
                  </span>
                </div>
                <p className="text-gray-900">
                  {tour.createdAt}
                </p>
              </div>
            )}
          </div>

          {/* Created By Info */}
          {tour.createdByName && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-[#CBD5E1]">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-[#075985]" />
                Người tạo tour
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    {tour.createdByName}
                  </span>
                </div>
                {tour.createdByEmail && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{tour.createdByEmail}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Highlights */}
          {tour.highlights && tour.highlights.length > 0 && (
            <div>
              <h4 className="font-bold text-xl text-gray-900 mb-3">
                Điểm nổi bật
              </h4>
              <ul className="space-y-2">
                {tour.highlights.map((highlight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2"
                  >
                    <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Itinerary */}
          {tour.itinerary && tour.itinerary.length > 0 && (
            <div>
              <h4 className="font-bold text-xl text-gray-900 mb-4">
                Lịch trình chi tiết
              </h4>
              <div className="space-y-4">
                {tour.itinerary.map((day, index) => (
                  <div
                    key={day.id}
                    className="border-2 border-gray-200 rounded-xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#075985] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {day.day}
                      </div>
                      <div>
                        <h5 className="font-bold text-lg text-gray-900">
                          {day.title}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {day.date}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">
                      {day.description}
                    </p>

                    {day.locations &&
                      day.locations.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <p className="font-semibold text-sm text-gray-700">
                            Địa điểm:
                          </p>
                          {day.locations.map((location) => (
                            <div
                              key={location.id}
                              className="flex items-start gap-2 bg-gray-50 rounded-lg p-3"
                            >
                              <MapPin className="w-4 h-4 text-[#075985] flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {location.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {location.address}
                                </p>
                                {location.time && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Thời gian: {location.time}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}