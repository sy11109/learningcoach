import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

function renderInline(text: string): ReactNode[] {
  return text
    .split(INLINE_PATTERN)
    .filter(Boolean)
    .map((part, index) => {
      if (
        part.startsWith("**") &&
        part.endsWith("**") &&
        part.length > 4
      ) {
        return (
          <strong
            key={index}
            className="rounded-[3px] bg-amber-soft/80 px-0.5 font-semibold text-ink"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code
            key={index}
            className="rounded bg-paper-deep px-1 py-0.5 font-mono text-[0.9em] text-accent-deep"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  if (lines.every((line) => /^[-*•]\s+/.test(line))) {
    return (
      <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-accent/70">
        {lines.map((line, index) => (
          <li key={index}>
            {renderInline(line.replace(/^[-*•]\s+/, ""))}
          </li>
        ))}
      </ul>
    );
  }

  if (lines.every((line) => /^\d+[.、)]\s+/.test(line))) {
    return (
      <ol
        key={key}
        className="list-decimal space-y-1.5 pl-5 marker:text-accent/70"
      >
        {lines.map((line, index) => (
          <li key={index}>
            {renderInline(line.replace(/^\d+[.、)]\s+/, ""))}
          </li>
        ))}
      </ol>
    );
  }

  if (lines.length === 1 && /^#{2,4}\s+/.test(lines[0])) {
    return (
      <h4 key={key} className="pt-1 text-[14px] font-semibold text-ink">
        {renderInline(lines[0].replace(/^#{2,4}\s+/, ""))}
      </h4>
    );
  }

  return (
    <p key={key}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {index > 0 ? <br /> : null}
          {renderInline(line)}
        </Fragment>
      ))}
    </p>
  );
}

export function InlineText({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div
      className={cn(
        "space-y-3 text-[13.5px] leading-[1.9] text-ink-soft",
        className,
      )}
    >
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}
