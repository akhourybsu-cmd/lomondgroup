import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PdfUploadForm } from "@/components/ops/PdfUploadForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  type UploadProcessingStatus,
  UPLOAD_STATUS_CONFIG,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Uploads — Lomond Appraisal Admin",
};

type UploadRow = {
  id: string;
  original_filename: string;
  processing_status: UploadProcessingStatus;
  extraction_error: string | null;
  created_at: string;
  contractor: { name: string } | null;
  appointments: { count: number }[];
};

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function UploadsPage() {
  const isConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let uploads: UploadRow[] = [];
  let contractors: { id: string; name: string }[] = [];

  if (isConfigured) {
    const supabase = await createClient();
    const [{ data: uploadData }, { data: contractorData }] = await Promise.all([
      supabase
        .from("pdf_uploads")
        .select(
          "id, original_filename, processing_status, extraction_error, created_at, contractor:contractors(name), appointments(count)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("contractors").select("id, name").eq("active", true).order("name"),
    ]);
    if (uploadData) uploads = uploadData as unknown as UploadRow[];
    if (contractorData) contractors = contractorData;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader breadcrumbs={[{ label: "Uploads" }]} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight">PDF Uploads</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload contractor assignment PDFs, then process them to extract
            draft appointments for review.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload PDFs</CardTitle>
              </CardHeader>
              <CardContent>
                <PdfUploadForm contractors={contractors} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {uploads.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium text-foreground">No uploads yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isConfigured
                        ? "Assignment PDFs you upload will appear here."
                        : "Connect Supabase to see live data."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          File
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Contractor
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Extracted
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Uploaded
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {uploads.map((u) => {
                        const config = UPLOAD_STATUS_CONFIG[u.processing_status];
                        return (
                          <tr
                            key={u.id}
                            className="group transition-colors hover:bg-secondary/30"
                          >
                            <td className="max-w-56 px-4 py-3">
                              <Link
                                href={`/admin/uploads/${u.id}`}
                                className="block truncate font-medium text-brand-navy hover:underline"
                                title={u.original_filename}
                              >
                                {u.original_filename}
                              </Link>
                              {u.extraction_error && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-amber-700">
                                  {u.extraction_error}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {u.contractor?.name ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {u.appointments?.[0]?.count ?? 0} appt
                              {(u.appointments?.[0]?.count ?? 0) !== 1 ? "s" : ""}
                            </td>
                            <td className="px-4 py-3">
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
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatTimestamp(u.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
