import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "violet",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  accent?: "violet" | "cyan" | "green" | "amber";
}) {
  const accentClass = {
    violet: "bg-violet-500/10 text-violet-300",
    cyan: "bg-cyan-500/10 text-cyan-300",
    green: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
  }[accent];
  return (
    <Card className={cn("relative overflow-hidden p-5 transition-colors hover:border-white/[0.15]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-3 truncate text-2xl font-extrabold tracking-tight">{value}</p>
          {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", accentClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
