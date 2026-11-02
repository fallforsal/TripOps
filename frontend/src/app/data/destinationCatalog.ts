// Danh mục gợi ý chuẩn hóa cho các điểm đến du lịch phổ biến tại Việt Nam
// Phục vụ tính năng gợi ý thông minh (Auto-fill & Quick-pick) cho Lữ hành khi thiết kế tour

export interface PresetHotel {
  name: string;
  stars: number;
  address: string;
  pricePerNight?: number;
}

export interface PresetRestaurant {
  serviceName: string;
  type: "breakfast" | "lunch" | "dinner";
  description: string;
  pricePerPerson?: number;
}

export interface DestinationPreset {
  destination: string;
  aliases: string[]; // Các từ khóa để nhận diện
  attractions: string[]; // Điểm tham quan nổi bật
  hotels: PresetHotel[]; // Khách sạn đối tác mẫu
  restaurants: PresetRestaurant[]; // Nhà hàng & thực đơn mẫu
}

export const DESTINATION_CATALOG: DestinationPreset[] = [
  {
    destination: "Đà Lạt",
    aliases: ["đà lạt", "da lat", "dalat", "lâm đồng", "lam dong"],
    attractions: [
      "Quảng trường Lâm Viên & Nụ hoa Atiso",
      "Hồ Xuân Hương",
      "Thung Lũng Tình Yêu",
      "Ga Đà Lạt cổ điển",
      "Thác Datanla (Trải nghiệm máng trượt)",
      "Đồi Chè Cầu Đất",
      "Nhà thờ Con Gà (Chánh Tòa)",
      "Dinh III Bảo Đại",
      "Chợ đêm Đà Lạt",
      "Vườn hoa Thành phố",
      "Thiền viện Trúc Lâm & Hồ Tuyền Lâm",
      "Mê Linh Coffee Garden",
      "Núi Langbiang huyền thoại",
    ],
    hotels: [
      { name: "Khách sạn Dalat Palace Heritage", stars: 5, address: "02 Trần Phú, Phường 3, TP. Đà Lạt", pricePerNight: 2800000 },
      { name: "Terracotta Hotel & Resort Dalat", stars: 4, address: "Phân khu 7.9, Hồ Tuyền Lâm, Phường 3, TP. Đà Lạt", pricePerNight: 1650000 },
      { name: "Dalat Edensee Lake Resort & Spa", stars: 5, address: "Khu du lịch Hồ Tuyền Lâm, Phường 4, TP. Đà Lạt", pricePerNight: 2500000 },
      { name: "Khách sạn Mường Thanh Holiday Đà Lạt", stars: 4, address: "42 Phan Bội Châu, Phường 2, TP. Đà Lạt", pricePerNight: 1350000 },
      { name: "Khách sạn Saphir Dalat", stars: 4, address: "22-24 Phan Như Thạch, Phường 1, TP. Đà Lạt", pricePerNight: 1100000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn", type: "breakfast", description: "Buffet sáng Á - Âu tiêu chuẩn tại khách sạn lưu trú", pricePerPerson: 0 },
      { serviceName: "Bánh mì xíu mại Hoàng Diệu", type: "breakfast", description: "Bánh mì giòn nóng kèm xíu mại cay thơm và sữa đậu nành nóng", pricePerPerson: 45000 },
      { serviceName: "Nhà hàng Hương Rừng Đà Lạt", type: "lunch", description: "Cơm lam nướng than, gà đồi nướng mọi, rau rừng xào tỏi organic", pricePerPerson: 160000 },
      { serviceName: "Nhà hàng Trúc Lâm Viên", type: "lunch", description: "Cơm niêu truyền thống, cá kho tộ, canh atiso hầm giò heo", pricePerPerson: 180000 },
      { serviceName: "Nhà hàng Làng Nướng Đà Lạt", type: "dinner", description: "Thịt nướng ngói đá, bò sốt tiêu xanh, rượu vang Đà Lạt", pricePerPerson: 220000 },
      { serviceName: "Lẩu gà lá é Tao Ngộ", type: "dinner", description: "Lẩu gà thả vườn lá é cay nồng, nấm tươi và măng rừng", pricePerPerson: 150000 },
      { serviceName: "Lẩu bò Quán Gỗ Ba Toa", type: "dinner", description: "Lẩu bò bắp hoa nạc giòn, đậu hũ và rau tươi cao nguyên", pricePerPerson: 160000 },
    ],
  },
  {
    destination: "Nha Trang",
    aliases: ["nha trang", "khánh hòa", "khanh hoa", "cam ranh"],
    attractions: [
      "VinWonders Hòn Tre",
      "Tháp Bà Ponagar",
      "Viện Hải Dương Học",
      "Bãi Dài Cam Ranh",
      "Hòn Tằm & Tắm bùn khoáng",
      "Đảo Hòn Mun (Lặn biển ngắm san hô)",
      "Chùa Long Sơn & Tượng Phật Trắng",
      "Chợ Đầm Nha Trang",
      "Nhà thờ Núi Nha Trang",
    ],
    hotels: [
      { name: "Vinpearl Resort & Spa Nha Trang Bay", stars: 5, address: "Đảo Hòn Tre, Vĩnh Nguyên, TP. Nha Trang", pricePerNight: 2900000 },
      { name: "Sheraton Nha Trang Hotel & Spa", stars: 5, address: "26-28 Trần Phú, Lộc Thọ, TP. Nha Trang", pricePerNight: 2400000 },
      { name: "Novotel Nha Trang", stars: 4, address: "50 Trần Phú, Lộc Thọ, TP. Nha Trang", pricePerNight: 1500000 },
      { name: "Muong Thanh Luxury Nha Trang", stars: 5, address: "60 Trần Phú, Lộc Thọ, TP. Nha Trang", pricePerNight: 1600000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn", type: "breakfast", description: "Buffet sáng quốc tế ngắm vịnh biển tại khách sạn", pricePerPerson: 0 },
      { serviceName: "Bún sứa & Chả cá Năm Beo", type: "breakfast", description: "Bún sứa giòn thanh mát, chả cá thu chiên và nước lèo xương cá ngừ", pricePerPerson: 50000 },
      { serviceName: "Nhà hàng Yến Sào Khánh Hòa", type: "lunch", description: "Hải sản tươi sống: Tôm hấp nước dừa, mực nhảy xào chua ngọt, súp yến", pricePerPerson: 250000 },
      { serviceName: "Nhà hàng Champa Island", type: "lunch", description: "Ẩm thực duyên hải miền Trung, gỏi sứa tôm thịt, cá chẽm hấp nấm", pricePerPerson: 200000 },
      { serviceName: "Nhà hàng Hải sản Bờ Kè Nha Trang", type: "dinner", description: "Tôm hùm nướng phô mai, ghẹ hấp bia, ốc hương nướng muối ớt", pricePerPerson: 350000 },
      { serviceName: "Nem nướng Đặng Văn Quyên", type: "dinner", description: "Nem nướng Nha Trang cuốn bánh tráng, ram giòn và nước chấm bí truyền", pricePerPerson: 120000 },
    ],
  },
  {
    destination: "Hạ Long",
    aliases: ["hạ long", "ha long", "quảng ninh", "quang ninh", "bãi cháy", "bai chay"],
    attractions: [
      "Vịnh Hạ Long (Kỳ quan thiên nhiên)",
      "Đảo Ti Tốp & Bãi tắm",
      "Hang Sửng Sốt",
      "Động Thiên Cung",
      "Sun World Hạ Long Complex",
      "Bảo tàng Quảng Ninh",
      "Làng chài Cửa Vạn",
      "Bãi tắm Bãi Cháy",
      "Chợ đêm Hạ Long",
    ],
    hotels: [
      { name: "Vinpearl Resort & Spa Hạ Long", stars: 5, address: "Đảo Rều, Bãi Cháy, TP. Hạ Long", pricePerNight: 3100000 },
      { name: "Du thuyền 5 sao Ambassador Cruise", stars: 5, address: "Cảng tàu khách quốc tế Hạ Long", pricePerNight: 3500000 },
      { name: "Muong Thanh Luxury Quang Ninh", stars: 5, address: "Đường Hạ Long, Bãi Cháy, TP. Hạ Long", pricePerNight: 1700000 },
      { name: "FLC Grand Hotel Hạ Long", stars: 5, address: "Đoàn Kết, Hà Trung, TP. Hạ Long", pricePerNight: 1900000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Du thuyền / Khách sạn", type: "breakfast", description: "Buffet sáng phong phú ẩm thực Á - Âu", pricePerPerson: 0 },
      { serviceName: "Bún cù kỳ Bà Lan Bãi Cháy", type: "breakfast", description: "Bún cù kỳ Hạ Long béo ngậy gạch cù kỳ và thịt càng tươi ngọt", pricePerPerson: 65000 },
      { serviceName: "Nhà hàng Cua Vàng Bãi Cháy", type: "lunch", description: "Lẩu cua biển gạch nấu nồi đất, chả mực Hạ Long giã tay", pricePerPerson: 300000 },
      { serviceName: "Nhà hàng Hồng Hạnh 3", type: "lunch", description: "Hải sản tươi sống đánh bắt trong ngày: Bề bề rang muối, tu hài nướng mỡ hành", pricePerPerson: 280000 },
      { serviceName: "Tiệc BBQ hải sản trên Du thuyền", type: "dinner", description: "Tiệc tối sang trọng ngắm hoàng hôn vịnh Hạ Long, tôm biển nướng, hàu sữa", pricePerPerson: 450000 },
      { serviceName: "Nhà hàng Phương Nam Hạ Long", type: "dinner", description: "Gỏi cá song, cá vược hấp xì dầu, canh riêu cua biển", pricePerPerson: 250000 },
    ],
  },
  {
    destination: "Đà Nẵng",
    aliases: ["đà nẵng", "da nang", "bà nà", "ba na", "sơn trà"],
    attractions: [
      "Bà Nà Hills & Cầu Vàng",
      "Bán đảo Sơn Trà & Chùa Linh Ứng",
      "Bãi biển Mỹ Khê",
      "Cầu Rồng (Phun lửa & nước)",
      "Ngũ Hành Sơn & Động Huyền Không",
      "Chợ Hàn Đà Nẵng",
      "Công viên suối khoáng nóng Núi Thần Tài",
      "Cầu Tình Yêu & Tượng Cá Chép Hóa Rồng",
    ],
    hotels: [
      { name: "InterContinental Danang Sun Peninsula Resort", stars: 5, address: "Bán đảo Sơn Trà, TP. Đà Nẵng", pricePerNight: 8500000 },
      { name: "Novotel Danang Premier Han River", stars: 5, address: "36 Bạch Đằng, Hải Châu, TP. Đà Nẵng", pricePerNight: 2300000 },
      { name: "Four Points by Sheraton Danang", stars: 5, address: "118-120 Võ Nguyên Giáp, Sơn Trà, TP. Đà Nẵng", pricePerNight: 1950000 },
      { name: "Khách sạn Mường Thanh Grand Đà Nẵng", stars: 4, address: "962 Ngô Quyền, An Hải Tây, Sơn Trà", pricePerNight: 1100000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn", type: "breakfast", description: "Buffet sáng tiêu chuẩn quốc tế", pricePerPerson: 0 },
      { serviceName: "Mì Quảng Bà Mua", type: "breakfast", description: "Mì Quảng tôm thịt đậm đà ăn kèm bánh tráng mè nướng và rau sống Trà Quế", pricePerPerson: 55000 },
      { serviceName: "Bánh tráng cuốn thịt heo Trần", type: "lunch", description: "Thịt heo hai đầu da luộc, đĩa rau sống hơn 10 loại, mắm nêm đậm đà", pricePerPerson: 140000 },
      { serviceName: "Nhà hàng Cơm niêu Trúc Lâm Viên", type: "lunch", description: "Cơm đập niêu đất, cá bống kho tiêu, canh cua đồng mồng tơi", pricePerPerson: 160000 },
      { serviceName: "Hải sản Bé Mặn Mỹ Khê", type: "dinner", description: "Hải sản tươi sống cân ký chế biến tại chỗ: Ghẹ rang me, tôm sú nướng", pricePerPerson: 300000 },
      { serviceName: "Nhà hàng Madam Lân", type: "dinner", description: "Ẩm thực 3 miền không gian nhà cổ ven sông Hàn", pricePerPerson: 220000 },
    ],
  },
  {
    destination: "Hội An",
    aliases: ["hội an", "hoi an", "quảng nam", "quang nam"],
    attractions: [
      "Phố cổ Hội An & Thả đèn hoa đăng",
      "Chùa Cầu Nhật Bản",
      "Rừng dừa Bảy Mẫu (Đi thuyền thúng)",
      "Làng gốm Thanh Hà",
      "Làng rau Trà Quế",
      "Show diễn Ký Ức Hội An",
      "Nhà cổ Tấn Ký",
      "Bãi biển An Bàng",
    ],
    hotels: [
      { name: "Anantara Hoi An Resort", stars: 5, address: "01 Phạm Hồng Thái, Cẩm Châu, TP. Hội An", pricePerNight: 4200000 },
      { name: "La Siesta Hoi An Resort & Spa", stars: 5, address: "132 Hùng Vương, Cẩm Phổ, TP. Hội An", pricePerNight: 2300000 },
      { name: "Silkotel Hoi An", stars: 4, address: "14 Hùng Vương, Cẩm Phổ, TP. Hội An", pricePerNight: 1200000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn", type: "breakfast", description: "Buffet sáng phong cách phố cổ", pricePerPerson: 0 },
      { serviceName: "Bánh mì Phượng Hội An", type: "breakfast", description: "Bánh mì pate thơm lừng sốt đặc biệt nổi tiếng thế giới", pricePerPerson: 40000 },
      { serviceName: "Cơm gà Bà Buội", type: "lunch", description: "Cơm gà xé vàng ươm nghệ tây, hành tây ngâm giòn và tương ớt Hội An", pricePerPerson: 75000 },
      { serviceName: "Nhà hàng Cao Lầu Thanh", type: "lunch", description: "Mì cao lầu sợi dai giòn, thịt xíu thơm lừng và tóp mỡ giòn rụm", pricePerPerson: 60000 },
      { serviceName: "Nhà hàng Bông Hồng Trắng", type: "dinner", description: "Bánh bao bánh vạc trứ danh Hội An và hoành thánh chiên giòn", pricePerPerson: 150000 },
      { serviceName: "Nhà hàng Morning Glory Phố Cổ", type: "dinner", description: "Ẩm thực truyền thống Hội An cao cấp trong không gian nhà Pháp cổ", pricePerPerson: 250000 },
    ],
  },
  {
    destination: "Phú Quốc",
    aliases: ["phú quốc", "phu quoc", "kiên giang", "kien giang", "nam đảo", "bắc đảo"],
    attractions: [
      "Grand World Phú Quốc (Thành phố không ngủ)",
      "VinWonders & Vinpearl Safari Phú Quốc",
      "Cáp treo Hòn Thơm (Dài nhất thế giới)",
      "Bãi Sao & Bãi Khem",
      "Sunset Sanato & Cổng trời ngắm hoàng hôn",
      "Thị trấn Hoàng Hôn (Sunset Town)",
      "Chợ đêm Phú Quốc",
      "Nhà thùng nước mắm truyền thống",
      "Vườn tiêu & Trang trại ngọc trai",
    ],
    hotels: [
      { name: "Vinpearl Resort & Spa Phú Quốc", stars: 5, address: "Khu Bãi Dài, Gành Dầu, TP. Phú Quốc", pricePerNight: 2800000 },
      { name: "JW Marriott Phu Quoc Emerald Bay Resort", stars: 5, address: "Bãi Khem, An Thới, TP. Phú Quốc", pricePerNight: 7500000 },
      { name: "Premier Residences Phu Quoc Emerald Bay", stars: 5, address: "Bãi Khem, An Thới, TP. Phú Quốc", pricePerNight: 2200000 },
      { name: "Novotel Phu Quoc Resort", stars: 5, address: "Khu du lịch Bãi Trường, Dương Tơ, Phú Quốc", pricePerNight: 2100000 },
      { name: "Mövenpick Resort Waverly Phu Quoc", stars: 5, address: "Bãi Ông Lang, Cửa Dương, TP. Phú Quốc", pricePerNight: 2400000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn / Resort", type: "breakfast", description: "Buffet sáng hải đảo phong cách 5 sao", pricePerPerson: 0 },
      { serviceName: "Bún quậy Kiến Xây", type: "breakfast", description: "Bún quậy chả tôm mực tươi quậy tại bàn, nước dùng ngọt thanh gia truyền", pricePerPerson: 65000 },
      { serviceName: "Nhà hàng Xin Chào Phú Quốc", type: "lunch", description: "Gỏi cá trích cuốn bánh tráng rau rừng, ghẹ Hàm Ninh hấp bia", pricePerPerson: 250000 },
      { serviceName: "Nhà hàng Ra Khơi Phú Quốc", type: "lunch", description: "Mực trứng nướng mọi, tôm mũ ni cháy tỏi, cơm chiên ghẹ", pricePerPerson: 280000 },
      { serviceName: "Tiệc hải sản Chợ Đêm Bạch Đằng", type: "dinner", description: "Nhum biển nướng mỡ hành trứng cút, sò điệp nướng phô mai, cá sòng nướng", pricePerPerson: 220000 },
      { serviceName: "Nhà hàng Cơm Niêu Bắc Bộ Phú Quốc", type: "dinner", description: "Cơm niêu nóng hổi, cá kho tộ nước mắm Phú Quốc, canh chua cá bớp", pricePerPerson: 180000 },
    ],
  },
  {
    destination: "Sapa",
    aliases: ["sapa", "sa pa", "lào cai", "lao cai", "fansipan"],
    attractions: [
      "Đỉnh Fansipan & Cáp treo Fansipan Legend",
      "Bản Cát Cát người H'Mông",
      "Đèo Ô Quy Hồ & Cổng trời Sapa",
      "Thung Lũng Mường Hoa & Ruộng bậc thang",
      "Nhà thờ đá Sapa & Quảng trường",
      "Núi Hàm Rồng & Vườn hoa trung tâm",
      "Thác Bạc & Thác Tình Yêu",
      "Bản Tả Phìn (Tắm lá thuốc người Dao Đỏ)",
    ],
    hotels: [
      { name: "Hotel de la Coupole - MGallery Sapa", stars: 5, address: "01 Hoàng Liên, TX. Sa Pa, Lào Cai", pricePerNight: 3600000 },
      { name: "Silk Path Grand Sapa Resort & Spa", stars: 5, address: "Đồi Quan Chuẩn, TX. Sa Pa, Lào Cai", pricePerNight: 2600000 },
      { name: "Pao's Sapa Leisure Hotel", stars: 5, address: "Đường Mường Hoa, TX. Sa Pa, Lào Cai", pricePerNight: 1900000 },
      { name: "Khách sạn Bamboo Sapa", stars: 4, address: "18 Mường Hoa, TX. Sa Pa, Lào Cai", pricePerNight: 1300000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn", type: "breakfast", description: "Buffet sáng tiêu chuẩn cao cấp ngắm thung lũng mây", pricePerPerson: 0 },
      { serviceName: "Phở gà đồi bản Bắc Hà", type: "breakfast", description: "Phở gà đồi nạc giòn ngọt nước, tương ớt Mường Khương cay thơm", pricePerPerson: 55000 },
      { serviceName: "Nhà hàng A Phủ Sapa", type: "lunch", description: "Đặc sản vùng cao: Thắng cố ngựa non, gà đen hầm thuốc bắc, rau cải mèo xào tỏi", pricePerPerson: 200000 },
      { serviceName: "Nhà hàng Cơm Lam Gà Nướng Đỗ Quyên", type: "lunch", description: "Cơm lam ống nứa chấm muối vừng, gà bản nướng than hoa", pricePerPerson: 180000 },
      { serviceName: "Nhà hàng Cá Hồi Vua Sapa", type: "dinner", description: "Lẩu cá hồi tươi Sapa kèm măng chua, gỏi cá hồi mù tạt, cá tầm nướng riềng mẻ", pricePerPerson: 260000 },
      { serviceName: "Khu phố đồ nướng Sapa", type: "dinner", description: "Thịt lợn cắp nách nướng xiên, bò cuốn nấm kim châm, hạt dẻ nướng thơm lừng", pricePerPerson: 160000 },
    ],
  },
  {
    destination: "Ninh Bình",
    aliases: ["ninh bình", "ninh binh", "tràng an", "tam cốc", "bái đính"],
    attractions: [
      "Quần thể danh thắng Tràng An (UNESCO)",
      "Chùa Bái Đính (Ngôi chùa kỷ lục)",
      "Hang Múa (Check-in đỉnh Ngoạ Long)",
      "Tam Cốc - Bích Động",
      "Cố đô Hoa Lư lịch sử",
      "Tuyệt Tịnh Cốc (Động Am Tiên)",
      "Đầm Vân Long (Khu bảo tồn đất ngập nước)",
      "Vườn quốc gia Cúc Phương",
    ],
    hotels: [
      { name: "Emeralda Resort Ninh Binh", stars: 5, address: "Làng Tập Ninh, Xã Gia Vân, Gia Viễn, Ninh Bình", pricePerNight: 2300000 },
      { name: "Ninh Binh Hidden Charm Hotel & Resort", stars: 4, address: "Khu du lịch Tam Cốc, Hoa Lư, Ninh Bình", pricePerNight: 1500000 },
      { name: "Khách sạn The Reed Ninh Bình", stars: 4, address: "Đinh Điền, Phường Đông Thành, TP. Ninh Bình", pricePerNight: 1250000 },
    ],
    restaurants: [
      { serviceName: "Buffet sáng Khách sạn", type: "breakfast", description: "Buffet sáng đồng quê phong phú", pricePerPerson: 0 },
      { serviceName: "Bún mọc Tố Như Kim Sơn", type: "breakfast", description: "Bún mọc thịt tươi ngọt thanh, mọc giòn sần sật ăn kèm rau thơm", pricePerPerson: 45000 },
      { serviceName: "Nhà hàng Dê Núi Chính Thư", type: "lunch", description: "Dê núi tái chanh, dê nướng tảng ngũ vị, cơm cháy sốt dê đậm đà", pricePerPerson: 220000 },
      { serviceName: "Nhà hàng Thăng Long Tràng An", type: "lunch", description: "Thịt dê xào lăn, nem dê chua ngọt, cơm cháy chà bông giòn tan", pricePerPerson: 200000 },
      { serviceName: "Nhà hàng Dê Núi Ba Cửa", type: "dinner", description: "Lẩu ngọc dương dê bổ dưỡng, sườn dê nướng mọi, canh đắng lòng dê", pricePerPerson: 250000 },
      { serviceName: "Nhà hàng Đồng Quê Hoa Lư", type: "dinner", description: "Cá rô Tổng Trường chiên xù, ốc núi xào sả ớt, canh cua đồng bông lau", pricePerPerson: 180000 },
    ],
  },
  {
    destination: "Hà Giang",
    aliases: ["hà giang", "ha giang", "đồng văn", "mèo vạc", "mã pí lèng"],
    attractions: [
      "Đèo Mã Pí Lèng & Đi thuyền sông Nho Quế",
      "Cột cờ Lũng Cú (Điểm cực Bắc Tổ quốc)",
      "Cao nguyên đá Đồng Văn (Công viên địa chất)",
      "Dinh thự Vua Mèo (Vương Chính Đức)",
      "Phố cổ Đồng Văn",
      "Dốc Thẩm Mã ngoạn mục",
      "Thung lũng Sủng Là & Nhà của Pao",
      "Cánh đồng hoa Tam Giác Mạch",
    ],
    hotels: [
      { name: "P'apiu Resort Hà Giang", stars: 5, address: "Yên Định, Bắc Mê, Hà Giang", pricePerNight: 8000000 },
      { name: "Khách sạn Hoa Cương Đồng Văn", stars: 3, address: "Thị trấn Đồng Văn, Hà Giang", pricePerNight: 850000 },
      { name: "H'Mong Village Resort", stars: 4, address: "Khu Tráng Kìm, Cán Tỷ, Quản Bạ, Hà Giang", pricePerNight: 1600000 },
    ],
    restaurants: [
      { serviceName: "Bữa sáng tại khách sạn / Homestay", type: "breakfast", description: "Bánh cuốn trứng lòng đào nước xương nóng hổi chấm giò thơm", pricePerPerson: 45000 },
      { serviceName: "Nhà hàng Tiến Nhị Đồng Văn", type: "lunch", description: "Thịt lợn đen xào măng ớt, gà đồi hấp lá chanh, lạp xưởng gác bếp", pricePerPerson: 160000 },
      { serviceName: "Nhà hàng Phố Cổ Đồng Văn", type: "dinner", description: "Lẩu gà đen nấm rừng, rau dớn xào tỏi, rượu ngô men lá Tây Côn Lĩnh", pricePerPerson: 200000 },
    ],
  },
  {
    destination: "Cần Thơ / Miền Tây",
    aliases: ["cần thơ", "can tho", "miền tây", "mien tay", "bến tre", "an giang", "châu đốc"],
    attractions: [
      "Chợ nổi Cái Răng tấp nập buổi sớm",
      "Bến Ninh Kiều & Cầu Tình Yêu",
      "Nhà cổ Bình Thủy",
      "Khu du lịch sinh thái Cồn Sơn",
      "Vườn cò Bằng Lăng",
      "Làng du lịch Mỹ Khánh",
      "Chùa Ông linh thiêng",
      "Rừng tràm Trà Sư (An Giang)",
    ],
    hotels: [
      { name: "Victoria Can Tho Resort", stars: 4, address: "Cái Khế, Ninh Kiều, TP. Cần Thơ", pricePerNight: 2100000 },
      { name: "Vinpearl Hotel Cần Thơ", stars: 5, address: "209 Đường 30/4, Xuân Khánh, Ninh Kiều", pricePerNight: 1650000 },
      { name: "Muong Thanh Luxury Can Tho", stars: 5, address: "Khu Cồn Cái Khế, Cái Khế, Ninh Kiều", pricePerNight: 1350000 },
    ],
    restaurants: [
      { serviceName: "Bữa sáng Chợ Nổi Cái Răng", type: "breakfast", description: "Hủ tiếu ghe bồng bềnh sông nước, bún mắm miền Tây thơm lừng", pricePerPerson: 50000 },
      { serviceName: "Nhà hàng Ẩm Thực Sông Quê", type: "lunch", description: "Cá lóc nướng trui cuốn bánh tráng, canh chua cá linh bông điên điển", pricePerPerson: 180000 },
      { serviceName: "Nhà hàng Dạ Tiệc Du Thuyền Cần Thơ", type: "dinner", description: "Lẩu mắm miền Tây sông nước đầy ắp cá đồng tôm sú và hơn 20 loại rau vườn", pricePerPerson: 240000 },
    ],
  },
];

// Fallback chung cho các điểm đến khác trên toàn quốc
export const DEFAULT_PRESET: DestinationPreset = {
  destination: "Việt Nam",
  aliases: [],
  attractions: [
    "Khu di tích lịch sử trung tâm",
    "Quảng trường văn hóa thành phố",
    "Chợ truyền thống địa phương",
    "Bảo tàng văn hóa & nghệ thuật",
    "Khu du lịch sinh thái tự nhiên",
    "Làng nghề thủ công truyền thống",
    "Điểm ngắm cảnh thiên nhiên / hoàng hôn",
    "Phố đi bộ & Ẩm thực đêm",
  ],
  hotels: [
    { name: "Khách sạn Mường Thanh Grand", stars: 4, address: "Trung tâm thành phố", pricePerNight: 1200000 },
    { name: "Vinpearl Hotel & Resort", stars: 5, address: "Khu nghỉ dưỡng cao cấp", pricePerNight: 2500000 },
    { name: "Khách sạn Sài Gòn Tourist", stars: 3, address: "Đại lộ trung tâm", pricePerNight: 850000 },
  ],
  restaurants: [
    { serviceName: "Buffet sáng tiêu chuẩn Khách sạn", type: "breakfast", description: "Buffet sáng đầy đủ món nóng, bánh mì và nước ép hoa quả", pricePerPerson: 0 },
    { serviceName: "Nhà hàng Đặc sản Địa phương", type: "lunch", description: "Cơm phần truyền thống, món kho tộ, rau xào tỏi và canh chua", pricePerPerson: 150000 },
    { serviceName: "Nhà hàng Ẩm thực Bản địa", type: "dinner", description: "Lẩu đặc sản vùng miền, hải sản hoặc thịt tươi nướng, món tráng miệng", pricePerPerson: 220000 },
  ],
};

// Chuẩn hóa chuỗi tiếng Việt không dấu, chữ thường
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

/**
 * Tìm kiếm danh mục gợi ý theo tên Điểm đến (Destination Name)
 * Tự động so khớp gần đúng, không phân biệt hoa thường hay dấu tiếng Việt
 */
export function getSuggestionsByDestination(destinationName?: string): DestinationPreset {
  if (!destinationName || destinationName.trim().length === 0) {
    return DESTINATION_CATALOG[0]; // Mặc định Đà Lạt nếu chưa nhập
  }

  const normalized = normalizeString(destinationName);

  // 1. So khớp với alias
  for (const preset of DESTINATION_CATALOG) {
    for (const alias of preset.aliases) {
      const normAlias = normalizeString(alias);
      if (normalized.includes(normAlias) || normAlias.includes(normalized)) {
        return preset;
      }
    }
  }

  // 2. So khớp trực tiếp tên
  for (const preset of DESTINATION_CATALOG) {
    const normDest = normalizeString(preset.destination);
    if (normalized.includes(normDest) || normDest.includes(normalized)) {
      return preset;
    }
  }

  return DEFAULT_PRESET;
}
