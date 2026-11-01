import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  ExternalLink,
  LocateFixed,
  Navigation,
  Compass,
  Check,
  MousePointerClick,
  Info,
  Loader2,
  Search,
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

// Custom crisp SVG Pin Icon for Leaflet
const createCustomPinIcon = () => {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="position: relative; width: 38px; height: 38px; transform: translate(-19px, -38px);">
        <svg viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); width: 100%; height: 100%;">
          <path d="M19 0C8.50659 0 0 8.50659 0 19C0 32.5 19 48 19 48C19 48 38 32.5 38 19C38 8.50659 29.4934 0 19 0Z" fill="#075985"/>
          <path d="M19 2C9.61116 2 2 9.61116 2 19C2 31.2 19 45.5 19 45.5C19 45.5 36 31.2 36 19C36 9.61116 28.3888 2 19 2Z" fill="#0369A1"/>
          <circle cx="19" cy="18" r="7" fill="white"/>
          <circle cx="19" cy="18" r="3.5" fill="#F97316"/>
        </svg>
      </div>
    `,
    iconSize: [38, 48],
    iconAnchor: [19, 48],
    popupAnchor: [0, -48],
  });
};

export function GoogleMapLocationPicker({
  latitude = 11.9404,
  longitude = 108.4583,
  onChange,
  addressLabel = "",
  readOnly = false,
}: GoogleMapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [latInput, setLatInput] = useState(latitude.toFixed(6));
  const [lngInput, setLngInput] = useState(longitude.toFixed(6));
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const lastGeocodedAddress = useRef<string>("");

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialLat = Number.isFinite(latitude) ? latitude : 11.9404;
    const initialLng = Number.isFinite(longitude) ? longitude : 108.4583;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: !readOnly,
      dragging: !readOnly,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      icon: createCustomPinIcon(),
      draggable: !readOnly,
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Click anywhere on map to reposition marker and update lat/lng
    if (!readOnly) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(6));
        const newLng = parseFloat(e.latlng.lng.toFixed(6));
        marker.setLatLng([newLat, newLng]);
        setLatInput(newLat.toFixed(6));
        setLngInput(newLng.toFixed(6));
        onChange(newLat, newLng);
      });

      // Drag marker
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const newLat = parseFloat(pos.lat.toFixed(6));
        const newLng = parseFloat(pos.lng.toFixed(6));
        setLatInput(newLat.toFixed(6));
        setLngInput(newLng.toFixed(6));
        onChange(newLat, newLng);
      });
    }

    // Force map to render correct container size
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync marker and map center when props change from outside (e.g. province dropdown change)
  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setLatInput(latitude.toFixed(6));
      setLngInput(longitude.toFixed(6));

      if (markerRef.current && mapInstanceRef.current) {
        const curMarkerPos = markerRef.current.getLatLng();
        const diffLat = Math.abs(curMarkerPos.lat - latitude);
        const diffLng = Math.abs(curMarkerPos.lng - longitude);

        if (diffLat > 0.0001 || diffLng > 0.0001) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapInstanceRef.current.flyTo([latitude, longitude], 15, {
            duration: 0.8,
          });
        }
      }
    }
  }, [latitude, longitude]);

  const handleGeocodeAddress = async (addrToSearch?: string) => {
    const target = (addrToSearch || addressLabel || "").trim();
    if (!target || target.length < 4 || readOnly) return;
    if (lastGeocodedAddress.current === target) return;

    setIsGeocoding(true);
    try {
      const query = `${target}, Việt Nam`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "vi" } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const foundLat = parseFloat(parseFloat(data[0].lat).toFixed(6));
        const foundLng = parseFloat(parseFloat(data[0].lon).toFixed(6));
        lastGeocodedAddress.current = target;
        handleUpdateCoords(foundLat, foundLng);
      }
    } catch (err) {
      console.warn("Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Tự động tìm vị trí và chuyển bản đồ đến địa chỉ khi người dùng nhập địa chỉ
  useEffect(() => {
    if (!addressLabel || addressLabel.trim().length < 5 || readOnly) return;
    const timer = setTimeout(() => {
      handleGeocodeAddress(addressLabel);
    }, 1000);
    return () => clearTimeout(timer);
  }, [addressLabel]);

  const handleUpdateCoords = (newLat: number, newLng: number) => {
    const validLat = Math.max(-90, Math.min(90, newLat));
    const validLng = Math.max(-180, Math.min(180, newLng));
    setLatInput(validLat.toFixed(6));
    setLngInput(validLng.toFixed(6));

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([validLat, validLng]);
      mapInstanceRef.current.flyTo([validLat, validLng], 15, { duration: 0.8 });
    }
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
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ tính năng định vị GPS.");
      return;
    }
    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGPS(false);
        const userLat = parseFloat(pos.coords.latitude.toFixed(6));
        const userLng = parseFloat(pos.coords.longitude.toFixed(6));
        handleUpdateCoords(userLat, userLng);
      },
      (err) => {
        setIsLocatingGPS(false);
        alert("Không thể lấy vị trí hiện tại: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const googleMapsExternalUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#E0F2FE] text-[#075985]">
              <MapPin className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">
              Vị trí & Tọa độ Bản đồ tương tác
            </h4>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Bấm trực tiếp lên bản đồ hoặc kéo ghim để tự động nhận biết chính xác Vĩ độ & Kinh độ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetCurrentLocation}
              disabled={isLocatingGPS}
              className="text-xs rounded-xl h-8 border-gray-300 text-gray-700 hover:bg-gray-100 gap-1.5"
            >
              <LocateFixed
                className={`w-3.5 h-3.5 text-emerald-600 ${
                  isLocatingGPS ? "animate-spin" : ""
                }`}
              />
              {isLocatingGPS ? "Đang định vị..." : "GPS của tôi"}
            </Button>
          )}

          <a
            href={googleMapsExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#075985] hover:text-[#0369a1] font-semibold px-2.5 py-1.5 rounded-xl bg-[#F0F9FF] hover:bg-[#E0F2FE] border border-[#CBD5E1] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Maps
          </a>
        </div>
      </div>

      {/* Quick Tourism Hotspots Selection */}
      {!readOnly && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] text-gray-400 flex items-center gap-1 flex-shrink-0 font-medium">
            <Navigation className="w-3 h-3 text-[#075985]" />
            Địa danh du lịch nhanh:
          </span>
          {tourismHotspots.map((h) => (
            <button
              key={h.name}
              type="button"
              onClick={() => handleUpdateCoords(h.lat, h.lng)}
              className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-[#F0F9FF] hover:text-[#075985] text-gray-600 text-[11px] font-medium whitespace-nowrap transition-colors border border-gray-200"
            >
              {h.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Leaflet Interactive Map Container */}
      <div className="relative h-72 sm:h-80 w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-inner z-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Hint Overlay */}
        {!readOnly && (
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm text-xs flex items-center gap-2 pointer-events-none">
            <MousePointerClick className="w-3.5 h-3.5 text-[#075985]" />
            <span className="font-medium text-gray-700">
              Nhấp chuột vào bản đồ hoặc kéo ghim để định vị
            </span>
          </div>
        )}

        {/* Address badge at bottom with auto geocode status */}
        {addressLabel && (
          <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-200 shadow-md text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span className="text-gray-800 font-semibold truncate">
                {addressLabel}
              </span>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => handleGeocodeAddress(addressLabel)}
                disabled={isGeocoding}
                className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#075985] hover:bg-[#0369a1] text-white text-[11px] font-bold transition-all disabled:opacity-60 shadow-2xs"
                title="Bấm để tự động tìm tọa độ theo địa chỉ này"
              >
                {isGeocoding ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang tìm...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3" />
                    <span>Tự định vị địa chỉ này</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Synchronized Lat & Lng Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Vĩ độ (Latitude) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              disabled={readOnly}
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              onBlur={handleManualInputBlur}
              className="w-full px-3 py-2 text-xs font-mono font-medium border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none disabled:bg-gray-100 bg-gray-50/50"
              placeholder="11.940400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold uppercase">
              Tự nhận diện
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
            Kinh độ (Longitude) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              disabled={readOnly}
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              onBlur={handleManualInputBlur}
              className="w-full px-3 py-2 text-xs font-mono font-medium border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075985] focus:outline-none disabled:bg-gray-100 bg-gray-50/50"
              placeholder="108.458300"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-semibold uppercase">
              Tự nhận diện
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
