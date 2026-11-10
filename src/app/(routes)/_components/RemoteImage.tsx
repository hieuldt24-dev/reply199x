"use client";

import Image from "next/image";
import { useState } from "react";

type RemoteImageProps = Readonly<{
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback: string;
}>;

/** External source assets are intentionally unoptimized until production hosting is confirmed. */
export function RemoteImage({ src, alt, width, height, className = "", fallback }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={`${alt} — ảnh hiện không tải được`}
        data-image-fallback="true"
        className={`${className} image-fallback`}
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {fallback}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
