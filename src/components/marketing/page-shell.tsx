import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/landing/footer";

export function MarketingPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060915]/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Brand />
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Beranda
            </Link>
          </Button>
        </div>
      </header>
      <main id="main-content" className="container max-w-4xl px-5 py-12 sm:py-16">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="prose-invert space-y-6 [&_a]:font-semibold [&_a]:text-violet-300 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_li]:my-2 [&_p]:leading-7 [&_p]:text-muted-foreground [&_strong]:text-white">
          {children}
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
