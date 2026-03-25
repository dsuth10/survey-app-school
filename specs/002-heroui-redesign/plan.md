# Implementation Plan: UI Redesign with HeroUI

**Branch**: `002-heroui-redesign` | **Date**: 2026-01-08 | **Spec**: [specs/002-heroui-redesign/spec.md](spec.md)
**Input**: Feature specification from `/specs/002-heroui-redesign/spec.md`

## Summary

This feature involves a complete overhaul of the application's user interface using **HeroUI** (formerly NextUI) and **Tailwind CSS**. The goal is to provide a modern, accessible, and high-performance frontend with glassmorphism effects and automatic dark mode support. The backend and data structures will remain intact, with the frontend components being refactored to use HeroUI's accessible primitives.

## Technical Context

**Language/Version**: JavaScript (ESM), React 19+  
**Primary Dependencies**: `@heroui/react`, `framer-motion`, `tailwindcss`, `vite`  
**Storage**: N/A (Frontend only redesign)  
**Testing**: Vitest + React Testing Library (for accessibility and component rendering)  
**Target Platform**: Web (optimized for Windows/Chrome LAN environment)
**Project Type**: Web application (Frontend + Backend structure)  
**Performance Goals**: <200ms theme switch, <1s initial page render  
**Constraints**: Must maintain fixed ports (3005/3006), WCAG AA compliance  
**Scale/Scope**: ~10 primary screens, all form components  

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
specs/002-heroui-redesign/
├── spec.md              # Feature Specification
├── plan.md              # This file
├── research.md          # Phase 0: HeroUI & Tailwind Research
├── data-model.md        # Phase 1: UI Component Mapping
├── quickstart.md        # Phase 1: Installation & Setup
└── tasks.md             # Phase 2 output (to be generated)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/      # Refactored HeroUI components
│   ├── pages/           # Redesigned pages
│   ├── layouts/         # HeroUI based layouts
│   └── main.jsx         # Provider setup
├── tailwind.config.js   # HeroUI configuration
└── postcss.config.js    # Tailwind setup

backend/ (Unchanged)
```

**Structure Decision**: Standard Web application structure with a decoupled frontend and backend. The redesign is isolated to the `frontend/` directory.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(No violations detected)
