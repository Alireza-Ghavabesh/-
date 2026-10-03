import React, { useState, useEffect } from 'react';
import { Participant, Winner, AppSettings, LotterySession, AdminUser } from './types';
import { getDemoParticipants } from './utils/excel';
import { getWinnerOrdinalTitle } from './utils/format';
import { LuckyWheel } from './components/LuckyWheel';
import { StageHeader } from './components/StageHeader';
import { WinnerModal } from './components/WinnerModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { WinnersListModal } from './components/WinnersListModal';
import { BackgroundSettingsModal } from './components/BackgroundSettingsModal';
import { LotterySessionsModal } from './components/LotterySessionsModal';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { AdminManagementModal } from './components/AdminManagementModal';
import { Trophy, FileSpreadsheet, Image as ImageIcon, Users, RefreshCcw, RotateCcw, Settings, PlusCircle, Plus, Calendar, AlertCircle } from 'lucide-react';
import {
  saveWinnerToDb,
  deleteWinnerFromDb,
  clearAllWinnersFromDb,
  fetchParticipantsFromDb,
  saveParticipantsToDb,
  fetchBackgroundsFromDb,
  fetchSettingsFromDb,
  saveSettingsToDb,
  fetchLotterySessionsFromDb,
  saveLotterySessionToDb,
  deleteLotterySessionFromDb,
  checkAuthMe,
  logoutAdmin,
} from './utils/api';

