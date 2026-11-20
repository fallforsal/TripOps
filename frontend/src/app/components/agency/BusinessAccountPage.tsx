import { NotificationMessage } from "@/app/components/ui/NotificationMessage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  FileCheck,
  FileText,
  ImagePlus,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Store,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { partnerService, type BusinessAccount } from "@/app/services/partnerService";

const STATUS = {
  approved: { label: "Đang hoạt động", cls: "bg-emerald-50 text-emerald-700 border-emerald-300", Icon: CheckCircle2 },
  pending: { label: "Đang chờ xét duyệt", cls: "bg-amber-50 text-amber-700 border-amber-300", Icon: Clock },
  rejected: { label: "Đã bị từ chối", cls: "bg-rose-50 text-rose-700 border-rose-300", Icon: XCircle },
  suspended: { label: "Đình chỉ", cls: "bg-slate-100 text-slate-700 border-slate-300", Icon: Ban },
} as const;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const toForm = (a: BusinessAccount) => ({
  name: a.name ?? "",
  phone: a.phone ?? "",
  businessName: a.businessProfile?.businessName ?? "",
  taxCode: a.businessProfile?.taxCode ?? "",
  businessAddress: a.businessProfile?.businessAddress ?? "",
  description: a.businessProfile?.description ?? "",
});

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return url;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[11px] text-slate-400 font-semibold block uppercase">{label}</span>
      <div className="mt-0.5 text-slate-900">{children}</div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function BusinessAccountPage({
  account,
  onUpdated,
}: {
  account: BusinessAccount;
  onUpdated: (account: BusinessAccount) => void;
}) {
  const profile = account.businessProfile;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(account));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const licenseInput = useRef<HTMLInputElement>(null);
  const logoPreview = useObjectUrl(logoFile);
  const licensePreview = useObjectUrl(licenseFile);

  if (!profile) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-sm text-slate-600">
        Tài khoản chưa có hồ sơ doanh nghiệp. Hãy nộp hồ sơ để được xét duyệt.
      </div>
    );
  }

  const status = STATUS[profile.status as keyof typeof STATUS] ?? STATUS.pending;
  const canEdit = profile.status !== "suspended";
  const legalLocked = profile.status === "pending";
  const legalChanged =
    form.businessName.trim() !== profile.businessName ||
    form.taxCode.trim() !== profile.taxCode ||
    form.businessAddress.trim() !== profile.businessAddress ||
    licenseFile !== null;
  const logoSrc = removeLogo ? undefined : (logoPreview ?? profile.logoUrl);
  const licenseSrc = licensePreview ?? profile.businessLicenseUrl;
  const set = (key: keyof ReturnType<typeof toForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickImage = (file: File | undefined, maxMb: number, apply: (f: File) => void) => {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return setError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    if (file.size > maxMb * 1024 * 1024) return setError(`Ảnh không được vượt quá ${maxMb}MB.`);
    setError("");
    apply(file);
  };

  const reset = (source: BusinessAccount) => {
    setForm(toForm(source));
    setLogoFile(null);
    setLicenseFile(null);
    setRemoveLogo(false);
    setError("");
    setEditing(false);
  };

  const save = async (confirmReview: boolean) => {
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("Name", form.name.trim());
      body.append("Phone", form.phone.trim());
      body.append("BusinessName", form.businessName.trim());
      body.append("TaxCode", form.taxCode.trim());
      body.append("BusinessAddress", form.businessAddress.trim());
      body.append("Description", form.description.trim());
      body.append("ConfirmReview", String(confirmReview));
      body.append("RemoveLogo", String(removeLogo));
      if (logoFile) body.append("Logo", logoFile);
      if (licenseFile) body.append("License", licenseFile);
      const updated = await partnerService.updateMine(body);
      onUpdated(updated);
      reset(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu thay đổi.");
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const handleSave = () => {
    const required = [form.name, form.phone, form.businessName, form.taxCode, form.businessAddress];
    if (required.some((v) => !v.trim())) return setError("Vui lòng điền đầy đủ các trường bắt buộc.");
    if (profile.status === "approved" && legalChanged) return setConfirming(true);
    void save(false);
  };

  return (
    <div className="space-y-5">
      {/* Đầu trang: logo + tên + trạng thái */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="w-24 h-24 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
          {logoSrc ? (
            <img src={logoSrc} alt={`Logo ${profile.businessName}`} className="w-full h-full object-contain" />
          ) : profile.businessName ? (
            <span className="text-3xl font-black text-slate-400">{profile.businessName.trim().charAt(0).toUpperCase()}</span>
          ) : null}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">{profile.businessName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border bg-slate-50 text-slate-700 border-slate-200">
              {account.role === "agency" ? <Compass className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
              {account.role === "agency" ? "Công ty lữ hành" : "Nhà cung cấp dịch vụ"}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.cls}`}>
              <status.Icon className="w-3.5 h-3.5" />
              {status.label}
            </span>
          </div>
        </div>
        {!editing && (
          <Button type="button" variant="outline" disabled={!canEdit} onClick={() => setEditing(true)} className="rounded-xl gap-1.5">
            <Pencil className="w-4 h-4" />
            Chỉnh sửa hồ sơ
          </Button>
        )}
      </div>

      {profile.status === "rejected" && profile.rejectionReason && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>Hồ sơ bị từ chối: {profile.rejectionReason}. Hãy sửa thông tin và lưu để gửi duyệt lại.</span>
        </div>
      )}
      {profile.status === "pending" && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          Hồ sơ đang chờ duyệt. Bạn vẫn sửa được logo, mô tả và thông tin liên hệ; thông tin pháp lý bị khóa cho đến khi có kết quả.
        </div>
      )}
      {profile.status === "suspended" && (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-slate-800">
          Doanh nghiệp đang bị đình chỉ nên không thể chỉnh sửa hồ sơ. Vui lòng liên hệ ban quản trị TripOps.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 space-y-5">
          <Card icon={<Building2 className="w-4 h-4 text-[#075985]" />} title="Thông tin pháp nhân doanh nghiệp">
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tên cơ sở kinh doanh">
                  {editing ? (
                    <Input value={form.businessName} onChange={set("businessName")} disabled={legalLocked} maxLength={200} className="text-xs h-9" />
                  ) : (
                    <span className="font-bold text-sm">{profile.businessName}</span>
                  )}
                </Field>
                <Field label="Mã số thuế (MST)">
                  {editing ? (
                    <Input value={form.taxCode} onChange={set("taxCode")} disabled={legalLocked} maxLength={20} className="text-xs h-9 font-mono" />
                  ) : (
                    <span className="font-mono font-black text-sm bg-slate-100 px-2.5 py-1 rounded-lg inline-block border border-slate-200">{profile.taxCode}</span>
                  )}
                </Field>
              </div>
              <Field label="Địa chỉ trụ sở kinh doanh">
                {editing ? (
                  <Input value={form.businessAddress} onChange={set("businessAddress")} disabled={legalLocked} maxLength={300} className="text-xs h-9" />
                ) : (
                  <div className="flex items-start gap-1.5 font-medium text-slate-800">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{profile.businessAddress}</span>
                  </div>
                )}
              </Field>
              <Field label="Giới thiệu năng lực hoạt động">
                {editing ? (
                  <Textarea value={form.description} onChange={set("description")} rows={3} maxLength={2000} className="text-xs resize-none" />
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed">
                    {profile.description || "Chưa có mô tả."}
                  </div>
                )}
              </Field>
            </div>
          </Card>

          <Card icon={<UserCheck className="w-4 h-4 text-[#075985]" />} title="Người đại diện & Thông tin liên hệ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Field label="Họ và tên người đại diện">
                {editing ? (
                  <Input value={form.name} onChange={set("name")} maxLength={100} className="text-xs h-9" />
                ) : (
                  <span className="font-bold text-sm">{account.name}</span>
                )}
              </Field>
              <Field label="Số điện thoại liên hệ">
                {editing ? (
                  <Input value={form.phone} onChange={set("phone")} maxLength={20} inputMode="tel" className="text-xs h-9 font-mono" />
                ) : (
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{account.phone}</span>
                  </div>
                )}
              </Field>
              <div className="sm:col-span-2">
                <Field label="Email đăng nhập tài khoản">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{account.email}</span>
                  </div>
                  {editing && <p className="text-[11px] text-slate-400 mt-1">Email là tên đăng nhập nên không đổi được tại đây.</p>}
                </Field>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-5">
          <Card icon={<ImagePlus className="w-4 h-4 text-[#075985]" />} title="Logo doanh nghiệp">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                {logoSrc ? <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" /> : <ImagePlus className="w-6 h-6 text-slate-300" />}
              </div>
              <div className="text-xs text-slate-500 space-y-2">
                <p>JPG, PNG hoặc WebP, tối đa 2MB. Nên dùng ảnh vuông, nền sáng.</p>
                {editing && (
                  <div className="flex flex-wrap gap-2">
                    <input ref={logoInput} type="file" accept={IMAGE_TYPES.join(",")} hidden
                      onChange={(e) => { pickImage(e.target.files?.[0], 2, (f) => { setLogoFile(f); setRemoveLogo(false); }); e.target.value = ""; }} />
                    <Button type="button" size="sm" variant="outline" onClick={() => logoInput.current?.click()} className="h-8 text-xs rounded-lg">
                      {logoSrc ? "Đổi logo" : "Tải logo lên"}
                    </Button>
                    {logoSrc && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setLogoFile(null); setRemoveLogo(true); }}
                        className="h-8 text-xs rounded-lg text-rose-700 border-rose-300 hover:bg-rose-50 gap-1">
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa logo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card icon={<FileCheck className="w-4 h-4 text-emerald-600" />} title="Hồ sơ pháp lý">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs">Ảnh giấy phép kinh doanh</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {licenseFile ? "Ảnh mới, chưa lưu" : "Bản chụp do đối tác cung cấp"}
                  </div>
                </div>
              </div>
              {licenseSrc && <img src={licenseSrc} alt="Ảnh giấy phép kinh doanh" className="max-h-56 w-full object-contain rounded-xl bg-white" />}
              <div className="flex flex-wrap gap-2">
                {profile.businessLicenseUrl && !licenseFile && (
                  <a href={profile.businessLicenseUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                    <ExternalLink className="w-4 h-4 text-[#075985]" />
                    Mở tài liệu gốc
                  </a>
                )}
                {editing && !legalLocked && (
                  <>
                    <input ref={licenseInput} type="file" accept={IMAGE_TYPES.join(",")} hidden
                      onChange={(e) => { pickImage(e.target.files?.[0], 5, setLicenseFile); e.target.value = ""; }} />
                    <Button type="button" size="sm" variant="outline" onClick={() => licenseInput.current?.click()} className="h-9 text-xs rounded-xl">
                      Thay ảnh giấy phép
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {editing && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs">
            {error ? (
              <p role="alert" className="text-rose-700 font-semibold">{error}</p>
            ) : legalChanged ? (
              <p className="text-amber-800">Bạn đã đổi thông tin pháp lý, hồ sơ sẽ được gửi duyệt lại khi lưu.</p>
            ) : (
              <p className="text-slate-500">Thay đổi logo, mô tả và liên hệ có hiệu lực ngay.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => reset(account)} className="rounded-xl">Hủy</Button>
            <Button type="button" disabled={saving} onClick={handleSave} className="rounded-xl bg-[#075985] hover:bg-[#0C4A6E] text-white">
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirming} onOpenChange={(open) => !open && !saving && setConfirming(false)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Gửi hồ sơ duyệt lại?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Bạn đã đổi tên, mã số thuế, địa chỉ hoặc giấy phép kinh doanh.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            Hồ sơ chuyển sang trạng thái chờ duyệt và quyền bán tour, nhận đặt chỗ có thể bị tạm dừng cho đến khi quản trị viên duyệt xong.
          </div>
          {error && <NotificationMessage tone="error" message={error} />}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setConfirming(false)} className="rounded-xl">Quay lại</Button>
            <Button type="button" disabled={saving} onClick={() => void save(true)} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
              {saving ? "Đang lưu..." : "Lưu và gửi duyệt lại"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}