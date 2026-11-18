import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

function CardPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="h-[480px] w-full max-w-[400px] rounded-lg border border-line bg-panel"
    />
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-6 pt-16 pb-12">
      <Link href="/" aria-label="Skew home">
        <Wordmark size="brand" />
      </Link>
      <main className="mt-12 flex w-full justify-center">
        <Suspense fallback={<CardPlaceholder />}>{children}</Suspense>
      </main>
    </div>
  );
}
