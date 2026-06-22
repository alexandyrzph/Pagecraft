"use client";
import {
  TextField as RACTextField,
  type TextFieldProps as RACTextFieldProps,
  Label,
  Text,
  FieldError,
} from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const fieldControlClassName = cn(
  "w-full rounded-control border border-border-strong bg-white px-3 py-2 text-sm text-fg shadow-xs outline-none transition",
  "placeholder:text-fg-subtle hover:border-fg-subtle",
  "focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
  "data-[invalid]:border-danger-500 disabled:opacity-50",
);

export interface FieldShellProps extends Omit<RACTextFieldProps, "children"> {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: string;
  children: ReactNode;
}

export function FieldShell({
  label,
  description,
  errorMessage,
  className,
  children,
  ...props
}: FieldShellProps) {
  return (
    <RACTextField
      {...props}
      isInvalid={!!errorMessage || props.isInvalid}
      className={(rs) =>
        cn("flex flex-col gap-1.5", typeof className === "function" ? className(rs) : className)
      }
    >
      {label && <Label className="text-sm font-medium text-fg">{label}</Label>}
      {children}
      {description && (
        <Text slot="description" className="text-xs text-fg-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-xs text-danger-600">{errorMessage}</FieldError>
    </RACTextField>
  );
}
