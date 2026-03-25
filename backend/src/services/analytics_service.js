const db = require('../db/connection');

/**
 * Get high-level overview stats for dashboard cards.
 * Available to teachers (scoped to their surveys) and admins (all surveys).
 */
function getOverviewStats(userId, role) {
  const isAdmin = role === 'admin';

  const totalStudents = db.prepare(
    "SELECT COUNT(*) as count FROM users WHERE role = 'student'"
  ).get().count;

  const totalSurveys = isAdmin
    ? db.prepare('SELECT COUNT(*) as count FROM surveys').get().count
    : db.prepare('SELECT COUNT(*) as count FROM surveys WHERE creatorId = ?').get(userId).count;

  const activeSurveys = isAdmin
    ? db.prepare('SELECT COUNT(*) as count FROM surveys WHERE closedAt IS NULL').get().count
    : db.prepare('SELECT COUNT(*) as count FROM surveys WHERE closedAt IS NULL AND creatorId = ?').get(userId).count;

  const totalResponses = isAdmin
    ? db.prepare('SELECT COUNT(*) as count FROM responses').get().count
    : db.prepare(`
        SELECT COUNT(*) as count FROM responses r
        JOIN surveys s ON r.surveyId = s.id
        WHERE s.creatorId = ?
      `).get(userId).count;

  // Pending responses: count of (student × open-survey) pairs where student hasn't responded.
  // For simplicity we count across class-shared and school-shared open surveys.
  const pendingResponses = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT DISTINCT u.id as userId, s.id as surveyId
      FROM surveys s
      JOIN users u ON u.role = 'student'
      LEFT JOIN responses r ON r.surveyId = s.id AND r.userId = u.id
      WHERE s.closedAt IS NULL
        AND r.id IS NULL
        AND (
          s.sharedWithSchool = 1
          OR (s.sharedWithClass = 1 AND (
            (s.targetClassId IS NOT NULL AND s.targetClassId = u.classId)
            OR (s.targetClassId IS NULL AND u.classId = (SELECT classId FROM users WHERE id = s.creatorId))
          ))
        )
    )
  `).get().count;

  // Average completion rate across surveys that have at least one expected respondent
  const completionData = db.prepare(`
    SELECT s.id,
      (SELECT COUNT(*) FROM responses WHERE surveyId = s.id) as responded,
      (SELECT COUNT(DISTINCT u.id)
       FROM users u
       WHERE u.role = 'student'
         AND (
           s.sharedWithSchool = 1
           OR (s.sharedWithClass = 1 AND (
             (s.targetClassId IS NOT NULL AND s.targetClassId = u.classId)
             OR (s.targetClassId IS NULL AND u.classId = (SELECT classId FROM users WHERE id = s.creatorId))
           ))
         )
      ) as total
    FROM surveys s
    WHERE s.closedAt IS NULL
    ${isAdmin ? '' : 'AND s.creatorId = ?'}
  `).all(...(isAdmin ? [] : [userId]));

  const surveysWithTotal = completionData.filter(s => s.total > 0);
  const avgCompletionRate = surveysWithTotal.length > 0
    ? Math.round(
        surveysWithTotal.reduce((sum, s) => sum + (s.responded / s.total) * 100, 0) / surveysWithTotal.length
      )
    : null;

  const recentActivity = db.prepare(`
    SELECT
      r.submittedAt,
      COALESCE(u.displayName, u.username) as studentName,
      s.title as surveyTitle
    FROM responses r
    JOIN users u ON r.userId = u.id
    JOIN surveys s ON r.surveyId = s.id
    ${isAdmin ? '' : 'WHERE s.creatorId = ?'}
    ORDER BY r.submittedAt DESC
    LIMIT 10
  `).all(...(isAdmin ? [] : [userId]));

  return {
    totalSurveys,
    activeSurveys,
    totalResponses,
    pendingResponses,
    avgCompletionRate,
    totalStudents,
    recentActivity,
  };
}

/**
 * Get per-survey analytics with completion data.
 */
function getSurveyAnalytics(userId, role) {
  const isAdmin = role === 'admin';

  const surveys = isAdmin
    ? db.prepare(`
        SELECT s.*, u.displayName as creatorName,
          (SELECT COUNT(*) FROM responses WHERE surveyId = s.id) as responseCount,
          (SELECT COUNT(*) FROM questions WHERE surveyId = s.id) as questionCount
        FROM surveys s
        JOIN users u ON s.creatorId = u.id
        ORDER BY s.createdAt DESC
      `).all()
    : db.prepare(`
        SELECT s.*, u.displayName as creatorName,
          (SELECT COUNT(*) FROM responses WHERE surveyId = s.id) as responseCount,
          (SELECT COUNT(*) FROM questions WHERE surveyId = s.id) as questionCount
        FROM surveys s
        JOIN users u ON s.creatorId = u.id
        WHERE s.creatorId = ?
        ORDER BY s.createdAt DESC
      `).all(userId);

  return surveys.map(s => {
    // Calculate expected respondents for completion rate
    const total = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      WHERE u.role = 'student'
        AND (
          ? = 1
          OR (? = 1 AND (
            (? IS NOT NULL AND ? = u.classId)
            OR (? IS NULL AND u.classId = (SELECT classId FROM users WHERE id = ?))
          ))
        )
    `).get(
      s.sharedWithSchool,
      s.sharedWithClass,
      s.targetClassId, s.targetClassId,
      s.targetClassId, s.creatorId
    ).count;

    const completionRate = total > 0 ? Math.round((s.responseCount / total) * 100) : null;

    return {
      id: s.id,
      title: s.title,
      creatorName: s.creatorName,
      createdAt: s.createdAt,
      closedAt: s.closedAt,
      completion: {
        responded: s.responseCount,
        total,
      },
      // Keep these flat fields for backward compatibility with any existing clients.
      responseCount: s.responseCount,
      questionCount: s.questionCount,
      expectedResponses: total,
      completionRate,
      status: s.closedAt ? 'closed' : 'open',
    };
  });
}

