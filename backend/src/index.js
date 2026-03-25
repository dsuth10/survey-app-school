require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const initDb = require('./db/init');
const authRoutes = require('./api/auth_routes');
const surveyRoutes = require('./api/survey_routes');
const classRoutes = require('./api/class_routes');
const adminRoutes = require('./api/admin_routes');
const analyticsRoutes = require('./api/analytics_routes');

const app = express();
const PORT = process.env.PORT || 3006;

// Initialize Database
initDb();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new SQLiteStore({
    db: 'survey.db',
    dir: path.resolve(__dirname, '../../')
  }),
  secret: process.env.SESSION_SECRET || 'survey-app-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../../frontend/dist');
  const indexHtml = path.join(distDir, 'index.html');
  app.use(express.static(distDir));

  // Express 5 / path-to-regexp v8 rejects app.get('*', ...). Fall through from
  // static to SPA index for client-side routes; leave /api/* to the default 404.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
