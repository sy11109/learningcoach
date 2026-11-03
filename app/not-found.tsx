import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
        <Compass size={22} />
      </span>
      <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-ink">
        这里没有学习项目
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        页面不存在，或者这个项目已经被删除。回到首页看看其它项目。
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
      >
        返回首页
      </Link>
    </div>
  );
}
