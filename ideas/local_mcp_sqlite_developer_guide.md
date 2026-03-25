# Local MCP + SQLite Developer Guide for the Survey Application

## Purpose

This guide explains how to add a **local Model Context Protocol (MCP) server** to the Survey Application. The goal is to let an AI agent work with the application **through backend tools** instead of relying on the frontend UI for every task.

The recommended design is:

- keep the database local
- reuse the existing `better-sqlite3` database layer and service architecture
- expose a **small set of app-specific MCP tools**
- avoid exposing a broad "run arbitrary SQL" tool as the main interface
- add one small **agent skill** so the model knows when and how to use the MCP tools without bloating context

---

## Why this architecture fits the current app

The application already uses a local SQLite database file, `survey.db`, with `better-sqlite3` as the Node driver. That is a strong fit for a local MCP integration because:

- `better-sqlite3` is designed for high performance and a synchronous API in Node.js
- WAL mode is already active on the connection (set in `backend/src/db/connection.js`)
- SQLite keeps deployment simple because there is no separate database server to install or manage
- the MCP server can run locally over **stdio**, which is the simplest standard transport for local tool access

The key design constraint is that **SQLite is still effectively single-writer at a time**, even in WAL mode. So the MCP layer should use **small, short transactions**, sensible busy timeouts, and very targeted write actions.

---

## Project structure

The application is a monorepo with two separate packages:

```text
Survey App 2/           ← root (concurrently script runner)
  backend/
    src/
      db/
        connection.js   ← shared db connection (module.exports = db directly)
        init.js         ← schema creation and migrations
        seed.js
      models/           ← data access layer (named model objects)
        activity.js
        class.js
        permissions.js
        response.js
        survey.js
        user.js
      services/         ← business logic layer
        results_service.js
        survey_service.js
        visibility_service.js
      api/              ← Express route handlers
      index.js          ← app entry point, runs on port 3006
  frontend/
  survey.db             ← database at repo root (NOT inside backend/)
  package.json          ← root orchestrator scripts
```

The MCP server will live at:

```text
backend/
  src/
    mcp/
      server.js
      tools/
      resources/
      guards/
```

A skill for the agent knowledge layer:

```text
.agent/
  skills/
    survey-backend/
      SKILL.md
```

---

## The existing database schema

Understanding the real schema is critical. Here is the complete table structure as defined in `backend/src/db/init.js`.

### `classes`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
name TEXT NOT NULL UNIQUE
teacherId INTEGER  -- FK to users.id
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `users`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
username TEXT NOT NULL UNIQUE
password TEXT NOT NULL
displayName TEXT
role TEXT CHECK(role IN ('student', 'teacher', 'admin')) NOT NULL
classId INTEGER  -- FK to classes.id
yearLevel TEXT
lastLogin DATETIME
isActive BOOLEAN DEFAULT 1
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Important:** roles are lowercase: `'student'`, `'teacher'`, `'admin'`.

### `distribution_permissions`
```sql
classId INTEGER PRIMARY KEY  -- FK to classes.id
canShareWithClass BOOLEAN DEFAULT 0
canShareWithYearLevel BOOLEAN DEFAULT 0
canShareWithSchool BOOLEAN DEFAULT 0
updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `surveys`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
creatorId INTEGER NOT NULL  -- FK to users.id (NOT created_by)
title TEXT NOT NULL
description TEXT
isAnonymous BOOLEAN DEFAULT 0
sharedWithClass BOOLEAN DEFAULT 0
sharedWithYearLevel BOOLEAN DEFAULT 0
sharedWithSchool BOOLEAN DEFAULT 0
sharedWithIndividuals BOOLEAN DEFAULT 0
targetClassId INTEGER  -- FK to classes.id (nullable)
opensAt DATETIME
closesAt DATETIME
closedAt DATETIME
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Important:** There is **no** `is_published` column on `surveys`. Visibility is controlled by the `sharedWith*` boolean flags and the `closedAt`/`closesAt` timing fields.

**Important:** The creator field is `creatorId`, not `created_by`.

### `survey_targets`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
surveyId INTEGER NOT NULL  -- FK to surveys.id ON DELETE CASCADE
userId INTEGER NOT NULL    -- FK to users.id
UNIQUE(surveyId, userId)
```
Used to share a survey with specific individuals (`sharedWithIndividuals`).

