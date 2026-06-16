// Setup for the "dom" Vitest project (jsdom). Adds jest-dom matchers
// (toBeInTheDocument, toHaveValue, …) and unmounts rendered trees after each test.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
