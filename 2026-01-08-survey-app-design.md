# Survey App Design Document

**Date:** 2026-01-08  
**Status:** MVP Design - Validated  
**Tech Stack:** React + Express.js + SQLite  
**Deployment:** Local Area Network (LAN)

---

## Overview

A web-based survey application deployed on a school LAN, allowing students and teachers to create surveys and collect responses. Students can create surveys and control who they share them with (class, year level, or school-wide), with permissions managed by their teacher. Teachers have admin access to view all surveys and results across the database.

**MVP Scope:**
- Manual login (username/password) — Windows authentication to come later
- Multiple choice questions only — extensible for future question types
- Survey creation by both students and teachers
- Student-controlled distribution with teacher-set permission levels
- Anonymous or identified responses (creator chooses at survey creation)
- Results viewable by survey creator and respondents (based on anonymity setting)
- Teachers can view all surveys and results in the database

---

## Architecture

### High-Level System Design

**Frontend:** React application served from Express, running in browsers on student/teacher machines across the LAN

**Backend:** Express.js API handling survey CRUD operations, response submission, result retrieval, and permission management

**Database:** SQLite with single-file persistence — no separate database server required

**Authentication:** Session-based login stored in Express session or SQLite

**Deployment:** Single `npm start` command on a Windows machine on the LAN. Users navigate to `http://[server-ip]:3005` from their machines.

---

## Data Model

### Users Table
```
id (primary key)
username (unique) — login identifier
displayName — full name for display
role — 'student' or 'teacher'
classId — (foreign key) links student to their class; null for teachers
yearLevel — (e.g., '7', '8', '9') for year-based sharing
createdAt
```

### Classes Table
```
id (primary key)
name — class identifier (e.g., "7A", "8B")
teacherId (foreign key to Users) — the teacher who manages this class
createdAt
```

### DistributionPermissions Table
```
id (primary key)
classId (foreign key to Classes)
canShareWithClass — boolean
canShareWithYearLevel — boolean
canShareWithSchool — boolean
createdAt
updatedAt
```

Sets what distribution options are available to students in each class.

### Surveys Table
```
id (primary key)
creatorId (foreign key to Users) — student or teacher who created it
title
description
isAnonymous — boolean, set by creator
sharedWithClass — boolean (shared to creator's class)
sharedWithYearLevel — boolean (shared to creator's year level)
sharedWithSchool — boolean (shared to entire school)
createdAt
closedAt — null if open, timestamp if closed (optional for MVP)
```

### Questions Table
```
id (primary key)
surveyId (foreign key to Surveys)
orderIndex — preserves question order
questionText
type — 'multipleChoice' (only type in MVP)
options — JSON array like ["Option A", "Option B", "Option C"]
isRequired — boolean
```

### Responses Table
```
id (primary key)
surveyId (foreign key to Surveys)
userId (foreign key to Users, or null if anonymous)
submittedAt — timestamp when survey was completed
```

### SurveyAnswers Table
```
id (primary key)
responseId (foreign key to Responses)
questionId (foreign key to Questions)
selectedOption — the answer text or index they chose
```

---

## User Flows

### Student Flow

