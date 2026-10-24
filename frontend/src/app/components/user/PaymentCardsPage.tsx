import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface PaymentCard {
  id: string;
  type: "visa" | "mastercard" | "jcb" | "amex";
  last4: string;
  holderName: string;
  expiryDate: string;
  isDefault: boolean;
}

const mockCards: PaymentCard[] = [
  {
    id: "card-1",
    type: "visa",
    last4: "4242",
    holderName: "NGUYEN VAN AN",
    expiryDate: "12/26",
    isDefault: true,
  },
  {
    id: "card-2",
    type: "mastercard",
    last4: "8888",
    holderName: "NGUYEN VAN AN",
    expiryDate: "06/27",
    isDefault: false,
  },
];

export function PaymentCardsPage() {
  const [cards, setCards] = useState<PaymentCard[]>(mockCards);
  const [showAddCard, setShowAddCard] = useState(false);

  const getCardBrand = (type: string) => {
    switch (type) {
      case "visa":
        return {
          name: "Visa",
          color: "from-blue-600 to-blue-800",
        };
      case "mastercard":
        return {
          name: "Mastercard",
          color: "from-orange-600 to-red-600",
        };
      case "jcb":
        return {
          name: "JCB",
          color: "from-green-600 to-teal-600",
        };
      case "amex":
        return {
          name: "American Express",
          color: "from-blue-500 to-indigo-600",
        };
      default:
        return {
          name: "Card",
          color: "from-gray-600 to-gray-800",
        };
    }
  };

  const setDefaultCard = (cardId: string) => {
    setCards(
      cards.map((card) => ({
        ...card,
        isDefault: card.id === cardId,
      })),
    );
  };

  const removeCard = (cardId: string) => {
    if (confirm("Bạn có chắc muốn xóa thẻ này?")) {
      setCards(cards.filter((card) => card.id !== cardId));
    }
  };

  const handleAddCard = () => {
    alert(
      "Chức năng thêm thẻ sẽ được phát triển với form nhập thông tin thẻ và tích hợp cổng thanh toán bảo mật.",
    );
    setShowAddCard(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Thẻ thanh toán
                </h1>
                <p className="text-gray-600">
                  Quản lý phương thức thanh toán của bạn
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCard(true)}
              className="px-6 py-3 bg-[#075985] text-white rounded-xl hover:bg-[#F97316] transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Thêm thẻ mới
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-[#F0F9FF] border border-[#CBD5E1] rounded-xl p-4 mb-6 flex items-start gap-3">
          <Shield className="w-6 h-6 text-[#075985] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">
              Bảo mật & An toàn
            </h3>
            <p className="text-sm text-blue-800">
              Thông tin thẻ của bạn được mã hóa và lưu trữ an
              toàn theo chuẩn PCI DSS. Chúng tôi không lưu trữ
              mã CVV của thẻ.
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        {cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {cards.map((card) => {
              const brand = getCardBrand(card.type);
              return (
                <div key={card.id} className="relative">
                  {/* Card Display */}
                  <div
                    className={`bg-gradient-to-br ${brand.color} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden`}
                  >
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>

                    {/* Default Badge */}
                    {card.isDefault && (
                      <div className="absolute top-4 right-4">
                        <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-1 text-xs font-semibold">
                          <Check className="w-3 h-3" />
                          Mặc định
                        </div>
                      </div>
                    )}

                    {/* Card Content */}
                    <div className="relative z-10">
                      <div className="mb-8">
                        <div className="text-sm opacity-80 mb-1">
                          Loại thẻ
                        </div>
                        <div className="text-xl font-bold">
                          {brand.name}
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-center gap-2 text-2xl font-mono tracking-widest">
                          <span>••••</span>
                          <span>••••</span>
                          <span>••••</span>
                          <span className="font-semibold">
                            {card.last4}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-xs opacity-80 mb-1">
                            Chủ thẻ
                          </div>
                          <div className="font-semibold">
                            {card.holderName}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs opacity-80 mb-1">
                            Hết hạn
                          </div>
                          <div className="font-semibold">
                            {card.expiryDate}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 flex gap-2">
                    {!card.isDefault && (
                      <button
                        onClick={() => setDefaultCard(card.id)}
                        className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                      >
                        Đặt làm mặc định
                      </button>
                    )}
                    <button
                      onClick={() => removeCard(card.id)}
                      className={`px-4 py-2 bg-white border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 ${
                        card.isDefault ? "flex-1" : ""
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa thẻ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty State
          <div className="bg-white rounded-2xl p-12 text-center mb-8">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Chưa có thẻ thanh toán
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Thêm thẻ thanh toán để đặt tour nhanh chóng và
              tiện lợi hơn
            </p>
            <button
              onClick={() => setShowAddCard(true)}
              className="px-8 py-3 bg-[#075985] text-white rounded-xl hover:bg-[#F97316] transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Thêm thẻ mới
            </button>
          </div>
        )}

        {/* Add Card Modal */}
        {showAddCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Thêm thẻ mới
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số thẻ
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên chủ thẻ
                  </label>
                  <input
                    type="text"
                    placeholder="NGUYEN VAN A"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày hết hạn
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#075985] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddCard(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddCard}
                  className="flex-1 px-6 py-3 bg-[#075985] text-white rounded-lg hover:bg-[#F97316] transition-colors font-semibold"
                >
                  Thêm thẻ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Info */}
        <div className="bg-white rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Phương thức thanh toán được chấp nhận
          </h3>
          <div className="flex flex-wrap gap-4">
            {["visa", "mastercard", "jcb", "amex"].map(
              (type) => {
                const brand = getCardBrand(type);
                return (
                  <div
                    key={type}
                    className={`px-6 py-3 bg-gradient-to-br ${brand.color} text-white rounded-lg font-semibold`}
                  >
                    {brand.name}
                  </div>
                );
              },
            )}
            <div className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg font-semibold">
              Ví điện tử
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}