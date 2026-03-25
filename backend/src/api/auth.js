module.exports = {
  isAuthenticated: (req, res, next) => {
    if (req.session && req.session.userId) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  },

  isTeacher: (req, res, next) => {
    if (req.session && (req.session.role === 'teacher' || req.session.role === 'admin')) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden: Teachers only' });
  },

  isAdmin: (req, res, next) => {
    if (req.session && req.session.role === 'admin') {
      return next();
    }
    res.status(403).json({ error: 'Forbidden: Admins only' });
  }
};
