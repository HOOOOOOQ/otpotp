import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requirePageUser } from "@/lib/auth/page-guards";
import { profileIsAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requirePageUser("/dashboard");
  return (
    <DashboardShell
      user={{ email: user.email, fullName: profile.fullName }}
      profile={profile}
      isAdmin={profileIsAdmin(profile, user)}
    >
      {children}
    </DashboardShell>
  );
}
