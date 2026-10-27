import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ORDER_STATUS_META } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneToVariant: Record<
  (typeof ORDER_STATUS_META)[OrderStatus]["tone"],
  NonNullable<BadgeProps["variant"]>
> = {
  violet: "default",
  cyan: "cyan",
  green: "green",
  amber: "amber",
  red: "red",
  slate: "slate",
};

export function StatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: OrderStatus;
  className?: string;
  showDot?: boolean;
}) {
  const meta = ORDER_STATUS_META[status] ?? ORDER_STATUS_META.needs_review;
  return (
    <Badge variant={toneToVariant[meta.tone]} className={cn("whitespace-nowrap", className)}>
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {meta.label}
    </Badge>
  );
}

export function GenericBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: NonNullable<BadgeProps["variant"]>;
}) {
  return <Badge variant={tone}>{children}</Badge>;
}
