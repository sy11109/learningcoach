import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/utils";

interface SettingRow {
  setting_key: string;
  value: string;
}

export function getSettings(): Record<string, string> {
  const db = getDb();
  const rows = db
    .prepare("SELECT setting_key, value FROM app_settings")
    .all() as SettingRow[];
  return Object.fromEntries(rows.map((row) => [row.setting_key, row.value]));
}

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM app_settings WHERE setting_key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Write several settings at once. A null or empty value removes the key so
 * the environment-variable fallback can take over again.
 */
export function setSettings(
  entries: Record<string, string | null | undefined>,
): void {
  const db = getDb();
  const at = nowIso();
  const upsert = db.prepare(
    `INSERT INTO app_settings (setting_key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(setting_key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
  );
  const remove = db.prepare(
    "DELETE FROM app_settings WHERE setting_key = ?",
  );
  const write = db.transaction(() => {
    for (const [key, raw] of Object.entries(entries)) {
      const value = raw?.trim();
      if (!value) {
        remove.run(key);
      } else {
        upsert.run(key, value, at);
      }
    }
  });
  write();
}
