import { Winner, Participant, CustomBackground, LotterySession, AdminUser, AuthorizedDevice, MachineStatus } from '../types';
import { getDeviceFingerprint, getDeviceDetails } from './deviceFingerprint';

/**
 * API helper to interact with server-side SQLite endpoints, JWT Authentication, and Hardware Machine Lock
 */

let cachedDeviceFp = '';
// Pre-calculate device fingerprint asynchronously
getDeviceFingerprint().then((fp) => {
  cachedDeviceFp = fp;
});

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('lottery_admin_jwt');
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem('lottery_admin_jwt', token);
    } else {
      localStorage.removeItem('lottery_admin_jwt');
    }
  } catch {
    // ignore
  }
}

export function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (cachedDeviceFp) {
    headers['X-Device-Fingerprint'] = cachedDeviceFp;
  }
  return headers;
}

// --- Authentication & Hardware Lock APIs ---

export async function loginAdmin(
  username: string,
  password: string
): Promise<{ success: boolean; user?: AdminUser; error?: string; code?: string }> {
  try {
    const deviceFingerprint = await getDeviceFingerprint();
    cachedDeviceFp = deviceFingerprint;
    const deviceDetails = getDeviceDetails();

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Fingerprint': deviceFingerprint,
      },
      credentials: 'include',
      body: JSON.stringify({ username, password, deviceFingerprint, deviceDetails }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) {
        setStoredToken(data.token);
      }
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'خطا در ورود به سیستم', code: data.code };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'عدم برقراری ارتباط با سرور' };
  }
}

