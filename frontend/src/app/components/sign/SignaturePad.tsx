import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

const WIDTH = 900;
const HEIGHT = 300;

interface SignaturePadProps {
  /** Ảnh chữ ký PNG (data URL) mỗi khi ký xong một nét; null khi xóa. */
  onChange: (png: string | null) => void;
  disabled?: boolean;
}

/** Ô ký bằng ngón tay/chuột/bút. Nền trong suốt để máy chủ ghép vào PDF. */
export function SignaturePad({ onChange, disabled }: SignaturePadProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b2a6f";
    ctx.lineWidth = 5;
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * WIDTH, y: ((e.clientY - rect.top) / rect.height) * HEIGHT };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = e.currentTarget.getContext("2d");
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.arc(last.current.x, last.current.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#0b2a6f";
      ctx.fill();
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setEmpty(false);
    onChange(canvas.current?.toDataURL("image/png") ?? null);
  };

  const clear = () => {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, WIDTH, HEIGHT);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvas}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          className="block w-full aspect-[3/1] touch-none cursor-crosshair rounded-xl"
          aria-label="Ô ký tên"
        />
        {empty && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Ký tên vào đây
          </span>
        )}
        <span className="pointer-events-none absolute left-6 right-6 bottom-8 border-b border-gray-200" />
      </div>
      <button
        type="button"
        onClick={clear}
        disabled={disabled || empty}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
      >
        <Eraser className="w-3.5 h-3.5" /> Ký lại
      </button>
    </div>
  );
}
