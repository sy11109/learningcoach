import { extractText } from "unpdf";
import { AppError } from "@/lib/errors";
import { SOURCE_MAX_BYTES } from "@/lib/source-files";

export const MAX_SOURCE_BYTES = SOURCE_MAX_BYTES;
export const MAX_SOURCE_CHARS = 400_000;

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "tsv",
]);

function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function sourceKind(name: string): "pdf" | "text" | null {
  const ext = extensionOf(name);
  if (ext === "pdf") return "pdf";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return null;
}

export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "资料";
  const cleaned = base.replace(/[\u0000-\u001f]/g, "").trim();
  return (cleaned || "资料").slice(0, 160);
}

function normalize(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_SOURCE_CHARS);
}

/**
 * Extract plain text from an uploaded learning source. PDFs go through
 * unpdf; text-like files are read directly. Scanned PDFs without a text
 * layer come back empty and are rejected with a readable message.
 */
export async function extractSourceText(file: File): Promise<{
  name: string;
  mime: string;
  text: string;
}> {
  if (file.size === 0) {
    throw new AppError("VALIDATION", "这个文件是空的。");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AppError(
      "VALIDATION",
      "单个文件不能超过 20MB，请拆分后再上传。",
    );
  }

  const name = safeFileName(file.name);
  const kind = sourceKind(name);
  if (!kind) {
    throw new AppError(
      "VALIDATION",
      "暂不支持这种文件格式。可以上传 .txt、.md、.csv、.json 或 .pdf。",
    );
  }

  let text = "";
  try {
    if (kind === "pdf") {
      const data = new Uint8Array(await file.arrayBuffer());
      const result = await extractText(data, { mergePages: true });
      text = result.text;
    } else {
      text = await file.text();
    }
  } catch (error) {
    console.error("[sources] extract failed", name, error);
    throw new AppError(
      "VALIDATION",
      `无法读取「${name}」。如果是扫描版 PDF，请先转成可复制文字的版本。`,
    );
  }

  const cleaned = normalize(text);
  if (cleaned.length < 20) {
    throw new AppError(
      "VALIDATION",
      `「${name}」里没有抽取到足够的文字。扫描版 PDF 需要先做 OCR。`,
    );
  }

  return {
    name,
    mime: file.type || (kind === "pdf" ? "application/pdf" : "text/plain"),
    text: cleaned,
  };
}
