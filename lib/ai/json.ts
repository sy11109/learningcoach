/**
 * Best-effort JSON extraction for model output. DeepSeek's JSON mode is not a
 * hard guarantee — it can return fenced blocks, leading prose, or a truncated
 * object — so we extract the first balanced object/array before parsing.
 */
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function extractBalancedJson(raw: string): string | null {
  const text = stripCodeFences(raw);
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

export function tryParseJson(raw: string): unknown | undefined {
  const candidate = extractBalancedJson(raw) ?? stripCodeFences(raw);
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}
