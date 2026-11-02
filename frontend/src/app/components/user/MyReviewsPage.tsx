import { useState } from "react";
import {
  Star,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  Save,
  X,
  User,
  Mail,
  Phone,
} from "lucide-react";

interface Review {
  id: string;
  tourName: string;
  tourDestination: string;
  tourStartDate: string;
  tourEndDate: string;
  guideName: string;
  guidePhone: string;
  numberOfGuests: number;
  totalPrice: number;
  rating: number;
  comment: string;
  reviewDate: string;
  tourImage: string;
}

const mockReviews: Review[] = [
  {
    id: "review-1",
    tourName: "Đà Lạt Romantic 3N2Đ",
    tourDestination: "Đà Lạt",
    tourStartDate: "2026-01-10",
    tourEndDate: "2026-01-12",
    guideName: "Trần Thị Bích",
    guidePhone: "0987654321",
    numberOfGuests: 3,
    totalPrice: 13500000,
    rating: 5,
    comment:
      "Tour rất tuyệt vời! Hướng dẫn viên nhiệt tình, lịch trình hợp lý. Khách sạn sạch sẽ, view đẹp. Tôi sẽ quay lại và giới thiệu cho bạn bè.",
    reviewDate: "15/01/2026",
    tourImage:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
  },
  {
    id: "review-2",
    tourName: "Phú Quốc Tropical 4N3Đ",
    tourDestination: "Phú Quốc",
    tourStartDate: "2026-01-05",
    tourEndDate: "2026-01-08",
    guideName: "Nguyễn Văn Hùng",
    guidePhone: "0912345678",
    numberOfGuests: 2,
    totalPrice: 15600000,
    rating: 4,
    comment:
      "Tour ổn, biển đẹp, đồ ăn ngon. Tuy nhiên lịch trình hơi dày đặc, không có nhiều thời gian nghỉ ngơi.",
    reviewDate: "10/01/2026",
    tourImage:
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800",
  },
  {
    id: "review-3",
    tourName: "Sapa Trekking 3N2Đ",
    tourDestination: "Sapa",
    tourStartDate: "2025-12-20",
    tourEndDate: "2025-12-22",
    guideName: "Lý Thị Hương",
    guidePhone: "0909876543",
    numberOfGuests: 4,
    totalPrice: 10000000,
    rating: 5,
    comment:
      "Trải nghiệm tuyệt vời! Cảnh đẹp, không khí trong lành. Hướng dẫn viên rất am hiểu văn hóa dân tộc địa phương.",
    reviewDate: "25/12/2025",
    tourImage:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800",
  },
];

export function MyReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState<
    string | null
  >(null);

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleSave = (reviewId: string) => {
    setReviews(
      reviews.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              rating: editRating,
              comment: editComment,
            }
          : review,
      ),
    );
    setEditingId(null);
    // In real app, call API to update review
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditRating(0);
    setEditComment("");
  };

  const handleDelete = (reviewId: string) => {
    setReviews(
      reviews.filter((review) => review.id !== reviewId),
    );
    setShowDeleteModal(null);
    // In real app, call API to delete review
  };

  const renderStars = (
    rating: number,
    interactive = false,
    onRate?: (rating: number) => void,
  ) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              interactive
                ? "cursor-pointer transition-colors"
                : ""
            } ${
              star <=
              (interactive ? hoverRating || rating : rating)
                ? "text-yellow-500 fill-current"
                : "text-gray-300"
            }`}
            onClick={() =>
              interactive && onRate && onRate(star)
            }
            onMouseEnter={() =>
              interactive && setHoverRating(star)
            }
            onMouseLeave={() =>
              interactive && setHoverRating(0)
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Nhận xét của tôi
              </h1>
              <p className="text-gray-600">
                Các đánh giá bạn đã viết ({reviews.length})
              </p>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden"
            >
              {/* Tour Info Header */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b-2 border-gray-200">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Tour Image */}
                  <div className="lg:w-48 flex-shrink-0">
                    <img
                      src={review.tourImage}
                      alt={review.tourName}
                      className="w-full h-32 lg:h-full object-cover rounded-xl"
                    />
                  </div>

                  {/* Tour Details */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {review.tourName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-[#075985]" />
                        <span>{review.tourDestination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-[#075985]" />
                        <span>
                          {review.tourStartDate} -{" "}
                          {review.tourEndDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4 text-[#075985]" />
                        <span>HDV: {review.guideName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-[#075985]" />
                        <span>{review.guidePhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4 text-[#075985]" />
                        <span>
                          {review.numberOfGuests} người
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="font-semibold text-[#075985]">
                          {review.totalPrice.toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-gray-600">
                        Đánh giá ngày {review.reviewDate}
                      </span>
                    </div>

                    {editingId === review.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Đánh giá của bạn
                          </label>
                          {renderStars(
                            editRating,
                            true,
                            setEditRating,
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nhận xét chi tiết
                          </label>
                          <textarea
                            value={editComment}
                            onChange={(e) =>
                              setEditComment(e.target.value)
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                            rows={4}
                            placeholder="Chia sẻ trải nghiệm của bạn..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        {renderStars(review.rating)}
                        <p className="text-gray-700 leading-relaxed mt-3">
                          {review.comment}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {editingId !== review.id && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(review)}
                        className="p-2 hover:bg-[#F0F9FF] rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5 text-[#075985]" />
                      </button>
                      <button
                        onClick={() =>
                          setShowDeleteModal(review.id)
                        }
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Actions */}
                {editingId === review.id && (
                  <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Hủy
                    </button>
                    <button
                      onClick={() => handleSave(review.id)}
                      className="flex-1 px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Lưu thay đổi
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {reviews.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Chưa có đánh giá nào
            </h3>
            <p className="text-gray-600">
              Hãy đi tour và chia sẻ trải nghiệm của bạn!
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Xóa đánh giá
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Bạn có chắc chắn muốn xóa đánh giá này? Hành động
              này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}