export async function checkAuthMe(): Promise<AdminUser | null> {
  try {
    const deviceFingerprint = await getDeviceFingerprint();
    cachedDeviceFp = deviceFingerprint;

    const res = await fetch('/api/auth/me', {
      headers: {
        ...getAuthHeaders(),
        'X-Device-Fingerprint': deviceFingerprint,
      },
      credentials: 'include',
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        setStoredToken(null);
      }
      return null;
    }
    const data = await res.json();
    if (data.success && data.user) {
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutAdmin(): Promise<boolean> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    setStoredToken(null);
    return true;
  } catch {
    setStoredToken(null);
    return false;
  }
}

export async function fetchMachineStatus(): Promise<MachineStatus | null> {
  try {
    const deviceFingerprint = await getDeviceFingerprint();
    cachedDeviceFp = deviceFingerprint;

    const res = await fetch('/api/auth/machine-status', {
      headers: {
        ...getAuthHeaders(),
        'X-Device-Fingerprint': deviceFingerprint,
      },
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      return {
        isAuthorized: Boolean(data.isAuthorized),
        totalAuthorizedDevices: Number(data.totalAuthorizedDevices || 0),
        primaryDeviceName: data.primaryDeviceName,
        currentFingerprint: data.currentFingerprint || deviceFingerprint,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function authorizeNewMachine(payload: {
  masterUsername: string;
  masterPassword: string;
  deviceName?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const deviceFingerprint = await getDeviceFingerprint();
    cachedDeviceFp = deviceFingerprint;
    const deviceDetails = getDeviceDetails();

    const res = await fetch('/api/auth/authorize-machine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Fingerprint': deviceFingerprint,
      },
      credentials: 'include',
      body: JSON.stringify({
        ...payload,
        deviceFingerprint,
        deviceDetails,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'خطا در تایید کامپیوتر' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'عدم برقراری ارتباط با سرور' };
  }
}

export async function fetchAuthorizedDevices(): Promise<AuthorizedDevice[]> {
  try {
    const res = await fetch('/api/auth/authorized-devices', {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.devices || [];
  } catch {
    return [];
  }
}

export async function revokeAuthorizedDevice(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/auth/authorized-devices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminsList(): Promise<AdminUser[]> {
  try {
    const res = await fetch('/api/auth/admins', {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.admins || [];
  } catch (err) {
    console.warn('Failed to fetch admins list:', err);
    return [];
  }
}

export async function createAdminUser(payload: {
  username: string;
  password: string;
  name: string;
  isSuperAdmin: boolean;
}): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/admins', {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, admin: data.admin };
    }
    return { success: false, error: data.error || 'خطا در ایجاد ادمین' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'عدم برقراری ارتباط با سرور' };
  }
}

export async function updateAdminUser(
  id: string,
  payload: { username?: string; password?: string; name?: string; isSuperAdmin?: boolean }
): Promise<{ success: boolean; admin?: AdminUser; error?: string }> {
  try {
    const res = await fetch(`/api/auth/admins/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) {
        setStoredToken(data.token);
      }
      return { success: true, admin: data.admin };
    }
    return { success: false, error: data.error || 'خطا در به‌روزرسانی ادمین' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'عدم برقراری ارتباط با سرور' };
  }
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/auth/admins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'خطا در حذف ادمین' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message || 'عدم برقراری ارتباط با سرور' };
  }
}

// --- SQLite Lottery Data APIs ---

export async function fetchLotterySessionsFromDb(): Promise<LotterySession[]> {
  try {
    const res = await fetch('/api/lottery-sessions');
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || [];
  } catch (e) {
    console.warn('Could not fetch lottery sessions:', e);
    return [];
  }
}

export async function saveLotterySessionToDb(session: LotterySession): Promise<boolean> {
  try {
    const res = await fetch('/api/lottery-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not save lottery session:', e);
    return false;
  }
}

export async function deleteLotterySessionFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/lottery-sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not delete lottery session:', e);
    return false;
  }
}

export async function fetchWinnersFromDb(): Promise<Winner[] | null> {
  try {
    const res = await fetch('/api/winners');
    if (!res.ok) return null;
    const data = await res.json();
    return data.winners || [];
  } catch (e) {
    console.warn('Could not fetch winners from SQLite server:', e);
    return null;
  }
}

export async function saveWinnerToDb(winner: Winner): Promise<boolean> {
  try {
    const res = await fetch('/api/winners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(winner),
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not save winner to SQLite server:', e);
    return false;
  }
}

export async function deleteWinnerFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/winners/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not delete winner from SQLite server:', e);
    return false;
  }
}

export async function clearAllWinnersFromDb(): Promise<boolean> {
  try {
    const res = await fetch('/api/winners', {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not clear winners from SQLite server:', e);
    return false;
  }
}

export async function fetchParticipantsFromDb(): Promise<Participant[] | null> {
  try {
    const res = await fetch('/api/participants');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.participants) && data.participants.length > 0) {
      return data.participants;
    }
    return null;
  } catch (e) {
    console.warn('Could not fetch participants from SQLite server:', e);
    return null;
  }
}

export async function saveParticipantsToDb(participants: Participant[], resetWinners = true): Promise<boolean> {
  try {
    const res = await fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants, resetWinners }),
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not save participants to SQLite server:', e);
    return false;
  }
}

export async function fetchBackgroundsFromDb(): Promise<CustomBackground[] | null> {
  try {
    const res = await fetch('/api/backgrounds');
    if (!res.ok) return null;
    const data = await res.json();
    return data.backgrounds || [];
  } catch (e) {
    console.warn('Could not fetch backgrounds from SQLite server:', e);
    return null;
  }
}

export async function saveBackgroundToDb(bg: { id?: string; name: string; imageBase64: string; setActive?: boolean }): Promise<boolean> {
  try {
    const res = await fetch('/api/backgrounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bg),
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not save background to SQLite server:', e);
    return false;
  }
}

export async function activateBackgroundInDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/backgrounds/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not activate background in SQLite server:', e);
    return false;
  }
}

export async function deleteBackgroundFromDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/backgrounds/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not delete background in SQLite server:', e);
    return false;
  }
}

export async function fetchSettingsFromDb(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    const data = await res.json();
    return data.settings || {};
  } catch (e) {
    console.warn('Could not fetch settings from SQLite server:', e);
    return null;
  }
}

export async function saveSettingsToDb(settings: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not save settings to SQLite server:', e);
    return false;
  }
}
