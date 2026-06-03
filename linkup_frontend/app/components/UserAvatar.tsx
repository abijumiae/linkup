"use client";

import { useEffect, useState } from "react";
import {
  getDisplayInitials,
  resolveProfileImageUrl,
} from "@/src/lib/profileMedia";

export type UserAvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-sm",
  xl: "h-14 w-14 text-base",
  "2xl": "h-20 w-20 text-xl",
};

export type UserAvatarShape = "circle" | "rounded" | "squircle";

const shapeClasses: Record<UserAvatarShape, string> = {
  circle: "rounded-full",
  rounded: "rounded-2xl",
  squircle: "rounded-[14px]",
};

type UserAvatarProps = {
  src?: string | null;
  name: string;
  username?: string;
  size?: UserAvatarSize;
  shape?: UserAvatarShape;
  className?: string;
  ringClassName?: string;
  alt?: string;
};

export default function UserAvatar({
  src,
  name,
  username,
  size = "md",
  shape = "circle",
  className = "",
  ringClassName = "",
  alt = "",
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveProfileImageUrl(src);
  const showImage = Boolean(resolved) && !failed;
  const initials = getDisplayInitials(name, username);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-primary to-brand-secondary font-semibold text-white ${sizeClasses[size]} ${shapeClasses[shape]} ${ringClassName} ${className}`}
      aria-hidden={!alt}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="select-none leading-none">{initials}</span>
      )}
    </span>
  );
}
