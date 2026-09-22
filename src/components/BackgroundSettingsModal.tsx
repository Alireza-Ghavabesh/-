import React, { useRef, useState, useEffect } from 'react';
import { AppSettings, ThemePreset, CustomBackground } from '../types';
import {
  Image as ImageIcon,
  Sparkles,
  Sliders,
  X,
  Upload,
  Trash2,
  Check,
  Database,
  Loader2,
  Edit3,
  Coins,
  Award,
  Clock,
  Settings,
} from 'lucide-react';
import { fetchBackgroundsFromDb, saveBackgroundToDb, activateBackgroundInDb, deleteBackgroundFromDb } from '../utils/api';
import { formatLoanAmount } from '../utils/format';

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
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
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

      // Save to SQLite database as Base64
      await saveBackgroundToDb({
        name: file.name,
        imageBase64: dataUrl,
        setActive: true,
      });

      // Reload saved backgrounds
      const bgs = await fetchBackgroundsFromDb();
      if (bgs) setSavedBackgrounds(bgs);

      setIsSaving(false);
      try {
        localStorage.setItem('lottery_custom_bg', dataUrl);
      } catch {
        // ignore storage quota
      }
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
    try {
      localStorage.removeItem('lottery_custom_bg');
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تنظیمات سامانه و قرعه‌کشی</h3>
              <p className="text-xs text-slate-400">
                تعیین عنوان قرعه‌کشی، مقدار وام، عنوان جایزه، سرعت گردونه و تم سالن
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

        {/* Body */}
        <div className="py-4 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* 1. Ceremony / Lottery Title Section */}
          <div className="bg-slate-950/70 border border-amber-500/40 rounded-2xl p-4 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label htmlFor="input-lottery-title" className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>عنوان قرعه‌کشی (متن بالای صفحه):</span>
              </label>
              <span className="text-[11px] text-slate-400">نمایش زنده در بالای صفحه</span>
            </div>

            <input
              id="input-lottery-title"
              type="text"
              value={settings.lotteryTitle}
              onChange={(e) => onUpdateSettings({ lotteryTitle: e.target.value })}
              placeholder="گردونه شانس و قرعه‌کشی"
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm font-bold text-white placeholder-slate-500 outline-none transition"
            />

            {/* Quick Title Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-400 ml-1">پیش‌فرض‌ها:</span>
              {[
                'گردونه شانس و قرعه‌کشی',
                'مراسم قرعه‌کشی وام پرسنلی',
                'جشن بزرگ سالانه و قرعه‌کشی',
                'قرعه‌کشی تسهیلات قرض‌الحسنه',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onUpdateSettings({ lotteryTitle: suggestion })}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition cursor-pointer ${
                    settings.lotteryTitle === suggestion
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Loan Amount Section (مقدار وام از تنظیمات) */}
          <div className="bg-slate-950/70 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <label htmlFor="input-loan-amount" className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>مقدار وام قرعه‌کشی (به ریال):</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatLoanAmount(settings.loanAmount || '50000000').numeric}
              </span>
            </div>

            <div className="relative">
              <input
                id="input-loan-amount"
                type="text"
                value={settings.loanAmount || ''}
                onChange={(e) => onUpdateSettings({ loanAmount: e.target.value })}
                placeholder="مثال: 50000000 یا 50,000,000"
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm font-black text-amber-300 font-mono placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Real-time Display of Amount in Numbers and Words */}
            {settings.loanAmount && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="text-slate-300 flex items-center gap-1 font-medium">
                  <span>نمایش در صفحه اعلام برنده:</span>
                </span>
                <div className="text-left sm:text-right font-bold text-amber-300">
                  <span className="font-mono text-sm ml-1.5">{formatLoanAmount(settings.loanAmount).numeric}</span>
                  {formatLoanAmount(settings.loanAmount).words && (
                    <span className="text-amber-200/90 text-[11px]">({formatLoanAmount(settings.loanAmount).words})</span>
                  )}
                </div>
              </div>
            )}

            {/* Quick Loan Amount Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-400 ml-1">مبالغ رایج:</span>
              {[
                { label: '۵۰ میلیون ریال (۵ م.ت)', value: '50000000' },
                { label: '۱۰۰ میلیون ریال (۱۰ م.ت)', value: '100000000' },
                { label: '۲۰۰ میلیون ریال (۲۰ م.ت)', value: '200000000' },
                { label: '۵۰۰ میلیون ریال (۵۰ م.ت)', value: '500000000' },
                { label: '۱ میلیارد ریال (۱۰۰ م.ت)', value: '1000000000' },
              ].map((preset) => {
                const isMatch = (settings.loanAmount || '').replace(/[^\d]/g, '') === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onUpdateSettings({ loanAmount: preset.value })}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      isMatch
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 font-bold'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Apply to All Winners Toggle */}
            <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.useSettingsLoanAmount !== false}
                onChange={(e) => onUpdateSettings({ useSettingsLoanAmount: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-400 cursor-pointer"
              />
              <span>اعمال این مقدار وام برای کلیه برندگان قرعه‌کشی</span>
            </label>
          </div>

          {/* 3. Prize Title Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <label htmlFor="input-prize-title" className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>عنوان جایزه قرعه‌کشی:</span>
              </label>
            </div>

            <input
              id="input-prize-title"
              type="text"
              value={settings.prizeTitle}
              onChange={(e) => onUpdateSettings({ prizeTitle: e.target.value })}
              placeholder="مثال: وام قرض‌الحسنه یا جایزه دور اول"
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
            />

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-400 ml-1">پیش‌فرض‌ها:</span>
              {[
                'وام قرض‌الحسنه',
                'تسهیلات قرض‌الحسنه سازمانی',
                'جایزه ویژه دوره اول',
                'هدیه ممتاز پرسنلی',
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdateSettings({ prizeTitle: p })}
                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition cursor-pointer ${
                    settings.prizeTitle === p
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Spin Duration Section */}
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

          {/* 5. Custom Image Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                تصویر پس‌زمینه دلخواه (اختیاری):
              </span>
              {settings.bgImageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف عکس و بازگشت به تم پیش‌فرض</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {settings.bgImageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 h-44 shadow-lg group">
                <img
                  src={settings.bgImageUrl}
                  alt="Custom Background"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition cursor-pointer"
                  >
                    تغییر تصویر
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 hover:bg-slate-800/30 transition"
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-300">
                  برای آپلود عکس پس‌زمینه سالن کلیک کنید
                </span>
                <span className="text-[11px] text-slate-500">
                  (فرمت‌های JPG، PNG، WebP - در صورت عدم آپلود، تم‌های زیر نمایش داده می‌شوند)
                </span>
              </div>
            )}

            {/* SQLite Status / Loading Indicator */}
            {isSaving && (
              <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>در حال تبدیل و ذخیره مستقیم تصویر در دیتابیس SQLite...</span>
              </div>
            )}

            {/* Saved Backgrounds in SQLite */}
            {savedBackgrounds.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-1.5 text-amber-300">
                    <Database className="w-3.5 h-3.5" />
                    تصاویر ذخیره‌شده در دیتابیس SQLite ({savedBackgrounds.length} مورد):
                  </span>
                  <span className="text-[11px] text-slate-500">جهت اعمال کلیک کنید</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {savedBackgrounds.map((bg) => {
                    const isCurrent = settings.bgImageUrl === bg.imageBase64;
                    return (
                      <div
                        key={bg.id}
                        onClick={() => handleSelectSavedBg(bg)}
                        className={`group relative rounded-xl overflow-hidden h-20 border-2 cursor-pointer transition ${
                          isCurrent ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-800 hover:border-amber-500/50'
                        }`}
                      >
                        <img src={bg.imageBase64} alt={bg.name} className="w-full h-full object-cover" />
                        {isCurrent && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                            <Check className="w-3 h-3 font-bold" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedBg(e, bg.id)}
                          title="حذف از دیتابیس"
                          className="absolute bottom-1 left-1 p-1 rounded-md bg-slate-950/80 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Darkness Overlay Slider (crucial when using custom photos on projectors) */}
            {settings.bgImageUrl && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    میزان تیرگی لایه روی عکس (جهت خوانایی در پروژکتور):
                  </span>
                  <span className="font-mono text-amber-300">{settings.bgDarkness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={settings.bgDarkness}
                  onChange={(e) => onUpdateSettings({ bgDarkness: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Theme Presets (When no image or as fallback) */}
          <div className="space-y-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              تم‌های استیج و صحنه قرعه‌کشی:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_OPTIONS.map((theme) => {
                const isSelected = settings.themePreset === theme.id && !settings.bgImageUrl;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ themePreset: theme.id });
                    }}
                    className={`relative p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col gap-2 overflow-hidden ${
                      isSelected
                        ? 'border-amber-400 bg-slate-800/80 shadow-lg shadow-amber-500/10'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div
                      className={`w-full h-12 rounded-xl bg-linear-to-r ${theme.gradient} border border-white/10 flex items-center justify-end px-3`}
                    >
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                          <Check className="w-4 h-4" />
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

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
          >
            تأیید و بازگشت به صحنه
          </button>
        </div>
      </div>
    </div>
  );
};
