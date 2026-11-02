import { GuideSchedule, Location } from "@/app/types";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Circle,
  Eye,
  Upload,
  Image as ImageIcon,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";

interface GuideScheduleProps {
  schedules: GuideSchedule[];
  onCheckIn: (
    scheduleId: string,
    locationId: string,
    image?: string,
    note?: string,
  ) => void;
  onViewDetails: (schedule: GuideSchedule) => void;
}

export function GuideScheduleComponent({
  schedules,
  onCheckIn,
  onViewDetails,
}: GuideScheduleProps) {
  const [checkingIn, setCheckingIn] = useState<{
    scheduleId: string;
    location: Location;
  } | null>(null);
  const [checkInImage, setCheckInImage] = useState<string>("");
  const [checkInNote, setCheckInNote] = useState<string>("");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCheckInSubmit = () => {
    if (checkingIn) {
      onCheckIn(
        checkingIn.scheduleId,
        checkingIn.location.id,
        checkInImage,
        checkInNote,
      );
      setCheckingIn(null);
      setCheckInImage("");
      setCheckInNote("");
    }
  };

  const mockUploadImage = () => {
    // Mock image upload
    setCheckInImage(
      "https://images.unsplash.com/photo-1542044896530-05d85be9b11a?w=400",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Lịch dẫn tour
        </h2>
        <div className="text-sm text-gray-600">
          {schedules.length} tour đang dẫn
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            Chưa có lịch dẫn tour nào
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {schedules.map((schedule) => {
            const booking = schedule.booking;
            const tour = booking.tour;
            const currentDay = schedule.currentDay || 1;
            const currentItinerary = tour.itinerary.find(
              (day) => day.day === currentDay,
            );

            return (
              <div
                key={schedule.id}
                className="bg-white rounded-xl shadow-sm border-2 border-blue-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {tour.name}
                        </h3>
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                          ID: {tour.id}
                        </span>
                      </div>
                      <p className="text-blue-100 text-sm mt-1">
                        {booking.numberOfGuests} khách -{" "}
                        {formatDate(booking.tourStartDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => onViewDetails(schedule)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg transition-colors flex items-center gap-2 border border-white/30"
                    >
                      <Eye className="w-4 h-4" />
                      Lịch trình
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {/* Customer & Admin Info Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0">
                        {booking.guideAvatar ? ( // Reuse avatar logic for customer if exists, or use default
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.userName}`}
                            alt="Customer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Thông tin khách hàng
                        </p>
                        <h4 className="font-bold text-gray-900">
                          {booking.userName}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-3 h-3" /> 0909 888
                          777
                        </div>
                        {/* Customer Note */}
                        <div className="mt-2 bg-white p-2 rounded border border-gray-200 text-xs text-gray-600 italic">
                          "Yêu cầu phòng có view đẹp, ăn chay
                          ngày đầu"
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-[#F0F9FF] rounded-xl border border-blue-100">
                      <div className="w-12 h-12 rounded-xl bg-[#075985] flex items-center justify-center text-white shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                          Liên hệ nội bộ
                        </p>
                        <h4 className="font-bold text-blue-900">
                          Admin - Tổng đài hỗ trợ
                        </h4>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-[#075985] font-semibold">
                            <Phone className="w-3 h-3" /> 1900
                            1234 (Hotline)
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#075985]">
                            <MessageSquare className="w-3 h-3" />{" "}
                            Zalo: 0912.345.678
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {currentItinerary && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-[#075985]" />
                          Ngày {currentDay}:{" "}
                          {currentItinerary.title}
                        </h4>
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {formatDate(currentItinerary.date)}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                        {currentItinerary.description}
                      </p>

                      <div className="space-y-4">
                        <h5 className="font-semibold text-gray-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          Địa điểm hôm nay (
                          {currentItinerary.locations.length}):
                        </h5>
                        {currentItinerary.locations.map(
                          (location: Location) => {
                            const isCheckedIn =
                              schedule.completedLocations.includes(
                                location.id,
                              );
                            return (
                              <div
                                key={location.id}
                                className={`flex flex-col p-4 rounded-xl border-2 transition-all ${
                                  isCheckedIn
                                    ? "bg-green-50 border-green-200 shadow-sm"
                                    : "bg-white border-gray-100 hover:border-[#CBD5E1]"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                      {isCheckedIn ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-300" />
                                      )}
                                      {location.name}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 ml-7">
                                      {location.address}
                                    </div>
                                    {isCheckedIn &&
                                      location.checkInTime && (
                                        <div className="text-xs font-semibold text-green-600 mt-2 ml-7 bg-green-100/50 px-2 py-1 rounded-full w-fit">
                                          Hoàn thành lúc:{" "}
                                          {location.checkInTime}
                                        </div>
                                      )}
                                  </div>
                                  {!isCheckedIn && (
                                    <button
                                      onClick={() =>
                                        setCheckingIn({
                                          scheduleId:
                                            schedule.id,
                                          location,
                                        })
                                      }
                                      className="px-6 py-2 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-all font-bold text-sm whitespace-nowrap shadow-md shadow-blue-200"
                                    >
                                      Check-in
                                    </button>
                                  )}
                                </div>

                                {/* Check-in results preview for guide */}
                                {isCheckedIn &&
                                  (location.checkInImage ||
                                    location.checkInNote) && (
                                    <div className="mt-4 pt-4 border-t border-green-100 flex gap-4">
                                      {location.checkInImage && (
                                        <img
                                          src={
                                            location.checkInImage
                                          }
                                          alt="checkin"
                                          className="w-16 h-16 object-cover rounded-lg"
                                        />
                                      )}
                                      {location.checkInNote && (
                                        <p className="text-sm text-gray-600 italic">
                                          "
                                          {location.checkInNote}
                                          "
                                        </p>
                                      )}
                                    </div>
                                  )}
                              </div>
                            );
                          },
                        )}
                      </div>

                      <div className="mt-6 p-4 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          Tiến độ ngày:
                          <span className="font-bold text-gray-900">
                            {
                              schedule.completedLocations.filter(
                                (id) =>
                                  currentItinerary.locations.some(
                                    (loc) => loc.id === id,
                                  ),
                              ).length
                            }
                            /{currentItinerary.locations.length}
                          </span>
                          địa điểm
                        </div>
                        <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#075985] transition-all"
                            style={{
                              width: `${
                                (schedule.completedLocations.filter(
                                  (id) =>
                                    currentItinerary.locations.some(
                                      (loc) => loc.id === id,
                                    ),
                                ).length /
                                  currentItinerary.locations
                                    .length) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-in Modal */}
      <Dialog
        open={checkingIn !== null}
        onOpenChange={() => setCheckingIn(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#075985]">
              <ShieldCheck className="w-6 h-6" />
              Xác nhận Check-in tại địa điểm
            </DialogTitle>
            <DialogDescription>
              Bạn đang check-in tại{" "}
              <span className="font-bold text-gray-900">
                {checkingIn?.location.name}
              </span>
              . Vui lòng cung cấp hình ảnh minh chứng và ghi chú
              nếu có.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Image Upload Area */}
            <div className="space-y-2">
              <Label className="font-semibold text-gray-700">
                Hình ảnh tại điểm check-in
              </Label>
              <div
                onClick={mockUploadImage}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-300 hover:bg-[#F0F9FF] transition-all"
              >
                {checkInImage ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden">
                    <img
                      src={checkInImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-bold">
                        Thay đổi ảnh
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-700">
                        Bấm để tải ảnh lên
                      </p>
                      <p className="text-xs text-gray-500">
                        Chụp ảnh HDV và đoàn tại địa điểm
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Note Area */}
            <div className="space-y-2">
              <Label className="font-semibold text-gray-700">
                Ghi chú (Tùy chọn)
              </Label>
              <Textarea
                placeholder="VD: Đoàn đến trễ 10 phút, Thời tiết đẹp, Đã đổi sang điểm tham quan lân cận..."
                value={checkInNote}
                onChange={(e) => setCheckInNote(e.target.value)}
                className="min-h-[100px] rounded-xl border-gray-200 focus:ring-[#075985]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              onClick={() => setCheckingIn(null)}
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={handleCheckInSubmit}
              className="bg-[#075985] hover:bg-[#F97316] text-white px-8 rounded-xl font-bold"
              disabled={!checkInImage}
            >
              Hoàn tất Check-in
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}