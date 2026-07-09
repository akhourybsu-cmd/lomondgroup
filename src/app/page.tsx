import { redirect } from "next/navigation";

/**
 * The public website has been removed — this is an internal operations
 * tool. The home page sends everyone to sign-in; the proxy bounces
 * already-authenticated users straight to /admin.
 */
export default function HomePage() {
  redirect("/auth/login");
}