const DEFAULT_SETTINGS: AppSettings = {
  lotteryTitle: 'گردونه شانس و قرعه‌کشی',
  prizeTitle: '',
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
  // Authentication states
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Check login session on mount
  useEffect(() => {
    checkAuthMe()
      .then((user) => {
        setCurrentUser(user);
        setIsAuthChecking(false);
      })
      .catch(() => {
        setIsAuthChecking(false);
      });
  }, []);

  // Clear any old persisted session state so reload always starts completely fresh
  useEffect(() => {
    try {
      localStorage.removeItem('lottery_active_participants');
      localStorage.removeItem('lottery_winners');
    } catch {
      // ignore
    }
  }, []);

  // Master participant pool (the baseline list for the active lottery session)
  const [masterParticipants, setMasterParticipants] = useState<Participant[]>([]);

  // Active participants list in current wheel
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Confirmed winners list in the current session
  const [winners, setWinners] = useState<Winner[]>([]);

  // Lottery Sessions list (persistent in SQLite)
  const [sessions, setSessions] = useState<LotterySession[]>([]);
  const [activeSession, setActiveSession] = useState<LotterySession | null>(null);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isSessionsLoaded, setIsSessionsLoaded] = useState(false);

  // On mount, load sessions and participants from SQLite database
  useEffect(() => {
    fetchLotterySessionsFromDb().then((dbSessions) => {
      setIsSessionsLoaded(true);
      if (dbSessions && dbSessions.length > 0) {
        setSessions(dbSessions);
        // Find an active session or the latest one
        const active = dbSessions.find((s) => s.status === 'active') || dbSessions[0];
        if (active) {
          setActiveSession(active);
          const sessionParticipants = (active.participants && active.participants.length > 0)
            ? active.participants
            : [];

          if (sessionParticipants.length > 0) {
            setMasterParticipants(sessionParticipants);
            const winnerIds = new Set((active.winners || []).map((w) => w.id));
            setParticipants(sessionParticipants.filter((p) => !winnerIds.has(p.id)));
          } else {
            // Fallback to legacy participants table if session didn't have its own yet
            fetchParticipantsFromDb().then((dbParticipants) => {
              if (dbParticipants && dbParticipants.length > 0) {
                setMasterParticipants(dbParticipants);
                const winnerIds = new Set((active.winners || []).map((w) => w.id));
                setParticipants(dbParticipants.filter((p) => !winnerIds.has(p.id)));
              }
            });
          }

          if (active.winners && active.winners.length > 0) {
            setWinners(active.winners);
          }
          if (active.title) {
            setSettings((prev) => ({
              ...prev,
              lotteryTitle: active.title,
              loanAmount: active.loanAmount || prev.loanAmount,
            }));
          }
        }
      } else {
        setSessions([]);
        setActiveSession(null);
        setMasterParticipants([]);
        setParticipants([]);
        setWinners([]);
      }
    }).catch(() => {
      setIsSessionsLoaded(true);
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
        setSettings((prev) => {
          let prizeTitle = prev.prizeTitle;
          if (dbSettings.prizeTitle !== undefined) {
            prizeTitle = dbSettings.prizeTitle === 'جایزه دور اول قرعه‌کشی' ? '' : dbSettings.prizeTitle;
          }
          return {
            ...prev,
            lotteryTitle: dbSettings.lotteryTitle || prev.lotteryTitle,
            prizeTitle,
            loanAmount: dbSettings.loanAmount || prev.loanAmount,
            useSettingsLoanAmount: dbSettings.useSettingsLoanAmount !== undefined ? (dbSettings.useSettingsLoanAmount === 'true' || dbSettings.useSettingsLoanAmount === '1') : prev.useSettingsLoanAmount,
            spinDurationSeconds: dbSettings.spinDurationSeconds ? Number(dbSettings.spinDurationSeconds) : prev.spinDurationSeconds,
          };
        });
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
        if (parsed.prizeTitle === 'جایزه دور اول قرعه‌کشی') {
          parsed.prizeTitle = '';
        }
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
    const updatedWinners = [enrichedWinner, ...winners];
    setWinners(updatedWinners);
    setParticipants((prev) => prev.filter((p) => p.id !== confirmedWinner.id));
    setPendingWinner(null);

    // Save to SQLite database
    saveWinnerToDb(enrichedWinner);

    // Also update active session if exists
    if (activeSession) {
      const updatedSession: LotterySession = {
        ...activeSession,
        winners: updatedWinners,
      };
      setActiveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      saveLotterySessionToDb(updatedSession);
    }
  };

  // Discard and redraw: ignores this result without removing the person
  const handleDiscardAndRedraw = () => {
    setPendingWinner(null);
  };

  // Restore a winner back to the active pool and remove from SQLite
  const handleRestoreWinner = (winnerToRestore: Winner) => {
    const updatedWinners = winners.filter((w) => w.id !== winnerToRestore.id);
    setWinners(updatedWinners);
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

    // Update active session
    if (activeSession) {
      const updatedSession: LotterySession = {
        ...activeSession,
        winners: updatedWinners,
      };
      setActiveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      saveLotterySessionToDb(updatedSession);
    }
  };

  const handleClearAllWinners = () => {
    setWinners([]);
    clearAllWinnersFromDb();
    if (activeSession) {
      const updatedSession: LotterySession = {
        ...activeSession,
        winners: [],
      };
      setActiveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      saveLotterySessionToDb(updatedSession);
    }
  };

  // Create a brand new lottery session with its own participants & Excel file
  const handleCreateSession = (newSessionData: {
    title: string;
    date: string;
    loanAmount: string;
    maxWinnersCount: number;
    participants: Participant[];
    excelFileName?: string;
  }) => {
    const sessionParticipants = newSessionData.participants && newSessionData.participants.length > 0
      ? newSessionData.participants
      : (masterParticipants.length > 0 ? masterParticipants : getDemoParticipants(459));

    const newSession: LotterySession = {
      id: `lottery-${Date.now()}`,
      title: newSessionData.title,
      date: newSessionData.date,
      loanAmount: newSessionData.loanAmount,
      maxWinnersCount: newSessionData.maxWinnersCount,
      status: 'active',
      totalParticipantsCount: sessionParticipants.length,
      participants: sessionParticipants,
      excelFileName: newSessionData.excelFileName,
      winners: [],
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    setMasterParticipants(sessionParticipants);
    setParticipants(sessionParticipants);
    setWinners([]);
    clearAllWinnersFromDb();

    // Update settings with this lottery's title and loan amount
    updateSettings({
      lotteryTitle: newSession.title,
      loanAmount: newSession.loanAmount,
    });

    saveLotterySessionToDb(newSession);
    saveParticipantsToDb(sessionParticipants, true);
    setIsSessionsModalOpen(false);
  };

  // Switch active session from list
  const handleSelectActiveSession = (session: LotterySession) => {
    setActiveSession(session);
    setWinners(session.winners || []);

    const sessionParticipants = (session.participants && session.participants.length > 0)
      ? session.participants
      : (masterParticipants.length > 0 ? masterParticipants : getDemoParticipants(459));

    setMasterParticipants(sessionParticipants);

    // remove already won participants from wheel
    const winnerIds = new Set((session.winners || []).map((w) => w.id));
    setParticipants(sessionParticipants.filter((p) => !winnerIds.has(p.id)));

    updateSettings({
      lotteryTitle: session.title,
      loanAmount: session.loanAmount,
    });
  };

  // Finish active session and archive
  const handleFinishActiveSession = () => {
    if (!activeSession) return;
    const completedSession: LotterySession = {
      ...activeSession,
      status: 'completed',
      completedAt: new Date().toISOString(),
      winners,
      totalParticipantsCount: masterParticipants.length,
    };

    setActiveSession(completedSession);
    setSessions((prev) => prev.map((s) => (s.id === completedSession.id ? completedSession : s)));
    saveLotterySessionToDb(completedSession);
    setIsSessionsModalOpen(true);
  };

  // Update an existing lottery session (title, loan amount, date, max winners, participants)
  const handleUpdateSession = (updatedSession: LotterySession) => {
    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
    if (activeSession?.id === updatedSession.id) {
      setActiveSession(updatedSession);
      if (updatedSession.participants && updatedSession.participants.length > 0) {
        setMasterParticipants(updatedSession.participants);
        const winnerIds = new Set((updatedSession.winners || []).map((w) => w.id));
        setParticipants(updatedSession.participants.filter((p) => !winnerIds.has(p.id)));
      }
      updateSettings({
        lotteryTitle: updatedSession.title,
        loanAmount: updatedSession.loanAmount,
      });
    }
    saveLotterySessionToDb(updatedSession);
  };

  // Delete session
  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (activeSession?.id === sessionId) {
        const nextActive = remaining[0] || null;
        setActiveSession(nextActive);
        if (nextActive) {
          setWinners(nextActive.winners || []);
          const winnerIds = new Set((nextActive.winners || []).map((w) => w.id));
          setParticipants(masterParticipants.filter((p) => !winnerIds.has(p.id)));
          updateSettings({
            lotteryTitle: nextActive.title,
            loanAmount: nextActive.loanAmount,
          });
        } else {
          setWinners([]);
          setParticipants(masterParticipants);
        }
      }
      return remaining;
    });
    deleteLotterySessionFromDb(sessionId);
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

    if (activeSession) {
      const updatedSession: LotterySession = {
        ...activeSession,
        winners: [],
      };
      setActiveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      saveLotterySessionToDb(updatedSession);
    }
  };

  const handleLoadNewParticipants = (newList: Participant[]) => {
    setMasterParticipants(newList);
    setParticipants(newList);
    setWinners([]);
    setPendingWinner(null);
    saveParticipantsToDb(newList, true);

    // If an active session exists, update its total participants count
    if (activeSession) {
      const updatedSession: LotterySession = {
        ...activeSession,
        totalParticipantsCount: newList.length,
        winners: [],
      };
      setActiveSession(updatedSession);
      setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      saveLotterySessionToDb(updatedSession);
    }

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

  const handleLogout = async () => {
    if (confirm('آیا از خروج از حساب مدیریت سامانه اطمینان دارید؟')) {
      await logoutAdmin();
      setCurrentUser(null);
    }
  };

  // If still checking existing cookie / session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse mb-4 shadow-xl shadow-amber-500/10">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-300 font-bold">
          <span>در حال اعتبارسنجی نشست مدیر سامانه...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show Admin Login Screen
  if (!currentUser) {
    return <AdminLoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

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
        onOpenWinnersModal={() => setIsWinnersModalOpen(true)}
        onOpenBgModal={() => setIsBgModalOpen(true)}
        onOpenSessionsModal={() => setIsSessionsModalOpen(true)}
        onResetSession={handleResetSession}
        onFinishSession={activeSession ? handleFinishActiveSession : undefined}
        isSpinning={isSpinning}
        hasLotterySession={Boolean(activeSession)}
        activeSessionTitle={activeSession?.title}
        activeSessionDate={activeSession?.date}
        activeSessionMaxWinners={activeSession?.maxWinnersCount}
        currentUser={currentUser}
        onOpenAdminManagement={() => setIsAdminModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Wheel Stage or Empty State */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-4 w-full">
        {isSessionsLoaded && (!activeSession || sessions.length === 0) ? (
          /* Empty State: No Lottery Defined Yet or None Active */
          <div className="w-full max-w-xl mx-auto px-4 py-8 animate-fadeIn">
            <div className="relative bg-slate-900/80 backdrop-blur-xl border-2 border-amber-500/40 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 overflow-hidden">
              {/* Decorative Background Glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

              {/* Icon Box */}
              <div className="relative w-20 h-20 mx-auto rounded-3xl bg-linear-to-br from-amber-500/30 via-amber-500/10 to-transparent border-2 border-amber-400/50 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Trophy className="w-10 h-10 text-amber-400 animate-pulse" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                  <Plus className="w-4 h-4 text-slate-950 font-bold" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-amber-200 to-amber-400">
                  {sessions.length === 0 ? 'هیچ قرعه‌کشی‌ای تعریف نشده است' : 'هیچ قرعه‌کشی‌ای در حال حاضر فعال نیست'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  {sessions.length === 0
                    ? 'برای شروع مراسم و به‌کارگیری گردونه، لطفاً ابتدا یک قرعه‌کشی جدید تعریف کنید و فایل اکسل شرکت‌کنندگان مخصوص آن را بارگذاری فرمایید.'
                    : 'تمامی قرعه‌کشی‌های قبلی پایان یافته‌اند. می‌توانید قرعه‌کشی جدید با اکسل مربوطه تعریف کنید یا یکی از دوره‌ها را انتخاب نمایید.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  id="btn-define-lottery-empty-state"
                  onClick={() => setIsSessionsModalOpen(true)}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-sm sm:text-base bg-linear-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-xl shadow-amber-500/30 hover:scale-[1.03] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5 fill-slate-950 text-amber-400" />
                  <span>تعریف قرعه‌کشی جدید و بارگذاری اکسل</span>
                </button>

                {sessions.length > 0 && (
                  <button
                    onClick={() => setIsSessionsModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-3.5 rounded-2xl font-bold text-xs sm:text-sm bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>مشاهده بایگانی دوره‌ها ({sessions.length})</span>
                  </button>
                )}
              </div>

              {/* Helper Notice */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>هر قرعه‌کشی شرکت‌کنندگان مخصوص خود را دارد و فایل اکسل آن به صورت اختصاصی ذخیره می‌شود.</span>
              </div>
            </div>
          </div>
        ) : (
          <LuckyWheel
            participants={participants}
            currentWinnerRank={currentWinnerRank}
            lastWinner={winners[0] || null}
            pendingWinner={pendingWinner}
            isSpinning={isSpinning}
            onSpinStart={handleSpinStart}
            onSpinEnd={handleSpinEnd}
            spinDurationSeconds={settings.spinDurationSeconds}
            maskMobile={settings.maskMobile}
            prizeTitle={settings.prizeTitle}
            loanAmount={settings.loanAmount}
            useSettingsLoanAmount={settings.useSettingsLoanAmount}
            disabled={participants.length === 0}
            maxWinnersCount={activeSession?.maxWinnersCount}
            currentWinnersCount={winners.length}
            lotteryTitle={activeSession?.title}
            onFinishLottery={handleFinishActiveSession}
            onOpenSettings={() => setIsBgModalOpen(true)}
          />
        )}
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
            <span className="flex items-center gap-1 text-slate-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              تعداد برنده انتخاب شده:
              <strong className="text-amber-300 font-mono">
                {winners.length} {activeSession?.maxWinnersCount ? `از ${activeSession.maxWinnersCount}` : ''} نفر
              </strong>
            </span>
            {activeSession ? (
              <>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-amber-400 font-bold hidden sm:inline">
                  قرعه‌کشی فعال: {activeSession.title} ({activeSession.date})
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline">
                  هیچ قرعه‌کشی‌ای فعال نیست
                </span>
              </>
            )}
          </div>

        </div>
      </footer>

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

      {/* Lottery Sessions & Archive Modal */}
      <LotterySessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        sessions={sessions}
        activeSession={activeSession}
        onSelectActiveSession={handleSelectActiveSession}
        onCreateSession={handleCreateSession}
        onUpdateSession={handleUpdateSession}
        onDeleteSession={handleDeleteSession}
        onFinishActiveSession={handleFinishActiveSession}
        isSpinning={isSpinning}
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

      {/* Admin Management Modal */}
      {currentUser && (
        <AdminManagementModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentUser={currentUser}
          onCurrentUserUpdated={(updated) => setCurrentUser(updated)}
        />
      )}
    </div>
  );
}
