import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OAuthButtonRow } from "@/components/auth/OAuthButtons";

describe("OAuthButtonRow", () => {
  it("renders a link per configured provider with the right href", () => {
    const { container } = render(<OAuthButtonRow providers={["google", "github"]} next="/dash" />);
    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue with GitHub/i)).toBeInTheDocument();
    expect(container.querySelector('a[href="/api/auth/oauth/google?next=%2Fdash"]')).not.toBeNull();
    expect(container.querySelector('a[href="/api/auth/oauth/github?next=%2Fdash"]')).not.toBeNull();
  });

  it("renders only the configured provider", () => {
    render(<OAuthButtonRow providers={["github"]} />);
    expect(screen.queryByText(/Continue with Google/i)).toBeNull();
    expect(screen.getByText(/Continue with GitHub/i)).toBeInTheDocument();
  });

  it("renders nothing when no providers", () => {
    const { container } = render(<OAuthButtonRow providers={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
