import { Wordmark } from "@/components/brand/wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-ink text-footer-muted">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
        <div>
          <Wordmark tone="inverse" size="footer" />
          <p className="mt-3 max-w-[220px] text-[13px] leading-[1.4] text-footer-muted">
            Balanced news coverage, powered by AI.
          </p>
        </div>
        <p className="mt-8 border-t border-white/15 pt-4 text-[12px] leading-[1.4]">
          © 2026 Skew News. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
