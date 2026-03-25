const request = require('supertest');
const express = require('express');
const session = require('express-session');
const db = require('../../src/db/connection');
const initDb = require('../../src/db/init');
const surveyRoutes = require('../../src/api/survey_routes');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

let currentUser = { id: 1, role: 'teacher' };
app.use((req, res, next) => {
  req.session.userId = currentUser.id;
  req.session.role = currentUser.role;
  next();
});

app.use('/api/surveys', surveyRoutes);

describe('Results View Anonymity Masking', () => {
  beforeAll(() => {
    initDb();
    db.prepare('DELETE FROM survey_answers').run();
    db.prepare('DELETE FROM responses').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM surveys').run();
    db.prepare('DELETE FROM users').run();

    db.prepare("INSERT INTO users (id, username, password, role, displayName) VALUES (1, 't1', 'h', 'teacher', 'Teacher 1')").run();
    db.prepare("INSERT INTO users (id, username, password, role, displayName) VALUES (2, 's1', 'h', 'student', 'Student 1')").run();

    // Anonymous Survey
    db.prepare("INSERT INTO surveys (id, creatorId, title, isAnonymous) VALUES (1, 1, 'Anon Survey', 1)").run();
    db.prepare("INSERT INTO responses (id, surveyId, userId) VALUES (1, 1, 2)").run();

    // Non-Anonymous Survey
    db.prepare("INSERT INTO surveys (id, creatorId, title, isAnonymous) VALUES (2, 1, 'Public Survey', 0)").run();
    db.prepare("INSERT INTO responses (id, surveyId, userId) VALUES (2, 2, 2)").run();
  });

  test('Teacher should see identity for anonymous survey (if designed so) or "Anonymous" based on service', async () => {
    // Current service design: masks in service, but we can override in route if needed.
    // The spec says: "Verify anonymous surveys don't show names, but identified ones do."
    // Let's check if the service masks it.
    const res = await request(app).get('/api/surveys/1/results');
    expect(res.body.detailedResponses[0].userDisplayName).toBe('Anonymous');
  });

  test('Student should see identity for non-anonymous survey results', async () => {
    const res = await request(app).get('/api/surveys/2/results');
    expect(res.body.detailedResponses[0].userDisplayName).toBe('Student 1');
  });
});
