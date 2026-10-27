import Link from "next/link";
import { cn } from "@/lib/utils";

export function KaiiSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      aria-hidden="true"
      className={cn("h-9 w-9", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="kaii-symbol" x1="6" y1="7" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="42" height="42" rx="13" fill="#0C1020" stroke="rgba(255,255,255,.09)" />
      <path
        d="M14 12v20M14 22l16-9M14 22l16 9"
        stroke="url(#kaii-symbol)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="12" r="3.1" fill="#A78BFA" />
      <circle cx="14" cy="32" r="3.1" fill="#A78BFA" />
      <circle cx="14" cy="22" r="2.6" fill="#fff" />
      <circle cx="31" cy="13" r="3.1" fill="#22D3EE" />
      <circle cx="31" cy="31" r="3.1" fill="#22D3EE" />
    </svg>
  );
}

export function Brand({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("focus-ring inline-flex items-center gap-2.5 rounded-xl", className)}>
      <KaiiSymbol />
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-[0.18em] text-white">KAII</span>
        {!compact && (
          <span className="mt-1 block text-[10px] font-semibold tracking-[0.28em] text-violet-300/80">
            OTP SERVICE
          </span>
        )}
      </span>
    </Link>
  );
}
