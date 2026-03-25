const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Class = require('../models/class');
const Activity = require('../models/activity');
const { isAuthenticated, isAdmin } = require('./auth');

router.use(isAuthenticated);
router.use(isAdmin);

// List all classes (for user form dropdowns and Classes tab)
router.get('/classes', (req, res) => {
  try {
    const classes = Class.findAll();
    res.json(classes);
  } catch (err) {
    console.error('Admin list classes:', err);
    res.status(500).json({ error: 'Failed to list classes' });
  }
});

// Create class
router.post('/classes', (req, res) => {
  try {
    const { name, teacherId } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Class name is required' });
    }
    const tid = teacherId === '' || teacherId == null ? null : parseInt(teacherId, 10);
    if (tid != null) {
      const teacher = User.findById(tid);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ error: 'Invalid teacher' });
      }
    }
    const existing = Class.findAll().find((c) => c.name.toLowerCase() === String(name).trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'A class with that name already exists' });
    }
    const id = Class.create(String(name).trim(), tid);
    Activity.log(req.session.userId, 'class_created', 'class', id, { name });
    res.status(201).json(Class.findById(id));
  } catch (err) {
    console.error('Admin create class:', err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Update class (rename, assign teacher)
router.put('/classes/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const c = Class.findById(id);
    if (!c) return res.status(404).json({ error: 'Class not found' });
    const { name, teacherId } = req.body;
    const updates = {};
    if (name !== undefined && String(name).trim()) updates.name = String(name).trim();
    if (teacherId !== undefined) {
      updates.teacherId = teacherId === '' || teacherId == null ? null : parseInt(teacherId, 10);
      if (updates.teacherId != null) {
        const teacher = User.findById(updates.teacherId);
        if (!teacher || teacher.role !== 'teacher') {
          return res.status(400).json({ error: 'Invalid teacher' });
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      Class.update(id, updates);
    }
    res.json(Class.findById(id));
  } catch (err) {
    console.error('Admin update class:', err);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

// Delete class
router.delete('/classes/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const c = Class.findById(id);
    if (!c) return res.status(404).json({ error: 'Class not found' });
    Class.delete(id);
    res.json({ message: 'Class deleted' });
  } catch (err) {
    console.error('Admin delete class:', err);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// List students in a class
router.get('/classes/:id/students', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Class.findById(id)) return res.status(404).json({ error: 'Class not found' });
    const students = Class.getStudents(id);
    res.json(students);
  } catch (err) {
    console.error('Admin list class students:', err);
    res.status(500).json({ error: 'Failed to list students' });
  }
});

// Set students in a class (body: { userIds: number[] })
router.put('/classes/:id/students', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Class.findById(id)) return res.status(404).json({ error: 'Class not found' });
    const { userIds } = req.body;
    const ids = Array.isArray(userIds) ? userIds.map((u) => parseInt(u, 10)).filter((n) => !Number.isNaN(n)) : [];
    Class.setStudents(id, ids);
    res.json({ message: 'Students updated', students: Class.getStudents(id) });
  } catch (err) {
    console.error('Admin set class students:', err);
    res.status(500).json({ error: 'Failed to update students' });
  }
});

