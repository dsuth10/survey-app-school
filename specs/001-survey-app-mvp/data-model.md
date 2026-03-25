# Data Model: Survey App MVP

This document defines the entities and relationships for the Survey App.

## Entities

### User
- `id`: INTEGER (PK)
- `username`: TEXT (Unique)
- `password`: TEXT (Hashed)
- `displayName`: TEXT
- `role`: TEXT ('student', 'teacher')
- `classId`: INTEGER (FK to Class, Nullable for teachers)
- `yearLevel`: TEXT (e.g., '7', '8', '9')
- `createdAt`: DATETIME

### Class
- `id`: INTEGER (PK)
- `name`: TEXT (e.g., '7A', '8B')
- `teacherId`: INTEGER (FK to User)
- `createdAt`: DATETIME

### DistributionPermission
- `classId`: INTEGER (PK, FK to Class)
- `canShareWithClass`: BOOLEAN
- `canShareWithYearLevel`: BOOLEAN
- `canShareWithSchool`: BOOLEAN
- `updatedAt`: DATETIME

### Survey
- `id`: INTEGER (PK)
- `creatorId`: INTEGER (FK to User)
- `title`: TEXT
- `description`: TEXT
- `isAnonymous`: BOOLEAN
- `sharedWithClass`: BOOLEAN
- `sharedWithYearLevel`: BOOLEAN
- `sharedWithSchool`: BOOLEAN
- `createdAt`: DATETIME
- `closedAt`: DATETIME (Nullable)

### Question
- `id`: INTEGER (PK)
- `surveyId`: INTEGER (FK to Survey)
- `orderIndex`: INTEGER
- `questionText`: TEXT
- `type`: TEXT (Default: 'multipleChoice')
- `options`: TEXT (JSON array of strings)
- `isRequired`: BOOLEAN

### Response
- `id`: INTEGER (PK)
- `surveyId`: INTEGER (FK to Survey)
- `userId`: INTEGER (FK to User, Nullable for absolute anonymity logic if needed, but Constitution says we track for audit)
- `submittedAt`: DATETIME

### SurveyAnswer
- `id`: INTEGER (PK)
- `responseId`: INTEGER (FK to Response)
- `questionId`: INTEGER (FK to Question)
- `selectedOption`: TEXT (The text of the chosen option)

## Relationships

- **User -> Class**: Many students belong to one class. One teacher manages one or more classes.
- **Class -> DistributionPermission**: One-to-one mapping for class-wide sharing rights.
- **Survey -> Question**: One survey has many questions.
- **Survey -> Response**: One survey has many responses.
- **Response -> SurveyAnswer**: One response has many answers (one per question).

## Validation Rules

- A Survey must have `title` and at least one `Question`.
- Each `Question` must have `questionText` and at least 2 `options`.
- A User can only have one `Response` per `Survey`.
- Student users can only set `sharedWith...` flags that are enabled in their `DistributionPermission`.
