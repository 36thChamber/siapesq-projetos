"use client";

import { useDropdown } from "@/hook/useDropdown";
import { ReactNode, useEffect, useState } from "react";

export interface DropdownItem {
  label: string;
  value: string;
  onClick?: () => void;
  subItems?: DropdownItem[];
  selected?: boolean;
}

interface ReusableDropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  className?: string;
  menuLabel?: string;
  onSelect?: (value: string) => void;
}

export function ReusableDropdown({
  trigger,
  items,
  className = "",
  menuLabel = "Menu de opções",
  onSelect,
}: ReusableDropdownProps) {
  const { isOpen, toggle, close, ref } = useDropdown();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [submenuSide, setSubmenuSide] = useState<"left" | "right">("left");

  useEffect(() => {
    if (!isOpen) setOpenSubmenu(null);
  }, [isOpen]);

  const showSubmenu = (itemValue: string, trigger: HTMLElement) => {
    const { left, right } = trigger.getBoundingClientRect();
    const submenuWidth = 224;
    const gutter = 8;
    const spaceRight = window.innerWidth - right;
    const spaceLeft = left;

    setSubmenuSide(
      spaceRight >= submenuWidth + gutter || spaceRight >= spaceLeft
        ? "right"
        : "left",
    );
    setOpenSubmenu(itemValue);
  };

  const handleSelect = (item: DropdownItem) => {
    close();
    setOpenSubmenu(null);

    if (item.onClick) {
      item.onClick();
      return;
    }

    onSelect?.(item.value);
  };

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="
          flex items-center justify-center
          p-1
          rounded-md
          hover:bg-gray-100
          transition-colors
          focus:outline-none
        "
      >
        {trigger}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-label={menuLabel}
          className="
            absolute right-0 mt-2
            w-40
            bg-white
            rounded-md
            shadow-lg
            border border-gray-200
            z-50
            py-1
          "
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          {items.map((item) => {
            const hasSubmenu = Boolean(item.subItems?.length);
            const isSubmenuOpen = openSubmenu === item.value;

            if (!hasSubmenu) {
              return (
                <button
                  key={item.value}
                  type="button"
                  role="menuitem"
                  onMouseEnter={() => setOpenSubmenu(null)}
                  onFocus={() => setOpenSubmenu(null)}
                  onClick={() => handleSelect(item)}
                  className="
                    w-full text-left
                    px-4 py-2
                    text-sm
                    text-gray-700
                    hover:bg-gray-100
                    transition-colors
                  "
                >
                  {item.label}
                </button>
              );
            }

            return (
              <div
                key={item.value}
                className="relative"
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={isSubmenuOpen}
                  onMouseEnter={(event) =>
                    showSubmenu(item.value, event.currentTarget)
                  }
                  onFocus={(event) =>
                    showSubmenu(item.value, event.currentTarget)
                  }
                  onClick={(event) => {
                    showSubmenu(item.value, event.currentTarget);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                      event.preventDefault();
                      showSubmenu(item.value, event.currentTarget);
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      setOpenSubmenu(null);
                    }
                  }}
                  className="
                    flex w-full items-center justify-between gap-3
                    px-4 py-2
                    text-left text-sm
                    text-gray-700
                    hover:bg-gray-100
                    transition-colors
                  "
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">›</span>
                </button>

                {isSubmenuOpen && (
                  <div
                    role="menu"
                    aria-label={item.label}
                    className={`absolute top-0 z-50 w-56 max-w-[calc(100vw-1rem)] rounded-md border border-gray-200 bg-white py-1 shadow-lg ${
                      submenuSide === "right"
                        ? "left-full pl-1"
                        : "right-full pr-1"
                    }`}
                  >
                    {item.subItems?.map((subItem) => (
                      <button
                        key={subItem.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={Boolean(subItem.selected)}
                        onClick={() => handleSelect(subItem)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 ${
                          subItem.selected ? "bg-gray-100 font-semibold" : ""
                        }`}
                      >
                        <span>{subItem.label}</span>
                        {subItem.selected && <span aria-hidden="true">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
