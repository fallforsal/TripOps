import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, Compass } from "lucide-react";

interface ContactPageProps {
  onShowLogin: () => void;
}

export function ContactPage({ onShowLogin }: ContactPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Tư vấn tour riêng",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Yêu cầu của bạn đã được tiếp nhận. Chuyên gia tư vấn của TripOps sẽ kết nối với bạn trong vòng 24 giờ.");
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "Tư vấn tour riêng",
      message: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A] font-sans antialiased">
      {/* Header Banner */}
      <section className="pt-32 pb-16 border-b border-[#CBD5E1] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
              Kết nối chuyên gia hành trình
            </span>
            <h1 className="text-4xl sm:text-5xl font-serif text-[#075985] tracking-tight">
              Chúng tôi luôn sẵn sàng lắng nghe mọi ý tưởng của bạn
            </h1>
            <p className="text-base text-[#475569] font-light leading-relaxed">
              Dù bạn cần lên kế hoạch cho một kỳ nghỉ riêng tư, tour công ty hay chuyến đi kỷ niệm, đội ngũ cố vấn của TripOps sẽ đồng hành chi tiết từ bước đầu tiên.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid: Form & Info */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Form Column */}
            <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-2xl border border-[#CBD5E1] shadow-sm space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-serif text-[#075985]">Gửi yêu cầu trao đổi</h3>
                <p className="text-xs text-[#475569]">
                  Vui lòng để lại thông tin liên hệ, chúng tôi sẽ phản hồi kèm gợi ý lịch trình phù hợp.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#075985] uppercase tracking-wider">Họ và tên *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2.5 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#075985] uppercase tracking-wider">Số điện thoại *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0912 345 678"
                      className="w-full px-4 py-2.5 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#075985] uppercase tracking-wider">Địa chỉ Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@domain.com"
                      className="w-full px-4 py-2.5 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#075985] uppercase tracking-wider">Mục đích yêu cầu</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985]"
                    >
                      <option value="Tư vấn tour riêng">Tư vấn tour nghỉ dưỡng riêng</option>
                      <option value="Tour doanh nghiệp">Tour cho tổ chức & công ty</option>
                      <option value="Hợp tác đối tác">Đăng ký đối tác cung cấp dịch vụ</option>
                      <option value="Hỗ trợ khác">Hỗ trợ đặt phòng & thanh toán</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#075985] uppercase tracking-wider">Nội dung chia sẻ</label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Hãy chia sẻ điểm đến mong muốn, số lượng người, thời gian dự kiến hoặc bất kỳ yêu cầu lưu trú đặc biệt nào..."
                    className="w-full p-4 text-sm bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl focus:outline-none focus:border-[#075985] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 rounded-full bg-[#075985] text-white text-xs font-semibold hover:bg-[#F97316] transition-all duration-300 shadow-sm"
                >
                  Gửi yêu cầu tới TripOps
                </button>
              </form>
            </div>

            {/* Direct Info Column */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-[#075985] text-[#F0F9FF] p-8 rounded-2xl space-y-6">
                <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
                  Văn phòng đại diện
                </span>
                <h3 className="text-2xl font-serif text-white">
                  Trung tâm điều phối TripOps
                </h3>

                <div className="space-y-4 text-xs font-light text-[#F0F9FF]/80">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-medium">Trụ sở Hà Nội:</strong>
                      Tầng 8, Tòa nhà Heritage, 68 Phố Phan Chu Trinh, Hoàn Kiếm, Hà Nội
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-medium">Văn phòng TP. Hồ Chí Minh:</strong>
                      Tầng 12, Tòa nhà Saigon Prime, 115 Nguyễn Huệ, Quận 1, TP. HCM
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-[#FFFFFF]/10">
                    <Phone className="w-4 h-4 text-[#F97316]" />
                    <span>Hotline: 1900 6868 (8:00 - 21:00 hàng ngày)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#F97316]" />
                    <span>Email: concierge@tripops.vn</span>
                  </div>
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="bg-white p-6 rounded-2xl border border-[#CBD5E1] space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F97316]">
                  Cam kết dịch vụ TripOps
                </span>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Mọi thông tin cá nhân và kế hoạch kỳ nghỉ của bạn được bảo mật tuyệt đối. Chúng tôi không bao giờ chia sẻ dữ liệu với bên thứ ba vì mục đích quảng cáo rác.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
