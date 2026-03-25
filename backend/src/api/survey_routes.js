const express = require('express');
const router = express.Router();
const { createSurvey } = require('../services/survey_service');
const { getVisibleSurveys } = require('../services/visibility_service');
const { getSurveyResults, getSurveyResultsCsv, getSurveyCompletion, getMyResponse } = require('../services/results_service');
const { Response, SurveyAnswer } = require('../models/response');
const { Question, Survey } = require('../models/survey');
const User = require('../models/user');
const Class = require('../models/class');
const Activity = require('../models/activity');
const { isAuthenticated } = require('./auth');

router.get('/assignable-students', isAuthenticated, (req, res) => {
  try {
    const user = { id: req.session.userId, role: req.session.role, classId: req.session.classId };
    let list = [];
    if (user.role === 'admin') {
      list = User.getAll({ role: 'student' });
    } else if (user.role === 'teacher') {
      const classes = Class.findByTeacherId(user.id);
      const classIds = classes.map((c) => c.id);
      list = User.getAll({}).filter((u) => u.role === 'student' && u.classId && classIds.includes(u.classId));
    } else if (user.role === 'student' && user.classId) {
      list = User.getAll({ classId: user.classId, activeOnly: true }).filter((u) => u.role === 'student' && u.id !== user.id);
    }
    const safe = list.map((u) => ({ id: u.id, username: u.username, displayName: u.displayName, className: u.className }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/teacher-stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    if (req.session.role !== 'teacher' && req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const db = require('../db/connection');
    const recentActivity = db.prepare(`
      SELECT r.submittedAt, s.title as surveyTitle, u.displayName as studentName
      FROM responses r
      JOIN surveys s ON r.surveyId = s.id
      JOIN users u ON r.userId = u.id
      WHERE s.creatorId = ?
      ORDER BY r.submittedAt DESC
      LIMIT 10
    `).all(userId);

    res.json({ recentActivity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/results', isAuthenticated, async (req, res) => {
  try {
    const surveyId = req.params.id;
    const userId = req.session.userId;
    const userRole = req.session.role;

    const survey = Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    if (survey.creatorId !== userId && userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view results' });
    }

    const results = getSurveyResults(surveyId);
    const completion = (userRole === 'teacher' || userRole === 'admin' || survey.creatorId === userId)
      ? getSurveyCompletion(surveyId)
      : null;
    res.json({ ...results, completion });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/results/export', isAuthenticated, (req, res) => {
  try {
    const surveyId = req.params.id;
    const userId = req.session.userId;
    const userRole = req.session.role;
    const survey = Survey.findById(surveyId);
    if (!survey) return res.status(404).json({ error: 'Survey not found' });
    if (survey.creatorId !== userId && userRole !== 'teacher' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const csv = getSurveyResultsCsv(surveyId);
    if (!csv) return res.status(404).json({ error: 'Survey not found' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${surveyId}-results.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/my-response', isAuthenticated, (req, res) => {
  try {
    const surveyId = req.params.id;
    const userId = req.session.userId;
    const my = getMyResponse(surveyId, userId);
    if (!my) return res.status(404).json({ error: 'You have not responded to this survey' });
    res.json(my);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = {
      id: req.session.userId,
      role: req.session.role,
      classId: req.session.classId,
      yearLevel: req.session.yearLevel
    };
    const surveys = getVisibleSurveys(user);
    const surveyIds = surveys.map(s => s.id);
    const respondedSurveyIds = Response.hasUserRespondedToMany(surveyIds, user.id);

    const surveysWithStatus = surveys.map(s => ({
      ...s,
      hasResponded: respondedSurveyIds.has(s.id)
    }));

    res.json(surveysWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const surveyId = req.params.id;
    const user = {
      id: req.session.userId,
      role: req.session.role,
      classId: req.session.classId,
      yearLevel: req.session.yearLevel
    };

    const survey = Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Check if user is authorized to view this survey
    const visibleSurveys = getVisibleSurveys(user);
    if (!visibleSurveys.some(s => s.id === parseInt(surveyId)) && user.role !== 'teacher') {
      return res.status(403).json({ error: 'Not authorized to view this survey' });
    }

    const questions = Question.findBySurveyId(surveyId);
    res.json({ survey, questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/responses', isAuthenticated, async (req, res) => {
  try {
    const surveyId = req.params.id;
    const userId = req.session.userId;
    const { answers } = req.body;

    const user = {
      id: req.session.userId,
      role: req.session.role,
      classId: req.session.classId,
      yearLevel: req.session.yearLevel
    };

    const survey = Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    // Check if user is authorized to respond to this survey
    const visibleSurveys = getVisibleSurveys(user);
    if (!visibleSurveys.some(s => s.id === parseInt(surveyId))) {
      return res.status(403).json({ error: 'Not authorized to respond to this survey' });
    }

    if (Response.hasUserResponded(surveyId, userId)) {
      return res.status(400).json({ error: 'You have already responded to this survey' });
    }

    const now = new Date();
    if (survey.opensAt && new Date(survey.opensAt) > now) {
      return res.status(400).json({ error: 'This survey is not yet open for responses' });
    }
    if (survey.closesAt && new Date(survey.closesAt) < now) {
      return res.status(400).json({ error: 'This survey has closed' });
    }
    if (survey.closedAt) {
      return res.status(400).json({ error: 'This survey has been closed' });
    }

    const responseId = Response.create(surveyId, userId);
    SurveyAnswer.createMany(responseId, answers);

    res.status(201).json({ message: 'Response submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', isAuthenticated, async (req, res) => {
  try {
    const user = {
      id: req.session.userId,
      role: req.session.role,
      classId: req.session.classId,
      yearLevel: req.session.yearLevel
    };

    const surveyId = await createSurvey(user, req.body);
    Activity.log(req.session.userId, 'survey_published', 'survey', surveyId, { title: req.body.title });
    res.status(201).json({ id: surveyId, message: 'Survey created successfully' });
  } catch (error) {
    console.error('Survey creation error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
