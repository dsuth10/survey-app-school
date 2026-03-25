# Phase 0: Research & Decision Log - Survey App MVP

This document captures the technical decisions and research conducted during Phase 0 of the Implementation Plan.

## Decision 1: Backend Framework & Database
- **Decision**: Node.js + Express.js with `better-sqlite3`.
- **Rationale**: Express is lightweight and well-suited for RESTful APIs. `better-sqlite3` is chosen over the standard `sqlite3` package because it is synchronous (easier to read/write for local apps) and significantly faster for the expected load on a single machine.
- **Alternatives considered**: `sqlite3` (asynchronous, slower), `Prisma` (adds build complexity for a simple MVP).

## Decision 2: Session Management
- **Decision**: `express-session` with `session-file-store` or `connect-sqlite3`.
- **Rationale**: Since the app is LAN-only and lacks a separate database server or Redis, persistent sessions should be stored either in the SQLite database itself or as flat files on the host machine. `connect-sqlite3` is preferred to keep all data in the single `.db` file.
- **Alternatives considered**: Memory store (sessions lost on restart), JSON Web Tokens (JWT) (stateless, but session invalidation is harder without a blacklist).

## Decision 3: Data Storage for Questions
- **Decision**: Store `options` as a JSON string in the `Questions` table.
- **Rationale**: This allows for easy extensibility of question types (e.g., adding a "rating" type with different metadata) without needing to alter the database schema.
- **Alternatives considered**: A separate `Options` table (more normalization, but harder to maintain for dynamic question types).

## Decision 4: Frontend State Management
- **Decision**: React Context API + Local State.
- **Rationale**: For an MVP of this scale, Redux is overkill. Context API can handle user authentication state, while local state is sufficient for survey creation and response tracking.
- **Alternatives considered**: Redux Toolkit, Zustand.

## Best Practices for LAN-First Deployment
- **Fixed Ports**: Port 3005 (FE) and 3006 (BE) must be explicitly set in environment variables.
- **Static Hosting**: The Express server should serve the React production build in production mode.
- **IP Binding**: The server should bind to `0.0.0.0` to be accessible from other machines on the LAN.

## Unresolved Unknowns (Resolved)
- **Windows Auth**: Postponed as per Design Doc. Manual login will be used for MVP.
- **File System Permissions**: On Windows, the process must have write access to the project root for the `.db` file.
