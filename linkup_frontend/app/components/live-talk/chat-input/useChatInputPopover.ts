"use client";

import { useEffect } from "react";

export function useChatInputPopover(
  open: boolean,
  onClose: () => void,
  anchorRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) {
        return;
      }
      const popover = document.querySelector("[data-linkup-lt-popover]");
      if (popover?.contains(target)) {
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [anchorRef, onClose, open]);
}
