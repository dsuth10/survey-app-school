# API Contract: Surveys

## GET /api/surveys
List all surveys visible to the logged-in user.

### Response (200 OK)
```json
[
  {
    "id": 1,
    "title": "School Lunch Feedback",
    "description": "Tell us what you think!",
    "creatorName": "Mr. Smith",
    "isAnonymous": true,
    "createdAt": "2026-01-08T10:00:00Z",
    "hasResponded": false
  }
]
```

## POST /api/surveys
Create a new survey.

### Request Body
```json
{
  "title": "My Survey",
  "description": "Description",
  "isAnonymous": false,
  "sharedWithClass": true,
  "sharedWithYearLevel": false,
  "sharedWithSchool": false,
  "questions": [
    {
      "questionText": "What is your favorite color?",
      "type": "multipleChoice",
      "options": ["Red", "Blue", "Green"],
      "isRequired": true
    }
  ]
}
```

### Response (201 Created)
```json
{ "id": 5, "message": "Survey created successfully" }
```

## GET /api/surveys/:id
Get full details of a survey, including questions.

### Response (200 OK)
```json
{
  "id": 1,
  "title": "School Lunch Feedback",
  "questions": [
    {
      "id": 10,
      "questionText": "Rate the pasta",
      "options": ["Great", "OK", "Bad"],
      "isRequired": true
    }
  ]
}
```

## GET /api/surveys/:id/results
Get aggregated results for a survey.

### Response (200 OK)
```json
{
  "surveyId": 1,
  "totalResponses": 100,
  "results": [
    {
      "questionId": 10,
      "questionText": "Rate the pasta",
      "counts": { "Great": 40, "OK": 50, "Bad": 10 }
    }
  ]
}
```
