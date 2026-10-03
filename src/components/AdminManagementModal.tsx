import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Edit3,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Cpu,
  MonitorCheck,
  Smartphone,
} from 'lucide-react';
import { AdminUser, AuthorizedDevice } from '../types';
import {
  fetchAdminsList,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  fetchAuthorizedDevices,
  revokeAuthorizedDevice,
} from '../utils/api';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser;
  onCurrentUserUpdated?: (updatedUser: AdminUser) => void;
}

export const AdminManagementModal: React.FC<AdminManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCurrentUserUpdated,
}) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [devices, setDevices] = useState<AuthorizedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'devices'>('list');

  // New Admin Form State
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsSuperAdmin, setNewIsSuperAdmin] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Edit Admin Form State
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsSuperAdmin, setEditIsSuperAdmin] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Deletion confirm state
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAdmins = async () => {
    setIsLoading(true);
    const list = await fetchAdminsList();
    setAdmins(list);
    setIsLoading(false);
  };

  const loadDevices = async () => {
    setDevicesLoading(true);
    const list = await fetchAuthorizedDevices();
    setDevices(list);
    setDevicesLoading(false);
  };

  const handleRevokeDevice = async (id: string, name: string) => {
    if (confirm(`آیا از ابطال مجوز و مسدود کردن کامپیوتر «${name}» اطمینان دارید؟`)) {
      setActionLoading(true);
      await revokeAuthorizedDevice(id);
      await loadDevices();
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAdmins();
      loadDevices();
      setCreateError(null);
      setCreateSuccess(null);
      setEditError(null);
      setEditSuccess(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditUsername(admin.username);
    setEditName(admin.name);
    setEditPassword('');
    setEditIsSuperAdmin(admin.isSuperAdmin);
    setEditError(null);
    setEditSuccess(null);
    setActiveTab('edit');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!newUsername.trim()) {
      setCreateError('لطفاً نام کاربری را وارد نمایید.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setCreateError('کلمه عبور باید حداقل ۴ کاراکتر باشد.');
      return;
    }

    setActionLoading(true);
    const result = await createAdminUser({
      username: newUsername.trim(),
      name: newName.trim() || newUsername.trim(),
      password: newPassword,
      isSuperAdmin: newIsSuperAdmin,
    });
    setActionLoading(false);

    if (result.success && result.admin) {
      setCreateSuccess(`کاربر ادمین جدید با نام «${result.admin.username}» با موفقیت افزوده شد.`);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewIsSuperAdmin(false);
      loadAdmins();
      setTimeout(() => {
        setActiveTab('list');
      }, 1000);
    } else {
      setCreateError(result.error || 'خطا در ایجاد ادمین.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditError(null);
    setEditSuccess(null);

    if (!editUsername.trim()) {
      setEditError('نام کاربری نمی‌تواند خالی باشد.');
      return;
    }

    setActionLoading(true);
    const result = await updateAdminUser(editingAdmin.id, {
      username: editUsername.trim(),
      name: editName.trim() || editUsername.trim(),
      password: editPassword.trim() ? editPassword.trim() : undefined,
      isSuperAdmin: currentUser.isSuperAdmin ? editIsSuperAdmin : editingAdmin.isSuperAdmin,
    });
    setActionLoading(false);

    if (result.success && result.admin) {
      setEditSuccess('مشخصات و رمز عبور با موفقیت به‌روزرسانی شد.');
      if (currentUser.id === editingAdmin.id && onCurrentUserUpdated) {
        onCurrentUserUpdated(result.admin);
      }
      loadAdmins();
      setTimeout(() => {
        setActiveTab('list');
        setEditingAdmin(null);
      }, 1200);
    } else {
      setEditError(result.error || 'خطا در به‌روزرسانی اطلاعات ادمین.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;
    setActionLoading(true);
    const result = await deleteAdminUser(adminToDelete.id);
    setActionLoading(false);

    if (result.success) {
      setAdminToDelete(null);
      loadAdmins();
    } else {
      alert(result.error || 'خطا در حذف کاربر ادمین.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden text-right">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>مدیریت کاربران و دسترسی‌های ادمین</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  ورود با: {currentUser.name || currentUser.username} ({currentUser.isSuperAdmin ? 'مدیر ارشد' : 'مدیر عادی'})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                امکان تغییر رمز عبور، تغییر نام کاربری، ایجاد ادمین‌های جدید و مدیریت دسترسی‌ها
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
              setEditingAdmin(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'list'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>فهرست مدیران سامانه ({admins.length})</span>
          </button>

          {currentUser.isSuperAdmin && (
            <button
              onClick={() => {
                setActiveTab('create');
                setEditingAdmin(null);
                setCreateError(null);
                setCreateSuccess(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>تعریف ادمین جدید</span>
            </button>
          )}

          {currentUser.isSuperAdmin && (
            <button
              onClick={() => {
                setActiveTab('devices');
                setEditingAdmin(null);
                loadDevices();
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'devices'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>قفل سخت‌افزاری و سیستم‌های مجاز ({devices.length})</span>
            </button>
          )}

          {activeTab === 'edit' && editingAdmin && (
            <button
              onClick={() => setActiveTab('edit')}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 mr-auto"
            >
              <Edit3 className="w-4 h-4" />
              <span>ویرایش: {editingAdmin.username}</span>
            </button>
          )}

          <button
            onClick={loadAdmins}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white mr-auto transition cursor-pointer"
            title="تازه‌سازی فهرست"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4">
          
          {/* TAB 1: ADMINS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {admins.length === 0 ? (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2">
                  <ShieldCheck className="w-10 h-10 text-slate-600" />
                  <p className="text-sm">در حال دریافت فهرست کاربران ادمین...</p>
                </div>
              ) : (
                admins.map((adm) => {
                  const isCurrent = adm.id === currentUser.id;
                  const canEdit = currentUser.isSuperAdmin || isCurrent;
                  const canDelete = currentUser.isSuperAdmin && !isCurrent;

                  return (
                    <div
                      key={adm.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.1)]'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          adm.isSuperAdmin ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {adm.isSuperAdmin ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm font-mono dir-ltr">{adm.username}</span>
                            <span className="text-xs text-slate-300 font-sans">({adm.name})</span>
                            {adm.isSuperAdmin && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                مدیر ارشد (Super Admin)
                              </span>
                            )}
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                حساب شما
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3 font-mono">
                            <span>شناسه: {adm.id}</span>
                            {adm.createdAt && <span>ایجاد: {new Date(adm.createdAt).toLocaleDateString('fa-IR')}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mr-auto sm:mr-0">
                        {canEdit && (
                          <button
                            onClick={() => handleStartEdit(adm)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-400/50 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>تغییر نام کاربری / رمز</span>
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => setAdminToDelete(adm)}
                            className="p-1.5 rounded-xl text-xs text-red-400 hover:bg-red-950/40 hover:text-red-300 transition cursor-pointer"
                            title="حذف این حساب مدیر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: CREATE ADMIN */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="max-w-xl mx-auto space-y-4 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <div className="text-center pb-2 border-b border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                  <span>تعریف کاربر ادمین جدید</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  مشخصات ادمین جدید را وارد فرمایید تا دسترسی ورود به سیستم برای ایشان صادر شود.
                </p>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نام کاربری (انگلیسی) *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="مثال: supervisor یا admin2"
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نام و عنوان نمایشی
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: مهندس حسینی (ناظر قرعه‌کشی)"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  کلمه عبور جدید *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="حداقل ۴ کاراکتر"
                    dir="ltr"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newIsSuperAdmin}
                    onChange={(e) => setNewIsSuperAdmin(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    دسترسی مدیر ارشد (امکان تعریف و تغییر سایر مدیران)
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>ثبت و صدور دسترسی ادمین</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EDIT ADMIN (UPDATE USERNAME OR PASSWORD) */}
          {activeTab === 'edit' && editingAdmin && (
            <form onSubmit={handleEditSubmit} className="max-w-xl mx-auto space-y-4 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 shadow-xl">
              <div className="text-center pb-2 border-b border-slate-800">
                <h4 className="text-base font-bold text-amber-300 flex items-center justify-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <span>تغییر نام کاربری و رمز عبور: {editingAdmin.username}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  می‌توانید نام کاربری یا کلمه عبور این ادمین را با امنیت کامل به‌روزرسانی فرمایید.
                </p>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              {/* Username (can be updated!) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نام کاربری ادمین (قابل ویرایش) *
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  در صورت تغییر، کاربر از این پس با نام کاربری جدید لاگین خواهد کرد.
                </p>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  نام و عنوان نمایشی
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="نام یا عنوان"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Password (optional update) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  کلمه عبور جدید (در صورت تمایل به تغییر)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="در صورت خالی ماندن، رمز عبور قبلی بدون تغییر حفظ می‌شود"
                    dir="ltr"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  برای تغییر رمز، رمز جدید را تایپ کنید. رمز به صورت هش‌شده امن با الگوریتم BCrypt ذخیره می‌شود.
                </p>
              </div>

              {currentUser.isSuperAdmin && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsSuperAdmin}
                      onChange={(e) => setEditIsSuperAdmin(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="text-xs font-bold text-slate-200">
                      دسترسی مدیر ارشد (Super Admin)
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingAdmin(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-linear-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 flex items-center gap-2 transition cursor-pointer shadow-md"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>ذخیره تغییرات ادمین</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: HARDWARE & MACHINE LOCK */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed space-y-1">
                  <div className="font-bold text-amber-300 text-sm">
                    وضعیت قفل سخت‌افزاری و محافظت ضدکپی (Hardware Lock & Anti-Cloning Active)
                  </div>
                  <p>
                    این سامانه مجهز به قفل تطابق سخت‌افزاری است. توکن‌های امنیتی و فایل‌های پایگاه داده به اثر انگشت دیجیتال و مشخصات سخت‌افزاری این رایانه پیوند خورده‌اند.
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    در صورت کپی کردن فایل‌ها یا توکن‌ها به هر کامپیوتر دیگر، سامانه خودکار قفل شده و اجازه ورود به هیچ کاربری داده نخواهد شد مگر با احراز هویت مستقیم ادمین ارشد.
                  </p>
                </div>
              </div>

              {/* Devices List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <MonitorCheck className="w-4 h-4 text-emerald-400" />
                    <span>رایانه‌های مجاز ثبت‌شده در سامانه ({devices.length}):</span>
                  </h4>
                  <button
                    onClick={loadDevices}
                    disabled={devicesLoading}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="تازه‌سازی لیست رایانه‌ها"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${devicesLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>

                {devices.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    هنوز کامپیوتری ثبت نشده است (در اولین لاگین رایانه جاری ثبت خواهد شد).
                  </div>
                ) : (
                  devices.map((dev) => (
                    <div
                      key={dev.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        dev.isPrimary
                          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-950/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          dev.isPrimary ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <MonitorCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{dev.deviceName}</span>
                            {dev.isPrimary && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                رایانه اصلی سامانه
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-3 font-mono">
                            <span title="اثر انگشت سخت‌افزاری">اثر انگشت: {dev.deviceFingerprint.substring(0, 16)}...</span>
                            {dev.lastUsedAt && <span>آخرین استفاده: {new Date(dev.lastUsedAt).toLocaleDateString('fa-IR')}</span>}
                          </div>
                        </div>
                      </div>

                      {!dev.isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleRevokeDevice(dev.id, dev.deviceName)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 hover:text-white bg-red-950/40 hover:bg-red-900 border border-red-500/30 transition cursor-pointer"
                        >
                          ابطال مجوز این رایانه
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Delete Confirmation Dialog */}
        {adminToDelete && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border-2 border-red-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-right">
              <div className="flex items-center gap-2.5 text-red-400">
                <ShieldAlert className="w-6 h-6" />
                <h4 className="text-base font-bold text-white">تأیید حذف حساب مدیر</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                آیا از حذف حساب کاربری مدیر <strong className="text-white font-mono">{adminToDelete.username}</strong> ({adminToDelete.name}) اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdminToDelete(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-750"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>بله، حذف کن</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
