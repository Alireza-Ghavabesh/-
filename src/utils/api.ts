import { Winner, Participant, CustomBackground } from '../types';

/**
 * API helper to interact with server-side SQLite endpoints
 */

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
