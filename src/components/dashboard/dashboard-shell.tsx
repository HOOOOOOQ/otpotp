"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MoreHorizontal,
  Package,
  ReceiptText,
  RefreshCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiGet, apiPost, friendlyApiError } from "@/lib/api/client";
import { formatIDR } from "@/lib/format";
import type { ProfileView } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/beli", label: "Beli OTP", icon: ShoppingCart },
  { href: "/dashboard/pesanan", label: "Pesanan Saya", icon: Package },
  { href: "/dashboard/transaksi", label: "Riwayat Transaksi", icon: ReceiptText },
];

const accountNav: NavItem[] = [
  { href: "/dashboard/deposit", label: "Deposit Saldo", icon: Wallet },
  { href: "/dashboard/profil", label: "Profil", icon: UserRound },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings },
];

const adminNav: NavItem[] = [
  { href: "/dashboard/admin/saldo-provider", label: "Saldo Provider", icon: CircleDollarSign },
  { href: "/dashboard/admin/deposit", label: "Verifikasi Deposit", icon: ShieldCheck },
  { href: "/dashboard/admin/pesan", label: "Pesan Masuk", icon: LifeBuoy },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all focus-ring",
        active
          ? "bg-violet-500/15 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,.15)]"
          : "text-muted-foreground hover:bg-white/[0.05] hover:text-white",
      )}
    >
      <item.icon className={cn("h-4.5 w-4.5", active ? "text-violet-300" : "text-muted-foreground group-hover:text-white")} />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="h-4 w-4 text-violet-300" />}
    </Link>
  );
}

export function DashboardShell({
  user,
  profile,
  isAdmin,
  children,
}: {
  user: { email: string; fullName: string | null };
  profile: ProfileView;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [balance, setBalance] = useState(profile.balanceIdr);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const refreshBalance = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await apiGet<{ profile: ProfileView }>("/api/wallet/summary");
      setBalance(result.profile.balanceIdr);
    } catch {
      // Keep the last known balance; page-level error states handle failures.
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshBalance();
  }, [pathname, refreshBalance]);

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/auth/logout");
      toast.success("Anda sudah keluar.");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(friendlyApiError(error, "Gagal keluar. Coba lagi."));
      setLoggingOut(false);
    }
  }

  const allNav = [...mainNav, ...accountNav, ...(isAdmin ? adminNav : [])];
  const currentTitle = allNav.find((item) => isActive(pathname, item))?.label ?? "Dashboard";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-white/[0.07] bg-[#070b18]/80 px-4 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="px-2">
          <Brand href="/dashboard" />
        </div>
        <div className="mt-9 flex-1 space-y-7 overflow-y-auto">
          <div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Utama</p>
            <nav className="space-y-1">
              {mainNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
              ))}
            </nav>
          </div>
          <div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Akun</p>
            <nav className="space-y-1">
              {accountNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
              ))}
            </nav>
          </div>
          {isAdmin && (
            <div>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/70">Administrator</p>
              <nav className="space-y-1">
                {adminNav.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
                ))}
              </nav>
            </div>
          )}
        </div>
        <div className="space-y-3 border-t border-white/[0.07] pt-4">
          <Link
            href="/kontak"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <Headphones className="h-4.5 w-4.5" /> Bantuan
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-200/80 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-ring disabled:opacity-50"
          >
            <LogOut className="h-4.5 w-4.5" /> {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#070b18]/85 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <Brand href="/dashboard" compact />
              </div>
              <div className="hidden lg:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Kaii OTP</p>
                <p className="truncate text-sm font-bold">{currentTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshBalance}
                className="focus-ring flex h-9 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.035] px-3 text-xs font-bold text-white transition-colors hover:border-violet-400/30"
                aria-label="Muat ulang saldo"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-violet-300", refreshing && "animate-spin")} />
                {formatIDR(balance)}
              </button>
              <Link
                href="/dashboard/deposit"
                className="focus-ring hidden h-9 items-center gap-2 rounded-xl bg-violet-500 px-3 text-xs font-bold text-white transition-colors hover:bg-violet-400 sm:flex"
              >
                <CreditCard className="h-3.5 w-3.5" /> Deposit
              </Link>
              <div className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] text-xs font-extrabold text-violet-200 md:flex" title={user.email}>
                {(user.fullName ?? user.email).slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#070b18]/95 px-2 pb-[max(env(safe-area-inset-bottom),.35rem)] pt-2 backdrop-blur-xl lg:hidden" aria-label="Navigasi mobile">
        <div className="grid grid-cols-5 gap-1">
          {mainNav.slice(0, 4).map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-colors",
                  active ? "bg-violet-500/15 text-violet-200" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span className="truncate">{item.label.replace("Riwayat ", "")}</span>
              </Link>
            );
          })}
          <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <MoreHorizontal className="h-4.5 w-4.5" />
                Lainnya
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Menu lainnya</DialogTitle>
                <DialogDescription>{user.email}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-1">
                {[...accountNav, ...(isAdmin ? adminNav : [])].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white"
                  >
                    <item.icon className="h-4 w-4 text-violet-300" />
                    {item.label}
                    <ArrowUpRight className="ml-auto h-4 w-4 opacity-50" />
                  </Link>
                ))}
                <Link
                  href="/kontak"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <Bell className="h-4 w-4 text-violet-300" /> Bantuan & Kontak
                  <ArrowUpRight className="ml-auto h-4 w-4 opacity-50" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    void logout();
                  }}
                  disabled={loggingOut}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> {loggingOut ? "Keluar..." : "Keluar"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </nav>
    </div>
  );
}
