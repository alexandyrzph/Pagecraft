export function needsSetup(s: { hasWorkspace: boolean; siteCount: number }): boolean {
  return !s.hasWorkspace || s.siteCount === 0;
}
