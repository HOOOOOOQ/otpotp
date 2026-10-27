import {
  AppWindow,
  Bot,
  CircleDollarSign,
  Gamepad2,
  Globe2,
  Mail,
  MessageCircle,
  ShoppingBag,
  Smartphone,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = [
  MessageCircle,
  Users,
  ShoppingBag,
  Mail,
  Gamepad2,
  Globe2,
  Smartphone,
  Bot,
  CircleDollarSign,
  AppWindow,
];

const ACCENTS = [
  "bg-violet-500/10 text-violet-300",
  "bg-cyan-500/10 text-cyan-300",
  "bg-emerald-500/10 text-emerald-300",
  "bg-fuchsia-500/10 text-fuchsia-300",
  "bg-sky-500/10 text-sky-300",
];

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

export function ServiceIcon({
  code,
  name,
  className,
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const seed = hash(`${code}:${name ?? ""}`);
  const Icon = ICONS[seed % ICONS.length];
  const accent = ACCENTS[seed % ACCENTS.length];
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06]",
        accent,
        className,
      )}
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}
