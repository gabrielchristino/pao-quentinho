const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL || process.env.NG_APP_API_URL || 'http://localhost:3000/api';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

const content = `window.__env = window.__env || {};
window.__env.API_URL = '${apiUrl.replace(/'/g, "\\'")}';
window.__env.FRONTEND_URL = '${frontendUrl.replace(/'/g, "\\'")}';
`;

const outPath = path.join(__dirname, '..', 'src', 'assets', 'env.js');
fs.writeFileSync(outPath, content, { encoding: 'utf8' });
console.log('[generate-env] Wrote', outPath);
