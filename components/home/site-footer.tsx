import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

const companyLinks = ["About", "Careers", "Press", "Contact"] as const;
const helpLinks = ["Help Center", "Guides", "Privacy Policy", "Terms of Service"] as const;

function FooterLink({ children }: { children: string }) {
  return (
    <button type="button" className="text-left text-[13px] leading-[1.6] text-footer-muted hover:text-white">
      {children}
    </button>
  );
}

function SocialButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-full text-white hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.7 3h2.5l-5.5 6.3L18.5 21h-4.7l-3.7-5.4L6 21H3.5l5.9-6.7L3.2 3h4.8l3.3 4.9L14.7 3Zm-1 16.2h1.4L7.4 4.7H5.9l7.8 14.5Z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.7 3.3a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM3.2 8.7h3v12.1h-3V8.7Zm6.2 0h2.9v1.7h.1c.4-.8 1.4-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8v7.3h-3v-6.5c0-1.5 0-3.5-2.1-3.5s-2.5 1.7-2.5 3.4v6.6h-3V8.7Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.5 8.5V6.8c0-.7.5-1 1.2-1H17V3h-2.2C12 3 10.5 4.4 10.5 6.6v1.9H8.5V11h2v10h3V11h2.3l.4-2.5h-2.7Z"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 12.2s0-3-.4-4.3c-.2-.9-.9-1.6-1.8-1.8C18.2 5.6 12 5.6 12 5.6s-6.2 0-7.8.5c-.9.2-1.6.9-1.8 1.8C2 9.2 2 12.2 2 12.2s0 3 .4 4.3c.2.9.9 1.6 1.8 1.8 1.6.5 7.8.5 7.8.5s6.2 0 7.8-.5c.9-.2 1.6-.9 1.8-1.8.4-1.3.4-4.3.4-4.3ZM10 15.5v-6.6l5.2 3.3L10 15.5Z"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-10 bg-ink text-footer-muted">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Wordmark tone="inverse" size="footer" />
            <p className="mt-3 max-w-[220px] text-[13px] leading-[1.4] text-footer-muted">
              Balanced news coverage, powered by AI.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="mb-1 text-[12px] font-medium text-white/80">Company</h2>
            {companyLinks.map((link) => (
              <FooterLink key={link}>{link}</FooterLink>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="mb-1 text-[12px] font-medium text-white/80">Help</h2>
            {helpLinks.map((link) => (
              <FooterLink key={link}>{link}</FooterLink>
            ))}
          </div>
          <div>
            <h2 className="mb-2 text-[12px] font-medium text-white/80">Connect</h2>
            <div className="flex items-center gap-1">
              <SocialButton label="X">
                <XIcon />
              </SocialButton>
              <SocialButton label="LinkedIn">
                <LinkedInIcon />
              </SocialButton>
              <SocialButton label="Facebook">
                <FacebookIcon />
              </SocialButton>
              <SocialButton label="YouTube">
                <YouTubeIcon />
              </SocialButton>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-white/15 pt-4 text-[12px] leading-[1.4]">
          © 2026 Skew News. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
