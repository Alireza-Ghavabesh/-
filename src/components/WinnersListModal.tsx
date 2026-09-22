import React, { useState } from 'react';
import { Winner } from '../types';
import { exportWinnersToExcel } from '../utils/excel';
import { Trophy, Download, Trash2, RotateCcw, X, Search, Award } from 'lucide-react';

interface WinnersListModalProps {
  isOpen: boolean;
  onClose: () => void;
  winners: Winner[];
  onRestoreWinner: (winner: Winner) => void;
  onClearAllWinners: () => void;
}

export const WinnersListModal: React.FC<WinnersListModalProps> = ({
  isOpen,
  onClose,
  winners,
  onRestoreWinner,
  onClearAllWinners,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = winners.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.fullName.toLowerCase().includes(q) ||
      w.personnelCode.toLowerCase().includes(q) ||
      w.prizeTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">فهرست برندگان قرعه‌کشی</h3>
              <p className="text-xs text-slate-400">
                افراد ثبت‌شده در این فهرست از دورهای بعدی قرعه‌کشی حذف شده‌اند ({winners.length} برنده)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در بین برندگان (نام، کد پرسنلی، جایزه)..."
              className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportWinnersToExcel(winners)}
              disabled={winners.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                winners.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل برندگان</span>
            </button>

            {winners.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('آیا از پاک کردن تمامی برندگان و بازنشانی اطمینان دارید؟')) {
                    onClearAllWinners();
                  }
                }}
                className="p-2 rounded-xl text-xs text-red-400 hover:bg-red-950/40 border border-red-500/30 transition cursor-pointer"
                title="پاکسازی لیست برندگان"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Winners Table */}
        <div className="flex-1 overflow-y-auto py-3">
          {winners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <Trophy className="w-12 h-12 text-slate-700" />
              <p className="text-sm">هنوز هیچ برنده‌ای ثبت نشده است.</p>
              <p className="text-xs text-slate-600">پس از چرخاندن گردونه شانس و تأیید، برندگان اینجا ثبت می‌شوند.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              هیچ برنده‌ای با این مشخصات یافت نشد.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
              <div className="bg-slate-900/90 grid grid-cols-12 gap-2 p-3 text-xs font-bold text-amber-300">
                <span className="col-span-2 text-center">رتبه برنده</span>
                <span className="col-span-4">نام و نام خانوادگی</span>
                <span className="col-span-2">کد پرسنلی</span>
                <span className="col-span-2">جایزه</span>
                <span className="col-span-2 text-center">عملیات</span>
              </div>
              {filtered.map((w) => (
                <div
                  key={w.id}
                  className="grid grid-cols-12 gap-2 p-3 text-xs text-slate-300 items-center hover:bg-slate-800/30 transition"
                >
                  <span className="col-span-2 text-center font-bold text-amber-300 bg-amber-500/15 py-1 px-2 rounded-lg border border-amber-500/30 text-[11px]">
                    {w.winnerRankTitle || `برنده ${w.drawRound}`}
                  </span>
                  <div className="col-span-4 flex flex-col">
                    <span className="font-bold text-white truncate">{w.fullName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">ردیف {w.rowNumber} • {w.mobile}</span>
                  </div>
                  <span className="col-span-2 font-mono text-slate-300">{w.personnelCode}</span>
                  <div className="col-span-2 flex flex-col">
                    <span className="text-amber-200 truncate flex items-center gap-1 font-medium">
                      <Award className="w-3 h-3 text-amber-400 shrink-0" />
                      {w.prizeTitle}
                    </span>
                    <span className="text-[11px] font-bold text-amber-300 font-mono">
                      وام: {w.loanAmount || (w.creditDeferred ? `${w.creditDeferred} ریال` : '---')}
                    </span>
                    <span className="text-[10px] text-slate-500">{w.wonAt}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-center">
                    <button
                      onClick={() => onRestoreWinner(w)}
                      title="بازگرداندن فرد به لیست فعال قرعه‌کشی"
                      className="px-2.5 py-1 rounded-lg text-[11px] text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>بازگشت</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            مجموع برندگان: {winners.length} نفر
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
