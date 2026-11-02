import type { Tour } from "@/app/types";

const imageBase = `${import.meta.env.BASE_URL}images/destinations/`;

export const heroImage = `${imageBase}ninh-binh.webp`;

export const homeDestinations = [
  {
    name: "Ninh Bình",
    image: `${imageBase}ninh-binh.webp`,
    description: "Tràng An, Tam Cốc & Hang Múa",
    region: "Miền Bắc",
  },
  {
    name: "Sapa",
    image: `${imageBase}sapa.webp`,
    description: "Ruộng bậc thang & Đỉnh Fansipan",
    region: "Tây Bắc",
  },
  {
    name: "Đà Nẵng",
    image: `${imageBase}da-nang.webp`,
    description: "Cầu Rồng, Bà Nà Hills & Phố cổ Hội An",
    region: "Miền Trung",
  },
  {
    name: "Nha Trang",
    image: `${imageBase}nha-trang.webp`,
    description: "Vịnh biển ngọc & Lặn ngắm san hô",
    region: "Nam Trung Bộ",
  },
  {
    name: "Đà Lạt",
    image: `${imageBase}da-lat.webp`,
    description: "Thành phố ngàn hoa & Rừng thông",
    region: "Tây Nguyên",
  },
  {
    name: "Phú Quốc",
    image: `${imageBase}phu-quoc.webp`,
    description: "Bãi Sao, lặn biển & Hoàng hôn đảo ngọc",
    region: "Biển đảo",
  },
];

const destinationImages: Record<string, string> = {
  "Ninh Bình": heroImage,
  "Nha Trang": `${imageBase}nha-trang.webp`,
  ...Object.fromEntries(homeDestinations.map((d) => [d.name, d.image])),
};

// Replace only the unrelated stock placeholders in the demo, never an Agency's own photo.
export function homeTourImage(tour: Tour) {
  const placeholder =
    /photo-(1583417319070-4a69db38a482|1559827260-dc66d52bef19)/.test(
      tour.image || "",
    );
  return (
    ((!tour.image || placeholder) && destinationImages[tour.destination]) ||
    tour.image ||
    heroImage
  );
}
