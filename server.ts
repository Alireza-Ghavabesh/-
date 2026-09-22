import express from 'express';
import path from 'path';
import fs from 'fs';
import initSqlJs, { Database } from 'sql.js';
import { createServer as createViteServer } from 'vite';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_FILE = path.join(process.cwd(), 'lottery.sqlite');

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
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      row_number TEXT,
      full_name TEXT,
      personnel_code TEXT,
      mobile TEXT,
      credit_deferred TEXT,
      charge_credit TEXT,
      original_row_index INTEGER
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
  `);

  saveDb();
}

async function startServer() {
  await initDatabase();

  const app = express();

  // Allow up to 50MB payload for high-resolution base64 background images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
        (id, draw_round, winner_rank_title, prize_title, full_name, personnel_code, mobile, row_number, loan_amount, loan_words, credit_deferred, charge_credit, won_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          `INSERT INTO participants (id, row_number, full_name, personnel_code, mobile, credit_deferred, charge_credit, original_row_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            String(p.id),
            String(p.rowNumber || ''),
            String(p.fullName || ''),
            String(p.personnelCode || ''),
            String(p.mobile || ''),
            String(p.creditDeferred || ''),
            String(p.chargeCredit || ''),
            Number(p.originalRowIndex || 0),
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Lottery App & SQLite Server running on 0.0.0.0:${PORT}`);
    console.log(` SQLite Database: ${DB_FILE}`);
    console.log(`====================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
