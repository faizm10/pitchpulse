import type { CSSProperties } from "react";

export function SkeletonBone({
  width = "100%",
  height = 14,
  style,
  delay = 0,
  radius = 8,
}: {
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  delay?: number;
  radius?: number | string;
}) {
  return (
    <div
      className="skeleton-bone"
      style={{
        width,
        height,
        borderRadius: radius,
        animationDelay: delay ? `${delay}ms` : undefined,
        ...style,
      }}
    />
  );
}
