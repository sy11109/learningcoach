"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { useToast } from "@/components/ui/Toast";
import { apiRequest, errorMessage } from "@/lib/client";

export function DeleteProjectButton({
  projectId,
  topic,
}: {
  projectId: string;
  topic: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiRequest(`/api/projects/${projectId}`, { method: "DELETE" });
      toast.success(`已删除「${topic}」。`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
    }
  }

  return (
    <ConfirmButton
      onConfirm={handleDelete}
      confirmText="确认删除？"
      resetAfter={5000}
      variant="ghost"
      size="sm"
      loading={deleting}
      className="h-7 gap-1 px-2 text-[11px] text-muted hover:text-danger"
      title="删除项目会一并删除它的阶梯、学习内容、考试和费曼记录"
    >
      <Trash2 size={11} />
      删除
    </ConfirmButton>
  );
}
