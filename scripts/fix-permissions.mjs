import { Client, Databases, Storage, Permission, Role } from 'node-appwrite';
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

const ENDPOINT   = process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage   = new Storage(client);

async function fixPermissions() {
  try {
    console.log("Updating Certificates Collection permissions...");
    await databases.updateCollection(
      'gil-db', 
      'certificates',
      'Certificates',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );
    console.log("✅ Collection permissions updated!");

    console.log("Updating Certificates Bucket permissions...");
    await storage.updateBucket(
      'certificates',
      'Certificates',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );
    console.log("✅ Bucket permissions updated!");
  } catch (error) {
    console.error("❌ Failed to update permissions:", error);
  }
}

fixPermissions();
