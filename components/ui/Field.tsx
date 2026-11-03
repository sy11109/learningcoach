import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-[10px] border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[inset_0_1px_2px_rgba(25,25,25,0.02)] transition-colors placeholder:text-muted/55 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/12 disabled:cursor-not-allowed disabled:bg-paper disabled:opacity-70";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline justify-between gap-3 text-[13px] font-medium text-ink-soft"
      >
        <span>
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          ) : null}
        </span>
        {hint ? (
          <span className="text-[11px] font-normal text-muted">{hint}</span>
        ) : null}
      </label>
      {children}
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClass, "min-h-[84px] leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldClass, "appearance-none pr-8", className)}
      {...props}
    />
  );
}
