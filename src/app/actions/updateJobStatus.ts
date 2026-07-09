"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type JobStatus,
  VALID_STATUS_TRANSITIONS,
} from "@/lib/types";

interface UpdateJobStatusResult {
  success: boolean;
  error?: string;
}

/**
 * Update a job's status with transition validation and audit logging.
 * Uses the anon client (with RLS) — the actor must be authenticated.
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: JobStatus
): Promise<UpdateJobStatusResult> {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated." };
  }

  // Fetch current job status
  const { data: job, error: fetchError } = await supabase
    .from("appraisal_jobs")
    .select("status, internal_ref")
    .eq("id", jobId)
    .single();

  if (fetchError || !job) {
    return { success: false, error: "Job not found." };
  }

  const currentStatus = job.status as JobStatus;

  // Validate the transition
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from "${currentStatus}" to "${newStatus}".`,
    };
  }

  // Perform the update
  const { error: updateError } = await supabase
    .from("appraisal_jobs")
    .update({ status: newStatus })
    .eq("id", jobId);

  if (updateError) {
    return { success: false, error: "Failed to update job status." };
  }

  // Write audit log entry
  await supabase.from("audit_logs").insert({
    job_id: jobId,
    actor_id: user.id,
    event_type: "job_status_changed",
    metadata: {
      from: currentStatus,
      to: newStatus,
      internal_ref: job.internal_ref,
    },
  });

  // Revalidate the job detail and job board pages
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin");

  return { success: true };
}
