import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Service } from "@/app/types";
import {
  Search,
  Filter,
  MapPin,
  Star,
  Hotel,
  Utensils,
  Car,
  Compass,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Phone,
  Info,
  ArrowLeft,
  ChevronRight,
  Map as MapIcon,
  Grid,
  Columns,
  Image as ImageIcon,
  FileText,
  Building2,
  MessageCircle,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

interface AgencyServicesExplorerProps {
  services: Service[];
  companyName?: string;
}

// Category metadata helper
const getCategoryMeta = (category: Service["category"]) => {
  switch (category) {
    case "hotel":
      return {
        label: "Lưu trú & Khách sạn",
        shortLabel: "Khách sạn",
        icon: Hotel,
        color: "bg-[#F0F9FF] text-[#075985] border-[#CBD5E1]",
        pinBg: "#2563eb",
        pinBorder: "#1d4ed8",
        unit: "/ phòng",
        capacityLabel: "Tổng số phòng",
        capacityUnit: "phòng",
      };
    case "fnb":
    case "restaurant":
      return {
        label: "Ẩm thực & Nhà hàng",
        shortLabel: "Nhà hàng",
        icon: Utensils,
        color: "bg-orange-50 text-orange-700 border-orange-200",
        pinBg: "#ea580c",
        pinBorder: "#c2410c",
        unit: "/ người",
        capacityLabel: "Sức chứa phục vụ",
        capacityUnit: "khách",
      };
    case "transportation":
      return {
        label: "Phương tiện & Vận chuyển",
        shortLabel: "Vận chuyển",
        icon: Car,
        color: "bg-cyan-50 text-cyan-700 border-cyan-200",
        pinBg: "#0891b2",
        pinBorder: "#0e7490",
        unit: "/ người",
        capacityLabel: "Số chỗ ngồi",
        capacityUnit: "ghế",
      };
    case "attraction":
    case "activity":
    default:
      return {
        label: "Điểm tham quan & Hoạt động",
        shortLabel: "Tham quan",
        icon: Compass,
        color: "bg-teal-50 text-teal-700 border-teal-200",
        pinBg: "#059669",
        pinBorder: "#047857",
        unit: "/ người",
        capacityLabel: "Sức chứa tối đa / lượt",
        capacityUnit: "khách",
      };
  }
};

const getCategoryIconSvg = (cat: Service["category"], size = 12) => {
  if (cat === "hotel") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57a2 2 0 0 1 1.07-1.78l6-3.43a2 2 0 0 1 2.93 1.78V22"></path><path d="M18 10V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v18h8"></path><path d="M6 6h4"></path><path d="M6 10h4"></path><path d="M6 14h4"></path><path d="M6 18h4"></path></svg>`;
  }
  if (cat === "fnb" || cat === "restaurant") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 2v19"></path><path d="M5 2v5a4 4 0 0 0 8 0V2"></path></svg>`;
  }
  if (cat === "transportation") {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><path d="M9 17h6"></path><circle cx="17" cy="17" r="2"></circle></svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`;
};

export const formatCompactVND = (num?: number | null): string => {
  if (num === undefined || num === null || isNaN(num) || num <= 0) return "";
  if (num >= 1000000) {
    const val = num / 1000000;
    const formatted = parseFloat(val.toFixed(2)).toString().replace(".", ",");
    return `${formatted}tr`;
  }
  if (num >= 1000) {
    const val = Math.round(num / 1000);
    return `${val}k`;
  }
  return `${num}đ`;
};

export const formatMapPrice = (service: Service): string => {
  if (service.priceFrom && service.priceTo) {
    if (service.priceFrom === service.priceTo) {
      return formatCompactVND(service.priceFrom);
    }
    return `${formatCompactVND(service.priceFrom)} - ${formatCompactVND(service.priceTo)}`;
  }
  if (service.priceFrom) {
    return `Từ ${formatCompactVND(service.priceFrom)}`;
  }
  if (service.price) {
    return formatCompactVND(service.price);
  }
  if (service.pricePerPerson) {
    return `${formatCompactVND(service.pricePerPerson)}/người`;
  }
  return "Liên hệ";
};

const formatPriceSummary = (service: Service) => {
  if (service.priceFrom && service.priceTo) {
    return `${service.priceFrom.toLocaleString("vi-VN")}đ - ${service.priceTo.toLocaleString("vi-VN")}đ`;
  }
  if (service.price) {
    return `${service.price.toLocaleString("vi-VN")}đ`;
  }
  if (service.pricePerPerson) {
    return `${service.pricePerPerson.toLocaleString("vi-VN")}đ`;
  }
  return "Liên hệ báo giá";
};

const formatAddress = (service: Service) => {
  const parts = [service.street, service.ward, service.province].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return service.location || "Việt Nam";
};

const provinceCoordinates: Record<string, [number, number, number]> = {
  "Lâm Đồng": [11.9404, 108.4583, 12],
  "Kiên Giang": [10.2222, 103.9654, 11],
  "Khánh Hòa": [12.2472, 109.1963, 13],
  "Hà Giang": [23.1000, 105.2000, 10],
  "Lào Cai": [22.3364, 103.8438, 12],
  "Đà Nẵng": [16.0544, 108.2022, 12],
  "Ninh Bình": [20.2580, 105.9180, 12],
  "Hồ Chí Minh": [10.7769, 106.7009, 12],
  "Hà Nội": [21.0285, 105.8542, 12],
};

// =========================================================================
// SUB-COMPONENT: SERVICE DETAIL OPENSTREETMAP MINI-MAP
// Replaces broken iframe with a clean, fully-isolated Leaflet map
// =========================================================================
function ServiceDetailOsmMap({
  latitude,
  longitude,
  serviceName,
  category,
  priceText,
}: {
  latitude?: number;
  longitude?: number;
  serviceName: string;
  category: Service["category"];
  priceText?: string;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const lat = latitude || 11.9404;
  const lng = longitude || 108.4583;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet instance directly inside container
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: true,
    });

    // Use Google Maps roadmap tiles (100% reliable, zero DNS issues in Vietnam)
    L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    const meta = getCategoryMeta(category);
    const pinHtml = `
      <div class="osm-price-pin-wrapper group select-none" style="transform: translate(-50%, -100%); cursor: pointer;">
        <div class="relative flex flex-col items-center">
          <div style="border-color: ${meta.pinBorder};" 
               class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-gray-900 shadow-md border-2 ring-2 ring-black/5">
            <div style="background-color: ${meta.pinBg};" 
                 class="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-2xs">
              ${getCategoryIconSvg(category, 12)}
            </div>
            <span class="text-xs font-extrabold text-gray-900 whitespace-nowrap">
              ${priceText || serviceName}
            </span>
          </div>
          <div style="border-color: ${meta.pinBorder};" class="w-2.5 h-2.5 rotate-45 -mt-1 shadow-xs border-r-2 border-b-2 bg-white"></div>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: pinHtml,
      className: "osm-price-marker",
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -36],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(map);
    marker.bindPopup(`<div class="p-1 font-sans text-xs"><strong class="font-bold text-gray-900">${serviceName}</strong>${priceText ? `<div class="mt-1 font-extrabold text-[#075985]">${priceText}</div>` : ""}</div>`).openPopup();

    mapInstanceRef.current = map;

    // Invalidate size to ensure tiles render immediately
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, serviceName, category, priceText]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-44 rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100 relative z-0"
    />
  );
}

