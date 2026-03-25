const express = require('express');
const router = express.Router();
const { isAuthenticated, isTeacher } = require('./auth');
const {
  getOverviewStats,
  getSurveyAnalytics,
  getCompletionByClass,
  getResponseTimeline,
} = require('../services/analytics_service');

// All analytics endpoints require teacher or admin role
router.use(isAuthenticated, isTeacher);

router.get('/overview', (req, res) => {
  try {
    const stats = getOverviewStats(req.session.userId, req.session.role);
    res.json(stats);
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/surveys', (req, res) => {
  try {
    const data = getSurveyAnalytics(req.session.userId, req.session.role);
    res.json(data);
  } catch (err) {
    console.error('Analytics surveys error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/by-class', (req, res) => {
  try {
    const data = getCompletionByClass(req.session.userId, req.session.role);
    res.json(data);
  } catch (err) {
    console.error('Analytics by-class error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/timeline', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = getResponseTimeline(req.session.userId, req.session.role, days);
    res.json(data);
  } catch (err) {
    console.error('Analytics timeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
