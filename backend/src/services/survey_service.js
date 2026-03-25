const { Survey, Question, SurveyTarget } = require('../models/survey');
const Class = require('../models/class');

const VALID_QUESTION_TYPES = ['multipleChoice', 'trueFalse', 'ranking', 'text'];

function validateQuestion(q, index) {
  const type = q.type || 'multipleChoice';
  if (!VALID_QUESTION_TYPES.includes(type)) {
    throw new Error(`Question ${index + 1}: invalid type "${type}". Use multipleChoice, trueFalse, ranking, or text.`);
  }
  if (!q.questionText || String(q.questionText).trim() === '') {
    throw new Error(`Question ${index + 1}: question text is required.`);
  }
  const options = q.options;
  if (type === 'trueFalse') {
    if (!options || !Array.isArray(options)) {
      q.options = ['True', 'False'];
    }
  } else if (type === 'ranking') {
    if (!options || !Array.isArray(options) || options.length < 2) {
      throw new Error(`Question ${index + 1}: ranking must have at least 2 options.`);
    }
    if (options.some((o) => typeof o !== 'string' || o.trim() === '')) {
      throw new Error(`Question ${index + 1}: ranking options must be non-empty strings.`);
    }
  } else if (type === 'multipleChoice') {
    if (!options || !Array.isArray(options) || options.length < 1) {
      throw new Error(`Question ${index + 1}: multiple choice must have at least one option.`);
    }
  }
  // text type: options can be null/empty
}

function validateDistribution(user, surveyData, permissions) {
  if (user.role === 'teacher') return;

  if (surveyData.sharedWithYearLevel && (!permissions || !permissions.canShareWithYearLevel)) {
    throw new Error('Not permitted to share with year level');
  }

  if (surveyData.sharedWithSchool && (!permissions || !permissions.canShareWithSchool)) {
    throw new Error('Not permitted to share with school');
  }

  // sharedWithClass is generally allowed for students if they are in a class, 
  // but we can check it too if we want to be strict.
  if (surveyData.sharedWithClass && (!permissions || !permissions.canShareWithClass)) {
    throw new Error('Not permitted to share with class');
  }
}

async function createSurvey(user, surveyData) {
  const { title, questions } = surveyData;

  if (!title || !questions || questions.length === 0) {
    throw new Error('Survey must have a title and at least one question');
  }

  questions.forEach((q, i) => validateQuestion(q, i));

  // Validate distribution permissions if student
  if (user.role === 'student') {
    const permissions = Class.getWithPermissions(user.classId);
    validateDistribution(user, surveyData, permissions);
    // Students can only share with their own class by default if they select "Share with Class"
    if (surveyData.sharedWithClass) {
      surveyData.targetClassId = user.classId;
    }
  }

  const targetUserIds = Array.isArray(surveyData.targetUserIds) ? surveyData.targetUserIds.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n)) : [];
  const sharedWithIndividuals = targetUserIds.length > 0;

  const surveyId = Survey.create({
    creatorId: user.id,
    ...surveyData,
    targetClassId: surveyData.targetClassId || null,
    sharedWithIndividuals
  });

  Question.createMany(surveyId, questions);
  if (targetUserIds.length > 0) {
    SurveyTarget.addMany(surveyId, targetUserIds);
  }

  return surveyId;
}

module.exports = {
  createSurvey,
  validateDistribution,
  validateQuestion,
  VALID_QUESTION_TYPES
};
