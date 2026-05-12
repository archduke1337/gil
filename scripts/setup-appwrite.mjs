#!/usr/bin/env node
/**
 * GIL — Appwrite Setup Script
 * ─────────────────────────────────────────────────────────────────
 * Bootstraps the entire Appwrite project for the GIL platform:
 *   1. Creates the database
 *   2. Creates the certificates collection with all attributes & indexes
 *   3. Creates the storage bucket
 *   4. Creates the admin user (admin@gillab.info)
 *   5. Prints a summary of all created resource IDs
 *
 * Usage:
 *   node scripts/setup-appwrite.mjs
 *
 * Required env vars (create a .env file or export them):
 *   APPWRITE_ENDPOINT      — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID    — your Appwrite project ID
 *   APPWRITE_API_KEY       — an API key with all scopes
 *   ADMIN_EMAIL            — admin email (default: admin@gillab.info)
 *   ADMIN_PASSWORD         — admin password (default: jaishreeram)
 * ─────────────────────────────────────────────────────────────────
 */

import { Client, Databases, Storage, Users, ID, Permission, Role } from 'node-appwrite';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Load .env if present ─────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && !process.env[key]) {
      process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

// ── Validate required env vars ───────────────────────────────────
const ENDPOINT   = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    '\n❌  Missing required environment variables.\n' +
    '    Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY.\n'
  );
  process.exit(1);
}

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@gillab.info';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jaishreeram';

// ── Appwrite client (server SDK) ─────────────────────────────────
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);
const users     = new Users(client);

// ── Helpers ──────────────────────────────────────────────────────
const log  = (msg)   => console.log(`  ✅  ${msg}`);
const warn = (msg)   => console.warn(`  ⚠️   ${msg}`);
const step = (title) => console.log(`\n🔷  ${title}`);

async function safeCreate(label, fn) {
  try {
    const result = await fn();
    log(label);
    return result;
  } catch (err) {
    if (err?.code === 409) {
      warn(`${label} — already exists, skipping.`);
      return null;
    }
    throw err;
  }
}

// ── 1. Create Database ───────────────────────────────────────────
step('Creating database');
const DB_ID = 'gil-db';

await safeCreate(`Database: ${DB_ID}`, () =>
  databases.create(DB_ID, 'GIL Database', true)
);

// ── 2. Create Certificates Collection ───────────────────────────
step('Creating certificates collection');
const CERTS_ID = 'certificates';

await safeCreate(`Collection: ${CERTS_ID}`, () =>
  databases.createCollection(
    DB_ID,
    CERTS_ID,
    'Certificates',
    [Permission.read(Role.any())],   // public read
    false,  // documentSecurity — row-level off (table-level permissions used)
    true    // enabled
  )
);

// ── 3. Create Attributes ─────────────────────────────────────────
step('Creating attributes');

const VARCHAR = (key, size, required = false, defaultVal = null, array = false) =>
  safeCreate(`varchar: ${key}`, () =>
    databases.createStringAttribute(DB_ID, CERTS_ID, key, size, required, defaultVal, array)
  );

const BOOL = (key, required = false, defaultVal = false) =>
  safeCreate(`boolean: ${key}`, () =>
    databases.createBooleanAttribute(DB_ID, CERTS_ID, key, required, defaultVal)
  );

const DATETIME = (key, required = false) =>
  safeCreate(`datetime: ${key}`, () =>
    databases.createDatetimeAttribute(DB_ID, CERTS_ID, key, required)
  );

// Required core fields
await DATETIME('reportDate', true);
await VARCHAR('reportNumber',   100, true);
await VARCHAR('shape',          50,  true);
await VARCHAR('measurements',   200, true);
await VARCHAR('caratWeight',    20,  true);
await VARCHAR('colorGrade',     10,  true);
await VARCHAR('clarityGrade',   20,  true);
await VARCHAR('cutGrade',       20,  true);
await VARCHAR('polish',         20,  true);
await VARCHAR('symmetry',       20,  true);
await VARCHAR('fluorescence',   30,  true);
await VARCHAR('gemologistName', 100, true);
await DATETIME('signatureDate', true);

// Optional fields — small delay between batches to avoid attribute creation race conditions
await new Promise(r => setTimeout(r, 1500));

