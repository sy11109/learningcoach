export const SOURCE_MAX_BYTES = 20 * 1024 * 1024;

export const SOURCE_ACCEPT = ".txt,.md,.markdown,.csv,.json,.tsv,.pdf";

const SOURCE_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "tsv",
  "pdf",
]);

export function sourceFileProblem(file: File): string | null {
  if (file.size === 0) return "文件是空的";
  if (file.size > SOURCE_MAX_BYTES) return "超过 20MB";
  const index = file.name.lastIndexOf(".");
  const ext = index >= 0 ? file.name.slice(index + 1).toLowerCase() : "";
  if (!SOURCE_EXTENSIONS.has(ext)) return "格式不支持";
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
