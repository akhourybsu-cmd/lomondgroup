import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { GenerateRouteForm } from "@/components/ops/GenerateRouteForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { type RouteStatus, ROUTE_STATUS_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/ops/format";
import { Route } from "lucide-react";

export const metadata: Metadata = {
  title: "Routes — Lomond Appraisal Admin",
};

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

type RouteListRow = {
  id: string;
  route_date: string;
  route_status: RouteStatus;
  total_miles: number | null;
  total_drive_time_minutes: number | null;
  route_stops: { count: number }[];
};

export default async function RoutesPage({ searchParams }: PageProps) {
  const { date } = await searchParams;

  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let routes: RouteListRow[] = [];
  if (isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("daily_routes")
      .select(
        "id, route_date, route_status, total_miles, total_drive_time_minutes, route_stops(count)"
      )
      .order("route_date", { ascending: false })
      .limit(60);
    if (data) routes = data as unknown as RouteListRow[];
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Routes" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">Daily Routes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Build an optimized driving route from a day&apos;s confirmed,
            address-verified appointments.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Build a Route</CardTitle>
              </CardHeader>
              <CardContent>
                <GenerateRouteForm
                  defaultStartAddress={process.env.OPS_DEFAULT_START_ADDRESS ?? ""}
                  defaultDate={date}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {routes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Route className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium text-foreground">No routes yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isConfigured
                        ? "Build your first route from a day's confirmed appointments."
                        : "Connect Supabase to see live data."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {routes.map((r) => {
                    const config = ROUTE_STATUS_CONFIG[r.route_status];
                    return (
                      <Link
                        key={r.id}
                        href={`/admin/routes/${r.route_date}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-secondary/30"
                      >
                        <div>
                          <p className="font-medium text-brand-navy">
                            {formatDateOnly(r.route_date)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {r.route_stops?.[0]?.count ?? 0} stops
                            {r.total_miles !== null ? ` · ${r.total_miles} mi` : ""}
                            {r.total_drive_time_minutes !== null
                              ? ` · ${Math.floor(r.total_drive_time_minutes / 60)}h ${r.total_drive_time_minutes % 60}m driving`
                              : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border font-medium text-xs px-1.5 py-0",
                            config.color,
                            config.bgColor
                          )}
                        >
                          {config.label}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
