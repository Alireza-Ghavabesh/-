import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FileSpreadsheet,
  X,
  ShieldCheck,
  HardDrive,
  Clock,
  Sparkles,
  Users,
  Trophy,
  Sliders,
  Image as ImageIcon,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  fetchBackupExport,
  getBackupDownloadUrl,
  getRawDbDownloadUrl,
  inspectBackupData,
  restoreBackup,
  restoreRawDbFile,
  fetchBackupSnapshots,
} from '../utils/api';
import { BackupInspectionResult, BackupSnapshot, BackupStats } from '../types';

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'restore' | 'snapshots'>('export');

  // Export State
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [currentStats, setCurrentStats] = useState<BackupStats | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Restore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRawDbFile, setIsRawDbFile] = useState(false);
  const [parsedBackupData, setParsedBackupData] = useState<any>(null);
  const [rawDbBase64, setRawDbBase64] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<BackupInspectionResult | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Restore Options
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreSettings, setRestoreSettings] = useState(true);
  const [restoreAdmins, setRestoreAdmins] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoredCounts, setRestoredCounts] = useState<Record<string, number> | null>(null);

  // Snapshots State
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current stats when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state
      setSelectedFile(null);
      setParsedBackupData(null);
      setRawDbBase64(null);
      setInspectionResult(null);
      setInspectError(null);
      setRestoreSuccessMsg(null);
      setRestoredCounts(null);
      return;
    }

    loadCurrentStats();
    loadSnapshots();
  }, [isOpen]);

  const loadCurrentStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetchBackupExport();
      if (res.success && res.backup?.stats) {
        setCurrentStats(res.backup.stats);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const list = await fetchBackupSnapshots();
      setSnapshots(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  const handleDownloadSmartBackup = () => {
    setIsExporting(true);
    const link = document.createElement('a');
    link.href = getBackupDownloadUrl();
    link.download = `lottery-backup-${new Date().toISOString().slice(0, 10)}.lotterybackup`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 1200);
  };

  const handleDownloadRawDb = () => {
    const link = document.createElement('a');
    link.href = getRawDbDownloadUrl();
    link.download = `lottery-${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setInspectError(null);
    setInspectionResult(null);
    setRestoreSuccessMsg(null);
    setRestoredCounts(null);

    const isDb = file.name.endsWith('.db') || file.name.endsWith('.sqlite') || file.name.endsWith('.sqlite3');
    setIsRawDbFile(isDb);

    if (isDb) {
      // Raw SQLite file reading as Base64
      setIsInspecting(true);
      const reader = new FileReader();
      reader.onload = () => {
        setRawDbBase64(reader.result as string);
        setIsInspecting(false);
      };
      reader.onerror = () => {
        setInspectError('خطا در خواندن فایل دیتابیس.');
        setIsInspecting(false);
      };
      reader.readAsDataURL(file);
    } else {
      // Smart JSON/.lotterybackup file reading
      setIsInspecting(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const text = reader.result as string;
          const json = JSON.parse(text);
          setParsedBackupData(json);

          // Inspect via server
          const inspectRes = await inspectBackupData(json);
          if (inspectRes.success && inspectRes.result) {
            setInspectionResult(inspectRes.result);
          } else {
            setInspectError(inspectRes.error || 'ساختار فایل بکاپ نامعتبر است.');
          }
        } catch {
          setInspectError('فایل انتخاب‌شده یک فایل معتبر JSON یا .lotterybackup نیست.');
        } finally {
          setIsInspecting(false);
        }
      };
      reader.onerror = () => {
        setInspectError('خطا در بارگذاری فایل.');
        setIsInspecting(false);
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedFile) return;

    const confirmMsg =
      restoreMode === 'replace'
        ? 'هشدار: اطلاعات فعلی با داده‌های این نسخه پشتیبان جایگزین خواهند شد. یک نسخه اضطراری از داده‌های فعلی به طور خودکار قبل از اجرا ذخیره می‌شود. ادامه می‌دهید؟'
        : 'اطلاعات این فایل پشتیبان با داده‌های فعلی ادغام خواهند شد. آیا مطمئن هستید؟';

    if (!window.confirm(confirmMsg)) return;

    setIsRestoring(true);
    setRestoreSuccessMsg(null);
    setInspectError(null);

    try {
      if (isRawDbFile && rawDbBase64) {
        const res = await restoreRawDbFile(rawDbBase64);
        if (res.success) {
          setRestoreSuccessMsg('فایل دیتابیس با موفقیت بازگردانی شد.');
          if (onRestoreSuccess) onRestoreSuccess();
          loadCurrentStats();
          loadSnapshots();
        } else {
          setInspectError(res.error || 'خطا در بازگردانی فایل دیتابیس');
        }
      } else if (parsedBackupData) {
        const res = await restoreBackup({
          backupData: parsedBackupData,
          mode: restoreMode,
          restoreSettings,
          restoreAdmins,
        });

        if (res.success) {
          setRestoreSuccessMsg('دیتابیس با موفقیت و سازگاری کامل بازگردانی شد.');
          setRestoredCounts(res.restoredCounts || null);
          if (onRestoreSuccess) onRestoreSuccess();
          loadCurrentStats();
          loadSnapshots();
        } else {
          setInspectError(res.error || 'خطا در بازگردانی نسخه پشتیبان');
        }
      }
    } catch (err: unknown) {
      setInspectError((err as Error)?.message || 'عدم برقراری ارتباط با سرور');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>پشتیبان‌گیری و بازیابی کامل دیتابیس</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  سازگار با آپدیت‌های آینده
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                تهیه خروجی کامل از تمام جداول، شرکت‌کنندگان، سوابق دوره‌ها و تصاویر پس‌زمینه
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800 text-xs font-bold bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'export'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تهیه فایل پشتیبان (Export)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>بازگردانی نسخه پشتیبان (Restore)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer ${
              activeTab === 'snapshots'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>نسخه‌های اضطراری سرور ({snapshots.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6 animate-fade-in">
              {/* Current Database Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>وضعیت فعلی اطلاعات دیتابیس در حال استفاده:</span>
                  </span>
                  <button
                    onClick={loadCurrentStats}
                    disabled={isLoadingStats}
                    className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingStats ? 'animate-spin' : ''}`} />
                    <span>بروزرسانی آمار</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <Users className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                    <div className="text-base font-black text-white">
                      {currentStats?.participantsCount ?? '...'}
                    </div>
                    <div className="text-[10px] text-slate-400">شرکت‌کننده فعال</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <div className="text-base font-black text-white">
                      {currentStats?.winnersCount ?? '...'}
                    </div>
                    <div className="text-[10px] text-slate-400">برنده ثبت‌شده</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <Calendar className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-base font-black text-white">
                      {currentStats?.sessionsCount ?? '...'}
                    </div>
                    <div className="text-[10px] text-slate-400">دوره قرعه‌کشی</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <ImageIcon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <div className="text-base font-black text-white">
                      {currentStats?.backgroundsCount ?? '...'}
                    </div>
                    <div className="text-[10px] text-slate-400">تصویر پس‌زمینه</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
                    <Sliders className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                    <div className="text-base font-black text-white">
                      {currentStats?.settingsCount ?? '...'}
                    </div>
                    <div className="text-[10px] text-slate-400">تنظیمات سیستمی</div>
                  </div>
                </div>
              </div>

              {/* Card 1: Universal Smart Backup */}
              <div className="relative p-5 rounded-2xl bg-linear-to-br from-amber-950/20 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h4 className="text-base font-black text-white">
                        دانلود فایل پشتیبان هوشمند (.lotterybackup)
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black">
                        پیشنهادی و تضمین‌شده
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      این فایل استاندارد حاوی تمام اطلاعات دیتابیس (افراد، دوره‌ها، برندگان، مبالغ، تصاویر پس‌زمینه و تنظیمات) است.
                      <strong className="text-amber-300 block mt-1">
                        مزیت کلیدی: چنانچه برنامه را در آینده آپدیت کنید و ستون‌ها یا ویژگی‌های جدیدی به سیستم اضافه شوند، این فایل به صورت هوشمند با نسخه جدید مطابقت می‌یابد و هرگز با خطای ناسازگاری یا تداخل دیتابیس مواجه نخواهید شد.
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDownloadSmartBackup}
                    disabled={isExporting}
                    className="w-full py-3.5 px-6 rounded-xl bg-linear-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/30 transition cursor-pointer active:scale-[0.99]"
                  >
                    <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                    <span>دانلود فایل پشتیبان هوشمند (.lotterybackup)</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Direct SQLite Raw DB File */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-200">
                    دانلود مستقیم فایل خام دیتابیس فیزیکی (lottery.db)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  اگر به یک کپی دقیق از فایل فیزیکی SQLite موجود روی هارد دیسک سرور نیاز دارید، می‌توانید آن را به عنوان یک نسخه بایگانی مستقل دانلود کنید.
                </p>
                <button
                  onClick={handleDownloadRawDb}
                  className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل خام lottery.db</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE */}
          {activeTab === 'restore' && (
            <div className="space-y-6 animate-fade-in">
              {/* File Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition cursor-pointer text-center space-y-3 ${
                  selectedFile
                    ? 'bg-amber-500/10 border-amber-500/50'
                    : 'bg-slate-950/50 border-slate-700 hover:border-amber-500/50 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".lotterybackup,.json,.db,.sqlite,.sqlite3"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {selectedFile ? selectedFile.name : 'انتخاب یا رها کردن فایل بکاپ در اینجا'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    پشتیبانی از فایل‌های <code className="text-amber-400 font-mono">.lotterybackup</code>،{' '}
                    <code className="text-amber-400 font-mono">.json</code> و{' '}
                    <code className="text-amber-400 font-mono">.db</code>
                  </div>
                </div>
              </div>

              {/* Inspection in progress */}
              {isInspecting && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-3 text-slate-300 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>در حال بررسی محتویات و اعتبارسنجی فایل پشتیبان...</span>
                </div>
              )}

              {/* Inspection Error */}
              {inspectError && (
                <div className="p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{inspectError}</span>
                </div>
              )}

              {/* Inspection Success Box */}
              {inspectionResult && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>فایل پشتیبان شناسایی شد و کاملاً سازگار است:</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      تاریخ بکاپ: {inspectionResult.persianDate}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-sm font-black text-white">
                        {inspectionResult.stats.participantsCount}
                      </div>
                      <div className="text-[10px] text-slate-400">شرکت‌کننده</div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-sm font-black text-white">
                        {inspectionResult.stats.winnersCount}
                      </div>
                      <div className="text-[10px] text-slate-400">برنده ثبت‌شده</div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-sm font-black text-white">
                        {inspectionResult.stats.sessionsCount}
                      </div>
                      <div className="text-[10px] text-slate-400">دوره قرعه‌کشی</div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-sm font-black text-white">
                        {inspectionResult.stats.backgroundsCount}
                      </div>
                      <div className="text-[10px] text-slate-400">تصویر پس‌زمینه</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-300/80 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      انطباق هوشمند اسکیما: در صورت وجود تغییرات در ستون‌ها یا جداول نسخه‌های جدید، تمام رکوردهای سازگار به صورت ایمن درون‌ریزی می‌شوند.
                    </span>
                  </div>
                </div>
              )}

              {/* Raw DB Notice */}
              {isRawDbFile && rawDbBase64 && !isInspecting && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    فایل خام باینری دیتابیس انتخاب شده است. با بازگردانی، این فایل مستقیماً جایگزین فایل <code className="font-mono text-white">lottery.db</code> خواهد شد.
                  </span>
                </div>
              )}

              {/* Restore Configuration Options (Only shown when a valid file is loaded) */}
              {(inspectionResult || (isRawDbFile && rawDbBase64)) && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>تنظیمات و شیوه بازگردانی:</span>
                  </h5>

                  {/* Mode Selector (only for smart backup) */}
                  {!isRawDbFile && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          restoreMode === 'replace'
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 accent-amber-500"
                        />
                        <div>
                          <div className="font-bold">جایگزینی کامل (پیشنهادی)</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            داده‌های فعلی پاک و اطلاعات دقیقاً برابر با فایل بکاپ می‌شود.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                          restoreMode === 'merge'
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 accent-amber-500"
                        />
                        <div>
                          <div className="font-bold">ادغام با اطلاعات فعلی</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            اطلاعات فعلی حفظ شده و رکوردهای بکاپ به آن اضافه می‌گردند.
                          </div>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Selective checkboxes (only for smart backup) */}
                  {!isRawDbFile && (
                    <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restoreSettings}
                          onChange={(e) => setRestoreSettings(e.target.checked)}
                          className="accent-amber-500 rounded"
                        />
                        <span>بازگردانی تنظیمات ظاهری و عناوین</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={restoreAdmins}
                          onChange={(e) => setRestoreAdmins(e.target.checked)}
                          className="accent-amber-500 rounded"
                        />
                        <span>بازگردانی اطلاعات حساب‌های مدیران</span>
                      </label>
                    </div>
                  )}

                  {/* Action button */}
                  <div className="pt-2">
                    <button
                      onClick={handleExecuteRestore}
                      disabled={isRestoring}
                      className="w-full py-3 px-6 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer active:scale-[0.99]"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>در حال ایجاد نسخه اضطراری و بازگردانی دیتابیس...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>تأیید و اجرای نهایی بازگردانی اطلاعات</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-slate-500 text-center mt-2">
                      یک نسخه پشتیبان اضطراری از دیتابیس فعلی قبل از هر تغییری در سرور ذخیره می‌شود.
                    </p>
                  </div>
                </div>
              )}

              {/* Restore Success Message */}
              {restoreSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>{restoreSuccessMsg}</span>
                  </div>
                  {restoredCounts && (
                    <div className="text-[11px] text-emerald-300/80">
                      رکوردهای بازگردانی‌شده: {restoredCounts.participants ?? 0} شرکت‌کننده،{' '}
                      {restoredCounts.winners ?? 0} برنده، {restoredCounts.lottery_sessions ?? 0} دوره،{' '}
                      {restoredCounts.custom_backgrounds ?? 0} تصویر پس‌زمینه.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    نسخه‌های اضطراری ذخیره‌شده روی سرور (Pre-Restore Snapshots)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    سیستم قبل از اجرای هر بازگردانی، یک فایل پشتیبان با پسوند <code className="text-amber-400 font-mono">.bak</code> روی سرور ثبت می‌کند تا هیچ داده‌ای هرگز از دست نرود.
                  </p>
                </div>
                <button
                  onClick={loadSnapshots}
                  disabled={isLoadingSnapshots}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                  title="بروزرسانی لیست"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {snapshots.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                  هنوز نسخه اضطراری ایجاد نشده است. به محض اولین بازگردانی، نسخه‌های قبلی در اینجا لیست خواهند شد.
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.filename}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-mono text-slate-200 text-[11px]">{snap.filename}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            تاریخ: {snap.persianDate} — حجم: {snap.sizeKb} کیلوبایت
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                        ذخیره خودکار در سرور
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>پشتیبان‌گیری رمزنگاری‌شده و تطبیق‌پذیر با معماری SQLite</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
