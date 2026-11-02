import {
  Heart,
  MapPin,
  Star,
  Clock,
  Users,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Tour } from "@/app/types";

interface WishlistTour extends Tour {
  addedDate: string;
}

const mockWishlist: WishlistTour[] = [
  {
    id: "tour-1",
    name: "Đà Lạt Romantic 3N2Đ",
    destination: "Đà Lạt",
    duration: "3 ngày 2 đêm",
    price: 4500000,
    description:
      "Khám phá thành phố ngàn hoa với những cảnh đẹp lãng mạn và khí hậu mát mẻ",
    image:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
    rating: 4.8,
    maxGuests: 15,
    highlights: [],
    itinerary: [],
    addedDate: "20/01/2026",
  },
  {
    id: "tour-2",
    name: "Phú Quốc Tropical 4N3Đ",
    destination: "Phú Quốc",
    duration: "4 ngày 3 đêm",
    price: 7800000,
    description:
      "Tận hưởng thiên đường biển đảo với bãi biển tuyệt đẹp và hải sản tươi ngon",
    image:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
    rating: 4.9,
    maxGuests: 20,
    highlights: [],
    itinerary: [],
    addedDate: "18/01/2026",
  },
];

export function WishlistPage() {
  const [wishlist, setWishlist] =
    useState<WishlistTour[]>(mockWishlist);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const removeFromWishlist = (tourId: string) => {
    setWishlist(wishlist.filter((tour) => tour.id !== tourId));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Danh sách yêu thích
              </h1>
              <p className="text-gray-600">
                Các tour du lịch bạn đã lưu ({wishlist.length})
              </p>
            </div>
          </div>
        </div>

        {/* Wishlist Grid */}
        {wishlist.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {wishlist.map((tour) => (
              <div
                key={tour.id}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <div className="px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-semibold">
                        {tour.rating}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        removeFromWishlist(tour.id)
                      }
                      className="w-10 h-10 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center transition-colors"
                      title="Xóa khỏi danh sách yêu thích"
                    >
                      <Heart className="w-5 h-5 text-white fill-current" />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-700">
                      Đã lưu: {tour.addedDate}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#075985] transition-colors">
                    {tour.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{tour.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>{tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Users className="w-4 h-4" />
                      <span>Tối đa {tour.maxGuests} người</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-2">
                    {tour.description}
                  </p>

                  <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">
                        Giá từ
                      </div>
                      <div className="text-2xl font-bold text-[#075985]">
                        {formatPrice(tour.price)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          removeFromWishlist(tour.id)
                        }
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </button>
                      <button className="px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors">
                        Đặt ngay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="bg-white rounded-2xl p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Danh sách yêu thích trống
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Bạn chưa lưu tour nào vào danh sách yêu thích. Hãy
              khám phá và lưu những tour ưa thích của bạn!
            </p>
            <button
              onClick={() =>
                (window.location.href = "#book-tours")
              }
              className="px-8 py-3 bg-[#075985] text-white rounded-xl hover:bg-[#F97316] transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Khám phá tour
            </button>
          </div>
        )}

        {/* Tips */}
        {wishlist.length > 0 && (
          <div className="mt-8 bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Heart className="w-5 h-5 fill-current" />
              Mẹo nhỏ
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Đặt tour sớm để nhận ưu đãi tốt nhất</li>
              <li>
                • Theo dõi các tour yêu thích để cập nhật giá và
                khuyến mãi
              </li>
              <li>
                • Chia sẻ danh sách yêu thích với bạn bè để cùng
                đi du lịch
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}