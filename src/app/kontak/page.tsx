import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Github, LifeBuoy, ShieldQuestion } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { ContactForm } from "@/components/marketing/contact-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Kontak" };

export default function ContactPage() {
  return (
    <MarketingPageShell
      eyebrow="Dukungan"
      title="Hubungi tim Kaii OTP"
      description="Kirim pertanyaan atau laporan kendala. Pesan disimpan di database dan dapat ditindaklanjuti administrator melalui dashboard."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <BookOpen className="mb-4 h-5 w-5 text-violet-300" />
          <h2 className="mt-0 text-base font-bold">Dokumentasi</h2>
          <p className="mt-2 text-sm">Pelajari endpoint internal dan kontrak provider.</p>
          <Link href="/dokumentasi" className="mt-3 inline-block text-sm">Buka dokumentasi →</Link>
        </div>
        <div className="glass rounded-2xl p-5">
          <ShieldQuestion className="mb-4 h-5 w-5 text-cyan-300" />
          <h2 className="mt-0 text-base font-bold">FAQ</h2>
          <p className="mt-2 text-sm">Jawaban singkat seputar saldo, OTP, dan privasi.</p>
          <Link href="/#faq" className="mt-3 inline-block text-sm">Lihat FAQ →</Link>
        </div>
        <div className="glass rounded-2xl p-5">
          <Github className="mb-4 h-5 w-5 text-emerald-300" />
          <h2 className="mt-0 text-base font-bold">Repository</h2>
          <p className="mt-2 text-sm">Laporkan isu teknis pada repository proyek.</p>
          <a href="https://github.com/HOOOOOOQ/otpotp/issues" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm">Buka issues →</a>
        </div>
      </div>

      <Alert variant="warning">
        <LifeBuoy className="h-5 w-5" />
        <div>
          <AlertTitle>Jangan kirim data rahasia</AlertTitle>
          <AlertDescription>
            Formulir ini tidak untuk API key, kata sandi, atau kode OTP. Pesan dibatasi 4 kali per jam per alamat IP untuk mencegah penyalahgunaan.
          </AlertDescription>
        </div>
      </Alert>

      <h2>Kirim pesan</h2>
      <ContactForm />
    </MarketingPageShell>
  );
}
