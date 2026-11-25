"use client";

import { GbifImagesProvider } from "@/context/GbifImagesContext";

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GbifImagesProvider>{children}</GbifImagesProvider>;
}
