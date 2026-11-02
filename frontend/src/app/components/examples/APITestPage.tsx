/**
 * API Test Page
 * Trang demo các API calls để test functionality
 */

import { useState } from "react";
import {
  TourListWithHook,
  TourSearchExample,
} from "./TourListExample";
import {
  UserBookingsExample,
  AdminBookingManagementExample,
} from "./BookingManagementExample";
import { Button } from "@/app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

export function APITestPage() {
  const [selectedTab, setSelectedTab] = useState("tours");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 API Services Test Page
          </h1>
          <p className="text-gray-600">
            Trang demo các API calls để test functionality. Tất
            cả data đến từ API services.
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="tours">Tours</TabsTrigger>
            <TabsTrigger value="user-bookings">
              User Bookings
            </TabsTrigger>
            <TabsTrigger value="admin-bookings">
              Admin Bookings
            </TabsTrigger>
          </TabsList>

          {/* Tours Tab */}
          <TabsContent value="tours" className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tour List (với useApi Hook)
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Example: Fetch và hiển thị danh sách tours với
                loading/error handling
              </p>
              <TourListWithHook />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tour Search (với filters)
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Example: Tìm kiếm tours với nhiều filters
              </p>
              <TourSearchExample />
            </div>
          </TabsContent>

          {/* User Bookings Tab */}
          <TabsContent
            value="user-bookings"
            className="space-y-8"
          >
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                My Bookings (User View)
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Example: User xem và quản lý bookings của mình
              </p>
              <UserBookingsExample userId="user-1" />
            </div>
          </TabsContent>

          {/* Admin Bookings Tab */}
          <TabsContent
            value="admin-bookings"
            className="space-y-8"
          >
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Booking Management (Admin View)
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Example: Admin quản lý tất cả bookings, duyệt/từ
                chối, phân công HDV
              </p>
              <AdminBookingManagementExample />
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Box */}
        <div className="mt-8 bg-[#F0F9FF] border-2 border-[#CBD5E1] rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            💡 Thông tin
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Tất cả data</strong> trong trang này đến
              từ{" "}
              <code className="bg-[#E0F2FE] px-2 py-0.5 rounded">
                /src/app/services/
              </code>
            </p>
            <p>
              <strong>Loading states</strong> được quản lý tự
              động bởi{" "}
              <code className="bg-[#E0F2FE] px-2 py-0.5 rounded">
                useApi
              </code>{" "}
              hook
            </p>
            <p>
              <strong>Để chuyển sang API thật:</strong> Chỉ cần
              thay đổi implementation trong service files,
              components không cần thay đổi gì!
            </p>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/API_SERVICES_README.md"
            target="_blank"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h4 className="font-bold text-gray-900 mb-1">
              📖 API Services README
            </h4>
            <p className="text-sm text-gray-600">
              Overview và giới thiệu
            </p>
          </a>
          <a
            href="/API_STRUCTURE.md"
            target="_blank"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h4 className="font-bold text-gray-900 mb-1">
              🏗️ API Structure
            </h4>
            <p className="text-sm text-gray-600">
              Kiến trúc chi tiết
            </p>
          </a>
          <a
            href="/MIGRATION_GUIDE.md"
            target="_blank"
            className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <h4 className="font-bold text-gray-900 mb-1">
              🔄 Migration Guide
            </h4>
            <p className="text-sm text-gray-600">
              Hướng dẫn migrate
            </p>
          </a>
        </div>

        {/* Code Examples */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6 text-white">
          <h3 className="font-bold mb-4">
            💻 Quick Code Example
          </h3>
          <pre className="text-sm overflow-x-auto">
            <code>{`import { useApi } from '@/app/hooks/useApi';
import { getAllTours } from '@/app/services';

function TourList() {
  const { data: tours, loading, error, execute } = useApi(getAllTours);
  
  useEffect(() => {
    execute();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {tours?.map(tour => <TourCard key={tour.id} tour={tour} />)}
    </div>
  );
}`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}