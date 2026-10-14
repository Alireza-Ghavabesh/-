import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Participant, Winner, LotteryMode } from '../types';
import { getWinnerOrdinalTitle, formatLoanAmount } from '../utils/format';
import {
  Trophy,
  CheckCircle2,
  RotateCcw,
  Award,
  User,
  Coins,
  Hash,
  Gift,
  AtSign,
  Copy,
  Check,
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
  lotteryMode?: LotteryMode;
  onConfirmWinner: (confirmedWinner: Winner) => void;
  onDiscardAndRedraw: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  prizeTitle,
  drawRound,
  maskMobile: _initialMaskMobile,
  loanAmount,
  useSettingsLoanAmount = true,
  prizeType = 'monetary',
  prizeLabel = 'وام',
  prizeItemName,
  showExcelRow = true,
  showPersonnelCode = true,
  lotteryMode = 'personnel',
  onConfirmWinner,
  onDiscardAndRedraw,
}) => {
  const [copied, setCopied] = useState(false);
  const winnerRankTitle = getWinnerOrdinalTitle(drawRound);

  const effectiveLoanRaw = (useSettingsLoanAmount || !winner?.creditDeferred)
    ? (loanAmount || winner?.creditDeferred)
    : winner?.creditDeferred;

  const loanInfo = effectiveLoanRaw ? formatLoanAmount(effectiveLoanRaw) : (winner ? formatLoanAmount(winner.creditDeferred) : null);

  const isInstagram = lotteryMode === 'instagram' || Boolean(winner?.instagramUsername) || winner?.personnelCode === '---';

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

  const handleCopyUsername = () => {
    const handle = winner.instagramUsername ? `@${winner.instagramUsername}` : winner.fullName;
    navigator.clipboard.writeText(handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    const isItem = prizeType === 'item';
    const displayPrizeTitle = isItem
      ? (prizeItemName || prizeTitle || winnerRankTitle)
      : (prizeTitle || winnerRankTitle);

    const winnerRecord: Winner = {
      ...winner,
      wonAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      drawRound,
      winnerRankTitle,
      prizeTitle: displayPrizeTitle,
      loanAmount: isItem ? '' : (loanInfo?.numeric || '۰ ریال'),
      loanWords: isItem ? '' : (loanInfo?.words || ''),
      prizeType: prizeType || 'monetary',
      prizeLabel: prizeLabel || 'وام',
      prizeItemName: prizeItemName || (isItem ? displayPrizeTitle : ''),
      lotteryMode: isInstagram ? 'instagram' : 'personnel',
      instagramUsername: winner.instagramUsername || (isInstagram ? winner.fullName.replace(/^@/, '') : undefined),
    };
    onConfirmWinner(winnerRecord);
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
        </div>

        {/* Stage Titles */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs md:text-sm font-bold mb-2">
          {prizeType === 'item' ? <Gift className="w-4 h-4 text-amber-400" /> : <Award className="w-4 h-4" />}
          <span>
            {winnerRankTitle} {prizeType === 'item' ? (prizeItemName ? `• ${prizeItemName}` : '') : (prizeTitle ? `• ${prizeTitle}` : '')}
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-amber-400 mb-1">
          🎉 مشخص شدن {winnerRankTitle} 🎉
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          {isInstagram
            ? `آیدی ${winnerRankTitle} با موفقیت توسط گردونه شانس انتخاب گردید`
            : `نام ${winnerRankTitle} با موفقیت توسط گردونه شانس انتخاب گردید`}
        </p>

        {/* Winner Big Spotlight Card */}
        <div className="w-full bg-slate-950/85 border-2 border-amber-400/70 rounded-3xl p-6 md:p-8 mb-6 shadow-[0_0_40px_rgba(251,191,36,0.15)] flex flex-col items-center">
          <span className="text-xs md:text-sm font-bold text-amber-400/90 tracking-widest uppercase mb-1 flex items-center gap-1.5">
            {isInstagram && <AtSign className="w-3.5 h-3.5 text-pink-400" />}
            <span>برنده خوش‌شانس این دور {isInstagram ? '(اینستاگرام)' : ''}</span>
          </span>

          {isInstagram ? (
            <div className="flex flex-col items-center gap-2 my-3">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-linear-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/25">
                  <AtSign className="w-6 h-6 sm:w-8 sm:h-8" />
                </span>
                <span className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-yellow-300 to-amber-100 tracking-tight font-mono select-all">
                  {winner.fullName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUsername}
                className="mt-1 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'آیدی کپی شد!' : 'کپی آیدی'}</span>
              </button>
            </div>
          ) : (
            <div className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-amber-200 via-yellow-300 to-amber-100 tracking-tight text-center drop-shadow-[0_4px_20px_rgba(251,191,36,0.5)] my-3 leading-tight select-all">
              {winner.fullName}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 w-full text-right text-xs md:text-sm mt-2">
            {/* Personnel Code (hidden if Instagram or disabled by user) */}
            {showPersonnelCode !== false && !isInstagram && winner.personnelCode !== '---' && (
              <div className={`bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between ${
                showExcelRow === false ? 'col-span-2' : ''
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-400" />
                  کد پرسنلی:
                </span>
                <span className="font-bold text-white font-mono text-base">{winner.personnelCode}</span>
              </div>
            )}

            {/* Excel Row */}
            {showExcelRow !== false && (
              <div className={`bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between ${
                (showPersonnelCode === false || isInstagram || winner.personnelCode === '---') ? 'col-span-2' : ''
              }`}>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-400" />
                  ردیف اکسل:
                </span>
                <span className="font-bold text-white font-mono text-base">{winner.rowNumber}</span>
              </div>
            )}

            {/* Prize Card: Either Monetary with Custom Label (وام، تسهیلات، سکه) or Non-Monetary Item (سفر حج، خودرو) */}
            {prizeType === 'item' ? (
              <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 col-span-2 shadow-md shadow-amber-950/50">
                <span className="text-amber-300 font-extrabold flex items-center gap-1.5 text-sm sm:text-base shrink-0">
                  <Gift className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{prizeLabel || 'جایزه این دور'}:</span>
                </span>
                <div className="flex flex-col sm:items-end text-right sm:text-left">
                  <div className="text-xl sm:text-2xl font-black text-amber-300 drop-shadow-md">
                    {prizeItemName || prizeTitle || 'جایزه ویژه'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 col-span-2 shadow-md shadow-amber-950/50">
                <span className="text-amber-300 font-extrabold flex items-center gap-1.5 text-sm sm:text-base shrink-0">
                  <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{prizeLabel || 'وام'}:</span>
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
            )}
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
          با کلیک روی «ثبت {winnerRankTitle}»، این برنده در بایگانی ثبت شده و از دورهای بعدی قرعه‌کشی حذف می‌شود.
        </p>
      </div>
    </div>
  );
};
