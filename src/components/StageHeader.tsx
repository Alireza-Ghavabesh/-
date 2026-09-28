import React, { useState } from 'react';
import { AppSettings, Winner } from '../types';
import { sound } from '../utils/audio';
import { getWinnerOrdinalTitle } from '../utils/format';
import {
  Trophy,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Users,
  Award,
  RotateCcw,
  Settings,
} from 'lucide-react';

interface StageHeaderProps {
  activeCount: number;
  winners: Winner[];
  currentWinnerRank: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenExcelModal?: () => void;
  onOpenWinnersModal: () => void;
  onOpenBgModal?: () => void;
  onOpenSessionsModal?: () => void;
  onResetSession: () => void;
  onFinishSession?: () => void;
  isSpinning: boolean;
  hasLotterySession?: boolean;
  activeSessionTitle?: string;
  activeSessionDate?: string;
  activeSessionMaxWinners?: number;
}

export const StageHeader: React.FC<StageHeaderProps> = ({
  activeCount,
  winners,
  currentWinnerRank,
  settings,
  onUpdateSettings,
  onOpenExcelModal,
  onOpenWinnersModal,
  onOpenBgModal,
  onOpenSessionsModal,
  onResetSession,
  onFinishSession,
  isSpinning,
  hasLotterySession = true,
  activeSessionTitle,
  activeSessionDate,
  activeSessionMaxWinners,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentRankTitle = getWinnerOrdinalTitle(currentWinnerRank);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    sound.enabled = next;
    onUpdateSettings({ soundEnabled: next });
    if (next) sound.playTick(1);
  };

  return (
    <header className="relative z-30 w-full px-4 py-3 bg-slate-950/40 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Ceremony Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-400 via-amber-500 to-yellow-600 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2 select-none">
              <span>{hasLotterySession ? (settings.lotteryTitle || 'گردونه شانس و قرعه‌کشی') : 'سامانه جامع قرعه‌کشی پرسنلی'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                hasLotterySession
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {hasLotterySession ? 'مراسم زنده' : 'آماده‌سازی'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {hasLotterySession
                ? 'سامانه قرعه‌کشی پرسنلی با اکسل و حذف برندگان ادوار گذشته'
                : 'برای شروع مراسم، ابتدا از منو یک قرعه‌کشی جدید تعریف کنید'}
            </p>
          </div>
        </div>

        {/* Center: Current Draw Rank & Badges */}
        <div className="flex items-center gap-2">
          {/* Lottery Sessions & Archive Button */}
          {onOpenSessionsModal && (
            <button
              onClick={onOpenSessionsModal}
              disabled={isSpinning}
              title="مدیریت، تعریف قرعه‌کشی جدید و بایگانی دوره‌ها"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                hasLotterySession
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-amber-300'
                  : 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-300 animate-pulse'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${hasLotterySession ? 'text-amber-400' : 'text-slate-950'}`} />
              <span>{hasLotterySession ? 'لیست قرعه‌کشی‌ها' : 'تعریف قرعه‌کشی جدید'}</span>
              {hasLotterySession && activeSessionMaxWinners && (
                <span className="text-[10px] bg-amber-500/30 px-1.5 py-0.2 rounded font-mono text-white">
                  {winners.length}/{activeSessionMaxWinners}
                </span>
              )}
            </button>
          )}

          {/* Current Winner Rank Badge (only when lottery session is active) */}
          {hasLotterySession && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-sm">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-200">نوبت:</span>
              <span className="text-white font-black">{currentRankTitle}</span>
            </div>
          )}

          {/* Active Participants Badge */}
          <button
            onClick={onOpenSessionsModal}
            disabled={isSpinning}
            title="مشاهده شرکت‌کنندگان این دوره و بایگانی قرعه‌کشی‌ها"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">شرکت‌کنندگان:</span>
            <span className="font-bold text-amber-300 font-mono">{activeCount.toLocaleString('fa-IR')}</span>
          </button>

          {/* Winners Count Badge */}
          <button
            onClick={onOpenWinnersModal}
            disabled={isSpinning}
            title="مشاهده فهرست برندگان"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-medium text-amber-300 transition cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">برندگان:</span>
            <span className="font-bold text-white font-mono">{winners.length.toLocaleString('fa-IR')}</span>
          </button>

          {/* Finish Lottery Button */}
          {onFinishSession && winners.length > 0 && (
            <button
              onClick={() => {
                if (confirm(`آیا تمایل دارید قرعه‌کشی «${activeSessionTitle || 'جاری'}» با انتخاب ${winners.length} برنده خاتمه یابد و بایگانی شود؟`)) {
                  onFinishSession();
                }
              }}
              disabled={isSpinning}
              title="پایان دادن به این قرعه‌کشی و ثبت نهایی برندگان در بایگانی"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 border border-red-400/50 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-red-600/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>پایان قرعه‌کشی</span>
            </button>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Prize Title Display (only shown if configured and not empty) */}
          {settings.prizeTitle && settings.prizeTitle.trim() !== '' && (
            <div
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 select-none"
              title="عنوان جایزه (تنظیم از بخش تنظیمات)"
            >
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline text-slate-400">جایزه:</span>
              <span className="truncate max-w-[130px] font-bold text-white">{settings.prizeTitle}</span>
            </div>
          )}

          {/* Privacy Mobile Mask Toggle */}
          <button
            onClick={() => onUpdateSettings({ maskMobile: !settings.maskMobile })}
            title={settings.maskMobile ? 'نمایش کامل شماره‌ها' : 'مخفی‌سازی میانی شماره تماس'}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition cursor-pointer hidden sm:flex"
          >
            {settings.maskMobile ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={settings.soundEnabled ? 'قطع صدا' : 'وصل صدا'}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition cursor-pointer"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Settings & Algorithm Explanation Modal */}
          {onOpenBgModal && (
            <button
              onClick={onOpenBgModal}
              title="تنظیمات سامانه و مشاهده الگوریتم قرعه‌کشی"
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Button for Projectors / Stage */}
          <button
            onClick={toggleFullscreen}
            title="نمایش تمام‌صفحه برای پروژکتور"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
