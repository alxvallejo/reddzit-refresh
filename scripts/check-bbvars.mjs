#!/usr/bin/env node
// Minimal Bitbucket variables checker using Access Token (BB_TOKEN)
// Requires: Node 18+ (built-in fetch)

const REQUIRED_KEYS = [
  'VITE_REDDIT_CLIENT_ID',
  'VITE_REDDIT_REDIRECT_URI',
  'VITE_READ_API_BASE',
];

import fs from 'node:fs';
import path from 'node:path';

// Simple .env loader (no external deps)
function parseEnv(contents) {
  const out = {};
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadEnvFile(envFile) {
  const p = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(p)) return {};
  try {
    const data = fs.readFileSync(p, 'utf8');
    return parseEnv(data);
  } catch {
    return {};
  }
}

// Allow --env-file=path or ENV_FILE to specify a custom env file
const argFile = (process.argv.find(a => a.startsWith('--env-file=')) || '').split('=')[1];
const ENV_FILE = argFile || process.env.ENV_FILE || '.env';

// Load envs into process.env only if not already set
const loaded = { ...loadEnvFile(ENV_FILE) };
// Also try .env.local as a secondary overlay
const loadedLocal = { ...loadEnvFile('.env.local') };
for (const [k, v] of Object.entries({ ...loaded, ...loadedLocal })) {
  if (process.env[k] == null) process.env[k] = v;
}

let BB_TOKEN = process.env.BB_TOKEN;
const WORKSPACE = process.env.WORKSPACE || process.env.BB_WORKSPACE;
const REPO = process.env.REPO || process.env.BB_REPO;
const BB_CLIENT_ID = process.env.BB_CLIENT_ID;
const BB_CLIENT_SECRET = process.env.BB_CLIENT_SECRET;

function fail(msg, code = 1) {
  console.error(`Error: ${msg}`);
  process.exit(code);
}

function assertEnv() {
  const missing = [];
  if (!BB_TOKEN) missing.push('BB_TOKEN');
  if (!WORKSPACE) missing.push('WORKSPACE');
  if (!REPO) missing.push('REPO');
  if (missing.length) {
    console.error('Missing environment variables:', missing.join(', '));
    console.error('Export them, for example:');
    console.error('  export BB_TOKEN=...');
    console.error('  export WORKSPACE=alxvallejo');
    console.error('  export REPO=reddzit-refresh');
    console.error('Or provide a .env file containing: BB_TOKEN=..., WORKSPACE=..., REPO=...');
    process.exit(2);
  }
}

async function obtainOAuthToken() {
  if (!BB_CLIENT_ID || !BB_CLIENT_SECRET) return null;
  const basic = Buffer.from(`${BB_CLIENT_ID}:${BB_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://bitbucket.org/site/oauth2/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    // Basic auth header
    // Node fetch supports username/password via URL; use manual header for clarity
    // btoa not available in Node by default, so build header ourselves
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!data || !data.access_token) return null;
  return data.access_token;
}

async function getBearerTokenOrFail(prefPathForError) {
  // Use provided BB_TOKEN if exists
  if (BB_TOKEN) return BB_TOKEN;
  // Otherwise try OAuth client credentials
  const t = await obtainOAuthToken();
  if (t) {
    BB_TOKEN = t;
    return BB_TOKEN;
  }
  fail('No usable token. Provide BB_TOKEN or BB_CLIENT_ID/BB_CLIENT_SECRET.');
}

async function bbGet(path) {
  const token = await getBearerTokenOrFail(path);
  const url = `https://api.bitbucket.org/2.0${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} for ${path}: ${text}`);
    err.status = res.status;
    err.path = path;
    throw err;
  }
  return res.json();
}

async function getRepoVariables() {
  const j = await bbGet(`/repositories/${WORKSPACE}/${REPO}/pipelines_config/variables/`);
  return Array.isArray(j.values) ? j.values : [];
}

async function getEnvironments() {
  try {
    const j = await bbGet(`/repositories/${WORKSPACE}/${REPO}/deployments_config/environments/`);
    return Array.isArray(j.values) ? j.values : [];
  } catch (e) {
    if (e && (e.status === 401 || e.status === 403)) {
      console.warn('Warning: cannot access deployment environments with this token (missing scope or unsupported).');
      return null; // indicate not available
    }
    throw e;
  }
}

async function getEnvVariables(envUuid) {
  const j = await bbGet(`/repositories/${WORKSPACE}/${REPO}/deployments_config/environments/${envUuid}/variables`);
  return Array.isArray(j.values) ? j.values : [];
}

function pickProduction(envs) {
  // Prefer environment_type == production; fallback to name containing 'prod'
  let prod = envs.find(e => (e.environment_type || e.type || '').toString().toLowerCase() === 'production');
  if (!prod) prod = envs.find(e => (e.name || '').toString().toLowerCase().includes('prod'));
  return prod;
}

function indexByKey(arr) {
  const out = new Map();
  for (const v of arr) {
    if (!v || !v.key) continue;
    out.set(v.key, v);
  }
  return out;
}

(async () => {
  assertEnv();
  console.log(`Checking Bitbucket variables for ${WORKSPACE}/${REPO} ...`);

  const repoVars = await getRepoVariables();
  const envs = await getEnvironments();

  let prod = null;
  let prodVars = [];
  if (envs === null) {
    console.log('Proceeding without deployment variables (checking repository variables only).');
  } else {
    prod = pickProduction(envs);
    if (!prod) fail('Could not find a Production deployment environment. Create one in Bitbucket → Deployments.');
    prodVars = await getEnvVariables(prod.uuid);
  }

  const repoIdx = indexByKey(repoVars);
  const prodIdx = indexByKey(prodVars);

  if (prod) {
    console.log(`Production environment: ${prod.name} (${prod.uuid})`);
    console.log('');
  }

  let missing = 0;
  for (const key of REQUIRED_KEYS) {
    const inProd = prodIdx.get(key);
    const inRepo = repoIdx.get(key);
    if (inProd) {
      const secured = inProd.secured === true ? 'secured' : 'plain';
      const valueShown = inProd.value ?? '<secured>';
      console.log(`${key}: PRESENT (deployment) [${secured}] value=${valueShown}`);
    } else if (inRepo) {
      const secured = inRepo.secured === true ? 'secured' : 'plain';
      const valueShown = inRepo.value ?? '<secured>';
      console.log(`${key}: PRESENT (repository) [${secured}] value=${valueShown}`);
    } else {
      console.log(`${key}: MISSING`);
      missing++;
    }
  }

  console.log('');
  if (missing) {
    console.log(`❌ ${missing} required variable(s) missing.`);
    if (envs === null) {
      console.log('Set them under: Repository Settings → Pipelines → Repository variables (or Deployment variables if available)');
    } else {
      console.log('Set them under: Repository Settings → Pipelines → Deployment variables (production)');
    }
    process.exit(1);
  } else {
    console.log('✅ All required variables are present (repo or production).');
  }
})();
