/**
 * BACKEND URL UTILITY
 * Configures the connection to the specialized Express administrative service.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

// Port 4000 is used for specialized admin tasks as per project specs.
const DEV_URL = 'http://localhost:4000';
const PROD_URL = 'https://api.wexls.education'; // Placeholder for production

export const backendUrl = (path = '') => {
  const base = IS_PROD ? PROD_URL : DEV_URL;
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
