const request = require('supertest');
const express = require('express');
const session = require('express-session');
const db = require('../../src/db/connection');
const initDb = require('../../src/db/init');
const surveyRoutes = require('../../src/api/survey_routes');

const app = express();
app.use(express.json());
app.use(session({ secret: 'test', resave: false, saveUninitialized: true }));

let currentUser = {};
app.use((req, res, next) => {
  req.session.userId = currentUser.id;
  req.session.role = currentUser.role;
  req.session.classId = currentUser.classId;
  req.session.yearLevel = currentUser.yearLevel;
  next();
});

app.use('/api/surveys', surveyRoutes);

describe('Survey Visibility Integration', () => {
  beforeAll(() => {
    initDb();
    db.prepare('DELETE FROM survey_answers').run();
    db.prepare('DELETE FROM responses').run();
    db.prepare('DELETE FROM questions').run();
    db.prepare('DELETE FROM surveys').run();
    db.prepare('DELETE FROM distribution_permissions').run();
    db.prepare('DELETE FROM users').run();
    db.prepare('DELETE FROM classes').run();

    // Create classes
    db.prepare("INSERT INTO classes (id, name) VALUES (1, '7A')").run();
    db.prepare("INSERT INTO classes (id, name) VALUES (2, '8B')").run();

    // Create teacher (in Class 1, Year 7)
    db.prepare("INSERT INTO users (id, username, password, role, classId, yearLevel) VALUES (1, 't1', 'h', 'teacher', 1, '7')").run();
    // Create student A in Class 1, Year 7
    db.prepare("INSERT INTO users (id, username, password, role, classId, yearLevel) VALUES (2, 'sA', 'h', 'student', 1, '7')").run();
    // Create student B in Class 2, Year 8
    db.prepare("INSERT INTO users (id, username, password, role, classId, yearLevel) VALUES (3, 'sB', 'h', 'student', 2, '8')").run();

    // Surveys
    // 1. Shared with Class 1 (by teacher)
    db.prepare("INSERT INTO surveys (id, creatorId, title, sharedWithClass, sharedWithYearLevel, sharedWithSchool) VALUES (1, 1, 'Class 1 Survey', 1, 0, 0)").run();
    // 2. Shared with Year 8 (by teacher) - but teacher is Year 7 in this setup. Let's make teacher Year 8 for this survey.
    // Actually, let's just create another teacher.
    db.prepare("INSERT INTO users (id, username, password, role, classId, yearLevel) VALUES (40, 't2', 'h', 'teacher', 2, '8')").run();
    db.prepare("INSERT INTO surveys (id, creatorId, title, sharedWithClass, sharedWithYearLevel, sharedWithSchool) VALUES (2, 40, 'Year 8 Survey', 0, 1, 0)").run();
    // 3. Shared with School (by student A)
    db.prepare("INSERT INTO surveys (id, creatorId, title, sharedWithClass, sharedWithYearLevel, sharedWithSchool) VALUES (3, 2, 'School Survey', 0, 0, 1)").run();
    // 4. Private to Student B (created by B, no sharing)
    db.prepare("INSERT INTO surveys (id, creatorId, title, sharedWithClass, sharedWithYearLevel, sharedWithSchool) VALUES (4, 3, 'My Private Survey', 0, 0, 0)").run();
  });

  test('Student A should see Class 1, School, and their own surveys (none here)', async () => {
    currentUser = { id: 2, role: 'student', classId: 1, yearLevel: '7' };
    const res = await request(app).get('/api/surveys');
    expect(res.status).toBe(200);
    const ids = res.body.map(s => s.id);
    expect(ids).toContain(1); // Class 1
    expect(ids).toContain(3); // School
    expect(ids).not.toContain(2); // Year 8
    expect(ids).not.toContain(4); // Private to B
  });

  test('Student B should see Year 8, School, and their private survey', async () => {
    currentUser = { id: 3, role: 'student', classId: 2, yearLevel: '8' };
    const res = await request(app).get('/api/surveys');
    const ids = res.body.map(s => s.id);
    expect(ids).toContain(2); // Year 8
    expect(ids).toContain(3); // School
    expect(ids).toContain(4); // Own private
    expect(ids).not.toContain(1); // Class 1
  });

  test('Teacher should see everything', async () => {
    currentUser = { id: 1, role: 'teacher' };
    const res = await request(app).get('/api/surveys');
    expect(res.body.length).toBe(4);
  });
});
