const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config();

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'novamoney.us.auth0.com';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'https://ticket.nova.money';

const jwtCheck = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

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

    // Normalize user for internal use but keep req.auth for compatibility with existing code
    req.user = {
      id: req.auth?.payload?.sub || req.auth?.sub,
      email: req.auth?.payload?.email || req.auth?.email,
      name: req.auth?.payload?.name || req.auth?.name,
      picture: req.auth?.payload?.picture || req.auth?.picture,
      scope: req.auth?.scope
    };

    next();
  });
};

module.exports = {
  requiresAuth,
  AUTH0_DOMAIN,
  AUTH0_AUDIENCE
};
