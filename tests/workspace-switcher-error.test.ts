import { describe, it, expect } from "vitest";
import axios from "axios";
import { createWorkspaceError } from "@/components/app-shell/WorkspaceSwitcher.helpers";

describe("createWorkspaceError", () => {
  it("returns the server-provided error from an axios error response", () => {
    const e = new axios.AxiosError("boom");
    e.response = { data: { error: "Name already taken" } } as never;
    expect(createWorkspaceError(e)).toBe("Name already taken");
  });

  it("falls back when the axios error response has no error field", () => {
    const e = new axios.AxiosError("boom");
    e.response = { data: {} } as never;
    expect(createWorkspaceError(e)).toBe("Could not create workspace");
  });

  it("falls back when the axios error has no response at all", () => {
    const e = new axios.AxiosError("network down");
    expect(createWorkspaceError(e)).toBe("Could not create workspace");
  });

  it("falls back for a non-axios error", () => {
    expect(createWorkspaceError(new Error("plain"))).toBe("Could not create workspace");
  });

  it("falls back for null / non-object input", () => {
    expect(createWorkspaceError(null)).toBe("Could not create workspace");
  });
});
