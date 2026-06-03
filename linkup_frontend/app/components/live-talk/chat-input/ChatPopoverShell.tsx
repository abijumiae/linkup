"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ChatPopoverShellProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  label: string;
  children: ReactNode;
  width?: number;
};

export default function ChatPopoverShell({
  open,
  anchorRef,
  label,
  children,
  width = 280,
}: ChatPopoverShellProps) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({
    visibility: "hidden",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panelWidth = Math.min(width, vw - 16);
      const left = Math.max(8, Math.min(rect.left, vw - panelWidth - 8));
      const spaceAbove = rect.top - 12;
      const maxHeight = Math.max(120, Math.min(280, spaceAbove));
      const bottom = vh - rect.top + 8;

      setStyle({
        position: "fixed",
        left,
        bottom,
        width: panelWidth,
        maxHeight,
        zIndex: 100,
        overflowY: "auto",
        visibility: "visible",
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, open, width]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      data-linkup-lt-popover
      role="dialog"
      aria-label={label}
      style={style}
      className="linkup-lt-popover-enter rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-xl shadow-brand-primary/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/40"
    >
      {children}
    </div>,
    document.body,
  );
}
