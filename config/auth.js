const { auth } = require('express-oauth2-jwt-bearer');

const getRequiredEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const AUTH0_DOMAIN = getRequiredEnv('AUTH0_DOMAIN');
const AUTH0_AUDIENCE = getRequiredEnv('AUTH0_AUDIENCE');

const jwtCheck = auth({
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

module.exports = {
  AUTH0_DOMAIN,
  AUTH0_AUDIENCE,
  jwtCheck
};
