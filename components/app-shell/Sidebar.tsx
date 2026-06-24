"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setSidebarCookie } from "./SidebarToggleCookie";
import { CommandPalette } from "./CommandPalette";
import { SidebarRail, isPaletteShortcut } from "./Sidebar.helpers";

type WS = { id: string; name: string; slug: string; role: string };
type Site = { id: string; name: string; handle: string };

export function Sidebar({
  collapsed: initialCollapsed,
  workspaces,
  activeWorkspaceId,
  user,
  sites,
  activeSiteId,
}: {
  collapsed: boolean;
  workspaces: WS[];
  activeWorkspaceId: string;
  role: string;
  user: { name: string; email: string };
  sites: Site[];
  activeSiteId?: string;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const active = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];

  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPaletteShortcut(e)) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      setSidebarCookie(!c);
      return !c;
    });
  };

  const rail = (
    <SidebarRail
      collapsed={collapsed}
      workspaces={workspaces}
      active={active}
      user={user}
      pathname={pathname}
      onSearch={() => setPaletteOpen(true)}
      sites={sites}
      activeSiteId={activeSiteId}
    />
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen shrink-0 md:block">
        <div className="relative h-full">
          {rail}
          <button
            onClick={toggle}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-[23px] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-[#e8eaed] bg-white text-[#9aa1ac] shadow-sm transition-colors hover:border-[#d6dae0] hover:text-[#111827]"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#e8eaed] bg-white px-4 py-2.5 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          onPress={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </Button>
        <span className="text-sm font-semibold text-[#111827]">{active?.name}</span>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <motion.div
              className="absolute left-0 top-0 h-full"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
            >
              <div className="relative h-full">
                {rail}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close menu"
                  className="absolute right-3 top-3"
                  onPress={() => setMobileOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
