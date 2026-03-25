const db = require('../db/connection');

const DistributionPermission = {
  /**
   * Find distribution permissions for a specific class.
   * @param {number} classId 
   * @returns {object|undefined}
   */
  findByClassId: (classId) => {
    return db.prepare('SELECT * FROM distribution_permissions WHERE classId = ?').get(classId);
  },

  /**
   * Update or create distribution permissions for a class.
   * @param {number} classId 
   * @param {object} permissions 
   * @returns {boolean}
   */
  update: (classId, permissions) => {
    const { canShareWithClass, canShareWithYearLevel, canShareWithSchool } = permissions;
    const info = db.prepare(`
      INSERT INTO distribution_permissions (classId, canShareWithClass, canShareWithYearLevel, canShareWithSchool, updatedAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(classId) DO UPDATE SET
        canShareWithClass = excluded.canShareWithClass,
        canShareWithYearLevel = excluded.canShareWithYearLevel,
        canShareWithSchool = excluded.canShareWithSchool,
        updatedAt = CURRENT_TIMESTAMP
    `).run(
      classId, 
      canShareWithClass ? 1 : 0, 
      canShareWithYearLevel ? 1 : 0, 
      canShareWithSchool ? 1 : 0
    );
    return info.changes > 0;
  }
};

module.exports = DistributionPermission;
