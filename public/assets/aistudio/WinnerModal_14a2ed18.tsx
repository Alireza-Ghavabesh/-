import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Participant, Winner } from '../types';
import { getWinnerOrdinalTitle, formatLoanAmount } from '../utils/format';
import {
  Trophy,
  CheckCircle2,
  RotateCcw,
  Award,
  Coins,
  Gift,
  Copy,
  Check,
  Instagram,
  ExternalLink,
} from 'lucide-react';

interface WinnerModalProps {
  winner: Participant | null;
  prizeTitle: string;
  drawRound: number;
  maskMobile: boolean;
  loanAmount?: string;
  useSettingsLoanAmount?: boolean;
  prizeType?: 'monetary' | 'item';
  prizeLabel?: string;
  prizeItemName?: string;
  showExcelRow?: boolean;
  showPersonnelCode?: boolean;
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
  prizeType = 'monetary',
  prizeLabel = 'وام',
  prizeItemName,
  showExcelRow = true,
  showPersonnelCode = true,
  onConfirmWinner,
  onDiscardAndRedraw,
}) => {
  const [copied, setCopied] = useState(false);
  const winnerRankTitle = getWinnerOrdinalTitle(drawRound);

  const effectiveLoanRaw =
    useSettingsLoanAmount || !winner?.creditDeferred
      ? loanAmount || winner?.creditDeferred
      : winner?.creditDeferred;

  const loanInfo = effectiveLoanRaw
    ? formatLoanAmount(effectiveLoanRaw)
    : winner
    ? formatLoanAmount(winner.creditDeferred)
    : null;

  useEffect(() => {
    if (!winner) return;

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

  // حذف @ از آیدی
  const cleanUsername = (winner.fullName || '').replace(/@/g, '').trim();
  const instagramProfileUrl = `https://instagram.com/${encodeURIComponent(cleanUsername)}`;

  // تنظیم پویا اندازه فونت برای جلوگیری از بیرون‌زدگی یوزرنیم‌های طولانی
  const getUsernameFontSize = (text: string) => {
    const len = text.length;
    if (len > 24) return 'text-lg sm:text-2xl md:text-3xl tracking-tight';
    if (len > 18) return 'text-xl sm:text-3xl md:text-4xl';
    if (len > 13) return 'text-2xl sm:text-4xl md:text-5xl';
    return 'text-3xl sm:text-5xl md:text-6xl';
  };

  const handleCopy = () => {
    if (!cleanUsername) return;
    navigator.clipboard.writeText(cleanUsername);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    const isItem = prizeType === 'item';
    const displayPrizeTitle = isItem
      ? prizeItemName || prizeTitle || winnerRankTitle
      : prizeTitle || winnerRankTitle;

    const winnerRecord: Winner = {
      ...winner,
      wonAt: new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      drawRound,
      winnerRankTitle,
      prizeTitle: displayPrizeTitle,
      loanAmount: isItem ? '' : loanInfo?.numeric || '۰ ریال',
      loanWords: isItem ? '' : loanInfo?.words || '',
      prizeType: prizeType || 'monetary',
      prizeLabel: prizeLabel || 'وام',
      prizeItemName: prizeItemName || (isItem ? displayPrizeTitle : ''),
    };
    onConfirmWinner(winnerRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      {/* هاله نور طلایی پشت مدال */}
      <div className="absolute w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* کادر عریض مدال */}
      <div className="relative w-full max-w-3xl lg:max-w-4xl bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl p-5 sm:p-8 shadow-[0_0_80px_rgba(217,119,6,0.4)] text-center flex flex-col items-center overflow-hidden">
        
        {/* کاپ برنده */}
        <div className="relative mb-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-linear-to-b from-amber-300 via-amber-500 to-amber-700 p-1 shadow-xl flex items-center justify-center animate-bounce">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
            </div>
          </div>
        </div>

        {/* عنوان نوبت و جایزه */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-bold mb-2">
          {prizeType === 'item' ? <Gift className="w-4 h-4 text-amber-400" /> : <Award className="w-4 h-4" />}
          <span>
            {winnerRankTitle} {prizeType === 'item' ? (prizeItemName ? `• ${prizeItemName}` : '') : (prizeTitle ? `• ${prizeTitle}` : '')}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-amber-400 mb-1">
          🎉 مشخص شدن {winnerRankTitle} 🎉
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          آیدی برنده با موفقیت توسط گردونه شانس انتخاب گردید
        </p>

        {/* باکس مشخصات برنده */}
        <div className="w-full bg-slate-950/90 border-2 border-amber-400/70 rounded-3xl p-4 sm:p-7 mb-5 shadow-[0_0_35px_rgba(251,191,36,0.15)] flex flex-col items-center">
          <span className="text-xs sm:text-sm font-bold text-amber-400/90 tracking-wide mb-3 flex items-center gap-1.5">
            <span>برنده خوش‌شانس این دور (اینستاگرام)</span>
          </span>

          {/* ردیف آیدی برنده: LTR با آیکون در چپ */}
          <div
            dir="ltr"
            className="flex items-center justify-center gap-2.5 sm:gap-4 w-full max-w-full px-2 py-2 overflow-hidden"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-linear-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 text-white shrink-0 border border-white/20">
              <span className="text-sm sm:text-base font-black font-mono">@</span>
            </div>

            <span
              title={cleanUsername}
              className={`font-black text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-yellow-300 to-amber-100 drop-shadow-[0_4px_18px_rgba(251,191,36,0.45)] truncate select-all leading-normal ${getUsernameFontSize(
                cleanUsername
              )}`}
            >
              {cleanUsername}
            </span>
          </div>

          {/* ردیف دکمه لینک پیج اینستاگرام و دکمه کپی آیدی */}
          <div className="mt-3.5 mb-5 flex flex-wrap items-center justify-center gap-2.5">
            {/* دکمه ورود مستقیم به پیج با تم رنگی اینستاگرام */}
            {cleanUsername && (
              <a
                href={instagramProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-linear-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:via-pink-500 hover:to-amber-400 shadow-lg shadow-pink-600/30 hover:shadow-pink-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none border border-white/10"
              >
                <Instagram className="w-4 h-4 shrink-0" />
                <span>نمایش پیج برنده خوش شانس این دور</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
              </a>
            )}

            {/* دکمه کمکی کپی آیدی */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 text-slate-300 hover:text-amber-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">کپی شد</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>کپی آیدی</span>
                </>
              )}
            </button>
          </div>

          {/* بخش جایزه */}
          <div className="w-full text-right text-xs sm:text-sm">
            {prizeType === 'item' ? (
              <div className="bg-amber-950/40 border border-amber-500/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-md">
                <span className="text-amber-300 font-bold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{prizeLabel || 'جایزه'}:</span>
                </span>
                <span className="text-base sm:text-xl font-black text-amber-200 truncate">
                  {prizeItemName || prizeTitle || 'سفر زیارتی حج عمره'}
                </span>
              </div>
            ) : (
              <div className="bg-amber-950/40 border border-amber-500/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-md">
                <span className="text-amber-300 font-bold flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{prizeLabel || 'وام'}:</span>
                </span>
                <span className="text-base sm:text-xl font-black text-amber-200 font-mono">
                  {loanInfo?.numeric || '۰ ریال'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* دکمه‌های تایید و ابطال */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            id="btn-confirm-winner"
            onClick={handleConfirm}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-950" />
            <span>ثبت {winnerRankTitle} و حذف از لیست</span>
          </button>

          <button
            id="btn-redraw-winner"
            onClick={onDiscardAndRedraw}
            className="w-full sm:w-auto py-3.5 px-5 rounded-xl font-medium text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:scale-[1.01] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>ابطال و قرعه مجدد</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          با کلیک روی «ثبت {winnerRankTitle}»، این برنده در بایگانی ثبت شده و از دورهای بعدی قرعه‌کشی حذف می‌شود.
        </p>
      </div>
    </div>
  );
};