1. **Login:** Student enters username → authenticated, session created
2. **Dashboard:** Two tabs: "Create Survey" and "Browse Surveys"
3. **Create Survey:**
   - Fill in title, description
   - Toggle anonymous/identified
   - Add multiple choice questions dynamically (add/remove as needed)
   - Before publishing, see distribution checkboxes: "Share with my class" ☐ "Share with my year level" ☐ "Share with entire school" ☐
   - Only enabled checkboxes appear (based on teacher's DistributionPermissions)
   - Submit to publish
4. **Browse Surveys:**
   - See all surveys they're eligible to view (based on sharing settings)
   - Filter: "Created by me" vs "Assigned to me"
   - Click survey → take it → submit answers
5. **View Responses:**
   - Can see their own responses if survey is identified
   - Can see aggregated results if survey is anonymous
   - Can view results of surveys they've completed

### Teacher Flow

1. **Login:** Teacher enters username → authenticated, session created
2. **Dashboard:** Three tabs: "Create Survey," "View Results," "Manage Class"
3. **Create Survey:** Same as students (teachers can create surveys and distribute them)
4. **View Results:**
   - See all surveys in the database (created by anyone)
   - Click survey → see all responses
   - Download results (optional for MVP)
5. **Manage Class:**
   - See their class roster
   - Set DistributionPermissions: checkboxes for what their students can share with
   - Save changes → affects all students in that class immediately

---

## Survey Visibility Logic

A student sees a survey if any of these are true:
- They created it themselves
- Survey creator shared it to their class (and student is in that class)
- Survey creator shared it to their year level (and student is in that year level)
- Survey creator shared it to the entire school

Teachers see all surveys in the database.

---

## API Endpoints

### Authentication
- `POST /auth/login` — Submit username/password, return session token
- `POST /auth/logout` — Clear session
- `GET /auth/user` — Get current logged-in user info

### Surveys
- `GET /surveys` — List all visible surveys for logged-in user (filtered by visibility logic)
- `POST /surveys` — Create new survey (student or teacher)
- `GET /surveys/:id` — Get survey details + questions
- `GET /surveys/:id/results` — Get results (aggregated counts, or per-user if identified)
- `PUT /surveys/:id` — Update survey metadata (optional for MVP, may skip)
- `DELETE /surveys/:id` — Delete survey (optional for MVP, may skip)

### Responses
- `POST /surveys/:id/responses` — Submit completed survey response
- `GET /user/responses` — Get all surveys current user has completed
- `GET /surveys/:id/responses/:responseId` — Get single response details (user's own or teacher viewing)

### Permissions
- `GET /class/:classId/permissions` — View distribution permissions (teacher only)
- `PUT /class/:classId/permissions` — Update permissions (teacher only)

### User/Class Management
- `GET /classes` — Get list of classes (teacher view only, for managing)
- `GET /classes/:classId/students` — Get students in a class (teacher only)

---

## Error Handling & Edge Cases

### Survey Submission
- **Incomplete survey:** Student missing required questions → validation error on frontend, shows which questions are missing
- **Duplicate submission:** Student tries to submit twice → backend returns 409 Conflict: "You've already completed this survey"
- **Closed survey:** Survey closed while student taking it → "This survey is no longer accepting responses"

### Permissions
- **Unauthorized access:** Student tries to view survey they're not eligible for → 403 Forbidden (also hidden from their survey list)
- **Restricted distribution:** Student tries to check "School-wide" checkbox but teacher hasn't allowed it → checkbox disabled, can't select

### Data Integrity
- **Empty survey:** Survey with no questions can't be published (frontend + backend validation)
- **No responses:** Results page shows "No responses yet" gracefully
- **Deleted user:** Surveys remain; responses show "Unknown user" or null userId
- **Anonymous responses:** Student can't identify which responses are theirs; teacher can always see userId

### Display
- **Results display:** Anonymous surveys show aggregate counts only; identified surveys show per-user breakdown
- **Closed surveys:** Students can still view and take them in MVP (closing feature optional)

---

## Testing Strategy

### Backend (Jest + Supertest)
- Authentication: login success/failure, session management
- Survey creation: valid/invalid input, permission checks
- Response submission: completion, duplicate attempts, validation
- Visibility logic: students see correct surveys based on sharing settings
- Permission management: teacher can set/update permissions

### Frontend (React Testing Library)
- Login flow: username entry, session persistence
- Create survey: add questions, set distribution, publish
- Browse surveys: filter by created/assigned, view survey details
- Take survey: answer questions, submit, confirmation
- View results: see responses (identified or anonymous)

### Manual Testing
- Test on local machine (development)
- Test on second machine on LAN to verify network access
- Verify SQLite database persists across restarts

---

## Development Setup

### Local Development
```bash
npm install
npm run dev
```

Runs React dev server on **port 3005** and Express backend on **port 3006** with proxy configuration.

### Production Deployment
```bash
npm install
npm start
```

Serves React build + API from **port 3005**, backend on **port 3006**. Navigate to `http://[server-ip]:3005`.

### Database
- SQLite file created automatically on first run
- Lives in project root (or configurable path)
- Back up by copying the `.db` file

---

## Port Configuration

- **Frontend:** 3005
- **Backend:** 3006

---

## Future Enhancements (Post-MVP)

- **Windows Authentication:** Replace manual login with automatic Windows domain detection
- **Per-Student Permissions:** Teachers can give different students different sharing rights
- **More Question Types:** Add rating scales, free text, ranking, etc.
- **Survey Editing/Deletion:** Allow creators to modify or remove surveys
- **Results Export:** Download results as CSV/Excel
- **Search & Filtering:** Search surveys by title, filter by date created, etc.
- **Survey Templates:** Pre-built survey templates for common use cases
- **Real-time Notifications:** Alert teachers when surveys are completed
- **Analytics Dashboard:** Teacher-facing dashboard with survey completion rates, insights

---

## Notes

- **Authentication placeholder:** Manual login for MVP. Windows AD/NTLM integration will require investigation of how domain info is passed in LAN connections from Windows machines.
- **Question extensibility:** Database and API designed to support additional question types without schema changes. Add new types to the `type` enum and handle in frontend/backend logic.
- **Permission extensibility:** DistributionPermissions table designed to support per-student overrides later (add `userId` foreign key when needed).
- **Anonymity handling:** Both survey responses and visibility use straightforward booleans. Teacher always sees userId regardless of anonymity setting (allows compliance if needed).

---

**Design validated:** 2026-01-08