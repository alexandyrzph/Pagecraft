"use client";

import { cn } from "@/lib/utils";
import {
  AmbientBlobs,
  OnboardingControls,
  OnboardingTopBar,
  StepStage,
  useOnboardingState,
} from "./Onboarding.parts";

export function Onboarding({ name }: { name: string }) {
  const { steps, step, i, dir, last, finishing, go, finish } = useOnboardingState(name);

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br transition-colors duration-700",
        step.bg,
      )}
    >
      <AmbientBlobs accent={step.accent} />
      <OnboardingTopBar last={last} onSkip={finish} />
      <StepStage step={step} i={i} dir={dir} />
      <OnboardingControls
        steps={steps}
        i={i}
        last={last}
        finishing={finishing}
        go={go}
        finish={finish}
      />
    </div>
  );
}
