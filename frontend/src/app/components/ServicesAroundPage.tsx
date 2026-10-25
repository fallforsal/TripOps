import { useState } from "react";
import { Service } from "@/app/types";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Slider } from "@/app/components/ui/slider";
import {
  Search,
  MapPin,
  Star,
  Phone,
  Mail,
  MessageCircle,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";

interface ServicesAroundPageProps {
  services: Service[];
}

export function ServicesAroundPage({
  services,
}: ServicesAroundPageProps) {
  const [selectedService, setSelectedService] =
    useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    string[]
  >([]);
  const [priceRange, setPriceRange] = useState<
    [number, number]
  >([0, 10000000]);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Only show approved services
  const approvedServices = services.filter(
    (s) => s.status === "approved",
  );

  // Filter services
  const filteredServices = approvedServices.filter(
    (service) => {
      const matchesSearch =
        service.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        service.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        service.location
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(service.category);

      const matchesPrice =
        service.price >= priceRange[0] &&
        service.price <= priceRange[1];

      return matchesSearch && matchesCategory && matchesPrice;
    },
  );

  const categories = [
    { value: "hotel", label: "Khách sạn" },
    { value: "restaurant", label: "Nhà hàng" },
    { value: "eatery", label: "Quán ăn" },
    { value: "transportation", label: "Vận chuyển" },
    { value: "activity", label: "Hoạt động trải nghiệm" },
  ];

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(
        selectedCategories.filter((c) => c !== category),
      );
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const getCategoryLabel = (category: Service["category"]) => {
    const labels = {
      hotel: "Khách sạn",
      restaurant: "Nhà hàng",
      eatery: "Quán ăn",
      transportation: "Vận chuyển",
      activity: "Hoạt động",
    };
    return labels[category] || category;
  };

  const toggleFavorite = (serviceId: string) => {
    if (favorites.includes(serviceId)) {
      setFavorites(favorites.filter((id) => id !== serviceId));
    } else {
      setFavorites([...favorites, serviceId]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#075985] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">
            Dịch vụ xung quanh
          </h1>
          <p className="text-xl text-blue-100">
            Khám phá các dịch vụ du lịch tốt nhất từ các nhà
            cung cấp uy tín
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-4">
                    Bộ lọc
                  </h3>

                  {/* Search */}
                  <div className="mb-4">
                    <Label>Tìm kiếm</Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Tìm dịch vụ..."
                        value={searchQuery}
                        onChange={(e) =>
                          setSearchQuery(e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div className="mb-4">
                    <Label className="mb-3 block">
                      Loại dịch vụ
                    </Label>
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <div
                          key={cat.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={cat.value}
                            checked={selectedCategories.includes(
                              cat.value,
                            )}
                            onCheckedChange={() =>
                              toggleCategory(cat.value)
                            }
                          />
                          <label
                            htmlFor={cat.value}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {cat.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <Label className="mb-3 block">
                      Mức giá
                    </Label>
                    <div className="space-y-2">
                      <Slider
                        value={priceRange}
                        onValueChange={values => setPriceRange([values[0], values[1]])}
                        max={10000000}
                        step={100000}
                      />
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>
                          {priceRange[0].toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </span>
                        <span>
                          {priceRange[1].toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategories([]);
                    setPriceRange([0, 10000000]);
                  }}
                >
                  Đặt lại bộ lọc
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Services Grid */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">
                Tìm thấy{" "}
                <strong>{filteredServices.length}</strong> dịch
                vụ
              </p>
            </div>

            {filteredServices.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <p>Không tìm thấy dịch vụ nào phù hợp</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <Card
                    key={service.id}
                    className="hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setSelectedService(service)}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-white text-gray-900">
                          {getCategoryLabel(service.category)}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(service.id);
                          }}
                          className={`p-2 rounded-full bg-white shadow-md hover:scale-110 transition-transform ${
                            favorites.includes(service.id)
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              favorites.includes(service.id)
                                ? "fill-red-500"
                                : ""
                            }`}
                          />
                        </button>
                        <div className="bg-white px-2 py-1 rounded-full flex items-center gap-1 text-sm shadow-md">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">
                            {service.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">
                          {service.location}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[#075985] font-bold text-lg">
                          {service.price.toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </div>
                        <Button size="sm" variant="outline">
                          Xem chi tiết
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedService}
        onOpenChange={() => setSelectedService(null)}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedService?.name}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Chi tiết về dịch vụ
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6">
              <img
                src={selectedService.image}
                alt={selectedService.name}
                className="w-full h-80 object-cover rounded-lg"
              />

              <div className="flex items-center gap-3">
                <Badge>
                  {getCategoryLabel(selectedService.category)}
                </Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">
                    {selectedService.rating}/5
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Mô tả
                </h3>
                <p className="text-gray-700">
                  {selectedService.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    Thông tin
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{selectedService.location}</span>
                    </div>
                    {selectedService.capacity && (
                      <p>
                        <strong>Sức chứa:</strong>{" "}
                        {selectedService.capacity} người
                      </p>
                    )}
                    {selectedService.openingHours && (
                      <p>
                        <strong>Giờ mở cửa:</strong>{" "}
                        {selectedService.openingHours}
                      </p>
                    )}
                    {selectedService.cuisine && (
                      <p>
                        <strong>Ẩm thực:</strong>{" "}
                        {selectedService.cuisine}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    Nhà cung cấp
                  </h3>
                  <p className="font-medium mb-3">
                    {selectedService.providerName}
                  </p>
                  <div className="text-sm text-gray-600">
                    <p>Liên hệ đặt dịch vụ qua:</p>
                    <div className="mt-2 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Điện thoại
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Zalo/Facebook
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedService.amenities &&
                selectedService.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">
                      Tiện nghi
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedService.amenities.map(
                        (amenity, idx) => (
                          <Badge key={idx} variant="secondary">
                            {amenity}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div className="pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">
                      Giá từ
                    </p>
                    <p className="text-3xl font-bold text-[#075985]">
                      {selectedService.price.toLocaleString(
                        "vi-VN",
                      )}
                      đ
                    </p>
                  </div>
                  <Button
                    size="lg"
                    className="bg-[#075985] hover:bg-[#F97316]"
                  >
                    Liên hệ ngay
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}