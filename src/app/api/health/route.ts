import { NextResponse } from "next/server";

/**
 * Health check endpoint — returns OK if the app is running.
 * Does not expose any sensitive information.
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
