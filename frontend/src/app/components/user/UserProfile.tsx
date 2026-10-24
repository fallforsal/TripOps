import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
} from "lucide-react";

interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  country: string;
  avatar?: string;
}

const mockUserData: UserProfileData = {
  name: "Nguyễn Văn An",
  email: "customer@demo.com",
  phone: "0987654321",
  dateOfBirth: "1990-05-15",
  gender: "Nam",
  address: "123 Nguyễn Huệ",
  city: "TP. Hồ Chí Minh",
  country: "Việt Nam",
};

export function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] =
    useState<UserProfileData>(mockUserData);
  const [editData, setEditData] =
    useState<UserProfileData>(mockUserData);

  const handleSave = () => {
    setProfileData(editData);
    setIsEditing(false);
    // In real app, call API to update profile
  };

  const handleCancel = () => {
    setEditData(profileData);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý hồ sơ
          </h1>
          <p className="text-gray-600">
            Quản lý thông tin cá nhân của bạn
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>

          {/* Profile Content */}
          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="relative -mt-16 mb-6">
              <div className="w-32 h-32 bg-white rounded-full p-2 shadow-xl">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {profileData.name.charAt(0)}
                </div>
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-[#075985] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#F97316] transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Edit Button */}
            {!isEditing && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors font-semibold flex items-center gap-2"
                >
                  <Edit2 className="w-5 h-5" />
                  Chỉnh sửa hồ sơ
                </button>
              </div>
            )}

            {/* Profile Form */}
            <div className="space-y-6">
              {/* Personal Information Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Thông tin cá nhân
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Họ và tên
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <User className="w-5 h-5 text-gray-400" />
                        {profileData.name}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Mail className="w-5 h-5 text-gray-400" />
                      {profileData.email}
                      <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Không thể thay đổi
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Số điện thoại
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            phone: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <Phone className="w-5 h-5 text-gray-400" />
                        {profileData.phone}
                      </div>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ngày sinh
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.dateOfBirth}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            dateOfBirth: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        {new Date(
                          profileData.dateOfBirth,
                        ).toLocaleDateString("vi-VN")}
                      </div>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Giới tính
                    </label>
                    {isEditing ? (
                      <select
                        value={editData.gender}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            gender: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <User className="w-5 h-5 text-gray-400" />
                        {profileData.gender}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Địa chỉ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Địa chỉ
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.address}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="Số nhà, tên đường"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        {profileData.address}
                      </div>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Thành phố
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.city}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            city: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        {profileData.city}
                      </div>
                    )}
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Quốc gia
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.country}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            country: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-900">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        {profileData.country}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Lưu thay đổi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold mb-2">
              Thành viên từ
            </h3>
            <p className="text-2xl font-bold">Tháng 1, 2025</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold mb-2">
              Tổng tour đã đặt
            </h3>
            <p className="text-2xl font-bold">8 tour</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold mb-2">
              Điểm tích lũy
            </h3>
            <p className="text-2xl font-bold">1,250 điểm</p>
          </div>
        </div>
      </div>
    </div>
  );
}