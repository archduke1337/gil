/**
 * Appwrite SDK client — browser-side
 * All env vars are VITE_ prefixed and baked in at build time.
 */
import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

// ── Client ────────────────────────────────────────────────────────────────────
export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT as string)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID as string);

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);

// ── Resource IDs (read from env) ─────────────────────────────────────────────
export const DB_ID     = import.meta.env.VITE_APPWRITE_DATABASE_ID as string;
export const TABLE_ID  = 'certificates';
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID as string;

// Re-export helpers so callers don't need to import from 'appwrite' directly
export { ID, Query };
