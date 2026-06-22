"use client";
import { TextArea, type TextFieldProps as RACTextFieldProps } from "react-aria-components";
import { cn } from "@/lib/utils";
import { FieldShell, fieldControlClassName } from "./field-shell";
import type { ReactNode } from "react";

export interface TextareaProps extends Omit<RACTextFieldProps, "children"> {
  label?: ReactNode;
  placeholder?: string;
  rows?: number;
  errorMessage?: string;
}

export function Textarea({
  label,
  placeholder,
  rows = 4,
  errorMessage,
  className,
  ...props
}: TextareaProps) {
  return (
    <FieldShell label={label} errorMessage={errorMessage} className={className} {...props}>
      <TextArea
        rows={rows}
        placeholder={placeholder}
        className={cn(fieldControlClassName, "resize-y")}
      />
    </FieldShell>
  );
}
