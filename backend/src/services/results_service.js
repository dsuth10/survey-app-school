const db = require('../db/connection');

function getSurveyResults(surveyId) {
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
  if (!survey) return null;

  const questions = db.prepare('SELECT * FROM questions WHERE surveyId = ? ORDER BY orderIndex ASC').all(surveyId);
  const totalResponses = db.prepare('SELECT COUNT(*) as count FROM responses WHERE surveyId = ?').get(surveyId).count;

  // Fetch all question answers in bulk to avoid N+1 queries
  const allAnswers = db.prepare(`
    SELECT sa.questionId, sa.selectedOption, COUNT(*) as count
    FROM survey_answers sa
    JOIN questions q ON sa.questionId = q.id
    WHERE q.surveyId = ?
    GROUP BY sa.questionId, sa.selectedOption
  `).all(surveyId);

  const answerMapByQuestion = allAnswers.reduce((acc, row) => {
    if (!acc[row.questionId]) acc[row.questionId] = {};
    acc[row.questionId][row.selectedOption] = row.count;
    return acc;
  }, {});

  // Fetch all ranking answers in bulk to avoid N+1 queries
  const allRankingAnswers = db.prepare(`
    SELECT sa.questionId, sa.selectedOption
    FROM survey_answers sa
    JOIN questions q ON sa.questionId = q.id
    WHERE q.surveyId = ? AND q.type = 'ranking'
  `).all(surveyId);

  const rankingAnswerMap = allRankingAnswers.reduce((acc, row) => {
    if (!acc[row.questionId]) acc[row.questionId] = [];
    acc[row.questionId].push(row.selectedOption);
    return acc;
  }, {});

  const results = questions.map(q => {
    const options = q.options != null ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];
    const type = q.type || 'multipleChoice';
    const counts = {};
    options.forEach(opt => counts[opt] = 0);

    const questionAnswers = answerMapByQuestion[q.id] || {};

    if (type === 'ranking') {
      const questionRankingAnswers = rankingAnswerMap[q.id] || [];

      const rankSums = {};
      const rankCounts = {};
      options.forEach(opt => {
        rankSums[opt] = 0;
        rankCounts[opt] = 0;
      });

      questionRankingAnswers.forEach((selectedOption) => {
        let order;
        try {
          order = typeof selectedOption === 'string' ? JSON.parse(selectedOption) : selectedOption;
        } catch (_) { return; }
        if (!Array.isArray(order)) return;
        order.forEach((item, zeroIndex) => {
          const rank = zeroIndex + 1;
          if (rankSums[item] != null) {
            rankSums[item] += rank;
            rankCounts[item]++;
          }
        });
      });

      const rankingSummary = options.map((opt) => ({
        option: opt,
        averageRank: rankCounts[opt] ? (rankSums[opt] / rankCounts[opt]).toFixed(2) : null,
        totalVotes: rankCounts[opt] || 0
      })).sort((a, b) => {
        const ar = parseFloat(a.averageRank);
        const br = parseFloat(b.averageRank);
        if (Number.isNaN(ar)) return 1;
        if (Number.isNaN(br)) return -1;
        return ar - br;
      });

      return {
        questionId: q.id,
        questionText: q.questionText,
        type: 'ranking',
        options,
        rankingSummary
      };
    }

    Object.keys(questionAnswers).forEach(option => {
      counts[option] = questionAnswers[option];
    });

    return {
      questionId: q.id,
      questionText: q.questionText,
      type: type || 'multipleChoice',
      options,
      counts
    };
  });

  // Detailed responses (respecting anonymity)
  const responses = db.prepare(`
    SELECT r.id, r.submittedAt, u.displayName, u.username
    FROM responses r
    LEFT JOIN users u ON r.userId = u.id
    WHERE r.surveyId = ?
    ORDER BY r.submittedAt DESC
  `).all(surveyId);

  // Fetch all answers for all responses in one go to avoid N+1 queries
  const allDetailedAnswers = db.prepare(`
    SELECT sa.responseId, sa.questionId, sa.selectedOption
    FROM survey_answers sa
    JOIN responses r ON sa.responseId = r.id
    WHERE r.surveyId = ?
  `).all(surveyId);

  const detailedAnswerMap = allDetailedAnswers.reduce((acc, curr) => {
    if (!acc[curr.responseId]) acc[curr.responseId] = {};
    acc[curr.responseId][curr.questionId] = curr.selectedOption;
    return acc;
  }, {});

  const detailedResponses = responses.map(r => {
    return {
      id: r.id,
      submittedAt: r.submittedAt,
      // If survey is anonymous, mask the identity unless the requester is a teacher (handled in route)
      userDisplayName: survey.isAnonymous ? 'Anonymous' : (r.displayName || r.username),
      answers: detailedAnswerMap[r.id] || {}
    };
  });

  return {
    surveyTitle: survey.title,
    isAnonymous: !!survey.isAnonymous,
    totalResponses,
    results,
    detailedResponses
  };
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function getSurveyResultsCsv(surveyId) {
  const data = getSurveyResults(surveyId);
  if (!data) return null;
  const lines = [];
  lines.push(escapeCsv(data.surveyTitle));
  lines.push('Total Responses,' + data.totalResponses);
  lines.push('');

  data.results.forEach((q) => {
    lines.push(escapeCsv(q.questionText));
    if (q.type === 'ranking' && q.rankingSummary) {
      lines.push('Option,Average Rank,Total Votes');
      q.rankingSummary.forEach((row) => {
        lines.push([escapeCsv(row.option), row.averageRank, row.totalVotes].join(','));
      });
    } else {
      lines.push('Option,Count,Percentage');
      (q.options || []).forEach((opt) => {
        const count = (q.counts && q.counts[opt]) || 0;
        const pct = data.totalResponses > 0 ? ((count / data.totalResponses) * 100).toFixed(1) : '0';
        lines.push([escapeCsv(opt), count, pct + '%'].join(','));
      });
    }
    lines.push('');
  });

  lines.push('Detailed Responses');
  const questionIds = data.results.map((r) => r.questionId);
  const header = ['Submitted At', 'Respondent', ...data.results.map((r) => r.questionText)];
  lines.push(header.map(escapeCsv).join(','));
  data.detailedResponses.forEach((r) => {
    const row = [
      r.submittedAt,
      r.userDisplayName,
      ...questionIds.map((qid) => r.answers[qid] ?? '')
    ];
    lines.push(row.map(escapeCsv).join(','));
  });
  return lines.join('\r\n');
}

