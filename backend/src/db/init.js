const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../../survey.db');

function initDb() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      teacherId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      displayName TEXT,
      role TEXT CHECK(role IN ('student', 'teacher', 'admin')) NOT NULL,
      classId INTEGER,
      yearLevel TEXT,
      lastLogin DATETIME,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (classId) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS distribution_permissions (
      classId INTEGER PRIMARY KEY,
      canShareWithClass BOOLEAN DEFAULT 0,
      canShareWithYearLevel BOOLEAN DEFAULT 0,
      canShareWithSchool BOOLEAN DEFAULT 0,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (classId) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creatorId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      isAnonymous BOOLEAN DEFAULT 0,
      sharedWithClass BOOLEAN DEFAULT 0,
      sharedWithYearLevel BOOLEAN DEFAULT 0,
      sharedWithSchool BOOLEAN DEFAULT 0,
      sharedWithIndividuals BOOLEAN DEFAULT 0,
      targetClassId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      closedAt DATETIME,
      FOREIGN KEY (creatorId) REFERENCES users(id),
      FOREIGN KEY (targetClassId) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS survey_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surveyId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      UNIQUE(surveyId, userId),
      FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surveyId INTEGER NOT NULL,
      orderIndex INTEGER NOT NULL,
      questionText TEXT NOT NULL,
      type TEXT DEFAULT 'multipleChoice',
      options TEXT, -- JSON array of strings
      isRequired BOOLEAN DEFAULT 1,
      FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surveyId INTEGER NOT NULL,
      userId INTEGER,
      submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (surveyId) REFERENCES surveys(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS survey_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      responseId INTEGER NOT NULL,
      questionId INTEGER NOT NULL,
      selectedOption TEXT NOT NULL,
      FOREIGN KEY (responseId) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (questionId) REFERENCES questions(id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_users_classId ON users(classId);
    CREATE INDEX IF NOT EXISTS idx_surveys_creatorId ON surveys(creatorId);
    CREATE INDEX IF NOT EXISTS idx_questions_surveyId ON questions(surveyId);
    CREATE INDEX IF NOT EXISTS idx_responses_surveyId ON responses(surveyId);
    CREATE INDEX IF NOT EXISTS idx_responses_userId ON responses(userId);
    CREATE INDEX IF NOT EXISTS idx_survey_answers_responseId ON survey_answers(responseId);
    CREATE INDEX IF NOT EXISTS idx_survey_answers_questionId ON survey_answers(questionId);
    CREATE INDEX IF NOT EXISTS idx_survey_targets_surveyId ON survey_targets(surveyId);
    CREATE INDEX IF NOT EXISTS idx_survey_targets_userId ON survey_targets(userId);

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      action TEXT NOT NULL,
      targetType TEXT,
      targetId INTEGER,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_activities_userId ON activities(userId);
    CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
  `);

  const surveyTableInfo = db.prepare('PRAGMA table_info(surveys)').all();
  const surveyColumns = surveyTableInfo.map((c) => c.name);
  if (!surveyColumns.includes('sharedWithIndividuals')) {
    db.exec(
      'ALTER TABLE surveys ADD COLUMN sharedWithIndividuals BOOLEAN DEFAULT 0'
    );
  }
  if (!surveyColumns.includes('opensAt')) {
    db.exec('ALTER TABLE surveys ADD COLUMN opensAt DATETIME');
  }
  if (!surveyColumns.includes('closesAt')) {
    db.exec('ALTER TABLE surveys ADD COLUMN closesAt DATETIME');
  }
  if (!surveyColumns.includes('targetClassId')) {
    db.exec('ALTER TABLE surveys ADD COLUMN targetClassId INTEGER');
  }

  // Migrations: add new columns to users if they don't exist (existing DBs)
  const tableInfo = db.prepare('PRAGMA table_info(users)').all();
  const columns = tableInfo.map((c) => c.name);
  if (!columns.includes('lastLogin')) {
    db.exec('ALTER TABLE users ADD COLUMN lastLogin DATETIME');
  }
  if (!columns.includes('isActive')) {
    db.exec('ALTER TABLE users ADD COLUMN isActive BOOLEAN DEFAULT 1');
  }

  // Migration: if users table was created with old role CHECK (no 'admin'), recreate it
  const usersTableDef = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"
    )
    .get();
  if (
    usersTableDef &&
    usersTableDef.sql &&
    !usersTableDef.sql.includes("'admin'")
  ) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DROP TABLE users');
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        displayName TEXT,
        role TEXT CHECK(role IN ('student', 'teacher', 'admin')) NOT NULL,
        classId INTEGER,
        yearLevel TEXT,
        lastLogin DATETIME,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (classId) REFERENCES classes(id)
      )
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_classId ON users(classId)');
    db.exec('PRAGMA foreign_keys = ON');
  }

  console.log('Database initialized at:', dbPath);
  return db;
}

if (require.main === module) {
  initDb();
}

module.exports = initDb;
