const express = require('express');
const router = express.Router();
const DistributionPermission = require('../models/permissions');
const Class = require('../models/class');
const { isAuthenticated, isTeacher } = require('./auth');

/**
 * @route GET /api/classes
 * @desc Get all classes managed by the current teacher
 * @access Private (Teacher only)
 */
router.get('/', isTeacher, async (req, res) => {
  try {
    const teacherId = req.session.userId;
    const classes = Class.findByTeacherIdWithCounts(teacherId);
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/classes/:id/permissions
 * @desc Get distribution permissions for a class
 * @access Private
 */
router.get('/:id/permissions', isAuthenticated, async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const permissions = DistributionPermission.findByClassId(classId);

    if (!permissions) {
      // Return default permissions if none exist yet
      return res.json({
        classId,
        canShareWithClass: 0,
        canShareWithYearLevel: 0,
        canShareWithSchool: 0
      });
    }

    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /api/classes/:id/permissions
 * @desc Update distribution permissions for a class
 * @access Private (Teacher only)
 */
router.put('/:id/permissions', isTeacher, async (req, res) => {
  try {
    const classId = parseInt(req.params.id);
    const { canShareWithClass, canShareWithYearLevel, canShareWithSchool } = req.body;

    // Check if class exists
    const classInfo = Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Restrict to the teacher who manages the class
    if (classInfo.teacherId !== req.session.userId) {
      return res.status(403).json({ error: 'You are not the teacher for this class' });
    }

    DistributionPermission.update(classId, {
      canShareWithClass,
      canShareWithYearLevel,
      canShareWithSchool
    });

    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
