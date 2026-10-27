"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost, friendlyApiError } from "@/lib/api/client";
import { sanitizeNextPath } from "@/lib/auth/validation";

type Mode = "login" | "register";

interface AuthResponse {
  redirectTo?: string | null;
  requiresEmailConfirmation?: boolean;
  message: string;
}

export function AuthForm({
  mode,
  next,
  initialError,
}: {
  mode: Mode;
  next: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const safeNext = sanitizeNextPath(next);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password, next: safeNext }
          : { fullName: form.fullName, email: form.email, password: form.password, next: safeNext };
      const result = await apiPost<AuthResponse>(endpoint, body);
      if (result.requiresEmailConfirmation) {
        setConfirmation(result.message);
        toast.success(result.message);
        return;
      }
      toast.success(result.message);
      router.push(result.redirectTo ?? safeNext);
      router.refresh();
    } catch (caught) {
      const message = friendlyApiError(caught, "Autentikasi gagal. Coba lagi.");
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <Alert variant="success" className="p-5">
        <Mail className="mb-3 h-6 w-6" />
        <AlertTitle className="text-base">Verifikasi email diperlukan</AlertTitle>
        <AlertDescription>{confirmation}</AlertDescription>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/login?next=${encodeURIComponent(safeNext)}`}>Ke halaman masuk</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/kontak">Butuh bantuan?</Link>
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Gagal melanjutkan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Nama lengkap</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            placeholder="Nama Anda"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
          maxLength={180}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Kata sandi</Label>
          {mode === "login" && (
            <Link href="/kontak" className="text-xs font-semibold text-violet-300 hover:underline">
              Lupa kata sandi?
            </Link>
          )}
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            placeholder="Minimal 8 karakter, ada huruf & angka"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 8 : 1}
            maxLength={72}
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-white focus-ring"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {mode === "register" && (
          <p className="text-xs text-muted-foreground">Gunakan kombinasi huruf dan angka, minimal 8 karakter.</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          "Memproses..."
        ) : (
          <>
            {mode === "login" ? "Masuk ke dashboard" : "Buat akun"} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        Kredensial dikirim langsung ke Supabase Auth melalui server.
      </div>
      <p className="pt-2 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Belum punya akun?{" "}
            <Link href={`/register?next=${encodeURIComponent(safeNext)}`} className="font-bold text-violet-300 hover:underline">
              Daftar sekarang
            </Link>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <Link href={`/login?next=${encodeURIComponent(safeNext)}`} className="font-bold text-violet-300 hover:underline">
              Masuk
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
