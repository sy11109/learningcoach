import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "soft" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-deep disabled:hover:bg-accent",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-paper-deep/60",
  ghost: "text-muted hover:bg-paper-deep hover:text-ink",
  soft: "bg-accent-soft text-accent-deep hover:bg-[#d8ebe2]",
  danger: "bg-danger text-white hover:bg-[#961d14]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-[10px] px-4 text-sm",
  lg: "h-11 gap-2 rounded-[10px] px-5 text-[15px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : null}
      {children}
    </button>
  );
}
