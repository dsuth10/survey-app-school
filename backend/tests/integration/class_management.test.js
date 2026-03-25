const request = require('supertest');
const express = require('express');
const session = require('express-session');
const db = require('../../src/db/connection');
const initDb = require('../../src/db/init');
// We will create this file in T034
const classRoutes = require('../../src/api/class_routes');

const app = express();
app.use(express.json());
app.use(session({
  secret: 'test',
  resave: false,
  saveUninitialized: true
}));

// Mock authentication middleware
let currentUser = { id: 1, role: 'teacher' };
app.use((req, res, next) => {
  req.session.userId = currentUser.id;
  req.session.role = currentUser.role;
  next();
});

app.use('/api/classes', classRoutes);

describe('Class Management Integration', () => {
  let testClassId;

  beforeAll(() => {
    initDb();
    // Setup test data
    db.prepare("PRAGMA foreign_keys = OFF").run();
    db.prepare("DELETE FROM distribution_permissions").run();
    db.prepare("DELETE FROM survey_answers").run();
    db.prepare("DELETE FROM responses").run();
    db.prepare("DELETE FROM questions").run();
    db.prepare("DELETE FROM surveys").run();
    db.prepare("DELETE FROM classes").run();
    db.prepare("DELETE FROM users").run();
    db.prepare("PRAGMA foreign_keys = ON").run();

    db.prepare("INSERT INTO users (id, username, password, role) VALUES (1, 'teacher1', 'hash', 'teacher')").run();
    const result = db.prepare("INSERT INTO classes (name, teacherId) VALUES ('7A', 1)").run();
    testClassId = result.lastInsertRowid;
    
    // Initial permission
    db.prepare("INSERT INTO distribution_permissions (classId, canShareWithClass, canShareWithYearLevel, canShareWithSchool) VALUES (?, 0, 0, 0)").run(testClassId);
  });

  test('GET /api/classes/:id/permissions should return current permissions', async () => {
    const response = await request(app).get(`/api/classes/${testClassId}/permissions`);
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      classId: testClassId,
      canShareWithClass: 0,
      canShareWithYearLevel: 0,
      canShareWithSchool: 0
    }));
  });

  test('PUT /api/classes/:id/permissions should update permissions', async () => {
    const updateData = {
      canShareWithClass: 1,
      canShareWithYearLevel: 1,
      canShareWithSchool: 0
    };

    const response = await request(app)
      .put(`/api/classes/${testClassId}/permissions`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('updated');

    const check = db.prepare("SELECT * FROM distribution_permissions WHERE classId = ?").get(testClassId);
    expect(check.canShareWithClass).toBe(1);
    expect(check.canShareWithYearLevel).toBe(1);
  });

  test('PUT /api/classes/:id/permissions should return 403 if not teacher', async () => {
    currentUser = { id: 2, role: 'student' };
    
    const response = await request(app)
      .put(`/api/classes/${testClassId}/permissions`)
      .send({ canShareWithClass: 0 });

    expect(response.status).toBe(403);
    
    // Reset currentUser for other tests
    currentUser = { id: 1, role: 'teacher' };
  });
});
