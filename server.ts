import express from 'express';
import path from 'path';
import fs from 'fs';
import initSqlJs, { Database } from 'sql.js';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import os from 'os';

const isAiStudioCloud = Boolean(process.env.APPLET_ID || process.env.K_SERVICE);
const PORT = (!isAiStudioCloud && process.env.PORT)
  ? parseInt(process.env.PORT, 10)
  : (isAiStudioCloud ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000) : 4000);
const DB_FILE = path.join(process.cwd(), 'lottery.db');
const JWT_SECRET = process.env.JWT_SECRET || 'lottery_master_ultra_secure_jwt_secret_2026_key_9390acb6';

let db: Database;

function saveDb() {
  try {
    const binaryArray = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(binaryArray));
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();

  // If old lottery.sqlite exists and lottery.db doesn't, migrate automatically
  const oldSqliteFile = path.join(process.cwd(), 'lottery.sqlite');
  if (!fs.existsSync(DB_FILE) && fs.existsSync(oldSqliteFile)) {
    try {
      fs.copyFileSync(oldSqliteFile, DB_FILE);
      console.log('Migrated old lottery.sqlite to lottery.db');
    } catch (e) {
      console.warn('Could not copy old lottery.sqlite:', e);
    }
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing SQLite database from', DB_FILE);
    } catch (e) {
      console.warn('Could not read existing SQLite database, creating new one', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created fresh in-memory SQLite database');
  }

  // Create tables if they do not exist
  db.run(`
    CREATE TABLE IF NOT EXISTS winners (
      id TEXT PRIMARY KEY,
      draw_round INTEGER,
      winner_rank_title TEXT,
      prize_title TEXT,
      full_name TEXT,
      personnel_code TEXT,
      mobile TEXT,
      row_number TEXT,
      loan_amount TEXT,
      loan_words TEXT,
      credit_deferred TEXT,
      charge_credit TEXT,
      won_at TEXT,
      created_at TEXT,
      prize_type TEXT DEFAULT 'monetary',
      prize_label TEXT DEFAULT 'وام',
      prize_item_name TEXT,
      instagram_username TEXT,
      lottery_mode TEXT DEFAULT 'personnel'
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      row_number TEXT,
      full_name TEXT,
      personnel_code TEXT,
      mobile TEXT,
      credit_deferred TEXT,
      charge_credit TEXT,
      original_row_index INTEGER,
      instagram_username TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_backgrounds (
      id TEXT PRIMARY KEY,
      name TEXT,
      image_base64 TEXT,
      is_active INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS lottery_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      date TEXT,
      loan_amount TEXT,
      max_winners_count INTEGER,
      status TEXT,
      total_participants_count INTEGER,
      winners_json TEXT,
      participants_json TEXT,
      excel_file_name TEXT,
      created_at TEXT,
      completed_at TEXT,
      prize_type TEXT DEFAULT 'monetary',
      prize_label TEXT DEFAULT 'وام',
      prize_item_name TEXT,
      show_excel_row INTEGER DEFAULT 1,
      show_personnel_code INTEGER DEFAULT 1,
      lottery_mode TEXT DEFAULT 'personnel'
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      is_super_admin INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS authorized_devices (
      id TEXT PRIMARY KEY,
      device_fingerprint TEXT UNIQUE,
      device_name TEXT,
      device_details TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS system_license (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migrate existing databases if columns do not exist
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN participants_json TEXT');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN excel_file_name TEXT');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN prize_type TEXT DEFAULT "monetary"');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN prize_label TEXT DEFAULT "وام"');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN prize_item_name TEXT');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN show_excel_row INTEGER DEFAULT 1');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN show_personnel_code INTEGER DEFAULT 1');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE winners ADD COLUMN prize_type TEXT DEFAULT "monetary"');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE winners ADD COLUMN prize_label TEXT DEFAULT "وام"');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE winners ADD COLUMN prize_item_name TEXT');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE lottery_sessions ADD COLUMN lottery_mode TEXT DEFAULT "personnel"');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE winners ADD COLUMN instagram_username TEXT');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE winners ADD COLUMN lottery_mode TEXT DEFAULT "personnel"');
  } catch {
    // column already exists
  }
  try {
    db.run('ALTER TABLE participants ADD COLUMN instagram_username TEXT');
  } catch {
    // column already exists
  }

  // Seed default master admin if no admin exists
  try {
    const checkStmt = db.prepare('SELECT COUNT(*) as cnt FROM admins');
    let adminCount = 0;
    if (checkStmt.step()) {
      adminCount = Number(checkStmt.getAsObject().cnt || 0);
    }
    checkStmt.free();

    if (adminCount === 0) {
      const defaultHash = bcrypt.hashSync('123456', 10);
      const now = new Date().toISOString();
      db.run(
        `INSERT INTO admins (id, username, password_hash, name, is_super_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['admin-master', 'admin', defaultHash, 'مدیر ارشد سامانه', 1, now, now]
      );
      console.log('Seeded default master admin (admin:123456)');
    }
  } catch (err) {
    console.error('Error seeding master admin:', err);
  }

  saveDb();
}

