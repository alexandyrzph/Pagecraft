import { useDesignSystem } from "@/store/design-system";

export function loadDesignSystemOnce(): void {
  const { loaded, load } = useDesignSystem.getState();
  if (!loaded) load();
}
