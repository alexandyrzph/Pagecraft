import { vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteSwitcher } from "@/components/app-shell/SiteSwitcher";

describe("SiteSwitcher", () => {
  it("shows the active site name", () => {
    render(
      <SiteSwitcher
        collapsed={false}
        sites={[
          { id: "a", name: "Marketing Site", handle: "marketing" },
          { id: "b", name: "Blog", handle: "blog" },
        ]}
        activeSiteId="a"
      />,
    );
    expect(screen.getByText("Marketing Site")).toBeTruthy();
  });
});
