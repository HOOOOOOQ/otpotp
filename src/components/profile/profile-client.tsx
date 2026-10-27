"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPatch, apiPost, friendlyApiError } from "@/lib/api/client";
import { formatDate, formatIDR } from "@/lib/format";
import type { ProfileView } from "@/lib/types";

export function ProfileClient({ initialProfile }: { initialProfile: ProfileView }) {
  const [profile, setProfile] = useState(initialProfile);
  const [fullName, setFullName] = useState(initialProfile.fullName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const result = await apiPatch<{ profile: ProfileView; message: string }>("/api/profile", { fullName });
      setProfile(result.profile);
      toast.success(result.message);
    } catch (error) {
      toast.error(friendlyApiError(error, "Profil gagal diperbarui."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    try {
      const result = await apiPost<{ message: string }>("/api/auth/password", password);
      setPassword({ currentPassword: "", newPassword: "" });
      toast.success(result.message);
    } catch (error) {
      toast.error(friendlyApiError(error, "Kata sandi gagal diperbarui."));
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description="Kelola nama tampilan dan keamanan akun. Saldo serta peran hanya dapat diubah oleh fungsi server terverifikasi."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5 text-violet-300" /> Informasi akun</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{profile.fullName ?? "Tanpa nama"}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <Badge variant={profile.role === "admin" ? "cyan" : "default"}>{profile.role === "admin" ? "Administrator" : "Pengguna"}</Badge>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Saldo</p><p className="mt-1 font-bold">{formatIDR(profile.balanceIdr)}</p></div>
                <div><p className="text-xs text-muted-foreground">Bergabung</p><p className="mt-1 font-bold">{formatDate(profile.createdAt)}</p></div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">ID pengguna</p>
                <p className="mt-1 truncate font-mono text-xs">{profile.id}</p>
              </div>
              <CopyButton value={profile.id} label="Salin ID" iconOnly size="icon" variant="ghost" />
            </div>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Peran dan saldo tidak diterima dari formulir browser. Perubahan saldo hanya melalui ledger transaksi dan fungsi SQL atomik.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Save className="h-5 w-5 text-cyan-300" /> Edit nama tampilan</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email (tidak dapat diubah di sini)</Label>
                <Input id="profile-email" value={profile.email} disabled readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nama tampilan</Label>
                <Input
                  id="profile-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  placeholder="Nama Anda"
                  required
                />
              </div>
              <Button type="submit" disabled={savingProfile}>
                <Save className="h-4 w-4" /> {savingProfile ? "Menyimpan..." : "Simpan profil"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-violet-300" /> Ubah kata sandi</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Kata sandi saat ini</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={password.currentPassword}
                onChange={(event) => setPassword((current) => ({ ...current, currentPassword: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Kata sandi baru</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                value={password.newPassword}
                onChange={(event) => setPassword((current) => ({ ...current, newPassword: event.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">Minimal 8 karakter, memuat huruf dan angka.</p>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={savingPassword} variant="outline">
                <KeyRound className="h-4 w-4" /> {savingPassword ? "Memperbarui..." : "Perbarui kata sandi"}
              </Button>
              <Link href="/kebijakan-privasi" className="text-xs font-semibold text-violet-300 hover:underline">
                Baca kebijakan privasi
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
