import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function nowIso() {
  return new Date().toISOString();
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** 0 → A, 1 → B, ...，用于选项编号。 */
export function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDay(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function relativeTime(iso: string) {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "—";
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return formatDay(iso);
}

export function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function stageFromScore(score: number): number {
  if (score >= 9) return 5;
  if (score >= 7.5) return 4;
  if (score >= 5.5) return 3;
  if (score >= 3.5) return 2;
  return 1;
}
