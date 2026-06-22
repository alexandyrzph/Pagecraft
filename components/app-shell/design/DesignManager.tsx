"use client";

import { useEffect } from "react";
import { useDesignSystem } from "@/store/design-system";
import { loadDesignSystemOnce } from "./DesignManager.helpers";
import { ColorStylesSection, TextStylesSection } from "./DesignManager.parts";

export function DesignManager() {
  const ds = useDesignSystem();
  useEffect(() => loadDesignSystemOnce(), []);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10 lg:px-12">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Design system</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Shared colors and text styles. Changes apply across every page in this workspace.
      </p>
      <ColorStylesSection ds={ds} />
      <TextStylesSection ds={ds} />
    </div>
  );
}
