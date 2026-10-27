import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUser } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Masuk" };

const errors: Record<string, string> = {
  "invalid-callback": "Tautan verifikasi tidak valid. Coba login kembali.",
  "verification-failed": "Verifikasi email gagal atau tautan sudah kedaluwarsa.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const user = await getSessionUser();
  if (user && !params.error) redirect(next);
  return (
    <AuthShell
      title="Selamat datang kembali"
      description="Masuk untuk mengelola saldo, pesanan nomor virtual, dan kode OTP Anda."
    >
      <AuthForm mode="login" next={next} initialError={params.error ? errors[params.error] ?? "Autentikasi gagal." : null} />
    </AuthShell>
  );
}
