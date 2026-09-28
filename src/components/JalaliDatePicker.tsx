import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft } from 'lucide-react';

interface JalaliDatePickerProps {
  value: string; // e.g. "1404/07/01" or "۱۴۰۴/۰۷/۰۱"
  onChange: (date: string) => void;
  className?: string;
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// Helper to convert Persian/Arabic digits to English
export function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

// Convert English to Persian digits
export function toPersianDigits(num: number | string): string {
  const str = String(num);
  return str.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

// Days in Jalali Month
export function getJalaliMonthDays(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  // Esfand leap year calculation
  const isLeap = (((((year - 474) % 2820) + 474) * 682) % 2816) < 682;
  return isLeap ? 30 : 29;
}

// Get current Jalali date (today)
export function getTodayJalali(): { year: number; month: number; day: number; formatted: string } {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now).split('/');

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const mStr = month < 10 ? `0${month}` : `${month}`;
    const dStr = day < 10 ? `0${day}` : `${day}`;
    return {
      year,
      month,
      day,
      formatted: `${year}/${mStr}/${dStr}`,
    };
  } catch {
    return {
      year: 1404,
      month: 7,
      day: 1,
      formatted: '1404/07/01',
    };
  }
}

// Parse "1404/07/01" or "۱۴۰۴/۰۷/۰۱"
function parseJalaliString(str: string): { year: number; month: number; day: number } {
  const cleaned = toEnglishDigits(str || '');
  const parts = cleaned.split(/[\/\-.]/).map((p) => parseInt(p, 10));
  if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return {
      year: parts[0] >= 1300 && parts[0] <= 1500 ? parts[0] : 1404,
      month: Math.min(12, Math.max(1, parts[1])),
      day: Math.min(31, Math.max(1, parts[2])),
    };
  }
  return getTodayJalali();
}

// Format to "1404/07/01"
function formatJalali(year: number, month: number, day: number): string {
  const m = month < 10 ? `0${month}` : `${month}`;
  const d = day < 10 ? `0${day}` : `${day}`;
  return `${year}/${m}/${d}`;
}

// Generate years range up to 1500
const YEARS_LIST: number[] = [];
for (let y = 1400; y <= 1500; y++) {
  YEARS_LIST.push(y);
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = parseJalaliString(value);
  const [viewYear, setViewYear] = useState<number>(parsed.year);
  const [viewMonth, setViewMonth] = useState<number>(parsed.month);

  // When opening the picker, ensure it jumps to today (or the parsed value)
  const handleOpenPicker = () => {
    const today = getTodayJalali();
    if (!value || value.trim() === '') {
      onChange(toPersianDigits(today.formatted));
      setViewYear(today.year);
      setViewMonth(today.month);
    } else {
      const p = parseJalaliString(value);
      setViewYear(p.year);
      setViewMonth(p.month);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (value) {
      const p = parseJalaliString(value);
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = getJalaliMonthDays(viewYear, viewMonth);
  const todayObj = getTodayJalali();

  // Month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const selectDay = (day: number) => {
    const formatted = formatJalali(viewYear, viewMonth, day);
    onChange(toPersianDigits(formatted));
    setIsOpen(false);
  };

  const setToday = () => {
    const today = getTodayJalali();
    onChange(toPersianDigits(today.formatted));
    setViewYear(today.year);
    setViewMonth(today.month);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input trigger */}
      <div
        onClick={handleOpenPicker}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border border-slate-700 hover:border-amber-400/80 rounded-xl cursor-pointer transition shadow-xs select-none"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-mono text-white font-bold tracking-wider">
            {value || toPersianDigits(todayObj.formatted)}
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
          انتخاب تقویم
        </span>
      </div>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-60 w-80 bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fadeIn text-right select-none">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            {/* Next Month (in RTL goes left) */}
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-slate-800 text-amber-300 font-bold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none cursor-pointer"
              >
                {PERSIAN_MONTHS.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Selector up to 1500 */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-slate-800 text-white font-mono font-bold text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none cursor-pointer max-h-40"
              >
                {YEARS_LIST.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {toPersianDigits(yr)}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Month Button */}
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays Header */}
          <div className="grid grid-cols-7 gap-1 py-2 text-center text-[11px] font-bold text-slate-400">
            {WEEK_DAYS.map((w, idx) => (
              <span key={idx} className={idx === 6 ? 'text-red-400' : ''}>
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected =
                parsed.year === viewYear &&
                parsed.month === viewMonth &&
                parsed.day === day;

              const isToday =
                todayObj.year === viewYear &&
                todayObj.month === viewMonth &&
                todayObj.day === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                      : isToday
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-400 font-black'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-amber-300'
                  }`}
                >
                  {toPersianDigits(day)}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 bg-amber-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-xs">
            <button
              type="button"
              onClick={setToday}
              className="text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30"
            >
              <span>امروز: {toPersianDigits(todayObj.formatted)}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