// =========================================================================
// SUB-COMPONENT: EXPLORER OPENSTREETMAP MULTI-PIN MAP
// Completely isolated lifecycle to prevent orphaned controls/pins
// Supports fast Google Maps & CartoDB tiles with Layer Switcher
// =========================================================================
function ExplorerOsmMap({
  services,
  selectedProvince,
  onSelectService,
  height = "520px",
}: {
  services: Service[];
  selectedProvince: string;
  onSelectService: (service: Service) => void;
  height?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const [mapType, setMapType] = useState<"google" | "satellite" | "osm">("google");

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: [14.0583, 108.2772],
      zoom: 6,
      scrollWheelZoom: true,
    });

    // Default layer: Google Maps roadmap (100% reliable, zero DNS issues in Vietnam)
    const baseLayer = L.tileLayer(
      "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      }
    ).addTo(map);

    tileLayerRef.current = baseLayer;

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
      markersGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Handle map type switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let newTileLayer: L.TileLayer;
    if (mapType === "google") {
      newTileLayer = L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 20,
          attribution: '&copy; Google Maps',
        }
      );
    } else if (mapType === "satellite") {
      newTileLayer = L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 20,
          attribution: '&copy; Google Maps Vệ tinh',
        }
      );
    } else {
      // CartoDB Voyager (OpenStreetMap data on Cloudflare high-speed CDN, unblocked in Vietnam)
      newTileLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; CARTO',
        }
      );
    }

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [mapType]);

  // Update markers and bounds when services or selected province changes
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const bounds: L.LatLngTuple[] = [];
    const seenCoordinates = new Map<string, number>();

    services.forEach((service) => {
      let lat = service.latitude || 11.9404;
      let lng = service.longitude || 108.4583;

      // Handle duplicate coordinates so pins don't overlap completely
      const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const count = seenCoordinates.get(coordKey) || 0;
      seenCoordinates.set(coordKey, count + 1);
      if (count > 0) {
        lat += count * 0.0008;
        lng += count * 0.0008;
      }

      bounds.push([lat, lng]);

      const meta = getCategoryMeta(service.category);
      const iconSvg = getCategoryIconSvg(service.category, 12);
      const mapPrice = formatMapPrice(service);

      const customPinHtml = `
        <div class="osm-price-pin-wrapper group select-none" 
             title="${service.name} (${formatPriceSummary(service)})"
             style="transform: translate(-50%, -100%); cursor: pointer;">
          <div class="relative flex flex-col items-center">
            <div style="border-color: ${meta.pinBorder};" 
                 class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-gray-900 shadow-md border-2 group-hover:border-[#075985] group-hover:shadow-xl transition-all duration-150 ring-2 ring-black/5">
              <div style="background-color: ${meta.pinBg};" 
                   class="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-2xs">
                ${iconSvg}
              </div>
              <span class="text-[12px] font-extrabold tracking-tight text-gray-900 group-hover:text-[#075985] whitespace-nowrap">
                ${mapPrice}
              </span>
            </div>
            <div style="border-color: ${meta.pinBorder};" 
                 class="w-2.5 h-2.5 bg-white border-r-2 border-b-2 rotate-45 -mt-1 shadow-xs group-hover:border-[#075985] transition-colors"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customPinHtml,
        className: "osm-price-marker",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -36],
      });

      const popupContent = document.createElement("div");
      popupContent.className = "w-64 p-0 font-sans text-gray-800 text-xs";
      popupContent.innerHTML = `
        <div class="relative h-28 w-full rounded-t-xl overflow-hidden bg-gray-100">
          <img src="${service.image}" alt="${service.name}" class="w-full h-full object-cover" />
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-xs" style="background-color: ${meta.pinBg}">
            ${meta.shortLabel}
          </span>
          <span class="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[11px] font-semibold">
            ★ ${service.rating || "4.8"}
          </span>
        </div>
        <div class="p-3 space-y-2">
          <h4 class="font-bold text-gray-900 text-sm leading-snug line-clamp-2">${service.name}</h4>
          <p class="text-[11px] text-gray-500 flex items-center gap-1 line-clamp-1">
            📍 ${formatAddress(service)}
          </p>
          <div class="pt-1 border-t border-gray-100 flex items-baseline justify-between">
            <span class="text-[10px] text-gray-500">Giá tham khảo:</span>
            <span class="font-bold text-[#075985] text-xs">${formatPriceSummary(service)} ${meta.unit}</span>
          </div>
          <div class="pt-2 flex gap-1.5">
            <button id="view-detail-btn-${service.id}" 
              class="w-full py-1.5 px-2 bg-[#075985] hover:bg-[#F97316] text-white rounded-lg font-semibold text-center text-xs transition-colors flex items-center justify-center gap-1 shadow-xs">
              Xem bài đăng chi tiết →
            </button>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon });
      marker.bindPopup(popupContent, { maxWidth: 280, className: "osm-service-popup" });

      marker.on("mouseover", () => {
        marker.setZIndexOffset(1000);
      });
      marker.on("mouseout", () => {
        marker.setZIndexOffset(0);
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`view-detail-btn-${service.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectService(service);
          };
        }
      });

      markersGroup.addLayer(marker);
    });

    if (bounds.length > 0 && selectedProvince === "all") {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (selectedProvince !== "all" && provinceCoordinates[selectedProvince]) {
      const [pLat, pLng, pZoom] = provinceCoordinates[selectedProvince];
      map.flyTo([pLat, pLng], pZoom, { duration: 1.0 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [services, selectedProvince, onSelectService]);

  return (
    <div className="relative w-full" style={{ height }}>
      {/* Scoped CSS for custom Leaflet price markers and popups */}
      <style>{`
        .osm-price-marker {
          background: transparent !important;
          border: none !important;
        }
        .osm-service-popup .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 1rem !important;
          overflow: hidden !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        }
        .osm-service-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: normal !important;
        }
        .osm-service-popup .leaflet-popup-tip {
          background: white !important;
        }
        .osm-price-pin-wrapper {
          transform: translate(-50%, -100%);
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .osm-price-pin-wrapper:hover {
          transform: translate(-50%, -100%) scale(1.12);
        }
      `}</style>

      {/* Floating Map Layer Switcher */}
      <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-gray-200 flex items-center gap-1 text-xs">
        <button
          onClick={() => setMapType("google")}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            mapType === "google"
              ? "bg-[#075985] text-white shadow-xs"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Google Maps Bản đồ đường phố"
        >
          Google Maps
        </button>
        <button
          onClick={() => setMapType("satellite")}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            mapType === "satellite"
              ? "bg-[#075985] text-white shadow-xs"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="Ảnh Vệ tinh Google"
        >
          Vệ tinh
        </button>
        <button
          onClick={() => setMapType("osm")}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            mapType === "osm"
              ? "bg-[#075985] text-white shadow-xs"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          title="OpenStreetMap tốc độ cao"
        >
          OpenStreetMap
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ height: "100%", width: "100%" }}
        className="w-full h-full bg-gray-100 relative z-0"
      />
    </div>
  );
}

// =========================================================================
// MAIN COMPONENT: COMPANY SERVICES EXPLORER
// =========================================================================
export function AgencyServicesExplorer({
  services,
  companyName = "Công ty Lữ hành",
}: AgencyServicesExplorerProps) {
  // Only show approved services
  const approvedServices = services.filter(
    (s) => s.status === "approved" || !s.status
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"split" | "map" | "grid">("split");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // B2B Contact Provider Modal
  const [contactingService, setContactingService] = useState<Service | null>(null);
  const [inquirySent, setInquirySent] = useState(false);

  // Extract unique provinces for filter dropdown
  const provincesList = Array.from(
    new Set(
      approvedServices
        .map((s) => s.province)
        .filter((p): p is string => Boolean(p && p.trim().length > 0))
    )
  ).sort();

  // Filtered services
  const filteredServices = approvedServices.filter((service) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.location && service.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.street && service.street.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.province && service.province.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" ||
      service.category === selectedCategory ||
      (selectedCategory === "fnb" && service.category === "restaurant") ||
      (selectedCategory === "attraction" && service.category === "activity");

    const matchesProvince =
      selectedProvince === "all" || service.province === selectedProvince;

    return matchesSearch && matchesCategory && matchesProvince;
  });

  // =========================================================================
  // VIEW: FULL SERVICE POST DETAIL
  // =========================================================================
  if (selectedService) {
    const imagesList =
      selectedService.images && selectedService.images.length > 0
        ? selectedService.images
        : [selectedService.image];

    const meta = getCategoryMeta(selectedService.category);
    const CategoryIcon = meta.icon;
    const lat = selectedService.latitude || 11.9404;
    const lng = selectedService.longitude || 108.4583;

    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-12">
        {/* Top Navigation & Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedService(null)}
              className="rounded-xl border-gray-200 hover:bg-gray-100 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Quay lại danh sách dịch vụ
            </Button>
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
              <span>/</span>
              <span className="text-gray-600 font-medium">{meta.label}</span>
              <span>/</span>
              <span className="text-gray-900 font-semibold truncate max-w-xs">
                {selectedService.name}
              </span>
            </div>
          </div>

          {/* B2B Action Button: Contact Provider */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() => {
                setContactingService(selectedService);
                setInquirySent(false);
              }}
              className="rounded-xl bg-[#075985] hover:bg-[#F97316] text-white shadow-xs flex-1 sm:flex-initial"
            >
              <Phone className="w-4 h-4 mr-1.5" />
              Liên hệ Đối tác
            </Button>
          </div>
        </div>

        {/* Hero Section: Gallery & Key Overview */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-200 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Gallery Carousel (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-16/10 shadow-inner group">
              <img
                src={imagesList[activeImageIndex]}
                alt={selectedService.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Category & Verified Badge */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-xs ${meta.color} bg-white/95`}>
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đối tác Đã xác minh
                </span>
              </div>

              {/* Image Counter */}
              <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-xs text-white px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Ảnh {activeImageIndex + 1} / {imagesList.length}
              </div>
            </div>

            {/* Thumbnails list */}
            {imagesList.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx
                        ? "border-[#075985] ring-2 ring-blue-600/30 scale-102"
                        : "border-gray-200 opacity-75 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Key Info & Overview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đang hoạt động & Sẵn sàng phục vụ
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                {selectedService.name}
              </h1>
              <p className="text-xs text-gray-500 font-mono mt-1">
                Mã dịch vụ: {selectedService.id}
              </p>

              <div className="flex items-start gap-2 mt-3 text-xs text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{formatAddress(selectedService)}</span>
              </div>

              {/* Price Box */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                  {selectedService.priceFrom && selectedService.priceTo
                    ? `Khoảng giá tham khảo / ${selectedService.category === "hotel" ? "phòng" : "người"}`
                    : "Đơn giá niêm yết"}
                </span>

                {selectedService.priceFrom && selectedService.priceTo ? (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#075985]">
                        {selectedService.priceFrom.toLocaleString("vi-VN")}đ -{" "}
                        {selectedService.priceTo.toLocaleString("vi-VN")}đ
                      </span>
                      <span className="text-xs font-semibold text-[#075985]">
                        / {selectedService.category === "hotel" ? "phòng" : "người"}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {selectedService.category === "hotel"
                        ? "Khoảng giá tham khảo theo phòng/đêm giúp công ty lữ hành dễ dàng ước tính chi phí khi thiết kế tour."
                        : "Khoảng giá tham khảo theo đầu người giúp công ty lữ hành dễ dàng ước tính chi phí khi thiết kế tour."}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-[#075985]">
                      {selectedService.price?.toLocaleString("vi-VN")}đ
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {meta.unit}
                    </span>
                  </div>
                )}

                {selectedService.pricePerPerson && !selectedService.priceFrom && (
                  <div className="mt-2 pt-2 border-t border-[#CBD5E1]/50 flex justify-between text-xs text-gray-700">
                    <span>Giá tính theo người:</span>
                    <strong>{selectedService.pricePerPerson.toLocaleString("vi-VN")}đ/người</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Specs summary */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <span className="text-gray-500 block">{meta.capacityLabel}:</span>
                <strong className="text-gray-900 text-sm">
                  {selectedService.capacity || selectedService.totalRooms || selectedService.seats || "—"}{" "}
                  {meta.capacityUnit}
                </strong>
              </div>

              {selectedService.category === "hotel" && selectedService.stars ? (
                <div className="p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-gray-500 block">Xếp hạng:</span>
                  <strong className="text-amber-600 text-sm">
                    {selectedService.stars} Sao ⭐
                  </strong>
                </div>
              ) : (
                <div className="p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-gray-500 block">Phân loại:</span>
                  <strong className="text-gray-900 text-sm">
                    {selectedService.subCategory || "Tiêu chuẩn"}
                  </strong>
                </div>
              )}

              <div className="p-2.5 bg-gray-50 rounded-xl col-span-2">
                <span className="text-gray-500 block">Nhà cung cấp:</span>
                <strong className="text-gray-900 truncate block">
                  {selectedService.providerName}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Main Details Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Detailed Description & Category Specs */}
          <div className="md:col-span-2 space-y-6">
            {/* 1. Description */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#075985]" />
                Mô tả chi tiết dịch vụ
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                {selectedService.description}
              </p>
            </div>

            {/* 2. Category-Specific Details */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <CategoryIcon className="w-5 h-5 text-[#075985]" />
                Thông số & Quy mô dịch vụ [{meta.label}]
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block mb-0.5">Tên cơ sở / Dịch vụ:</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {selectedService.name}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block mb-0.5">Loại hình / Phân loại:</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {selectedService.subCategory || "Dịch vụ tiêu chuẩn"}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-gray-500 block mb-0.5">{meta.capacityLabel}:</span>
                  <span className="font-bold text-[#075985] text-sm">
                    {selectedService.capacity || selectedService.totalRooms || selectedService.seats || "Đang cập nhật"}{" "}
                    {meta.capacityUnit}
                  </span>
                </div>

                {selectedService.category === "hotel" && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-500 block mb-0.5">Xếp hạng sao:</span>
                    <span className="font-semibold text-amber-600 text-sm">
                      {selectedService.stars && selectedService.stars > 0
                        ? `${selectedService.stars} Sao ⭐`
                        : "Tiêu chuẩn du lịch"}
                    </span>
                  </div>
                )}

                {selectedService.ticketIncludes && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                    <span className="text-gray-500 block mb-0.5">Quyền lợi vé tham quan:</span>
                    <span className="font-medium text-gray-800 text-xs">
                      {selectedService.ticketIncludes}
                    </span>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 sm:col-span-2">
                  <span className="text-gray-500 block mb-0.5">Đơn vị định giá đối tác:</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    Khoảng giá tính theo{" "}
                    {selectedService.category === "hotel"
                      ? "phòng / đêm"
                      : "người (đầu khách)"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Policies & Special Operating Conditions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Chính sách, điều kiện & Thông số đặc thù
                </h3>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                  Quy chuẩn áp dụng
                </Badge>
              </div>

              <p className="text-xs text-gray-500">
                Bao gồm thông tin vận hành chuyên biệt (giờ nhận/trả phòng, quy định hủy chỗ, phụ thu trẻ em/ngày lễ, set menu, quyền lợi vé...) được chuẩn hóa cho công ty lữ hành.
              </p>

              {selectedService.policies &&
              (Array.isArray(selectedService.policies)
                ? selectedService.policies.length > 0
                : Boolean(selectedService.policies)) ? (
                <div className="space-y-2">
                  {Array.isArray(selectedService.policies) ? (
                    selectedService.policies.map((policy, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 text-gray-800 text-sm flex items-start gap-2.5 leading-relaxed"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="font-normal">{policy}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 text-gray-800 text-sm leading-relaxed whitespace-pre-line font-normal">
                      {selectedService.policies}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-sm italic">
                  Chưa có ghi chú chính sách đặc thù. Vui lòng liên hệ nhà cung cấp để biết thêm chi tiết.
                </div>
              )}
            </div>

            {/* 4. Amenities List */}
            {selectedService.amenities && selectedService.amenities.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#075985]" />
                  Tiện nghi & Dịch vụ đi kèm
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedService.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-[#F0F9FF]/80 text-blue-800 text-xs font-semibold rounded-xl border border-[#CBD5E1] flex items-center gap-1.5"
                    >
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1 col): Address, OpenStreetMap Mini-Map & Partner Info */}
          <div className="space-y-6">
            {/* Address & OpenStreetMap Details Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Vị trí & Bản đồ OpenStreetMap
              </h3>

              <div className="space-y-3 text-xs">
                {selectedService.province && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Tỉnh / Thành phố:</span>
                    <strong className="text-gray-900">{selectedService.province}</strong>
                  </div>
                )}
                {selectedService.ward && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Phường / Xã:</span>
                    <strong className="text-gray-900">{selectedService.ward}</strong>
                  </div>
                )}
                {selectedService.street && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">Đường / Số nhà:</span>
                    <strong className="text-gray-900">{selectedService.street}</strong>
                  </div>
                )}
                <div className="pt-1">
                  <span className="text-gray-500 block mb-1">Địa chỉ đầy đủ:</span>
                  <p className="text-gray-800 font-medium italic bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                    {formatAddress(selectedService)}
                  </p>
                </div>

                {/* OpenStreetMap Component (Dedicated Interactive Mini-Map, Zero Iframe) */}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-[#075985]" />
                      Tọa độ GPS (WGS84):
                    </span>
                    <span className="font-mono text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </span>
                  </div>

                  {/* Clean Leaflet Mini-Map directly in React */}
                  <ServiceDetailOsmMap
                    latitude={selectedService.latitude}
                    longitude={selectedService.longitude}
                    serviceName={selectedService.name}
                    category={selectedService.category}
                    priceText={formatMapPrice(selectedService)}
                  />

                  {/* Google Maps External Link Button */}
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#F0F9FF] text-[#075985] hover:bg-[#E0F2FE] font-semibold text-xs border border-[#CBD5E1] transition-colors shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Mở vị trí trên Google Maps (Điều hướng)
                  </a>
                </div>
              </div>
            </div>

            {/* Provider Credentials Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F97316]" />
                Thông tin Nhà cung cấp đối tác
              </h3>

              <div className="p-3.5 rounded-xl bg-[#F0F9FF]/50 border border-purple-100 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F97316]/15 text-[#EA580C] flex items-center justify-center font-bold text-sm shadow-xs">
                    {selectedService.providerName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {selectedService.providerName}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      Mã đối tác: {selectedService.providerId}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-100/60 flex items-center justify-between text-xs text-purple-900">
                  <span>Trạng thái hồ sơ:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Đã kiểm duyệt
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <Button
                  onClick={() => {
                    setContactingService(selectedService);
                    setInquirySent(false);
                  }}
                  className="w-full rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-2.5 text-xs shadow-xs"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Gửi yêu cầu Báo giá & Hợp đồng
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Contact Provider */}
        {contactingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-gray-100 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#F0F9FF] text-[#075985]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">
                      Liên hệ Đối tác Cung cấp
                    </h3>
                    <p className="text-xs text-gray-500">
                      {contactingService.providerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setContactingService(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inquirySent ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-gray-900 text-base">
                    Đã gửi yêu cầu thành công!
                  </h4>
                  <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                    Hệ thống đã chuyển thông tin yêu cầu của Quý công ty tới{" "}
                    <strong>{contactingService.providerName}</strong>. Đại diện nhà cung cấp sẽ liên hệ qua điện thoại/email trong vòng 2 giờ làm việc.
                  </p>
                  <Button
                    onClick={() => setContactingService(null)}
                    className="rounded-xl bg-[#075985] text-white text-xs px-6"
                  >
                    Đóng cửa sổ
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                    <p className="text-gray-600">
                      <strong>Dịch vụ quan tâm:</strong> {contactingService.name}
                    </p>
                    <p className="text-gray-600">
                      <strong>Công ty lữ hành:</strong> {companyName}
                    </p>
                    <p className="text-gray-600">
                      <strong>Địa chỉ phục vụ:</strong> {formatAddress(contactingService)}
                    </p>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Nội dung tin nhắn / Yêu cầu báo giá số lượng đoàn:
                    </label>
                    <textarea
                      rows={3}
                      defaultValue={`Kính gửi ${contactingService.providerName},\nCông ty chúng tôi dự kiến có đoàn khách cần sử dụng dịch vụ "${contactingService.name}". Xin vui lòng gửi bảng giá chiết khấu đại lý và chính sách hợp tác qua email của chúng tôi.`}
                      className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#075985] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setContactingService(null)}
                      className="flex-1 rounded-xl text-xs"
                    >
                      Hủy
                    </Button>
                    <Button
                      onClick={() => setInquirySent(true)}
                      className="flex-1 rounded-xl bg-[#075985] hover:bg-[#F97316] text-white text-xs"
                    >
                      Gửi yêu cầu liên hệ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW: EXPLORER DASHBOARD (SEARCH, OPENSTREETMAP & CARDS)
  // =========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#075985] flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#075985]" />
            Dịch vụ đối tác
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Khám phá và liên kết mạng lưới nhà cung ứng du lịch (Khách sạn, Nhà hàng, Vận chuyển, Điểm tham quan)
          </p>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm khách sạn, nhà hàng, điểm tham quan, nhà xe hoặc nhà cung cấp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#075985] focus:outline-hidden bg-gray-50/50"
            />
          </div>

          {/* Province Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="py-2.5 px-3 rounded-xl border border-gray-200 text-xs sm:text-sm bg-white font-medium text-gray-700 focus:ring-2 focus:ring-[#075985] focus:outline-hidden"
            >
              <option value="all">Tất cả Tỉnh / Thành phố ({provincesList.length})</option>
              {provincesList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* View Switcher buttons */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode("split")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "split"
                    ? "bg-white text-[#075985] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Bản đồ & Danh sách song song"
              >
                <Columns className="w-4 h-4" />
                <span className="hidden sm:inline">Song song</span>
              </button>

              <button
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "map"
                    ? "bg-white text-[#075985] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Bản đồ OpenStreetMap toàn cảnh"
              >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Bản đồ</span>
              </button>

              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-[#075985] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Lưới bài đăng"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Lưới thẻ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-t border-gray-100 pt-3">
          <span className="text-gray-500 font-medium flex items-center gap-1 flex-shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#075985]" />
            Danh mục:
          </span>

          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              selectedCategory === "all"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Tất cả ({approvedServices.length})
          </button>

          <button
            onClick={() => setSelectedCategory("hotel")}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              selectedCategory === "hotel"
                ? "bg-[#075985] text-white shadow-xs"
                : "bg-[#F0F9FF] text-[#075985] hover:bg-[#E0F2FE] border border-[#CBD5E1]"
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            Lưu trú & Khách sạn (
            {approvedServices.filter((s) => s.category === "hotel").length})
          </button>

          <button
            onClick={() => setSelectedCategory("fnb")}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              selectedCategory === "fnb"
                ? "bg-orange-600 text-white shadow-xs"
                : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Ẩm thực & Nhà hàng (
            {
              approvedServices.filter(
                (s) => s.category === "fnb" || s.category === "restaurant"
              ).length
            }
            )
          </button>

          <button
            onClick={() => setSelectedCategory("attraction")}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              selectedCategory === "attraction"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Tham quan & Trải nghiệm (
            {
              approvedServices.filter(
                (s) => s.category === "attraction" || s.category === "activity"
              ).length
            }
            )
          </button>

          <button
            onClick={() => setSelectedCategory("transportation")}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              selectedCategory === "transportation"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Vận chuyển & Xe tour (
            {
              approvedServices.filter((s) => s.category === "transportation")
                .length
            }
            )
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA ACCORDING TO VIEW MODE */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Top: Interactive OpenStreetMap (7 cols on desktop) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden sticky top-24">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                    Bản đồ dịch vụ & Giá trực tiếp
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Hiển thị {filteredServices.length} địa điểm kèm nhãn giá trên bản đồ
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                🏷️ Nhấp vào nhãn giá để xem chi tiết
              </span>
            </div>

            {/* Isolated OpenStreetMap Component */}
            <ExplorerOsmMap
              services={filteredServices}
              selectedProvince={selectedProvince}
              onSelectService={(service) => {
                setSelectedService(service);
                setActiveImageIndex(0);
              }}
              height="520px"
            />
          </div>

          {/* Right: Service Cards List (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-4 max-h-[700px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-gray-500 pb-1">
              <span>Tìm thấy <strong>{filteredServices.length}</strong> bài đăng phù hợp</span>
              {selectedProvince !== "all" && (
                <Badge variant="outline" className="text-xs">
                  {selectedProvince}
                </Badge>
              )}
            </div>

            {filteredServices.map((service) => {
              const meta = getCategoryMeta(service.category);
              return (
                <div
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setActiveImageIndex(0);
                  }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden hover:shadow-md hover:border-blue-400 transition-all flex flex-col sm:flex-row group cursor-pointer"
                >
                  <div className="sm:w-44 h-36 sm:h-auto relative overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={service.image}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-xs"
                      style={{ backgroundColor: meta.pinBg }}
                    >
                      {meta.shortLabel}
                    </span>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span
                          className="text-gray-500 font-medium truncate"
                          title={`${service.province || "Việt Nam"} • ${service.providerName}`}
                        >
                          {service.province || "Việt Nam"} • {service.providerName}
                        </span>
                        <span className="font-bold text-amber-600 flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {service.rating || "4.8"}
                        </span>
                      </div>

                      <h4
                        className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 h-10 group-hover:text-[#075985] transition-colors"
                        title={service.name}
                      >
                        {service.name}
                      </h4>

                      <div
                        className="text-[11px] text-gray-500 flex items-center gap-1.5 min-w-0"
                        title={formatAddress(service)}
                      >
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{formatAddress(service)}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-gray-400 block font-medium">
                          Giá tham khảo:
                        </span>
                        <strong className="text-[#075985] text-xs sm:text-sm font-extrabold truncate block">
                          {formatPriceSummary(service)}
                        </strong>
                      </div>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedService(service);
                          setActiveImageIndex(0);
                        }}
                        className="rounded-xl bg-[#F0F9FF] text-[#075985] hover:bg-[#075985] hover:text-white border border-[#CBD5E1] text-xs px-2.5 py-1 transition-all flex-shrink-0 font-medium"
                      >
                        Xem bài đăng
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredServices.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
                <Compass className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-gray-600 text-sm font-semibold">
                  Không tìm thấy dịch vụ nào phù hợp với bộ lọc.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedProvince("all");
                  }}
                  className="rounded-xl text-xs"
                >
                  Xóa bộ lọc tìm kiếm
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "map" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden relative">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-gray-900 text-sm">
                Bản đồ toàn cảnh — {filteredServices.length} bài đăng dịch vụ (Kèm nhãn giá trực tiếp)
              </span>
            </div>
            <span className="text-xs text-gray-500">
              Nhấp vào nhãn giá bất kỳ để xem nhanh thông tin dịch vụ
            </span>
          </div>

          <ExplorerOsmMap
            services={filteredServices}
            selectedProvince={selectedProvince}
            onSelectService={(service) => {
              setSelectedService(service);
              setActiveImageIndex(0);
            }}
            height="650px"
          />
        </div>
      )}

      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredServices.map((service) => {
            const meta = getCategoryMeta(service.category);
            const CatIcon = meta.icon;
            return (
              <div
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setActiveImageIndex(0);
                }}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden hover:shadow-lg hover:border-blue-400 transition-all flex flex-col h-full group cursor-pointer"
              >
                <div className="relative aspect-16/10 bg-gray-100 overflow-hidden flex-shrink-0">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span
                    className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs flex items-center gap-1"
                    style={{ backgroundColor: meta.pinBg }}
                  >
                    <CatIcon className="w-3 h-3" />
                    {meta.shortLabel}
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {service.rating || "4.8"}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5 min-w-0">
                    <p
                      className="text-[11px] text-gray-400 font-medium truncate block"
                      title={`${service.province || "Việt Nam"} • ${service.providerName}`}
                    >
                      {service.province || "Việt Nam"} • {service.providerName}
                    </p>

                    <h3
                      className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 h-10 group-hover:text-[#075985] transition-colors"
                      title={service.name}
                    >
                      {service.name}
                    </h3>

                    <div
                      className="text-xs text-gray-500 flex items-center gap-1.5 min-w-0 pt-0.5"
                      title={formatAddress(service)}
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{formatAddress(service)}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-400 block font-medium">
                        Giá tham khảo:
                      </span>
                      <strong className="text-[#075985] text-sm font-extrabold truncate block">
                        {formatPriceSummary(service)}
                      </strong>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedService(service);
                        setActiveImageIndex(0);
                      }}
                      className="rounded-xl bg-[#075985] hover:bg-[#F97316] text-white text-xs px-3.5 py-1.5 shadow-xs flex-shrink-0 font-semibold"
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
