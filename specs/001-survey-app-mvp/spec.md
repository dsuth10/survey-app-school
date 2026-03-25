# Feature Specification: Survey App MVP

**Feature Branch**: `001-survey-app-mvp`  
**Created**: 2026-01-08  
**Status**: Draft  
**Input**: User description: "@2026-01-08-survey-app-design.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Survey Creation and Distribution (Priority: P1)

As a student or teacher, I want to create a survey with multiple-choice questions and distribute it to specific groups (class, year level, or school) so that I can collect data from my peers or students.

**Why this priority**: Core functionality of the application. Without creation, there are no surveys to take.

**Independent Test**: Can be fully tested by a user logging in, navigating to "Create Survey," adding questions, selecting distribution options, and successfully saving the survey.

**Acceptance Scenarios**:

1. **Given** a logged-in student, **When** they fill in survey details, add 3 multiple-choice questions, and click "Submit," **Then** the survey is saved and appears in their "Created by me" list.
2. **Given** a student whose teacher has only allowed "Class" sharing, **When** they create a survey, **Then** the "Year Level" and "School-wide" distribution options are disabled or hidden.
3. **Given** a user creating a survey, **When** they toggle the "Anonymous" setting to ON, **Then** the system records that responses should not display identifying information to the creator.

---

### User Story 2 - Survey Discovery and Response (Priority: P1)

As a student, I want to see surveys shared with me and submit my responses so that I can participate in school research and feedback.

**Why this priority**: Core functionality. Enables data collection which is the primary purpose of the app.

**Independent Test**: Can be fully tested by a student browsing the "Browse Surveys" tab, selecting a survey shared with them, answering questions, and submitting.

**Acceptance Scenarios**:

1. **Given** a survey shared with "Year 9," **When** a Year 9 student logs in, **Then** they see that survey in their "Assigned to me" list.
2. **Given** a survey shared with "Year 9," **When** a Year 10 student logs in, **Then** they do NOT see that survey.
3. **Given** a student has already completed a survey, **When** they attempt to take it again, **Then** the system prevents submission and informs them they have already responded.

---

### User Story 3 - Results Visualization (Priority: P1)

As a survey creator or teacher, I want to view the results of surveys so that I can analyze the collected data.

**Why this priority**: Essential for the survey to have any value to the creator or the school.

**Independent Test**: Can be tested by navigating to the "View Results" or "Created by me" section and viewing the data breakdown for a survey with existing responses.

**Acceptance Scenarios**:

1. **Given** an anonymous survey with 10 responses, **When** the creator views results, **Then** they see aggregated counts for each option but no student names.
2. **Given** an identified survey, **When** the creator views results, **Then** they see a breakdown of which student chose which option.
3. **Given** any survey, **When** a teacher views results, **Then** they can see all responses, including user identification even for anonymous surveys (for administrative oversight).

---

### User Story 4 - Class and Permission Management (Priority: P2)

As a teacher, I want to manage my class list and set what distribution rights my students have so that I can control how surveys are shared across the school.

**Why this priority**: Important for school-wide governance and preventing misuse of school-wide sharing.

**Independent Test**: Can be tested by a teacher logging in, navigating to "Manage Class," and toggling distribution checkboxes.

**Acceptance Scenarios**:

1. **Given** a teacher, **When** they check "canShareWithSchool" for their class, **Then** all students in that class immediately gain the ability to share surveys school-wide.
2. **Given** a teacher viewing their class, **When** they see the student roster, **Then** it accurately reflects the students assigned to their class ID.

---

### Edge Cases

- **Incomplete survey:** If a student attempts to submit a survey with unanswered required questions, the system must highlight the missing fields and prevent submission.
- **Survey closed during session:** If a survey is closed by the creator while a student is currently filling it out, the system should inform the student upon submission that the survey is no longer accepting responses.
- **Creator deletion:** If a user is deleted from the system, their surveys should remain active, but the creator should be listed as "Unknown" or "Former User."
- **Network Interruptions:** Since this is a LAN app, if the connection is lost during submission, the frontend should notify the user and allow them to retry without losing their answers (in-memory).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: [Auth] System MUST allow users to log in using a unique username and a password.
- **FR-002**: [RBAC] System MUST distinguish between 'student' and 'teacher' roles, granting teachers administrative access to all data.
- **FR-003**: [Visibility] System MUST filter visible surveys for students based on distribution settings (Class, Year Level, School) and creator ID.
- **FR-004**: [Validation] System MUST enforce that multiple-choice questions have at least two options and that required questions are answered before submission.
- **FR-005**: [Integrity] System MUST prevent a user from submitting multiple responses to the same survey.
- **FR-006**: [Privacy] System MUST hide respondent identities from creators if the survey is marked as 'Anonymous'.
- **FR-007**: [Governance] System MUST allow teachers to enable or disable specific sharing levels (Class, Year, School) for their assigned class.
- **FR-008**: [Audit] System MUST always record the identity of a respondent, even if the survey is anonymous to the creator, for teacher/admin review.

### Key Entities *(include if feature involves data)*

- **User**: Represents a student or teacher. Attributes: ID, username, password, display name, role, class ID, year level.
- **Class**: Represents a student group. Attributes: ID, name, teacher ID (link to User).
- **Survey**: The core data structure. Attributes: ID, creator ID, title, description, isAnonymous, sharedWithClass, sharedWithYearLevel, sharedWithSchool.
- **Question**: Individual items within a survey. Attributes: ID, survey ID, order index, text, type (multipleChoice), options (JSON list).
- **Response**: A record of a user completing a survey. Attributes: ID, survey ID, user ID (optional for identified logic), timestamp.
- **DistributionPermission**: Settings for a class. Attributes: class ID, canShareWithClass, canShareWithYearLevel, canShareWithSchool.

## Assumptions

- Users will have access to the school LAN and a modern web browser.
- Student identities can be mapped to their class and year level via an existing student management system or manual entry during account creation.
- Teachers are responsible for the initial setup of class distribution permissions.
- The application will be accessed primarily on desktop or tablet devices (layout assumption).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create and publish a 5-question survey in under 180 seconds.
- **SC-002**: 100% of surveys shared with "School-wide" are visible to all logged-in students immediately upon publication.
- **SC-003**: 100% of students in a class are restricted from school-wide sharing if their teacher has disabled that permission.
- **SC-004**: System successfully handles 50 concurrent survey submissions on a local network without data loss or significant lag (>2 seconds response time).
- **SC-005**: 100% of survey results for anonymous surveys correctly mask student identities from the student creator while revealing them to teacher roles.
