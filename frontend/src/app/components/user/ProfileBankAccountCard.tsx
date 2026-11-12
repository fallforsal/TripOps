import { useEffect, useState } from "react";
import { Landmark, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { BankCombobox } from "@/app/components/common/BankCombobox";
import { AccountHolderInput } from "@/app/components/common/AccountHolderInput";
import { finalHolderName, toAccountNumber } from "@/app/lib/bankAccountText";
import {
  clearMyBankAccount,
  getMyBankAccount,
  saveMyBankAccount,
  type ProfileBankAccount,
} from "@/app/services/profileBankAccount";

const message = (error: unknown) =>
  error instanceof TypeError ? "Không kết nối được máy chủ. Vui lòng thử lại." : error instanceof Error ? error.message : "Có lỗi xảy ra.";

/**
 * Hồ sơ khách: tài khoản ngân hàng nhận tiền hoàn.
 * Nhập ở đây hoặc nhập lúc yêu cầu hoàn tiền đều được lưu vào hồ sơ và tự điền cho lần sau.
 */
export function ProfileBankAccountCard() {
  const [saved, setSaved] = useState<ProfileBankAccount | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fill = (account: ProfileBankAccount | null) => {
    setSaved(account);
    setBankName(account?.bankName ?? "");
    setAccountNumber(account?.accountNumber ?? "");
    setHolder(account?.accountHolder ?? "");
  };

  useEffect(() => {
    let alive = true;
    getMyBankAccount()
      .then((account) => alive && fill(account))
      .catch((e) => alive && setError(message(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const changed =
    bankName !== (saved?.bankName ?? "") ||
    accountNumber !== (saved?.accountNumber ?? "") ||
    finalHolderName(holder) !== (saved?.accountHolder ?? "");

  const save = async () => {
    setError("");
    if (!bankName) return setError("Vui lòng chọn ngân hàng.");
    if (!/^\d{6,30}$/.test(accountNumber)) return setError("Số tài khoản chỉ gồm 6–30 chữ số.");
    if (finalHolderName(holder).length < 2) return setError("Vui lòng nhập tên chủ tài khoản.");
    setBusy(true);
    try {
      fill(await saveMyBankAccount(bankName, accountNumber, finalHolderName(holder)));
      toast.success("Đã lưu tài khoản ngân hàng vào hồ sơ.");
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await clearMyBankAccount();
      fill(null);
      toast.success("Đã xóa tài khoản ngân hàng khỏi hồ sơ.");
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[#075985]" />
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wide">Tài khoản nhận tiền hoàn</h3>
        </div>
        {saved?.hasAccount && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[4px]">
            Đã lưu
          </span>
        )}
      </div>
      <p className="text-xs text-[#475569]">
        Dùng để nhận tiền khi hủy tour hoặc được hoàn tiền. Khi gửi yêu cầu hoàn tiền, thông tin này được điền sẵn; nếu bạn
        nhập tài khoản khác ở đó, hồ sơ cũng tự cập nhật theo.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="profile-bank" className="font-semibold text-[#0F172A]">Ngân hàng</label>
            <BankCombobox id="profile-bank" value={bankName} onChange={setBankName} disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="profile-account" className="font-semibold text-[#0F172A]">Số tài khoản</label>
            <Input
              id="profile-account"
              inputMode="numeric"
              value={accountNumber}
              disabled={busy}
              onChange={(e) => setAccountNumber(toAccountNumber(e.target.value))}
              placeholder="VD 0123456789"
              className="h-10 rounded-[6px] text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="profile-holder" className="font-semibold text-[#0F172A]">Tên chủ tài khoản</label>
            <AccountHolderInput
              id="profile-holder"
              value={holder}
              disabled={busy}
              onChange={setHolder}
              placeholder="VD NGUYEN VAN A"
              className="h-10 rounded-[6px] text-xs"
            />
          </div>
        </div>
      )}

      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
        {saved?.hasAccount && (
          <Button type="button" variant="outline" disabled={busy} onClick={remove} className="border-[#CBD5E1] text-xs h-9 px-4 rounded-[6px]">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa
          </Button>
        )}
        <Button
          type="button"
          disabled={busy || loading || !changed}
          onClick={save}
          className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-5 rounded-[6px] font-semibold"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
          Lưu
        </Button>
      </div>
    </div>
  );
}
