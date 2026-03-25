<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1] → I. Role-Based Access Control (RBAC) & Visibility
  - [PRINCIPLE_2] → II. Validation & Data Integrity
  - [PRINCIPLE_3] → III. LAN-First Architecture
  - [PRINCIPLE_4] → IV. Test-Driven Discipline
  - [PRINCIPLE_5] → V. Modular Extensibility
- Added sections: Technology Stack, User Governance
- Removed sections: None
- Templates requiring updates:
  - ✅ updated: .specify/templates/plan-template.md
  - ✅ updated: .specify/templates/spec-template.md
  - ✅ updated: .specify/templates/tasks-template.md
- Follow-up TODOs: None
-->

# Survey App Constitution

## Core Principles

### I. Role-Based Access Control (RBAC) & Visibility
Security and privacy are non-negotiable. All survey data must be governed by strict visibility logic:
- Students see only their own surveys or those shared with their class, year level, or school-wide.
- Teachers have full administrative visibility into all surveys and results.
- Anonymous settings must be strictly enforced for student views (identities hidden from creators if set).
- Rationale: Ensures a safe and private environment for student feedback while maintaining teacher oversight.

### II. Validation & Data Integrity
Data quality and consistency are maintained through strict validation rules:
- Surveys MUST have at least one multiple-choice question to be published.
- Duplicate submissions from the same student for a single survey MUST be blocked.
- Question order and options MUST be preserved using `orderIndex` and robust JSON schemas.
- Rationale: Prevents corrupt or low-quality data from entering the system.

### III. LAN-First Architecture
The application is specifically optimized for school LAN deployment:
- It MUST be deployable via a single `npm start` command on a Windows host machine.
- Persistence MUST use a single SQLite file for zero-config database management.
- Fixed ports MUST be used: 3005 for Frontend (React) and 3006 for Backend (Express).
- Rationale: Minimizes deployment complexity for school environments without dedicated IT infrastructure.

### IV. Test-Driven Discipline
Quality is built into every feature from the start:
- TDD is mandatory for all core logic, especially visibility, authentication, and response validation.
- Backend tests MUST use Jest and Supertest.
- Frontend tests MUST use React Testing Library.
- All tests MUST pass before a feature can be considered "Done."
- Rationale: High reliability is critical when the application is used by hundreds of students simultaneously.

### V. Modular Extensibility
Design decisions must favor future growth without breaking core functionality:
- The system MUST support adding new question types (beyond multiple choice) without schema changes.
- Authentication MUST be modular to allow future integration with Windows AD/NTLM.
- Use enums and dynamic handlers for question processing.
- Rationale: Ensures the MVP remains a viable foundation for post-MVP enhancements.

## Technology Stack
The Survey App is built on a modern, lightweight, and local-friendly stack:
- **Frontend**: React application served from Express.
- **Backend**: Express.js API handling CRUD, permissions, and session management.
- **Database**: SQLite with single-file persistence.
- **Communication**: RESTful API endpoints following standard HTTP status codes.

## User Governance
User interactions are defined by two primary roles:
- **Student Role**: Empowered to create, distribute (within teacher-set limits), browse, and respond.
- **Teacher Role**: Full administrative oversight, including result aggregation and managing class sharing permissions.

## Governance
This constitution is the source of truth for all architectural and design decisions:
- Amendments require a documented rationale, a MAJOR version bump, and a consistency check.
- All Implementation Plans must include a "Constitution Check" section verifying alignment with these principles.
- Versioning follows semantic rules (MAJOR.MINOR.PATCH).

**Version**: 1.0.0 | **Ratified**: 2026-01-08 | **Last Amended**: 2026-01-08
