import React, { useRef, useState, useEffect } from 'react';
import { AppSettings, ThemePreset, CustomBackground } from '../types';
import {
  Image as ImageIcon,
  Palette,
  Sliders,
  X,
  Upload,
  Trash2,
  Check,
  Edit3,
  Coins,
  Award,
  Clock,
  Settings,
  HelpCircle,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Shuffle,
  Dice5,
  Lock,
  Binary,
  Database,
  LogIn,
  Trophy,
  Sparkles,
  FileCheck,
  Gift,
  CreditCard,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Hash,
  Phone,
} from 'lucide-react';
import { fetchBackgroundsFromDb, saveBackgroundToDb, activateBackgroundInDb, deleteBackgroundFromDb } from '../utils/api';
import { formatLoanAmount } from '../utils/format';

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenBackupModal?: () => void;
}

const THEME_OPTIONS: { id: ThemePreset; name: string; gradient: string; desc: string }[] = [
  {
    id: 'royal-gold',
    name: 'سالن تشریفات طلایی (پیش‌فرض)',
    gradient: 'from-[#0b0f19] via-[#1a150a] to-[#0b0f19]',
    desc: 'هاله‌های کهکشانی طلایی با ذرات نورانی گرم',
  },
  {
    id: 'midnight-stage',
    name: 'استیج سرمه‌ای رسمی',
    gradient: 'from-[#030712] via-[#0f172a] to-[#020617]',
    desc: 'فضای کنفرانس بین‌المللی با نورهای آبی متمرکز',
  },
  {
    id: 'emerald-gala',
    name: 'زمردین و فاخر',
    gradient: 'from-[#021d17] via-[#064e3b] to-[#021d17]',
    desc: 'ترکیب لوکس سبز زمردی با اکسنت‌های طلایی',
  },
  {
    id: 'neon-festive',
    name: 'جشنواره نئونی پرانرژی',
    gradient: 'from-[#1e102f] via-[#2e1065] to-[#0f0728]',
    desc: 'شور و هیجان جشن با پرتوهای بنفش و ارغوانی',
  },
];

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenBackupModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'login' | 'backup' | 'algorithm'>('general');
  const [savedBackgrounds, setSavedBackgrounds] = useState<CustomBackground[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load backgrounds from SQLite whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchBackgroundsFromDb().then((bgs) => {
      if (bgs) {
        setSavedBackgrounds(bgs);
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری معتبر انتخاب کنید.');
      return;
    }

    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      onUpdateSettings({ bgImageUrl: dataUrl });

      // Save directly to SQLite database as Base64
      await saveBackgroundToDb({
        name: file.name,
        imageBase64: dataUrl,
        setActive: true,
      });

      // Reload saved backgrounds from SQLite
      const bgs = await fetchBackgroundsFromDb();
      if (bgs) setSavedBackgrounds(bgs);

      setIsSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSavedBg = async (bg: CustomBackground) => {
    onUpdateSettings({ bgImageUrl: bg.imageBase64 });
    await activateBackgroundInDb(bg.id);
    const bgs = await fetchBackgroundsFromDb();
    if (bgs) setSavedBackgrounds(bgs);
  };

  const handleDeleteSavedBg = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteBackgroundFromDb(id);
    const bgs = await fetchBackgroundsFromDb();
    if (bgs) setSavedBackgrounds(bgs);
  };

  const handleRemoveImage = () => {
    onUpdateSettings({ bgImageUrl: null });
    activateBackgroundInDb('default');
  };

  // Login Logo Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری معتبر برای لوگو انتخاب کنید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Persist directly to SQLite database
      onUpdateSettings({ loginLogoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    // Persist removal to SQLite database
    onUpdateSettings({ loginLogoUrl: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تنظیمات سامانه و دیتابیس</h3>
              <p className="text-xs text-slate-400">
                شخصی‌سازی صفحه ورود، ظاهر استیج، پشتیبان‌گیری و شفافیت الگوریتم
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
        <div className="flex items-center gap-1.5 pt-3 pb-2 border-b border-slate-800 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>ظاهر استیج و گردونه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>شخصی‌سازی صفحه لاگین</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>پشتیبان‌گیری دیتابیس</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('algorithm')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap relative ${
              activeTab === 'algorithm'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>الگوریتم قرعه‌کشی</span>
          </button>
        </div>

        {/* Tab 1: General Settings */}
        {activeTab === 'general' && (
          <div className="py-4 space-y-5 overflow-y-auto max-h-[65vh]">
            {/* 1. Prize Configuration Section */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>تنظیم پیش‌فرض نوع و مشخصات جایزه:</span>
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ prizeType: 'monetary' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      (settings.prizeType || 'monetary') === 'monetary'
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>مبلغ‌دار (وام/سکه/تسهیلات)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ prizeType: 'item' })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      settings.prizeType === 'item'
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>کالایی / غیرنقدی (حج/خودرو)</span>
                  </button>
                </div>
              </div>

              {(settings.prizeType || 'monetary') === 'monetary' ? (
                /* Monetary Settings */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>متن عنوان یا برچسب جایزه (به جای کلمه «وام»):</span>
                      </span>
                      <span className="text-[10px] text-slate-400">سکه، پاداش، تسهیلات و...</span>
                    </label>
                    <input
                      type="text"
                      value={settings.prizeLabel ?? 'وام'}
                      onChange={(e) => onUpdateSettings({ prizeLabel: e.target.value })}
                      placeholder="وام، سکه، تسهیلات، پاداش نقدی..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-slate-400">انتخاب سریع:</span>
                      {['وام', 'سکه طلا', 'تسهیلات بانکی', 'پاداش نقدی', 'کمک‌هزینه'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onUpdateSettings({ prizeLabel: c })}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                            (settings.prizeLabel ?? 'وام') === c
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      <span>مبلغ پیش‌فرض {settings.prizeLabel || 'وام'} (ریال):</span>
                    </label>
                    <input
                      type="text"
                      value={Number(settings.loanAmount || '50000000').toLocaleString('fa-IR')}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d۰-۹]/g, '');
                        const enRaw = raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                        onUpdateSettings({ loanAmount: enRaw || '0' });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-mono outline-none transition"
                    />
                    <p className="text-[11px] text-amber-400/80 mt-1 truncate">
                      معادل: {formatLoanAmount(settings.loanAmount || '50000000').words}
                    </p>
                  </div>
                </div>
              ) : (
                /* Non-Monetary Item Settings */
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>در این حالت هیچ مبلغ یا رقمی به عنوان قیمت نمایش داده نمی‌شود و تنها عنوان جایزه درج می‌گردد.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>عنوان یا نام جایزه غیرنقدی (مثلاً سفر حج عمره، یک دستگاه خودرو...):</span>
                    </label>
                    <input
                      type="text"
                      value={settings.prizeItemName ?? ''}
                      onChange={(e) => onUpdateSettings({ prizeItemName: e.target.value })}
                      placeholder="مثال: سفر زیارتی حج عمره، یک دستگاه خودرو..."
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-amber-200 font-bold placeholder-slate-500 outline-none transition"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {['سفر زیارتی حج عمره', 'سفر مشهد مقدس', 'یک دستگاه خودرو', 'یک عدد سکه بهار آزادی'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => onUpdateSettings({ prizeItemName: c })}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                            settings.prizeItemName === c
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Display & Privacy Options (Excel Row & Personnel Code Visibility) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>تنظیمات نمایش مشخصات برنده و حریم خصوصی در استیج:</span>
                </span>
                <span className="text-[10px] text-slate-400">امکان عدم نمایش اطلاعات مازاد</span>
              </div>

              <div className="space-y-2.5">
                {/* 1. Toggle Show Excel Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                      <span>نمایش «ردیف اکسل» در گردونه و پنجره معرفی برنده</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      در صورت غیرفعال بودن، عبارت «ردیف اکسل: ...» مخفی می‌شود.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ showExcelRow: settings.showExcelRow === false ? true : false })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.showExcelRow !== false ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                        settings.showExcelRow !== false ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Toggle Show Personnel Code */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-amber-400" />
                      <span>نمایش «کد پرسنلی» در گردونه و پنجره معرفی برنده</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      در صورت غیرفعال بودن، عبارت «کد پرسنلی: ...» مخفی می‌شود.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ showPersonnelCode: settings.showPersonnelCode === false ? true : false })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.showPersonnelCode !== false ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                        settings.showPersonnelCode !== false ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Toggle Mask Mobile */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>مخفی‌سازی میانی شماره تماس همراه (حفظ حریم خصوصی)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      چهار رقم میانی شماره همراه با ستاره پوشانده می‌شود (مثال: 0912***1234).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ maskMobile: !settings.maskMobile })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.maskMobile ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                        settings.maskMobile ? 'translate-x-0' : '-translate-x-5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Spin Duration Section */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>مدت زمان چرخش گردونه و ایجاد هیجان:</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">{settings.spinDurationSeconds} ثانیه</span>
              </div>
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={settings.spinDurationSeconds}
                onChange={(e) => onUpdateSettings({ spinDurationSeconds: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* 3. Custom Background Image Upload */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>تصویر پس‌زمینه اختصاصی استیج:</span>
                </span>
                {settings.bgImageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف تصویر فعلی</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-400/70 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-900/60 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">
                    {isSaving ? 'در حال ذخیره‌سازی در دیتابیس...' : 'انتخاب تصویر باکیفیت برای پس‌زمینه'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    فرمت‌های JPG، PNG و WebP — مستقیماً در دیتابیس ذخیره می‌شود
                  </p>
                </div>
              </div>

              {/* Saved Backgrounds list */}
              {savedBackgrounds.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-bold text-slate-400">تصاویر پس‌زمینه ذخیره‌شده در دیتابیس:</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {savedBackgrounds.map((bg) => (
                      <div
                        key={bg.id}
                        onClick={() => handleSelectSavedBg(bg)}
                        className={`relative rounded-xl overflow-hidden border-2 cursor-pointer group aspect-video ${
                          settings.bgImageUrl === bg.imageBase64
                            ? 'border-amber-400 shadow-md shadow-amber-500/20'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={bg.imageBase64}
                          alt={bg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedBg(e, bg.id)}
                          className="absolute top-1 left-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                          title="حذف از دیتابیس"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        {settings.bgImageUrl === bg.imageBase64 && (
                          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            <span>فعال</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Background Darkness Slider */}
            {settings.bgImageUrl && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>میزان تیرگی پس‌زمینه جهت خوانایی بهتر متون:</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold">{settings.bgDarkness}٪</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={settings.bgDarkness}
                  onChange={(e) => onUpdateSettings({ bgDarkness: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}

            {/* 5. Stage Color Themes */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>تم رنگی سالن تشریفات (هنگام عدم استفاده از عکس):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = settings.themePreset === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onUpdateSettings({ themePreset: theme.id })}
                      className={`p-3 rounded-xl border text-right transition flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/10 shadow-md shadow-amber-500/10'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl bg-linear-to-br ${theme.gradient} border border-white/20 shrink-0 flex items-center justify-center mt-0.5`}
                      >
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{theme.name}</div>
                        <div className="text-[11px] text-slate-400">{theme.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Login Screen Customization */}
        {activeTab === 'login' && (
          <div className="py-4 space-y-5 overflow-y-auto max-h-[65vh]">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                تمام تغییرات متون و لوگوی این بخش به طور مستقیم در دیتابیس سرور (<code className="font-mono text-white">lottery.db</code>) ذخیره می‌شوند.
              </span>
            </div>

            {/* Field 1: Login SubTitle (سامانه قرعه‌کشی و اعطای تسهیلات) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <label htmlFor="input-login-subtitle" className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>عنوان اصلی بالای صفحه لاگین (زیر لوگو):</span>
                </label>
                {settings.loginSubTitle !== 'سامانه قرعه‌کشی و اعطای تسهیلات' && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ loginSubTitle: 'سامانه قرعه‌کشی و اعطای تسهیلات' })}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    بازنشانی به پیش‌فرض
                  </button>
                )}
              </div>
              <input
                id="input-login-subtitle"
                type="text"
                value={settings.loginSubTitle ?? 'سامانه قرعه‌کشی و اعطای تسهیلات'}
                onChange={(e) => onUpdateSettings({ loginSubTitle: e.target.value })}
                placeholder="سامانه قرعه‌کشی و اعطای تسهیلات"
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Field 2: Login Header Title (ورود به پنل مدیریت) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <label htmlFor="input-login-headertitle" className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-amber-400" />
                  <span>متن زیرعنوان صفحه لاگین:</span>
                </label>
                {settings.loginHeaderTitle !== 'ورود به پنل مدیریت' && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ loginHeaderTitle: 'ورود به پنل مدیریت' })}
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    بازنشانی به پیش‌فرض
                  </button>
                )}
              </div>
              <input
                id="input-login-headertitle"
                type="text"
                value={settings.loginHeaderTitle ?? 'ورود به پنل مدیریت'}
                onChange={(e) => onUpdateSettings({ loginHeaderTitle: e.target.value })}
                placeholder="ورود به پنل مدیریت"
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Field 3: Login Top Logo (جایگزین عکس جام) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>آیکون / لوگوی بالای صفحه لاگین (جایگزین عکس جام):</span>
                </span>
                {settings.loginLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-red-400 hover:text-red-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف و بازگشت به جام طلایی</span>
                  </button>
                )}
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex items-center gap-4">
                {/* Current Logo Preview */}
                <div className="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-amber-500/40 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-lg">
                  {settings.loginLogoUrl ? (
                    <img
                      src={settings.loginLogoUrl}
                      alt="لوگوی صفحه لاگین"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                      <span className="text-[9px] text-slate-400 block mt-1">جام پیش‌فرض</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{settings.loginLogoUrl ? 'تغییر تصویر لوگو' : 'بارگذاری لوگو یا نشان اختصاصی'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    تصویر آرم شرکت، دانشگاه یا سازمان با فرمت PNG (ترجیحاً پس‌زمینه شفاف) یا JPG
                  </p>
                </div>
              </div>
            </div>

            {/* Field 4: Login Background Note */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>تصویر پس‌زمینه صفحه لاگین:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                تصویر پس‌زمینه صفحه لاگین به طور خودکار از تصویر پس‌زمینه فعال دیتابیس (انتخاب‌شده در تب ظاهر استیج) استفاده می‌کند و با بازنشانی یا تغییر در دیتابیس همگام می‌ماند.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Database Backup & Restore */}
        {activeTab === 'backup' && (
          <div className="py-4 space-y-5 overflow-y-auto max-h-[65vh]">
            <div className="p-5 rounded-2xl bg-linear-to-br from-amber-950/30 via-slate-900 to-slate-950 border-2 border-amber-500/40 shadow-xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>مرکز پشتیبان‌گیری و بازگردانی جامع دیتابیس</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                      تضمین سازگاری در آپدیت‌ها
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    این ابزار به شما امکان می‌دهد از تمامی اطلاعات دیتابیس شامل لیست کامل شرکت‌کنندگان، برندگان، سوابق دوره‌های قرعه‌کشی، تصاویر پس‌زمینه با کیفیت اصلی و تنظیمات، فایل پشتیبان <code className="text-amber-300 font-mono">.lotterybackup</code> دریافت کنید.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>مزیت ویژه در نسخه‌ها و آپدیت‌های آینده:</span>
                </div>
                <p>
                  در صورت به‌روزرسانی نرم‌افزار، اسکیما و ستون‌های دیتابیس به صورت هوشمند تطبیق داده می‌شوند و داده‌های شما بدون خطا و با صحت کامل بازیابی خواهند شد.
                </p>
              </div>

              {onOpenBackupModal && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBackupModal();
                    }}
                    className="w-full py-3.5 px-6 rounded-xl bg-linear-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25 transition cursor-pointer active:scale-[0.99]"
                  >
                    <Database className="w-5 h-5" />
                    <span>ورود به پنجره پشتیبان‌گیری و بازیابی دیتابیس</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Lottery Algorithm & Fairness Transparency */}
        {activeTab === 'algorithm' && (
          <div className="py-4 space-y-4 overflow-y-auto max-h-[65vh] text-slate-200 text-xs leading-relaxed">
            {/* Header Banner */}
            <div className="bg-linear-to-r from-emerald-950/60 via-slate-900 to-amber-950/40 border-2 border-emerald-500/40 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-emerald-300">
                  شفافیت کامل: سازوکار انتخاب برنده و عدالت ریاضی
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  این سامانه بر اساس الگوریتم استاندارد جهانی <strong>فیشر-یتز (Fisher-Yates Shuffle)</strong> همراه با تولیدکننده اعداد تصادفی رمزنگاری‌شده سخت‌افزاری <strong>CSPRNG</strong> عمل می‌کند تا احتمال برنده شدن تمام افراد، فارغ از ردیف یا زمان ورود، کاملاً برابر باشد.
                </p>
              </div>
            </div>

            {/* Step 1: Pre-Shuffle Explanation */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono text-xs text-amber-300">
                  ۱
                </div>
                <Shuffle className="w-4 h-4 text-amber-400" />
                <span>مرحله اول: بر زدن کامل کل فهرست (Fisher-Yates Shuffle)</span>
              </div>
              <p className="text-slate-300 text-[11px] pr-8">
                قبل از هر بار چرخش گردونه، آرایه تمام شرکت‌کنندگان واجد شرایط از طریق الگوریتم <strong>Knuth / Fisher-Yates</strong> در حافظه رم بر زده می‌شود.
              </p>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1 font-mono pr-8">
                <div>• برای هر خانه <span className="text-amber-300">i</span> از انتهای لیست تا ابتدا:</div>
                <div>• یک ایندکس تصادفی امن <span className="text-amber-300">j</span> بین ۰ تا i با آنتروپی سخت‌افزاری انتخاب می‌شود.</div>
                <div>• جایگاه فرد در ردیف i با ردیف j تعویض می‌گردد.</div>
              </div>
              <p className="text-[11px] text-emerald-300 pr-8 font-semibold">
                ✓ اثبات ریاضی: تمامی !N جایگشت ممکن با احتمال دقیقاً برابر (1/!N) به دست می‌آیند و هیچ ردیفی مزیتی نسبت به ردیف دیگر ندارد.
              </p>
            </div>

            {/* Step 2: CSPRNG Hardware Random Selection */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono text-xs text-amber-300">
                  ۲
                </div>
                <Binary className="w-4 h-4 text-amber-400" />
                <span>مرحله دوم: تولید عدد تصادفی با آنتروپی سخت‌افزاری (CSPRNG)</span>
              </div>
              <p className="text-slate-300 text-[11px] pr-8">
                انتخاب برنده با تابع استاندارد مرورگر <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">window.crypto.getRandomValues</code> انجام می‌گیرد (نه تابع Math.random معمولی).
              </p>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1 font-mono pr-8">
                <div>• تولید عدد ۳۲ بیتی تصادفی: <span className="text-amber-300">UInt32 (0 تا 4,294,967,295)</span></div>
                <div>• فرمول ایندکس برنده: <span className="text-emerald-400">winnerIndex = UInt32 % N</span></div>
                <div>• برنده قطعی: <span className="text-amber-300">shuffledParticipants[winnerIndex]</span></div>
              </div>
            </div>

            {/* Mathematical Summary Card */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Dice5 className="w-4 h-4 text-amber-400" />
                <span>احتمال برنده شدن هر نفر در هر دور:</span>
              </div>
              <div className="font-mono text-sm font-black text-white bg-slate-900 px-3 py-1 rounded-xl border border-amber-500/40">
                P = 1 / N
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ذخیره‌سازی پایدار و امن در دیتابیس SQLite</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
          >
            تأیید و بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
