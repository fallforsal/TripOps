import { useState } from "react";
import { Tour, User } from "@/app/types";
import {
  X,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Star,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  User as UserIcon,
  ChevronRight,
  Info,
} from "lucide-react";

interface BookTourModalProps {
  tour: Tour;
  currentUser: User | null;
  onClose: () => void;
  onConfirmBooking: (
    tourId: string,
    numberOfGuests: number,
    startDate: string,
    contactInfo: {
      fullName: string;
      email: string;
      phone: string;
      note?: string;
    }
  ) => void;
}

type BookingStep = "info" | "confirm" | "success";

export function BookTourModal({
  tour,
  currentUser,
  onClose,
  onConfirmBooking,
}: BookTourModalProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("info");
  
  // Form data
  const [numberOfGuests, setNumberOfGuests] = useState(tour.minGuests);
  const [startDate, setStartDate] = useState("");
  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  
  // Payment method (mock)
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "bank" | "cash">("credit");
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const totalPrice = tour.price * numberOfGuests;

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const validateStep1 = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!startDate) {
      newErrors.startDate = "Vui lòng chọn ngày khởi hành";
    }
    
    if (numberOfGuests < tour.minGuests) {
      newErrors.numberOfGuests = `Số khách tối thiểu là ${tour.minGuests} người`;
    }
    
    if (numberOfGuests > tour.maxGuests) {
      newErrors.numberOfGuests = `Số khách tối đa là ${tour.maxGuests} người`;
    }
    
    if (!fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ tên";
    }
    
    if (!email.trim()) {
      newErrors.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email không hợp lệ";
    }
    
    if (!phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ""))) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep("confirm");
    }
  };

  const handleConfirm = () => {
    onConfirmBooking(tour.id, numberOfGuests, startDate, {
      fullName,
      email,
      phone,
      note,
    });
    setCurrentStep("success");
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center">
        {/* Step 1 */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep === "info"
                ? "bg-[#075985] text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {currentStep === "info" ? "1" : <CheckCircle className="w-6 h-6" />}
          </div>
          <span className="ml-2 font-semibold text-gray-700">Thông tin</span>
        </div>

        {/* Connector */}
        <div className="w-16 h-0.5 bg-gray-300 mx-4" />

        {/* Step 2 */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep === "confirm"
                ? "bg-[#075985] text-white"
                : currentStep === "success"
                ? "bg-green-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {currentStep === "success" ? <CheckCircle className="w-6 h-6" /> : "2"}
          </div>
          <span
            className={`ml-2 font-semibold ${
              currentStep === "info" ? "text-gray-400" : "text-gray-700"
            }`}
          >
            Xác nhận
          </span>
        </div>

        {/* Connector */}
        <div className="w-16 h-0.5 bg-gray-300 mx-4" />

        {/* Step 3 */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              currentStep === "success"
                ? "bg-green-600 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {currentStep === "success" ? <CheckCircle className="w-6 h-6" /> : "3"}
          </div>
          <span
            className={`ml-2 font-semibold ${
              currentStep === "success" ? "text-gray-700" : "text-gray-400"
            }`}
          >
            Hoàn tất
          </span>
        </div>
      </div>
    </div>
  );

  const renderInfoStep = () => (
    <div className="space-y-6">
      {/* Tour Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border-2 border-[#CBD5E1]">
        <div className="flex gap-4">
          <img
            src={tour.image}
            alt={tour.name}
            className="w-32 h-32 object-cover rounded-lg"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{tour.name}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-[#075985]" />
                <span>{tour.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-[#F97316]" />
                <span>{tour.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span>Đánh giá: {tour.rating}/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Ngày khởi hành *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={getMinDate()}
            className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent ${
              errors.startDate ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.startDate && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.startDate}
            </p>
          )}
        </div>

        {/* Number of Guests */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Số lượng khách *
          </label>
          <input
            type="number"
            value={numberOfGuests}
            onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || tour.minGuests)}
            min={tour.minGuests}
            max={tour.maxGuests}
            className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent ${
              errors.numberOfGuests ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.numberOfGuests && (
            <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.numberOfGuests}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            <Info className="w-3 h-3 inline" /> Từ {tour.minGuests} đến {tour.maxGuests} người
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="border-t pt-6">
        <h4 className="font-bold text-lg text-gray-900 mb-4">Thông tin liên hệ</h4>
        
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 inline mr-1" />
              Họ và tên *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent ${
                errors.fullName ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.fullName && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Số điện thoại *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className={`w-full px-4 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent ${
                errors.phone ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ghi chú (không bắt buộc)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Yêu cầu đặc biệt, thời gian đón, v.v..."
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
        <h4 className="font-bold text-gray-900 mb-3">Tổng chi phí</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Giá tour (1 người)</span>
            <span className="font-semibold">{formatPrice(tour.price)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Số lượng khách</span>
            <span className="font-semibold">× {numberOfGuests}</span>
          </div>
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="font-bold text-gray-900">Tổng cộng</span>
            <span className="text-2xl font-bold text-[#075985]">
              {formatPrice(totalPrice)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      {/* Important Notice */}
      <div className="bg-[#F0F9FF] border-2 border-blue-300 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="w-6 h-6 text-[#075985] mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Xác nhận thông tin đặt tour</h4>
            <p className="text-blue-800 text-sm">
              Vui lòng kiểm tra kỹ thông tin trước khi xác nhận. Sau khi đặt tour thành công, bạn sẽ nhận được email xác nhận và hướng dẫn thanh toán.
            </p>
          </div>
        </div>
      </div>

      {/* Booking Summary */}
      <div className="border-2 border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-lg text-gray-900 mb-4">Thông tin tour</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Tên tour</span>
            <span className="font-semibold text-gray-900">{tour.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Điểm đến</span>
            <span className="font-semibold text-gray-900">{tour.destination}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Thời gian</span>
            <span className="font-semibold text-gray-900">{tour.duration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ngày khởi hành</span>
            <span className="font-semibold text-gray-900">
              {new Date(startDate).toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Số lượng khách</span>
            <span className="font-semibold text-gray-900">{numberOfGuests} người</span>
          </div>
        </div>
      </div>

      {/* Contact Info Summary */}
      <div className="border-2 border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-lg text-gray-900 mb-4">Thông tin liên hệ</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Họ và tên</span>
            <span className="font-semibold text-gray-900">{fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email</span>
            <span className="font-semibold text-gray-900">{email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Số điện thoại</span>
            <span className="font-semibold text-gray-900">{phone}</span>
          </div>
          {note && (
            <div>
              <span className="text-gray-600 block mb-1">Ghi chú</span>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Policy Notice */}
      <div className="border-2 border-teal-200 bg-teal-50/70 rounded-xl p-5 space-y-3">
        <h4 className="font-bold text-base text-teal-950 flex items-center gap-2">
          <Info className="w-5 h-5 text-teal-700" />
          Chính sách thanh toán sau khi công ty xác nhận
        </h4>
        <div className="text-xs text-teal-900 space-y-2 leading-relaxed">
          <p>
            Quý khách <strong>chưa cần thanh toán ngay lúc này</strong>.
          </p>
          <p className="bg-white/80 p-3 rounded-lg border border-teal-200 text-teal-800">
            Vì giá của một số dịch vụ như khách sạn lưu trú và chỗ ăn uống có thể có sự điều chỉnh theo thời điểm thực tế, công ty du lịch sẽ liên hệ với các bên cung cấp đối tác ở ngoài hệ thống để đối soát và chốt giá chính thức cho đoàn. Sau khi công ty xác nhận và gửi thông tin chốt giá, bạn mới tiến hành thanh toán.
          </p>
        </div>
      </div>

      {/* Total Price */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-6 border-2 border-teal-300">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-700 font-semibold mb-1">Tổng chi phí dự kiến</p>
            <p className="text-xs text-gray-500">
              Tính theo đơn giá: {formatPrice(tour.price)}/khách × {numberOfGuests} người
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl sm:text-3xl font-bold text-[#075985]">
              {formatPrice(totalPrice)}
            </p>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
              Chưa cần thanh toán ngay
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-teal-600" />
      </div>
      
      <h3 className="text-3xl font-bold text-gray-900 mb-3">
        Gửi yêu cầu đặt tour thành công!
      </h3>
      
      <p className="text-base text-gray-600 mb-6 max-w-md mx-auto">
        Yêu cầu của bạn đã được chuyển tới công ty du lịch. Chúng tôi đã gửi email xác nhận đến <strong>{email}</strong>
      </p>

      <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-5 max-w-md mx-auto mb-6 text-left space-y-2 text-xs">
        <div className="flex items-start gap-2 text-teal-900 font-semibold mb-2">
          <Clock className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" />
          <span>Trạng thái: Chờ công ty du lịch xác nhận &amp; chốt giá</span>
        </div>
        <div className="flex justify-between border-t border-teal-200/60 pt-2">
          <span className="text-gray-600">Tour:</span>
          <span className="font-semibold text-gray-900">{tour.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Ngày khởi hành:</span>
          <span className="font-semibold text-gray-900">
            {new Date(startDate).toLocaleDateString("vi-VN")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Số lượng khách:</span>
          <span className="font-semibold text-gray-900">{numberOfGuests} người</span>
        </div>
        <div className="flex justify-between border-t border-teal-200/60 pt-2">
          <span className="text-gray-600 font-bold">Tổng tiền dự tính:</span>
          <span className="font-bold text-[#075985] text-sm">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 text-xs text-amber-900 text-left">
          <p className="leading-relaxed">
            <Info className="w-4 h-4 inline mr-1 text-amber-700" />
            Công ty lữ hành sẽ liên hệ với các đơn vị cung ứng ngoài hệ thống (khách sạn, quán ăn) để kiểm tra phòng và dịch vụ, sau đó sẽ gửi báo giá chốt và hướng dẫn thanh toán cho bạn.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold text-sm shadow-sm"
        >
          Hoàn tất &amp; Đóng
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentStep === "info"
              ? "Thông tin đặt tour"
              : currentStep === "confirm"
              ? "Xác nhận đặt tour"
              : "Đặt tour thành công"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator */}
          {currentStep !== "success" && renderStepIndicator()}

          {/* Step Content */}
          {currentStep === "info" && renderInfoStep()}
          {currentStep === "confirm" && renderConfirmStep()}
          {currentStep === "success" && renderSuccessStep()}
        </div>

        {/* Footer - Action Buttons */}
        {currentStep !== "success" && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={currentStep === "info" ? onClose : () => setCurrentStep("info")}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              {currentStep === "info" ? "Hủy" : "Quay lại"}
            </button>
            
            <button
              onClick={currentStep === "info" ? handleNext : handleConfirm}
              className="px-8 py-3 bg-[#075985] text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
            >
              {currentStep === "info" ? (
                <>
                  Tiếp tục
                  <ChevronRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Gửi yêu cầu đặt tour (Thanh toán sau)
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
