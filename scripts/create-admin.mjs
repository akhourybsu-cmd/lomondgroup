/**
 * Create (or repair) an owner_admin login.
 *
 * Usage:  node scripts/create-admin.mjs <email> <password>
 *
 * Reads SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from
 * .env.local. Creates the auth user pre-confirmed (no email round
 * trip) and promotes their profile to owner_admin. Safe to re-run:
 * if the user already exists, it resets the password and re-promotes.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Load .env.local ────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Create or repair the user ──────────────────────────────────────────────
let userId;
const { data: created, error: createError } =
  await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

if (createError) {
  if (/already.*(registered|exists)/i.test(createError.message)) {
    console.log(`User ${email} already exists — resetting password.`);
    const { data: list, error: listError } =
      await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!existing) throw new Error("User exists but could not be found.");
    userId = existing.id;
    const { error: updateError } = await admin.auth.admin.updateUserById(
      userId,
      { password, email_confirm: true }
    );
    if (updateError) throw updateError;
  } else {
    throw createError;
  }
} else {
  userId = created.user.id;
  console.log(`Created user ${email} (${userId}).`);
}

// ── Promote to owner_admin ─────────────────────────────────────────────────
// The signup trigger creates the profile with role 'client'; upsert in
// case the trigger is missing for any reason.
const { error: profileError } = await admin
  .from("profiles")
  .upsert({ id: userId, role: "owner_admin" }, { onConflict: "id" });
if (profileError) throw profileError;

const { data: profile } = await admin
  .from("profiles")
  .select("role, display_name")
  .eq("id", userId)
  .single();

console.log(`Profile role: ${profile?.role}`);
console.log("Done — you can sign in at /auth/login.");
