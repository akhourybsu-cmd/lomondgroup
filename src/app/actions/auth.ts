"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign in with email + password.
 * Returns an error string on failure; redirects on success.
 */
export async function signIn(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/admin";

  if (!email || !password) {
    return "Email and password are required.";
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Don't expose raw Supabase errors — return a generic message
    return "Invalid email or password.";
  }

  redirect(next);
}

/**
 * Sign out the current session and redirect to the login page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
