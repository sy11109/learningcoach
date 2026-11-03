"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";

export function ConfirmButton({
  onConfirm,
  children,
  confirmText = "确认执行？",
  resetAfter = 4000,
  variant = "secondary",
  ...props
}: Omit<ButtonProps, "onClick"> & {
  onConfirm: () => void;
  confirmText?: string;
  resetAfter?: number;
  children: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <Button
      {...props}
      variant={armed ? "danger" : variant}
      onClick={() => {
        if (timer.current) window.clearTimeout(timer.current);
        if (armed) {
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), resetAfter);
      }}
    >
      {armed ? confirmText : children}
    </Button>
  );
}
