import { IconProps } from "./types";

export function CheckIcon({ size = 20, width, height, color = "currentColor", className, title }: IconProps) {
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
      <path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
