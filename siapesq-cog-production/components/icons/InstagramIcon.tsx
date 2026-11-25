import { IconProps } from "./types";

export function InstagramIcon({ size = 30, width, height, className }: IconProps) {
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="ig-grad1" cx="26.5%" cy="107%" r="113%" fx="26.5%" fy="107%">
          <stop offset="0%" stopColor="#fd5" />
          <stop offset="10%" stopColor="#fd5" />
          <stop offset="50%" stopColor="#ff543e" />
          <stop offset="100%" stopColor="#c837ab" />
        </radialGradient>
        <radialGradient id="ig-grad2" cx="4%" cy="0%" r="58%" fx="4%" fy="0%">
          <stop offset="0%" stopColor="#3771c8" />
          <stop offset="12.8%" stopColor="#3771c8" />
          <stop offset="100%" stopColor="#6600ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="30" height="30" rx="7" fill="url(#ig-grad1)" />
      <rect width="30" height="30" rx="7" fill="url(#ig-grad2)" />
      <rect x="7" y="7" width="16" height="16" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="15" cy="15" r="4" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="20.5" cy="9.5" r="1.2" fill="white" />
    </svg>
  );
}
