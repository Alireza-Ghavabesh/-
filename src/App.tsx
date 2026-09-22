import React, { useState, useEffect } from 'react';
import { Participant, Winner, AppSettings } from './types';
import { getDemoParticipants } from './utils/excel';
import { getWinnerOrdinalTitle } from './utils/format';
import { LuckyWheel } from './components/LuckyWheel';
import { StageHeader } from './components/StageHeader';
import { WinnerModal } from './components/WinnerModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { WinnersListModal } from './components/WinnersListModal';
import { BackgroundSettingsModal } from './components/BackgroundSettingsModal';
import { Sparkles, Trophy, FileSpreadsheet, Image as ImageIcon, Users, RefreshCcw, RotateCcw, Settings } from 'lucide-react';
import {
  saveWinnerToDb,
  deleteWinnerFromDb,
  clearAllWinnersFromDb,
  fetchParticipantsFromDb,
  saveParticipantsToDb,
  fetchBackgroundsFromDb,
  fetchSettingsFromDb,
  saveSettingsToDb,
} from './utils/api';

const DEFAULT_SETTINGS: AppSettings = {
  lotteryTitle: 'گردونه شانس و قرعه‌کشی',
  prizeTitle: 'جایزه دور اول قرعه‌کشی',
  loanAmount: '50000000',
  useSettingsLoanAmount: true,
  spinDurationSeconds: 6.5,
  maskMobile: true,
  soundEnabled: true,
  bgImageUrl: null,
  bgDarkness: 30,
  themePreset: 'royal-gold',
};

