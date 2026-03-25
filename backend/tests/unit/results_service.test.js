const { getSurveyResults } = require('../../src/services/results_service');
const db = require('../../src/db/connection');
const initDb = require('../../src/db/init');

describe('Results Aggregation Service', () => {
  beforeAll(() => {
    initDb();
    db.prepare('DELETE FROM survey_answers').run();
    db.prepare('DELETE FROM responses').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM surveys').run();

    // Create a survey
    db.prepare('DELETE FROM users').run();

    // Create users
    db.prepare("INSERT INTO users (id, username, password, role) VALUES (1, 'u1', 'h', 'student')").run();
    db.prepare("INSERT INTO users (id, username, password, role) VALUES (2, 'u2', 'h', 'student')").run();
    db.prepare("INSERT INTO users (id, username, password, role) VALUES (3, 'u3', 'h', 'student')").run();

    // Create a survey
    db.prepare("INSERT INTO surveys (id, creatorId, title, isAnonymous) VALUES (1, 1, 'Test Survey', 0)").run();
    db.prepare("INSERT INTO questions (id, surveyId, orderIndex, questionText, options) VALUES (1, 1, 0, 'Q1', '[\"Yes\", \"No\"]')").run();

    // Responses
    db.prepare("INSERT INTO responses (id, surveyId, userId) VALUES (1, 1, 1)").run();
    db.prepare("INSERT INTO survey_answers (responseId, questionId, selectedOption) VALUES (1, 1, 'Yes')").run();
    
    db.prepare("INSERT INTO responses (id, surveyId, userId) VALUES (2, 1, 2)").run();
    db.prepare("INSERT INTO survey_answers (responseId, questionId, selectedOption) VALUES (2, 1, 'Yes')").run();

    db.prepare("INSERT INTO responses (id, surveyId, userId) VALUES (3, 1, 3)").run();
    db.prepare("INSERT INTO survey_answers (responseId, questionId, selectedOption) VALUES (3, 1, 'No')").run();
  });

  test('Should aggregate results correctly', () => {
    const results = getSurveyResults(1);
    expect(results.totalResponses).toBe(3);
    expect(results.results[0].counts['Yes']).toBe(2);
    expect(results.results[0].counts['No']).toBe(1);
  });
});
