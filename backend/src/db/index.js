import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../../data.sqlite'));

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS paravets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  specialization TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_name TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  animal_type TEXT,
  issue_description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_paravet_id INTEGER,
  transcript TEXT,
  ai_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (assigned_paravet_id) REFERENCES paravets(id)
);

CREATE TABLE IF NOT EXISTS dispatches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  paravet_id INTEGER NOT NULL,
  scheduled_time TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (paravet_id) REFERENCES paravets(id)
);

CREATE TABLE IF NOT EXISTS call_recordings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER,
  agent_name TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT,
  duration_seconds REAL,
  transcript TEXT,
  ai_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE IF NOT EXISTS vetboard_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  assigned_to INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  findings TEXT,
  recommendation TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_type TEXT NOT NULL,
  contact_id INTEGER,
  contact_name TEXT NOT NULL,
  phone TEXT,
  ticket_id INTEGER,
  agent_id INTEGER,
  agent_name TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  duration_seconds REAL,
  filename TEXT,
  mime_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (agent_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Lightweight migrations for columns added after initial release
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('tickets', 'agent_id', 'INTEGER REFERENCES users(id)');
addColumnIfMissing('call_recordings', 'agent_id', 'INTEGER REFERENCES users(id)');

// Seed default accounts on first run so the call center has access from day one
const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
if (userCount === 0) {
  const seedUsers = [
    { name: 'Super Administrator', email: 'superadmin@smartvet.local', password: 'superadmin123', role: 'super_admin' },
    { name: 'System Administrator', email: 'admin@smartvet.local', password: 'admin123', role: 'admin' },
    { name: 'Shift Supervisor', email: 'supervisor@smartvet.local', password: 'super123', role: 'supervisor' },
    { name: 'Call Center Agent', email: 'agent@smartvet.local', password: 'agent123', role: 'agent' },
    { name: 'Field Paravet', email: 'paravet@smartvet.local', password: 'paravet123', role: 'paravet' },
  ];

  const insert = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  for (const u of seedUsers) {
    insert.run(u.name, u.email, bcrypt.hashSync(u.password, 10), u.role);
  }
}

export default db;
