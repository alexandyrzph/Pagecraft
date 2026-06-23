import { describe, it, expect } from "vitest";
import { passwordResetEmail, workspaceInviteEmail } from "@/lib/email/messages";

describe("passwordResetEmail", () => {
  it("has a subject and embeds the reset link", () => {
    const { subject, html } = passwordResetEmail("https://app.example.com/reset?token=abc");
    expect(subject).toMatch(/reset/i);
    expect(html).toContain('href="https://app.example.com/reset?token=abc"');
  });
});

describe("workspaceInviteEmail", () => {
  it("names the workspace and embeds the invite link", () => {
    const { subject, html } = workspaceInviteEmail("https://app.example.com/invite/xyz", "Acme");
    expect(subject).toMatch(/invite/i);
    expect(html).toContain("Acme");
    expect(html).toContain('href="https://app.example.com/invite/xyz"');
  });
});
