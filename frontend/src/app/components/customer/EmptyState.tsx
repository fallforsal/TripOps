import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white border border-[#CBD5E1] rounded-[6px] p-10 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-[6px] bg-[#F0F9FF] text-[#075985] flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
        <p className="text-sm text-[#475569] leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <div className="pt-2">
          <Button
            onClick={onAction}
            className="bg-[#075985] hover:bg-[#0C4A6E] text-white rounded-[6px] px-4 py-2 text-sm font-medium"
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