// List users with optional filters and pagination
router.get('/users', (req, res) => {
  try {
    const { role, classId, yearLevel, activeOnly, page = 1, limit = 50 } = req.query;
    const opts = {};
    if (role) opts.role = role;
    if (classId !== undefined && classId !== '') opts.classId = classId ? parseInt(classId, 10) : null;
    if (yearLevel) opts.yearLevel = yearLevel;
    if (activeOnly === 'true') opts.activeOnly = true;

    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 50;
    opts.limit = l;
    opts.offset = (p - 1) * l;

    const users = User.getAll(opts);
    const total = User.countAll(opts);

    // Don't send password hashes to client
    const safe = users.map((u) => {
      const { password, ...rest } = u;
      return rest;
    });

    res.json({
      users: safe,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l)
    });
  } catch (err) {
    console.error('Admin list users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Get single user
router.get('/users/:id', (req, res) => {
  const user = User.findById(parseInt(req.params.id, 10));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const { password, ...safe } = user;
  res.json(safe);
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { username, displayName, role, classId, yearLevel, password, isActive } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    if (!User.VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Use student, teacher, or admin.' });
    }
    if (User.findByUsername(username)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    if (classId != null && classId !== '') {
      const c = Class.findById(parseInt(classId, 10));
      if (!c) return res.status(400).json({ error: 'Invalid classId' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const id = User.create({
      username,
      password: hashed,
      displayName: displayName || null,
      role,
      classId: classId === '' || classId == null ? null : parseInt(classId, 10),
      yearLevel: yearLevel || null,
      isActive: isActive !== false
    });
    Activity.log(req.session.userId, 'user_created', 'user', id, { username, role });
    const user = User.findById(id);
    const { password: _p, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    console.error('Admin create user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (including password reset)
router.put('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { displayName, role, classId, yearLevel, password, isActive } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (role !== undefined) {
      if (!User.VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }
    if (classId !== undefined) updates.classId = classId === '' || classId == null ? null : parseInt(classId, 10);
    if (yearLevel !== undefined) updates.yearLevel = yearLevel;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password !== undefined && password !== '') {
      updates.password = await bcrypt.hash(password, 10);
    }
    User.update(id, updates);
    const updated = User.findById(id);
    const { password: _p, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    console.error('Admin update user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (hard delete; or could soft-deactivate via PUT isActive)
router.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete admin users' });
  }
  try {
    User.delete(id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Admin delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Bulk import users: body = { users: [ { username, displayName, role, class, yearLevel, password }, ... ] }
// "class" can be class name; auto-creates the class if it doesn't exist yet (no teacher assigned).
router.post('/users/import', async (req, res) => {
  try {
    const { users: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Body must contain an array "users" with at least one row' });
    }
    const classesByName = new Map(Class.findAll().map((c) => [c.name, c.id]));
    const results = { created: 0, classesCreated: [], errors: [] };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const username = row.username?.trim();
      const password = row.password;
      const role = (row.role || 'student').toLowerCase().trim();
      if (!username || !password) {
        results.errors.push({ row: i + 1, message: 'Username and password required' });
        continue;
      }
      if (!User.VALID_ROLES.includes(role)) {
        results.errors.push({ row: i + 1, username, message: 'Invalid role' });
        continue;
      }
      if (User.findByUsername(username)) {
        results.errors.push({ row: i + 1, username, message: 'Username already exists' });
        continue;
      }
      let classId = null;
      if (row.class != null && String(row.class).trim() !== '') {
        const name = String(row.class).trim();
        if (classesByName.has(name)) {
          // Existing class — reuse its ID
          classId = classesByName.get(name);
        } else {
          // Class doesn't exist — create it on the fly (no teacher yet)
          const newId = Class.create(name, null);
          classesByName.set(name, newId);
          classId = newId;
          results.classesCreated.push(name);
          Activity.log(req.session.userId, 'class_created', 'class', newId, { name, source: 'csv_import' });
        }
      }
      try {
        const hashed = await bcrypt.hash(password, 10);
        User.create({
          username,
          password: hashed,
          displayName: (row.displayName || '').trim() || null,
          role,
          classId,
          yearLevel: (row.yearLevel || '').trim() || null,
          isActive: true
        });
        results.created += 1;
      } catch (err) {
        results.errors.push({ row: i + 1, username, message: err.message || 'Create failed' });
      }
    }
    const classMsg = results.classesCreated.length > 0
      ? ` Auto-created ${results.classesCreated.length} class(es): ${results.classesCreated.join(', ')}.`
      : '';
    res.status(200).json({
      message: `Imported ${results.created} user(s).${classMsg}`,
      created: results.created,
      classesCreated: results.classesCreated,
      errors: results.errors
    });
  } catch (err) {
    console.error('Admin import users:', err);
    res.status(500).json({ error: 'Failed to import users' });
  }
});

// Get recent activities
router.get('/activities', (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const activities = Activity.getRecent(parseInt(limit, 10), parseInt(offset, 10));
    res.json(activities);
  } catch (err) {
    console.error('Admin list activities:', err);
    res.status(500).json({ error: 'Failed to list activities' });
  }
});

module.exports = router;