/**
 * Get completion breakdown by class.
 */
function getCompletionByClass(userId, role) {
  const isAdmin = role === 'admin';

  // Get all classes (or just the teacher's classes)
  const classes = isAdmin
    ? db.prepare('SELECT id, name FROM classes').all()
    : db.prepare('SELECT id, name FROM classes WHERE teacherId = ?').all(userId);

  return classes.map(cls => {
    const students = db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE classId = ? AND role = ?'
    ).get(cls.id, 'student').count;

    // Count students in this class who have responded to at least one open survey
    const responded = db.prepare(`
      SELECT COUNT(DISTINCT r.userId) as count
      FROM responses r
      JOIN surveys s ON r.surveyId = s.id
      JOIN users u ON r.userId = u.id
      WHERE u.classId = ?
        AND u.role = 'student'
        AND s.closedAt IS NULL
    `).get(cls.id).count;

    // Total expected responses (students × active surveys targeting them)
    const totalExpected = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT u.id as userId, s.id as surveyId
        FROM users u
        JOIN surveys s ON s.closedAt IS NULL
        WHERE u.classId = ? AND u.role = 'student'
          AND (
            s.sharedWithSchool = 1
            OR (s.sharedWithClass = 1 AND (
              (s.targetClassId IS NOT NULL AND s.targetClassId = ?)
              OR (s.targetClassId IS NULL AND u.classId = (SELECT classId FROM users WHERE id = s.creatorId))
            ))
          )
      )
    `).get(cls.id, cls.id).count;

    const totalResponded = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT DISTINCT u.id as userId, s.id as surveyId
        FROM users u
        JOIN surveys s ON s.closedAt IS NULL
        JOIN responses r ON r.surveyId = s.id AND r.userId = u.id
        WHERE u.classId = ? AND u.role = 'student'
          AND (
            s.sharedWithSchool = 1
            OR (s.sharedWithClass = 1 AND (
              (s.targetClassId IS NOT NULL AND s.targetClassId = ?)
              OR (s.targetClassId IS NULL AND u.classId = (SELECT classId FROM users WHERE id = s.creatorId))
            ))
          )
      )
    `).get(cls.id, cls.id).count;

    const rate = totalExpected > 0 ? Math.round((totalResponded / totalExpected) * 100) : null;

    return {
      classId: cls.id,
      className: cls.name,
      studentCount: students,
      totalExpected,
      totalResponded,
      rate,
    };
  });
}

/**
 * Get daily response counts for a timeline chart.
 */
function getResponseTimeline(userId, role, days = 30) {
  const isAdmin = role === 'admin';

  const rows = isAdmin
    ? db.prepare(`
        SELECT DATE(r.submittedAt) as date, COUNT(*) as count
        FROM responses r
        WHERE r.submittedAt >= datetime('now', '-' || ? || ' days', 'localtime')
        GROUP BY DATE(r.submittedAt)
        ORDER BY date ASC
      `).all(days)
    : db.prepare(`
        SELECT DATE(r.submittedAt) as date, COUNT(*) as count
        FROM responses r
        JOIN surveys s ON r.surveyId = s.id
        WHERE s.creatorId = ?
          AND r.submittedAt >= datetime('now', '-' || ? || ' days', 'localtime')
        GROUP BY DATE(r.submittedAt)
        ORDER BY date ASC
      `).all(userId, days);

  return rows;
}

module.exports = { getOverviewStats, getSurveyAnalytics, getCompletionByClass, getResponseTimeline };
