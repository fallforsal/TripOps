import { useState } from "react";
import {
  X,
  Upload,
  Trash2,
  Star,
  CheckCircle,
  ImageIcon,
} from "lucide-react";

interface ImageUploadManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (images: string[], thumbnailIndex: number) => void;
  initialImages?: string[];
  initialThumbnailIndex?: number;
  title?: string;
}

export function ImageUploadManager({
  isOpen,
  onClose,
  onSave,
  initialImages = [],
  initialThumbnailIndex = 0,
  title = "Quản lý hình ảnh",
}: ImageUploadManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [imageInput, setImageInput] = useState("");
  const [thumbnailIndex, setThumbnailIndex] = useState(
    initialThumbnailIndex,
  );
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddImage = () => {
    if (imageInput.trim() && !images.includes(imageInput.trim())) {
      setImages([...images, imageInput.trim()]);
      setImageInput("");
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    // Adjust thumbnail index if needed
    if (thumbnailIndex === index) {
      setThumbnailIndex(0);
    } else if (thumbnailIndex > index) {
      setThumbnailIndex(thumbnailIndex - 1);
    }
  };

  const handleSetThumbnail = (index: number) => {
    setThumbnailIndex(index);
  };

  const handleSave = () => {
    onSave(images, thumbnailIndex);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Thêm hình ảnh và chọn ảnh đại diện (thumbnail)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!showSuccess ? (
            <>
              {/* Add Image Section */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-[#CBD5E1]">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#075985]" />
                  Thêm hình ảnh
                </h3>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      (e.preventDefault(), handleAddImage())
                    }
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Nhập URL hình ảnh"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Thêm
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Hỗ trợ: PNG, JPG, JPEG, WebP
                </p>
              </div>

              {/* Images Grid */}
              {images.length > 0 ? (
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    Danh sách hình ảnh ({images.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((img, index) => (
                      <div
                        key={index}
                        className={`relative group ${
                          thumbnailIndex === index
                            ? "ring-4 ring-yellow-500"
                            : ""
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Image ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800";
                          }}
                        />

                        {/* Thumbnail Badge */}
                        {thumbnailIndex === index && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded-full flex items-center gap-1 shadow-lg">
                            <Star className="w-3 h-3 fill-current" />
                            Ảnh đại diện
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSetThumbnail(index)}
                            className={`p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors ${
                              thumbnailIndex === index
                                ? "ring-2 ring-white"
                                : ""
                            }`}
                            title="Đặt làm ảnh đại diện"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                thumbnailIndex === index
                                  ? "fill-current"
                                  : ""
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Image Number */}
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                  <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-600">
                    Chưa có hình ảnh nào
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Thêm ít nhất 1 ảnh để bài đăng hấp dẫn hơn
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
                <h4 className="font-semibold text-gray-900 mb-2">
                  💡 Hướng dẫn:
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Nhấn vào biểu tượng ⭐ để chọn ảnh đại diện</li>
                  <li>• Ảnh đại diện sẽ được hiển thị đầu tiên</li>
                  <li>• Nhấn vào biểu tượng 🗑️ để xóa ảnh</li>
                  <li>
                    • Nên thêm 3-5 ảnh chất lượng cao để tăng độ tin cậy
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={images.length === 0}
                  className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold ${
                    images.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#075985] text-white hover:from-blue-700 hover:to-purple-700"
                  }`}
                >
                  Lưu hình ảnh ({images.length})
                </button>
              </div>
            </>
          ) : (
            /* Success Message */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Lưu thành công!
              </h3>
              <p className="text-gray-600">
                Đã cập nhật {images.length} hình ảnh
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
