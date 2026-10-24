import { useState } from "react";
import { GuideSchedule } from "@/app/types";
import {
  Map,
  Calendar,
  User,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  Phone,
  Search,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";

interface ActiveToursManagementProps {
  guideSchedules: GuideSchedule[];
}

export function ActiveToursManagement({
  guideSchedules,
}: ActiveToursManagementProps) {
  const [selectedSchedule, setSelectedSchedule] =
    useState<GuideSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  function getTotalLocations(schedule: GuideSchedule): number {
    return schedule.booking.tour.itinerary.reduce(
      (total, day) => total + day.locations.length,
      0,
    );
  }

  // Filter active tours only (not completed)
  const activeTours = guideSchedules.filter(
    (s) => s.completedLocations.length < getTotalLocations(s),
  );

  const completedTours = guideSchedules.filter(
    (s) => s.completedLocations.length === getTotalLocations(s),
  );

  const totalLocationsCompleted = guideSchedules.reduce(
    (sum, s) => sum + s.completedLocations.length,
    0,
  );

  const totalLocationsAll = guideSchedules.reduce(
    (sum, s) => sum + getTotalLocations(s),
    0,
  );

  const getProgress = (schedule: GuideSchedule) => {
    const total = getTotalLocations(schedule);
    const completed = schedule.completedLocations.length;
    return Math.round((completed / total) * 100);
  };

  // Filter based on search
  const filteredActiveTours = activeTours.filter((schedule) => {
    const searchLower = searchTerm.toLowerCase();
    const tourName = schedule.booking.tour.name.toLowerCase();
    const tourCode =
      schedule.booking.tour.tourCode?.toLowerCase() || "";
    const guideName =
      schedule.booking.guideName?.toLowerCase() || "";

    return (
      tourName.includes(searchLower) ||
      tourCode.includes(searchLower) ||
      guideName.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tour đang được dẫn dắt
        </h1>
        <p className="text-gray-600">
          Theo dõi tiến độ các tour đang được hướng dẫn viên
          thực hiện
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Map className="w-24 h-24 text-[#075985]" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#E0F2FE] rounded-full flex items-center justify-center text-[#075985]">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Tour đang diễn ra
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTours.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-green-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle className="w-24 h-24 text-green-600" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Tour hoàn thành
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {completedTours.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-purple-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MapPin className="w-24 h-24 text-[#F97316]" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-[#F97316]/15 rounded-full flex items-center justify-center text-[#F97316]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Địa điểm đã check-in
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalLocationsCompleted}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-orange-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-orange-600" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Tiến độ tổng thể
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalLocationsAll > 0
                  ? Math.round(
                      (totalLocationsCompleted /
                        totalLocationsAll) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tours Table Section */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Map className="w-5 h-5 text-[#075985]" />
              Danh sách Tour đang hoạt động
            </CardTitle>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên tour, mã tour..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#075985] focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold"
                  >
                    Thông tin Tour
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold"
                  >
                    Hướng dẫn viên
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold"
                  >
                    Khách hàng
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold"
                  >
                    Khởi hành
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold"
                  >
                    Tiến độ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 font-semibold text-center"
                  >
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredActiveTours.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Map className="w-10 h-10 text-gray-300" />
                        <p>
                          Không tìm thấy tour đang hoạt động nào
                          phù hợp
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredActiveTours.map((schedule) => {
                    const progress = getProgress(schedule);
                    return (
                      <tr
                        key={schedule.id}
                        className="bg-white hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span
                              className="font-semibold text-gray-900 line-clamp-1"
                              title={schedule.booking.tour.name}
                            >
                              {schedule.booking.tour.name}
                            </span>
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">
                              {schedule.booking.tour.tourCode ||
                                "NO-CODE"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {schedule.booking.guideAvatar ? (
                              <img
                                src={
                                  schedule.booking.guideAvatar
                                }
                                alt={schedule.booking.guideName}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {schedule.booking.guideName ||
                                  "Chưa phân công"}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="w-3 h-3" />
                                <span>
                                  {schedule.booking
                                    .guidePhone ||
                                    "0909 123 456"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {schedule.booking.userName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {schedule.booking.numberOfGuests}{" "}
                              khách
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {schedule.booking.tourStartDate}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium text-[#075985]">
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-[#075985] h-1.5 rounded-full"
                                style={{
                                  width: `${progress}%`,
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {
                                schedule.completedLocations
                                  .length
                              }
                              /{getTotalLocations(schedule)} địa
                              điểm
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#075985] hover:text-blue-800 hover:bg-[#F0F9FF] font-medium border border-[#CBD5E1]"
                            onClick={() =>
                              setSelectedSchedule(schedule)
                            }
                          >
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedSchedule}
        onOpenChange={() => setSelectedSchedule(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {selectedSchedule && (
            <>
              <div className="sticky top-0 z-20 bg-white border-b border-gray-200 p-6 flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedSchedule.booking.tour.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className="bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]"
                    >
                      {selectedSchedule.booking.tour.tourCode ||
                        "NO-CODE"}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {selectedSchedule.booking.tourStartDate}
                    </span>
                  </DialogDescription>
                </div>
                {/* Close button is handled by DialogPrimitive but we can add a custom header close logic if needed, usually X is auto added */}
              </div>

              <div className="p-6 bg-gray-50 min-h-[500px]">
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Guide Card */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                      Hướng dẫn viên phụ trách
                    </h3>
                    <div className="flex items-center gap-4">
                      {selectedSchedule.booking.guideAvatar ? (
                        <img
                          src={
                            selectedSchedule.booking.guideAvatar
                          }
                          alt="guide"
                          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {selectedSchedule.booking.guideName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Phone className="w-4 h-4 text-blue-500" />
                          <span>
                            {selectedSchedule.booking
                              .guidePhone || "0909 123 456"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Card */}
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                      Thông tin khách hàng
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">
                          {selectedSchedule.booking.userName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <User className="w-4 h-4 text-orange-500" />
                          <span>
                            {
                              selectedSchedule.booking
                                .numberOfGuests
                            }{" "}
                            khách
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Tiến độ chuyến đi
                    </span>
                    <span className="text-sm font-bold text-[#075985]">
                      {getProgress(selectedSchedule)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${getProgress(selectedSchedule)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Itinerary Timeline */}
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  Lịch trình chi tiết
                </h3>

                <div className="space-y-6">
                  {selectedSchedule.booking.tour.itinerary.map(
                    (day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                      >
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#075985] text-white rounded-lg flex items-center justify-center font-bold text-sm">
                            D{dayIndex + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">
                              {day.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {day.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {day.locations.map((location) => {
                            const isCompleted =
                              selectedSchedule.completedLocations.includes(
                                location.id,
                              );
                            return (
                              <div
                                key={location.id}
                                className={`relative pl-8 pb-0 ${
                                  /* connector line logic could go here but kept simple for now */ ""
                                }`}
                              >
                                {/* Timeline dot */}
                                <div
                                  className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-white ${
                                    isCompleted
                                      ? "border-green-500 text-green-500"
                                      : "border-gray-300 text-gray-300"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5" />
                                  )}
                                </div>

                                {/* Content */}
                                <div
                                  className={`p-4 rounded-lg border transition-all ${
                                    isCompleted
                                      ? "bg-green-50/50 border-green-200"
                                      : "bg-white border-gray-200"
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <h5 className="font-bold text-gray-900 mb-1">
                                        {location.name}
                                      </h5>
                                      <p className="text-sm text-gray-600 mb-2 flex items-start gap-1">
                                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                                        {location.address}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-3 text-xs mt-2">
                                        <span className="bg-[#E0F2FE] text-[#075985] px-2 py-0.5 rounded-full flex items-center gap-1">
                                          <Clock className="w-3 h-3" />
                                          Dự kiến:{" "}
                                          {location.time ||
                                            "09:00"}
                                        </span>
                                        {isCompleted &&
                                          location.checkInTime && (
                                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3" />
                                              Check-in:{" "}
                                              {
                                                location.checkInTime
                                              }
                                            </span>
                                          )}
                                      </div>

                                      {isCompleted &&
                                        location.checkInNote && (
                                          <div className="mt-3 bg-white p-2.5 rounded border border-green-100 text-xs text-gray-700 italic shadow-sm relative">
                                            <div className="absolute top-0 left-4 -mt-1 w-2 h-2 bg-white border-t border-l border-green-100 transform rotate-45"></div>
                                            "
                                            {
                                              location.checkInNote
                                            }
                                            "
                                          </div>
                                        )}
                                    </div>

                                    {isCompleted &&
                                      location.checkInImage && (
                                        <div className="shrink-0">
                                          <div className="relative group cursor-pointer overflow-hidden rounded-lg border-2 border-white shadow-md">
                                            <img
                                              src={
                                                location.checkInImage
                                              }
                                              alt="Check-in"
                                              className="w-24 h-24 object-cover hover:scale-110 transition-transform duration-300"
                                            />
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}