### `questions`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
surveyId INTEGER NOT NULL  -- FK to surveys.id ON DELETE CASCADE
orderIndex INTEGER NOT NULL  -- NOT sort_order
questionText TEXT NOT NULL   -- NOT question_text
type TEXT DEFAULT 'multipleChoice'  -- NOT question_type; values: multipleChoice, trueFalse, ranking, text
options TEXT  -- JSON array
isRequired BOOLEAN DEFAULT 1
```

**Important:** the ordering column is `orderIndex`, not `sort_order`. The text column is `questionText`, not `question_text`. The type column is `type`, not `question_type`.

### `responses`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
surveyId INTEGER NOT NULL  -- FK to surveys.id ON DELETE CASCADE
userId INTEGER             -- nullable (anonymous)
submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

### `survey_answers`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
responseId INTEGER NOT NULL   -- FK to responses.id ON DELETE CASCADE
questionId INTEGER NOT NULL   -- FK to questions.id
selectedOption TEXT NOT NULL
```

**Important:** `survey_answers` links to `responses.id` via `responseId`, **not** directly to `survey_id`. There is no `survey_id` column on `survey_answers`.

### `activities`
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
userId INTEGER             -- FK to users.id (NOT user_id as a named column — same thing, camelCase)
action TEXT NOT NULL       -- NOT action_type
targetType TEXT
targetId INTEGER
details TEXT               -- JSON string
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP  -- NOT created_at
```

**Important:** the action column is `action`, not `action_type`. The timestamp column is `timestamp`, not `created_at`.

---

## Step 1: install required packages

Add to `backend/package.json`:

```bash
cd backend
npm install @modelcontextprotocol/sdk zod
```

`better-sqlite3` is already installed. `zod` may already be present — check first.

### Why these packages

- `@modelcontextprotocol/sdk`: official Node SDK for building MCP servers
- `zod`: input validation for MCP tool arguments

---

## Step 2: the existing shared SQLite connection

The app already has a shared connection module at `backend/src/db/connection.js`:

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../survey.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

module.exports = db;
```

**Important differences from a generic guide:**
- The module exports `db` directly (not `{ db }`). Import it as `const db = require('../db/connection')`.
- The database path resolves to the **repo root** (`Survey App 2/survey.db`), not inside the `backend/` folder.
- The current connection only sets `journal_mode = WAL`. The additional pragmas below are recommended when building the MCP layer.

### Recommended pragmas to add to `connection.js`

```javascript
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 3000');
db.pragma('synchronous = NORMAL');
```

`foreign_keys` and `busy_timeout` are not currently set. They are safe to add and are strongly recommended before running a concurrent MCP layer alongside the Express server.

---

## Step 3: understand the existing service and model architecture

The app already has a layered architecture. **Do not bypass it.**

```
Express route handler
    → service (business logic, validation)
    → model (data access, SQL)
    → connection (better-sqlite3)
```

### Existing models

| Module | Exports | Key methods |
|---|---|---|
| `models/user.js` | `User` | `findById`, `findByUsername`, `create`, `getAll`, `update`, `delete` |
| `models/class.js` | `Class` | `findById`, `findAll`, `findByTeacherId`, `getStudents`, `setStudents` |
| `models/survey.js` | `Survey`, `Question`, `SurveyTarget` | `Survey.findById`, `Question.findBySurveyId` |
| `models/response.js` | `Response`, `SurveyAnswer` | `Response.findBySurveyId`, `Response.hasUserResponded` |
| `models/activity.js` | `Activity` | `Activity.log`, `Activity.getRecent` |
| `models/permissions.js` | `DistributionPermission` | `findByClassId`, `update` |

### Existing services

| Module | Exports | Purpose |
|---|---|---|
| `services/survey_service.js` | `createSurvey` | Full survey creation with validation |
| `services/visibility_service.js` | `getVisibleSurveys` | Role-aware survey visibility rules |
| `services/results_service.js` | see file | Response aggregation and results |

**MCP tool handlers should call services and models, not write raw SQL directly.**

---

## Step 4: what "publish/unpublish" actually means in this app

The guide draft referenced `is_published` — **that column does not exist.** The application uses a different visibility model:

- **Sharing** is controlled by boolean flags: `sharedWithClass`, `sharedWithYearLevel`, `sharedWithSchool`, `sharedWithIndividuals`
- **Closing** a survey is done by setting `closedAt` to a timestamp
- **Scheduling** uses `opensAt` and `closesAt`

So `publish_survey` in MCP terms means: set one or more `sharedWith*` flags to `1`.  
`close_survey` means: set `closedAt = CURRENT_TIMESTAMP`.

