import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/lib/api/client", () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

import { useDesignSystem } from "@/store/design-system";
import { TextStylesSection } from "@/components/app-shell/design/DesignManager.parts";

beforeEach(() => {
  useDesignSystem.setState({ colors: [], textStyles: [] });
});

describe("TextStylesSection / TextStyleEditor", () => {
  it("shows the empty state when there are no text styles", () => {
    render(<TextStylesSection ds={useDesignSystem.getState()} />);
    expect(screen.getByText("Text styles")).toBeInTheDocument();
    expect(
      screen.getByText("No text styles yet. Define headings, body, captions once and reuse them."),
    ).toBeInTheDocument();
  });

  it("renders an editor per style and reflects each style's typography props", () => {
    const ds = useDesignSystem.getState();
    ds.addTextStyle("Heading 1", {
      fontSize: "48px",
      fontWeight: "700",
      lineHeight: "1.1",
      letterSpacing: "0.02em",
      textAlign: "center",
      textTransform: "uppercase",
      color: "#101828",
    });
    ds.addTextStyle("Body");

    render(<TextStylesSection ds={useDesignSystem.getState()} />);

    expect(screen.getByDisplayValue("Heading 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Body")).toBeInTheDocument();

    expect(screen.getAllByText("The quick brown fox")).toHaveLength(2);

    expect(screen.getAllByText("Size")).toHaveLength(2);
    expect(screen.getAllByText("Weight")).toHaveLength(2);
    expect(screen.getAllByText("Line height")).toHaveLength(2);
    expect(screen.getAllByText("Letter spacing")).toHaveLength(2);
    expect(screen.getAllByText("Align")).toHaveLength(2);
    expect(screen.getAllByText("Transform")).toHaveLength(2);
    expect(screen.getAllByText("Color")).toHaveLength(2);

    expect(screen.getByText("700", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("center", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("UPPER", { selector: "span" })).toBeInTheDocument();

    expect(screen.getByLabelText("Remove Heading 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Remove Body")).toBeInTheDocument();
  });

  it("routes editor field changes and removal through the store", () => {
    const ds = useDesignSystem.getState();
    ds.addTextStyle("Heading 1", { fontSize: "48px" });
    const id = useDesignSystem.getState().textStyles[0].id;

    render(<TextStylesSection ds={useDesignSystem.getState()} />);

    fireEvent.change(screen.getByDisplayValue("Heading 1"), { target: { value: "Renamed" } });
    expect(useDesignSystem.getState().textStyles[0].name).toBe("Renamed");

    fireEvent.change(screen.getByPlaceholderText("1.4"), { target: { value: "1.8" } });
    expect(
      (useDesignSystem.getState().textStyles[0].props as { lineHeight?: string }).lineHeight,
    ).toBe("1.8");

    fireEvent.click(screen.getByLabelText("Remove Heading 1"));
    expect(useDesignSystem.getState().textStyles.some((s) => s.id === id)).toBe(false);
  });
});
