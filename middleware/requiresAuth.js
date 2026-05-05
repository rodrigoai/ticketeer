const { jwtCheck } = require('../config/auth');

const requiresAuth = (req, res, next) => {
  jwtCheck(req, res, (err) => {
    if (err) {
      console.error('JWT Auth Error:', err.message);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid JWT token required',
        details: err.message
      });
    }

    next();
  });
};

module.exports = requiresAuth;
