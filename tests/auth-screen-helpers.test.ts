// Pure-logic coverage for the exported AuthScreen helpers (node env).
import { describe, it, expect } from "vitest";
import {
  buildAuthPayload,
  errorFromCatch,
  initialError,
} from "@/components/auth/AuthScreen.helpers";

describe("initialError", () => {
  it("returns null when no error code is given", () => {
    expect(initialError()).toBeNull();
    expect(initialError(undefined)).toBeNull();
  });

  it("maps a known error code to its friendly copy", () => {
    expect(initialError("oauth_denied")).toBe("Sign-in was cancelled.");
    expect(initialError("email_in_use")).toMatch(/already exists/);
  });

  it("falls back to a generic message for an unknown code", () => {
    expect(initialError("totally_unknown")).toBe("Something went wrong. Please try again.");
  });
});

describe("buildAuthPayload", () => {
  const fields = { name: "Jane", email: "j@x.com", password: "secret123", token: "tok" };

  it("includes name/email/password for signup", () => {
    expect(buildAuthPayload("signup", fields)).toEqual({
      name: "Jane",
      email: "j@x.com",
      password: "secret123",
    });
  });

  it("includes only email/password for login", () => {
    expect(buildAuthPayload("login", fields)).toEqual({
      email: "j@x.com",
      password: "secret123",
    });
  });

  it("includes only email for forgot", () => {
    expect(buildAuthPayload("forgot", fields)).toEqual({ email: "j@x.com" });
  });

  it("includes token/password for reset (the default branch)", () => {
    expect(buildAuthPayload("reset", fields)).toEqual({ token: "tok", password: "secret123" });
  });
});

describe("errorFromCatch", () => {
  it("returns the server-provided error from an axios response", () => {
    const err = { isAxiosError: true, response: { data: { error: "Invalid credentials" } } };
    expect(errorFromCatch(err)).toBe("Invalid credentials");
  });

  it("falls back to a generic message when the axios response has no error field", () => {
    const err = { isAxiosError: true, response: { data: {} } };
    expect(errorFromCatch(err)).toBe("Something went wrong. Please try again.");
  });

  it("handles an axios response whose data is null", () => {
    const err = { isAxiosError: true, response: { data: null } };
    expect(errorFromCatch(err)).toBe("Something went wrong. Please try again.");
  });

  it("returns a network message for an axios error without a response", () => {
    const err = { isAxiosError: true };
    expect(errorFromCatch(err)).toBe("Network error. Please try again.");
  });

  it("returns a network message for a non-axios error", () => {
    expect(errorFromCatch(new Error("boom"))).toBe("Network error. Please try again.");
    expect(errorFromCatch("nope")).toBe("Network error. Please try again.");
  });
});
