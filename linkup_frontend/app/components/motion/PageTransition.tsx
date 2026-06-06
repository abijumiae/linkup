"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={`linkup-page-enter min-w-0 ${visible ? "linkup-page-enter-active" : ""}`}
    >
      {children}
    </div>
  );
}
