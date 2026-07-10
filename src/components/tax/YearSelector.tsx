"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function YearSelector({
  years,
  current,
}: {
  years: number[];
  current: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tax-year" className="text-sm font-medium text-muted-foreground">
        Tax year
      </label>
      <select
        id="tax-year"
        value={current}
        onChange={(e) => go(e.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
