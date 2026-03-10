import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg lg:hidden" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-52" />
          </div>
          <Skeleton className="h-9 w-32 hidden sm:block rounded-lg" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Content block */}
        <Skeleton className="h-48 rounded-xl" />

        {/* Table-like block */}
        <div className="rounded-xl border border-border p-4 space-y-3">
          <Skeleton className="h-5 w-40" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
