import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Safe to import in Client Components. Uses the anon key only.
 * All data access is protected by Supabase RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
