import { IconProps } from "./types";

export function LocationIcon({ size = 24, width, height, color = "currentColor", className, title }: IconProps) {
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
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill={color}
      />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}
