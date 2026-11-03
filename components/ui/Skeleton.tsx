import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-paper-deep", className)}
      aria-hidden
    />
  );
}

export function CardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={index % 3 === 2 ? "h-3 w-4/5" : "h-3"}
          />
        ))}
      </div>
    </div>
  );
}