await VARCHAR('inscription',    200);
await VARCHAR('comments',       65535);
await VARCHAR('referenceNumber', 100);
await VARCHAR('filename',       200);
await VARCHAR('gemImagePath',   200);
await VARCHAR('gemType',        50,  false, 'Diamond');
await VARCHAR('dimensions',     200);
await VARCHAR('treatment',      100);
await VARCHAR('origin',         100);

await new Promise(r => setTimeout(r, 1500));

await VARCHAR('certificationDate', 50);
await VARCHAR('examinedBy',    100);
await VARCHAR('approvedBy',    100);
await VARCHAR('labLocation',   100);
await VARCHAR('equipmentUsed', 200);
await VARCHAR('tablePercentage', 20);
await VARCHAR('depthPercentage', 20);
await VARCHAR('crownAngle',    20);
await VARCHAR('pavilionAngle', 20);
await VARCHAR('girdleThickness', 50);
await VARCHAR('culetSize',     20);
await VARCHAR('laserInscription', 200);

await new Promise(r => setTimeout(r, 1500));

await BOOL('photoIncluded',       false, false);
await BOOL('plotDiagram',         false, false);
await BOOL('digitallySignedBy',   false, false);
await BOOL('colorGradeDiagram',   false, false);
await BOOL('clarityPlotDiagram',  false, false);
await BOOL('isActive',            false, true);

await VARCHAR('certificateNotes',   65535);
await VARCHAR('verifierUrl',        200, false, 'https://gilab.info/verify');
await VARCHAR('proportionsDiagram', 65535);
await VARCHAR('clarityDiagram1',    65535);
await VARCHAR('clarityDiagram2',    65535);

// ── 4. Create Indexes ────────────────────────────────────────────
step('Creating indexes');
await new Promise(r => setTimeout(r, 2000)); // wait for attributes to be ready

await safeCreate('index: reportNumber (unique)', () =>
  databases.createIndex(DB_ID, CERTS_ID, 'idx_reportNumber', 'unique', ['reportNumber'])
);

await safeCreate('index: referenceNumber', () =>
  databases.createIndex(DB_ID, CERTS_ID, 'idx_referenceNumber', 'key', ['referenceNumber'])
);

await safeCreate('index: isActive', () =>
  databases.createIndex(DB_ID, CERTS_ID, 'idx_isActive', 'key', ['isActive'])
);

await safeCreate('index: reportDate', () =>
  databases.createIndex(DB_ID, CERTS_ID, 'idx_reportDate', 'key', ['reportDate'])
);

// ── 5. Create Storage Bucket ─────────────────────────────────────
step('Creating storage bucket');
const BUCKET_ID = 'certificates';

await safeCreate(`Bucket: ${BUCKET_ID}`, () =>
  storage.createBucket(
    BUCKET_ID,
    'Certificates',
    [
      Permission.read(Role.any()),
    ],
    false,           // fileSecurity
    true,            // enabled
    52_428_800,      // maximumFileSize: 50 MB
    ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    'none',          // compression
    false,           // encryption
    false            // antivirus
  )
);

// ── 6. Create Admin User ─────────────────────────────────────────
step('Creating admin user');

await safeCreate(`Admin user: ${ADMIN_EMAIL}`, () =>
  users.create(ID.unique(), ADMIN_EMAIL, undefined, ADMIN_PASSWORD, 'GIL Admin')
);

// ── Summary ──────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉  Appwrite setup complete!

  Endpoint:    ${ENDPOINT}
  Project ID:  ${PROJECT_ID}
  Database ID: ${DB_ID}
  Collection:  ${CERTS_ID}
  Bucket ID:   ${BUCKET_ID}
  Admin email: ${ADMIN_EMAIL}

Next steps:
  1. Copy these IDs into your .env file:
       VITE_APPWRITE_ENDPOINT=${ENDPOINT}
       VITE_APPWRITE_PROJECT_ID=${PROJECT_ID}
       VITE_APPWRITE_DATABASE_ID=${DB_ID}
       VITE_APPWRITE_BUCKET_ID=${BUCKET_ID}

  2. Run the data migration (if you have existing Neon data):
       node scripts/migrate-data.mjs

  3. Deploy Appwrite Functions:
       appwrite push functions --all

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
