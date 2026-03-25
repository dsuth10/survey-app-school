const db = require('../db/connection');

const Activity = {
  log: (userId, action, targetType = null, targetId = null, details = null) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO activities (userId, action, targetType, targetId, details)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(userId, action, targetType, targetId, details ? JSON.stringify(details) : null);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  },

  getRecent: (limit = 10, offset = 0) => {
    return db.prepare(`
      SELECT a.*, u.displayName, u.username
      FROM activities a
      LEFT JOIN users u ON a.userId = u.id
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }
};

module.exports = Activity;
