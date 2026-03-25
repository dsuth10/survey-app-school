# Quickstart: Survey App MVP

Follow these steps to set up and run the Survey App on your local machine or school LAN.

## Prerequisites
- **Node.js**: Version 18 or higher.
- **Git**: For cloning the repository.

## Installation

1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd Survey
   ```

2. **Install dependencies**:
   ```bash
   # In the root directory
   npm install
   ```

3. **Database Setup**:
   The SQLite database (`survey.db`) will be automatically created and initialized with the required schema on the first run.

## Running the Application

### Development Mode
Runs the frontend and backend concurrently with hot-reloading.
```bash
npm run dev
```
- **Frontend**: http://localhost:3005
- **Backend**: http://localhost:3006

### Production Mode (LAN Deployment)
Serves the optimized React build from the Express server.
```bash
npm start
```
- Access via: `http://[your-ip-address]:3005`

## Testing

Run the full test suite (Backend + Frontend):
```bash
npm test
```

For specific projects:
```bash
# Backend only
cd backend && npm test

# Frontend only
cd frontend && npm test
```

## Troubleshooting
- **Port conflicts**: Ensure ports 3005 and 3006 are not in use.
- **Database access**: Ensure the application has write permissions in the root directory.
- **LAN access**: Check Windows Firewall settings to allow incoming connections on port 3005.
