import { http } from "@/app/lib/http";

/** Tài khoản ngân hàng nhận tiền hoàn lưu trong hồ sơ người dùng (khách). */
export interface ProfileBankAccount {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  updatedAt: string | null;
  hasAccount: boolean;
}

export const getMyBankAccount = () => http<ProfileBankAccount>("/me/bank-account");

export const saveMyBankAccount = (bankName: string, accountNumber: string, accountHolder: string) =>
  http<ProfileBankAccount>("/me/bank-account", {
    method: "PUT",
    body: JSON.stringify({ bankName, accountNumber, accountHolder }),
  });

export const clearMyBankAccount = () => http<void>("/me/bank-account", { method: "DELETE" });

/** Đọc tài khoản đã lưu để tự điền form hoàn tiền; lỗi mạng/chưa đăng nhập thì bỏ qua. */
export async function loadSavedBankAccount(): Promise<ProfileBankAccount | null> {
  try {
    const account = await getMyBankAccount();
    return account.hasAccount ? account : null;
  } catch {
    return null;
  }
}
