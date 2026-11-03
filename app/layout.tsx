import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Settings2 } from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "学习教练 · 把想学的真正学会",
  description:
    "基于六步闭环学习法与五阶段能力地图的 AI 学习工作台：学习阶梯、AI 考官、费曼反馈。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>
          <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-lg text-ink"
              >
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-white shadow-sm">
                  <BookOpenCheck size={17} strokeWidth={2.2} />
                </span>
                <span className="text-[15px] font-semibold tracking-tight">
                  学习教练
                </span>
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  我的项目
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-paper-deep hover:text-ink"
                >
                  <Settings2 size={15} />
                  设置
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8">
            {children}
          </main>
          <footer className="border-t border-line/70 py-6">
            <p className="mx-auto max-w-6xl px-5 text-xs text-muted">
              六步闭环学习法 · 五阶段能力地图 · 数据只保存在这台机器的
              SQLite 里
            </p>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
