import { IconProps } from "./types";

export function AnalyticsIcon({ size = 24, width, height, color = "currentColor", className, title }: IconProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={!title}
    >
      {title && <title>{title}</title>}
      <rect x="3" y="12" width="4" height="9" rx="1" fill={color} />
      <rect x="10" y="7" width="4" height="14" rx="1" fill={color} />
      <rect x="17" y="3" width="4" height="18" rx="1" fill={color} />
    </svg>
  );
}
