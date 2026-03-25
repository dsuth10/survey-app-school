const bcrypt = require('bcryptjs');
const db = require('./connection');
const initDb = require('./init');

async function seed() {
  initDb();
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Clear existing data (optional, for development)
  db.prepare('PRAGMA foreign_keys = OFF').run();
  db.exec('DELETE FROM survey_answers');
  db.exec('DELETE FROM responses');
  db.exec('DELETE FROM questions');
  db.exec('DELETE FROM surveys');
  db.exec('DELETE FROM distribution_permissions');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM classes');
  db.prepare('PRAGMA foreign_keys = ON').run();

  // Create a class
  const classStmt = db.prepare('INSERT INTO classes (name) VALUES (?)');
  const classId = classStmt.run('7A').lastInsertRowid;

  // Create admin (must exist for admin panel)
  const adminStmt = db.prepare(`
    INSERT INTO users (username, password, displayName, role)
    VALUES (?, ?, ?, ?)
  `);
  adminStmt.run('admin', hashedPassword, 'Administrator', 'admin');

  // Create teacher
  const teacherStmt = db.prepare(`
    INSERT INTO users (username, password, displayName, role)
    VALUES (?, ?, ?, ?)
  `);
  teacherStmt.run('teacher1', hashedPassword, 'Mr. Smith', 'teacher');

  // Create student
  const studentStmt = db.prepare(`
    INSERT INTO users (username, password, displayName, role, classId, yearLevel)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  studentStmt.run('student1', hashedPassword, 'John Doe', 'student', classId, '7');

  // Create permissions for the class
  const permStmt = db.prepare(`
    INSERT INTO distribution_permissions (classId, canShareWithClass, canShareWithYearLevel, canShareWithSchool)
    VALUES (?, ?, ?, ?)
  `);
  permStmt.run(classId, 1, 1, 0);

  console.log('Database seeded with:');
  console.log('- Admin: admin / password123');
  console.log('- Teacher: teacher1 / password123');
  console.log('- Student: student1 / password123 (Class 7A)');
}

if (require.main === module) {
  seed().catch(console.error);
}

module.exports = seed;
