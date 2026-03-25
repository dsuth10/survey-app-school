const request = require('supertest');
const express = require('express');
const session = require('express-session');
const db = require('../../src/db/connection');
const initDb = require('../../src/db/init');
const surveyRoutes = require('../../src/api/survey_routes');
const { Response } = require('../../src/models/response');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

let currentUserId = 1;
app.use((req, res, next) => {
  req.session.userId = currentUserId;
  req.session.role = 'student';
  next();
});

app.use('/api/surveys', surveyRoutes);

describe('Response Submission Integration', () => {
  beforeAll(() => {
    initDb();
    db.prepare('DELETE FROM survey_answers').run();
    db.prepare('DELETE FROM responses').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM surveys').run();
    db.prepare('DELETE FROM users').run();

    db.prepare("INSERT INTO users (id, username, password, role) VALUES (1, 's1', 'h', 'student')").run();
    db.prepare("INSERT INTO surveys (id, creatorId, title) VALUES (1, 1, 'Test Survey')").run();
    db.prepare("INSERT INTO questions (id, surveyId, orderIndex, questionText, options) VALUES (1, 1, 0, 'Q1', '[\"A\", \"B\"]')").run();
  });

  test('Should submit response successfully', async () => {
    const res = await request(app)
      .post('/api/surveys/1/responses')
      .send({
        answers: [
          { questionId: 1, selectedOption: 'A' }
        ]
      });

    expect(res.status).toBe(201);
    expect(Response.hasUserResponded(1, 1)).toBe(true);
  });

  test('Should prevent duplicate response', async () => {
    const res = await request(app)
      .post('/api/surveys/1/responses')
      .send({
        answers: [
          { questionId: 1, selectedOption: 'B' }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You have already responded to this survey');
  });
});
