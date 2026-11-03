"use client";

import { useState, type FormEvent } from "react";
import { MessageSquareQuote, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";

export function ConceptForm({
  onCreate,
  pending,
  initialConcept = "",
}: {
  onCreate: (concept: string) => Promise<void>;
  pending: boolean;
  initialConcept?: string;
}) {
  const [concept, setConcept] = useState(initialConcept);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!concept.trim() || pending) return;
    await onCreate(concept.trim());
  }

  return (
    <Card>
      <CardHeader
        icon={<MessageSquareQuote size={15} />}
        title="开始一次费曼"
        description="选一个你说不太清的概念，AI 先讲，你再讲回去。"
      />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <Field label="要讲清的概念" htmlFor="feynman-concept" required>
          <Input
            id="feynman-concept"
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            placeholder="例如：闭包、数据库索引、复利、HTTP 缓存"
            maxLength={80}
            autoComplete="off"
          />
        </Field>

        <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-muted">
          <li>· AI 会用 12 岁孩子能听懂的话讲一遍，并留一个检查问题。</li>
          <li>· 然后轮到你复述，AI 会指出讲对、漏掉、混淆和假懂的地方。</li>
          <li>· 没通过就换一种讲法再来，直到真正讲清楚。</li>
        </ul>

        <Button
          type="submit"
          block
          loading={pending}
          disabled={!concept.trim()}
        >
          {!pending ? <Sparkles size={15} /> : null}
          让 AI 先讲一遍
        </Button>
      </form>
    </Card>
  );
}
