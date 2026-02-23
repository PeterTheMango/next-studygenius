"use client";

import type { MouseEvent } from "react";
import { Palette, Sun, Type, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
];

export function SettingsSectionNav() {
  const handleSectionScroll = (
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    event.preventDefault();

    const targetSection = document.getElementById(sectionId);
    if (!targetSection) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    targetSection.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });

    window.history.replaceState(null, "", `#${sectionId}`);
  };

  return (
    <nav className="hidden md:block w-56 shrink-0" aria-label="Settings sections">
      <div className="sticky top-8 space-y-1">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(event) => handleSectionScroll(event, item.id)}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
