import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Participant, Winner } from '../types';
import { getWinnerOrdinalTitle, formatLoanAmount } from '../utils/format';
import { Trophy, Sparkles, CheckCircle2, RotateCcw, Award, User, Phone, Coins, Hash, Eye, EyeOff } from 'lucide-react';

interface WinnerModalProps {
  winner: Participant | null;
  prizeTitle: string;
  drawRound: number;
  maskMobile: boolean;
  loanAmount?: string;
  useSettingsLoanAmount?: boolean;
  onConfirmWinner: (confirmedWinner: Winner) => void;
  onDiscardAndRedraw: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  prizeTitle,
  drawRound,
  maskMobile: initialMaskMobile,
  loanAmount,
  useSettingsLoanAmount = true,
  onConfirmWinner,
  onDiscardAndRedraw,
}) => {
  const [showFullMobile, setShowFullMobile] = useState(!initialMaskMobile);
  const winnerRankTitle = getWinnerOrdinalTitle(drawRound);

  const effectiveLoanRaw = (useSettingsLoanAmount || !winner?.creditDeferred)
    ? (loanAmount || winner?.creditDeferred)
    : winner?.creditDeferred;

  const loanInfo = effectiveLoanRaw ? formatLoanAmount(effectiveLoanRaw) : (winner ? formatLoanAmount(winner.creditDeferred) : null);

  useEffect(() => {
    if (!winner) return;

    // Trigger explosive celebratory confetti shower from both corners and center
    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors: ['#D4AF37', '#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors: ['#D4AF37', '#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [winner]);

  if (!winner) return null;

  const handleConfirm = () => {
    const winnerRecord: Winner = {
      ...winner,
      wonAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      drawRound,
      winnerRankTitle,
      prizeTitle: prizeTitle || winnerRankTitle,
      loanAmount: loanInfo?.numeric || '۰ ریال',
      loanWords: loanInfo?.words || '',
    };
    onConfirmWinner(winnerRecord);
  };

  const getDisplayMobile = () => {
    if (!winner.mobile || winner.mobile === '---') return 'ثبت نشده';
    if (showFullMobile || winner.mobile.length < 8) return winner.mobile;
    return `${winner.mobile.substring(0, 4)}***${winner.mobile.substring(winner.mobile.length - 4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Golden Stage Glow */}
      <div className="absolute w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Winner Card */}
      <div className="relative w-full max-w-xl bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-6 md:p-8 shadow-[0_0_80px_rgba(217,119,6,0.4)] text-center flex flex-col items-center overflow-hidden">
        {/* Decorative Top Ribbon */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-xl pointer-events-none" />

        {/* Floating Trophy Icon */}
        <div className="relative mb-3">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-linear-to-b from-amber-300 via-amber-500 to-amber-700 p-1 shadow-xl flex items-center justify-center animate-bounce">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Trophy className="w-10 h-10 md:w-12 md:h-12 text-amber-300" />
            </div>
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-7 h-7 text-yellow-300 animate-spin" style={{ animationDuration: '6s' }} />
          <Sparkles className="absolute -bottom-1 -left-2 w-6 h-6 text-amber-400 animate-pulse" />
        </div>

        {/* Stage Titles */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs md:text-sm font-bold mb-2">
          <Award className="w-4 h-4" />
          <span>{winnerRankTitle} {prizeTitle ? `• ${prizeTitle}` : ''}</span>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-amber-400 mb-1">
          🎉 مشخص شدن {winnerRankTitle} 🎉
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          نام {winnerRankTitle} با موفقیت توسط گردونه شانس انتخاب گردید
        </p>

        {/* Winner Big Spotlight Card */}
        <div className="w-full bg-slate-950/80 border border-amber-400/50 rounded-2xl p-5 mb-6 shadow-inner flex flex-col items-center">
          <div className="text-3xl md:text-4xl font-black text-white tracking-wide text-center drop-shadow-[0_2px_10px_rgba(251,191,36,0.3)] mb-4">
            {winner.fullName}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full text-right text-xs md:text-sm">
            {/* Personnel Code */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-amber-400" />
                کد پرسنلی:
              </span>
              <span className="font-bold text-white font-mono text-base">{winner.personnelCode}</span>
            </div>

            {/* Excel Row */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                ردیف اکسل:
              </span>
              <span className="font-bold text-white font-mono text-base">{winner.rowNumber}</span>
            </div>

            {/* Mobile Number with Privacy Mask */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between col-span-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-amber-400" />
                تلفن همراه:
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-200 font-mono text-base">{getDisplayMobile()}</span>
                <button
                  type="button"
                  onClick={() => setShowFullMobile(!showFullMobile)}
                  title={showFullMobile ? 'مخفی‌سازی شماره' : 'نمایش کامل شماره'}
                  className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  {showFullMobile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Loan Amount (وام) - Exclusively from deferred credit/نسیه, completely ignoring charge credit */}
            <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 col-span-2 shadow-md shadow-amber-950/50">
              <span className="text-amber-300 font-extrabold flex items-center gap-1.5 text-sm sm:text-base shrink-0">
                <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                <span>وام:</span>
              </span>
              <div className="flex flex-col sm:items-end text-right sm:text-left">
                <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono tracking-wider drop-shadow-md">
                  {loanInfo?.numeric || '۰ ریال'}
                </div>
                {loanInfo?.words && (
                  <div className="text-xs sm:text-sm font-bold text-amber-100/90 mt-0.5 tracking-normal">
                    ({loanInfo.words})
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Confirm Button */}
          <button
            id="btn-confirm-winner"
            onClick={handleConfirm}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl font-bold text-base bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
            <span>ثبت {winnerRankTitle} و حذف از لیست</span>
          </button>

          {/* Redraw Button */}
          <button
            id="btn-redraw-winner"
            onClick={onDiscardAndRedraw}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl font-medium text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>ابطال و قرعه مجدد</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-4">
          با کلیک روی «ثبت {winnerRankTitle}»، این فرد به لیست برندگان منتقل شده و در قرعه‌کشی‌های بعدی شرکت نخواهد کرد.
        </p>
      </div>
    </div>
  );
};