export default function App() {
  // Clear any old persisted session state so reload always starts completely fresh
  useEffect(() => {
    try {
      localStorage.removeItem('lottery_active_participants');
      localStorage.removeItem('lottery_winners');
    } catch {
      // ignore
    }
  }, []);

  // Master participant pool (the baseline list, e.g. 459 participants or uploaded excel)
  const [masterParticipants, setMasterParticipants] = useState<Participant[]>(() => {
    try {
      const saved = localStorage.getItem('lottery_master_participants');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return getDemoParticipants(459);
  });

  // Active participants list (resets to full master list on every reload)
  const [participants, setParticipants] = useState<Participant[]>(() => {
    try {
      const saved = localStorage.getItem('lottery_master_participants');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    // Default 459 participants on initial run as requested
    return getDemoParticipants(459);
  });

  // Confirmed winners list in the current session (always starts empty on reload)
  const [winners, setWinners] = useState<Winner[]>([]);

  // On mount, load any saved participants or active background from SQLite database
  useEffect(() => {
    fetchParticipantsFromDb().then((dbParticipants) => {
      if (dbParticipants && dbParticipants.length > 0) {
        setMasterParticipants(dbParticipants);
        setParticipants(dbParticipants);
      }
    });

    fetchBackgroundsFromDb().then((bgs) => {
      if (bgs && bgs.length > 0) {
        const activeBg = bgs.find((b) => b.isActive) || bgs[0];
        if (activeBg && activeBg.imageBase64) {
          setSettings((prev) => ({
            ...prev,
            bgImageUrl: activeBg.imageBase64,
          }));
        }
      }
    });

    fetchSettingsFromDb().then((dbSettings) => {
      if (dbSettings && Object.keys(dbSettings).length > 0) {
        setSettings((prev) => ({
          ...prev,
          lotteryTitle: dbSettings.lotteryTitle || prev.lotteryTitle,
          prizeTitle: dbSettings.prizeTitle || prev.prizeTitle,
          loanAmount: dbSettings.loanAmount || prev.loanAmount,
          useSettingsLoanAmount: dbSettings.useSettingsLoanAmount !== undefined ? (dbSettings.useSettingsLoanAmount === 'true' || dbSettings.useSettingsLoanAmount === '1') : prev.useSettingsLoanAmount,
          spinDurationSeconds: dbSettings.spinDurationSeconds ? Number(dbSettings.spinDurationSeconds) : prev.spinDurationSeconds,
        }));
      }
    });
  }, []);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('lottery_settings');
      const savedBg = localStorage.getItem('lottery_custom_bg');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          bgImageUrl: savedBg || parsed.bgImageUrl || null,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  // State management
  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<Participant | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isWinnersModalOpen, setIsWinnersModalOpen] = useState(false);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  // Current winner rank in this session (1 for برنده اول, 2 for برنده دوم, ...)
  const currentWinnerRank = winners.length + 1;
  const currentRankTitle = getWinnerOrdinalTitle(currentWinnerRank);

  useEffect(() => {
    try {
      if (settings.lotteryTitle) {
        document.title = settings.lotteryTitle;
      }
      const copy = { ...settings };
      // avoid saving huge base64 in the general settings object
      if (copy.bgImageUrl && copy.bgImageUrl.length > 500) {
        copy.bgImageUrl = 'CUSTOM_SAVED';
      }
      localStorage.setItem('lottery_settings', JSON.stringify(copy));
    } catch {
      // ignore
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    saveSettingsToDb(newSettings);
  };

  const handleSpinStart = () => {
    setIsSpinning(true);
    setPendingWinner(null);
  };

  const handleSpinEnd = (winner: Participant) => {
    setIsSpinning(false);
    setPendingWinner(winner);
  };

  // Confirm winner: adds to winners list, saves to SQLite, and removes from active participants
  const handleConfirmWinner = (confirmedWinner: Winner) => {
    const rankTitle = getWinnerOrdinalTitle(winners.length + 1);
    const enrichedWinner: Winner = {
      ...confirmedWinner,
      drawRound: winners.length + 1,
      winnerRankTitle: rankTitle,
    };
    setWinners((prev) => [enrichedWinner, ...prev]);
    setParticipants((prev) => prev.filter((p) => p.id !== confirmedWinner.id));
    setPendingWinner(null);

    // Save to SQLite database
    saveWinnerToDb(enrichedWinner);
  };

  // Discard and redraw: ignores this result without removing the person
  const handleDiscardAndRedraw = () => {
    setPendingWinner(null);
  };

  // Restore a winner back to the active pool and remove from SQLite
  const handleRestoreWinner = (winnerToRestore: Winner) => {
    setWinners((prev) => prev.filter((w) => w.id !== winnerToRestore.id));
    const restoredParticipant: Participant = {
      id: winnerToRestore.id,
      rowNumber: winnerToRestore.rowNumber,
      fullName: winnerToRestore.fullName,
      personnelCode: winnerToRestore.personnelCode,
      mobile: winnerToRestore.mobile,
      chargeCredit: winnerToRestore.chargeCredit,
      creditDeferred: winnerToRestore.creditDeferred,
      originalRowIndex: winnerToRestore.originalRowIndex,
    };
    setParticipants((prev) => [restoredParticipant, ...prev]);

    // Remove from SQLite
    deleteWinnerFromDb(winnerToRestore.id);
  };

  const handleClearAllWinners = () => {
    setWinners([]);
    clearAllWinnersFromDb();
  };

  // Reset the current draw session: all master participants return to wheel and round starts at 1st winner
  const handleResetSession = () => {
    if (winners.length > 0) {
      if (!confirm(`آیا مایلید قرعه‌کشی ریست شده و از «برنده اول» دوباره آغاز شود؟ (${winners.length} برنده ثبت شده به لیست افراد بازمی‌گردند)`)) {
        return;
      }
    }
    setParticipants(masterParticipants);
    setWinners([]);
    setPendingWinner(null);
    clearAllWinnersFromDb();
  };

  const handleLoadNewParticipants = (newList: Participant[]) => {
    setMasterParticipants(newList);
    setParticipants(newList);
    setWinners([]);
    setPendingWinner(null);
    saveParticipantsToDb(newList, true);
    try {
      localStorage.setItem('lottery_master_participants', JSON.stringify(newList));
    } catch {
      // ignore
    }
  };

  const handleResetToDemo = () => {
    if (confirm('آیا مایلید لیست ۴۵۹ نفره پیش‌فرض بارگذاری و قرعه‌کشی از برنده اول آغاز شود؟')) {
      const demo = getDemoParticipants(459);
      setMasterParticipants(demo);
      setParticipants(demo);
      setWinners([]);
      setPendingWinner(null);
      saveParticipantsToDb(demo, true);
      try {
        localStorage.setItem('lottery_master_participants', JSON.stringify(demo));
      } catch {
        // ignore
      }
    }
  };

  // Background Theme Gradient Classes
  const getThemeBackground = () => {
    if (settings.bgImageUrl) return '';
    switch (settings.themePreset) {
      case 'midnight-stage':
        return 'bg-linear-to-b from-[#030712] via-[#0f172a] to-[#020617]';
      case 'emerald-gala':
        return 'bg-linear-to-b from-[#021d17] via-[#064e3b] to-[#021d17]';
      case 'neon-festive':
        return 'bg-linear-to-b from-[#1e102f] via-[#2e1065] to-[#0f0728]';
      case 'royal-gold':
      default:
        return 'bg-linear-to-b from-[#090d16] via-[#16120b] to-[#080b12]';
    }
  };

  return (
    <div
      className={`min-h-screen w-full relative flex flex-col justify-between text-slate-100 overflow-x-hidden selection:bg-amber-400 selection:text-slate-950 font-sans ${getThemeBackground()}`}
      style={
        settings.bgImageUrl
          ? {
              backgroundImage: `url(${settings.bgImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    >
      {/* Background Darkness / Readability Overlay */}
      {settings.bgImageUrl && (
        <div
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(2, 6, 23, ${settings.bgDarkness / 100})`,
          }}
        />
      )}

      {/* Ambient Floating Dust / Golden Sparkles Canvas Simulation */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-1/4 left-1/6 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/6 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-10 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Stage Header Controls */}
      <StageHeader
        activeCount={participants.length}
        winners={winners}
        currentWinnerRank={currentWinnerRank}
        settings={settings}
        onUpdateSettings={updateSettings}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenWinnersModal={() => setIsWinnersModalOpen(true)}
        onOpenBgModal={() => setIsBgModalOpen(true)}
        onResetSession={handleResetSession}
        isSpinning={isSpinning}
      />

      {/* Main Wheel Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-4 w-full">
        <LuckyWheel
          participants={participants}
          currentWinnerRank={currentWinnerRank}
          isSpinning={isSpinning}
          onSpinStart={handleSpinStart}
          onSpinEnd={handleSpinEnd}
          spinDurationSeconds={settings.spinDurationSeconds}
          maskMobile={settings.maskMobile}
          prizeTitle={settings.prizeTitle}
          loanAmount={settings.loanAmount}
          useSettingsLoanAmount={settings.useSettingsLoanAmount}
          disabled={participants.length === 0}
        />
      </main>

      {/* Bottom Stage Status & Presenter Quick Links */}
      <footer className="relative z-20 w-full px-4 py-2.5 bg-slate-950/60 backdrop-blur-md border-t border-white/10 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              افراد واجد شرایط در گردونه:
              <strong className="text-white font-mono">{participants.length} نفر</strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-1 text-slate-300 hidden sm:flex">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              تعداد هدایای اهدا شده:
              <strong className="text-amber-300 font-mono">{winners.length} نفر</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Small Gear Button for Settings in Footer */}
            <button
              id="btn-footer-settings"
              onClick={() => setIsBgModalOpen(true)}
              title="تنظیمات مراسم (عنوان، مقدار وام، جایزه، تصویر و سالن)"
              className="text-amber-300 hover:text-amber-200 transition flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400/70 cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>تنظیمات</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="text-slate-300 hover:text-amber-300 transition flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>بارگذاری اکسل جدید</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={handleResetSession}
              title="شروع مجدد قرعه‌کشی از برنده اول"
              className="text-amber-400/80 hover:text-amber-300 transition flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>شروع مجدد (برنده اول)</span>
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={handleResetToDemo}
              title="بارگذاری مجدد نمونه ۴۵۹ نفره آزمایشی"
              className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <RefreshCcw className="w-3 h-3" />
              <span className="hidden md:inline">نمونه ۴۵۹ نفر</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Small floating gear at bottom-left corner for immediate access */}
      <button
        id="btn-bottom-floating-settings"
        onClick={() => setIsBgModalOpen(true)}
        title="تنظیمات سامانه و قرعه‌کشی"
        className="fixed bottom-3.5 left-3.5 z-40 p-2.5 rounded-full bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700/80 hover:border-amber-400/60 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center group"
      >
        <Settings className="w-4 h-4 text-amber-400 group-hover:rotate-90 transition-transform duration-500" />
        <span className="sr-only">تنظیمات</span>
      </button>

      {/* Winner Celebration Modal */}
      <WinnerModal
        winner={pendingWinner}
        prizeTitle={settings.prizeTitle}
        drawRound={winners.length + 1}
        maskMobile={settings.maskMobile}
        loanAmount={settings.loanAmount}
        useSettingsLoanAmount={settings.useSettingsLoanAmount}
        onConfirmWinner={handleConfirmWinner}
        onDiscardAndRedraw={handleDiscardAndRedraw}
      />

      {/* Excel Upload & Manager Modal */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onLoadParticipants={handleLoadNewParticipants}
        currentCount={participants.length}
      />

      {/* Winners List Drawer / Modal */}
      <WinnersListModal
        isOpen={isWinnersModalOpen}
        onClose={() => setIsWinnersModalOpen(false)}
        winners={winners}
        onRestoreWinner={handleRestoreWinner}
        onClearAllWinners={handleClearAllWinners}
      />

      {/* Background Settings Modal */}
      <BackgroundSettingsModal
        isOpen={isBgModalOpen}
        onClose={() => setIsBgModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
