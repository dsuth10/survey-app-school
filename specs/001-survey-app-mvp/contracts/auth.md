# API Contract: Authentication

## POST /api/auth/login
Authenticates a user and starts a session.

### Request Body
```json
{
  "username": "jdoe",
  "password": "password123"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": 1,
    "username": "jdoe",
    "displayName": "John Doe",
    "role": "student",
    "classId": 101,
    "yearLevel": "9"
  }
}
```

## POST /api/auth/logout
Destroys the current session.

### Response (200 OK)
```json
{ "message": "Logged out" }
```

## GET /api/auth/user
Gets information about the currently logged-in user.

### Response (200 OK)
```json
{
  "user": {
    "id": 1,
    "username": "jdoe",
    "displayName": "John Doe",
    "role": "student",
    "classId": 101,
    "yearLevel": "9"
  }
}
```
### Response (401 Unauthorized)
```json
{ "error": "Not authenticated" }
```
