# Implementation Plan: Survey App MVP

**Branch**: `001-survey-app-mvp` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-survey-app-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements the core Minimum Viable Product (MVP) of the Survey App, enabling students and teachers to create, distribute, and respond to multiple-choice surveys on a school LAN. The system uses an Express.js backend with SQLite for persistence and a React frontend for user interaction.

## Technical Context

**Language/Version**: Node.js v18+, React v18+  
**Primary Dependencies**: Express, React, better-sqlite3, express-session, Jest, Supertest, React Testing Library  
**Storage**: SQLite (single file: `survey.db`)  
**Testing**: Jest (Backend), React Testing Library (Frontend)  
**Target Platform**: Windows machine on school LAN  
**Project Type**: Web application (Frontend + Backend)  
**Performance Goals**: <2 seconds response time for survey submissions; support for 50+ concurrent users  
**Constraints**: Port 3005 (Frontend), 3006 (Backend); no external internet access required (LAN-only)  
**Scale/Scope**: Initial MVP with manual login, multiple-choice questions, and role-based visibility

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| **I. RBAC & Visibility** | Does this feature respect role-based visibility and privacy settings? | [x] |
| **II. Data Integrity** | Are validation rules (e.g., duplicate checks, question counts) enforced? | [x] |
| **III. LAN-First** | Does this work within the 3005/3006 port and SQLite constraints? | [x] |
| **IV. TDD Discipline** | Are tests (Jest/Supertest/RTL) planned for core logic? | [x] |
| **V. Extensibility** | Does this avoid breaking the core schema or question extensibility? | [x] |

## Project Structure

### Documentation (this feature)

```text
specs/001-survey-app-mvp/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── auth.md
│   ├── surveys.md
│   └── responses.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # Database schemas and interactions
│   ├── services/        # Business logic (visibility, validation)
│   ├── api/             # Express routes and controllers
│   └── db/              # Database initialization and migrations
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Dashboard, Create, Browse, Results
│   └── services/        # API client for backend communication
└── tests/
    ├── integration/
    └── unit/
```

**Structure Decision**: A dual-project structure with `backend/` and `frontend/` directories at the root, consistent with common React + Express architectures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(No violations identified)
