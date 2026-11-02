import { useState } from "react";
import {
  Search,
  Eye,
  Lock,
  Unlock,
  X,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { User } from "@/app/types";

interface UserManagementProps {
  users: User[];
  onUpdateUserStatus: (userId: string, isLocked: boolean) => void;
}

export function UserManagement({
  users,
  onUpdateUserStatus,
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lockedUsers, setLockedUsers] = useState<Set<string>>(new Set());

  // Lọc chỉ lấy user có role "user"
  const customerUsers = users.filter((user) => user.role === "user");

  // Tìm kiếm users
  const filteredUsers = customerUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetail = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const handleToggleLock = (userId: string) => {
    const newLockedUsers = new Set(lockedUsers);
    if (newLockedUsers.has(userId)) {
      newLockedUsers.delete(userId);
      onUpdateUserStatus(userId, false);
    } else {
      newLockedUsers.add(userId);
      onUpdateUserStatus(userId, true);
    }
    setLockedUsers(newLockedUsers);
  };

  const isUserLocked = (userId: string) => lockedUsers.has(userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#075985] rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Quản lý tài khoản khách hàng</h1>
        <p className="text-blue-100">
          Quản lý và giám sát tài khoản người dùng trên hệ thống
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tổng khách hàng</p>
              <p className="text-3xl font-bold text-gray-900">
                {customerUsers.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#E0F2FE] rounded-xl flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-[#075985]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tài khoản hoạt động</p>
              <p className="text-3xl font-bold text-green-600">
                {customerUsers.length - lockedUsers.size}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Unlock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tài khoản bị khóa</p>
              <p className="text-3xl font-bold text-red-600">
                {lockedUsers.size}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Khách hàng
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Số điện thoại
                </th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <AlertCircle className="w-12 h-12 mb-3 text-gray-400" />
                      <p className="text-lg font-semibold mb-1">
                        Không tìm thấy khách hàng
                      </p>
                      <p className="text-sm">
                        Thử tìm kiếm với từ khóa khác
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {user.phone || "Chưa cập nhật"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isUserLocked(user.id) ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Đã khóa
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetail(user)}
                          className="p-2 hover:bg-[#F0F9FF] rounded-lg transition-colors group"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5 text-[#075985] group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => handleToggleLock(user.id)}
                          className={`p-2 rounded-lg transition-colors group ${
                            isUserLocked(user.id)
                              ? "hover:bg-green-50"
                              : "hover:bg-red-50"
                          }`}
                          title={
                            isUserLocked(user.id)
                              ? "Mở khóa tài khoản"
                              : "Khóa tài khoản"
                          }
                        >
                          {isUserLocked(user.id) ? (
                            <Unlock className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                          ) : (
                            <Lock className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Chi tiết khách hàng
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Thông tin chi tiết về tài khoản
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* User Avatar & Name */}
              <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-[#CBD5E1]">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedUser.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Mã khách hàng: {selectedUser.id}
                  </p>
                  <div className="mt-2">
                    {isUserLocked(selectedUser.id) ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Tài khoản đã khóa
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold inline-flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        Tài khoản hoạt động
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">
                  Thông tin liên hệ
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E0F2FE] rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-[#075985]" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-semibold text-gray-900">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Số điện thoại</p>
                      <p className="font-semibold text-gray-900">
                        {selectedUser.phone || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">
                  Thông tin tài khoản
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Vai trò</p>
                    <span className="px-3 py-1 bg-[#E0F2FE] text-[#075985] rounded-full text-sm font-semibold">
                      Khách hàng
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Trạng thái</p>
                    {isUserLocked(selectedUser.id) ? (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        Đã khóa
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        Hoạt động
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    handleToggleLock(selectedUser.id);
                    setShowDetailModal(false);
                  }}
                  className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 ${
                    isUserLocked(selectedUser.id)
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isUserLocked(selectedUser.id) ? (
                    <>
                      <Unlock className="w-5 h-5" />
                      Mở khóa tài khoản
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Khóa tài khoản
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
