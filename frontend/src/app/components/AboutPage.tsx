import {
  Compass,
  Target,
  ShieldCheck,
  Sparkles,
  Users,
  Award,
  ArrowRight,
  Globe2,
} from "lucide-react";

interface AboutPageProps {
  onShowLogin: () => void;
}

export function AboutPage({ onShowLogin }: AboutPageProps) {
  const principles = [
    {
      title: "Chất lượng hơn số lượng",
      description:
        "Chúng tôi không chạy theo danh mục tour đại trà. Mỗi hành trình được kiểm tra thực tế nhiều lần để đảm bảo chuẩn mực dịch vụ và độ tĩnh lặng.",
      tag: "Tuyển chọn",
    },
    {
      title: "Trân trọng văn hóa bản địa",
      description:
        "Tôn trọng cộng đồng bản xứ, ủng hộ kinh tế địa phương và bảo tồn vẻ đẹp nguyên sơ của từng miền đất qua lăng kính du lịch bền vững.",
      tag: "Bền vững",
    },
    {
      title: "Minh bạch tuyệt đối",
      description:
        "Mọi chi phí, chính sách hoàn hủy, bảo hiểm du khách và quy chuẩn lưu trú đều được công khai rõ ràng, không phụ phí ẩn.",
      tag: "Chính trực",
    },
    {
      title: "Cá nhân hóa tinh tế",
      description:
        "Lắng nghe nhịp điệu của bạn để thiết kế chuyến đi có khoảng trống nghỉ ngơi, ẩm thực phù hợp khẩu vị và dịch vụ hỗ trợ chu đáo.",
      tag: "Trải nghiệm",
    },
  ];

  const milestones = [
    {
      year: "2021",
      title: "Khởi nguồn ý niệm TripOps",
      description: "Thành lập nhóm nghiên cứu các hành trình du lịch văn hóa chuyên sâu dành cho tệp du khách có gu thẩm mỹ.",
    },
    {
      year: "2023",
      title: "Xây dựng mạng lưới đối tác độc quyền",
      description: "Hợp tác chặt chẽ cùng 100+ khu nghỉ dưỡng boutique và đơn vị văn hóa trải nghiệm trên khắp 3 miền Việt Nam.",
    },
    {
      year: "2024",
      title: "Tích hợp công nghệ AI điều phối",
      description: "Ứng dụng mô hình cá nhân hóa hành trình, giảm 80% thời gian lên kế hoạch tour riêng cho khách hàng.",
    },
    {
      year: "Hiện tại",
      title: "Chuẩn mực du lịch cao cấp",
      description: "Đồng hành cùng hơn 20,000 du khách trên 25 tuổi tìm kiếm những chuyến đi có chiều sâu và ý nghĩa.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0F9FF] text-[#0F172A] font-sans antialiased">
      {/* Hero Section */}
      <section className="pt-32 pb-20 border-b border-[#CBD5E1] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
              Về TripOps
            </span>
            <h1 className="text-4xl sm:text-6xl font-serif text-[#075985] tracking-tight leading-tight">
              Định nghĩa lại cách người trưởng thành khám phá thế giới
            </h1>
            <p className="text-base sm:text-lg text-[#475569] font-light leading-relaxed">
              TripOps ra đời nhằm xóa bỏ những chuyến du lịch vội vã, chen chúc và dập khuôn. Chúng tôi tạo nên những không gian nghỉ dưỡng nơi bạn có thể chậm lại, cảm nhận và lưu giữ những ký ức trọn vẹn nhất.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy Grid */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-16 space-y-2">
            <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
              Giá trị cốt lõi
            </span>
            <h2 className="text-3xl font-serif text-[#075985]">
              Bốn nguyên tắc định hình mọi chuyến đi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {principles.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-2xl border border-[#CBD5E1] hover:border-[#075985] transition-all duration-300 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F97316]">
                    0{idx + 1} • {item.tag}
                  </span>
                  <h3 className="text-xl font-serif text-[#075985]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#475569] font-light leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story & Timeline */}
      <section className="py-20 md:py-28 bg-[#075985] text-[#F0F9FF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs uppercase font-semibold tracking-widest text-[#F97316]">
                Chặng đường phát triển
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight">
                Không ngừng nâng tầm trải nghiệm du khách
              </h2>
              <p className="text-sm text-[#F0F9FF]/70 font-light leading-relaxed">
                Từng cột mốc là một bước tiến của TripOps trong nỗ lực kết hợp công nghệ điều phối thông minh cùng dịch vụ lữ hành mang đậm tính nhân văn.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-8">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex gap-6 border-b border-[#FFFFFF]/10 pb-8 last:border-b-0">
                  <div className="text-lg font-serif font-medium text-[#F97316] w-20 shrink-0">
                    {m.year}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif text-white">{m.title}</h3>
                    <p className="text-xs text-[#F0F9FF]/70 font-light leading-relaxed">
                      {m.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 border-t border-[#CBD5E1] text-center bg-white">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl font-serif text-[#075985]">
            Đồng hành cùng TripOps trong chuyến đi sắp tới
          </h2>
          <p className="text-sm text-[#475569] font-light">
            Trải nghiệm dịch vụ du lịch chỉn chu, thiết kế riêng cho những ai trân trọng giá trị đích thực.
          </p>
          <button
            onClick={onShowLogin}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#075985] text-white text-xs font-semibold hover:bg-[#F97316] transition-all duration-300 shadow-sm"
          >
            <span>Trở thành thành viên TripOps</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
