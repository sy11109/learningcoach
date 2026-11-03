"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, postJson } from "@/lib/client";

interface ConnectionTestResult {
  ok: true;
  model: string;
  models: string[];
  latencyMs: number;
  thinking: boolean;
}

export function TestConnection() {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);

  async function handleTest() {
    setTesting(true);
    setResult(null);
    try {
      const res = await postJson<ConnectionTestResult>("/api/settings/test");
      setResult(res);
      toast.success("连接成功，AI 功能可以正常使用。");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={handleTest} loading={testing}>
          {!testing ? <PlugZap size={15} /> : null}
          测试连接
        </Button>
        {testing ? (
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Loader2 size={12} className="animate-spin" />
            正在请求 DeepSeek…
          </span>
        ) : null}
      </div>

      {result ? (
        <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent-soft/60 px-3.5 py-3">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent" />
          <div className="text-[11.5px] leading-relaxed text-ink-soft">
            <p className="font-medium">连接正常</p>
            <p className="mt-0.5 text-muted">
              模型 {result.model} · 延迟约 {result.latencyMs}ms · 思考模式
              {result.thinking ? "开启" : "关闭"}
            </p>
            {result.models.length > 0 ? (
              <p className="mt-1 text-[10.5px] text-muted">
                账户可用模型：{result.models.slice(0, 8).join("、")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
