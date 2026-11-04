import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { cn } from "./utils";

interface VietnameseDatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  isBirthDate?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
  variant?: "default" | "minimal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  panelContainer?: HTMLDivElement | null;
}

function CalendarPanel({ container, open, id, children }: {
  container?: HTMLDivElement | null;
  open: boolean;
  id: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!container || !open) return;
    const frame = requestAnimationFrame(() => {
      container.querySelector<HTMLSelectElement>("select")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [container, open]);
  if (container) return open ? createPortal(
    <div id={id} role="group" aria-label="Lịch chọn ngày khởi hành" className="mx-auto w-fit bg-white p-3">{children}</div>,
    container,
  ) : null;
  return <PopoverContent align="start" className="z-[200] w-auto p-3 bg-white rounded-lg border border-gray-200 shadow-lg">{children}</PopoverContent>;
}

const VI_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const VI_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

export function VietnameseDatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày...",
  min,
  max,
  isBirthDate = false,
  className = "",
  id,
  disabled = false,
  variant = "default",
  open,
  onOpenChange,
  panelContainer,
}: VietnameseDatePickerProps) {
  const calendarId = React.useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = (next: React.SetStateAction<boolean>) => {
    const nextOpen = typeof next === "function" ? next(isOpen) : next;
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  // Parse initial value or default to current date / 2000 for birth date
  const parseDate = (val?: string) => {
    if (!val) return null;
    const parts = val.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  };

  const parsedValue = parseDate(value);

  // Current viewing month and year in calendar
  const [viewYear, setViewYear] = useState<number>(() => {
    if (parsedValue) return parsedValue.getFullYear();
    if (isBirthDate) return 2000;
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (parsedValue) return parsedValue.getMonth();
    return new Date().getMonth();
  });

  // When value changes from outside, sync view
  useEffect(() => {
    if (parsedValue) {
      setViewYear(parsedValue.getFullYear());
      setViewMonth(parsedValue.getMonth());
    }
  }, [value]);

  // Format date for display: DD/MM/YYYY
  const formatDisplay = (val?: string) => {
    if (!val) return "";
    const parts = val.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  // Days calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Day of week: 0 for Sunday, 1 for Monday... We want Monday to be 0
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0=Mon, 1=Tue, ..., 6=Sun
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);

  // Year range options
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  const startYear = isBirthDate ? 1930 : currentYear - 1;
  const endYear = isBirthDate ? currentYear : currentYear + 10;
  for (let y = endYear; y >= startYear; y--) {
    yearOptions.push(y);
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const formatted = `${viewYear}-${mm}-${dd}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const isSelected = (day: number) => {
    if (!parsedValue) return false;
    return (
      parsedValue.getDate() === day &&
      parsedValue.getMonth() === viewMonth &&
      parsedValue.getFullYear() === viewYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const isDisabled = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${viewYear}-${mm}-${dd}`;
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          id={id}
          {...(panelContainer ? { "aria-controls": calendarId } : {})}
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(event) => {
            if (!disabled && event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              setIsOpen((open) => !open);
            }
          }}
          className={cn(
            "relative flex min-w-0 items-center justify-between w-full cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#075985]",
            variant === "minimal"
              ? "h-9 border-0 bg-transparent p-0 text-left"
              : "px-3.5 py-2.5 bg-white border border-gray-300 hover:border-teal-400 focus-within:border-[#075985] focus-within:ring-2 focus-within:ring-teal-100 rounded-xl shadow-2xs",
            disabled && "opacity-60 cursor-not-allowed bg-gray-50",
            className,
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            {variant !== "minimal" && <CalendarIcon className="w-4 h-4 text-[#075985] flex-shrink-0" />}
            <span className={`text-sm ${value ? "font-medium text-gray-900" : "text-slate-500"}`}>
              {value ? formatDisplay(value) : placeholder}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-rose-500 rounded-full hover:bg-gray-100 transition-colors"
                title="Xóa ngày đã chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </PopoverTrigger>

      <CalendarPanel container={panelContainer} open={isOpen} id={calendarId}>
        <div className="w-[224px] space-y-2">
          {/* Header Navigation with Year/Month Quick Select */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick selectors for Month & Year */}
            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-sm font-medium text-gray-900 bg-transparent hover:bg-gray-100 rounded-md px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#075985]"
              >
                {VI_MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-sm font-medium text-gray-900 bg-transparent hover:bg-gray-100 rounded-md px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#075985]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Year Jump Chips for Birthdays */}
          {isBirthDate && (
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-gray-400 font-medium mr-1 flex-shrink-0">Thế hệ:</span>
              {[2015, 2010, 2000, 1995, 1990, 1980, 1970].map((decadeYear) => (
                <button
                  key={decadeYear}
                  type="button"
                  onClick={() => setViewYear(decadeYear)}
                  className={`px-2 py-0.5 rounded-md border flex-shrink-0 font-medium transition-colors ${
                    viewYear === decadeYear
                      ? "bg-[#075985] text-white border-[#075985] font-bold"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-[#F0F9FF] hover:text-[#0C4A6E]"
                  }`}
                >
                  {decadeYear}
                </button>
              ))}
            </div>
          )}

          {/* Day of Week Header */}
          <div className="grid grid-cols-7 text-center">
            {VI_DAYS.map((d, idx) => (
              <span
                key={idx}
                className={`text-[0.75rem] font-normal ${
                  idx === 6 ? "text-rose-500" : "text-gray-500"
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {/* Days from previous month */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <span
                key={`prev-${i}`}
                className="h-8 w-8 flex items-center justify-center text-sm text-gray-300 font-normal select-none"
              >
                {prevMonthDays - firstDay + i + 1}
              </span>
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              const disabledDay = isDisabled(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 rounded-md text-sm font-normal transition-colors flex items-center justify-center relative ${
                    selected
                      ? "bg-[#075985] text-white font-medium"
                      : disabledDay
                      ? "text-gray-300 cursor-not-allowed"
                      : today
                      ? "text-[#0C4A6E] font-semibold bg-[#E0F2FE] hover:bg-[#BAE6FD]"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {day}
                  {today && !selected && (
                    <span className="absolute bottom-0.5 w-1 h-1 bg-[#075985] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, "0");
                const dd = String(today.getDate()).padStart(2, "0");
                const formatted = `${yyyy}-${mm}-${dd}`;
                if (!isDisabled(today.getDate())) {
                  onChange(formatted);
                  setIsOpen(false);
                } else {
                  setViewYear(yyyy);
                  setViewMonth(today.getMonth());
                }
              }}
              className="text-[#0C4A6E] hover:text-[#0C4A6E] font-semibold hover:underline"
            >
              Hôm nay
            </button>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-rose-600 hover:text-rose-800 font-medium hover:underline"
              >
                Xóa ngày
              </button>
            )}
          </div>
        </div>
      </CalendarPanel>
    </Popover>
  );
}
