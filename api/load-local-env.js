/**
 * Load .env.local into process.env for local `vercel dev` when vars
 * are not already injected. Never logs secret values.
 */
const fs = require('fs');
const path = require('path');

function loadLocalEnv() {
  if (process.env.GEMINI_API_KEY) return;
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(__dirname, '..', '.env.local'),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        if (!line || /^\s*#/.test(line)) continue;
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        if (process.env[key]) continue;
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
      break;
    } catch {
      // ignore missing/unreadable local env
    }
  }
}

module.exports = { loadLocalEnv };
