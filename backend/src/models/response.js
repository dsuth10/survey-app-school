const db = require('../db/connection');

const Response = {
  create: (surveyId, userId) => {
    const info = db.prepare(`
      INSERT INTO responses (surveyId, userId)
      VALUES (?, ?)
    `).run(surveyId, userId);
    return info.lastInsertRowid;
  },

  hasUserResponded: (surveyId, userId) => {
    const response = db.prepare(`
      SELECT id FROM responses 
      WHERE surveyId = ? AND userId = ?
    `).get(surveyId, userId);
    return !!response;
  },

  hasUserRespondedToMany: (surveyIds, userId) => {
    if (!surveyIds || surveyIds.length === 0) return new Set();
    const placeholders = surveyIds.map(() => '?').join(',');
    const results = db.prepare(`
      SELECT surveyId FROM responses 
      WHERE userId = ? AND surveyId IN (${placeholders})
    `).all(userId, ...surveyIds);
    return new Set(results.map(r => r.surveyId));
  },

  findBySurveyId: (surveyId) => {
    return db.prepare('SELECT * FROM responses WHERE surveyId = ?').all(surveyId);
  }
};

const SurveyAnswer = {
  createMany: (responseId, answers) => {
    const insert = db.prepare(`
      INSERT INTO survey_answers (responseId, questionId, selectedOption)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((responseId, answers) => {
      for (const ans of answers) {
        insert.run(responseId, ans.questionId, ans.selectedOption);
      }
    });

    insertMany(responseId, answers);
  },

  findByResponseId: (responseId) => {
    return db.prepare('SELECT * FROM survey_answers WHERE responseId = ?').all(responseId);
  }
};

module.exports = { Response, SurveyAnswer };
