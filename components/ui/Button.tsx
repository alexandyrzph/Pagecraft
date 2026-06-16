"use client";
import { Button as RACButton, type ButtonProps as RACButtonProps } from "react-aria-components";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-xs",
  secondary: "border border-border-strong bg-white text-fg hover:bg-bg-subtle shadow-xs",
  ghost: "text-fg-muted hover:bg-bg-subtle",
  danger: "bg-danger-600 text-white hover:bg-danger-700 shadow-xs",
  link: "text-brand-600 hover:underline",
};
const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-3.5 text-sm gap-1.5",
  lg: "h-11 px-5 text-base gap-2",
  icon: "h-9 w-9",
};

export interface ButtonProps extends RACButtonProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  isDisabled,
  ...props
}: ButtonProps) {
  return (
    <RACButton
      {...props}
      isDisabled={isDisabled || isLoading}
      className={(rs) =>
        cn(
          "inline-flex items-center justify-center rounded-control font-semibold outline-none transition-colors",
          "focus-visible:ring-4 focus-visible:ring-brand-100",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          typeof className === "function" ? className(rs) : className,
        )
      }
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {!isLoading && leadingIcon}
      {children as ReactNode}
      {!isLoading && trailingIcon}
    </RACButton>
  );
}
