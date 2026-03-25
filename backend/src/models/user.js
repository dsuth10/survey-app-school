const db = require('../db/connection');

const VALID_ROLES = ['student', 'teacher', 'admin'];

const User = {
  findById: (id) => {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  findByUsername: (username) => {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  create: (user) => {
    const { username, password, displayName, role, classId, yearLevel, isActive = 1 } = user;
    const info = db.prepare(`
      INSERT INTO users (username, password, displayName, role, classId, yearLevel, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, password, displayName, role, classId ?? null, yearLevel ?? null, isActive ? 1 : 0);
    return info.lastInsertRowid;
  },

  getAll: (opts = {}) => {
    let sql = 'SELECT u.*, c.name AS className FROM users u LEFT JOIN classes c ON u.classId = c.id WHERE 1=1';
    const params = [];
    if (opts.role) {
      sql += ' AND u.role = ?';
      params.push(opts.role);
    }
    if (opts.classId != null) {
      sql += ' AND u.classId = ?';
      params.push(opts.classId);
    }
    if (opts.yearLevel) {
      sql += ' AND u.yearLevel = ?';
      params.push(opts.yearLevel);
    }
    if (opts.activeOnly) {
      sql += ' AND (u.isActive = 1 OR u.isActive IS NULL)';
    }
    sql += ' ORDER BY u.role, u.displayName, u.username';
    if (opts.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(opts.limit, 10));
      if (opts.offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(opts.offset, 10));
      }
    }
    return db.prepare(sql).all(...params);
  },

  countAll: (opts = {}) => {
    let sql = 'SELECT COUNT(*) as total FROM users u WHERE 1=1';
    const params = [];
    if (opts.role) {
      sql += ' AND u.role = ?';
      params.push(opts.role);
    }
    if (opts.classId != null) {
      sql += ' AND u.classId = ?';
      params.push(opts.classId);
    }
    if (opts.yearLevel) {
      sql += ' AND u.yearLevel = ?';
      params.push(opts.yearLevel);
    }
    if (opts.activeOnly) {
      sql += ' AND (u.isActive = 1 OR u.isActive IS NULL)';
    }
    return db.prepare(sql).get(...params).total;
  },

  update: (id, fields) => {
    const allowed = ['displayName', 'role', 'classId', 'yearLevel', 'password', 'isActive', 'lastLogin'];
    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (!allowed.includes(key)) continue;
      if (key === 'classId') {
        updates.push('classId = ?');
        values.push(value === '' || value == null ? null : value);
      } else if (key === 'isActive') {
        updates.push('isActive = ?');
        values.push(value ? 1 : 0);
      } else if (key === 'lastLogin') {
        updates.push('lastLogin = ?');
        values.push(value);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) return null;
    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return User.findById(id);
  },

  updateLastLogin: (id) => {
    db.prepare("UPDATE users SET lastLogin = datetime('now') WHERE id = ?").run(id);
  },

  delete: (id) => {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
};

User.VALID_ROLES = VALID_ROLES;
module.exports = User;
