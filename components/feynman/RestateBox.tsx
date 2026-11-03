"use client";

import { useState } from "react";
import { PenLine, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

export function RestateBox({
  onSubmit,
  pending,
}: {
  onSubmit: (text: string) => Promise<boolean>;
  pending: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (value.trim().length < 10) {
      setError("再写多一点：先用一句话说它是什么，再举一个生活里的例子。");
      return;
    }
    setError("");
    const ok = await onSubmit(value.trim());
    if (ok) setValue("");
  }

  return (
    <div className="rounded-card border border-accent/25 bg-accent-soft/35 p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">
          <PenLine size={13} />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-ink">轮到你了</p>
          <p className="text-[10.5px] text-muted">
            把上面的讲解盖住，用你自己的话讲一遍
          </p>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError("");
        }}
        onKeyDown={(event) => {
          if (
            (event.metaKey || event.ctrlKey) &&
            event.key === "Enter" &&
            !pending
          ) {
            event.preventDefault();
            void submit();
          }
        }}
        rows={5}
        maxLength={4000}
        placeholder="它是什么？为什么是这样？举一个 12 岁孩子也能听懂的例子。哪里容易搞混？"
        className="mt-3 bg-surface"
      />

      {error ? (
        <p className="mt-1.5 text-[11.5px] text-danger">{error}</p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10.5px] text-muted">
          不用术语堆砌，讲不清就说明还没懂 · Ctrl / ⌘ + Enter 提交
        </p>
        <Button size="sm" onClick={submit} loading={pending}>
          {!pending ? <Send size={13} /> : null}
          提交复述
        </Button>
      </div>
    </div>
  );
}
