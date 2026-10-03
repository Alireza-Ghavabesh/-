import React, { useState } from 'react';
import {
  Trophy,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Loader2,
  MonitorCheck,
  Check,
} from 'lucide-react';
import { AdminUser } from '../types';
import { loginAdmin, authorizeNewMachine } from '../utils/api';

interface AdminLoginScreenProps {
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Machine authorization dialog state (only if accessed from an unauthorized computer)
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [masterUser, setMasterUser] = useState('');
  const [masterPass, setMasterPass] = useState('');
  const [deviceName, setDeviceName] = useState('کامپیوتر جدید');
  const [authorizeLoading, setAuthorizeLoading] = useState(false);
  const [authorizeError, setAuthorizeError] = useState<string | null>(null);
  const [authorizeSuccess, setAuthorizeSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('لطفاً نام کاربری را وارد فرمایید.');
      return;
    }
    if (!password) {
      setErrorMessage('لطفاً رمز عبور را وارد فرمایید.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginAdmin(username.trim(), password);
    setIsLoading(false);

    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      if (result.code === 'UNAUTHORIZED_MACHINE') {
        setShowAuthorizeModal(true);
        setMasterUser(username.trim());
      }
      setErrorMessage(result.error || 'نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  const handleAuthorizeMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthorizeError(null);
    setAuthorizeSuccess(null);

    if (!masterPass) {
      setAuthorizeError('لطفاً رمز عبور ادمین ارشد را وارد نمایید.');
      return;
    }

    setAuthorizeLoading(true);
    const res = await authorizeNewMachine({
      masterUsername: masterUser.trim(),
      masterPassword: masterPass,
      deviceName: deviceName.trim(),
    });
    setAuthorizeLoading(false);

    if (res.success) {
      setAuthorizeSuccess('این رایانه با موفقیت در سیستم مجاز شد. اکنون می‌توانید وارد شوید.');
      setTimeout(() => {
        setShowAuthorizeModal(false);
        setErrorMessage(null);
      }, 1500);
    } else {
      setAuthorizeError(res.error || 'خطا در تایید و ثبت رایانه.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 font-sans overflow-hidden select-none" dir="rtl">
      {/* Background Ambience & Golden Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.18),rgba(15,23,42,0.98))]" />
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
        
        {/* Header with Trophy Icon */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-linear-to-br from-amber-400 via-yellow-500 to-amber-600 p-0.5 shadow-xl shadow-amber-500/25 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-amber-300" />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-white via-amber-200 to-amber-400">
              سامانه قرعه‌کشی و اعطای تسهیلات
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              ورود به پنل مدیریت
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-2 animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes('مجاز نشده') && (
              <button
                type="button"
                onClick={() => setShowAuthorizeModal(true)}
                className="px-2.5 py-1 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-white font-bold text-[11px] shrink-0 cursor-pointer"
              >
                تایید رایانه
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              نام کاربری
            </label>
            <div className="relative">
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <User className="w-4 h-4 text-amber-400/80" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="نام کاربری خود را وارد کنید"
                autoComplete="username"
                dir="ltr"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              رمز عبور
            </label>
            <div className="relative">
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="w-4 h-4 text-amber-400/80" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور خود را وارد کنید"
                autoComplete="current-password"
                dir="ltr"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer p-1"
                title={showPassword ? 'مخفی کردن' : 'نمایش رمز'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl font-black text-sm text-slate-950 bg-linear-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 active:scale-[0.98] shadow-lg shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>در حال ورود...</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span>ورود به سامانه</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Authorize New Machine Modal Dialog */}
      {showAuthorizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-right">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <MonitorCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">تایید و ثبت رایانه جدید</h3>
                <p className="text-xs text-slate-400">ورود رمز ادمین ارشد جهت بازگشایی سامانه روی این رایانه</p>
              </div>
            </div>

            {authorizeError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authorizeError}</span>
              </div>
            )}

            {authorizeSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{authorizeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthorizeMachine} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">نام کاربری ادمین ارشد:</label>
                <input
                  type="text"
                  value={masterUser}
                  onChange={(e) => setMasterUser(e.target.value)}
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">رمز عبور ادمین ارشد *:</label>
                <input
                  type="password"
                  value={masterPass}
                  onChange={(e) => setMasterPass(e.target.value)}
                  placeholder="رمز عبور مدیر اصلی"
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان این سیستم (اختیاری):</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="مثال: لپ‌تاپ یا کامپیوتر سالن"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAuthorizeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={authorizeLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {authorizeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MonitorCheck className="w-4 h-4" />}
                  <span>تایید و ثبت رایانه</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
