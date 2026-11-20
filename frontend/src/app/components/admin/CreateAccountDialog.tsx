import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { adminAccountService, type AdminAccount, type CreateAdminAccountInput } from "@/app/services/adminAccountService";

const empty: CreateAdminAccountInput = { name: "", email: "", phone: "", password: "", role: "user" };

export function CreateAccountDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateAdminAccountInput>(empty);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agencies, setAgencies] = useState<AdminAccount[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const business = form.role === "agency" || form.role === "provider";

  useEffect(() => {
    if (open) { setForm({ ...empty }); setConfirmation(""); setError(""); }
  }, [open]);

  useEffect(() => {
    if (!open || form.role !== "guide") return;
    const controller = new AbortController();
    setLoadingAgencies(true);
    setAgencies([]);
    void (async () => {
      const rows: AdminAccount[] = [];
      for (let page = 1; ; page++) {
        const result = await adminAccountService.list(new URLSearchParams({ role: "agency", status: "active", page: String(page), pageSize: "100" }), controller.signal);
        rows.push(...result.items.filter(a => a.business?.status === "approved"));
        if (page * result.pageSize >= result.total) break;
      }
      if (!controller.signal.aborted) setAgencies(rows);
    })().catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Không thể tải Agency.");
    }).finally(() => { if (!controller.signal.aborted) setLoadingAgencies(false); });
    return () => controller.abort();
  }, [open, form.role]);

  const update = (key: keyof CreateAdminAccountInput, value: string) => {
    setForm(current => ({ ...current, [key]: value })); setError("");
  };
  const field = (key: keyof CreateAdminAccountInput, label: string, maxLength: number, type = "text", minLength?: number) => (
    <div className="space-y-1.5" key={key}>
      <Label htmlFor={`create-${key}`}>{label} *</Label>
      <Input id={`create-${key}`} type={type} required maxLength={maxLength} minLength={minLength}
        value={form[key] ?? ""} onChange={e => update(key, e.target.value)}
        autoComplete={key === "password" ? "new-password" : "off"} />
    </div>
  );

  return <Dialog open={open} onOpenChange={value => { if (!value && !busy) onClose(); }}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white">
      <DialogHeader>
        <DialogTitle>Tạo tài khoản</DialogTitle>
        <DialogDescription>Tài khoản được kích hoạt ngay. Hồ sơ doanh nghiệp do Admin tạo được duyệt sẵn.</DialogDescription>
      </DialogHeader>
      <form className="space-y-5" onSubmit={async e => {
        e.preventDefault();
        if (busy) return;
        if (form.password !== confirmation) { setError("Xác nhận mật khẩu không khớp."); return; }
        setBusy(true); setError("");
        try {
          await adminAccountService.create({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
            password: form.password, role: form.role,
            ...(business ? { businessName: form.businessName?.trim(), taxCode: form.taxCode?.trim(),
              businessAddress: form.businessAddress?.trim(), businessLicenseUrl: form.businessLicenseUrl?.trim(), description: form.description?.trim() } : {}),
            ...(form.role === "guide" ? { agencyId: form.agencyId } : {}) });
          onCreated(); onClose();
        } catch (e) { setError(e instanceof Error ? e.message : "Không thể tạo tài khoản."); }
        finally { setBusy(false); }
      }}>
        <fieldset disabled={busy} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-role">Vai trò *</Label>
            <select id="create-role" value={form.role} onChange={e => update("role", e.target.value)} className="w-full rounded-md border px-3 py-2">
              <option value="user">Khách hàng</option><option value="agency">Công ty lữ hành</option>
              <option value="provider">Nhà cung cấp</option><option value="guide">Hướng dẫn viên</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("name", "Họ và tên", 150, "text", 2)}
            {field("email", "Email", 191, "email")}
            {field("phone", "Số điện thoại", 30, "tel")}
            {field("password", "Mật khẩu (8–128 ký tự)", 128, "password", 8)}
            <div className="space-y-1.5"><Label htmlFor="create-confirm">Xác nhận mật khẩu *</Label>
              <Input id="create-confirm" type="password" required maxLength={128} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} />
            </div>
          </div>
          {business && <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold">Thông tin doanh nghiệp</h3>
            {field("businessName", "Tên doanh nghiệp", 255)}
            {field("taxCode", "Mã số thuế", 50)}
            {field("businessAddress", "Địa chỉ doanh nghiệp", 2000)}
            {field("businessLicenseUrl", "Liên kết ảnh giấy phép kinh doanh", 2000, "url")}
            <div className="space-y-1.5"><Label htmlFor="create-description">Mô tả</Label>
              <Textarea id="create-description" maxLength={5000} value={form.description ?? ""} onChange={e => update("description", e.target.value)} />
            </div>
          </div>}
          {form.role === "guide" && <div className="space-y-1.5"><Label htmlFor="create-agency">Agency quản lý *</Label>
            <select id="create-agency" required disabled={loadingAgencies} value={form.agencyId ?? ""} onChange={e => update("agencyId", e.target.value)} className="w-full rounded-md border px-3 py-2">
              <option value="">{loadingAgencies ? "Đang tải..." : "Chọn Agency đã được duyệt"}</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.business?.businessName || a.name} ({a.email})</option>)}
            </select>
          </div>}
        </fieldset>
        {error && <NotificationMessage tone="error" message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={busy || (form.role === "guide" && loadingAgencies)} className="bg-[#075985] text-white hover:bg-[#0369a1]">{busy ? "Đang tạo..." : "Tạo tài khoản"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
