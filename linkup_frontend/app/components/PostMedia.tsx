"use client";

import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/src/lib/api";

type PostMediaImageProps = {
  src: string;
  className?: string;
};

export function PostMediaImage({ src, className = "" }: PostMediaImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src) ?? src;

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (failed) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Media could not be loaded.
      </p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`max-h-[520px] w-full object-contain ${className}`}
    />
  );
}

type PostMediaVideoProps = {
  src: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  className?: string;
};

export function PostMediaVideo({
  src,
  videoRef,
  className = "",
}: PostMediaVideoProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src) ?? src;

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  if (failed) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Media could not be loaded.
      </p>
    );
  }

  return (
    <video
      ref={videoRef}
      src={resolved}
      controls
      preload="metadata"
      playsInline
      onError={() => setFailed(true)}
      className={`max-h-[520px] w-full object-contain ${className}`}
    />
  );
}

