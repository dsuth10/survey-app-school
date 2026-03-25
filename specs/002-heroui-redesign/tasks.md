---

description: "Actionable tasks for HeroUI redesign implementation"
---

# Tasks: UI Redesign with HeroUI

**Input**: Design documents from `/specs/002-heroui-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **Configuration**: `frontend/tailwind.config.js`, `frontend/postcss.config.js`
- **Main Entry**: `frontend/src/main.jsx`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install HeroUI and Tailwind dependencies in `frontend/package.json`
- [x] T002 Initialize Tailwind CSS and PostCSS configuration in `frontend/`
- [x] T003 [P] Configure HeroUI plugin in `frontend/tailwind.config.js`
- [x] T004 [P] Import Tailwind directives in `frontend/src/index.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Setup `HeroUIProvider` in `frontend/src/main.jsx`
- [x] T006 [P] Create base layout component using HeroUI `Navbar` and `Container` in `frontend/src/components/MainLayout.jsx`
- [x] T007 [P] Create a theme context/hook for manual theme overrides if needed in `frontend/src/contexts/ThemeContext.jsx`
- [x] T008 [P] Refactor `frontend/src/App.jsx` to use the new `MainLayout`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Completing a Survey with Modern Form Controls (Priority: P1) 🎯 MVP

**Goal**: Redesign core survey input components (Radio, Checkbox, Input) using HeroUI for a modern, "glassmorphism" feel.

**Independent Test**: Navigate to a survey page and verify that all inputs use HeroUI components and successfully capture data.

### Implementation for User Story 1

- [x] T009 [P] [US1] Refactor radio question components to use `RadioGroup` and `Radio` in `frontend/src/components/questions/RadioQuestion.jsx`
- [x] T010 [P] [US1] Refactor checkbox question components to use `CheckboxGroup` and `Checkbox` in `frontend/src/components/questions/CheckboxQuestion.jsx`
- [x] T011 [P] [US1] Refactor text input questions to use HeroUI `Input` or `Textarea` in `frontend/src/components/questions/TextQuestion.jsx`
- [x] T012 [P] [US1] Update survey action buttons to use HeroUI `Button` with glassmorphism styles in `frontend/src/components/SurveyActions.jsx`
- [x] T013 [US1] Implement HeroUI `Card` with `isBlurred` (glassmorphism) for survey containers in `frontend/src/pages/TakeSurvey.jsx`
- [x] T014 [US1] Add HeroUI validation states and error messages to all redesigned form controls in `frontend/src/components/questions/`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Accessibility-First Interaction (Priority: P2)

**Goal**: Ensure all HeroUI components are correctly configured for keyboard navigation and screen readers.

**Independent Test**: Complete a survey using only the keyboard (Tab, Space, Enter) and verify screen reader announcements for complex states.

### Implementation for User Story 2

- [x] T015 [US2] Audit and apply `aria-label` and `description` props to all HeroUI components in `frontend/src/components/`
- [x] T016 [P] [US2] Implement HeroUI `Modal` for survey instructions or delete confirmations with focus trapping in `frontend/src/components/InstructionModal.jsx`
- [x] T017 [P] [US2] Refactor dropdowns and selects to use HeroUI `Select` or `Dropdown` with full keyboard support in `frontend/src/components/HeaderActions.jsx`
- [x] T018 [US2] Verify focus rings and high-contrast states are visible across all redesigned components.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Effortless Theme Switching (Priority: P3)

**Goal**: Implement automatic and manual theme switching between Light and Dark modes.

**Independent Test**: Change OS theme settings or use a UI toggle to verify that the entire application UI updates colors instantly.

### Implementation for User Story 3

- [x] T019 [P] [US3] Configure `darkMode: "class"` in `frontend/tailwind.config.js`
- [x] T020 [US3] Implement a theme toggle switch using HeroUI `Switch` or `Button` in `frontend/src/components/MainLayout.jsx`
- [x] T021 [US3] Add a theme detection script to `frontend/index.html` or `main.jsx` to sync with system preferences.
- [x] T022 [US3] Verify that glassmorphism effects (blur, opacity) remain legible and visually appealing in both light and dark modes.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T023 [P] Implement HeroUI `Skeleton` loading states for survey data fetching in `frontend/src/pages/`
- [x] T024 Code cleanup: Remove old CSS files and unused component imports in `frontend/src/`
- [x] T025 Performance optimization: Ensure `framer-motion` animations are fluid and not blocking the main thread.
- [x] T026 [P] Update project documentation (README.md) with the new HeroUI tech stack details.
- [x] T027 Run `quickstart.md` validation to ensure all installation steps work on a clean environment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel
  - Recommended order: US1 (MVP) -> US2 -> US3
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories.
- **User Story 2 (P2)**: Depends on US1 components being available to audit for accessibility.
- **User Story 3 (P3)**: Can be implemented independently of US1/US2 after the Foundation is ready.

### Parallel Opportunities

- T003 and T004 (Setup)
- T006, T007, and T008 (Foundational)
- T009, T010, T011, and T012 (US1 Implementation)
- Once Foundational phase is done, US3 (Theme Switching) can be worked on in parallel with US1.

---

## Parallel Example: User Story 1

```bash
# Refactor all question types simultaneously:
Task: "Refactor radio question components in frontend/src/components/questions/RadioQuestion.jsx"
Task: "Refactor checkbox question components in frontend/src/components/questions/CheckboxQuestion.jsx"
Task: "Refactor text input questions in frontend/src/components/questions/TextQuestion.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (HeroUIProvider + MainLayout)
3. Complete Phase 3: User Story 1 (Core Survey Controls)
4. **STOP and VALIDATE**: Test User Story 1 on mobile and desktop
5. Demo the modern "glassmorphism" UI to stakeholders

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Avoid modifying the same file in parallel tasks to prevent merge conflicts.
