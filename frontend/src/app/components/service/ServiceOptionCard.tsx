import type { ReactNode } from "react";

export function ServiceOptionCard({ children, className, label, selected, onSelect }:
  { children: ReactNode; className: string; label: string; selected: boolean; onSelect: () => void }) {
  return <div role="group" aria-label={label} tabIndex={0} data-selected={selected}
    className={`${className} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600`}
    onClick={event => {
      if ((event.target as Element).closest("button, a, input, select, textarea")) return;
      onSelect();
    }}
    onKeyDown={event => {
      if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault(); onSelect();
      }
    }}>
    {children}
  </div>;
}
