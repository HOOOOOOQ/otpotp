import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requirePageUser } from "@/lib/auth/page-guards";
import { getDashboardSummary } from "@/lib/db/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await requirePageUser("/dashboard");
  const summary = await getDashboardSummary(profile);
  const displayName = profile.fullName?.trim() || profile.email.split("@")[0] || "Pengguna";

  return (
    <div className="space-y-5">
      {params.error === "admin-only" && (
        <Alert variant="warning">
          <AlertDescription>Halaman administrator hanya dapat diakses oleh akun dengan peran admin.</AlertDescription>
        </Alert>
      )}
      <DashboardClient initialSummary={summary} displayName={displayName} />
    </div>
  );
}
