import { useState } from "react";

export function useSpeciesSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);
  const sidebarClass = isOpen ? "sideBarOpen" : "";

  return {
    isOpen,
    openSidebar,
    closeSidebar,
    sidebarClass
  };
}