function getSurveyCompletion(surveyId) {
  const survey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
  if (!survey) return null;
  const responses = db.prepare('SELECT userId FROM responses WHERE surveyId = ?').all(surveyId);
  const respondedIds = new Set(responses.map((r) => r.userId).filter(Boolean));
  const responded = respondedIds.size
    ? db.prepare('SELECT id, username, displayName FROM users WHERE id IN (SELECT userId FROM responses WHERE surveyId = ?)').all(surveyId)
    : [];
  let notResponded = [];
  if (!survey.isAnonymous && (survey.sharedWithClass || survey.sharedWithIndividuals)) {
    const creator = db.prepare('SELECT classId FROM users WHERE id = ?').get(survey.creatorId);
    const targetUserIds = db.prepare('SELECT userId FROM survey_targets WHERE surveyId = ?').all(surveyId).map((r) => r.userId);
    const classUserIds = (survey.sharedWithClass && creator && creator.classId)
      ? db.prepare('SELECT id FROM users WHERE classId = ? AND role = ?').all(creator.classId, 'student').map((u) => u.id)
      : [];
    const expectedIds = new Set([...classUserIds, ...targetUserIds]);
    const notIds = [...expectedIds].filter((id) => !respondedIds.has(id));
    if (notIds.length) {
      const placeholders = notIds.map(() => '?').join(',');
      notResponded = db.prepare(`SELECT id, username, displayName FROM users WHERE id IN (${placeholders})`).all(...notIds);
    }
  }
  return { responded, notResponded };
}

function getMyResponse(surveyId, userId) {
  const r = db.prepare('SELECT id, submittedAt FROM responses WHERE surveyId = ? AND userId = ?').get(surveyId, userId);
  if (!r) return null;
  const questions = db.prepare('SELECT id, questionText FROM questions WHERE surveyId = ? ORDER BY orderIndex').all(surveyId);
  const answers = db.prepare('SELECT questionId, selectedOption FROM survey_answers WHERE responseId = ?').all(r.id);
  const answerMap = answers.reduce((acc, a) => { acc[a.questionId] = a.selectedOption; return acc; }, {});
  return {
    responseId: r.id,
    submittedAt: r.submittedAt,
    answers: questions.map((q) => ({ questionId: q.id, questionText: q.questionText, selectedOption: answerMap[q.id] ?? '' }))
  };
}

module.exports = { getSurveyResults, getSurveyResultsCsv, getSurveyCompletion, getMyResponse };
