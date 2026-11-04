import { useEffect, useState } from "react";
import { BookUser, Eye, Hotel, Loader2, MapPin, Pencil, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import type { AgencySupplier, SupplierInput } from "@/app/services/wf02Tours";
import { agencySuppliers, deleteAgencySupplier, getAgencySupplier, updateAgencySupplier } from "@/app/services/wf02Tours";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

type Filter = "ALL" | AgencySupplier["type"];
const money = (value?: number | null) => value == null ? "Chưa cập nhật" : `${value.toLocaleString("vi-VN")}đ`;
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "HOTEL", label: "Lưu trú" },
  { value: "RESTAURANT", label: "Ẩm thực" },
];

function SupplierCategory({ type }: { type: AgencySupplier["type"] }) {
  const isHotel = type === "HOTEL";
  const Icon = isHotel ? Hotel : UtensilsCrossed;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${isHotel ? "border-sky-200 bg-sky-50 text-sky-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}>
      <Icon className="h-3.5 w-3.5" />{isHotel ? "Lưu trú" : "Ẩm thực"}
    </span>
  );
}

export function AgencySupplierDirectory() {
  const [suppliers, setSuppliers] = useState<AgencySupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [viewing, setViewing] = useState<AgencySupplier | null>(null);
  const [editing, setEditing] = useState<AgencySupplier | null>(null);
  const [draft, setDraft] = useState<SupplierInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleting, setDeleting] = useState<AgencySupplier | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    agencySuppliers(undefined, "", controller.signal)
      .then((items) => { if (!controller.signal.aborted) setSuppliers(items); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Không thể tải danh bạ nhà cung cấp."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const viewSupplier = async (supplier: AgencySupplier) => {
    setLoadingDetailId(supplier.id);
    try { setViewing(await getAgencySupplier(supplier.id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tải thông tin nhà cung cấp."); }
    finally { setLoadingDetailId(null); }
  };
  const editSupplier = async (supplier: AgencySupplier) => {
    setLoadingDetailId(supplier.id); setEditError("");
    try {
      const full = await getAgencySupplier(supplier.id);
      setEditing(full);
      setDraft({ type: full.type, name: full.name, address: full.address || "", area: full.area || "",
        contactName: full.contactName || "", contactPhone: full.contactPhone || "",
        contactEmail: full.contactEmail || "", starRating: full.starRating,
        referencePrice: full.referencePrice, conditions: full.conditions || "", notes: full.notes || "",
        status: full.status });
      setViewing(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tải nhà cung cấp."); }
    finally { setLoadingDetailId(null); }
  };
  const saveSupplier = async () => {
    if (!editing || !draft || saving) return;
    if (!draft.name?.trim() || !draft.area?.trim() && !draft.address?.trim() ||
        !draft.referencePrice || draft.referencePrice <= 0) {
      setEditError("Cần tên, địa chỉ hoặc khu vực, và giá tham khảo lớn hơn 0."); return;
    }
    setSaving(true); setEditError("");
    try {
      const updated = await updateAgencySupplier(editing.id, draft);
      setSuppliers((items) => updated.status === "ARCHIVED"
        ? items.filter((item) => item.id !== updated.id)
        : items.map((item) => item.id === updated.id ? updated : item));
      setEditing(null); setDraft(null); toast.success("Đã cập nhật nhà cung cấp.");
    } catch (error) { setEditError(error instanceof Error ? error.message : "Không thể cập nhật nhà cung cấp."); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    if (!deleting || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteAgencySupplier(deleting.id);
      setSuppliers((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast.success(`Đã xóa ${deleting.name} khỏi danh bạ.`);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Không thể xóa nhà cung cấp. Vui lòng thử lại.");
    } finally { setIsDeleting(false); }
  };
  const query = normalize(search.trim());
  const visible = suppliers.filter((supplier) =>
    (filter === "ALL" || supplier.type === filter) &&
    (!query || normalize([supplier.name, supplier.area, supplier.address, supplier.contactName, supplier.contactPhone, supplier.contactEmail].filter(Boolean).join(" ")).includes(query)),
  );

  const resetFilters = () => { setSearch(""); setFilter("ALL"); };

  return (
    <div className="space-y-5 text-[#0F172A]">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[#CBD5E1] bg-white px-6 py-5">
        <div className="max-w-3xl">
          <h1 className="flex items-center gap-2.5 font-serif text-2xl font-bold text-[#075985]">
            <BookUser className="h-6 w-6 shrink-0" />Danh bạ nhà cung cấp
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Khách sạn và nhà hàng riêng của Agency, lưu lại để lựa chọn khi thiết kế tour.</p>
        </div>
      </header>

      <section aria-label="Danh sách nhà cung cấp" className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-3xl lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input aria-label="Tìm nhà cung cấp" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên nhà cung cấp, khu vực, số điện thoại..." className="h-10 border-slate-300 pl-9 text-sm" />
          </div>
          <div role="group" aria-label="Lọc theo loại nhà cung cấp" className="flex shrink-0 flex-wrap gap-1 self-start rounded-lg bg-slate-100 p-1">
            {filters.map((item) => {
              const count = item.value === "ALL" ? suppliers.length : suppliers.filter((s) => s.type === item.value).length;
              return (
                <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 ${filter === item.value ? "bg-[#075985] text-white" : "text-slate-600 hover:bg-white"}`}>
                  {item.label}<span className={`rounded px-1.5 py-0.5 text-[11px] ${filter === item.value ? "bg-white/15" : "bg-slate-200/70"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Đang tải danh bạ...</div>
        ) : loadError ? (
          <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 text-center"><p className="text-sm text-rose-600">{loadError}</p><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Thử lại</Button></div>
        ) : visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
              <colgroup><col className="w-[27%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[13%]" /><col className="w-[24%]" /><col className="w-[10%]" /></colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>{["Nhà cung cấp", "Phân loại", "Khu vực", "Liên hệ", "Giá tham khảo", "Thao tác"].map((label) => <th key={label} scope="col" className={`px-5 py-3.5 ${label === "Thao tác" ? "text-center" : ""}`}>{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((supplier) => (
                  <tr key={supplier.id} className="transition-colors hover:bg-sky-50/40">
                    <td className="px-5 py-5 align-middle">
                      <button type="button" disabled={loadingDetailId !== null} onClick={() => void viewSupplier(supplier)} title={supplier.name} className="block w-full truncate text-left font-semibold text-[#075985] hover:underline focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-60">{supplier.name}</button>
                    </td>
                    <td className="px-5 py-5"><SupplierCategory type={supplier.type} /></td>
                    <td className="px-5 py-5"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" /><span className="truncate">{supplier.area || "Chưa cập nhật"}</span></span></td>
                    <td className="px-5 py-5"><p className="truncate font-medium">{supplier.contactName || "Chưa có người liên hệ"}</p></td>
                    <td className="px-5 py-5"><p className="inline-flex items-baseline gap-1.5 whitespace-nowrap"><strong className="font-semibold tabular-nums">{money(supplier.referencePrice)}</strong><span className="text-xs text-slate-500">{supplier.type === "HOTEL" ? "/ người / đêm" : "/ người / bữa"}</span></p></td>
                    <td className="px-3 py-5"><div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" disabled={loadingDetailId !== null} aria-label={`Xem ${supplier.name}`} title="Xem chi tiết" onClick={() => void viewSupplier(supplier)} className="h-9 w-9 text-[#075985]">{loadingDetailId === supplier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}</Button>
                      <Button variant="ghost" size="icon" disabled={loadingDetailId !== null} aria-label={`Sửa ${supplier.name}`} title="Chỉnh sửa" onClick={() => void editSupplier(supplier)} className="h-9 w-9 text-[#075985]"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Xóa ${supplier.name}`} title="Xóa khỏi danh bạ" onClick={() => { setDeleteError(""); setDeleting(supplier); }} className="h-9 w-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <BookUser className="mb-4 h-10 w-10 text-slate-300" />
            <h2 className="font-semibold text-slate-800">{suppliers.length ? "Không tìm thấy nhà cung cấp" : "Danh bạ chưa có nhà cung cấp"}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{suppliers.length ? "Thử đổi từ khóa hoặc chọn loại nhà cung cấp khác." : "Chưa có khách sạn hoặc nhà hàng nào trong danh bạ."}</p>
            {suppliers.length > 0 && <Button variant="outline" className="mt-5" onClick={resetFilters}>Xóa bộ lọc</Button>}
          </div>
        )}
        <footer className="flex flex-wrap justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3.5 text-xs text-slate-500">
          <span aria-live="polite">Hiển thị {visible.length} / {suppliers.length} nhà cung cấp</span><span>Giá tham khảo · Cần xác nhận lại trước khi đặt</span>
        </footer>
      </section>

      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-200 bg-white text-slate-900 sm:max-w-2xl">
          <DialogHeader><DialogTitle className="pr-6 text-xl text-[#075985]">{viewing?.name}</DialogTitle><DialogDescription>Thông tin nhà cung cấp riêng trong danh bạ Agency.</DialogDescription></DialogHeader>
          {viewing && <>
            <div className="flex items-center gap-3"><SupplierCategory type={viewing.type} />{viewing.starRating && <span className="text-sm text-amber-700">{viewing.starRating} sao</span>}</div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-5 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
              {[
                ["Khu vực", viewing.area], ["Địa chỉ", viewing.address],
                ["Người liên hệ", viewing.contactName], ["Số điện thoại", viewing.contactPhone],
                ["Email", viewing.contactEmail], ["Giá tham khảo", `${money(viewing.referencePrice)}${viewing.referencePrice != null ? (viewing.type === "HOTEL" ? " / người / đêm" : " / người / bữa") : ""}`],
              ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1.5 break-words text-sm font-medium leading-6">{value || "Chưa cập nhật"}</dd></div>)}
            </dl>
            <div><h3 className="text-sm font-semibold">Điều kiện tham khảo</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{viewing.conditions || "Chưa cập nhật"}</p></div>
            <div><h3 className="text-sm font-semibold">Ghi chú nội bộ</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{viewing.notes || "Chưa có ghi chú"}</p></div>
            <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
              <Button variant="outline" className="gap-2 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => { setDeleteError(""); setDeleting(viewing); setViewing(null); }}><Trash2 className="h-4 w-4" />Xóa khỏi danh bạ</Button>
              <div className="flex gap-2"><Button variant="outline" onClick={() => void editSupplier(viewing)}><Pencil className="mr-2 h-4 w-4" />Chỉnh sửa</Button><Button variant="outline" onClick={() => setViewing(null)}>Đóng</Button></div>
            </div>
          </>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !saving) { setEditing(null); setDraft(null); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-slate-900 sm:max-w-2xl">
          <DialogHeader><DialogTitle>Chỉnh sửa {editing?.name}</DialogTitle><DialogDescription>Thông tin này chỉ thuộc danh bạ Agency. Tour đã lưu giữ snapshot riêng.</DialogDescription></DialogHeader>
          {draft && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {([
              ["name", "Tên nhà cung cấp"], ["area", "Khu vực"], ["address", "Địa chỉ"],
              ["contactName", "Người liên hệ"], ["contactPhone", "Số điện thoại"], ["contactEmail", "Email"],
            ] as const).map(([field, label]) => <label key={field} className="text-sm">{label}
              <Input className="mt-1" value={draft[field] || ""} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            </label>)}
            {draft.type === "HOTEL" && <label className="text-sm">Số sao
              <Input type="number" min="1" max="5" className="mt-1" value={draft.starRating ?? ""}
                onChange={(e) => setDraft({ ...draft, starRating: e.target.value ? Number(e.target.value) : null })} />
            </label>}
            <label className="text-sm">Giá tham khảo {draft.type === "HOTEL" ? "/ người / đêm" : "/ người / bữa"}
              <Input type="number" min="1" className="mt-1" value={draft.referencePrice ?? ""}
                onChange={(e) => setDraft({ ...draft, referencePrice: e.target.value ? Number(e.target.value) : null })} />
            </label>
            <label className="text-sm sm:col-span-2">Điều kiện tham khảo
              <textarea className="mt-1 w-full rounded-md border p-2" rows={3} value={draft.conditions || ""}
                onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} />
            </label>
            <label className="text-sm sm:col-span-2">Ghi chú nội bộ
              <textarea className="mt-1 w-full rounded-md border p-2" rows={3} value={draft.notes || ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </label>
            <label className="text-sm">Trạng thái
              <select className="mt-1 w-full rounded-md border p-2" value={draft.status || "ACTIVE"}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="ACTIVE">Đang dùng</option><option value="ARCHIVED">Lưu trữ</option>
              </select>
            </label>
            {editError && <p role="alert" className="text-sm text-rose-600 sm:col-span-2">{editError}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="outline" disabled={saving} onClick={() => { setEditing(null); setDraft(null); }}>Hủy</Button>
              <Button disabled={saving} onClick={() => void saveSupplier()}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</Button></div>
          </div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open && !isDeleting) setDeleting(null); }}>
        <AlertDialogContent className="bg-white text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhà cung cấp khỏi danh bạ?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">Bạn muốn xóa <strong className="text-slate-800">{deleting?.name}</strong> khỏi danh bạ? Nhà cung cấp sẽ không còn xuất hiện trong danh bạ để chọn khi tạo tour. Thông tin trong các tour đã lưu được giữ nguyên.</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-sm text-rose-600">{deleteError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Giữ lại</AlertDialogCancel><Button disabled={isDeleting} className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void confirmDelete()}>{isDeleting ? "Đang xóa..." : "Xóa khỏi danh bạ"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
