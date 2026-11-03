"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Trash2 } from "lucide-react";
import { TestConnection } from "@/components/settings/TestConnection";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { errorMessage, putJson } from "@/lib/client";
import type { AiConfigState } from "@/lib/types";

export function AiSettingsForm({ initial }: { initial: AiConfigState }) {
  const router = useRouter();
  const toast = useToast();
  const [current, setCurrent] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const next = await putJson<AiConfigState>("/api/settings", {
        apiKey: apiKey.trim() || undefined,
        baseUrl,
        model,
      });
      setCurrent(next);
      setBaseUrl(next.baseUrl);
      setModel(next.model);
      setApiKey("");
      toast.success(
        next.configured
          ? "模型配置已保存，可以测试连接了。"
          : "配置已保存，但还没有 API Key。",
      );
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      const next = await putJson<AiConfigState>("/api/settings", {
        clearKey: true,
      });
      setCurrent(next);
      setApiKey("");
      toast.success("已清除保存的 API Key。");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <Field
        label="API Key"
        htmlFor="ai-api-key"
        hint={
          current.configured
            ? `已保存：${current.keyMasked ?? "••••"}`
            : "还没有保存"
        }
      >
        <Input
          id="ai-api-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder={
            current.configured
              ? "留空表示不修改；输入新 Key 会覆盖"
              : "sk-..."
          }
          autoComplete="off"
          spellCheck={false}
          maxLength={500}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="接口地址"
          htmlFor="ai-base-url"
          hint="DeepSeek 兼容接口"
        >
          <Input
            id="ai-base-url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.deepseek.com"
            maxLength={500}
            spellCheck={false}
          />
        </Field>

        <Field label="模型" htmlFor="ai-model" hint="可手动输入">
          <Input
            id="ai-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="deepseek-flash"
            maxLength={120}
            list="ai-model-options"
            spellCheck={false}
          />
          <datalist id="ai-model-options">
            <option value="deepseek-flash" />
            <option value="deepseek-v4-pro" />
          </datalist>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} loading={saving}>
          {!saving ? <Save size={15} /> : null}
          保存配置
        </Button>
        {current.configured ? (
          <ConfirmButton
            onConfirm={handleClear}
            confirmText="确认清除 Key？"
            loading={clearing}
          >
            <Trash2 size={14} />
            清除 Key
          </ConfirmButton>
        ) : null}
        <TestConnection />
      </div>

      <div className="flex gap-2.5 rounded-lg border border-line bg-paper/50 px-3.5 py-3">
        <KeyRound size={15} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[11.5px] leading-relaxed text-muted">
          Key 保存在本机 <code className="font-mono">data/app.db</code>，不会进入
          Git，也不会返回给浏览器明文。备份{" "}
          <code className="font-mono">data/</code> 时请把它当作含密钥的文件；换电脑时可以在新机器重新填写。
        </p>
      </div>
    </div>
  );
}
