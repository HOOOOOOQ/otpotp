import { Skeleton } from "@/components/ui/skeleton";

export function LoadingCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="glass space-y-4 rounded-2xl p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
