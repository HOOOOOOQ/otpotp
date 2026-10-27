import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const user = await getSessionUser();
  if (user) redirect(next);
  return (
    <AuthShell
      title="Buat akun Kaii OTP"
      description="Daftar gratis. Saldo awal Rp0; deposit manual diverifikasi administrator sebelum dapat membeli nomor."
    >
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
