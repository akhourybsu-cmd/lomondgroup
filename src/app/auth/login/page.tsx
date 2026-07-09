import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Lomond Appraisal Group",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center">
            <span className="text-lg font-semibold text-brand-navy">
              Lomond Appraisal Group
            </span>
            <span className="text-xs text-muted-foreground">
              Admin Portal
            </span>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the admin dashboard.
            </p>
          </CardHeader>
          <CardContent>
            {/* Suspense required: LoginForm uses useSearchParams */}
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
