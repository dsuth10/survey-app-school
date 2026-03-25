const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../survey.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 3000');
db.pragma('synchronous = NORMAL');

module.exports = db;
