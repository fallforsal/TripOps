"""Build the researched reference manifest. No database writes; prices and identities are synthetic.
Usage: python -X utf8 backend/scripts/prepare-regional-demo.py
Requires requests and beautifulsoup4. Source URLs are retained; no web reviews or personal data are copied.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import re
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

OUT = Path(__file__).resolve().parent / "data" / "regional-demo-2026.json"
MT = "https://booking.muongthanh.com/khach-san-muong-thanh-"
# Current provincial boundaries, not the former 63-province allocation.
ROWS = [
    ("THANH_HOA", "38", "Thanh Hóa", "thanh-hoa", "Thanh Hóa", ["Sầm Sơn", "Đền Độc Cước", "Hòn Trống Mái", "Thành nhà Hồ", "Khu di tích Lam Kinh", "Bảo tàng Thanh Hóa"],
     ("Mường Thanh Grand Thanh Hóa", MT+"grand-thanh-hoa", 4), ("FLC Luxury Hotel Sầm Sơn", "https://flchotelsresorts.com/flc-sam-son/", 5)),
    ("NGHE_AN", "40", "Nghệ An", "nghe-an", "Cửa Lò", ["Biển Cửa Lò", "Khu di tích Kim Liên", "Quảng trường Hồ Chí Minh", "Đền Ông Hoàng Mười", "Đảo Lan Châu", "Bảo tàng Xô Viết Nghệ Tĩnh"],
     ("Mường Thanh Grand Cửa Lò", MT+"grand-cua-lo", 4), ("Mường Thanh Luxury Sông Lam", MT+"luxury-song-lam", 5)),
    ("HA_TINH", "42", "Hà Tĩnh", "ha-tinh", "Thiên Cầm", ["Biển Thiên Cầm", "Chùa Cầm Sơn", "Hồ Kẻ Gỗ", "Ngã ba Đồng Lộc", "Khu lưu niệm Nguyễn Du", "Biển Xuân Thành"],
     ("Khách sạn Thiên Ý", "https://khachsanthieny.com/", 3), ("Mường Thanh Luxury Xuân Thành", MT+"luxury-xuan-thanh", 5)),
    ("QUANG_TRI", "44", "Quảng Trị", "quang-tri", "Đồng Hới", ["Động Phong Nha", "Động Thiên Đường", "Biển Nhật Lệ", "Cầu Hiền Lương", "Địa đạo Vịnh Mốc", "Thành cổ Quảng Trị"],
     ("Mường Thanh Luxury Nhật Lệ", MT+"luxury-nhat-le", 5), ("Mường Thanh Grand Quảng Trị", MT+"grand-quang-tri", 4)),
    ("HUE", "46", "TP. Huế", "hue", "Huế", ["Đại Nội Huế", "Chùa Thiên Mụ", "Sông Hương", "Lăng Minh Mạng", "Lăng Khải Định", "Làng hương Thủy Xuân"],
     ("Mường Thanh Holiday Huế", MT+"holiday-hue", 4), ("Silk Path Grand Hue Hotel", "https://silkpathhotel.com/hue/", 5)),
    ("DA_NANG", "48", "TP. Đà Nẵng", "da-nang", "Đà Nẵng", ["Ngũ Hành Sơn", "Bán đảo Sơn Trà", "Biển Mỹ Khê", "Phố cổ Hội An", "Làng gốm Thanh Hà", "Rừng dừa Bảy Mẫu"],
     ("Mường Thanh Luxury Đà Nẵng", MT+"luxury-da-nang", 5), ("Mường Thanh Holiday Hội An", MT+"holiday-hoi-an", 4)),
    ("QUANG_NGAI", "51", "Quảng Ngãi", "quang-ngai", "Lý Sơn", ["Cổng Tò Vò", "Núi Thới Lới", "Chùa Hang Lý Sơn", "Nhà thờ gỗ Kon Tum", "Cầu treo Kon Klor", "Hồ Đăk Ke"],
     ("Mường Thanh Holiday Lý Sơn", MT+"holiday-ly-son", 4), ("Khách sạn Indochine Kon Tum", "https://indochinehotel.vn/", 3)),
    ("GIA_LAI", "52", "Gia Lai", "gia-lai", "Quy Nhơn", ["Kỳ Co", "Eo Gió", "Tháp Đôi Quy Nhơn", "Biển Hồ T'Nưng", "Chùa Minh Thành", "Quảng trường Đại Đoàn Kết"],
     ("Mường Thanh Quy Nhơn", MT+"quy-nhon", 4), ("Mường Thanh Grand Gia Lai", MT+"grand-gia-lai", 4)),
    ("DAK_LAK", "66", "Đắk Lắk", "dak-lak", "Buôn Ma Thuột", ["Bảo tàng Thế giới Cà phê", "Buôn Ako Dhong", "Bảo tàng Đắk Lắk", "Gành Đá Đĩa", "Tháp Nhạn", "Bãi Xép Phú Yên"],
     ("Mường Thanh Luxury Buôn Ma Thuột", MT+"luxury-buon-ma-thuot", 5), ("Sala TuyHoa Beach Hotel", "https://salahotelgroup.com/en/salatuyhoabeachhotel/", 4)),
    ("KHANH_HOA", "56", "Khánh Hòa", "khanh-hoa", "Nha Trang", ["Tháp Bà Ponagar", "Hòn Chồng", "Viện Hải dương học", "Vịnh Vĩnh Hy", "Tháp Po Klong Garai", "Làng gốm Bàu Trúc"],
     ("Mường Thanh Luxury Nha Trang", MT+"luxury-nha-trang", 5), ("Sài Gòn Ninh Chữ Hotel", "https://saigonninhchuhotel.com.vn/", 4)),
    ("LAM_DONG", "68", "Lâm Đồng", "lam-dong", "Đà Lạt", ["Hồ Xuân Hương", "Ga Đà Lạt", "Thác Datanla", "Đồi cát Mũi Né", "Làng chài Mũi Né", "Suối Tiên Mũi Né"],
     ("Mường Thanh Holiday Đà Lạt", MT+"holiday-da-lat", 4), ("Mường Thanh Holiday Mũi Né", MT+"holiday-mui-ne", 4)),
    ("DONG_NAI", "75", "TP. Đồng Nai", "dong-nai", "Biên Hòa", ["Văn miếu Trấn Biên", "Khu du lịch Bửu Long", "Bảo tàng Đồng Nai", "Vườn quốc gia Cát Tiên", "Tà Lài", "Bàu Sấu"],
     ("The Mira Central Park Hotel", "https://themiracentralpark.com.vn/foods-and-beverages/", 5), ("Orchard Home Nam Cát Tiên", "https://orchardresort.vn/", 4)),
    ("TP_HCM", "79", "TP. Hồ Chí Minh", "ho-chi-minh-city", "TP. Hồ Chí Minh", ["Dinh Độc Lập", "Bưu điện Trung tâm Sài Gòn", "Bảo tàng Chứng tích Chiến tranh", "Bãi Sau Vũng Tàu", "Hải đăng Vũng Tàu", "Bảo tàng Bà Rịa - Vũng Tàu"],
     ("Mường Thanh Grand Sài Gòn Centre", MT+"grand-sai-gon-centre", 4), ("Mường Thanh Holiday Vũng Tàu", MT+"holiday-vung-tau", 4)),
    ("TAY_NINH", "80", "Tây Ninh", "tay-ninh", "Tây Ninh", ["Núi Bà Đen", "Tòa thánh Cao Đài Tây Ninh", "Hồ Dầu Tiếng", "Làng nổi Tân Lập", "Nhà Trăm Cột", "Làng cổ Phước Lộc Thọ"],
     ("Meliá Vinpearl Tây Ninh", "https://www.melia.com/en/hotels/vietnam/tay-ninh/melia-vinpearl-tay-ninh", 5), ("Sunrise Hotel Tây Ninh", "https://sunrisehotel.com.vn/en/", 4)),
    ("DONG_THAP", "82", "Đồng Tháp", "dong-thap", "Cao Lãnh", ["Làng hoa Sa Đéc", "Nhà cổ Huỳnh Thủy Lê", "Khu di tích Nguyễn Sinh Sắc", "Chùa Vĩnh Tràng", "Cù lao Thới Sơn", "Trại rắn Đồng Tâm"],
     ("Khách sạn Sao Mai Cao Lãnh", "https://dulich.dongthap.gov.vn/iv/khachsansaomai", 3), ("Khách sạn Sông Tiền", "https://dulich.dongthap.gov.vn/vi/songtienhotel", 2)),
    ("VINH_LONG", "86", "Vĩnh Long", "vinh-long", "Bến Tre", ["Cồn Phụng", "Làng nghề kẹo dừa Bến Tre", "Chùa Vạn Phước", "Văn Thánh Miếu Vĩnh Long", "Cù lao An Bình", "Làng gốm Mang Thít"],
     ("Ben Tre Riverside Resort", "https://bentreriverside.com/", 4), ("Khách sạn Cửu Long", "https://vinhlongtourist.vn/vi/khachsancuulong", 3)),
    ("CAN_THO", "92", "TP. Cần Thơ", "can-tho", "Cần Thơ", ["Chợ nổi Cái Răng", "Nhà cổ Bình Thủy", "Bến Ninh Kiều", "Chùa Dơi", "Chùa Som Rong", "Chùa Đất Sét"],
     ("Mường Thanh Luxury Cần Thơ", MT+"luxury-can-tho", 5), ("Victoria Can Tho Resort", "https://www.victoriahotels.asia/en/victoria-can-tho-resort/", 4)),
    ("AN_GIANG", "91", "An Giang", "an-giang", "Phú Quốc", ["Dinh Cậu Phú Quốc", "Bãi Sao", "Nhà tù Phú Quốc", "Miếu Bà Chúa Xứ Núi Sam", "Rừng tràm Trà Sư", "Làng Chăm Châu Giang"],
     ("Mường Thanh Luxury Phú Quốc", MT+"luxury-phu-quoc", 5), ("Victoria Núi Sam Lodge", "https://www.victoriahotels.asia/en/victoria-nui-sam-lodge/", 3)),
    ("CA_MAU", "96", "Cà Mau", "ca-mau", "Cà Mau", ["Vườn quốc gia Mũi Cà Mau", "Cột mốc tọa độ quốc gia Đất Mũi", "Đầm Thị Tường", "Nhà Công tử Bạc Liêu", "Chùa Xiêm Cán", "Khu lưu niệm Cao Văn Lầu"],
     ("Mường Thanh Luxury Cà Mau", MT+"luxury-ca-mau", 5), ("Khách sạn Sài Gòn Bạc Liêu", "https://saigonbaclieuhotel.com/", 3)),
]

def page(url):
    try:
        response = requests.get(url, timeout=18, headers={"User-Agent": "TripOps-demo-reference/1.0"})
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        title = soup.title.get_text(" ", strip=True) if soup.title else ""
        image = soup.find("meta", property="og:image")
        headers = [n.get_text(" ", strip=True) for n in soup.select("h2,h3,h4,h5")]
        restaurants = list(dict.fromkeys(h for h in headers if h.startswith("Nhà hàng ") and "&" not in h and "Cẩm lệ" not in h))[:2]
        # Only facts and image references are retained, never copied marketing paragraphs or reviews.
        return {"url": url, "title": title, "checkedAt": "2026-11-15", "httpStatus": response.status_code,
                "image": urljoin(response.url, image.get("content", "")) if image else None,
                "restaurants": restaurants}
    except Exception as error:
        # These official pages were independently verified using web search; their origins block this HTTP client.
        verified = {
            "https://themiracentralpark.com.vn/foods-and-beverages/": ("Foods & Beverages - The Mira Central Park Hotel", ["Park Avenue Restaurant", "SeaShell Restaurant"]),
            "https://orchardresort.vn/": ("Trang chủ - Orchard Resort Nam Cát Tiên", []),
            "https://www.melia.com/en/hotels/vietnam/tay-ninh/melia-vinpearl-tay-ninh": ("Meliá Vinpearl Tay Ninh | Melia.com", ["Garbo 986"]),
        }
        if url in verified:
            title, restaurants = verified[url]
            return {"url": url, "checkedAt": "2026-11-15", "title": title, "restaurants": restaurants,
                    "verification": "Independent web-search verification", "metadataFetchError": type(error).__name__}
        return {"url": url, "checkedAt": "2026-11-15", "error": type(error).__name__}

def prepare(row):
    code, admin_code, name, slug, hub, points, h1, h2 = row
    source = page(f"https://govietnam.travel/province/{slug}/")
    hotels = []
    for hotel, url, stars in [h1, h2]:
        evidence = page(url)
        hotels.append({"name": hotel, "stars": stars, "source": evidence,
                       "address": f"{hotel}, {name}; xem địa chỉ chi tiết tại website nguồn"})
    return {"code": code, "administrativeCode": admin_code, "name": name, "hub": hub,
            "source": source, "points": points, "hotels": hotels,
            "basePrice": 1650000 + (list(ROWS).index(row) % 6) * 250000}

if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=8) as pool:
        provinces = list(pool.map(prepare, ROWS))
    data = {"dataset": "REGIONAL-DEMO-2026", "asOf": "2026-11-15", "synthetic": True,
            "boundarySource": "https://congbao.chinhphu.vn/tai-ve-van-ban-so-202-2025-qh15-45050-56708?format=pdf",
            "administrativeUpdateSource": "https://chinhphu.vn/?classid=1&docid=218009&pageid=27160",
            "notice": "Tài khoản, lịch trình, giá, sức chứa, booking, thanh toán và đánh giá là giả lập. Tên địa điểm/cơ sở tham khảo nguồn công khai. Không có hợp đồng hay giao dịch thực với các cơ sở.",
            "provinces": provinces}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    for p in provinces:
        print(p["code"], p["source"].get("httpStatus", "source error"), [(h["name"], h["source"].get("httpStatus", "error")) for h in p["hotels"]])
    print("Written", OUT)
