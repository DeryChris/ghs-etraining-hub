import * as React from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return <div className={cn("rounded-card border border-hairline bg-surface text-ink shadow-panel", className)} {...props} />;
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return <h3 className={cn("text-xl font-bold tracking-tight text-ink", className)} {...props} />;
}

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...props }: CardFooterProps) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
