"use client";
import { Checkbox as RACCheckbox, type CheckboxProps as RACCheckboxProps } from "react-aria-components";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface CheckboxProps extends Omit<RACCheckboxProps, "children"> {
  children?: ReactNode;
}

export function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <RACCheckbox
      {...props}
      className={(rs) =>
        cn("group flex items-center gap-2 text-sm text-fg", typeof className === "function" ? className(rs) : className)
      }
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <span
            className={cn(
              "flex size-4 items-center justify-center rounded-[5px] border border-border-strong bg-white transition",
              "group-data-[selected]:border-brand-600 group-data-[selected]:bg-brand-600",
              "group-data-[focus-visible]:ring-4 group-data-[focus-visible]:ring-brand-100",
            )}
          >
            {isIndeterminate ? <Minus className="size-3 text-white" /> : isSelected ? <Check className="size-3 text-white" /> : null}
          </span>
          {children}
        </>
      )}
    </RACCheckbox>
  );
}
