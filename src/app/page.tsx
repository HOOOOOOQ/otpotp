import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { FaqSection } from "@/components/landing/faq";
import { CtaSection, FeaturesSection, ServicesSection, StepsSection } from "@/components/landing/sections";
import { getSessionUser } from "@/lib/auth/session";
import { getLandingStats } from "@/lib/provider/service";
import type { LandingStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kaii OTP — OTP Instan, Tanpa Ribet.",
  description:
    "Sewa nomor virtual untuk menerima SMS OTP. Katalog live, harga transparan, dan pemantauan pesanan real-time.",
};

async function safeStats(): Promise<LandingStats> {
  try {
    return await getLandingStats();
  } catch {
    return {
      available: false,
      countries: null,
      services: null,
      operators: null,
      lowestPriceIdr: null,
      sampleCountry: null,
      featuredServices: [],
      updatedAt: null,
      error: "Data katalog provider sedang tidak tersedia.",
    };
  }
}

export default async function HomePage() {
  const [user, stats] = await Promise.all([getSessionUser(), safeStats()]);
  const isAuthenticated = Boolean(user);

  return (
    <>
      <LandingNavbar isAuthenticated={isAuthenticated} />
      <main id="main-content">
        <Hero stats={stats} isAuthenticated={isAuthenticated} />
        <FeaturesSection />
        <ServicesSection stats={stats} />
        <StepsSection />
        <CtaSection isAuthenticated={isAuthenticated} />
        <FaqSection />
      </main>
      <LandingFooter />
    </>
  );
}
