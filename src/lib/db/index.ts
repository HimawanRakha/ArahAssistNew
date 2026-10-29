import "server-only";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Skema dibuat otomatis saat koneksi pertama, jadi cukup isi DATABASE_URL tanpa langkah migrasi.
const BOOTSTRAP = [
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS todo_items (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title text NOT NULL,
    scheduled_time timestamptz,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','acc','completed')),
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS notch_temp_files (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    todo_item_id uuid REFERENCES todo_items(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL,
    file_data text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS task_reminders (
    id uuid PRIMARY KEY,
    todo_item_id uuid NOT NULL UNIQUE REFERENCES todo_items(id) ON DELETE CASCADE,
    is_enabled boolean NOT NULL DEFAULT false,
    remind_at timestamptz,
    snooze_minutes integer,
    reminder_state text NOT NULL DEFAULT 'waiting' CHECK (reminder_state IN ('waiting','acc','snoozed'))
  )`,
  `CREATE INDEX IF NOT EXISTS todo_items_workspace_idx ON todo_items(workspace_id)`,
  `CREATE INDEX IF NOT EXISTS notch_temp_files_user_idx ON notch_temp_files(user_id)`,
];

const globalForDb = globalThis as unknown as { arahDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  let db: Db;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    db = drizzle(neon(url), { schema }) as unknown as Db;
  } else {
    // Tanpa DATABASE_URL: Postgres lokal berbasis file (PGlite) agar bisa dicoba tanpa Neon.
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite(process.env.PGLITE_DIR ?? "./.data/pglite");
    db = drizzle(client, { schema }) as unknown as Db;
    console.warn("[arah] DATABASE_URL kosong, memakai database lokal PGlite di ./.data/pglite");
  }

  for (const statement of BOOTSTRAP) {
    await db.execute(sql.raw(statement));
  }
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.arahDb) {
    globalForDb.arahDb = connect().catch((err) => {
      globalForDb.arahDb = undefined;
      throw err;
    });
  }
  return globalForDb.arahDb;
}

export { schema };
