/**
 * Nhãn nguồn của khách sạn / nhà hàng không thuộc dịch vụ Provider trên sàn:
 *  - có agencySupplierId: lấy từ danh bạ nhà cung cấp của Agency;
 *  - ghi chú bắt đầu "Gợi ý ngoài TripOps": AI gợi ý khi danh bạ và sàn không có lựa chọn phù hợp (cần Agency xác minh);
 *  - còn lại: Agency tự nhập ngoài sàn.
 * Trước đây mọi mục loại này đều hiện "Nhà cung cấp của agency" nên gợi ý của AI trông như lấy từ danh bạ.
 */
export const AI_EXTERNAL_NOTE = "Gợi ý ngoài TripOps";

type SupplierLike = {
  agencySupplierId?: number | string | null;
  description?: string | null;
  address?: string | null;
  supplier?: { conditions?: string | null; address?: string | null } | null;
};

export type SupplierKind = "directory" | "ai" | "manual";

export function supplierKind(item: SupplierLike | null | undefined): SupplierKind {
  if (item?.agencySupplierId) return "directory";
  const text = [item?.description, item?.address, item?.supplier?.conditions, item?.supplier?.address].filter(Boolean).join(" ");
  return text.includes(AI_EXTERNAL_NOTE) ? "ai" : "manual";
}

/** Dòng nhãn trên thẻ (thay cho "Nhà cung cấp của agency"). */
export function supplierLabel(item: SupplierLike | null | undefined): string {
  switch (supplierKind(item)) {
    case "directory": return "Nhà cung cấp trong danh bạ";
    case "ai": return "AI gợi ý · chưa có trong danh bạ";
    default: return "Agency tự nhập ngoài sàn";
  }
}

/** Chữ ngắn trong chip / ô ảnh của thẻ. */
export function supplierTag(item: SupplierLike | null | undefined): string {
  switch (supplierKind(item)) {
    case "directory": return "Danh bạ";
    case "ai": return "Gợi ý AI";
    default: return "Ngoài sàn";
  }
}

type DraftLike = {
  timelines?: {
    meals?: { agencySupplierId?: number | null; serviceId?: number | null }[] | null;
    accommodations?: { agencySupplierId?: number | null; serviceId?: number | null }[] | null;
  }[] | null;
};

/** Đếm chỗ ở, bữa ăn trong khung tour AI soạn theo nguồn: danh bạ của Agency, dịch vụ trên TripOps, gợi ý bên ngoài. */
export function countDraftSources(draft: DraftLike) {
  const items = (draft.timelines ?? []).flatMap((d) => [...(d.meals ?? []), ...(d.accommodations ?? [])]);
  const directory = items.filter((i) => i.agencySupplierId).length;
  const platform = items.filter((i) => !i.agencySupplierId && i.serviceId).length;
  return { directory, platform, external: items.length - directory - platform, total: items.length };
}

/** Câu chat sau khi AI soạn xong: nói đúng số chỗ ăn ở lấy từ danh bạ / TripOps / gợi ý ngoài. */
export function draftSourceMessage(draft: DraftLike): string {
  const { directory, platform, external, total } = countDraftSources(draft);
  if (total === 0)
    return "Mình đã soạn xong khung lịch trình. Chưa chọn được chỗ ở, ăn uống nào, bạn thêm trong trang chỉnh sửa nhé. Bạn xem qua, ưng thì mở để chỉnh sửa, chưa ưng thì tạo lại:";
  const parts = [
    directory > 0 && `${directory} mục từ danh bạ nhà cung cấp của bạn`,
    platform > 0 && `${platform} mục là dịch vụ trên TripOps`,
    external > 0 && `${external} mục là gợi ý bên ngoài (chưa có trong danh bạ, cần xác minh và nhập giá)`,
  ].filter(Boolean);
  const noDirectory = directory === 0
    ? " Danh bạ của bạn chưa có khách sạn, nhà hàng phù hợp ở khu vực này nên mình chưa dùng được."
    : "";
  return `Mình đã soạn xong khung tour kèm chỗ ở và ăn uống: ${parts.join(", ")}.${noDirectory} Bạn xem qua, ưng thì mở để chỉnh sửa, chưa ưng thì tạo lại:`;
}
