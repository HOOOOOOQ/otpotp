import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-violet-400/25 bg-violet-500/10 text-violet-200",
        cyan: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
        green: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
        amber: "border-amber-400/25 bg-amber-500/10 text-amber-200",
        red: "border-red-400/25 bg-red-500/10 text-red-200",
        slate: "border-white/10 bg-white/[0.05] text-slate-300",
        outline: "border-white/[0.12] bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
