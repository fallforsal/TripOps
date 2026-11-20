// A quote covers only the guests and dates on this request.
export function providerQuoteCopy(request: { isSupplement?: boolean; numberOfGuests: number; serviceType?: string; mealType?: string }) {
  const meal = request.serviceType === "restaurant" || !!request.mealType;
  const subject = request.isSupplement ? `${request.numberOfGuests} khách bổ sung` : `${request.numberOfGuests} khách trong yêu cầu`;
  return {
    title: request.isSupplement ? "Báo giá phần khách bổ sung" : "Báo giá dịch vụ theo yêu cầu",
    label: `Tổng chi phí ${meal ? "bữa ăn" : "lưu trú"} cho ${subject} (VNĐ) *`,
    hint: `Nhập tổng chi phí cho ${subject} theo thời gian phục vụ đã ghi, không phải đơn giá một người.${request.isSupplement ? " Không cộng lại chi phí đã xác nhận cho khách cũ." : ""}`,
    note: request.isSupplement ? "Xác nhận phục vụ riêng khách bổ sung trong yêu cầu này. Dịch vụ và giá đã xác nhận cho khách cũ giữ nguyên." : "Xác nhận phục vụ khách trong yêu cầu theo danh sách và thời gian đã ghi."
  };
}
