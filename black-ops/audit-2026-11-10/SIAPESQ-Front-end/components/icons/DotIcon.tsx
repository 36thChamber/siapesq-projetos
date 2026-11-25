import { IconProps } from "./types";

export function DotIcon({ size = 18, width, height, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="4" r="1.5" fill={color} />
      <circle cx="9" cy="9" r="1.5" fill={color} />
      <circle cx="9" cy="14" r="1.5" fill={color} />
    </svg>
  );
}
