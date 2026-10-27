"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Apakah Kaii OTP menyimpan API key provider di browser?",
    answer:
      "Tidak. JASAOTP_API_KEY hanya dibaca oleh server pada route handler. Browser hanya memanggil endpoint internal Kaii OTP, dan kunci tersebut tidak pernah dimasukkan ke JavaScript klien, localStorage, atau repository.",
  },
  {
    question: "Mengapa saldo akun saya berbeda dari saldo provider?",
    answer:
      "Saldo pengguna adalah dompet internal dengan ledger transaksi. Saldo provider adalah dana operasional akun JasaOTP dan hanya dapat dilihat administrator. Keduanya sengaja dipisahkan dan tidak pernah disamakan.",
  },
  {
    question: "Bagaimana cara menambah saldo?",
    answer:
      "Karena dokumentasi JasaOTP v2 tidak menyediakan endpoint deposit/pembayaran untuk pengguna akhir, Kaii OTP memakai permintaan deposit manual. Saldo baru ditambahkan setelah admin memverifikasi bukti pembayaran. Tidak ada saldo gratis atau kredit otomatis.",
  },
  {
    question: "Apa yang terjadi jika OTP tidak masuk?",
    answer:
      "Halaman detail melakukan polling berkala yang berhenti saat kode diterima atau status berakhir. Anda dapat membatalkan pesanan yang masih menunggu SMS. Refund hanya diproses setelah provider mengonfirmasi nominal refund secara resmi.",
  },
  {
    question: "Apakah ada hitung mundur masa berlaku pesanan?",
    answer:
      "Countdown hanya ditampilkan jika provider benar-benar mengirim waktu kedaluwarsa pada respons order. Dokumentasi v2 saat ini hanya menjanjikan order_id dan number, jadi Kaii OTP tidak mengarang waktu tersisa.",
  },
  {
    question: "Berapa lama kode OTP disimpan?",
    answer:
      "Kode disimpan sementara selama 15 menit agar halaman detail tetap dapat menampilkannya, lalu dihapus otomatis. Respons mentah SMS tidak ditampilkan dan kode tidak ditulis ke log. Kebijakan lengkap ada di halaman privasi.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="container scroll-mt-24 py-16 sm:py-20">
      <div className="mb-10 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Pertanyaan umum.</h2>
          <p className="mt-4 max-w-md leading-7 text-muted-foreground">
            Masih butuh bantuan? Kirim pesan melalui halaman kontak atau baca dokumentasi teknis.
          </p>
          <div className="mt-5 flex gap-3 text-sm font-semibold text-violet-300">
            <Link href="/kontak" className="hover:underline">Hubungi kami</Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/dokumentasi" className="hover:underline">Dokumentasi</Link>
          </div>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
