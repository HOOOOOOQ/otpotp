"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost, friendlyApiError } from "@/lib/api/client";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await apiPost<{ message: string }>("/api/support/messages", form);
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success(result.message);
    } catch (error) {
      toast.error(friendlyApiError(error, "Pesan belum terkirim. Coba lagi beberapa saat."));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" className="p-6">
        <CheckCircle2 className="mb-3 h-6 w-6" />
        <AlertTitle className="text-base">Pesan terkirim</AlertTitle>
        <AlertDescription>
          Pesan Anda tersimpan untuk ditinjau administrator. Butuh mengirim pesan lain? Muat ulang formulir di bawah.
        </AlertDescription>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSent(false)}>
            Kirim pesan lain
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/#faq">Baca FAQ</Link>
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="glass space-y-5 rounded-2xl p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Nama</Label>
          <Input
            id="contact-name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Nama Anda"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="nama@email.com"
            maxLength={180}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">Subjek</Label>
        <Input
          id="contact-subject"
          value={form.subject}
          onChange={(event) => update("subject", event.target.value)}
          placeholder="Contoh: Bantuan deposit"
          minLength={3}
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Pesan</Label>
        <Textarea
          id="contact-message"
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          placeholder="Jelaskan kendala Anda secara singkat. Jangan pernah mengirim kata sandi atau kode OTP."
          minLength={10}
          maxLength={2000}
          required
        />
        <p className="text-xs text-muted-foreground">
          Jangan sertakan API key, kata sandi, atau kode OTP pada pesan.
        </p>
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        <Send className="h-4 w-4" />
        {submitting ? "Mengirim..." : "Kirim pesan"}
      </Button>
    </form>
  );
}
