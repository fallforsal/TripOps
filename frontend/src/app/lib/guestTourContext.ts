/**
 * Ngữ cảnh "danh sách tour vừa gợi ý" của Guest AI: chỉ giữ ID (tối đa 8, số nguyên dương, không trùng).
 * Máy chủ tự tải lại và kiểm tra các tour này; frontend không gửi giá hay nội dung tour.
 */
export const MAX_CONTEXT_TOURS = 8;

export function cleanTourIds(ids: readonly number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, MAX_CONTEXT_TOURS);
}

/**
 * Danh sách cần giữ sau một câu trả lời: ưu tiên danh sách máy chủ trả về (kể cả rỗng = không còn danh sách);
 * máy chủ cũ không có trường này thì lấy theo thẻ tour vừa hiện, không có thẻ thì giữ danh sách cũ.
 */
export function nextTourContext(
  previous: readonly number[],
  answer: { tours: readonly { id: number }[]; contextTourIds?: readonly number[] | null },
): number[] {
  if (answer.contextTourIds) return cleanTourIds(answer.contextTourIds);
  if (answer.tours.length > 0) return cleanTourIds(answer.tours.map((t) => t.id));
  return cleanTourIds(previous);
}
