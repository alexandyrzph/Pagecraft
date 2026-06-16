import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Shared Vite settings every project needs: the React (JSX) transform and the
// `@/` path alias used throughout the app.
const base = {
  plugins: [react()],
  resolve: {
    alias: [{ find: /^@\//, replacement: `${process.cwd()}/` }],
  },
};

// Two projects so component (jsdom) tests don't change the environment of the
// existing pure-logic tests:
//  • node — pure functions, stores, schemas, etc. (`*.test.ts`)
//  • dom  — React component render tests (`*.dom.test.tsx`, jsdom + jest-dom)
export default defineConfig({
  test: {
    projects: [
      {
        ...base,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      },
      {
        ...base,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["tests/**/*.dom.test.tsx"],
          setupFiles: ["tests/setup-dom.ts"],
        },
      },
    ],
  },
});
