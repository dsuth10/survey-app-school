# Survey App MVP

A LAN-first survey application for schools, enabling teachers and students to create, distribute, and respond to surveys.

## Features
- **Survey Creation**: Create surveys with multiple-choice questions.
- **Role-Based Distribution**: Control who can see surveys (Class, Year Level, or School).
- **Anonymous Responses**: Support for both anonymous and identified surveys.
- **Results Dashboard**: View aggregated results with automated privacy masking.
- **Class Management**: Teachers can manage sharing permissions for their classes.

## Tech Stack
- **Frontend**: React (Vite)
- **Backend**: Node.js (Express)
- **Database**: SQLite (better-sqlite3)
- **Session**: express-session with connect-sqlite3

## LAN Deployment Instructions

To run this application on a local school network:

### 1. Prerequisites
- Node.js (v18+) installed on the host machine.
- All devices must be on the same local network (LAN).

### 2. Setup
Clone the repository and install dependencies in the root, backend, and frontend directories:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 3. Database Initialization
Run the initialization script in the backend:
```bash
cd backend
node src/db/init.js
```

### 4. Running the Application
From the root directory, you can run both the frontend and backend concurrently:
```bash
npm run dev
```

### 5. Accessing from Other Devices
To access the app from other machines on the LAN:
1. Find the host machine's local IP address (e.g., `192.168.1.50`).
   - Windows: `ipconfig`
   - Linux/Mac: `ifconfig` or `ip addr`
2. Open a browser on the other device and navigate to:
   - `http://<HOST_IP>:3005`

### 6. Production Build (Recommended for actual use)
For better performance, build the frontend and serve it through the backend:
1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. The backend is configured to serve the production build (ensure the static path is correct in `backend/src/index.js`).

## Ports
- **Frontend**: 3005
- **Backend**: 3006

## Security Note
This application is designed for internal LAN use and does not use HTTPS by default. Do not expose it to the public internet without additional security measures (e.g., a reverse proxy with SSL).
