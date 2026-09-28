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
  const [activeTab, setActiveTab] = useState<'general' | 'algorithm'>('general');
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
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تنظیمات و شفافیت قرعه‌کشی</h3>
              <p className="text-xs text-slate-400">
                پیکربندی سامانه، ظاهر گردونه، و سازوکار ریاضی و امنیتی انتخاب برنده
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
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'general'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>تنظیمات عمومی و ظاهر استیج</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('algorithm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer relative ${
              activeTab === 'algorithm'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>الگوریتم بر زدن و نحوه قرعه‌کشی</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>

        {/* Tab 1: General Settings */}
        {activeTab === 'general' && (
          <div className="py-4 space-y-5 overflow-y-auto max-h-[65vh]">
            {/* 1. Prize Title Section */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between">
                <label htmlFor="input-prize-title" className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>عنوان عمومی جایزه (اختیاری):</span>
                </label>
                {settings.prizeTitle && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ prizeTitle: '' })}
                    className="text-[11px] text-red-400 hover:text-red-300 transition cursor-pointer"
                  >
                    حذف عنوان جایزه
                  </button>
                )}
              </div>
              <input
                id="input-prize-title"
                type="text"
                value={settings.prizeTitle}
                onChange={(e) => onUpdateSettings({ prizeTitle: e.target.value })}
                placeholder="در صورت تمایل عنوان دلخواه وارد کنید (اختیاری)"
                className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* 2. Spin Duration Section */}
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

            {/* 5. Custom Background Image */}
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
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-500/40 h-36 shadow-lg group">
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
                  className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 hover:bg-slate-800/30 transition"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    برای آپلود عکس پس‌زمینه سالن کلیک کنید
                  </span>
                </div>
              )}
            </div>

            {/* Theme Presets */}
            <div className="space-y-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                تم‌های استیج و صحنه قرعه‌کشی:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = settings.themePreset === theme.id && !settings.bgImageUrl;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onUpdateSettings({ themePreset: theme.id })}
                      className={`relative p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col gap-2 overflow-hidden ${
                        isSelected
                          ? 'border-amber-400 bg-slate-800/80 shadow-lg shadow-amber-500/10'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className={`w-full h-10 rounded-xl bg-linear-to-r ${theme.gradient} border border-white/10 flex items-center justify-end px-3`}>
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

        {/* Tab 2: Lottery Algorithm & Fairness Transparency */}
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

            {/* Step 2: CSPRNG Hardware Randomness */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono text-xs text-amber-300">
                  ۲
                </div>
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>مرحله دوم: تولید انتروپی تصادفی سخت‌افزاری (CSPRNG)</span>
              </div>
              <p className="text-slate-300 text-[11px] pr-8">
                به جای توابع معمولی سیستم‌ها، این سامانه از API امن <code>window.crypto.getRandomValues</code> و نمونه‌برداری دفعی (Rejection Sampling) استفاده می‌کند.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-8 pt-1 text-[11px]">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                  <div className="font-bold text-amber-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    غیرقابل پیش‌بینی (Non-deterministic)
                  </div>
                  <div className="text-slate-400 text-[10.5px]">
                    اعداد تصادفی از نویز فیزیکی پردازنده دستگاه استخراج می‌شوند و توسط هیچ فردی قابل پیش‌بینی یا مداخله نیستند.
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
                  <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1">
                    <Binary className="w-3.5 h-3.5 text-emerald-400" />
                    حذف خطای پیمانه (Zero Modulo Bias)
                  </div>
                  <div className="text-slate-400 text-[10.5px]">
                    با استفاده از تکنیک Rejection Sampling، شانس انتخاب نفر اول، وسط یا آخر لیست تا آخرین رقم اعشار یکسان است.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Anti-Duplicate Guaranteed System */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-mono text-xs text-amber-300">
                  ۳
                </div>
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>مرحله سوم: حذف تضمینی برنده از استخر شرکت‌کنندگان دورهای بعد</span>
              </div>
              <p className="text-slate-300 text-[11px] pr-8">
                به محض انتخاب و تأیید برنده در هر دور، مشخصات فرد در پایگاه داده مستقل ذخیره شده و از فهرست افراد فعال فوراً کسر می‌شود. بدین ترتیب هیچ فردی امکان برنده شدن بیش از یک بار در یک دوره را نخواهد داشت.
              </p>
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
            <span>تضمین سلامت و مساوات قرعه‌کشی با CSPRNG & Fisher-Yates</span>
          </div>

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
