"use client";
import {
  Slider as RACSlider,
  SliderTrack,
  SliderThumb,
  type SliderProps as RACSliderProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

export interface SliderProps extends RACSliderProps<number> {}

export function Slider({ className, ...props }: SliderProps) {
  return (
    <RACSlider
      {...props}
      className={(rs) =>
        cn("relative flex w-full touch-none select-none items-center", typeof className === "function" ? className(rs) : className)
      }
    >
      <SliderTrack className="relative h-1.5 w-full rounded-full bg-bg-subtle">
        {({ state }) => (
          <>
            {/* brand fill from the track start to the thumb */}
            <div
              className="absolute h-full rounded-full bg-brand-600"
              style={{ width: `${state.getThumbPercent(0) * 100}%` }}
            />
            <SliderThumb
              className={cn(
                "top-1/2 size-4 rounded-full border border-border-strong bg-white shadow-xs outline-none transition",
                "data-[dragging]:scale-110",
                "data-[focus-visible]:ring-4 data-[focus-visible]:ring-brand-100",
              )}
            />
          </>
        )}
      </SliderTrack>
    </RACSlider>
  );
}
