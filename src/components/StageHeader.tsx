import React, { useState } from 'react';
import { AppSettings, Winner } from '../types';
import { sound } from '../utils/audio';
import { getWinnerOrdinalTitle } from '../utils/format';
import {
  Trophy,
  FileSpreadsheet,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  Award,
  RotateCcw,
} from 'lucide-react';

interface StageHeaderProps {
  activeCount: number;
  winners: Winner[];
  currentWinnerRank: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenExcelModal: () => void;
  onOpenWinnersModal: () => void;
  onOpenBgModal: () => void;
  onResetSession: () => void;
  isSpinning: boolean;
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
  onResetSession,
  isSpinning,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingPrize, setIsEditingPrize] = useState(false);
  const [tempPrize, setTempPrize] = useState(settings.prizeTitle);

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

  const handlePrizeSave = () => {
    if (tempPrize.trim()) {
      onUpdateSettings({ prizeTitle: tempPrize.trim() });
    }
    setIsEditingPrize(false);
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
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>گردونه شانس و قرعه‌کشی</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                مراسم زنده
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              سامانه قرعه‌کشی پرسنلی با اکسل و حذف برندگان ادوار گذشته
            </p>
          </div>
        </div>

        {/* Center: Current Draw Rank & Badges */}
        <div className="flex items-center gap-2">
          {/* Current Winner Rank Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-amber-200">نوبت قرعه:</span>
            <span className="text-white font-black">{currentRankTitle}</span>
          </div>

          {/* Active Participants Badge */}
          <button
            onClick={onOpenExcelModal}
            disabled={isSpinning}
            title="مشاهده و مدیریت فایل اکسل افراد"
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
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">برندگان:</span>
            <span className="font-bold text-white font-mono">{winners.length.toLocaleString('fa-IR')}</span>
          </button>

          {/* Reset Draw Session button */}
          <button
            onClick={onResetSession}
            disabled={isSpinning}
            title="شروع مجدد قرعه‌کشی از برنده اول"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">شروع مجدد (از برنده اول)</span>
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Change Prize Title Quick Button */}
          {isEditingPrize ? (
            <div className="flex items-center gap-1 bg-slate-900 border border-amber-400 rounded-xl px-2 py-1">
              <input
                type="text"
                value={tempPrize}
                onChange={(e) => setTempPrize(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePrizeSave()}
                className="bg-transparent text-xs text-white outline-none w-28 sm:w-36"
                placeholder="عنوان جایزه..."
                autoFocus
              />
              <button
                onClick={handlePrizeSave}
                className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded cursor-pointer"
              >
                ثبت
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempPrize(settings.prizeTitle);
                setIsEditingPrize(true);
              }}
              disabled={isSpinning}
              title="تغییر عنوان جایزه این دور"
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">جایزه:</span>
              <span className="truncate max-w-[120px] font-bold text-white">{settings.prizeTitle}</span>
            </button>
          )}

          {/* Excel Modal Trigger */}
          <button
            onClick={onOpenExcelModal}
            disabled={isSpinning}
            title="بارگذاری فایل اکسل"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Background Settings Modal Trigger */}
          <button
            onClick={onOpenBgModal}
            disabled={isSpinning}
            title="تنظیمات تصویر پس‌زمینه سالن"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 transition cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

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
