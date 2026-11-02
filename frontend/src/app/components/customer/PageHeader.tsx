import React from "react";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backText?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  backText = "Quay lại",
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      {onBack && (
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#075985] py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-[#075985] rounded-[6px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backText}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#475569] mt-1">{subtitle}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
