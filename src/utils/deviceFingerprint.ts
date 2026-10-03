/**
 * Generates a unique, deterministic hardware and browser fingerprint for the current machine.
 * This prevents tokens or sessions from being copied and used on other computers.
 */

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Vazirmatn', Arial, sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('LotterySecureStage_2026!#$%', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('LotterySecureStage_2026!#$%', 4, 17);

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'no-webgl';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return `${vendor}~${renderer}`;
    }
    return gl.getParameter(gl.RENDERER) || 'webgl-renderer';
  } catch {
    return 'webgl-error';
  }
}

async function sha256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback simple hash if subtle crypto fails
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      hash = (hash << 5) - hash + message.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// Persistent device secret uniquely generated on this physical machine
function getOrCreateDeviceSecret(): string {
  const KEY = '__lottery_hw_device_anchor_key__';
  try {
    let secret = localStorage.getItem(KEY);
    if (!secret) {
      secret = 'dev_' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)) + '_' + Date.now().toString(36);
      localStorage.setItem(KEY, secret);
    }
    return secret;
  } catch {
    return 'fallback_device_key';
  }
}

let cachedDeviceFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedDeviceFingerprint) {
    return cachedDeviceFingerprint;
  }

  const components = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.hardwareConcurrency || 4,
    screen.width + 'x' + screen.height + 'x' + (screen.colorDepth || 24),
    new Date().getTimezoneOffset(),
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getOrCreateDeviceSecret(),
  ];

  const raw = components.join('###');
  const hash = await sha256(raw);
  cachedDeviceFingerprint = hash;
  return hash;
}

export function getDeviceDetails(): {
  screen: string;
  cores: number;
  platform: string;
  browser: string;
} {
  return {
    screen: `${window.screen?.width || 0}×${window.screen?.height || 0}`,
    cores: navigator.hardwareConcurrency || 4,
    platform: navigator.platform || 'Unknown OS',
    browser: navigator.userAgent.split(' ')[0] || 'Browser',
  };
}
