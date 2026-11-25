"use client";

import Image from "next/image";

interface IconOptionProps {
  src: string;
  alt: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function IconOption({
  src,
  alt,
  isSelected,
  onClick,
}: IconOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex h-[70px] w-[70px] items-center justify-center
        rounded-full border bg-white transition-all
        hover:scale-105 hover:border-blue-400
        ${isSelected ? "border-blue-600 ring-2 ring-blue-300" : "border-gray-200"}
      `}
    >
      <Image
        src={src}
        alt={alt}
        width={58}
        height={58}
        className="h-[58px] w-[58px] object-contain"
      />
    </button>
  );
}