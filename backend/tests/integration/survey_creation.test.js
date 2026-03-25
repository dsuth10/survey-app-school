const request = require('supertest');
const express = require('express');
const session = require('express-session');
const { Survey, Question } = require('../../src/models/survey');
const db = require('../../src/db/connection');
const initDb = require('../../src/db/init');
const surveyRoutes = require('../../src/api/survey_routes');

const app = express();
app.use(express.json());
app.use(session({
  secret: 'test',
  resave: false,
  saveUninitialized: true
}));

// Mock authentication middleware
app.use((req, res, next) => {
  req.session.userId = 1;
  req.session.role = 'teacher';
  next();
});

app.use('/api/surveys', surveyRoutes);

describe('Survey Creation Integration', () => {
  beforeAll(() => {
    initDb();
    // Ensure we have a user with id 1
    db.prepare("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'testteacher', 'hash', 'teacher')").run();
  });

  test('POST /api/surveys should create a survey and questions', async () => {
    const surveyData = {
      title: 'Test Survey',
      description: 'Test Description',
      isAnonymous: false,
      sharedWithClass: true,
      questions: [
        {
          questionText: 'Q1',
          options: ['A', 'B'],
          isRequired: true
        }
      ]
    };

    const response = await request(app)
      .post('/api/surveys')
      .send(surveyData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    
    const survey = Survey.findById(response.body.id);
    expect(survey.title).toBe('Test Survey');

    const questions = Question.findBySurveyId(response.body.id);
    expect(questions.length).toBe(1);
    expect(questions[0].questionText).toBe('Q1');
  });

  test('POST /api/surveys should return 400 if title is missing', async () => {
    const response = await request(app)
      .post('/api/surveys')
      .send({ questions: [{ questionText: 'Q1', options: ['A'] }] });

    expect(response.status).toBe(400);
  });
});
