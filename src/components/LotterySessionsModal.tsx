import React, { useState, useEffect, useRef } from 'react';
import { LotterySession, Winner, Participant } from '../types';
import { formatLoanAmount } from '../utils/format';
import { exportWinnersToExcel, parseParticipantsExcel, getDemoParticipants } from '../utils/excel';
import { JalaliDatePicker } from './JalaliDatePicker';
import {
  Trophy,
  Calendar,
  CreditCard,
  Users,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  X,
  FileSpreadsheet,
  Download,
  Search,
  Upload,
  Award,
  Edit3,
  Check,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  FileText,
} from 'lucide-react';

export interface CreateLotterySessionInput {
  title: string;
  date: string;
  loanAmount: string;
  maxWinnersCount: number;
  participants: Participant[];
  excelFileName?: string;
}

interface LotterySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: LotterySession[];
  activeSession: LotterySession | null;
  onSelectActiveSession: (session: LotterySession) => void;
  onCreateSession: (newSession: CreateLotterySessionInput) => void;
  onUpdateSession?: (updatedSession: LotterySession) => void;
  onDeleteSession: (sessionId: string) => void;
  onFinishActiveSession?: () => void;
  isSpinning?: boolean;
}

export const LotterySessionsModal: React.FC<LotterySessionsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSession,
  onSelectActiveSession,
  onCreateSession,
  onUpdateSession,
  onDeleteSession,
  onFinishActiveSession,
  isSpinning = false,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<LotterySession | null>(null);
  const [detailsSubTab, setDetailsSubTab] = useState<'winners' | 'participants'>('winners');
  const [searchFilter, setSearchFilter] = useState('');

  // Editing state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLoanAmount, setEditLoanAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMaxWinners, setEditMaxWinners] = useState<number>(50);

  // Safe delete confirmation state
  const [sessionToDelete, setSessionToDelete] = useState<LotterySession | null>(null);

  // Form states for creating a new lottery
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now).split('/');
      const mStr = parts[1].padStart(2, '0');
      const dStr = parts[2].padStart(2, '0');
      return `${parts[0]}/${mStr}/${dStr}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
    } catch {
      return '۱۴۰۴/۰۷/۰۱';
    }
  });
  const [loanAmount, setLoanAmount] = useState('50000000');
  const [maxWinnersCount, setMaxWinnersCount] = useState<number>(50);

  // Excel state for the creation form
  const [uploadedParticipants, setUploadedParticipants] = useState<Participant[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Re-upload Excel for an existing session
  const [sessionForExcelUpdate, setSessionForExcelUpdate] = useState<LotterySession | null>(null);
  const reuploadFileInputRef = useRef<HTMLInputElement | null>(null);

  // If opened and no sessions exist at all, jump directly to create tab for smooth onboarding
  useEffect(() => {
    if (isOpen && sessions.length === 0) {
      setActiveTab('create');
    }
  }, [isOpen, sessions.length]);

  if (!isOpen) return null;

  const handleProcessExcelFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setExcelError('لطفاً یک فایل اکسل معتبر با پسوند xlsx یا xls یا csv انتخاب کنید.');
      return;
    }

    setIsParsingExcel(true);
    setExcelError(null);

    try {
      const report = await parseParticipantsExcel(file);
      if (report.parsedParticipants.length === 0) {
        setExcelError('هیچ شرکت‌کننده معتبری در فایل یافت نشد.');
        return;
      }
      setUploadedParticipants(report.parsedParticipants);
      setExcelFileName(file.name);
    } catch (err: unknown) {
      setExcelError((err as Error)?.message || 'خطا در پردازش و استخراج فایل اکسل.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadDemoParticipants = () => {
    setIsParsingExcel(true);
    setExcelError(null);
    setTimeout(() => {
      const demo = getDemoParticipants(459);
      setUploadedParticipants(demo);
      setExcelFileName('لیست_پیشفرض_۴۵۹_نفره_پرسنل.xlsx');
      setIsParsingExcel(false);
    }, 200);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('لطفاً عنوان یا نام قرعه‌کشی را وارد فرمایید.');
      return;
    }
    if (!date.trim()) {
      alert('لطفاً تاریخ برگزاری قرعه‌کشی را وارد نمایید.');
      return;
    }
    if (maxWinnersCount <= 0) {
      alert('ظرفیت تعداد برندگان باید حداقل ۱ نفر باشد.');
      return;
    }

    let finalParticipants = uploadedParticipants;
    let finalFileName = excelFileName;

    // If no excel uploaded, ask user to either upload or use default
    if (finalParticipants.length === 0) {
      const proceedWithDefault = confirm(
        'هنوز فایل اکسل شرکت‌کنندگان بارگذاری نشده است.\nآیا مایلید از لیست پیش‌فرض ۴۵۹ نفره آزمایشی پرسنل استفاده شود؟\n(در صورت انتخاب انصراف، لطفاً فایل اکسل خود را بارگذاری کنید)'
      );
      if (!proceedWithDefault) {
        return;
      }
      finalParticipants = getDemoParticipants(459);
      finalFileName = 'لیست_پیشفرض_۴۵۹_نفره_پرسنل.xlsx';
    }

    onCreateSession({
      title: title.trim(),
      date: date.trim(),
      loanAmount: loanAmount.replace(/[^\d]/g, '') || '50000000',
      maxWinnersCount: Number(maxWinnersCount) || 50,
      participants: finalParticipants,
      excelFileName: finalFileName,
    });

    // Reset create form
    setTitle('');
    setUploadedParticipants([]);
    setExcelFileName('');
    setActiveTab('list');
  };

  const handleStartEdit = (session: LotterySession) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
    setEditLoanAmount(session.loanAmount);
    setEditDate(session.date);
    setEditMaxWinners(session.maxWinnersCount);
  };

  const handleSaveEdit = (e: React.FormEvent, originalSession: LotterySession) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      alert('لطفاً عنوان قرعه‌کشی را وارد کنید.');
      return;
    }
    const cleanLoan = editLoanAmount.replace(/[^\d]/g, '') || originalSession.loanAmount;
    const updated: LotterySession = {
      ...originalSession,
      title: editTitle.trim(),
      loanAmount: cleanLoan,
      date: editDate.trim() || originalSession.date,
      maxWinnersCount: Number(editMaxWinners) > 0 ? Number(editMaxWinners) : originalSession.maxWinnersCount,
    };

    if (onUpdateSession) {
      onUpdateSession(updated);
    }
    setEditingSessionId(null);
    if (selectedSessionForDetails?.id === updated.id) {
      setSelectedSessionForDetails(updated);
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
  };

  // Re-upload excel for an existing session
  const handleReuploadForSession = async (file: File) => {
    if (!sessionForExcelUpdate) return;
    try {
      const report = await parseParticipantsExcel(file);
      if (report.parsedParticipants.length === 0) {
        alert('هیچ شرکت‌کننده‌ای در فایل یافت نشد.');
        return;
      }
      const updated: LotterySession = {
        ...sessionForExcelUpdate,
        participants: report.parsedParticipants,
        totalParticipantsCount: report.parsedParticipants.length,
        excelFileName: file.name,
      };

      if (onUpdateSession) {
        onUpdateSession(updated);
      }
      if (selectedSessionForDetails?.id === updated.id) {
        setSelectedSessionForDetails(updated);
      }
      setSessionForExcelUpdate(null);
      alert(`فایل اکسل قرعه‌کشی «${updated.title}» با موفقیت به‌روزرسانی شد (${report.parsedParticipants.length} نفر شرکت‌کننده).`);
    } catch (err: unknown) {
      alert((err as Error)?.message || 'خطا در بارگذاری فایل اکسل');
    }
  };

  const currentViewingSession = selectedSessionForDetails || activeSession || sessions[0] || null;

  const filteredWinners = currentViewingSession?.winners.filter((w) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      w.fullName.toLowerCase().includes(q) ||
      w.personnelCode.toLowerCase().includes(q) ||
      String(w.rowNumber).includes(q)
    );
  }) || [];

  const participantsList = currentViewingSession?.participants || [];
  const filteredParticipants = participantsList.filter((p) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.personnelCode.toLowerCase().includes(q) ||
      String(p.rowNumber).includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>تعریف و مدیریت قرعه‌کشی‌ها</span>
                {activeSession && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                    فعال: {activeSession.title}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                تعریف مشخصات قرعه‌کشی، بارگذاری اکسل اختصاصی شرکت‌کنندگان و مدیریت نتایج
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

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-800/80">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedSessionForDetails(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'list' && !selectedSessionForDetails
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>فهرست تمام قرعه‌کشی‌ها ({sessions.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('create');
              setSelectedSessionForDetails(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>تعریف قرعه‌کشی جدید و بارگذاری اکسل</span>
          </button>

          {selectedSessionForDetails && (
            <button
              onClick={() => setActiveTab('list')}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 mr-auto"
            >
              <span>مشاهده و مدیریت: {selectedSessionForDetails.title}</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {activeTab === 'create' ? (
            /* Create Session Form With Built-in Excel Upload */
            <form onSubmit={handleCreateSubmit} className="max-w-2xl mx-auto space-y-4 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <div className="text-center pb-2 border-b border-slate-800/80">
                <h4 className="text-base font-bold text-amber-300 flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" />
                  <span>مشخصات قرعه‌کشی جدید و شرکت‌کنندگان</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  مشخصات قرعه‌کشی را وارد و فایل اکسل مربوط به آن را مستقیماً بارگذاری فرمایید تا شرکت‌کنندگان آن تعیین گردند.
                </p>
              </div>

              {/* 1. Lottery Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  نام و عنوان قرعه‌کشی *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: قرعه‌کشی وام قرض‌الحسنه رفاهی پرسنل - دوره مهرماه"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 2. Lottery Date (Jalali Date Picker) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>تاریخ برگزاری قرعه‌کشی (شمسی) *</span>
                  </label>
                  <JalaliDatePicker
                    value={date}
                    onChange={(newDate) => setDate(newDate)}
                  />
                </div>

                {/* 3. Loan Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>مبلغ وام (ریال) *</span>
                  </label>
                  <input
                    type="text"
                    value={Number(loanAmount).toLocaleString('fa-IR')}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d۰-۹]/g, '');
                      const enRaw = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                      setLoanAmount(enRaw || '0');
                    }}
                    placeholder="۵۰,۰۰۰,۰۰۰ ریال"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                  <p className="text-[11px] text-amber-400/80 mt-1 font-medium truncate">
                    به حروف: {formatLoanAmount(loanAmount).words}
                  </p>
                </div>
              </div>

              {/* 4. Max Winners Capacity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>تعداد کل برندگان مجاز (سقف برندگان این دوره) *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={maxWinnersCount}
                  onChange={(e) => setMaxWinnersCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  مثال: ۵۰ نفر یا ۱۵۰ نفر برنده نهایی از کل شرکت‌کنندگان
                </p>
              </div>

              {/* 5. Built-in Excel Upload for THIS Lottery */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>فایل اکسل شرکت‌کنندگان مخصوص این قرعه‌کشی *</span>
                </label>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessExcelFile(e.target.files[0]);
                    }
                  }}
                />

                {uploadedParticipants.length > 0 ? (
                  /* Success Box with Uploaded Excel Summary */
                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-200 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span className="truncate max-w-[220px] sm:max-w-[320px]">{excelFileName || 'فایل اکسل پرسنل'}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono">
                            {uploadedParticipants.length.toLocaleString('fa-IR')} شرکت‌کننده
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-300/80 mt-0.5">
                          تمامی سطرهای اکسل با موفقیت خوانده و برای این قرعه‌کشی تنظیم شدند.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        <span>تغییر فایل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedParticipants([]);
                          setExcelFileName('');
                        }}
                        className="p-1.5 rounded-lg text-xs text-red-400 hover:bg-red-950/40 transition cursor-pointer"
                        title="حذف فایل اکسل"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dropzone / Upload Box */
                  <div
                    onDrop={handleFileDrop}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                        : 'border-slate-700 hover:border-amber-400/60 bg-slate-900/60 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                      {isParsingExcel ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                      ) : (
                        <Upload className="w-6 h-6 text-amber-400" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">
                        {isParsingExcel ? 'در حال بررسی و خواندن اکسل...' : 'برای بارگذاری فایل اکسل اینجا کلیک کنید یا فایل را بکشید'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        فرمت‌های مجاز: XLSX ، XLS یا CSV (اطلاعات افراد، کد پرسنلی و شماره تماس)
                      </p>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 font-medium">
                        انتخاب فایل اکسل شرکت‌کنندگان
                      </span>
                    </div>
                  </div>
                )}

                {/* Error notice if parsing failed */}
                {excelError && (
                  <div className="mt-2 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{excelError}</span>
                  </div>
                )}

                {/* Quick demo participant option */}
                {uploadedParticipants.length === 0 && (
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>فایل اکسل ندارید؟</span>
                    <button
                      type="button"
                      onClick={handleLoadDemoParticipants}
                      className="text-amber-400 hover:text-amber-300 hover:underline transition cursor-pointer font-bold"
                    >
                      استفاده از لیست پیش‌فرض ۴۵۹ نفره آزمایشی
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-linear-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت و فعال‌سازی این قرعه‌کشی</span>
                </button>
              </div>
            </form>
          ) : selectedSessionForDetails ? (
            /* Single Session Detail: Winners & Participants View */
            <div className="space-y-4">
              {/* Session Meta Header Card */}
              <div className="bg-slate-950/70 border border-amber-500/40 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-white">{selectedSessionForDetails.title}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        selectedSessionForDetails.status === 'completed'
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {selectedSessionForDetails.status === 'completed' ? '✓ پایان‌یافته و بایگانی‌شده' : '● در حال اجرا'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      تاریخ: {selectedSessionForDetails.date}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-amber-300">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      وام: {formatLoanAmount(selectedSessionForDetails.loanAmount).numeric}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      شرکت‌کنندگان: <strong className="font-mono text-white">{(selectedSessionForDetails.participants?.length || selectedSessionForDetails.totalParticipantsCount).toLocaleString('fa-IR')}</strong> نفر
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      برندگان: <strong className="font-mono text-amber-300">{selectedSessionForDetails.winners.length.toLocaleString('fa-IR')}</strong> از {selectedSessionForDetails.maxWinnersCount.toLocaleString('fa-IR')} نفر
                    </span>
                    {selectedSessionForDetails.excelFileName && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        فایل: {selectedSessionForDetails.excelFileName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      handleStartEdit(selectedSessionForDetails);
                      setSelectedSessionForDetails(null);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 hover:border-amber-400/50 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <span>ویرایش مشخصات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSessionForExcelUpdate(selectedSessionForDetails);
                      reuploadFileInputRef.current?.click();
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
                    title="بارگذاری فایل اکسل جدید برای جایگزینی شرکت‌کنندگان این دوره"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>به‌روزرسانی اکسل</span>
                  </button>

                  <button
                    onClick={() => exportWinnersToExcel(selectedSessionForDetails.winners)}
                    disabled={selectedSessionForDetails.winners.length === 0}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>خروجی اکسل برندگان</span>
                  </button>

                  {selectedSessionForDetails.status === 'active' && activeSession?.id !== selectedSessionForDetails.id && (
                    <button
                      onClick={() => {
                        onSelectActiveSession(selectedSessionForDetails);
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>فعال‌سازی در گردونه</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSessionToDelete(selectedSessionForDetails)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>حذف</span>
                  </button>

                  <button
                    onClick={() => setSelectedSessionForDetails(null)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  >
                    بازگشت
                  </button>
                </div>
              </div>

              {/* Sub-tabs: Winners vs Participants */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailsSubTab('winners')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      detailsSubTab === 'winners'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>فهرست برندگان ({selectedSessionForDetails.winners.length} نفر)</span>
                  </button>

                  <button
                    onClick={() => setDetailsSubTab('participants')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      detailsSubTab === 'participants'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>فهرست کل شرکت‌کنندگان این دوره ({(selectedSessionForDetails.participants?.length || selectedSessionForDetails.totalParticipantsCount).toLocaleString('fa-IR')} نفر)</span>
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-64 max-w-full">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="جستجو (نام، کد پرسنلی، ردیف)..."
                    className="w-full pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Sub-tab Content */}
              {detailsSubTab === 'winners' ? (
                /* Winners Table */
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                  {selectedSessionForDetails.winners.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      هنوز برنده‌ای برای این قرعه‌کشی به ثبت نرسیده است.
                    </div>
                  ) : filteredWinners.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      موردی با این عبارت جستجو یافت نشد.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80">
                      <div className="bg-slate-900/90 grid grid-cols-12 gap-2 p-3 text-xs font-bold text-amber-300">
                        <span className="col-span-2 text-center">نوبت / رتبه</span>
                        <span className="col-span-4">نام و نام خانوادگی</span>
                        <span className="col-span-2 text-center">ردیف اکسل</span>
                        <span className="col-span-2 text-center">کد پرسنلی</span>
                        <span className="col-span-2 text-center">تلفن همراه</span>
                      </div>
                      {filteredWinners.map((w) => (
                        <div
                          key={w.id}
                          className="grid grid-cols-12 gap-2 p-3 text-xs text-slate-300 items-center hover:bg-slate-800/30 transition"
                        >
                          <span className="col-span-2 text-center font-bold text-amber-300 bg-amber-500/15 py-1 px-2 rounded-lg border border-amber-500/30 text-[11px]">
                            {w.winnerRankTitle || `برنده ${w.drawRound}`}
                          </span>
                          <span className="col-span-4 font-bold text-white truncate">{w.fullName}</span>
                          <span className="col-span-2 text-center font-mono text-slate-300">{w.rowNumber}</span>
                          <span className="col-span-2 text-center font-mono text-slate-300">{w.personnelCode}</span>
                          <span className="col-span-2 text-center font-mono text-amber-200">{w.mobile}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Participants Table */
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
                  {participantsList.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-slate-600" />
                      <span>شرکت‌کنندگان این قرعه‌کشی با لیست پیش‌فرض ثبت شده‌اند.</span>
                      <button
                        onClick={() => {
                          setSessionForExcelUpdate(selectedSessionForDetails);
                          reuploadFileInputRef.current?.click();
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        بارگذاری فایل اکسل اختصاصی برای این دوره
                      </button>
                    </div>
                  ) : filteredParticipants.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      موردی یافت نشد.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
                      <div className="sticky top-0 bg-slate-900 grid grid-cols-12 gap-2 p-3 text-xs font-bold text-slate-300 border-b border-slate-800">
                        <span className="col-span-2 text-center">ردیف</span>
                        <span className="col-span-4">نام و نام خانوادگی</span>
                        <span className="col-span-3 text-center">کد پرسنلی</span>
                        <span className="col-span-3 text-center">تلفن همراه</span>
                      </div>
                      {filteredParticipants.map((p, idx) => (
                        <div
                          key={p.id}
                          className="grid grid-cols-12 gap-2 p-2.5 text-xs text-slate-300 items-center hover:bg-slate-800/30 transition"
                        >
                          <span className="col-span-2 text-center font-mono text-slate-400">{p.rowNumber || idx + 1}</span>
                          <span className="col-span-4 font-bold text-white truncate">{p.fullName}</span>
                          <span className="col-span-3 text-center font-mono text-slate-300">{p.personnelCode}</span>
                          <span className="col-span-3 text-center font-mono text-slate-300">{p.mobile}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Sessions List */
            <div className="space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-white">هیچ قرعه‌کشی هنوز ثبت نشده است.</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    برای شروع، روی دکمه زیر کلیک کرده و مشخصات قرعه‌کشی و فایل اکسل افراد را وارد کنید.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 px-6 py-3 bg-linear-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تعریف قرعه‌کشی جدید و بارگذاری اکسل</span>
                  </button>
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = activeSession?.id === s.id;
                  const isCompleted = s.status === 'completed';
                  const participantCount = s.participants?.length || s.totalParticipantsCount || 0;

                  return (
                    <div
                      key={s.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.15)]'
                          : isCompleted
                          ? 'bg-slate-950/60 border-slate-800 opacity-90'
                          : 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      {/* Left: Info or Edit Form */}
                      {editingSessionId === s.id ? (
                        <form onSubmit={(e) => handleSaveEdit(e, s)} className="w-full space-y-3 p-3 bg-slate-900/90 rounded-xl border border-amber-400/50">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                            <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              ویرایش عنوان و مشخصات قرعه‌کشی
                            </span>
                            <span className="text-[11px] text-slate-400">تغییرات بلافاصله ذخیره و اعمال می‌شود</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                نام و عنوان قرعه‌کشی:
                              </label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                مبلغ وام (ریال):
                              </label>
                              <input
                                type="text"
                                value={Number(editLoanAmount || '0').toLocaleString('fa-IR')}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^\d]/g, '');
                                  setEditLoanAmount(raw || '0');
                                }}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                                required
                              />
                              <p className="text-[10px] text-amber-400/80 mt-1">
                                معادل: {formatLoanAmount(editLoanAmount || '0').words}
                              </p>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                ظرفیت سقف برندگان:
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10000"
                                value={editMaxWinners}
                                onChange={(e) => setEditMaxWinners(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition cursor-pointer shadow-md"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>ذخیره تغییرات</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-black text-white">{s.title}</h4>
                              {isActive && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                                  ● در حال اجرا روی گردونه
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  پایان‌یافته
                                </span>
                              )}
                              {s.excelFileName && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/90 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                                  {s.excelFileName}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-slate-300 pt-1">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                تاریخ: {s.date}
                              </span>
                              <span className="flex items-center gap-1 font-mono text-amber-300">
                                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                                وام: {formatLoanAmount(s.loanAmount).numeric}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-amber-400" />
                                شرکت‌کنندگان این دوره: <strong className="font-mono text-white">{participantCount.toLocaleString('fa-IR')}</strong> نفر
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                برندگان: <strong className="font-mono text-amber-300 font-bold">{s.winners.length.toLocaleString('fa-IR')}</strong> از {s.maxWinnersCount.toLocaleString('fa-IR')} نفر
                              </span>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(s)}
                              title="ویرایش مشخصات این قرعه‌کشی"
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 hover:border-amber-400/50 transition cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              <span>ویرایش</span>
                            </button>

                            {/* View Details and Winners button */}
                            <button
                              onClick={() => {
                                setSelectedSessionForDetails(s);
                                setDetailsSubTab('winners');
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 transition cursor-pointer flex items-center gap-1"
                            >
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              <span>جزئیات و برندگان ({s.winners.length})</span>
                            </button>

                            {/* Export Excel button */}
                            <button
                              onClick={() => exportWinnersToExcel(s.winners)}
                              disabled={s.winners.length === 0}
                              title="خروجی فایل اکسل برندگان این قرعه‌کشی"
                              className="p-2 rounded-xl text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Finish / Select Active Button */}
                            {!isActive ? (
                              <button
                                onClick={() => {
                                  onSelectActiveSession(s);
                                  onClose();
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>انتخاب و ورود به گردونه</span>
                              </button>
                            ) : (
                              onFinishActiveSession && !isCompleted && (
                                <button
                                  onClick={() => {
                                    if (confirm(`آیا از پایان دادن به قرعه‌کشی «${s.title}» اطمینان دارید؟ نتایج و اسامی ${s.winners.length} برنده ذخیره و بایگانی خواهند شد.`)) {
                                      onFinishActiveSession();
                                    }
                                  }}
                                  disabled={isSpinning}
                                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600/90 hover:bg-red-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>پایان قرعه‌کشی</span>
                                </button>
                              )
                            )}

                            {/* Delete Session */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(s);
                              }}
                              className="p-2 rounded-xl text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 transition cursor-pointer"
                              title="حذف قرعه‌کشی"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            {activeSession ? (
              <span className="text-amber-300">
                قرعه‌کشی جاری: <strong>{activeSession.title}</strong> (سقف {activeSession.maxWinnersCount} برنده - {(activeSession.participants?.length || activeSession.totalParticipantsCount).toLocaleString('fa-IR')} شرکت‌کننده)
              </span>
            ) : (
              'هیچ قرعه‌کشی فعالی انتخاب نشده است.'
            )}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>

      {/* Hidden File Input for Re-uploading Excel to an existing session */}
      <input
        ref={reuploadFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleReuploadForSession(e.target.files[0]);
          }
        }}
      />

      {/* Confirmation Dialog Overlay for Deleting a Lottery */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl text-right space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-lg font-black text-white">تأیید حذف قرعه‌کشی</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                آیا از حذف قرعه‌کشی <span className="text-amber-300 font-bold">«{sessionToDelete.title}»</span> و تمامی برندگان و شرکت‌کنندگان آن اطمینان دارید؟
              </p>
              <p className="text-[11px] text-red-400/90 font-medium">
                توجه: این عملیات غیرقابل بازگشت است و رکورد این قرعه‌کشی از حافظه سامانه حذف خواهد شد.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                انصراف و بازگشت
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = sessionToDelete.id;
                  setSessionToDelete(null);
                  if (selectedSessionForDetails?.id === id) {
                    setSelectedSessionForDetails(null);
                  }
                  onDeleteSession(id);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>بله، حذف کن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
