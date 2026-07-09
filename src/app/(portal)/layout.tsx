import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal — Lomond Appraisal Group",
  description: "View your appraisal status, download your report, and manage payment.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Branded header — no nav (this is a private client-only page) */}
      <header className="bg-[#1B3A5C]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <span className="text-base font-bold tracking-tight text-white">
            Lomond Appraisal Group
          </span>
          <span className="rounded border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-2 py-0.5 text-xs font-medium text-[#C9A84C]">
            Client Portal
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <p className="text-xs text-gray-500">
            Questions? Contact{" "}
            <a
              href="mailto:info@lomondappraisal.com"
              className="text-[#1B3A5C] hover:underline"
            >
              info@lomondappraisal.com
            </a>
            {" · "}
            <span className="text-gray-400">
              &copy; {new Date().getFullYear()} Lomond Appraisal Group
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
