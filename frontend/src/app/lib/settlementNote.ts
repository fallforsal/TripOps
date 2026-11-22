/** Các trường của một khoản quyết toán cần để viết chú thích số tiền. */
type SettlementLike = {
  grossAmount: number;
  customerPaid: number;
  fromCancellation?: boolean;
  cancellationFeeRetained?: number;
};

/**
 * Dòng chú thích dưới số tiền: đơn hoàn thành ghi tiền khách trả (và phần chia nếu là tour liên minh);
 * đơn đã hủy ghi phí hủy giữ lại (và phần chia của Agency này trong phí hủy).
 */
export function settlementAmountNote(s: SettlementLike, format: (n: number) => string): string {
  const percent = (part: number, whole: number) =>
    whole > 0 && Math.round(part) < Math.round(whole) ? Math.round((part * 100) / whole) : null;
  if (s.fromCancellation) {
    const retained = s.cancellationFeeRetained ?? s.grossAmount;
    const share = percent(s.grossAmount, retained);
    return share !== null ? `Phần chia ${share}% · phí hủy giữ lại ${format(retained)}` : `Phí hủy giữ lại ${format(retained)}`;
  }
  const share = percent(s.grossAmount, s.customerPaid);
  return share !== null ? `Phần chia ${share}% · khách trả ${format(s.customerPaid)}` : `Khách đã trả ${format(s.customerPaid)}`;
}
