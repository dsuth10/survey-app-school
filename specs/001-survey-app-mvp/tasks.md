# Tasks: Survey App MVP

**Input**: Design documents from `/specs/001-survey-app-mvp/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD is required for core logic (visibility, validation, and auth) as per the project constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- **Shared**: `database/` (SQLite file location)
- **Tests**: `backend/tests/`, `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize root project with `npm init` and install shared dev dependencies
- [x] T002 Initialize `backend` directory with `express` and `better-sqlite3`
- [x] T003 Initialize `frontend` directory with `create-react-app` or `vite`
- [x] T004 [P] Configure `.gitignore` and `eslint/prettier` in the root directory
- [x] T005 [P] Setup `concurrently` in root `package.json` for running FE and BE

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Setup SQLite database initialization script in `backend/src/db/init.js`
- [x] T007 [P] Create `User` and `Class` models in `backend/src/models/user.js` and `backend/src/models/class.js`
- [x] T008 [P] Implement authentication middleware using `express-session` and `connect-sqlite3` in `backend/src/api/auth.js`
- [x] T009 Implement manual login/logout endpoints in `backend/src/api/auth_routes.js`
- [x] T010 Create base frontend layout with Navigation and Auth Context in `frontend/src/App.js` and `frontend/src/contexts/AuthContext.js`
- [x] T011 [P] Configure `proxy` in `frontend/package.json` to point to port 3006

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Survey Creation and Distribution (Priority: P1) 🎯 MVP

**Goal**: Enable users to create surveys with multiple-choice questions and set distribution.

**Independent Test**: Log in, go to "Create Survey," add questions, select "Class" sharing, and save. Verify it appears in "Created by me."

### Tests for User Story 1
- [x] T012 [P] [US1] Integration test for survey creation with validation in `backend/tests/integration/survey_creation.test.js`
- [x] T013 [P] [US1] Unit test for distribution permission logic in `backend/tests/unit/permissions.test.js`

### Implementation for User Story 1
- [x] T014 [P] [US1] Create `Survey` and `Question` models in `backend/src/models/survey.js`
- [x] T015 [US1] Implement survey creation service with visibility validation in `backend/src/services/survey_service.js`
- [x] T016 [US1] Implement `POST /api/surveys` endpoint in `backend/src/api/survey_routes.js`
- [x] T017 [US1] Create "Create Survey" form component in `frontend/src/pages/CreateSurvey.js`
- [x] T018 [US1] Integrate sharing level checkboxes with backend permissions in `frontend/src/components/SharingOptions.js`

**Checkpoint**: User Story 1 is functional. Users can create and save surveys.

---

## Phase 4: User Story 2 - Survey Discovery and Response (Priority: P1)

**Goal**: Enable students to see shared surveys and submit responses.

**Independent Test**: Log in as a student, view the list of surveys, select one, fill it out, and submit. Verify response count increases.

### Tests for User Story 2
- [x] T019 [P] [US2] Integration test for survey visibility filtering in `backend/tests/integration/survey_visibility.test.js`
- [x] T020 [P] [US2] Integration test for duplicate response prevention in `backend/tests/integration/response_submission.test.js`

### Implementation for User Story 2
- [x] T021 [P] [US2] Create `Response` and `SurveyAnswer` models in `backend/src/models/response.js`
- [x] T022 [US2] Implement survey filtering logic (Class/Year/School) in `backend/src/services/visibility_service.js`
- [x] T023 [US2] Implement `GET /api/surveys` and `POST /api/surveys/:id/responses` in `backend/src/api/survey_routes.js`
- [x] T024 [US2] Create "Browse Surveys" list page in `frontend/src/pages/BrowseSurveys.js`
- [x] T025 [US2] Create "Take Survey" form page in `frontend/src/pages/TakeSurvey.js`

**Checkpoint**: User Story 2 is functional. Students can find and take surveys.

---

## Phase 5: User Story 3 - Results Visualization (Priority: P1)

**Goal**: Enable creators and teachers to see aggregated or detailed results.

**Independent Test**: Navigate to "View Results" for a completed survey. Verify anonymous surveys don't show names, but identified ones do.

### Tests for User Story 3
- [x] T026 [P] [US3] Unit test for results aggregation logic in `backend/tests/unit/results_service.test.js`
- [x] T027 [P] [US3] Integration test for anonymity masking in `backend/tests/integration/results_view.test.js`

### Implementation for User Story 3
- [x] T028 [US3] Implement results aggregation service in `backend/src/services/results_service.js`
- [x] T029 [US3] Implement `GET /api/surveys/:id/results` endpoint in `backend/src/api/survey_routes.js`
- [x] T030 [US3] Create "Results Dashboard" component in `frontend/src/pages/ResultsDashboard.js`
- [x] T031 [US3] Implement conditional identity display based on `isAnonymous` and user role in `frontend/src/components/ResponseDetails.js`

**Checkpoint**: User Story 3 is functional. Results are viewable according to privacy rules.

---

## Phase 6: User Story 4 - Class and Permission Management (Priority: P2)

**Goal**: Enable teachers to manage class sharing permissions.

**Independent Test**: Log in as a teacher, go to "Manage Class," toggle a permission, and verify it affects student survey options immediately.

### Tests for User Story 4
- [X] T032 [P] [US4] Integration test for updating class permissions in `backend/tests/integration/class_management.test.js`

### Implementation for User Story 4
- [X] T033 [P] [US4] Create `DistributionPermission` model in `backend/src/models/permissions.js`
- [X] T034 [US4] Implement `GET` and `PUT` for class permissions in `backend/src/api/class_routes.js`
- [X] T035 [US4] Create "Manage Class" page for teachers in `frontend/src/pages/ManageClass.js`

**Checkpoint**: All user stories are complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and deployment readiness

- [X] T036 Implement global error boundary in `frontend/src/components/ErrorBoundary.js`
- [X] T037 [P] Finalize `README.md` with LAN deployment instructions
- [X] T038 Conduct a final security audit of RBAC logic in `backend/src/services/`
- [X] T039 [P] Optimize database queries with appropriate indexes in `backend/src/db/init.js`
- [X] T040 Run `quickstart.md` validation on a separate LAN machine

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **User Stories (Phase 3-6)**: Depend on Foundational completion.
    - US1, US2, and US3 are high priority and can be worked on in parallel once their respective models are ready.
    - US4 is lower priority but serves as a control for US1/US2.
- **Polish (Phase 7)**: Depends on all user stories.

### Parallel Opportunities
- Backend and Frontend development for the same user story can happen in parallel once API contracts are agreed upon.
- Integration tests [P] can be written in parallel with model development.
- All tasks marked [P] can run simultaneously in different files.

---

## Implementation Strategy

### MVP First (User Story 1, 2, 3)
1. Complete Setup and Foundational.
2. Complete US1, US2, and US3.
3. Validate that a student can create a survey, another can take it, and the creator can see results.

### Incremental Delivery
- Each Phase (User Story) adds a complete slice of functionality.
- TDD ensures that each new story doesn't break the visibility or validation logic of previous ones.
