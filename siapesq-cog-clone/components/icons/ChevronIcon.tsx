import { IconProps } from "./types";

export function ChevronIcon({ size = 16, width, height, color = "currentColor", className, title }: IconProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={!title}
    >
      {title && <title>{title}</title>}
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}
