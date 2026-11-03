import { getDb } from "@/lib/db";
import { nowIso } from "@/lib/utils";

export interface AiCallRecord {
  projectId?: string | null;
  kind: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}

export function recordAiCall(record: AiCallRecord) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO ai_calls
        (id, project_id, kind, model, prompt_tokens, completion_tokens, latency_ms, ok, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      record.projectId ?? null,
      record.kind,
      record.model,
      record.promptTokens ?? null,
      record.completionTokens ?? null,
      record.latencyMs,
      record.ok ? 1 : 0,
      record.error ?? null,
      nowIso(),
    );
  } catch (error) {
    // Never let telemetry break a learning session.
    console.error("[ai_calls] failed to record", error);
  }
}
