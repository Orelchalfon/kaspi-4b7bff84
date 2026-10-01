import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/*
 * Loading placeholders. They never size or center themselves: every skeleton fills
 * (w-full) whatever container the page renders it in, so a page wraps its loading
 * state in the SAME container as its loaded state and the width never jumps.
 */

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-2" aria-busy="true" aria-label="טוען">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Mirrors the blue balance/savings hero card on the child wallet, savings and home pages. */
export function BalanceHeroSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <Card className="w-full bg-primary/10" aria-busy="true" aria-label="טוען">
      <CardContent
        className={
          tall ? "flex flex-col items-center gap-3 py-8" : "flex flex-col items-center gap-3 py-6"
        }
      >
        <Skeleton className="h-4 w-24 bg-primary/15" />
        <Skeleton className="h-10 w-36 bg-primary/15" />
        {tall && <Skeleton className="mt-2 h-11 w-40 bg-primary/15" />}
      </CardContent>
    </Card>
  );
}

/** Mirrors /child/dashboard: balance hero + "my tasks" list. */
export function ChildDashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" aria-busy="true" aria-label="טוען">
      <BalanceHeroSkeleton />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-28" />
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}

/** Mirrors /parent/dashboard: header, two settings cards, avatar stack, child section. */
export function ParentDashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" aria-busy="true" aria-label="טוען">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-24" />
        </div>
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="size-14 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-6">
        <Skeleton className="h-6 w-28" />
        <ListSkeleton rows={2} />
      </div>
    </div>
  );
}

/** A detail card (title, description lines, key/value rows, action). Fills its container. */
export function DetailSkeleton() {
  return (
    <Card className="w-full" aria-busy="true" aria-label="טוען">
      <CardContent className="flex flex-col gap-4 py-6">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex flex-col gap-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  );
}

/** A form card: `fields` label+input pairs and a submit button. Fills its container. */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card className="w-full" aria-busy="true" aria-label="טוען">
      <CardContent className="flex flex-col gap-4 pt-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="mt-2 h-11 w-full" />
      </CardContent>
    </Card>
  );
}

/** Stand-in for a PageHeader whose title isn't known yet (back link + title bar). */
export function PageHeaderSkeleton({ back = true }: { back?: boolean }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {back && <Skeleton className="h-11 w-32" />}
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