The `getVisibleSurveys` function in `visibility_service.js` is the canonical source of truth for whether a survey is considered open/visible.

---

## Step 5: design the MCP tool set for this app

### Read tools

- `get_survey` — returns survey metadata and its questions
- `list_surveys_for_creator` — lists surveys by `creatorId`
- `get_survey_response_summary` — counts responses and answers for a survey
- `get_visible_surveys` — wraps `getVisibleSurveys`, returns surveys visible to a given user
- `list_recent_activity` — wraps `Activity.getRecent`
- `get_class_roster` — wraps `Class.getStudents`
- `get_user_by_username` — wraps `User.findByUsername`

### Write tools

- `share_survey` — sets `sharedWith*` flags (replaces "publish")
- `close_survey` — sets `closedAt`
- `create_student` — wraps `User.create` with role validation
- `assign_student_to_class` — wraps `User.update` with `classId`
- `record_activity_note` — wraps `Activity.log`

### Avoid as the main interface

- `execute_sql`
- `alter_schema`
- directly editing `sessions` table rows (managed by `connect-sqlite3`)
- setting `password` column directly (must use `bcryptjs` via `User.create` or `User.update`)

---

## Step 6: implement the MCP server

Create `backend/src/mcp/server.js`. For a local setup, use **stdio transport**.

```javascript
#!/usr/bin/env node

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

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
```

---

## Step 7: add role and permission checks

The application uses lowercase roles. The guard pattern must match this exactly.

```javascript
function assertTeacherOrAdmin(actor) {
  // roles are lowercase: 'student', 'teacher', 'admin'
  if (actor.role !== 'teacher' && actor.role !== 'admin') {
    throw new Error('Forbidden');
  }
}
```

Apply the guard in the tool handler by loading the actor via `User.findById(actorUserId)` before any write occurs.

---

## Step 8: audit every write action

Every mutating tool should call `Activity.log`. The signature is:

```javascript
Activity.log(userId, action, targetType, targetId, details)
// details is an object — Activity.log calls JSON.stringify internally
```

Examples to log:
- `'survey_shared'` — targeting type `'survey'`
- `'survey_closed'` — targeting type `'survey'`
- `'student_created'` — targeting type `'user'`
- `'student_assigned_to_class'` — targeting type `'user'`

Do **not** call `JSON.stringify` on `details` yourself before passing to `Activity.log` — the model already does this.

---

## Step 9: wire the MCP server into the project

### Add to `backend/package.json`

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "mcp": "node src/mcp/server.js",
    "lint": "eslint .",
    "test": "jest"
  }
}
```

Run:

```bash
cd backend
npm run mcp
```

Or from the repo root:

```bash
npm run mcp --prefix backend
```

### MCP client config

```json
{
  "mcpServers": {
    "survey-backend": {
      "command": "node",
      "args": ["C:/Users/dsuth/Documents/Code Projects/Survey App 2/backend/src/mcp/server.js"]
    }
  }
}
```

---

## Step 10: add the agent skill

Place the skill in `.agent/skills/survey-backend/SKILL.md` so it is picked up by the existing Antigravity skill loader.

```markdown
---
name: survey-backend
description: Use the local survey backend MCP tools to inspect surveys, share surveys with classes/year levels/school, close surveys, review class rosters, and summarise responses without touching raw session or password data.
---

# When to use this skill

Use this skill when the user asks to:
- inspect surveys or questions
- share or close a survey
- summarise survey responses
- inspect class-linked survey data
- review recent backend activity

# Rules

- Never request or modify password hashes.
- Never inspect or edit session storage (managed by connect-sqlite3).
- Never alter schema.
- Prefer model-level tools: get_survey, share_survey, close_survey, get_survey_response_summary.
- Treat activities as the audit trail for write actions.
- There is no is_published column — use sharedWith* flags and closedAt.

# Schema quick reference

