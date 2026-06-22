import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// usePathname drives nav-active state and the render-phase "route changed"
// branch in <Sidebar>. A mutable module-level value lets a rerender simulate
// navigation. useRouter is only touched by mocked children but stubbed anyway.
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// Lightweight framer-motion so AnimatePresence mounts/unmounts the mobile
// drawer synchronously (no exit-animation timing) and motion.* render as plain
// DOM with the animation-only props stripped.
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MOTION_PROPS = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "layout",
    "layoutId",
    "variants",
    "whileHover",
    "whileTap",
    "whileInView",
    "drag",
  ]);
  const passthrough = (Tag: string) =>
    function MotionStub(props: Record<string, unknown>) {
      const rest: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (k !== "children" && !MOTION_PROPS.has(k)) rest[k] = v;
      }
      return React.createElement(Tag, rest, props.children as React.ReactNode);
    };
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }) as Record<
      string,
      unknown
    >,
  };
});

// Heavy leaf children pull in api/router/dismiss hooks; stub them so only the
// three target functions (Sidebar, SidebarRail, the nav-item map arrow) run for
// real. Relative imports inside the source resolve to the same module ids.
vi.mock("@/components/app-shell/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="workspace-switcher" data-collapsed={String(collapsed)} />
  ),
}));
vi.mock("@/components/app-shell/SidebarProfile", () => ({
  SidebarProfile: ({ user }: { user: { name: string; email: string } }) => (
    <div data-testid="sidebar-profile">{user.email}</div>
  ),
}));
vi.mock("@/components/app-shell/SettingsMenu", () => ({
  SettingsMenu: () => <div data-testid="settings-menu" />,
}));
vi.mock("@/components/app-shell/CommandPalette", () => ({
  CommandPalette: ({ open }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="command-palette" /> : null,
}));

import { Sidebar } from "@/components/app-shell/Sidebar";
import { SidebarRail, isPaletteShortcut } from "@/components/app-shell/Sidebar.helpers";

const workspaces = [
  { id: "w1", name: "Acme", slug: "acme", role: "owner" },
  { id: "w2", name: "Beta", slug: "beta", role: "member" },
];
const user = { name: "Ada Lovelace", email: "ada@example.com" };

beforeEach(() => {
  mockPathname = "/";
});

describe("isPaletteShortcut", () => {
  it("matches Cmd/Ctrl+K (any case) and rejects everything else", () => {
    expect(isPaletteShortcut({ metaKey: true, key: "k" } as KeyboardEvent)).toBe(true);
    expect(isPaletteShortcut({ ctrlKey: true, key: "K" } as KeyboardEvent)).toBe(true);
    expect(isPaletteShortcut({ metaKey: false, ctrlKey: false, key: "k" } as KeyboardEvent)).toBe(
      false,
    );
    expect(isPaletteShortcut({ metaKey: true, key: "j" } as KeyboardEvent)).toBe(false);
  });
});

describe("SidebarRail", () => {
  it("expanded: shows group titles, the search label/kbd, and full nav labels", () => {
    render(
      <SidebarRail
        collapsed={false}
        workspaces={workspaces}
        active={workspaces[0]}
        user={user}
        pathname="/"
        onSearch={() => {}}
      />,
    );
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    // active link (href "/" exact match → Pages) gets the indigo treatment.
    const pages = screen.getByRole("link", { name: "Pages" });
    expect(pages).toHaveClass("bg-indigo-50");
    // a non-active link keeps the muted treatment.
    expect(screen.getByRole("link", { name: "CMS" })).not.toHaveClass("bg-indigo-50");
  });

  it("expanded: marks a link active via the startsWith branch for nested routes", () => {
    render(
      <SidebarRail
        collapsed={false}
        workspaces={workspaces}
        active={workspaces[0]}
        user={user}
        pathname="/cms/items/123"
        onSearch={() => {}}
      />,
    );
    expect(screen.getByRole("link", { name: "CMS" })).toHaveClass("bg-indigo-50");
    expect(screen.getByRole("link", { name: "Pages" })).not.toHaveClass("bg-indigo-50");
  });

  it("collapsed: hides titles/labels and falls back to title tooltips; tolerates undefined active", () => {
    render(
      <SidebarRail
        collapsed
        workspaces={workspaces}
        active={undefined}
        user={user}
        pathname="/"
        onSearch={() => {}}
      />,
    );
    expect(screen.queryByText("Build")).toBeNull();
    // search button keeps only its icon + a tooltip title when collapsed.
    expect(screen.getByTitle("Search (⌘K)")).toBeInTheDocument();
    expect(screen.queryByText("Search")).toBeNull();
    // nav items expose their label via title only (no visible text) when collapsed.
    const pagesLink = screen.getByTitle("Pages");
    expect(pagesLink).toBeInTheDocument();
    expect(pagesLink.textContent).toBe("");
  });

  it("invokes onSearch when the search button is pressed", () => {
    const onSearch = vi.fn();
    render(
      <SidebarRail
        collapsed={false}
        workspaces={workspaces}
        active={workspaces[0]}
        user={user}
        pathname="/"
        onSearch={onSearch}
      />,
    );
    fireEvent.click(screen.getByText("Search"));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});

describe("Sidebar", () => {
  it("resolves the active workspace by id for the mobile header", () => {
    render(
      <Sidebar
        collapsed={false}
        workspaces={workspaces}
        activeWorkspaceId="w2"
        role="member"
        user={user}
      />,
    );
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("falls back to the first workspace when the active id does not match", () => {
    render(
      <Sidebar
        collapsed={false}
        workspaces={workspaces}
        activeWorkspaceId="missing"
        role="member"
        user={user}
      />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("toggles collapse: flips the chevron button label and persists the cookie", () => {
    render(
      <Sidebar
        collapsed={false}
        workspaces={workspaces}
        activeWorkspaceId="w1"
        role="owner"
        user={user}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(document.cookie).toContain("pc_sidebar=collapsed");
  });

  it("renders the expanded chevron affordance when starting collapsed", () => {
    render(
      <Sidebar collapsed workspaces={workspaces} activeWorkspaceId="w1" role="owner" user={user} />,
    );
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("opens and closes the mobile drawer", async () => {
    const u = userEvent.setup();
    render(
      <Sidebar
        collapsed={false}
        workspaces={workspaces}
        activeWorkspaceId="w1"
        role="owner"
        user={user}
      />,
    );
    expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
  });

  it("opens the command palette via the ⌘K keyboard shortcut and toggles it back", () => {
    render(
      <Sidebar
        collapsed={false}
        workspaces={workspaces}
        activeWorkspaceId="w1"
        role="owner"
        user={user}
      />,
    );
    expect(screen.queryByTestId("command-palette")).toBeNull();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.queryByTestId("command-palette")).toBeNull();
  });

  it("opens the command palette from the rail search button", () => {
    render(
      <Sidebar
        collapsed={false}
        workspaces={workspaces}
        activeWorkspaceId="w1"
        role="owner"
        user={user}
      />,
    );
    fireEvent.click(screen.getByText("Search"));
    expect(screen.getByTestId("command-palette")).toBeInTheDocument();
  });

  it("closes the open mobile drawer when the route changes (render-phase reset)", async () => {
    const u = userEvent.setup();
    const props = {
      collapsed: false,
      workspaces,
      activeWorkspaceId: "w1",
      role: "owner",
      user,
    };
    const { rerender } = render(<Sidebar {...props} />);
    await u.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("button", { name: "Close menu" })).toBeInTheDocument();
    mockPathname = "/cms";
    rerender(<Sidebar {...props} />);
    expect(screen.queryByRole("button", { name: "Close menu" })).toBeNull();
  });
});