async function startServer() {
  await initDatabase();

  const app = express();

  // Allow up to 50MB payload for high-resolution base64 background images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Helper function to query rows as objects
  function queryAll(sql: string, params: (string | number | null)[] = []): Record<string, unknown>[] {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  interface AuthPayload {
    id: string;
    username: string;
    isSuperAdmin: boolean;
    deviceHash?: string;
  }

  function getAuthUser(req: express.Request): AuthPayload | null {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        token = parts[1];
      }
    }
    if (!token) return null;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

      // Hardware & Browser Fingerprint Anti-Cloning Check
      // If someone copied the token or cookie to another machine, this will block it
      if (payload.deviceHash) {
        const clientFp = String(req.headers['x-device-fingerprint'] || req.query?.deviceFingerprint || '');
        if (clientFp) {
          const currentHash = crypto
            .createHash('sha256')
            .update(clientFp + (req.headers['user-agent'] || ''))
            .digest('hex');
          if (currentHash !== payload.deviceHash) {
            console.warn(`[SECURITY ALERT] Token copied to another computer or browser! Denying access.`);
            return null;
          }
        }
      }

      return payload;
    } catch {
      return null;
    }
  }

  // --- Auth API Routes ---

  // Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { username, password, deviceFingerprint, deviceDetails } = req.body;
      const clientFp = String(deviceFingerprint || req.headers['x-device-fingerprint'] || '').trim();

      if (!username || !password) {
        res.status(400).json({ success: false, error: 'لطفاً نام کاربری و رمز عبور را وارد فرمایید' });
        return;
      }

      const rows = queryAll('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [String(username).trim()]);
      if (rows.length === 0) {
        res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است' });
        return;
      }

      const admin = rows[0];
      const passwordMatch = bcrypt.compareSync(String(password), String(admin.password_hash || ''));
      if (!passwordMatch) {
        res.status(401).json({ success: false, error: 'نام کاربری یا رمز عبور اشتباه است' });
        return;
      }

      // Check Machine Lock Authorization (قفل سخت‌افزاری سیستم)
      if (clientFp) {
        const registeredDevices = queryAll('SELECT * FROM authorized_devices');
        if (registeredDevices.length === 0) {
          // First computer to run the app: bind as Primary Authorized Machine!
          const devId = `dev-master-${Date.now()}`;
          const devName = deviceDetails?.platform ? `${deviceDetails.platform} (رایانه اصلی ثبت‌شده)` : 'کامپیوتر اصلی مجاز';
          db.run(
            `INSERT INTO authorized_devices (id, device_fingerprint, device_name, device_details, is_primary, created_at, last_used_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [devId, clientFp, devName, JSON.stringify(deviceDetails || {}), 1, new Date().toISOString(), new Date().toISOString()]
          );
          saveDb();
          console.log(`[MACHINE LOCK] Primary computer locked & registered: ${clientFp.substring(0, 16)}...`);
        } else {
          const isDevAuthorized = registeredDevices.some((d) => String(d.device_fingerprint) === clientFp);
          if (!isDevAuthorized) {
            // If NOT super admin, block access from copied computer!
            if (!admin.is_super_admin) {
              res.status(403).json({
                success: false,
                code: 'UNAUTHORIZED_MACHINE',
                error: 'دسترسی مسدود: این سامانه بر روی این کامپیوتر مجاز نشده است و کپی روی این دستگاه قفل می‌باشد. برای ثبت سیستم جدید، تایید ادمین اصلی الزامی است.',
              });
              return;
            }
            // Super Admin can authorize the new machine
            const devId = `dev-${Date.now()}`;
            const devName = deviceDetails?.platform ? `${deviceDetails.platform} (مجاز شده توسط ادمین ارشد)` : 'کامپیوتر جدید مجاز';
            db.run(
              `INSERT INTO authorized_devices (id, device_fingerprint, device_name, device_details, is_primary, created_at, last_used_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [devId, clientFp, devName, JSON.stringify(deviceDetails || {}), 0, new Date().toISOString(), new Date().toISOString()]
            );
            saveDb();
            console.log(`[MACHINE LOCK] Super admin authorized new computer: ${clientFp.substring(0, 16)}...`);
          } else {
            db.run('UPDATE authorized_devices SET last_used_at = ? WHERE device_fingerprint = ?', [new Date().toISOString(), clientFp]);
            saveDb();
          }
        }
      }

      // Generate device-bound cryptographic hash
      let deviceHash = '';
      if (clientFp) {
        deviceHash = crypto
          .createHash('sha256')
          .update(clientFp + (req.headers['user-agent'] || ''))
          .digest('hex');
      }

      const payload: AuthPayload = {
        id: String(admin.id),
        username: String(admin.username),
        isSuperAdmin: Boolean(admin.is_super_admin),
        deviceHash,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json({
        success: true,
        token,
        user: {
          id: String(admin.id),
          username: String(admin.username),
          name: String(admin.name || ''),
          isSuperAdmin: Boolean(admin.is_super_admin),
          createdAt: String(admin.created_at || ''),
          updatedAt: String(admin.updated_at || ''),
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Get current user (session check)
  app.get('/api/auth/me', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth) {
        res.status(401).json({ success: false, error: 'نیاز به ورود به سیستم دارد' });
        return;
      }

      const rows = queryAll('SELECT id, username, name, is_super_admin, created_at, updated_at FROM admins WHERE id = ?', [auth.id]);
      if (rows.length === 0) {
        res.clearCookie('token', { path: '/' });
        res.status(401).json({ success: false, error: 'حساب کاربری یافت نشد' });
        return;
      }

      const admin = rows[0];
      res.json({
        success: true,
        user: {
          id: String(admin.id),
          username: String(admin.username),
          name: String(admin.name || ''),
          isSuperAdmin: Boolean(admin.is_super_admin),
          createdAt: String(admin.created_at || ''),
          updatedAt: String(admin.updated_at || ''),
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ success: true });
  });

  // List all admins (Master Admin only)
  app.get('/api/auth/admins', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth || !auth.isSuperAdmin) {
        res.status(403).json({ success: false, error: 'تنها مدیر ارشد مجاز به مشاهده فهرست مدیران است' });
        return;
      }

      const rows = queryAll('SELECT id, username, name, is_super_admin, created_at, updated_at FROM admins ORDER BY created_at ASC');
      const admins = rows.map((r) => ({
        id: String(r.id),
        username: String(r.username),
        name: String(r.name || ''),
        isSuperAdmin: Boolean(r.is_super_admin),
        createdAt: String(r.created_at || ''),
        updatedAt: String(r.updated_at || ''),
      }));

      res.json({ success: true, admins });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Create new admin (Master Admin only)
  app.post('/api/auth/admins', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth || !auth.isSuperAdmin) {
        res.status(403).json({ success: false, error: 'تنها مدیر ارشد مجاز به ایجاد کاربر ادمین جدید است' });
        return;
      }

      const { username, password, name, isSuperAdmin } = req.body;
      const cleanUsername = String(username || '').trim().toLowerCase();
      if (!cleanUsername || cleanUsername.length < 3) {
        res.status(400).json({ success: false, error: 'نام کاربری باید حداقل ۳ کاراکتر باشد' });
        return;
      }
      if (!password || String(password).length < 4) {
        res.status(400).json({ success: false, error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
        return;
      }

      const existing = queryAll('SELECT id FROM admins WHERE LOWER(username) = LOWER(?)', [cleanUsername]);
      if (existing.length > 0) {
        res.status(400).json({ success: false, error: 'این نام کاربری قبلاً در سامانه ثبت شده است' });
        return;
      }

      const id = `admin-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const hash = bcrypt.hashSync(String(password), 10);
      const now = new Date().toISOString();

      db.run(
        `INSERT INTO admins (id, username, password_hash, name, is_super_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, cleanUsername, hash, String(name || cleanUsername).trim(), isSuperAdmin ? 1 : 0, now, now]
      );
      saveDb();

      res.json({
        success: true,
        admin: {
          id,
          username: cleanUsername,
          name: String(name || cleanUsername).trim(),
          isSuperAdmin: Boolean(isSuperAdmin),
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Update admin (Master admin or self can update username/password/name)
  app.put('/api/auth/admins/:id', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth) {
        res.status(401).json({ success: false, error: 'احراز هویت نشده‌اید' });
        return;
      }

      const targetId = req.params.id;
      if (!auth.isSuperAdmin && auth.id !== targetId) {
        res.status(403).json({ success: false, error: 'اجازه ویرایش این حساب را ندارید' });
        return;
      }

      const rows = queryAll('SELECT * FROM admins WHERE id = ?', [targetId]);
      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'کاربر مورد نظر یافت نشد' });
        return;
      }

      const currentAdmin = rows[0];
      const { username, password, name, isSuperAdmin } = req.body;
      const cleanUsername = username ? String(username).trim().toLowerCase() : String(currentAdmin.username);

      if (cleanUsername !== String(currentAdmin.username).toLowerCase()) {
        const duplicate = queryAll('SELECT id FROM admins WHERE LOWER(username) = LOWER(?) AND id != ?', [cleanUsername, targetId]);
        if (duplicate.length > 0) {
          res.status(400).json({ success: false, error: 'نام کاربری انتخابی قبلاً ثبت شده است' });
          return;
        }
      }

      let newPasswordHash = String(currentAdmin.password_hash);
      if (password && String(password).trim().length > 0) {
        if (String(password).trim().length < 4) {
          res.status(400).json({ success: false, error: 'رمز عبور باید حداقل ۴ کاراکتر باشد' });
          return;
        }
        newPasswordHash = bcrypt.hashSync(String(password).trim(), 10);
      }

      const newName = name !== undefined ? String(name).trim() : String(currentAdmin.name || '');
      const newIsSuper = (auth.isSuperAdmin && isSuperAdmin !== undefined)
        ? (isSuperAdmin ? 1 : 0)
        : Number(currentAdmin.is_super_admin);

      const now = new Date().toISOString();

      db.run(
        `UPDATE admins 
         SET username = ?, password_hash = ?, name = ?, is_super_admin = ?, updated_at = ?
         WHERE id = ?`,
        [cleanUsername, newPasswordHash, newName, newIsSuper, now, targetId]
      );
      saveDb();

      let refreshedToken: string | undefined;
      if (auth.id === targetId) {
        refreshedToken = jwt.sign(
          { id: targetId, username: cleanUsername, isSuperAdmin: Boolean(newIsSuper) },
          JWT_SECRET,
          { expiresIn: '30d' }
        );
        res.cookie('token', refreshedToken, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }

      res.json({
        success: true,
        token: refreshedToken,
        admin: {
          id: targetId,
          username: cleanUsername,
          name: newName,
          isSuperAdmin: Boolean(newIsSuper),
          updatedAt: now,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Delete admin (Master admin only)
  app.delete('/api/auth/admins/:id', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth || !auth.isSuperAdmin) {
        res.status(403).json({ success: false, error: 'تنها مدیر ارشد مجاز به حذف حساب مدیر است' });
        return;
      }

      const targetId = req.params.id;
      if (auth.id === targetId) {
        res.status(400).json({ success: false, error: 'امکان حذف حساب کاربری فعلی خودتان وجود ندارد' });
        return;
      }

      const rows = queryAll('SELECT * FROM admins WHERE id = ?', [targetId]);
      if (rows.length === 0) {
        res.status(404).json({ success: false, error: 'کاربر یافت نشد' });
        return;
      }

      if (rows[0].is_super_admin) {
        const superRows = queryAll('SELECT id FROM admins WHERE is_super_admin = 1');
        if (superRows.length <= 1) {
          res.status(400).json({ success: false, error: 'حداقل یک مدیر ارشد باید در سامانه باقی بماند' });
          return;
        }
      }

      db.run('DELETE FROM admins WHERE id = ?', [targetId]);
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Hardware & Machine Lock Routes ---

  // Check current machine authorization status
  app.get('/api/auth/machine-status', (req, res) => {
    try {
      const clientFp = String(req.headers['x-device-fingerprint'] || req.query.deviceFingerprint || '').trim();
      const devices = queryAll('SELECT id, device_fingerprint, device_name, is_primary, created_at, last_used_at FROM authorized_devices');
      const isAuthorized = devices.length === 0 || (clientFp ? devices.some((d) => String(d.device_fingerprint) === clientFp) : false);
      const primary = devices.find((d) => d.is_primary === 1) || devices[0];

      res.json({
        success: true,
        isAuthorized,
        totalAuthorizedDevices: devices.length,
        primaryDeviceName: primary ? String(primary.device_name) : null,
        currentFingerprint: clientFp,
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Authorize a new machine using Master Admin credentials
  app.post('/api/auth/authorize-machine', (req, res) => {
    try {
      const { masterUsername, masterPassword, deviceFingerprint, deviceName, deviceDetails } = req.body;
      const clientFp = String(deviceFingerprint || req.headers['x-device-fingerprint'] || '').trim();

      if (!clientFp) {
        res.status(400).json({ success: false, error: 'اثر انگشت سخت‌افزاری کامپیوتر دریافت نشد.' });
        return;
      }

      const rows = queryAll('SELECT * FROM admins WHERE LOWER(username) = LOWER(?)', [String(masterUsername || '').trim()]);
      if (rows.length === 0) {
        res.status(401).json({ success: false, error: 'نام کاربری یا کلمه عبور مدیر ارشد نادرست است.' });
        return;
      }

      const admin = rows[0];
      if (!admin.is_super_admin) {
        res.status(403).json({ success: false, error: 'فقط حساب مدیر ارشد امکان تایید و افزودن کامپیوتر جدید را دارد.' });
        return;
      }

      const passwordMatch = bcrypt.compareSync(String(masterPassword), String(admin.password_hash || ''));
      if (!passwordMatch) {
        res.status(401).json({ success: false, error: 'کلمه عبور مدیر ارشد نادرست است.' });
        return;
      }

      const devId = `dev-${Date.now()}`;
      db.run(
        `INSERT OR REPLACE INTO authorized_devices (id, device_fingerprint, device_name, device_details, is_primary, created_at, last_used_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          devId,
          clientFp,
          String(deviceName || 'رایانه مجاز تایید شده'),
          JSON.stringify(deviceDetails || {}),
          0,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
      saveDb();

      console.log(`[MACHINE LOCK] Super admin authorized machine: ${clientFp.substring(0, 16)}...`);

      res.json({
        success: true,
        message: 'این کامپیوتر با موفقیت در سامانه مجاز و ثبت شد.',
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Get list of authorized devices (Master Admin only)
  app.get('/api/auth/authorized-devices', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth || !auth.isSuperAdmin) {
        res.status(403).json({ success: false, error: 'تنها مدیر ارشد دسترسی دارد' });
        return;
      }

      const rows = queryAll('SELECT id, device_fingerprint, device_name, device_details, is_primary, created_at, last_used_at FROM authorized_devices ORDER BY is_primary DESC, created_at ASC');
      const devices = rows.map((r) => {
        let details = {};
        try {
          if (r.device_details) details = JSON.parse(String(r.device_details));
        } catch {
          details = {};
        }
        return {
          id: String(r.id),
          deviceFingerprint: String(r.device_fingerprint),
          deviceName: String(r.device_name || ''),
          details,
          isPrimary: Boolean(r.is_primary),
          createdAt: String(r.created_at || ''),
          lastUsedAt: String(r.last_used_at || ''),
        };
      });

      res.json({ success: true, devices });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Revoke an authorized device (Master Admin only)
  app.delete('/api/auth/authorized-devices/:id', (req, res) => {
    try {
      const auth = getAuthUser(req);
      if (!auth || !auth.isSuperAdmin) {
        res.status(403).json({ success: false, error: 'تنها مدیر ارشد دسترسی دارد' });
        return;
      }

      const targetId = req.params.id;
      db.run('DELETE FROM authorized_devices WHERE id = ?', [targetId]);
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- API Routes ---

  // Health and info
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      db: 'sqlite',
      dbFile: DB_FILE,
      dbExists: fs.existsSync(DB_FILE),
    });
  });

  // Get all winners
  app.get('/api/winners', (req, res) => {
    try {
      const rows = queryAll('SELECT * FROM winners ORDER BY draw_round DESC');
      const winners = rows.map((r) => ({
        id: String(r.id),
        drawRound: Number(r.draw_round),
        winnerRankTitle: String(r.winner_rank_title || ''),
        prizeTitle: String(r.prize_title || ''),
        fullName: String(r.full_name || ''),
        personnelCode: String(r.personnel_code || ''),
        mobile: String(r.mobile || ''),
        rowNumber: String(r.row_number || ''),
        loanAmount: String(r.loan_amount || ''),
        loanWords: String(r.loan_words || ''),
        creditDeferred: String(r.credit_deferred || ''),
        chargeCredit: String(r.charge_credit || ''),
        wonAt: String(r.won_at || ''),
        originalRowIndex: 0,
        prizeType: (r.prize_type as 'monetary' | 'item') || 'monetary',
        prizeLabel: r.prize_label ? String(r.prize_label) : 'وام',
        prizeItemName: r.prize_item_name ? String(r.prize_item_name) : undefined,
        instagramUsername: r.instagram_username ? String(r.instagram_username) : undefined,
        lotteryMode: (r.lottery_mode as 'personnel' | 'instagram') || 'personnel',
      }));
      res.json({ success: true, winners });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Save a new winner
  app.post('/api/winners', (req, res) => {
    try {
      const w = req.body;
      if (!w || !w.id || !w.fullName) {
        res.status(400).json({ success: false, error: 'اطلاعات برنده نامعتبر است' });
        return;
      }

      db.run(
        `INSERT OR REPLACE INTO winners 
        (id, draw_round, winner_rank_title, prize_title, full_name, personnel_code, mobile, row_number, loan_amount, loan_words, credit_deferred, charge_credit, won_at, created_at, prize_type, prize_label, prize_item_name, instagram_username, lottery_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(w.id),
          Number(w.drawRound || 1),
          String(w.winnerRankTitle || ''),
          String(w.prizeTitle || ''),
          String(w.fullName || ''),
          String(w.personnelCode || ''),
          String(w.mobile || ''),
          String(w.rowNumber || ''),
          String(w.loanAmount || ''),
          String(w.loanWords || ''),
          String(w.creditDeferred || ''),
          String(w.chargeCredit || ''),
          String(w.wonAt || ''),
          new Date().toISOString(),
          String(w.prizeType || 'monetary'),
          String(w.prizeLabel || 'وام'),
          w.prizeItemName ? String(w.prizeItemName) : null,
          w.instagramUsername ? String(w.instagramUsername) : null,
          String(w.lotteryMode || 'personnel'),
        ]
      );

      // Remove from participants table if present
      db.run('DELETE FROM participants WHERE id = ?', [String(w.id)]);

      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Delete a winner (restore to participants)
  app.delete('/api/winners/:id', (req, res) => {
    try {
      const id = req.params.id;
      db.run('DELETE FROM winners WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Clear all winners (reset winners)
  app.delete('/api/winners', (req, res) => {
    try {
      db.run('DELETE FROM winners');
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Get saved participants
  app.get('/api/participants', (req, res) => {
    try {
      const rows = queryAll('SELECT * FROM participants ORDER BY original_row_index ASC');
      const participants = rows.map((r) => ({
        id: String(r.id),
        rowNumber: String(r.row_number || ''),
        fullName: String(r.full_name || ''),
        personnelCode: String(r.personnel_code || ''),
        mobile: String(r.mobile || ''),
        creditDeferred: String(r.credit_deferred || ''),
        chargeCredit: String(r.charge_credit || ''),
        originalRowIndex: Number(r.original_row_index || 0),
        instagramUsername: r.instagram_username ? String(r.instagram_username) : undefined,
      }));
      res.json({ success: true, participants });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Save new participants (from Excel upload)
  app.post('/api/participants', (req, res) => {
    try {
      const { participants, resetWinners } = req.body;
      if (!Array.isArray(participants)) {
        res.status(400).json({ success: false, error: 'لیست شرکت‌کنندگان نامعتبر است' });
        return;
      }

      db.run('DELETE FROM participants');
      if (resetWinners) {
        db.run('DELETE FROM winners');
      }

      for (const p of participants) {
        db.run(
          `INSERT INTO participants (id, row_number, full_name, personnel_code, mobile, credit_deferred, charge_credit, original_row_index, instagram_username)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(p.id),
            String(p.rowNumber || ''),
            String(p.fullName || ''),
            String(p.personnelCode || ''),
            String(p.mobile || ''),
            String(p.creditDeferred || ''),
            String(p.chargeCredit || ''),
            Number(p.originalRowIndex || 0),
            p.instagramUsername ? String(p.instagramUsername) : null,
          ]
        );
      }

      saveDb();
      res.json({ success: true, count: participants.length });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Get custom backgrounds
  app.get('/api/backgrounds', (req, res) => {
    try {
      const rows = queryAll('SELECT id, name, is_active, created_at, image_base64 FROM custom_backgrounds ORDER BY created_at DESC');
      const backgrounds = rows.map((r) => ({
        id: String(r.id),
        name: String(r.name || ''),
        isActive: Boolean(r.is_active),
        createdAt: String(r.created_at || ''),
        imageBase64: String(r.image_base64 || ''),
      }));
      res.json({ success: true, backgrounds });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Save a custom background (stores base64 image in SQLite)
  app.post('/api/backgrounds', (req, res) => {
    try {
      const { id, name, imageBase64, setActive } = req.body;
      if (!imageBase64) {
        res.status(400).json({ success: false, error: 'تصویر پس‌زمینه الزامی است' });
        return;
      }

      const bgId = id || `bg-${Date.now()}`;
      const bgName = name || `پس‌زمینه ${new Date().toLocaleDateString('fa-IR')}`;

      if (setActive) {
        db.run('UPDATE custom_backgrounds SET is_active = 0');
      }

      db.run(
        `INSERT OR REPLACE INTO custom_backgrounds (id, name, image_base64, is_active, created_at)
        VALUES (?, ?, ?, ?, ?)`,
        [bgId, bgName, imageBase64, setActive ? 1 : 0, new Date().toISOString()]
      );

      saveDb();
      res.json({ success: true, id: bgId });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Set active background
  app.post('/api/backgrounds/:id/activate', (req, res) => {
    try {
      const id = req.params.id;
      db.run('UPDATE custom_backgrounds SET is_active = 0');
      if (id !== 'default' && id !== 'none') {
        db.run('UPDATE custom_backgrounds SET is_active = 1 WHERE id = ?', [id]);
      }
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Delete background
  app.delete('/api/backgrounds/:id', (req, res) => {
    try {
      const id = req.params.id;
      db.run('DELETE FROM custom_backgrounds WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Get settings
  app.get('/api/settings', (req, res) => {
    try {
      const rows = queryAll('SELECT key, value FROM app_settings');
      const settings: Record<string, string> = {};
      for (const r of rows) {
        settings[String(r.key)] = String(r.value);
      }
      res.json({ success: true, settings });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Save settings
  app.post('/api/settings', (req, res) => {
    try {
      const settings = req.body;
      if (settings && typeof settings === 'object') {
        for (const [key, value] of Object.entries(settings)) {
          db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value),
          ]);
        }
        saveDb();
      }
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Lottery Sessions Endpoints ---

  // Get all lottery sessions
  app.get('/api/lottery-sessions', (req, res) => {
    try {
      const rows = queryAll('SELECT * FROM lottery_sessions ORDER BY created_at DESC');
      const sessions = rows.map((r) => {
        let winners = [];
        try {
          if (r.winners_json) {
            winners = JSON.parse(String(r.winners_json));
          }
        } catch {
          winners = [];
        }

        let participants = [];
        try {
          if (r.participants_json) {
            participants = JSON.parse(String(r.participants_json));
          }
        } catch {
          participants = [];
        }

        return {
          id: String(r.id),
          title: String(r.title || ''),
          date: String(r.date || ''),
          loanAmount: String(r.loan_amount || ''),
          maxWinnersCount: Number(r.max_winners_count || 0),
          status: String(r.status || 'active'),
          totalParticipantsCount: Number(r.total_participants_count || (participants.length > 0 ? participants.length : 0)),
          winners,
          participants,
          excelFileName: r.excel_file_name ? String(r.excel_file_name) : undefined,
          createdAt: String(r.created_at || ''),
          completedAt: r.completed_at ? String(r.completed_at) : undefined,
          prizeType: (r.prize_type as 'monetary' | 'item') || 'monetary',
          prizeLabel: r.prize_label ? String(r.prize_label) : 'وام',
          prizeItemName: r.prize_item_name ? String(r.prize_item_name) : undefined,
          showExcelRow: r.show_excel_row !== undefined ? (Number(r.show_excel_row) === 1 || r.show_excel_row === true || r.show_excel_row === '1') : true,
          showPersonnelCode: r.show_personnel_code !== undefined ? (Number(r.show_personnel_code) === 1 || r.show_personnel_code === true || r.show_personnel_code === '1') : true,
          lotteryMode: (r.lottery_mode as 'personnel' | 'instagram') || 'personnel',
        };
      });
      res.json({ success: true, sessions });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Create or update a lottery session
  app.post('/api/lottery-sessions', (req, res) => {
    try {
      const session = req.body;
      if (!session || !session.id || !session.title) {
        res.status(400).json({ success: false, error: 'اطلاعات قرعه‌کشی ناقص است' });
        return;
      }

      db.run(
        `INSERT OR REPLACE INTO lottery_sessions 
        (id, title, date, loan_amount, max_winners_count, status, total_participants_count, winners_json, participants_json, excel_file_name, created_at, completed_at, prize_type, prize_label, prize_item_name, show_excel_row, show_personnel_code, lottery_mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(session.id),
          String(session.title || ''),
          String(session.date || ''),
          String(session.loanAmount || ''),
          Number(session.maxWinnersCount || 0),
          String(session.status || 'active'),
          Number(session.totalParticipantsCount || (Array.isArray(session.participants) ? session.participants.length : 0)),
          JSON.stringify(session.winners || []),
          JSON.stringify(session.participants || []),
          session.excelFileName ? String(session.excelFileName) : null,
          String(session.createdAt || new Date().toISOString()),
          session.completedAt ? String(session.completedAt) : null,
          String(session.prizeType || 'monetary'),
          String(session.prizeLabel || 'وام'),
          session.prizeItemName ? String(session.prizeItemName) : null,
          session.showExcelRow === false ? 0 : 1,
          session.showPersonnelCode === false ? 0 : 1,
          String(session.lotteryMode || 'personnel'),
        ]
      );

      saveDb();
      res.json({ success: true, session });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Delete a lottery session
  app.delete('/api/lottery-sessions/:id', (req, res) => {
    try {
      const id = req.params.id;
      db.run('DELETE FROM lottery_sessions WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // ==========================================
  // --- Full Database Backup & Restore APIs ---
  // ==========================================

  // 1. Export entire database as universal, forward-compatible structured backup
  app.get('/api/backup/export', (req, res) => {
    try {
      saveDb();

      // Collect data from all tables safely
      const participants = queryAll('SELECT * FROM participants ORDER BY original_row_index ASC');
      const winners = queryAll('SELECT * FROM winners ORDER BY draw_round ASC');
      const lotterySessions = queryAll('SELECT * FROM lottery_sessions ORDER BY created_at DESC');
      const customBackgrounds = queryAll('SELECT * FROM custom_backgrounds ORDER BY created_at DESC');
      const appSettings = queryAll('SELECT * FROM app_settings');
      const admins = queryAll('SELECT id, username, password_hash, name, is_super_admin, created_at, updated_at FROM admins');
      const authorizedDevices = queryAll('SELECT * FROM authorized_devices');
      const systemLicense = queryAll('SELECT * FROM system_license');

      const now = new Date();
      const backupObj = {
        app: 'lottery-master',
        format: 'lottery-master-universal-backup',
        version: '2.5.0',
        formatVersion: 2,
        exportedAt: now.toISOString(),
        persianDate: now.toLocaleDateString('fa-IR') + ' ' + now.toLocaleTimeString('fa-IR'),
        systemInfo: {
          platform: process.platform,
          nodeVersion: process.version,
        },
        stats: {
          participantsCount: participants.length,
          winnersCount: winners.length,
          sessionsCount: lotterySessions.length,
          backgroundsCount: customBackgrounds.length,
          settingsCount: appSettings.length,
          adminsCount: admins.length,
        },
        data: {
          participants,
          winners,
          lottery_sessions: lotterySessions,
          custom_backgrounds: customBackgrounds,
          app_settings: appSettings,
          admins,
          authorized_devices: authorizedDevices,
          system_license: systemLicense,
        },
      };

      if (req.query.download === '1') {
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        res.setHeader('Content-Disposition', `attachment; filename="lottery-backup-${timestamp}.lotterybackup"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(backupObj, null, 2));
      } else {
        res.json({ success: true, backup: backupObj });
      }
    } catch (err: unknown) {
      console.error('Backup export error:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 2. Direct download of raw SQLite database file (lottery.db)
  app.get('/api/backup/download-db', (req, res) => {
    try {
      saveDb();
      if (!fs.existsSync(DB_FILE)) {
        res.status(404).json({ success: false, error: 'فایل دیتابیس در مسیر سرور یافت نشد' });
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      res.setHeader('Content-Disposition', `attachment; filename="lottery-${timestamp}.db"`);
      res.setHeader('Content-Type', 'application/x-sqlite3');
      const fileStream = fs.createReadStream(DB_FILE);
      fileStream.pipe(res);
    } catch (err: unknown) {
      console.error('Download DB error:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 3. Inspect and validate backup file before restoring
  app.post('/api/backup/inspect', (req, res) => {
    try {
      let { backupData } = req.body;
      if (!backupData) {
        res.status(400).json({ success: false, error: 'داده‌های پشتیبان ارسال نشده است' });
        return;
      }
      if (backupData && typeof backupData === 'object' && backupData.backup) {
        backupData = backupData.backup;
      }

      // Check structure
      const isUniversal = backupData.format === 'lottery-master-universal-backup' || Boolean(backupData.data);
      if (!isUniversal || !backupData.data) {
        res.status(400).json({
          success: false,
          error: 'فرمت فایل معتبر نیست. لطفاً یک فایل بکاپ استاندارد با پسوند .lotterybackup یا .json انتخاب کنید.',
        });
        return;
      }

      const data = backupData.data;
      const stats = {
        participantsCount: Array.isArray(data.participants) ? data.participants.length : 0,
        winnersCount: Array.isArray(data.winners) ? data.winners.length : 0,
        sessionsCount: Array.isArray(data.lottery_sessions) ? data.lottery_sessions.length : 0,
        backgroundsCount: Array.isArray(data.custom_backgrounds) ? data.custom_backgrounds.length : 0,
        settingsCount: Array.isArray(data.app_settings) ? data.app_settings.length : 0,
        adminsCount: Array.isArray(data.admins) ? data.admins.length : 0,
      };

      res.json({
        success: true,
        isValid: true,
        version: backupData.version || '1.0.0',
        formatVersion: backupData.formatVersion || 1,
        exportedAt: backupData.exportedAt || null,
        persianDate: backupData.persianDate || 'نامشخص',
        stats,
        notes: [
          'سازگار با تمام نسخه‌های قبلی و آینده نرم‌افزار',
          'ستون‌های جدید یا تغییریافته به طور خودکار تطبیق داده خواهند شد',
        ],
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 4. Restore structured backup with dynamic schema-evolution & automatic snapshot
  app.post('/api/backup/restore', (req, res) => {
    try {
      let { backupData, mode = 'replace', restoreSettings = true, restoreAdmins = false } = req.body;
      if (!backupData) {
        res.status(400).json({ success: false, error: 'داده‌های پشتیبان ارسال نشده است' });
        return;
      }
      if (backupData && typeof backupData === 'object' && backupData.backup) {
        backupData = backupData.backup;
      }
      if (!backupData.data) {
        res.status(400).json({ success: false, error: 'داده‌های پشتیبان نامعتبر هستند' });
        return;
      }

      // Create a safety snapshot of current DB on disk before modifying
      try {
        saveDb();
        if (fs.existsSync(DB_FILE)) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const snapshotPath = path.join(process.cwd(), `lottery.db.backup-${timestamp}.bak`);
          fs.copyFileSync(DB_FILE, snapshotPath);
          console.log(`[Backup] Created emergency safety snapshot at: ${snapshotPath}`);
        }
      } catch (backupErr) {
        console.warn('Could not create emergency snapshot file:', backupErr);
      }

      const tablesToProcess = [
        'participants',
        'winners',
        'lottery_sessions',
        'custom_backgrounds',
        'app_settings',
        'admins',
        'authorized_devices',
        'system_license',
      ];

      const restoredCounts: Record<string, number> = {};

      // Begin atomic transaction
      db.run('BEGIN TRANSACTION');

      try {
        for (const tableName of tablesToProcess) {
          if (tableName === 'admins' && !restoreAdmins) {
            continue; // Keep existing admin credentials if user unchecked
          }
          if (tableName === 'app_settings' && !restoreSettings) {
            continue; // Keep existing settings if user unchecked
          }

          const rawRows = backupData.data[tableName];
          if (!Array.isArray(rawRows)) {
            continue;
          }

          // Dynamic Schema Discovery:
          // Query PRAGMA table_info to get the exact columns currently existing in the active database
          const tableInfo = queryAll(`PRAGMA table_info(${tableName})`);
          if (!tableInfo || tableInfo.length === 0) {
            console.warn(`Table ${tableName} does not exist in active schema, skipping.`);
            continue;
          }

          const validColumnNames = tableInfo.map((c) => String(c.name));
          const validColumnSet = new Set(validColumnNames);

          if (mode === 'replace') {
            db.run(`DELETE FROM ${tableName}`);
          }

          let inserted = 0;
          for (const row of rawRows) {
            if (!row || typeof row !== 'object') continue;

            // Filter row keys to only columns that actually exist in the current database schema.
            // 1. If backup is from an older version: newly added columns in SQLite will automatically get NULL/defaults.
            // 2. If backup is from a newer version with extra fields: unknown columns are skipped safely without SQL error.
            const rowKeys = Object.keys(row).filter((k) => validColumnSet.has(k));
            if (rowKeys.length === 0) continue;

            const placeholders = rowKeys.map(() => '?').join(', ');
            const quotedColumns = rowKeys.map((k) => `"${k}"`).join(', ');
            const values = rowKeys.map((k) => (row as Record<string, unknown>)[k] ?? null);

            const sql = `INSERT OR REPLACE INTO ${tableName} (${quotedColumns}) VALUES (${placeholders})`;
            db.run(sql, values as (string | number | null)[]);
            inserted++;
          }

          restoredCounts[tableName] = inserted;
        }

        db.run('COMMIT');
        saveDb();
        console.log('[Backup] Database restored successfully with counts:', restoredCounts);

        res.json({
          success: true,
          restoredCounts,
          message: 'دیتابیس با موفقیت بازگردانی شد و تمام اطلاعات با نسخه فعال همگام گردید.',
        });
      } catch (txErr) {
        db.run('ROLLBACK');
        throw txErr;
      }
    } catch (err: unknown) {
      console.error('Restore error:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 5. Restore from raw SQLite .db file (uploaded as Base64)
  app.post('/api/backup/restore-raw-db', async (req, res) => {
    try {
      const { fileBase64 } = req.body;
      if (!fileBase64) {
        res.status(400).json({ success: false, error: 'فایل دیتابیس ارسال نشده است' });
        return;
      }

      // Create snapshot before replacing
      saveDb();
      if (fs.existsSync(DB_FILE)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const snapshotPath = path.join(process.cwd(), `lottery.db.backup-${timestamp}.bak`);
        fs.copyFileSync(DB_FILE, snapshotPath);
      }

      const buffer = Buffer.from(fileBase64.replace(/^data:.*?;base64,/, ''), 'base64');
      const SQL = await initSqlJs();
      const newDb = new SQL.Database(buffer);

      // Verify that this database is a valid lottery database
      const testStmt = newDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='participants'");
      const hasParticipants = testStmt.step();
      testStmt.free();

      if (!hasParticipants) {
        res.status(400).json({
          success: false,
          error: 'فایل ارسالی یک دیتابیس معتبر قرعه‌کشی نیست یا جدول شرکت‌کنندگان در آن یافت نشد.',
        });
        return;
      }

      // Replace active database
      db = newDb;
      fs.writeFileSync(DB_FILE, buffer);
      console.log('[Backup] Raw SQLite database file successfully restored');

      res.json({
        success: true,
        message: 'فایل فیزیکی دیتابیس با موفقیت جایگزین و بارگذاری شد.',
      });
    } catch (err: unknown) {
      console.error('Restore raw db error:', err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 6. Get list of automatic pre-restore safety snapshots
  app.get('/api/backup/snapshots', (req, res) => {
    try {
      const files = fs.readdirSync(process.cwd());
      const snapshots = files
        .filter((f) => f.startsWith('lottery.db.backup-') && f.endsWith('.bak'))
        .map((f) => {
          const stats = fs.statSync(path.join(process.cwd(), f));
          return {
            filename: f,
            sizeBytes: stats.size,
            sizeKb: Math.round(stats.size / 1024),
            createdAt: stats.mtime.toISOString(),
            persianDate:
              new Date(stats.mtime).toLocaleDateString('fa-IR') +
              ' ' +
              new Date(stats.mtime).toLocaleTimeString('fa-IR'),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      res.json({ success: true, snapshots });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Serve Frontend ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath) && fs.existsSync(path.join(__dirname, 'index.html'))) {
      distPath = __dirname;
    } else if (!fs.existsSync(distPath) && fs.existsSync(path.join(process.cwd(), 'index.html'))) {
      distPath = process.cwd();
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Primary server listens on PORT
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Lottery App running on port ${PORT}`);
    console.log(` SQLite Database: ${DB_FILE}`);
    console.log(`====================================================`);
  });

  // Ensure port 4000 is also open if PORT is not 4000
  if (PORT !== 4000) {
    try {
      app.listen(4000, '0.0.0.0', () => {
        console.log(` Also listening on port 4000`);
      });
    } catch {
      // Ignore
    }
  }

  // NOTE: On your local machine/server, the app runs ONLY on port 4000 (port 3000 is NEVER used).
  // Inside the Google AI Studio online sandbox container only, an internal bridge is kept so the cloud preview works.
  if (isAiStudioCloud && PORT !== 3000) {
    try {
      app.listen(3000, '0.0.0.0', () => {
        console.log(`[AI Studio Cloud internal bridge on 3000]`);
      });
    } catch {
      // Ignore
    }
  }
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
