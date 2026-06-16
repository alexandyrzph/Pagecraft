"use client";
import {
  TextField as RACTextField,
  type TextFieldProps as RACTextFieldProps,
  Label,
  Input,
  Text,
  FieldError,
} from "react-aria-components";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface TextFieldProps extends RACTextFieldProps {
  label?: ReactNode;
  description?: ReactNode;
  errorMessage?: string;
  placeholder?: string;
}

export function TextField({
  label,
  description,
  errorMessage,
  placeholder,
  className,
  ...props
}: TextFieldProps) {
  return (
    <RACTextField
      {...props}
      isInvalid={!!errorMessage || props.isInvalid}
      className={cn(
        "flex flex-col gap-1.5",
        typeof className === "string" ? className : undefined,
      )}
    >
      {label && (
        <Label className="text-sm font-medium text-fg">{label}</Label>
      )}
      <Input
        placeholder={placeholder}
        className={cn(
          "w-full rounded-control border border-border-strong bg-white px-3 py-2 text-sm text-fg shadow-xs outline-none transition",
          "placeholder:text-fg-subtle hover:border-fg-subtle",
          "focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
          "data-[invalid]:border-danger-500 disabled:opacity-50",
        )}
      />
      {description && (
        <Text slot="description" className="text-xs text-fg-muted">
          {description}
        </Text>
      )}
      <FieldError className="text-xs text-danger-600">{errorMessage}</FieldError>
    </RACTextField>
  );
}
