#!/usr/bin/env node
/**
 * GIL — Neon → Appwrite Data Migration Script
 * ─────────────────────────────────────────────────────────────────
 * Reads all certificates from Neon (PostgreSQL) and writes them
 * into your Appwrite database. Certificate files on disk are also
 * uploaded to the Appwrite storage bucket.
 *
 * Usage:
 *   node scripts/migrate-data.mjs
 *
 * Required env vars (add to .env or export):
 *   DATABASE_URL           — Neon PostgreSQL connection string
 *   APPWRITE_ENDPOINT      — e.g. https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID    — your Appwrite project ID
 *   APPWRITE_API_KEY       — an API key with databases + storage scopes
 *   APPWRITE_DATABASE_ID   — defaults to "gil-db"
 *   APPWRITE_BUCKET_ID     — defaults to "certificates"
 * ─────────────────────────────────────────────────────────────────
 */

import { Client, Databases, Storage, ID, Query } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ── Load .env ────────────────────────────────────────────────────
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

// ── Validate ─────────────────────────────────────────────────────
const {
  DATABASE_URL,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY,
  APPWRITE_DATABASE_ID = 'gil-db',
  APPWRITE_BUCKET_ID   = 'certificates',
} = process.env;

if (!DATABASE_URL || !APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error(
    '\n❌  Missing required env vars.\n' +
    '    Need: DATABASE_URL, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY\n'
  );
  process.exit(1);
}

const UPLOADS_DIR = resolve(process.cwd(), 'uploads');
const CERTS_TABLE = 'certificates';

// ── Appwrite client ───────────────────────────────────────────────
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);

// ── Postgres client ───────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 3 });

// ── Helpers ──────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function toAppwriteDate(val) {
  if (!val) return undefined;
  try { return new Date(val).toISOString(); } catch { return undefined; }
}

function stripUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}

// ── Main migration ────────────────────────────────────────────────
async function migrate() {
  console.log('\n🚀  GIL Data Migration: Neon → Appwrite\n');

  // Fetch all active certificates from Neon
  const { rows } = await pool.query(
    `SELECT * FROM certificates WHERE is_active = true ORDER BY report_date ASC`
  );

  console.log(`📦  Found ${rows.length} certificate(s) in Neon database.\n`);

  let migrated = 0;
  let skipped  = 0;
  let failed   = 0;

  for (const row of rows) {
    const reportNumber = row.report_number;
    process.stdout.write(`  → [${migrated + skipped + failed + 1}/${rows.length}] ${reportNumber} ... `);

    try {
      // Check if already exists in Appwrite
      const existing = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        CERTS_TABLE,
        [Query.equal('reportNumber', reportNumber), Query.limit(1)]
      );

      if (existing.total > 0) {
        console.log('skipped (already exists)');
        skipped++;
        continue;
      }

      // Upload file if it exists on disk
      let appwriteFileId = undefined;
      const localFilename = row.filename;
      if (localFilename) {
        const filePath = join(UPLOADS_DIR, localFilename);
        if (existsSync(filePath)) {
          const uploaded = await storage.createFile(
            APPWRITE_BUCKET_ID,
            ID.unique(),
            InputFile.fromPath(filePath, localFilename)
          );
          appwriteFileId = uploaded.$id;
        }
      }

      // Build document data — map snake_case Postgres columns to camelCase Appwrite attributes
      const docData = stripUndefined({
        reportNumber:      row.report_number,
        reportDate:        toAppwriteDate(row.report_date),
        shape:             row.shape,
        measurements:      row.measurements,
        caratWeight:       row.carat_weight?.toString(),
        colorGrade:        row.color_grade,
        clarityGrade:      row.clarity_grade,
        cutGrade:          row.cut_grade,
        polish:            row.polish,
        symmetry:          row.symmetry,
        fluorescence:      row.fluorescence,
        inscription:       row.inscription,
        comments:          row.comments,
        gemologistName:    row.gemologist_name,
        signatureDate:     toAppwriteDate(row.signature_date),
        referenceNumber:   row.reference_number,
        filename:          appwriteFileId || row.filename,
        gemImagePath:      row.gem_image_path,
        gemType:           row.gem_type,
        dimensions:        row.dimensions,
        treatment:         row.treatment,
        origin:            row.origin,
        certificationDate: row.certification_date,
        examinedBy:        row.examined_by,
        approvedBy:        row.approved_by,
        labLocation:       row.lab_location,
        equipmentUsed:     row.equipment_used,
        tablePercentage:   row.table_percentage,
        depthPercentage:   row.depth_percentage,
        crownAngle:        row.crown_angle,
        pavilionAngle:     row.pavilion_angle,
        girdleThickness:   row.girdle_thickness,
        culetSize:         row.culet_size,
        laserInscription:  row.laser_inscription,
        photoIncluded:     row.photo_included   ?? false,
        plotDiagram:       row.plot_diagram      ?? false,
        digitallySignedBy: row.digitally_signed_by ?? false,
        colorGradeDiagram: row.color_grade_diagram ?? false,
        clarityPlotDiagram: row.clarity_plot_diagram ?? false,
        certificateNotes:  row.certificate_notes,
        verifierUrl:       row.verifier_url || 'https://gilab.info/verify',
        proportionsDiagram: row.proportions_diagram,
        clarityDiagram1:   row.clarity_diagram1,
        clarityDiagram2:   row.clarity_diagram2,
        isActive:          true,
      });

      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        CERTS_TABLE,
        ID.unique(),
        docData
      );

      console.log(`✅  migrated${appwriteFileId ? ' (+ file)' : ''}`);
      migrated++;

      // Small rate-limit delay
      await sleep(150);

    } catch (err) {
      console.log(`❌  FAILED — ${err.message}`);
      failed++;
    }
  }

  await pool.end();

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Migration complete

  Migrated : ${migrated}
  Skipped  : ${skipped} (already in Appwrite)
  Failed   : ${failed}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (failed > 0) process.exit(1);
}

migrate().catch(err => {
  console.error('\n❌  Unhandled error:', err);
  process.exit(1);
});
