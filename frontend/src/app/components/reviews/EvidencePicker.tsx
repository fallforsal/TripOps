import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_EVIDENCE_IMAGES, validateEvidence } from "@/app/services/reviews";

/** Chọn ảnh bằng chứng (JPEG/PNG/WebP, tối đa 5 ảnh × 5 MB) và xem trước trước khi gửi. */
export function EvidencePicker({
  files,
  onChange,
  onError,
  disabled,
  compact = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const add = (picked: FileList | null) => {
    if (!picked?.length) return;
    const next = [...files, ...Array.from(picked)];
    const problem = validateEvidence(next);
    if (problem) onError(problem);
    else { onError(""); onChange(next); }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {files.map((file, i) => (
          <div key={`${file.name}-${i}`} className={`relative ${compact ? "w-12 h-12" : "w-16 h-16"} rounded-[6px] overflow-hidden border border-[#CBD5E1] bg-slate-50`}>
            <img src={previews[i]} alt={file.name} className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                aria-label={`Bỏ ảnh ${file.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {files.length < MAX_EVIDENCE_IMAGES && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className={`${compact ? "w-12 h-12" : "w-16 h-16"} rounded-[6px] border border-dashed border-[#94A3B8] text-[#475569] hover:border-[#075985] hover:text-[#075985] flex flex-col items-center justify-center gap-0.5 text-[10px] disabled:opacity-50`}
          >
            <ImagePlus className="w-4 h-4" />
            {!compact && "Thêm ảnh"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => add(e.target.files)}
      />
      {!compact && <p className="text-[11px] text-[#64748B]">Ảnh JPEG, PNG hoặc WebP · tối đa {MAX_EVIDENCE_IMAGES} ảnh, mỗi ảnh 5 MB.</p>}
    </div>
  );
}
