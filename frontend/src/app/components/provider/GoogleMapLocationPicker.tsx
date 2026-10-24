import { useState, useEffect } from "react";
import {
  MapPin,
  Search,
  ExternalLink,
  LocateFixed,
  Navigation,
  Compass,
  Check,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface GoogleMapLocationPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (lat: number, lng: number) => void;
  addressLabel?: string;
  readOnly?: boolean;
}

const tourismHotspots = [
  { name: "Đà Lạt (Lâm Đồng)", lat: 11.9404, lng: 108.4583 },
  { name: "Nha Trang (Khánh Hòa)", lat: 12.2388, lng: 109.1967 },
  { name: "Phú Quốc (Kiên Giang)", lat: 10.2899, lng: 103.984 },
  { name: "Đà Nẵng", lat: 16.0544, lng: 108.2022 },
  { name: "Hội An (Quảng Nam)", lat: 15.8801, lng: 108.338 },
  { name: "Mũi Né (Bình Thuận)", lat: 10.9804, lng: 108.2615 },
  { name: "Sa Pa (Lào Cai)", lat: 22.3364, lng: 103.8438 },
  { name: "Hạ Long (Quảng Ninh)", lat: 20.9505, lng: 107.0734 },
  { name: "TP. Hồ Chí Minh", lat: 10.8231, lng: 106.6297 },
  { name: "Hà Nội", lat: 21.0285, lng: 105.8542 },
];

export function GoogleMapLocationPicker({
  latitude = 11.9404,
  longitude = 108.4583,
  onChange,
  addressLabel = "",
  readOnly = false,
}: GoogleMapLocationPickerProps) {
  const [latInput, setLatInput] = useState(latitude.toString());
  const [lngInput, setLngInput] = useState(longitude.toString());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLatInput(latitude.toFixed(6));
    setLngInput(longitude.toFixed(6));
  }, [latitude, longitude]);

  const handleUpdateCoords = (newLat: number, newLng: number) => {
    const validLat = Math.max(-90, Math.min(90, newLat));
    const validLng = Math.max(-180, Math.min(180, newLng));
    setLatInput(validLat.toFixed(6));
    setLngInput(validLng.toFixed(6));
    onChange(validLat, validLng);
  };

  const handleManualInputBlur = () => {
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      handleUpdateCoords(parsedLat, parsedLng);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleUpdateCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          alert("Không thể truy cập vị trí hiện tại: " + err.message);
        }
      );
    } else {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
    }
  };

  const handleSearchHotspot = (query: string) => {
    const lower = query.toLowerCase();
    const matched = tourismHotspots.find((h) => h.name.toLowerCase().includes(lower));
    if (matched) {
      handleUpdateCoords(matched.lat, matched.lng);
      setSearchQuery("");
    }
  };

  const mapEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&hl=vi&z=15&output=embed`;
  const googleMapsExternalUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <MapPin className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">
              Vị trí Tọa độ Bản đồ (GPS / Google Maps)
            </h4>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Lưu tọa độ (Latitude / Longitude) để công ty du lịch dễ dàng định vị cơ sở khi thiết kế lịch trình tour.
          </p>
        </div>

        <a
          href={googleMapsExternalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#075985] hover:text-[#075985] font-semibold px-2.5 py-1 rounded-lg bg-[#F0F9FF] hover:bg-[#E0F2FE]/70 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Mở trên Google Maps
        </a>
      </div>

      {/* Quick Search & GPS Locate */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchHotspot(searchQuery))}
              placeholder="Tìm nhanh địa danh (Đà Lạt, Nha Trang, Phú Quốc...)"
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetCurrentLocation}
            className="text-xs rounded-xl h-8 border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <LocateFixed className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Định vị GPS của tôi
          </Button>
        </div>
      )}

      {/* Preset tourism hotspots chips */}
      {!readOnly && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-gray-400 flex items-center gap-1 flex-shrink-0">
            <Navigation className="w-3 h-3" />
            Khu du lịch phổ biến:
          </span>
          {tourismHotspots.slice(0, 6).map((h) => (
            <button
              key={h.name}
              type="button"
              onClick={() => handleUpdateCoords(h.lat, h.lng)}
              className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-[#F0F9FF] hover:text-[#075985] text-gray-600 text-[11px] font-medium whitespace-nowrap transition-colors"
            >
              {h.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Embedded Map Display */}
      <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-inner">
        <iframe
          title="Bản đồ tọa độ cơ sở dịch vụ"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight={0}
          marginWidth={0}
          src={mapEmbedUrl}
          className="w-full h-full pointer-events-auto"
        />

        {/* Pin overlay indicator */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm text-xs flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
          <span className="font-semibold text-gray-800">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
          {addressLabel && (
            <span className="text-gray-500 text-[11px] max-w-[180px] truncate border-l border-gray-200 pl-2">
              {addressLabel}
            </span>
          )}
        </div>
      </div>

      {/* Coordinate Input fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Vĩ độ (Latitude) *
          </label>
          <input
            type="number"
            step="any"
            disabled={readOnly}
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={handleManualInputBlur}
            className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none disabled:bg-gray-100"
            placeholder="11.9404"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">
            Kinh độ (Longitude) *
          </label>
          <input
            type="number"
            step="any"
            disabled={readOnly}
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={handleManualInputBlur}
            className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:outline-none disabled:bg-gray-100"
            placeholder="108.4583"
          />
        </div>
      </div>
    </div>
  );
}
