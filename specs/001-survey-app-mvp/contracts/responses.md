# API Contract: Responses

## POST /api/surveys/:id/responses
Submit a response to a survey.

### Request Body
```json
{
  "answers": [
    {
      "questionId": 10,
      "selectedOption": "Great"
    }
  ]
}
```

### Response (201 Created)
```json
{ "message": "Response submitted successfully" }
```

### Response (409 Conflict)
```json
{ "error": "You have already completed this survey" }
```

## GET /api/user/responses
List all surveys the current user has completed.

### Response (200 OK)
```json
[
  {
    "surveyId": 1,
    "submittedAt": "2026-01-08T12:00:00Z"
  }
]
```
