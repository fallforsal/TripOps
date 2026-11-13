import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { SearchableCombobox, type ComboboxOption } from "@/app/components/common/SearchableCombobox";
import { useAuth } from "@/app/contexts/AuthContext";
import { http } from "@/app/lib/http";
import type { ProvinceOption, WardOption } from "@/app/lib/administrativeLocations";
import {
  formatCustomerAddress,
  getCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from "@/app/services/customerProfile";

interface FormState {
  name: string;
  organizationName: string;
  phone: string;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
}

const toForm = (p: CustomerProfile | null): FormState => ({
  name: p?.name ?? "",
  organizationName: p?.organizationName ?? "",
  phone: p?.phone ?? "",
  addressLine: p?.addressLine ?? "",
  provinceCode: p?.provinceCode ?? "",
  wardCode: p?.wardCode ?? "",
});

const PHONE = /^0[35789]\d{8}$/;
const normalizePhone = (value: string) => {
  let digits = value.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+84")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("84") && digits.length === 11) digits = "0" + digits.slice(2);
  return digits;
};
const message = (e: unknown) =>
  e instanceof TypeError ? "Không kết nối được máy chủ. Vui lòng thử lại." : e instanceof Error ? e.message : "Có lỗi xảy ra.";

const inputClass =
  "w-full h-9 px-3 bg-white disabled:bg-[#F8FAFC] disabled:text-[#64748B] border border-[#CBD5E1] rounded-[6px] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#075985]";

/** Thông tin tài khoản của khách: lưu thật qua API /me/profile; địa chỉ chọn Tỉnh/Thành → Phường/Xã thuộc tỉnh đó. */
export function CustomerProfileCard() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<FormState>(toForm(null));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [provinceState, setProvinceState] = useState<{ loading: boolean; error: string }>({ loading: false, error: "" });
  const [wards, setWards] = useState<{ code: string; rows: WardOption[] }>({ code: "", rows: [] });
  const [wardState, setWardState] = useState<{ loading: boolean; error: string }>({ loading: false, error: "" });
  const [reload, setReload] = useState(0);

  const loadProfile = useCallback(() => {
    setLoading(true);
    setLoadError("");
    getCustomerProfile()
      .then((p) => {
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((e) => setLoadError(message(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(loadProfile, [loadProfile]);

  // Danh sách tỉnh chỉ tải khi bắt đầu sửa.
  useEffect(() => {
    if (!editing || provinces.length) return;
    const abort = new AbortController();
    setProvinceState({ loading: true, error: "" });
    http<ProvinceOption[]>("/locations/provinces", { signal: abort.signal })
      .then((rows) => setProvinces(rows))
      .then(() => setProvinceState({ loading: false, error: "" }))
      .catch((e) => !abort.signal.aborted && setProvinceState({ loading: false, error: message(e) }));
    return () => abort.abort();
  }, [editing, provinces.length, reload]);

  // Chỉ tải phường/xã của đúng tỉnh đang chọn.
  useEffect(() => {
    const code = form.provinceCode;
    if (!editing || !code) {
      setWards({ code: "", rows: [] });
      setWardState({ loading: false, error: "" });
      return;
    }
    if (wards.code === code) return;
    const abort = new AbortController();
    setWardState({ loading: true, error: "" });
    http<WardOption[]>(`/locations/provinces/${code}/wards`, { signal: abort.signal })
      .then((rows) => {
        setWards({ code, rows });
        setWardState({ loading: false, error: "" });
      })
      .catch((e) => !abort.signal.aborted && setWardState({ loading: false, error: message(e) }));
    return () => abort.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, form.provinceCode, reload]);

  const provinceOptions: ComboboxOption[] = useMemo(
    () => provinces.map((p) => ({ value: p.code, label: p.fullName, keywords: p.name })),
    [provinces],
  );
  const wardOptions: ComboboxOption[] = useMemo(
    () => (wards.code === form.provinceCode ? wards.rows.map((w) => ({ value: w.code, label: w.name })) : []),
    [wards, form.provinceCode],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const validate = () => {
    const next: typeof errors = {};
    if (form.name.trim().replace(/\s+/g, " ").length < 2) next.name = "Vui lòng nhập họ và tên (ít nhất 2 ký tự).";
    if (!PHONE.test(normalizePhone(form.phone))) next.phone = "Số điện thoại không hợp lệ (VD 0912345678).";
    if (form.wardCode && !form.provinceCode) next.provinceCode = "Vui lòng chọn tỉnh/thành.";
    if (form.provinceCode && !form.wardCode) next.wardCode = "Vui lòng chọn phường/xã.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const saved = await saveCustomerProfile({
        name: form.name,
        organizationName: form.organizationName.trim() || null,
        phone: normalizePhone(form.phone),
        addressLine: form.addressLine.trim() || null,
        provinceCode: form.provinceCode || null,
        wardCode: form.wardCode || null,
      });
      setProfile(saved);
      setForm(toForm(saved));
      setEditing(false);
      toast.success("Đã cập nhật thông tin tài khoản.");
      refresh().catch(() => undefined); // tên mới hiện ngay trên thanh menu
    } catch (err) {
      toast.error(message(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 flex items-center gap-2 text-xs text-[#64748B]">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thông tin tài khoản…
      </div>
    );
  }
  if (loadError || !profile) {
    return (
      <div className="bg-white border border-rose-200 rounded-[6px] p-6 flex items-center justify-between gap-3 text-xs text-rose-700">
        <span>{loadError || "Không tải được thông tin tài khoản."}</span>
        <Button type="button" variant="outline" onClick={loadProfile} className="h-8 text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Thử lại
        </Button>
      </div>
    );
  }

  const fullAddress = formatCustomerAddress(profile);
  const fieldError = (key: keyof FormState) =>
    errors[key] ? <p className="text-[11px] font-semibold text-rose-600">{errors[key]}</p> : null;

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 shrink-0 rounded-[6px] bg-[#075985] text-white flex items-center justify-center text-2xl font-bold">
            {profile.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0F172A] truncate">{profile.name}</h2>
            <p className="text-xs text-[#475569] truncate">{profile.email}</p>
            {profile.organizationName && (
              <span className="inline-block mt-1 text-[11px] font-semibold text-[#075985] bg-[#F0F9FF] border border-[#BAE6FD] px-2 py-0.5 rounded-[4px]">
                {profile.organizationName}
              </span>
            )}
          </div>
        </div>
        {!editing ? (
          <Button
            type="button"
            onClick={() => {
              setForm(toForm(profile));
              setErrors({});
              setEditing(true);
            }}
            className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-4 rounded-[6px]"
          >
            Chỉnh sửa thông tin
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => {
              setForm(toForm(profile));
              setErrors({});
              setEditing(false);
            }}
            className="border-[#CBD5E1] text-[#0F172A] text-xs h-9 px-4 rounded-[6px]"
          >
            Hủy thay đổi
          </Button>
        )}
      </div>

      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label htmlFor="cp-name" className="font-semibold text-[#0F172A]">Họ và tên / Tên đại diện:</label>
            <input id="cp-name" className={inputClass} disabled={!editing || saving} maxLength={100}
              value={editing ? form.name : profile.name} onChange={(e) => set("name", e.target.value)} />
            {fieldError("name")}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cp-org" className="font-semibold text-[#0F172A]">Tên cơ quan / Doanh nghiệp:</label>
            <input id="cp-org" className={inputClass} disabled={!editing || saving} maxLength={200}
              placeholder={editing ? "Không bắt buộc" : "Chưa cập nhật"}
              value={editing ? form.organizationName : profile.organizationName ?? ""}
              onChange={(e) => set("organizationName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cp-email" className="font-semibold text-[#0F172A]">Email:</label>
            <input id="cp-email" className={`${inputClass} cursor-not-allowed`} disabled value={profile.email} />
            {editing && <p className="text-[11px] text-[#64748B]">Email dùng để đăng nhập nên không đổi ở đây.</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cp-phone" className="font-semibold text-[#0F172A]">Số điện thoại liên hệ:</label>
            <input id="cp-phone" className={inputClass} disabled={!editing || saving} inputMode="tel" maxLength={20}
              placeholder={editing ? "VD 0912345678" : "Chưa cập nhật"}
              value={editing ? form.phone : profile.phone ?? ""}
              onChange={(e) => set("phone", e.target.value.replace(/[^\d+\s.\-()]/g, ""))} />
            {fieldError("phone")}
          </div>

          {!editing ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="cp-address-view" className="font-semibold text-[#0F172A]">Địa chỉ:</label>
              <input id="cp-address-view" className={inputClass} disabled value={fullAddress} placeholder="Chưa cập nhật" />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="cp-province" className="font-semibold text-[#0F172A]">Tỉnh / Thành phố:</label>
                <SearchableCombobox
                  id="cp-province"
                  options={provinceOptions}
                  value={form.provinceCode}
                  loading={provinceState.loading}
                  disabled={saving}
                  invalid={!!errors.provinceCode}
                  placeholder="Gõ để tìm, VD: Hồ Chí Minh, Hà Nội"
                  onChange={(code) => {
                    setForm((f) => ({ ...f, provinceCode: code, wardCode: code === f.provinceCode ? f.wardCode : "" }));
                    setErrors((x) => ({ ...x, provinceCode: undefined, wardCode: undefined }));
                  }}
                />
                {provinceState.error && (
                  <p className="text-[11px] text-rose-600">
                    {provinceState.error}{" "}
                    <button type="button" className="underline font-semibold" onClick={() => setReload((n) => n + 1)}>Thử lại</button>
                  </p>
                )}
                {fieldError("provinceCode")}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="cp-ward" className="font-semibold text-[#0F172A]">Phường / Xã:</label>
                <SearchableCombobox
                  id="cp-ward"
                  options={wardOptions}
                  value={form.wardCode}
                  loading={!!form.provinceCode && wardState.loading}
                  disabled={saving || !form.provinceCode}
                  invalid={!!errors.wardCode}
                  placeholder={form.provinceCode ? "Gõ để tìm phường/xã" : "Chọn tỉnh/thành trước"}
                  onChange={(code) => set("wardCode", code)}
                />
                {wardState.error && (
                  <p className="text-[11px] text-rose-600">
                    {wardState.error}{" "}
                    <button type="button" className="underline font-semibold" onClick={() => setReload((n) => n + 1)}>Thử lại</button>
                  </p>
                )}
                {fieldError("wardCode")}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="cp-street" className="font-semibold text-[#0F172A]">Số nhà, tên đường:</label>
                <input id="cp-street" className={inputClass} disabled={saving} maxLength={255}
                  placeholder="VD: 12 Lê Lợi" value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} />
                <p className="text-[11px] text-[#64748B]">
                  Theo danh mục hành chính hiện hành, địa chỉ gồm Tỉnh/Thành phố và Phường/Xã (không còn cấp Quận/Huyện).
                </p>
              </div>
            </>
          )}
        </div>

        {editing && (
          <div className="flex justify-end pt-3 border-t border-[#F1F5F9]">
            <Button type="submit" disabled={saving}
              className="bg-[#075985] hover:bg-[#0C4A6E] text-white text-xs h-9 px-5 rounded-[6px] font-semibold">
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
