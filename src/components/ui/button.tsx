import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-fast ease-out-quint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px";

// Hover states darken or tint the brand colour. They never swap to a colour that fails
// contrast in the other theme.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-ink shadow-panel hover:bg-primary/90",
  secondary: "border border-hairline bg-surface text-ink hover:border-primary/50 hover:bg-surface-2",
  ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
  danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};

// md = 44px tall: the touch target size the accessibility contract requires.
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
};

export function buttonClass(options: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  const { variant = "primary", size = "md", className } = options;
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}
