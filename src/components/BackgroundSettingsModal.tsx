import React, { useRef } from 'react';
import { AppSettings, ThemePreset } from '../types';
import { Image as ImageIcon, Sparkles, Sliders, X, Upload, Trash2, Check } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری معتبر انتخاب کنید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpdateSettings({ bgImageUrl: dataUrl });
      try {
        localStorage.setItem('lottery_custom_bg', dataUrl);
      } catch {
        // storage quota fallback
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onUpdateSettings({ bgImageUrl: null });
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
              <ImageIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تنظیمات پس‌زمینه و اتمسفر صحنه</h3>
              <p className="text-xs text-slate-400">
                قابلیت انتخاب عکس دلخواه یا تم‌های طراحی‌شده تشریفاتی
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
        <div className="py-4 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Custom Image Section */}
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
