import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative w-full rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      default: "border-white/10 bg-white/[0.035] text-foreground",
      info: "border-cyan-400/20 bg-cyan-500/[0.07] text-cyan-100",
      success: "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-100",
      warning: "border-amber-400/20 bg-amber-500/[0.07] text-amber-100",
      destructive: "border-red-400/20 bg-red-500/[0.07] text-red-100",
    },
  },
  defaultVariants: { variant: "default" },
});

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-bold leading-none", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm leading-6 opacity-90", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";
