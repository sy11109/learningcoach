import path from "node:path";
import {
  BookOpenCheck,
  Database,
  KeyRound,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { AiSettingsForm } from "@/components/settings/AiSettingsForm";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { getAiConfigState } from "@/lib/ai/client";
import { STAGE_META, type Stage } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGES: Stage[] = [1, 2, 3, 4, 5];

function InfoRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-paper/40 px-3.5 py-2.5">
      <p className="text-[10.5px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 break-all text-[12.5px] font-medium text-ink-soft",
          tone,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const ai = getAiConfigState();
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "app.db");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-ink">
          设置
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          模型连接、数据位置，以及这个系统背后的学习方法。
        </p>
      </div>

      <Card>
        <CardHeader
          icon={<PlugZap size={15} />}
          title="模型连接"
          description="本应用只使用 DeepSeek 的 OpenAI 兼容接口。"
          action={
            <Badge tone={ai.configured ? "accent" : "danger"}>
              {ai.configured
                ? ai.source === "settings"
                  ? "已保存"
                  : "已配置（环境变量）"
                : "未配置"}
            </Badge>
          }
        />

        <AiSettingsForm initial={ai} />
      </Card>

      <Card>
        <CardHeader
          icon={<KeyRound size={15} />}
          title="环境变量（可选）"
          description="Key、地址、模型以设置页为准；环境变量只在对应项为空时兜底。修改环境变量后需要重启。"
        />
        <div className="px-5 py-4">
          <pre className="overflow-x-auto rounded-lg border border-line bg-paper px-3.5 py-3 font-mono text-[11px] leading-relaxed text-ink-soft">
{`DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
DEEPSEEK_THINKING=disabled
DEEPSEEK_REASONING_EFFORT=low`}
          </pre>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
            API Key 推荐在设置页填写。更强的模型可以改成{" "}
            <code className="font-mono">deepseek-v4-pro</code>
            ，成本更高、速度更慢。开启思考模式后，结构化输出的稳定性会更好，但首字会明显变慢。
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<Database size={15} />}
          title="数据与备份"
          description="所有学习记录只保存在这台机器上。"
        />
        <div className="space-y-2.5 px-5 py-4">
          <InfoRow label="数据库文件" value={dbPath} />
          <p className="text-[11.5px] leading-relaxed text-muted">
            备份方式：停止开发服务器后，复制上面这个{" "}
            <code className="font-mono">.db</code>{" "}
            文件即可。恢复时把它放回原位置。数据库里也保存着 API Key，备份文件请按敏感文件保管。删除项目会级联删除它的阶梯、考试和费曼记录。
          </p>
          <div className="flex gap-2.5 rounded-lg border border-line bg-paper/50 px-3.5 py-3">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" />
            <p className="text-[11.5px] leading-relaxed text-muted">
              这个应用没有登录和多用户隔离，只适合在本机使用。不要把开发服务器直接暴露到公网。
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<BookOpenCheck size={15} />}
          title="方法与阶段"
          description="六步闭环学习法 · 五阶段能力地图"
        />
        <div className="space-y-3 px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            {[
              "学习阶梯",
              "学习内容",
              "筛选资源",
              "核心 20%",
              "AI 考官",
              "速查表",
              "费曼反馈",
            ].map((step, index) => {
              const ready = [0, 1, 4, 6].includes(index);
              return (
                <span
                  key={step}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                    ready
                      ? "border-accent/25 bg-accent-soft text-accent-deep"
                      : "border-line-strong text-muted",
                  )}
                >
                  <span className="tabular text-[9px] opacity-60">
                    {index + 1}
                  </span>
                  {step}
                  {ready ? (
                    <span className="text-[9px] opacity-70">已实现</span>
                  ) : null}
                </span>
              );
            })}
          </div>

          <ul className="space-y-1.5">
            {STAGES.map((stage) => {
              const meta = STAGE_META[stage];
              return (
                <li
                  key={stage}
                  className="flex items-center gap-2.5 rounded-lg border border-line/80 bg-paper/40 px-3 py-2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="w-24 shrink-0 text-[11.5px] font-medium text-ink-soft">
                    {meta.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {meta.tagline}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] leading-relaxed text-muted">
            已实现学习阶梯、学习内容、AI 考官、错题回顾和费曼反馈；筛选资源、
            核心 20% 与速查表会在后续版本补齐。学习内容按阶段生成，会在定位之后、
            考试之前进入。
          </p>
        </div>
      </Card>
    </div>
  );
}
