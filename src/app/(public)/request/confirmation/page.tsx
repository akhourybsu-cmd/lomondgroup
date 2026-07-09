import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Request Submitted — Lomond Appraisal Group",
  description: "Your appraisal request has been received.",
};

export default function ConfirmationPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
      <div className="mb-6 flex justify-center">
        <CheckCircle
          className="h-14 w-14 text-green-600"
          strokeWidth={1.5}
        />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Request Received
      </h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Thank you for submitting your appraisal request. We&rsquo;ll review your
        information and contact you within one business day to discuss next
        steps.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Please check your email for a confirmation. If you have urgent
        questions, use the contact page.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className={cn(
            buttonVariants(),
            "bg-brand-navy text-white hover:bg-brand-navy-dark"
          )}
        >
          Return Home
        </Link>
        <Link
          href="/faq"
          className={buttonVariants({ variant: "outline" })}
        >
          Read the FAQ
        </Link>
      </div>
    </div>
  );
}
