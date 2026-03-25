const db = require('../db/connection');

const Class = {
  findById: (id) => {
    return db.prepare('SELECT * FROM classes WHERE id = ?').get(id);
  },

  findAll: () => {
    return db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM users u WHERE u.classId = c.id AND u.role = 'student') as studentCount
      FROM classes c
    `).all();
  },

  findByTeacherId: (teacherId) => {
    return db.prepare('SELECT * FROM classes WHERE teacherId = ?').all(teacherId);
  },

  findByTeacherIdWithCounts: (teacherId) => {
    return db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM users u WHERE u.classId = c.id AND u.role = 'student') as studentCount
      FROM classes c
      WHERE c.teacherId = ?
    `).all(teacherId);
  },

  create: (name, teacherId) => {
    const info = db.prepare(`
      INSERT INTO classes (name, teacherId)
      VALUES (?, ?)
    `).run(name, teacherId ?? null);
    return info.lastInsertRowid;
  },

  update: (id, fields) => {
    const allowed = ['name', 'teacherId'];
    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (!allowed.includes(key)) continue;
      updates.push(`${key} = ?`);
      values.push(key === 'teacherId' && (value === '' || value == null) ? null : value);
    }
    if (updates.length === 0) return null;
    values.push(id);
    db.prepare(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return Class.findById(id);
  },

  delete: (id) => {
    db.prepare('UPDATE users SET classId = NULL WHERE classId = ?').run(id);
    db.prepare('DELETE FROM distribution_permissions WHERE classId = ?').run(id);
    return db.prepare('DELETE FROM classes WHERE id = ?').run(id);
  },

  getStudents: (classId) => {
    return db.prepare('SELECT id, username, displayName, role, yearLevel FROM users WHERE classId = ? ORDER BY displayName, username').all(classId);
  },

  setStudents: (classId, userIds) => {
    db.prepare('UPDATE users SET classId = NULL WHERE classId = ?').run(classId);
    if (userIds.length > 0) {
      const stmt = db.prepare('UPDATE users SET classId = ? WHERE id = ?');
      for (const uid of userIds) {
        stmt.run(classId, uid);
      }
    }
  },

  getWithPermissions: (id) => {
    return db.prepare(`
      SELECT c.*, dp.canShareWithClass, dp.canShareWithYearLevel, dp.canShareWithSchool
      FROM classes c
      LEFT JOIN distribution_permissions dp ON c.id = dp.classId
      WHERE c.id = ?
    `).get(id);
  }
};

module.exports = Class;
