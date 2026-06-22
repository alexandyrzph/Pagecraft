"use client";
import { Input, type TextFieldProps as RACTextFieldProps } from "react-aria-components";
import { FieldShell, fieldControlClassName } from "./field-shell";
import type { ReactNode } from "react";

export interface TextFieldProps extends Omit<RACTextFieldProps, "children"> {
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
    <FieldShell
      label={label}
      description={description}
      errorMessage={errorMessage}
      className={className}
      {...props}
    >
      <Input placeholder={placeholder} className={fieldControlClassName} />
    </FieldShell>
  );
}