- users: id, username, displayName, role ('student'|'teacher'|'admin'), classId, yearLevel
- classes: id, name, teacherId
- surveys: id, creatorId, title, sharedWithClass, sharedWithYearLevel, sharedWithSchool, closedAt
- questions: id, surveyId, orderIndex, questionText, type
- responses: id, surveyId, userId, submittedAt
- survey_answers: id, responseId, questionId, selectedOption
- activities: id, userId, action, targetType, targetId, details (JSON), timestamp
```

---

## Step 11: handle contention safely

SQLite WAL improves concurrency, but the Express server and the MCP server will share the same `survey.db`. 

### Practical rules

- keep transactions short
- the current app does not share a single `db` singleton between processes — each process opens its own connection, which is correct for local stdio MCP
- use `busy_timeout` (add to `connection.js` as noted in Step 2)
- do not keep a transaction open across multiple agent turns
- batch related writes into a single quick transaction where appropriate

### Good transaction example (following existing app style)

```javascript
const shareSurveyTxn = db.transaction(({ surveyId, flags, actorUserId, title }) => {
  db.prepare(`UPDATE surveys SET sharedWithClass = ?, sharedWithSchool = ? WHERE id = ?`)
    .run(flags.sharedWithClass ? 1 : 0, flags.sharedWithSchool ? 1 : 0, surveyId);
  // Activity.log uses a separate prepare internally, which is fine inside a transaction
  db.prepare(`INSERT INTO activities (userId, action, targetType, targetId, details) VALUES (?, ?, ?, ?, ?)`)
    .run(actorUserId, 'survey_shared', 'survey', surveyId, JSON.stringify({ title }));
  return { surveyId, title };
});
```

---

## Step 12: read-only SQL admin tool (optional)

If you truly need raw inspection, add a **read-only** SQL tool and keep it separate from normal agent workflows.

```javascript
function assertReadonlySql(sql) {
  const normalised = sql.trim().toUpperCase();
  if (!normalised.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }
}
```

Good uses: debugging, analytics checks, manual inspection during development.  
Bad uses: normal production agent workflow, user creation, survey operations.

---

## Step 13: testing checklist

### Database layer tests

- opens `survey.db` from repo root
- confirms WAL mode is active
- reads a known survey via `Survey.findById`
- reads questions via `Question.findBySurveyId`
- reads students via `Class.getStudents`
- logs an activity via `Activity.log` and reads it back via `Activity.getRecent`

### MCP tool tests

- `get_survey` returns survey + questions (questions use `orderIndex`, `questionText`, `type`)
- `share_survey` updates `sharedWith*` flags and logs to `activities`
- `close_survey` sets `closedAt` and logs to `activities`
- invalid IDs return a safe error message
- non-teacher/admin actors are rejected for write tools
- `get_user_by_username` strips the `password` field before returning

### Schema correctness assertions

- `activities.action` column is named `action` (not `action_type`)
- `activities.timestamp` column is named `timestamp` (not `created_at`)
- `surveys.creatorId` column is named `creatorId` (not `created_by`)
- `questions.orderIndex` column is named `orderIndex` (not `sort_order`)
- `survey_answers` has no `survey_id` column — it joins via `responseId → responses.surveyId`

### Contention tests

- teacher shares survey while agent reads surveys
- student submits while agent summarises responses
- repeated share/close calls do not trigger lock failures under normal use

---

## Step 14: rollout plan

### Phase 1

Implement:
- `get_survey`
- `get_survey_response_summary`
- `share_survey`
- `close_survey`

### Phase 2

Add:
- `list_surveys_for_creator`
- `get_visible_surveys` (wrapping `visibility_service.getVisibleSurveys`)
- `list_recent_activity`
- `get_class_roster`
- `create_student`
- `assign_student_to_class`

### Phase 3

Add:
- backup tool
- optional read-only SQL tool
- richer role checks
- stronger structured output formats
- more detailed resources for schema and workflow help

---

## Step 15: final recommendations

1. **Build a small local MCP server that sits alongside the Express backend — do not replace it.**
2. **Import models and services directly (e.g. `require('../models/survey')`). Do not write raw SQL in tool handlers.**
3. **The `connection.js` exports `db` directly, not `{ db }`. All models already use this pattern.**
4. **There is no `is_published` column. Use the `sharedWith*` flags and `closedAt` to control survey state.**
5. **Activity logging uses `Activity.log(userId, action, targetType, targetId, details)` — the `action` column, not `action_type`.**
6. **Keep all write actions short, transactional, and logged.**
7. **Add the skill to `.agent/skills/survey-backend/SKILL.md` — not to a root-level `skills/` folder, which does not exist.**

---

## Reference links

- MCP server concepts: https://modelcontextprotocol.io/docs/learn/server-concepts
- MCP transports: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- better-sqlite3 performance notes: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
- SQLite WAL documentation: https://sqlite.org/wal.html
- SQLite PRAGMA documentation: https://sqlite.org/pragma.html
- SQLite busy timeout: https://sqlite.org/c3ref/busy_timeout.html
