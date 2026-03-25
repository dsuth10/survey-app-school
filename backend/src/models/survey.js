const db = require('../db/connection');

const Survey = {
  create: (surveyData) => {
    const {
      creatorId,
      title,
      description,
      isAnonymous,
      sharedWithClass,
      sharedWithYearLevel,
      sharedWithSchool,
      sharedWithIndividuals = false,
      opensAt = null,
      closesAt = null,
      targetClassId = null
    } = surveyData;

    const info = db.prepare(`
      INSERT INTO surveys (
        creatorId, title, description, isAnonymous,
        sharedWithClass, sharedWithYearLevel, sharedWithSchool, sharedWithIndividuals,
        opensAt, closesAt, targetClassId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      creatorId,
      title,
      description,
      isAnonymous ? 1 : 0,
      sharedWithClass ? 1 : 0,
      sharedWithYearLevel ? 1 : 0,
      sharedWithSchool ? 1 : 0,
      sharedWithIndividuals ? 1 : 0,
      opensAt || null,
      closesAt || null,
      targetClassId || null
    );

    return info.lastInsertRowid;
  },

  findById: (id) => {
    return db.prepare('SELECT * FROM surveys WHERE id = ?').get(id);
  },

  findByCreatorId: (creatorId) => {
    return db.prepare('SELECT * FROM surveys WHERE creatorId = ?').all(creatorId);
  }
};

const Question = {
  createMany: (surveyId, questions) => {
    const insert = db.prepare(`
      INSERT INTO questions (surveyId, orderIndex, questionText, type, options, isRequired)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((surveyId, questions) => {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        insert.run(
          surveyId,
          i,
          q.questionText,
          q.type || 'multipleChoice',
          q.options != null ? JSON.stringify(q.options) : null,
          q.isRequired !== false ? 1 : 0
        );
      }
    });

    insertMany(surveyId, questions);
  },

  findBySurveyId: (surveyId) => {
    const questions = db.prepare('SELECT * FROM questions WHERE surveyId = ? ORDER BY orderIndex ASC').all(surveyId);
    return questions.map(q => ({
      ...q,
      options: q.options != null ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : []
    }));
  }
};

const SurveyTarget = {
  addMany: (surveyId, userIds) => {
    if (!userIds || userIds.length === 0) return;
    const stmt = db.prepare('INSERT OR IGNORE INTO survey_targets (surveyId, userId) VALUES (?, ?)');

    const insertMany = db.transaction((surveyId, userIds) => {
      for (const uid of userIds) {
        stmt.run(surveyId, uid);
      }
    });

    insertMany(surveyId, userIds);
  },

  getBySurveyId: (surveyId) => {
    return db.prepare('SELECT userId FROM survey_targets WHERE surveyId = ?').all(surveyId).map((r) => r.userId);
  }
};

module.exports = { Survey, Question, SurveyTarget };
