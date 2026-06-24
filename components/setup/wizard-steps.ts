export type WizardStep = "workspace" | "site" | "domain";

export function wizardSteps(hasWorkspace: boolean): WizardStep[] {
  return hasWorkspace ? ["site", "domain"] : ["workspace", "site", "domain"];
}
