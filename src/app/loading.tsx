import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main id="main-content" className="container mx-auto px-5 py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full max-w-2xl" />
        <Skeleton className="h-5 w-full max-w-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
