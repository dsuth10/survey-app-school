#!/usr/bin/env node

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const bcrypt = require('bcryptjs');

// Import models directly - connection.js exports db directly (not { db })
const { Survey, Question } = require('../models/survey');
const { Response } = require('../models/response');
const Activity = require('../models/activity');
const User = require('../models/user');
const Class = require('../models/class');
const db = require('../db/connection');

const server = new McpServer({
    name: 'survey-backend',
    version: '1.0.0',
    instructions: `
Use these tools to work with the local survey application database.
Never request or modify password hashes or session records.
Prefer app-specific tools over any direct database access.
All write actions must be logged to activities using Activity.log.
Roles are lowercase: student, teacher, admin.
There is no is_published column — surveys use sharedWith* flags and closedAt.
`.trim()
});

// --- get_survey ---
server.tool(
    'get_survey',
    { surveyId: z.number().int().positive() },
    async ({ surveyId }) => {
        const survey = Survey.findById(surveyId);
        if (!survey) {
            return { content: [{ type: 'text', text: `Survey ${surveyId} not found.` }] };
        }
        const questions = Question.findBySurveyId(surveyId);
        return {
            content: [{ type: 'text', text: JSON.stringify({ survey, questions }, null, 2) }]
        };
    }
);

// --- get_survey_response_summary ---
server.tool(
    'get_survey_response_summary',
    { surveyId: z.number().int().positive() },
    async ({ surveyId }) => {
        const responses = Response.findBySurveyId(surveyId);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ surveyId, responseCount: responses.length }, null, 2)
            }]
        };
    }
);

// --- share_survey ---
// Sets sharedWith* flags. actorUserId must be a teacher or admin (checked via User model).
server.tool(
    'share_survey',
    {
        surveyId: z.number().int().positive(),
        actorUserId: z.number().int().positive(),
        sharedWithClass: z.boolean().optional(),
        sharedWithYearLevel: z.boolean().optional(),
        sharedWithSchool: z.boolean().optional()
    },
    async ({ surveyId, actorUserId, sharedWithClass, sharedWithYearLevel, sharedWithSchool }) => {
        const actor = User.findById(actorUserId);
        if (!actor || (actor.role !== 'teacher' && actor.role !== 'admin')) {
            return { content: [{ type: 'text', text: 'Forbidden: only teachers or admins can share surveys.' }] };
        }
        const survey = Survey.findById(surveyId);
        if (!survey) {
            return { content: [{ type: 'text', text: `Survey ${surveyId} not found.` }] };
        }

        const updates = [];
        const values = [];
        if (sharedWithClass !== undefined) { updates.push('sharedWithClass = ?'); values.push(sharedWithClass ? 1 : 0); }
        if (sharedWithYearLevel !== undefined) { updates.push('sharedWithYearLevel = ?'); values.push(sharedWithYearLevel ? 1 : 0); }
        if (sharedWithSchool !== undefined) { updates.push('sharedWithSchool = ?'); values.push(sharedWithSchool ? 1 : 0); }

        if (updates.length > 0) {
            values.push(surveyId);
            db.prepare(`UPDATE surveys SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        Activity.log(actorUserId, 'survey_shared', 'survey', surveyId, { title: survey.title });

        return { content: [{ type: 'text', text: `Survey "${survey.title}" sharing updated.` }] };
    }
);

// --- close_survey ---
server.tool(
    'close_survey',
    {
        surveyId: z.number().int().positive(),
        actorUserId: z.number().int().positive()
    },
    async ({ surveyId, actorUserId }) => {
        const actor = User.findById(actorUserId);
        if (!actor || (actor.role !== 'teacher' && actor.role !== 'admin')) {
            return { content: [{ type: 'text', text: 'Forbidden: only teachers or admins can close surveys.' }] };
        }
        const survey = Survey.findById(surveyId);
        if (!survey) {
            return { content: [{ type: 'text', text: `Survey ${surveyId} not found.` }] };
        }

        db.prepare(`UPDATE surveys SET closedAt = CURRENT_TIMESTAMP WHERE id = ?`).run(surveyId);
        Activity.log(actorUserId, 'survey_closed', 'survey', surveyId, { title: survey.title });

        return { content: [{ type: 'text', text: `Survey "${survey.title}" is now closed.` }] };
    }
);

// --- list_recent_activity ---
server.tool(
    'list_recent_activity',
    { limit: z.number().int().min(1).max(50).optional() },
    async ({ limit = 20 }) => {
        const rows = Activity.getRecent(limit);
        return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    }
);

// --- get_class_roster ---
server.tool(
    'get_class_roster',
    { classId: z.number().int().positive() },
    async ({ classId }) => {
        const students = Class.getStudents(classId);
        return { content: [{ type: 'text', text: JSON.stringify(students, null, 2) }] };
    }
);

// --- get_user_by_username ---
server.tool(
    'get_user_by_username',
    { username: z.string().min(1) },
    async ({ username }) => {
        const user = User.findByUsername(username);
        if (!user) return { content: [{ type: 'text', text: `User "${username}" not found.` }] };
        // Strip password before returning
        const { password: _pw, ...safeUser } = user;
        return { content: [{ type: 'text', text: JSON.stringify(safeUser, null, 2) }] };
    }
);

// --- create_user ---
server.tool(
    'create_user',
    {
        username: z.string().min(1),
        password: z.string().min(1),
        displayName: z.string().optional(),
        role: z.enum(['student', 'teacher', 'admin']),
        classId: z.number().int().positive().optional(),
        yearLevel: z.string().optional(),
        actorUserId: z.number().int().optional() // Optional for initial admin creation
    },
    async ({ username, password, displayName, role, classId, yearLevel, actorUserId }) => {
        // If actorUserId is provided, verify they are an admin
        if (actorUserId) {
            const actor = User.findById(actorUserId);
            if (!actor || actor.role !== 'admin') {
                return { content: [{ type: 'text', text: 'Forbidden: only admins can create new users.' }] };
            }
        } else {
            // Check if any admin exists. If not, we allow creating the first admin.
            const admins = User.getAll({ role: 'admin' });
            if (admins.length > 0) {
                return { content: [{ type: 'text', text: 'Forbidden: actorUserId is required because admins already exist.' }] };
            }
        }

        if (User.findByUsername(username)) {
            return { content: [{ type: 'text', text: `Error: Username "${username}" already exists.` }] };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserId = User.create({
            username,
            password: hashedPassword,
            displayName: displayName || username,
            role,
            classId,
            yearLevel,
            isActive: 1
        });

        Activity.log(actorUserId || newUserId, 'user_created', 'user', newUserId, { username, role });

        const newUser = User.findById(newUserId);
        const { password: _p, ...safeUser } = newUser;

        return { content: [{ type: 'text', text: `User "${username}" created successfully: ${JSON.stringify(safeUser, null, 2)}` }] };
    }
);

// --- Schema resource ---
server.resource(
    'schema://survey-summary',
    'survey-summary',
    async () => ({
        contents: [{
            uri: 'schema://survey-summary',
            text: `
Core tables (camelCase columns, SQLite):
- users: id, username, password, displayName, role ('student'|'teacher'|'admin'), classId, yearLevel, lastLogin, isActive, createdAt
- classes: id, name, teacherId, createdAt
- distribution_permissions: classId (PK), canShareWithClass, canShareWithYearLevel, canShareWithSchool, updatedAt
- surveys: id, creatorId, title, description, isAnonymous, sharedWithClass, sharedWithYearLevel, sharedWithSchool, sharedWithIndividuals, targetClassId, opensAt, closesAt, closedAt, createdAt
- survey_targets: id, surveyId, userId (individual sharing targets)
- questions: id, surveyId, orderIndex, questionText, type ('multipleChoice'|'trueFalse'|'ranking'|'text'), options (JSON), isRequired
- responses: id, surveyId, userId, submittedAt
- survey_answers: id, responseId, questionId, selectedOption
- activities: id, userId, action, targetType, targetId, details (JSON), timestamp

Key facts:
- No is_published column. Visibility = sharedWith* flags + closedAt/closesAt timing.
- survey_answers links to responses.id (responseId), not survey_id.
- Activity timestamp column is "timestamp", not "created_at".
- Activity action column is "action", not "action_type".
- DB path is at repo root: survey.db (3 dirs above connection.js).
      `.trim()
        }]
    })
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
